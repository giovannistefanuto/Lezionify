"""Benchmark Colab: Parakeet TDT 0.6B v2 INT8 e Qwen3-ASR 0.6B/1.7B.

Prima di eseguire questo file in una cella Colab, eseguire in una cella separata:

    !apt-get -qq update && apt-get -qq install -y ffmpeg
    !pip -q install -U qwen-asr sherpa-onnx soundfile psutil huggingface_hub

Il file audio originale non viene modificato. I tre modelli ricevono lo stesso WAV
mono 16 kHz e gli stessi segmenti senza sovrapposizioni o buchi. Gli output grezzi,
il manifest dei segmenti e le metriche vengono raccolti in uno ZIP scaricabile.
"""

from __future__ import annotations

import csv
import gc
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import psutil
import soundfile as sf
import torch
from google.colab import files
from huggingface_hub import snapshot_download


# -----------------------------------------------------------------------------
# CONFIGURAZIONE DEL TEST
# -----------------------------------------------------------------------------

WORK_DIR = Path("/content/asr_benchmark_parakeet_qwen")
INPUT_DIR = WORK_DIR / "input"
CHUNKS_DIR = WORK_DIR / "chunks_16khz_mono"
MODELS_DIR = WORK_DIR / "models"
OUTPUT_DIR = WORK_DIR / "risultati"

SAMPLE_RATE = 16_000
TARGET_CHUNK_SECONDS = 60
BOUNDARY_SEARCH_SECONDS = 5
ENERGY_WINDOW_MS = 100

PARAKEET_THREADS = min(4, os.cpu_count() or 1)
QWEN_MAX_NEW_TOKENS = 512
QWEN_LANGUAGE = "English"

# Lasciare vuoto per confrontare le capacita' base dei modelli. Dopo il primo
# benchmark si puo' ripetere Qwen con un glossario, ma quel risultato va marcato
# come test assistito e non confrontato alla pari con Parakeet senza prompt.
QWEN_CONTEXT = ""

# Esempio per un eventuale secondo test assistito:
# QWEN_CONTEXT = (
#     "University robotics lecture. Technical terms may include: visual servoing, "
#     "interaction matrix, image Jacobian, Gamma matrix, eigenvalue, camera frame, "
#     "object frame, perspective transformation, normalized coordinates, chain rule."
# )

PARAKEET_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/"
    "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2"
)
PARAKEET_ARCHIVE_NAME = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2"
PARAKEET_FOLDER_NAME = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8"

QWEN_MODELS = (
    ("Qwen/Qwen3-ASR-0.6B", "QWEN3_ASR_0.6B_FP16"),
    ("Qwen/Qwen3-ASR-1.7B", "QWEN3_ASR_1.7B_FP16"),
)


def banner(text: str) -> None:
    print("\n" + "=" * 88)
    print(text)
    print("=" * 88)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_stem(name: str) -> str:
    stem = Path(name).stem.strip()
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem)
    return stem[:100] or "audio"


def clear_gpu() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()


def format_seconds(value: float) -> str:
    minutes, seconds = divmod(value, 60)
    return f"{int(minutes):02d}:{seconds:05.2f}"


def prepare_directories() -> None:
    for folder in (INPUT_DIR, CHUNKS_DIR, MODELS_DIR, OUTPUT_DIR):
        folder.mkdir(parents=True, exist_ok=True)


def upload_one_audio() -> Path:
    banner("CARICAMENTO AUDIO")
    print("Carica UN SOLO file audio: sara' usato identico per tutti e tre i modelli.")
    uploaded = files.upload()
    if len(uploaded) != 1:
        raise RuntimeError(f"Serviva un solo file, ne sono stati caricati {len(uploaded)}.")

    original_name = next(iter(uploaded))
    destination = INPUT_DIR / original_name
    destination.write_bytes(uploaded[original_name])
    print(f"Originale conservato in: {destination}")
    print(f"SHA-256: {sha256_file(destination)}")
    return destination


def convert_to_wav(input_path: Path) -> tuple[Path, float, float]:
    wav_path = INPUT_DIR / f"{safe_stem(input_path.name)}_16khz_mono.wav"
    started = time.perf_counter()
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(input_path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_RATE),
            "-c:a",
            "pcm_s16le",
            str(wav_path),
        ],
        check=True,
    )
    conversion_seconds = time.perf_counter() - started
    info = sf.info(wav_path)
    duration = info.frames / info.samplerate
    return wav_path, duration, conversion_seconds


def choose_low_energy_boundary(
    audio: np.ndarray,
    nominal: int,
    search_radius: int,
    window_samples: int,
) -> int:
    lower = max(window_samples, nominal - search_radius)
    upper = min(len(audio) - window_samples, nominal + search_radius)
    if upper <= lower:
        return min(nominal, len(audio))

    step = max(1, window_samples)
    candidates = np.arange(lower, upper + 1, step, dtype=np.int64)
    half = max(1, window_samples // 2)
    energies = np.array(
        [
            float(np.mean(np.square(audio[max(0, c - half) : min(len(audio), c + half)])))
            for c in candidates
        ],
        dtype=np.float64,
    )
    return int(candidates[int(np.argmin(energies))])


def split_audio_once(wav_path: Path) -> tuple[list[dict], np.ndarray]:
    audio, sample_rate = sf.read(wav_path, dtype="float32", always_2d=False)
    if sample_rate != SAMPLE_RATE:
        raise RuntimeError(f"Sample rate inatteso: {sample_rate} Hz")
    if audio.ndim != 1:
        raise RuntimeError("Il WAV convertito non e' mono.")

    target = TARGET_CHUNK_SECONDS * SAMPLE_RATE
    search = BOUNDARY_SEARCH_SECONDS * SAMPLE_RATE
    window = max(1, round(ENERGY_WINDOW_MS / 1000 * SAMPLE_RATE))
    chunk_paths: list[dict] = []
    start = 0
    index = 1

    while len(audio) - start > target + search:
        end = choose_low_energy_boundary(audio, start + target, search, window)
        if end <= start:
            end = min(len(audio), start + target)
        path = CHUNKS_DIR / f"chunk_{index:03d}.wav"
        sf.write(path, audio[start:end], SAMPLE_RATE, subtype="PCM_16")
        chunk_paths.append(
            {
                "index": index,
                "path": str(path),
                "start_seconds": start / SAMPLE_RATE,
                "end_seconds": end / SAMPLE_RATE,
                "duration_seconds": (end - start) / SAMPLE_RATE,
            }
        )
        start = end
        index += 1

    if start < len(audio):
        path = CHUNKS_DIR / f"chunk_{index:03d}.wav"
        sf.write(path, audio[start:], SAMPLE_RATE, subtype="PCM_16")
        chunk_paths.append(
            {
                "index": index,
                "path": str(path),
                "start_seconds": start / SAMPLE_RATE,
                "end_seconds": len(audio) / SAMPLE_RATE,
                "duration_seconds": (len(audio) - start) / SAMPLE_RATE,
            }
        )

    return chunk_paths, audio


def download_file(url: str, destination: Path) -> float:
    if destination.exists() and destination.stat().st_size > 0:
        print(f"Gia' in cache: {destination.name}")
        return 0.0

    started = time.perf_counter()

    def report(count: int, block_size: int, total_size: int) -> None:
        if total_size > 0 and count % 128 == 0:
            percent = min(100.0, count * block_size * 100 / total_size)
            print(f"\rDownload {percent:5.1f}%", end="")

    urllib.request.urlretrieve(url, destination, reporthook=report)
    print("\rDownload 100.0%")
    return time.perf_counter() - started


def save_result(
    *,
    tag: str,
    model_id: str,
    engine: str,
    text: str,
    audio_duration: float,
    download_seconds: float,
    load_seconds: float,
    transcription_seconds: float,
    chunks: list[dict],
    extra: dict,
) -> dict:
    text = text.strip()
    text_path = OUTPUT_DIR / f"{tag}.txt"
    metadata_path = OUTPUT_DIR / f"{tag}.json"
    text_path.write_text(text, encoding="utf-8")

    rtf = transcription_seconds / audio_duration
    metrics = {
        "tag": tag,
        "model_id": model_id,
        "engine": engine,
        "audio_duration_seconds": audio_duration,
        "chunks": len(chunks),
        "download_seconds": download_seconds,
        "load_seconds": load_seconds,
        "transcription_seconds": transcription_seconds,
        "rtf": rtf,
        "speed_x_realtime": 1 / rtf if rtf else None,
        "characters": len(text),
        "words": len(text.split()),
        "qwen_context": QWEN_CONTEXT,
        "extra": extra,
        "text_file": text_path.name,
    }
    metadata_path.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    banner(f"RISULTATO {tag}")
    print(f"Durata audio:            {audio_duration:.2f} s")
    print(f"Download modello:        {download_seconds:.2f} s")
    print(f"Caricamento modello:     {load_seconds:.2f} s")
    print(f"Tempo trascrizione:      {transcription_seconds:.2f} s")
    print(f"Real Time Factor:        {rtf:.3f}")
    print(f"Velocita' rispetto audio: {metrics['speed_x_realtime']:.2f}x")
    print(f"Caratteri trascritti:    {len(text)}")
    print(f"Parole trascritte:       {len(text.split())}")
    print(f"Output:                  {text_path}")
    return metrics


def run_parakeet(chunks: list[dict], audio_duration: float) -> dict:
    import sherpa_onnx

    banner("PARAKEET TDT 0.6B V2 INT8 - CPU")
    archive = MODELS_DIR / PARAKEET_ARCHIVE_NAME
    download_seconds = download_file(PARAKEET_URL, archive)
    model_dir = MODELS_DIR / PARAKEET_FOLDER_NAME
    if not model_dir.exists():
        with tarfile.open(archive, "r:bz2") as handle:
            handle.extractall(MODELS_DIR)

    started = time.perf_counter()
    recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=str(model_dir / "encoder.int8.onnx"),
        decoder=str(model_dir / "decoder.int8.onnx"),
        joiner=str(model_dir / "joiner.int8.onnx"),
        tokens=str(model_dir / "tokens.txt"),
        num_threads=PARAKEET_THREADS,
        sample_rate=SAMPLE_RATE,
        feature_dim=80,
        decoding_method="greedy_search",
        provider="cpu",
        model_type="nemo_transducer",
    )
    load_seconds = time.perf_counter() - started

    process = psutil.Process(os.getpid())
    rss_before = process.memory_info().rss
    texts: list[str] = []
    started = time.perf_counter()
    for position, chunk in enumerate(chunks, start=1):
        samples, sample_rate = sf.read(chunk["path"], dtype="float32", always_2d=False)
        stream = recognizer.create_stream()
        stream.accept_waveform(sample_rate, samples)
        recognizer.decode_stream(stream)
        texts.append(stream.result.text.strip())
        print(f"[{position:02d}/{len(chunks):02d}] {Path(chunk['path']).name} completato")
    transcription_seconds = time.perf_counter() - started
    rss_after = process.memory_info().rss

    result = save_result(
        tag="PARAKEET_TDT_0.6B_V2_INT8_CPU",
        model_id="nvidia/parakeet-tdt-0.6b-v2",
        engine="sherpa-onnx CPU INT8",
        text="\n\n".join(texts),
        audio_duration=audio_duration,
        download_seconds=download_seconds,
        load_seconds=load_seconds,
        transcription_seconds=transcription_seconds,
        chunks=chunks,
        extra={
            "threads": PARAKEET_THREADS,
            "decoding_method": "greedy_search",
            "rss_before_bytes": rss_before,
            "rss_after_bytes": rss_after,
        },
    )
    del recognizer
    gc.collect()
    return result


def run_qwen(
    model_id: str,
    tag: str,
    chunks: list[dict],
    audio_duration: float,
) -> dict:
    from qwen_asr import Qwen3ASRModel

    clear_gpu()
    banner(f"{tag} - GPU")

    started = time.perf_counter()
    local_model_path = snapshot_download(model_id, cache_dir=str(MODELS_DIR / "huggingface"))
    download_seconds = time.perf_counter() - started

    # FP16 mantiene il test coerente sia su T4 sia sulle GPU Colab piu' recenti.
    dtype = torch.float16
    started = time.perf_counter()
    model = Qwen3ASRModel.from_pretrained(
        local_model_path,
        dtype=dtype,
        device_map="cuda:0",
        attn_implementation="sdpa",
        max_inference_batch_size=1,
        max_new_tokens=QWEN_MAX_NEW_TOKENS,
        low_cpu_mem_usage=True,
    )
    load_seconds = time.perf_counter() - started
    torch.cuda.reset_peak_memory_stats()

    texts: list[str] = []
    started = time.perf_counter()
    for position, chunk in enumerate(chunks, start=1):
        samples, sample_rate = sf.read(chunk["path"], dtype="float32", always_2d=False)
        result = model.transcribe(
            audio=(samples, sample_rate),
            context=QWEN_CONTEXT,
            language=QWEN_LANGUAGE,
            return_time_stamps=False,
        )[0]
        texts.append(result.text.strip())
        print(f"[{position:02d}/{len(chunks):02d}] {Path(chunk['path']).name} completato")
    transcription_seconds = time.perf_counter() - started
    peak_gpu_bytes = torch.cuda.max_memory_allocated()

    metrics = save_result(
        tag=tag,
        model_id=model_id,
        engine="qwen-asr Transformers GPU",
        text="\n\n".join(texts),
        audio_duration=audio_duration,
        download_seconds=download_seconds,
        load_seconds=load_seconds,
        transcription_seconds=transcription_seconds,
        chunks=chunks,
        extra={
            "dtype": str(dtype),
            "language": QWEN_LANGUAGE,
            "max_inference_batch_size": 1,
            "max_new_tokens_per_chunk": QWEN_MAX_NEW_TOKENS,
            "peak_gpu_memory_bytes_during_transcription": peak_gpu_bytes,
        },
    )

    del model
    clear_gpu()
    return metrics


def save_run_files(
    *,
    input_path: Path,
    wav_path: Path,
    duration: float,
    conversion_seconds: float,
    chunks: list[dict],
    results: list[dict],
) -> Path:
    manifest = {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "original_file": input_path.name,
        "original_sha256": sha256_file(input_path),
        "converted_wav": wav_path.name,
        "converted_wav_sha256": sha256_file(wav_path),
        "audio_duration_seconds": duration,
        "conversion_seconds": conversion_seconds,
        "sample_rate": SAMPLE_RATE,
        "channels": 1,
        "target_chunk_seconds": TARGET_CHUNK_SECONDS,
        "boundary_search_seconds": BOUNDARY_SEARCH_SECONDS,
        "vad_used": False,
        "chunk_overlap_seconds": 0,
        "chunks": chunks,
        "environment": {
            "python": sys.version,
            "platform": platform.platform(),
            "torch": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            "gpu_total_memory_bytes": (
                torch.cuda.get_device_properties(0).total_memory if torch.cuda.is_available() else None
            ),
        },
    }
    (OUTPUT_DIR / "MANIFEST_TEST.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    csv_path = OUTPUT_DIR / "RIEPILOGO_METRICHE.csv"
    fields = [
        "tag",
        "model_id",
        "engine",
        "audio_duration_seconds",
        "chunks",
        "download_seconds",
        "load_seconds",
        "transcription_seconds",
        "rtf",
        "speed_x_realtime",
        "characters",
        "words",
    ]
    with csv_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)

    zip_base = WORK_DIR / "RISULTATI_PARAKEET_QWEN"
    zip_path = Path(shutil.make_archive(str(zip_base), "zip", root_dir=OUTPUT_DIR))
    return zip_path


def main() -> None:
    banner("BENCHMARK ASR: PARAKEET V2 + QWEN3-ASR 0.6B + QWEN3-ASR 1.7B")
    if not torch.cuda.is_available():
        raise RuntimeError(
            "GPU non disponibile. In Colab: Runtime > Change runtime type > T4 GPU, poi riprova."
        )
    prepare_directories()
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print("Qwen context:", repr(QWEN_CONTEXT))

    input_path = upload_one_audio()
    wav_path, duration, conversion_seconds = convert_to_wav(input_path)
    chunks, _audio = split_audio_once(wav_path)
    del _audio
    gc.collect()

    (OUTPUT_DIR / "MANIFEST_SEGMENTI.json").write_text(
        json.dumps(chunks, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"WAV comune: {wav_path}")
    print(f"Durata: {format_seconds(duration)} ({duration:.2f} s)")
    print(f"Segmenti comuni: {len(chunks)}")

    results: list[dict] = []
    results.append(run_parakeet(chunks, duration))
    for model_id, tag in QWEN_MODELS:
        try:
            results.append(run_qwen(model_id, tag, chunks, duration))
        except torch.cuda.OutOfMemoryError as error:
            clear_gpu()
            raise RuntimeError(
                f"Memoria GPU esaurita con {model_id}. Riavvia il runtime e usa una GPU T4/L4/A100 "
                "senza altri modelli gia' caricati."
            ) from error

    zip_path = save_run_files(
        input_path=input_path,
        wav_path=wav_path,
        duration=duration,
        conversion_seconds=conversion_seconds,
        chunks=chunks,
        results=results,
    )

    banner("CONFRONTO COMPLETATO")
    for row in results:
        print(
            f"{row['tag']:<35} "
            f"tempo={row['transcription_seconds']:8.2f}s  "
            f"RTF={row['rtf']:.3f}  "
            f"velocita={row['speed_x_realtime']:.2f}x  "
            f"caratteri={row['characters']}"
        )
    print(f"\nArchivio risultati: {zip_path}")
    files.download(str(zip_path))


if __name__ == "__main__":
    main()

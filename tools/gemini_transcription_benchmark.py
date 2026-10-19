#!/usr/bin/env python3
"""Benchmark resumibile di trascrizione Gemini contro un riferimento testuale.

Le chiavi non vengono mai scritte su disco o mostrate nei log. Il modo consigliato
per usare le chiavi cifrate di Lezionify e':

    npx electron tools/run_gemini_benchmark_with_app_keys.cjs -- \
      --audio local-artifacts/asr/2026-09-10/test_whisper_lezioni.mp3 \
      --reference local-artifacts/asr/2026-09-10/test_whisper_lezioni_OPENAI_LARGE_V3.txt

In alternativa, lo script legge GEMINI_API_KEYS (lista separata da virgole) o
GEMINI_API_KEY. Per evitare che una chiave finisca nella cronologia della shell,
non esiste volutamente un parametro --api-key.
"""

from __future__ import annotations

import argparse
import csv
import difflib
import hashlib
import io
import json
import math
import os
import random
import re
import sys
import time
import unicodedata
import wave
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Sequence, TypeVar

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - i test puri non richiedono l'SDK
    genai = None
    types = None

try:
    import miniaudio
except ImportError:  # pragma: no cover - richiesto solo dal chunking sul silenzio
    miniaudio = None


DEFAULT_PROMPT = """Trascrivi integralmente e fedelmente l'audio allegato.
E' una lezione universitaria di ingegneria informatica, con terminologia tecnica,
formule e parole inglesi. Conserva tutte le parole pronunciate, comprese ripetizioni,
esitazioni e autocorrezioni. Non riassumere, non parafrasare, non completare frasi
inaudibili e non inventare contenuto. Aggiungi soltanto punteggiatura e maiuscole
quando sono chiaramente ricavabili dal parlato. Non inserire introduzioni, commenti,
conclusioni, timestamp, etichette del parlante o Markdown. Restituisci esclusivamente
la trascrizione."""

WORD_RE = re.compile(r"[^\W_]+(?:['’][^\W_]+)?", re.UNICODE)
T = TypeVar("T")
PIPELINE_VERSION = 2
PUNCTUATION_RE = re.compile(r"[.,!?;:…]")
SYMBOL_RE = re.compile(r"(?:\d+(?:[.,]\d+)?)|[-+*/=<>≤≥±×÷]")


class IncompleteTranscriptError(RuntimeError):
    """Risposta formalmente valida ma troppo corta, troncata o incompleta."""

    def __init__(self, message: str, partial_text: str | None = None) -> None:
        super().__init__(message)
        self.partial_text = partial_text


class RequestRejectedError(RuntimeError):
    """Richiesta rifiutata in modo potenzialmente risolvibile con chunk minori."""


class ConfigurationError(RuntimeError):
    """Errore permanente di modello o configurazione."""


@dataclass(frozen=True)
class Mp3Frame:
    offset: int
    length: int
    start_seconds: float
    end_seconds: float


@dataclass
class KeyState:
    index: int
    cooldown_until: float = 0.0
    disabled_reason: str | None = None
    transient_failures: int = 0
    quota_failures: int = 0


@dataclass
class ErrorInfo:
    category: str
    status_code: int | None
    retry_after_seconds: float | None
    safe_message: str


@dataclass
class Metrics:
    reference_words: int
    candidate_words: int
    substitutions: int
    deletions: int
    insertions: int
    wer_percent: float
    word_accuracy_percent: float
    cer_percent: float
    raw_cer_percent: float
    formatting_token_error_rate_percent: float
    punctuation_error_rate_percent: float
    symbol_error_rate_percent: float
    sequence_similarity_percent: float
    bag_of_words_f1_percent: float


def safe_log(message: str) -> None:
    print(message, flush=True)


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    os.replace(temporary, path)


def atomic_write_json(path: Path, value: Any) -> None:
    atomic_write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def atomic_write_csv(path: Path, rows: Sequence[dict[str, str]]) -> None:
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(
        buffer,
        fieldnames=["operation", "reference", "gemini", "reference_context"],
    )
    writer.writeheader()
    writer.writerows(rows)
    atomic_write_text(path, buffer.getvalue())


def load_checkpoint(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(loaded, dict):
        return {}
    for list_field in ("request_events", "rejected_outputs"):
        if not isinstance(loaded.get(list_field), list):
            loaded[list_field] = []
    if not isinstance(loaded.get("completed"), dict):
        loaded["completed"] = {}
    return loaded


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _synchsafe(value: bytes) -> int:
    return ((value[0] & 0x7F) << 21) | ((value[1] & 0x7F) << 14) | ((value[2] & 0x7F) << 7) | (value[3] & 0x7F)


def parse_mp3_frames(data: bytes) -> tuple[bytes, list[Mp3Frame]]:
    """Analizza frame MPEG Layer III sufficienti per un taglio lossless."""
    position = 0
    id3_prefix = b""
    if len(data) >= 10 and data[:3] == b"ID3":
        flags = data[5]
        tag_length = 10 + _synchsafe(data[6:10]) + (10 if flags & 0x10 else 0)
        id3_prefix = data[:tag_length]
        position = tag_length

    bitrate_v1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    bitrate_v2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    sample_rates = {
        0b11: [44100, 48000, 32000],
        0b10: [22050, 24000, 16000],
        0b00: [11025, 12000, 8000],
    }
    frames: list[Mp3Frame] = []
    elapsed = 0.0
    while position + 4 <= len(data):
        header = int.from_bytes(data[position : position + 4], "big")
        if (header >> 21) & 0x7FF != 0x7FF:
            position += 1
            continue
        version = (header >> 19) & 0b11
        layer = (header >> 17) & 0b11
        bitrate_index = (header >> 12) & 0xF
        sample_index = (header >> 10) & 0b11
        padding = (header >> 9) & 1
        if version == 0b01 or layer != 0b01 or sample_index == 0b11 or bitrate_index in (0, 15):
            position += 1
            continue
        bitrate = (bitrate_v1 if version == 0b11 else bitrate_v2)[bitrate_index]
        sample_rate = sample_rates[version][sample_index]
        coefficient = 144000 if version == 0b11 else 72000
        frame_length = coefficient * bitrate // sample_rate + padding
        samples = 1152 if version == 0b11 else 576
        if frame_length < 24 or position + frame_length > len(data):
            position += 1
            continue
        duration = samples / sample_rate
        frames.append(Mp3Frame(position, frame_length, elapsed, elapsed + duration))
        elapsed += duration
        position += frame_length
    if not frames:
        raise ValueError("Nessun frame MP3 Layer III valido trovato.")
    return id3_prefix, frames


def split_mp3_at_boundaries(
    audio_path: Path,
    output_dir: Path,
    boundaries: Sequence[float],
    overlap_seconds: float,
) -> tuple[float, list[dict[str, Any]]]:
    data = audio_path.read_bytes()
    id3_prefix, frames = parse_mp3_frames(data)
    duration = frames[-1].end_seconds
    normalized_boundaries = [0.0, *boundaries, duration]
    if any(
        right <= left
        for left, right in zip(normalized_boundaries, normalized_boundaries[1:])
    ):
        raise ValueError("I confini dei segmenti MP3 non sono strettamente crescenti.")
    chunks = len(normalized_boundaries) - 1
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, Any]] = []
    for index in range(chunks):
        logical_start = normalized_boundaries[index]
        logical_end = normalized_boundaries[index + 1]
        physical_start = max(0.0, logical_start - (overlap_seconds if index else 0.0))
        physical_end = min(duration, logical_end + (overlap_seconds if index < chunks - 1 else 0.0))
        selected = [frame for frame in frames if frame.end_seconds > physical_start and frame.start_seconds < physical_end]
        if not selected:
            raise ValueError(f"Il segmento {index + 1} non contiene frame audio.")
        chunk_path = output_dir / f"chunk_{index + 1:02d}_of_{chunks:02d}.mp3"
        body = b"".join(data[frame.offset : frame.offset + frame.length] for frame in selected)
        chunk_path.write_bytes(id3_prefix + body)
        manifest.append(
            {
                "index": index + 1,
                "path": str(chunk_path),
                "logical_start_seconds": round(logical_start, 3),
                "logical_end_seconds": round(logical_end, 3),
                "audio_start_seconds": round(selected[0].start_seconds, 3),
                "audio_end_seconds": round(selected[-1].end_seconds, 3),
                "sha256": sha256_file(chunk_path),
                "bytes": chunk_path.stat().st_size,
            }
        )
    return duration, manifest


def split_mp3_losslessly(
    audio_path: Path,
    output_dir: Path,
    chunks: int,
    overlap_seconds: float,
) -> tuple[float, list[dict[str, Any]]]:
    data = audio_path.read_bytes()
    _, frames = parse_mp3_frames(data)
    duration = frames[-1].end_seconds
    boundaries = [duration * index / chunks for index in range(1, chunks)]
    return split_mp3_at_boundaries(audio_path, output_dir, boundaries, overlap_seconds)


def choose_quiet_boundary(
    powers: Sequence[float],
    bin_seconds: float,
    target_seconds: float,
    search_seconds: float,
    smoothing_seconds: float = 0.8,
) -> tuple[float, float]:
    if not powers or bin_seconds <= 0:
        raise ValueError("Profilo energetico vuoto o risoluzione non valida.")
    smoothing_bins = max(1, round(smoothing_seconds / bin_seconds))
    half_window = smoothing_bins // 2
    prefix = [0.0]
    for power in powers:
        prefix.append(prefix[-1] + max(0.0, float(power)))
    start_index = max(0, math.floor((target_seconds - search_seconds) / bin_seconds))
    end_index = min(len(powers) - 1, math.ceil((target_seconds + search_seconds) / bin_seconds))
    candidates: list[tuple[float, float]] = []
    for index in range(start_index, end_index + 1):
        left = max(0, index - half_window)
        right = min(len(powers), left + smoothing_bins)
        left = max(0, right - smoothing_bins)
        average_power = (prefix[right] - prefix[left]) / max(1, right - left)
        center_seconds = (index + 0.5) * bin_seconds
        candidates.append((average_power, center_seconds))
    if not candidates:
        raise ValueError("Nessun candidato disponibile nella finestra di ricerca del silenzio.")
    minimum_power = min(power for power, _ in candidates)
    quiet_limit = minimum_power * 2.0 if minimum_power > 0 else 0.0
    quiet_candidates = [
        (power, seconds)
        for power, seconds in candidates
        if power <= quiet_limit
    ]
    selected_power, selected_seconds = min(
        quiet_candidates,
        key=lambda item: (abs(item[1] - target_seconds), item[0]),
    )
    dbfs = 10.0 * math.log10(max(selected_power, 1.0) / (32768.0**2))
    return selected_seconds, round(dbfs, 2)


def detect_silence_boundaries(
    audio_path: Path,
    duration_seconds: float,
    target_seconds: float = 15 * 60,
    search_seconds: float = 60.0,
) -> list[dict[str, float]]:
    if miniaudio is None:
        raise ConfigurationError(
            "Per il taglio intelligente installa le dipendenze con: "
            "python -m pip install -r tools/requirements-gemini-transcription.txt"
        )
    sample_rate = 8000
    bin_seconds = 0.1
    frames_per_bin = round(sample_rate * bin_seconds)
    powers: list[float] = []
    stream = miniaudio.stream_file(
        str(audio_path),
        output_format=miniaudio.SampleFormat.SIGNED16,
        nchannels=1,
        sample_rate=sample_rate,
        frames_to_read=frames_per_bin,
    )
    for samples in stream:
        if samples:
            powers.append(sum(int(sample) ** 2 for sample in samples) / len(samples))
    if not powers:
        raise RuntimeError("Miniaudio non ha prodotto campioni per la ricerca dei silenzi.")
    selections: list[dict[str, float]] = []
    target = target_seconds
    minimum_final_chunk = target_seconds * 0.5
    while target < duration_seconds - minimum_final_chunk:
        selected, dbfs = choose_quiet_boundary(
            powers,
            bin_seconds,
            target,
            search_seconds,
        )
        if selections and selected <= selections[-1]["selected_seconds"]:
            selected = target
        selections.append(
            {
                "target_seconds": round(target, 3),
                "selected_seconds": round(selected, 3),
                "offset_seconds": round(selected - target, 3),
                "window_dbfs": dbfs,
            }
        )
        target += target_seconds
    return selections


def write_wav_chunks(
    audio_path: Path,
    output_dir: Path,
    duration_seconds: float,
    boundaries: Sequence[float],
    overlap_seconds: float,
) -> list[dict[str, Any]]:
    if miniaudio is None:
        raise ConfigurationError(
            "Per creare chunk WAV installa le dipendenze con: "
            "python -m pip install -r tools/requirements-gemini-transcription.txt"
        )
    output_dir.mkdir(parents=True, exist_ok=True)
    sample_rate = 16000
    normalized_boundaries = [0.0, *boundaries, duration_seconds]
    chunks = len(normalized_boundaries) - 1
    manifest: list[dict[str, Any]] = []
    for index in range(chunks):
        logical_start = normalized_boundaries[index]
        logical_end = normalized_boundaries[index + 1]
        audio_start = max(0.0, logical_start - (overlap_seconds if index else 0.0))
        audio_end = min(
            duration_seconds,
            logical_end + (overlap_seconds if index < chunks - 1 else 0.0),
        )
        start_frame = round(audio_start * sample_rate)
        frames_remaining = max(1, round((audio_end - audio_start) * sample_rate))
        chunk_path = output_dir / f"chunk_{index + 1:02d}_of_{chunks:02d}.wav"
        temporary = chunk_path.with_suffix(".wav.tmp")
        try:
            with wave.open(str(temporary), "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(sample_rate)
                stream = miniaudio.stream_file(
                    str(audio_path),
                    output_format=miniaudio.SampleFormat.SIGNED16,
                    nchannels=1,
                    sample_rate=sample_rate,
                    frames_to_read=4096,
                    seek_frame=start_frame,
                )
                for samples in stream:
                    if frames_remaining <= 0:
                        break
                    selected = samples[:frames_remaining]
                    output.writeframesraw(selected.tobytes())
                    frames_remaining -= len(selected)
            os.replace(temporary, chunk_path)
        finally:
            if temporary.exists():
                temporary.unlink()
        manifest.append(
            {
                "index": index + 1,
                "path": str(chunk_path),
                "mime_type": "audio/wav",
                "logical_start_seconds": round(logical_start, 3),
                "logical_end_seconds": round(logical_end, 3),
                "audio_start_seconds": round(audio_start, 3),
                "audio_end_seconds": round(audio_end, 3),
                "sha256": sha256_file(chunk_path),
                "bytes": chunk_path.stat().st_size,
            }
        )
    return manifest


def normalize_words(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFKC", text).casefold().replace("’", "'")
    return WORD_RE.findall(normalized)


def normalized_characters(text: str) -> str:
    return " ".join(normalize_words(text))


def normalized_raw_text(text: str) -> str:
    """Preserva maiuscole, punteggiatura e simboli normalizzando gli spazi."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip()


def formatting_tokens(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFKC", text)
    return re.findall(r"[^\W_]+(?:['’][^\W_]+)?|\d+(?:[.,]\d+)?|[.,!?;:…]|[-+*/=<>≤≥±×÷]", normalized, re.UNICODE)


def edit_counts(reference: Sequence[str], candidate: Sequence[str]) -> tuple[int, int, int]:
    """Levenshtein con conteggio S/D/I e memoria lineare."""
    previous = [(index, 0, 0, index) for index in range(len(candidate) + 1)]
    for row, ref_word in enumerate(reference, start=1):
        current = [(row, 0, row, 0)]
        for column, candidate_word in enumerate(candidate, start=1):
            if ref_word == candidate_word:
                current.append(previous[column - 1])
                continue
            sub = previous[column - 1]
            delete = previous[column]
            insert = current[column - 1]
            choices = [
                (sub[0] + 1, sub[1] + 1, sub[2], sub[3]),
                (delete[0] + 1, delete[1], delete[2] + 1, delete[3]),
                (insert[0] + 1, insert[1], insert[2], insert[3] + 1),
            ]
            current.append(min(choices, key=lambda item: (item[0], item[1], item[2], item[3])))
        previous = current
    _, substitutions, deletions, insertions = previous[-1]
    return substitutions, deletions, insertions


def levenshtein_distance(reference: str, candidate: str) -> int:
    """Distanza Levenshtein esatta bit-parallela, efficiente per testi lunghi."""
    if not reference:
        return len(candidate)
    if not candidate:
        return len(reference)
    if len(reference) > len(candidate):
        reference, candidate = candidate, reference
    width = len(reference)
    mask = (1 << width) - 1
    high_bit = 1 << (width - 1)
    positions: dict[str, int] = {}
    for index, character in enumerate(reference):
        positions[character] = positions.get(character, 0) | (1 << index)
    positive = mask
    negative = 0
    distance = width
    for character in candidate:
        equal = positions.get(character, 0)
        vertical = equal | negative
        horizontal = (((equal & positive) + positive) ^ positive) | equal
        positive_horizontal = negative | ~(horizontal | positive)
        negative_horizontal = positive & horizontal
        if positive_horizontal & high_bit:
            distance += 1
        elif negative_horizontal & high_bit:
            distance -= 1
        positive_horizontal = ((positive_horizontal << 1) | 1) & mask
        negative_horizontal = (negative_horizontal << 1) & mask
        positive = (negative_horizontal | ~(vertical | positive_horizontal)) & mask
        negative = positive_horizontal & vertical
    return distance


def calculate_metrics(reference: str, candidate: str) -> Metrics:
    ref_words = normalize_words(reference)
    cand_words = normalize_words(candidate)
    substitutions, deletions, insertions = edit_counts(ref_words, cand_words)
    denominator = max(1, len(ref_words))
    wer = 100.0 * (substitutions + deletions + insertions) / denominator
    ref_chars = normalized_characters(reference)
    cand_chars = normalized_characters(candidate)
    character_distance = levenshtein_distance(ref_chars, cand_chars)
    ref_raw = normalized_raw_text(reference)
    cand_raw = normalized_raw_text(candidate)
    raw_character_distance = levenshtein_distance(ref_raw, cand_raw)
    ref_formatting = formatting_tokens(reference)
    cand_formatting = formatting_tokens(candidate)
    formatting_distance = sum(edit_counts(ref_formatting, cand_formatting))
    ref_punctuation = "".join(PUNCTUATION_RE.findall(reference))
    cand_punctuation = "".join(PUNCTUATION_RE.findall(candidate))
    ref_symbols = " ".join(SYMBOL_RE.findall(reference))
    cand_symbols = " ".join(SYMBOL_RE.findall(candidate))
    overlap = sum((Counter(ref_words) & Counter(cand_words)).values())
    precision = overlap / max(1, len(cand_words))
    recall = overlap / denominator
    bag_f1 = 2 * precision * recall / max(1e-12, precision + recall)
    return Metrics(
        reference_words=len(ref_words),
        candidate_words=len(cand_words),
        substitutions=substitutions,
        deletions=deletions,
        insertions=insertions,
        wer_percent=round(wer, 3),
        word_accuracy_percent=round(max(0.0, 100.0 - wer), 3),
        cer_percent=round(100.0 * character_distance / max(1, len(ref_chars)), 3),
        raw_cer_percent=round(100.0 * raw_character_distance / max(1, len(ref_raw)), 3),
        formatting_token_error_rate_percent=round(100.0 * formatting_distance / max(1, len(ref_formatting)), 3),
        punctuation_error_rate_percent=round(100.0 * levenshtein_distance(ref_punctuation, cand_punctuation) / max(1, len(ref_punctuation)), 3),
        symbol_error_rate_percent=round(100.0 * levenshtein_distance(ref_symbols, cand_symbols) / max(1, len(ref_symbols)), 3),
        sequence_similarity_percent=round(100.0 * difflib.SequenceMatcher(None, ref_words, cand_words, autojunk=False).ratio(), 3),
        bag_of_words_f1_percent=round(100.0 * bag_f1, 3),
    )


def strip_model_wrappers(text: str) -> str:
    value = text.strip()
    value = re.sub(r"^```(?:text|plaintext)?\s*", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\s*```$", "", value)
    value = re.sub(r"^\s*(?:trascrizione(?:\s+grezza)?|transcript)\s*:\s*", "", value, flags=re.IGNORECASE)
    return value.strip()


def trim_prefix_words(text: str, count: int) -> str:
    if count <= 0:
        return text
    matches = list(WORD_RE.finditer(text))
    if count >= len(matches):
        return ""
    return text[matches[count].start() :].lstrip(" \t\r\n,.;:-")


def merge_with_overlap(parts: Sequence[str], max_words: int = 100) -> tuple[str, list[int]]:
    if not parts:
        return "", []
    merged = parts[0].strip()
    removed: list[int] = [0]
    for next_part in parts[1:]:
        left = normalize_words(merged)
        right = normalize_words(next_part)
        best_count = 0
        limit = min(max_words, len(left), len(right))
        for count in range(2, limit + 1):
            if left[-count:] == right[:count]:
                best_count = count
        suffix = trim_prefix_words(next_part.strip(), best_count)
        merged = merged.rstrip() + ("\n\n" + suffix if suffix else "")
        removed.append(best_count)
    return merged.strip() + "\n", removed


def safe_error_message(error: Exception, status_code: int | None) -> str:
    text = str(error)
    text = re.sub(r"AIza[0-9A-Za-z_-]{20,}", "<chiave-redatta>", text)
    text = re.sub(r"(?i)(x-goog-api-key[\"' :=]+)[^\s,}\]]+", r"\1<redatta>", text)
    text = re.sub(r"\s+", " ", text).strip()
    prefix = f"HTTP {status_code}: " if status_code else ""
    return (prefix + text)[:500]


def classify_error(error: Exception) -> ErrorInfo:
    code = getattr(error, "code", None) or getattr(error, "status_code", None)
    try:
        status_code = int(code) if code is not None else None
    except (TypeError, ValueError):
        status_code = None
    raw = str(error)
    lower = raw.casefold()
    retry_match = re.search(r"(?:retry(?:delay|[- ]after)?|retry in)[^0-9]{0,20}([0-9]+(?:\.[0-9]+)?)\s*s", lower)
    retry_after = float(retry_match.group(1)) if retry_match else None
    if status_code == 429 or "resource_exhausted" in lower or "quota" in lower:
        category = "daily_quota" if any(token in lower for token in ("per day", "requests per day", "rpd", "daily")) else "rate_limit"
    elif status_code in (401, 403) or any(token in lower for token in ("api key not valid", "permission_denied", "unauthenticated")):
        category = "invalid_key"
    elif status_code == 404 or "not_found" in lower or "model is not found" in lower:
        category = "unsupported_model"
    elif status_code == 400 or "invalid_argument" in lower:
        category = "bad_request"
    elif status_code in (408, 409, 425) or (status_code is not None and status_code >= 500):
        category = "transient"
    elif isinstance(error, (TimeoutError, ConnectionError, OSError)):
        category = "transient"
    else:
        category = "transient"
    return ErrorInfo(category, status_code, retry_after, safe_error_message(error, status_code))


class RotatingGeminiPool:
    def __init__(
        self,
        api_keys: Sequence[str],
        all_keys_wait: float,
        max_total_wait: float,
        request_timeout: float,
        deadline: float | None = None,
        max_transient_attempts: int | None = None,
    ) -> None:
        unique = list(dict.fromkeys(key.strip() for key in api_keys if key.strip()))
        if not unique:
            raise ValueError("Nessuna chiave API disponibile.")
        self._keys = unique
        self.states = [KeyState(index=index) for index in range(len(unique))]
        self.cursor = 0
        self.all_keys_wait = max(1.0, all_keys_wait)
        self.max_total_wait = max_total_wait
        self.request_timeout = request_timeout
        self.total_wait = 0.0
        self.attempts = 0
        self.transient_attempts = 0
        self.max_transient_attempts = max_transient_attempts
        self.events: list[dict[str, Any]] = []
        self.deadline = deadline if deadline is not None else (
            time.monotonic() + max_total_wait if max_total_wait > 0 else None
        )

    def _remaining_seconds(self) -> float | None:
        if self.deadline is None:
            return None
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError(
                f"Deadline globale superata ({self.max_total_wait:.0f}s); "
                "i checkpoint consentono di riprendere senza perdere segmenti."
            )
        return remaining

    def _next_available(self) -> KeyState | None:
        now = time.time()
        for offset in range(len(self.states)):
            idx = (self.cursor + offset) % len(self.states)
            state = self.states[idx]
            if state.disabled_reason is None and state.cooldown_until <= now:
                self.cursor = (idx + 1) % len(self.states)
                return state
        return None

    def _wait_for_pool(self) -> None:
        usable = [state for state in self.states if state.disabled_reason is None]
        if not usable:
            reasons = "; ".join(f"chiave {state.index + 1}: {state.disabled_reason}" for state in self.states)
            raise RuntimeError(f"Tutte le chiavi sono state disabilitate ({reasons}).")
        earliest = max(0.0, min(state.cooldown_until for state in usable) - time.time())
        delay = max(self.all_keys_wait, earliest)
        remaining = self._remaining_seconds()
        if remaining is not None and delay > remaining:
            raise TimeoutError(
                f"Deadline globale superata ({self.max_total_wait:.0f}s); "
                "i checkpoint consentono di riprendere senza perdere segmenti."
            )
        safe_log(f"  Tutte le chiavi sono in pausa; attendo {delay:.1f}s prima di riprovare.")
        time.sleep(delay)
        self.total_wait += delay

    def call(self, operation: Callable[[Any, int], T], label: str) -> T:
        while True:
            remaining = self._remaining_seconds()
            state = self._next_available()
            if state is None:
                self._wait_for_pool()
                continue
            self.attempts += 1
            started_at = datetime.now(timezone.utc).isoformat()
            safe_log(f"  {label}: tentativo {self.attempts}, chiave {state.index + 1}/{len(self.states)}.")
            if genai is None or types is None:
                raise ConfigurationError(
                    "SDK mancante o incompleto. Installa: python -m pip install "
                    "'google-genai>=2.23,<3'"
                )
            effective_timeout = self.request_timeout if remaining is None else min(self.request_timeout, remaining)
            client = None
            try:
                client = genai.Client(
                    api_key=self._keys[state.index],
                    http_options=types.HttpOptions(
                        timeout=max(1, int(effective_timeout * 1000)),
                        retry_options=types.HttpRetryOptions(attempts=1),
                    ),
                )
                result = operation(client, state.index)
                state.transient_failures = 0
                self.events.append(
                    {
                        "at": started_at,
                        "operation": label,
                        "key_index": state.index + 1,
                        "outcome": "success",
                    }
                )
                return result
            except KeyboardInterrupt:
                raise
            except IncompleteTranscriptError as error:
                self.events.append(
                    {
                        "at": started_at,
                        "operation": label,
                        "key_index": state.index + 1,
                        "outcome": "rejected",
                        "category": type(error).__name__,
                        "reason": str(error),
                    }
                )
                state.cooldown_until = time.time() + self.all_keys_wait
                raise
            except (RequestRejectedError, ConfigurationError) as error:
                self.events.append(
                    {
                        "at": started_at,
                        "operation": label,
                        "key_index": state.index + 1,
                        "outcome": "rejected",
                        "category": type(error).__name__,
                    }
                )
                raise
            except Exception as error:
                info = classify_error(error)
                self.events.append(
                    {
                        "at": started_at,
                        "operation": label,
                        "key_index": state.index + 1,
                        "outcome": "error",
                        "category": info.category,
                        "status_code": info.status_code,
                        "retry_after_seconds": info.retry_after_seconds,
                    }
                )
                safe_log(f"  Errore {info.category} sulla chiave {state.index + 1}: {info.safe_message}")
                now = time.time()
                if info.category == "invalid_key":
                    state.disabled_reason = "non valida o non autorizzata"
                elif info.category == "daily_quota":
                    state.quota_failures += 1
                    state.cooldown_until = now + (info.retry_after_seconds or 6 * 60 * 60)
                elif info.category == "rate_limit":
                    state.quota_failures += 1
                    exponent = min(state.quota_failures - 1, 6)
                    state.cooldown_until = now + (info.retry_after_seconds or min(60.0, 2.0**exponent)) + random.uniform(0.25, 1.5)
                elif info.category in ("unsupported_model", "bad_request"):
                    if info.category == "unsupported_model":
                        raise ConfigurationError(f"Modello non disponibile: {info.safe_message}") from error
                    raise RequestRejectedError(f"Richiesta rifiutata: {info.safe_message}") from error
                else:
                    state.transient_failures += 1
                    self.transient_attempts += 1
                    if (
                        self.max_transient_attempts is not None
                        and self.transient_attempts >= self.max_transient_attempts
                    ):
                        raise RequestRejectedError(
                            "Errori transitori ripetuti sul file intero; provo il fallback a segmenti."
                        ) from error
                    state.cooldown_until = now + min(60.0, 2.0 ** min(state.transient_failures, 6)) + random.uniform(0.25, 1.5)
            finally:
                if client is not None:
                    try:
                        client.close()
                    except Exception:
                        pass

    def summary(self) -> list[dict[str, Any]]:
        now = time.time()
        return [
            {
                "key_index": state.index + 1,
                "disabled": state.disabled_reason is not None,
                "disabled_reason": state.disabled_reason,
                "cooldown_until_epoch": round(state.cooldown_until, 3),
                "cooldown_remaining_seconds": round(max(0.0, state.cooldown_until - now), 1),
                "quota_failures": state.quota_failures,
                "transient_failures": state.transient_failures,
            }
            for state in self.states
        ]

    def restore(
        self,
        saved_states: Any,
        request_events: Any,
    ) -> None:
        if isinstance(saved_states, list):
            by_index = {
                item.get("key_index"): item
                for item in saved_states
                if isinstance(item, dict)
            }
            for state in self.states:
                saved = by_index.get(state.index + 1)
                if not isinstance(saved, dict):
                    continue
                reason = saved.get("disabled_reason")
                state.disabled_reason = str(reason) if reason else None
                state.quota_failures = int(saved.get("quota_failures", 0) or 0)
                state.transient_failures = int(saved.get("transient_failures", 0) or 0)
                absolute_cooldown = saved.get("cooldown_until_epoch")
                if isinstance(absolute_cooldown, (int, float)):
                    state.cooldown_until = max(0.0, float(absolute_cooldown))
        if isinstance(request_events, list):
            for event in reversed(request_events):
                if not isinstance(event, dict):
                    continue
                key_index = event.get("key_index")
                if isinstance(key_index, int) and 1 <= key_index <= len(self.states):
                    self.cursor = key_index % len(self.states)
                    break


def wait_until_file_active(
    client: Any,
    uploaded: Any,
    timeout_seconds: float = 300.0,
    global_deadline: float | None = None,
) -> Any:
    name = getattr(uploaded, "name", None)
    if not name:
        raise RuntimeError("Upload completato senza identificatore file.")
    deadline = time.monotonic() + timeout_seconds
    current = uploaded
    while True:
        state = str(getattr(current, "state", "ACTIVE")).upper()
        if "FAILED" in state:
            raise RuntimeError("Elaborazione remota del file audio fallita.")
        if "PROCESSING" not in state and "UNSPECIFIED" not in state:
            return current
        if time.monotonic() >= deadline or (
            global_deadline is not None and time.monotonic() >= global_deadline
        ):
            raise TimeoutError("Timeout durante l'elaborazione remota del file audio.")
        time.sleep(2)
        current = client.files.get(name=name)


def extract_interaction_text(response: Any) -> str | None:
    direct = getattr(response, "output_text", None)
    if direct and str(direct).strip():
        return str(direct)
    fragments: list[str] = []
    containers = list(getattr(response, "outputs", None) or [])
    containers.extend(
        step
        for step in (getattr(response, "steps", None) or [])
        if str(getattr(step, "type", "")).casefold() != "user_input"
    )
    for output in containers:
        text = getattr(output, "text", None)
        if text and str(text).strip():
            fragments.append(str(text).strip())
            continue
        for content in getattr(output, "content", None) or []:
            content_text = getattr(content, "text", None)
            if content_text and str(content_text).strip():
                fragments.append(str(content_text).strip())
            raw = getattr(content, "raw", None)
            if isinstance(raw, dict):
                for key in ("text", "transcript", "transcription"):
                    raw_text = raw.get(key)
                    if isinstance(raw_text, str) and raw_text.strip():
                        fragments.append(raw_text.strip())
        raw_output = getattr(output, "raw", None)
        if isinstance(raw_output, dict):
            for key in ("text", "transcript", "transcription"):
                raw_text = raw_output.get(key)
                if isinstance(raw_text, str) and raw_text.strip():
                    fragments.append(raw_text.strip())
    return "\n".join(fragments) if fragments else None


def interaction_shape(response: Any) -> str:
    descriptions: list[str] = []
    for step in getattr(response, "steps", None) or []:
        step_type = str(getattr(step, "type", type(step).__name__))
        content_types = [
            str(getattr(content, "type", type(content).__name__))
            for content in (getattr(step, "content", None) or [])
        ]
        raw = getattr(step, "raw", None)
        raw_keys = sorted(str(key) for key in raw) if isinstance(raw, dict) else []
        descriptions.append(
            f"{step_type}(content={content_types}, raw_keys={raw_keys})"
        )
    status = str(getattr(response, "status", "unknown"))
    return f"status={status}, steps=[{'; '.join(descriptions)}]"


def transcribe_once(
    client: Any,
    chunk_path: Path,
    model: str,
    language: str | None,
    vocabulary: Sequence[str],
    global_deadline: float | None = None,
) -> str:
    uploaded = None
    try:
        mime_type = "audio/wav" if chunk_path.suffix.casefold() == ".wav" else "audio/mpeg"
        uploaded = client.files.upload(file=str(chunk_path), config={"mime_type": mime_type})
        uploaded = wait_until_file_active(client, uploaded, global_deadline=global_deadline)
        if model == "gemini-3.5-transcribe":
            uri = getattr(uploaded, "uri", None)
            mime_type = getattr(uploaded, "mime_type", None) or mime_type
            if not uri:
                raise RuntimeError("Il file remoto non espone un URI utilizzabile.")
            transcription_config: dict[str, Any] = {"mode": {"type": "verbatim"}}
            if language:
                transcription_config["language_codes"] = [language]
            if vocabulary:
                transcription_config["custom_vocabulary"] = list(vocabulary[:1000])
            response = client.interactions.create(
                model=model,
                input=[{"type": "audio", "uri": uri, "mime_type": mime_type}],
                generation_config={"transcription_config": transcription_config},
            )
            text = extract_interaction_text(response)
            status = str(getattr(response, "status", "")).casefold()
            if status and "completed" not in status:
                raise IncompleteTranscriptError(
                    f"Interazione terminata con stato non completo: {status}.",
                    str(text) if text else None,
                )
        else:
            response = client.models.generate_content(
                model=model,
                contents=[uploaded, DEFAULT_PROMPT],
                config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=32768),
            )
            finish_reasons = {
                str(getattr(candidate, "finish_reason", "")).upper()
                for candidate in (getattr(response, "candidates", None) or [])
            }
            if any("MAX_TOKENS" in reason or "SAFETY" in reason for reason in finish_reasons):
                partial_text = getattr(response, "text", None)
                raise IncompleteTranscriptError(
                    f"Generazione non completa: {', '.join(sorted(finish_reasons))}.",
                    str(partial_text) if partial_text else None,
                )
            text = getattr(response, "text", None)
        if not text or not str(text).strip():
            detail = interaction_shape(response) if model == "gemini-3.5-transcribe" else ""
            raise IncompleteTranscriptError(
                f"Il modello ha restituito una trascrizione vuota. {detail}".strip()
            )
        return str(text)
    finally:
        if uploaded is not None and getattr(uploaded, "name", None):
            try:
                client.files.delete(name=uploaded.name)
            except Exception:
                safe_log("  Avviso: pulizia del file remoto non riuscita; Google lo elimina entro 48 ore.")


def load_keys_from_stdin_or_environment(read_stdin: bool) -> list[str]:
    values: list[str] = []
    if read_stdin:
        raw = sys.stdin.read()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError("Lo standard input non contiene una lista JSON valida di chiavi.") from exc
        if not isinstance(parsed, list):
            raise ValueError("Lo standard input deve contenere una lista JSON di chiavi.")
        values.extend(str(item) for item in parsed)
    multi = os.environ.get("GEMINI_API_KEYS", "")
    single = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
    values.extend(multi.split(","))
    if single:
        values.append(single)
    return list(dict.fromkeys(value.strip() for value in values if value.strip()))


def load_vocabulary(path: Path | None) -> list[str]:
    if path is None:
        return []
    terms = []
    for line in path.read_text(encoding="utf-8").splitlines():
        term = line.strip()
        if term and not term.startswith("#"):
            terms.append(term)
    return list(dict.fromkeys(terms))[:1000]


def detect_language(reference: str) -> str | None:
    words = normalize_words(reference[:20000])
    english = sum(word in {"the", "and", "that", "this", "with", "from", "we", "is", "of", "to"} for word in words)
    italian = sum(word in {"il", "la", "che", "questo", "con", "della", "e", "di", "un", "una"} for word in words)
    if english > italian * 1.5 and english >= 5:
        return "en-US"
    if italian > english * 1.5 and italian >= 5:
        return "it-IT"
    return None


STOPWORDS = {
    "about", "actually", "because", "between", "could", "different", "does", "everything", "going", "however",
    "maybe", "other", "should", "something", "there", "these", "thing", "those", "through", "using", "which", "would",
    "abbiamo", "anche", "avere", "come", "della", "delle", "dentro", "essere", "questo", "quindi", "senza", "tutto",
}


def technical_term_audit(reference: str, candidate: str, limit: int = 35) -> tuple[list[tuple[str, int]], list[tuple[str, int]]]:
    ref = Counter(normalize_words(reference))
    cand = Counter(normalize_words(candidate))
    candidates = [(word, count) for word, count in ref.items() if len(word) >= 7 and word not in STOPWORDS]
    candidates.sort(key=lambda item: (-(len(item[0]) * math.log2(item[1] + 2)), item[0]))
    preserved = [(word, count) for word, count in candidates if cand[word] > 0][:limit]
    missing = [(word, count) for word, count in candidates if cand[word] == 0][:limit]
    return preserved, missing


def disagreement_rows(reference: str, candidate: str, limit: int = 80) -> list[dict[str, str]]:
    ref = normalize_words(reference)
    cand = normalize_words(candidate)
    matcher = difflib.SequenceMatcher(None, ref, cand, autojunk=False)
    rows: list[dict[str, str]] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        rows.append(
            {
                "operation": tag,
                "reference": " ".join(ref[i1:i2])[:300],
                "gemini": " ".join(cand[j1:j2])[:300],
                "reference_context": " ".join(ref[max(0, i1 - 8) : min(len(ref), i2 + 8)])[:500],
            }
        )
        if len(rows) >= limit:
            break
    return rows


def markdown_report(
    model: str,
    duration: float,
    metrics: Metrics | None,
    removed_overlap: Sequence[int],
    preserved: Sequence[tuple[str, int]],
    missing: Sequence[tuple[str, int]],
    output_dir: Path,
) -> str:
    if metrics is None:
        comparison = """## Confronto

Nessun riferimento e stato fornito: la trascrizione e stata prodotta e validata,
ma le metriche comparative non sono disponibili.
"""
        comparison_files = ""
    else:
        comparison = f"""## Metriche rispetto al riferimento

| Metrica | Valore |
|---|---:|
| Parole riferimento | {metrics.reference_words} |
| Parole Gemini | {metrics.candidate_words} |
| Sostituzioni | {metrics.substitutions} |
| Cancellazioni | {metrics.deletions} |
| Inserimenti | {metrics.insertions} |
| WER normalizzato | {metrics.wer_percent:.3f}% |
| Accuratezza parole (1-WER, minimo 0) | {metrics.word_accuracy_percent:.3f}% |
| CER normalizzato | {metrics.cer_percent:.3f}% |
| CER grezzo (maiuscole e punteggiatura incluse) | {metrics.raw_cer_percent:.3f}% |
| Errore token di formattazione | {metrics.formatting_token_error_rate_percent:.3f}% |
| Errore sequenza punteggiatura | {metrics.punctuation_error_rate_percent:.3f}% |
| Errore numeri e simboli | {metrics.symbol_error_rate_percent:.3f}% |
| Similarita sequenziale | {metrics.sequence_similarity_percent:.3f}% |
| F1 bag-of-words | {metrics.bag_of_words_f1_percent:.3f}% |

Queste metriche misurano l'accordo con il riferimento, non la verita assoluta.
Una divergenza puo essere un errore di Gemini oppure una correzione di un errore
del riferimento; i casi tecnici vanno verificati sull'audio.

## Audit euristico dei termini lunghi

Presenti in entrambi: {', '.join(f'`{term}` ({count})' for term, count in preserved) or 'nessuno'}

Presenti nel riferimento ma non in Gemini: {', '.join(f'`{term}` ({count})' for term, count in missing) or 'nessuno'}
"""
        comparison_files = """- `reference.txt`: copia locale del riferimento usato nel confronto
- `disagreements.csv`: prime divergenze allineate con contesto
"""
    return f"""# Trascrizione Gemini — {model}

- Data UTC: {datetime.now(timezone.utc).isoformat()}
- Audio: {duration:.2f} s ({duration / 60:.2f} min)
- Segmenti: {len(removed_overlap)}
- Parole rimosse nel ricongiungimento overlap: {list(removed_overlap)}

{comparison}

## File prodotti

- `gemini_transcript.txt`: concatenazione finale
- `metrics.json`: metriche machine-readable
{comparison_files}- `segments/`: risposte grezze e pulite per ogni segmento
- `segments/*.rejected.*.raw.txt`: eventuali risposte incomplete conservate ma escluse
- `checkpoint.json`: stato per riprendere un'esecuzione interrotta

Cartella risultati: `{output_dir}`
"""


def build_run_signature(
    args: argparse.Namespace,
    model: str,
    vocabulary: Sequence[str],
    language: str | None,
) -> dict[str, Any]:
    return {
        "pipeline_version": PIPELINE_VERSION,
        "audio_sha256": args.audio_sha256,
        "model": model,
        "chunks": args.chunks,
        "overlap_seconds": args.overlap_seconds,
        "chunking_strategy": getattr(args, "chunking_strategy", "manual"),
        "boundaries_sha256": getattr(args, "boundaries_sha256", None),
        "language": language,
        "transcription_mode": "verbatim",
        "prompt_sha256": hashlib.sha256(DEFAULT_PROMPT.encode("utf-8")).hexdigest(),
        "minimum_words_per_minute": args.min_words_per_minute,
        "non_speech_consensus": getattr(args, "non_speech_consensus", 3),
        "vocabulary_sha256": hashlib.sha256("\n".join(vocabulary).encode()).hexdigest(),
    }


def initialize_checkpoint(
    checkpoint: dict[str, Any],
    expected_signature: dict[str, Any],
) -> dict[str, Any]:
    if all(checkpoint.get(key) == value for key, value in expected_signature.items()):
        return checkpoint
    policy_only_upgrade = (
        "non_speech_consensus" not in checkpoint
        and all(
            checkpoint.get(key) == value
            for key, value in expected_signature.items()
            if key != "non_speech_consensus"
        )
    )
    if policy_only_upgrade:
        checkpoint["non_speech_consensus"] = expected_signature["non_speech_consensus"]
        return checkpoint
    legacy_keys = (
        "audio_sha256",
        "model",
        "chunks",
        "overlap_seconds",
        "language",
        "vocabulary_sha256",
    )
    is_trusted_legacy = (
        "pipeline_version" not in checkpoint
        and isinstance(checkpoint.get("completed"), dict)
        and all(checkpoint.get(key) == expected_signature.get(key) for key in legacy_keys)
    )
    if is_trusted_legacy:
        checkpoint.update(expected_signature)
        return checkpoint
    replacement = {**expected_signature, "completed": {}}
    if checkpoint:
        prior_attempt = {
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "signature": {
                key: checkpoint.get(key)
                for key in expected_signature
                if key in checkpoint
            },
            "request_events": checkpoint.get("request_events", []),
            "rejected_outputs": checkpoint.get("rejected_outputs", []),
            "last_failure_at": checkpoint.get("last_failure_at"),
        }
        replacement["prior_attempts"] = [
            *(checkpoint.get("prior_attempts", []) if isinstance(checkpoint.get("prior_attempts"), list) else []),
            prior_attempt,
        ]
    return replacement


def saved_segment_is_valid(
    saved: Any,
    chunk: dict[str, Any],
    clean_path: Path,
    minimum_words: int = 0,
) -> bool:
    if not isinstance(saved, dict) or not clean_path.is_file():
        return False
    if saved.get("chunk_sha256") != chunk.get("sha256"):
        return False
    expected_hash = saved.get("clean_sha256")
    if not isinstance(expected_hash, str) or sha256_file(clean_path) != expected_hash:
        return False
    expected_words = saved.get("words")
    actual_words = len(normalize_words(clean_path.read_text(encoding="utf-8")))
    if saved.get("accepted_as_non_speech") is True:
        return expected_words == 0 and actual_words == 0
    return (
        isinstance(expected_words, int)
        and expected_words == actual_words
        and actual_words >= minimum_words
    )


def is_non_speech_transcript(text: str | None) -> bool:
    if not text or not text.strip():
        return True
    without_tags = re.sub(r"<[^>]+>|\[[^]]+\]", " ", text)
    words = normalize_words(without_tags)
    non_speech_words = {
        "applause",
        "applausi",
        "cough",
        "coughing",
        "music",
        "musica",
        "noise",
        "rumore",
        "silence",
        "silenzio",
        "snort",
    }
    return not words or all(word in non_speech_words for word in words)


def minimum_words_for_chunk(
    chunk: dict[str, Any],
    words_per_minute: float,
    reference_words: int = 0,
    total_duration_seconds: float = 0.0,
) -> int:
    duration_seconds = max(
        0.0,
        float(chunk["audio_end_seconds"]) - float(chunk["audio_start_seconds"]),
    )
    duration_floor = math.ceil(duration_seconds * max(0.0, words_per_minute) / 60.0)
    reference_floor = (
        math.ceil(reference_words * duration_seconds / total_duration_seconds * 0.5)
        if reference_words > 0 and total_duration_seconds > 0
        else 0
    )
    return max(5, duration_floor, reference_floor)


def preserve_rejected_transcript(
    segment_dir: Path,
    index: int,
    text: str,
    checkpoint: dict[str, Any],
    reason: str,
) -> None:
    timestamp = datetime.now(timezone.utc)
    rejected_path = segment_dir / (
        f"segment_{index:02d}.rejected.{timestamp.strftime('%Y%m%dT%H%M%S%fZ')}.raw.txt"
    )
    atomic_write_text(rejected_path, text.rstrip() + "\n")
    checkpoint.setdefault("rejected_outputs", []).append(
        {
            "segment": index,
            "file": rejected_path.name,
            "sha256": sha256_file(rejected_path),
            "words": len(normalize_words(text)),
            "reason": reason,
            "saved_at": timestamp.isoformat(),
        }
    )


def run_model(
    args: argparse.Namespace,
    model: str,
    keys: Sequence[str],
    reference_text: str | None,
    duration: float,
    chunk_manifest: Sequence[dict[str, Any]],
    vocabulary: Sequence[str],
    language: str | None,
    deadline: float | None = None,
) -> dict[str, Any]:
    model_dir = args.output_dir / model.replace("/", "_")
    segment_dir = model_dir / "segments"
    segment_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = model_dir / "checkpoint.json"
    checkpoint = load_checkpoint(checkpoint_path) if not args.force else {}
    expected_signature = build_run_signature(args, model, vocabulary, language)
    checkpoint = initialize_checkpoint(checkpoint, expected_signature)
    completed = checkpoint.setdefault("completed", {})
    pool = RotatingGeminiPool(
        keys,
        args.all_keys_wait,
        args.max_total_wait,
        args.request_timeout,
        deadline=deadline,
        max_transient_attempts=(
            len(keys) if args.chunks == 1 and args.fallback_chunks >= 2 else None
        ),
    )
    pool.restore(checkpoint.get("key_pool"), checkpoint.get("request_events"))
    reference_word_count = len(normalize_words(reference_text)) if reference_text is not None else 0
    non_speech_evidence = checkpoint.setdefault("non_speech_evidence", {})
    for chunk in chunk_manifest:
        index = int(chunk["index"])
        key = str(index)
        if key in non_speech_evidence:
            continue
        matching_events = [
            event
            for event in checkpoint.get("request_events", [])
            if event.get("operation") == f"trascrizione segmento {index}"
            and event.get("outcome") == "rejected"
            and event.get("category") == "IncompleteTranscriptError"
            and (
                not event.get("reason")
                or "vuota" in str(event.get("reason")).casefold()
                or "stato non completo" in str(event.get("reason")).casefold()
            )
        ]
        rejected_files = [
            segment_dir / str(item.get("file"))
            for item in checkpoint.get("rejected_outputs", [])
            if item.get("segment") == index
        ]
        rejected_are_non_speech = all(
            path.is_file() and is_non_speech_transcript(path.read_text(encoding="utf-8"))
            for path in rejected_files
        )
        if matching_events and rejected_are_non_speech:
            non_speech_evidence[key] = {
                "key_indices": sorted(
                    {
                        int(event["key_index"])
                        for event in matching_events
                        if isinstance(event.get("key_index"), int)
                    }
                ),
                "attempts": len(matching_events),
            }
    pending_chunks: list[dict[str, Any]] = []
    for chunk in chunk_manifest:
        index = int(chunk["index"])
        clean_path = segment_dir / f"segment_{index:02d}.txt"
        raw_path = segment_dir / f"segment_{index:02d}.raw.txt"
        saved = completed.get(str(index))
        minimum_words = minimum_words_for_chunk(
            chunk,
            args.min_words_per_minute,
            reference_words=reference_word_count,
            total_duration_seconds=duration,
        )
        if saved_segment_is_valid(saved, chunk, clean_path, minimum_words):
            safe_log(f"Segmento {index}/{args.chunks}: riuso checkpoint valido.")
            continue
        evidence = non_speech_evidence.get(str(index), {})
        has_confirmed_speech = any(
            isinstance(item, dict)
            and int(item.get("words", 0)) >= 5
            and item.get("accepted_as_non_speech") is not True
            for item in completed.values()
        )
        if (
            has_confirmed_speech
            and args.non_speech_consensus > 0
            and len(evidence.get("key_indices", [])) >= args.non_speech_consensus
        ):
            atomic_write_text(raw_path, "")
            atomic_write_text(clean_path, "")
            completed[str(index)] = {
                "chunk_sha256": chunk["sha256"],
                "raw_sha256": sha256_file(raw_path),
                "clean_sha256": sha256_file(clean_path),
                "words": 0,
                "accepted_as_non_speech": True,
                "non_speech_key_indices": evidence["key_indices"],
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
            safe_log(
                f"Segmento {index}/{args.chunks}: riuso {len(evidence['key_indices'])} "
                "riscontri concordi di assenza di parlato."
            )
            continue
        pending_chunks.append(chunk)

    atomic_write_json(checkpoint_path, checkpoint)

    retry_round = 0
    while pending_chunks:
        retry_round += 1
        retry_queue: list[dict[str, Any]] = []
        for chunk in pending_chunks:
            index = int(chunk["index"])
            clean_path = segment_dir / f"segment_{index:02d}.txt"
            raw_path = segment_dir / f"segment_{index:02d}.raw.txt"
            minimum_words = minimum_words_for_chunk(
                chunk,
                args.min_words_per_minute,
                reference_words=reference_word_count,
                total_duration_seconds=duration,
            )
            round_note = f", giro {retry_round}" if retry_round > 1 else ""
            safe_log(
                f"Segmento {index}/{args.chunks}{round_note}: {chunk['audio_start_seconds']:.1f}s-"
                f"{chunk['audio_end_seconds']:.1f}s ({chunk['bytes'] / 1024 / 1024:.2f} MiB)."
            )
            chunk_path = Path(chunk["path"])

            def transcribe_validated(client: Any, _key_index: int) -> tuple[str, str, int]:
                raw_text = transcribe_once(
                    client,
                    chunk_path,
                    model,
                    language,
                    vocabulary,
                    global_deadline=deadline,
                )
                clean_text = strip_model_wrappers(raw_text)
                words = len(normalize_words(clean_text))
                if words < minimum_words:
                    raise IncompleteTranscriptError(
                        f"Il segmento {index} contiene {words} parole, meno della soglia "
                        f"di {minimum_words} per "
                        f"{float(chunk['audio_end_seconds']) - float(chunk['audio_start_seconds']):.1f}s.",
                        raw_text,
                    )
                return raw_text, clean_text, words

            try:
                raw, clean, word_count = pool.call(
                    transcribe_validated,
                    f"trascrizione segmento {index}",
                )
            except IncompleteTranscriptError as error:
                if error.partial_text:
                    preserve_rejected_transcript(
                        segment_dir,
                        index,
                        error.partial_text,
                        checkpoint,
                        str(error),
                    )
                evidence = non_speech_evidence.setdefault(str(index), {"key_indices": [], "attempts": 0})
                evidence["attempts"] = int(evidence.get("attempts", 0)) + 1
                last_event = pool.events[-1] if pool.events else {}
                key_index = last_event.get("key_index")
                if is_non_speech_transcript(error.partial_text) and isinstance(key_index, int):
                    evidence["key_indices"] = sorted(
                        {*evidence.get("key_indices", []), key_index}
                    )
                checkpoint["key_pool"] = pool.summary()
                checkpoint.setdefault("request_events", []).extend(pool.events)
                pool.events.clear()
                checkpoint["last_failure_at"] = datetime.now(timezone.utc).isoformat()
                if args.chunks == 1:
                    atomic_write_json(checkpoint_path, checkpoint)
                    raise
                has_confirmed_speech = any(
                    isinstance(item, dict)
                    and int(item.get("words", 0)) >= 5
                    and item.get("accepted_as_non_speech") is not True
                    for item in completed.values()
                )
                enough_non_speech_votes = (
                    args.non_speech_consensus > 0
                    and len(evidence.get("key_indices", [])) >= args.non_speech_consensus
                )
                if has_confirmed_speech and enough_non_speech_votes:
                    raw_non_speech = error.partial_text or ""
                    atomic_write_text(raw_path, raw_non_speech.rstrip() + ("\n" if raw_non_speech else ""))
                    atomic_write_text(clean_path, "")
                    completed[str(index)] = {
                        "chunk_sha256": chunk["sha256"],
                        "raw_sha256": sha256_file(raw_path),
                        "clean_sha256": sha256_file(clean_path),
                        "words": 0,
                        "accepted_as_non_speech": True,
                        "non_speech_key_indices": evidence["key_indices"],
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    }
                    atomic_write_json(checkpoint_path, checkpoint)
                    safe_log(
                        f"  Segmento {index}: nessun parlato confermato da "
                        f"{len(evidence['key_indices'])} chiavi; lo considero completato senza testo."
                    )
                    continue
                atomic_write_json(checkpoint_path, checkpoint)
                retry_queue.append(chunk)
                safe_log(
                    f"  Segmento {index}: risposta incompleta ({error}); "
                    "lo rimetto in coda dopo aver provato gli altri segmenti."
                )
                continue
            except Exception:
                checkpoint["key_pool"] = pool.summary()
                checkpoint.setdefault("request_events", []).extend(pool.events)
                pool.events.clear()
                checkpoint["last_failure_at"] = datetime.now(timezone.utc).isoformat()
                atomic_write_json(checkpoint_path, checkpoint)
                raise

            atomic_write_text(raw_path, raw.rstrip() + "\n")
            atomic_write_text(clean_path, clean.rstrip() + "\n")
            completed[str(index)] = {
                "chunk_sha256": chunk["sha256"],
                "raw_sha256": sha256_file(raw_path),
                "clean_sha256": sha256_file(clean_path),
                "words": word_count,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
            checkpoint["key_pool"] = pool.summary()
            checkpoint.setdefault("request_events", []).extend(pool.events)
            pool.events.clear()
            atomic_write_json(checkpoint_path, checkpoint)
            if args.request_spacing > 0 and (retry_queue or len(completed) < len(chunk_manifest)):
                if deadline is None:
                    time.sleep(args.request_spacing)
                else:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0 or args.request_spacing > remaining:
                        raise TimeoutError(
                            f"Deadline globale superata ({args.max_total_wait:.0f}s); "
                            "i checkpoint consentono di riprendere senza perdere segmenti."
                        )
                    time.sleep(args.request_spacing)
        pending_chunks = retry_queue
    texts = [
        (segment_dir / f"segment_{int(chunk['index']):02d}.txt").read_text(encoding="utf-8")
        for chunk in chunk_manifest
    ]
    merged, removed = merge_with_overlap(texts)
    transcript_path = model_dir / "gemini_transcript.txt"
    reference_path = model_dir / "reference.txt"
    disagreements_path = model_dir / "disagreements.csv"
    atomic_write_text(transcript_path, merged)
    metrics: Metrics | None = None
    preserved: list[tuple[str, int]] = []
    missing: list[tuple[str, int]] = []
    disagreements: list[dict[str, str]] = []
    if reference_text is not None:
        atomic_write_text(reference_path, reference_text.rstrip() + "\n")
        metrics = calculate_metrics(reference_text, merged)
        preserved, missing = technical_term_audit(reference_text, merged)
        disagreements = disagreement_rows(reference_text, merged)
        atomic_write_csv(disagreements_path, disagreements)
    else:
        for stale_comparison in (reference_path, disagreements_path):
            if stale_comparison.is_file():
                stale_comparison.unlink()
    previous_pool = checkpoint.get("key_pool", [])
    final_pool = pool.summary() if pool.attempts else previous_pool
    metrics_payload = (
        {**asdict(metrics), "model": model, "reference_provided": True, "key_pool": final_pool}
        if metrics is not None
        else {
            "model": model,
            "reference_provided": False,
            "transcript_words": len(normalize_words(merged)),
            "metrics": None,
            "key_pool": final_pool,
        }
    )
    atomic_write_json(model_dir / "metrics.json", metrics_payload)
    atomic_write_text(model_dir / "REPORT.md", markdown_report(model, duration, metrics, removed, preserved, missing, model_dir))
    checkpoint["finished_at"] = datetime.now(timezone.utc).isoformat()
    checkpoint["metrics"] = asdict(metrics) if metrics is not None else None
    if pool.attempts:
        checkpoint["key_pool"] = pool.summary()
        checkpoint.setdefault("request_events", []).extend(pool.events)
    atomic_write_json(checkpoint_path, checkpoint)
    if metrics is not None:
        safe_log(
            f"{model}: WER {metrics.wer_percent:.2f}%, CER {metrics.cer_percent:.2f}%, "
            f"CER grezzo {metrics.raw_cer_percent:.2f}%, "
            f"similarita sequenziale {metrics.sequence_similarity_percent:.2f}%."
        )
    else:
        safe_log(f"{model}: trascrizione completata e validata ({len(normalize_words(merged))} parole).")
    if args.print_texts:
        if reference_text is not None:
            print("\n===== TESTO DI RIFERIMENTO =====\n")
            print(reference_text.rstrip())
        print(f"\n===== TRASCRIZIONE {model} =====\n")
        print(merged.rstrip())
    return {
        "model": model,
        "chunks": args.chunks,
        "metrics": asdict(metrics) if metrics is not None else None,
        "output_dir": str(model_dir),
    }


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Trascrive un MP3 con Gemini e, facoltativamente, lo confronta con un riferimento."
    )
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--reference", type=Path, help="Testo di riferimento facoltativo per le metriche.")
    parser.add_argument("--output-dir", type=Path, default=Path("benchmark_outputs/gemini_transcription"))
    parser.add_argument("--models", default="gemini-3.5-transcribe", help="Modelli separati da virgola; es. gemini-3.5-transcribe,gemini-3.8-flash")
    parser.add_argument(
        "--chunks",
        type=int,
        default=0,
        help="0 sceglie automaticamente: file intero se compatibile, altrimenti tagli sul silenzio.",
    )
    parser.add_argument(
        "--fallback-chunks",
        type=int,
        default=3,
        help="Se il chunk unico e rifiutato o incompleto, riprova con N segmenti; 0 disabilita.",
    )
    parser.add_argument("--overlap-seconds", type=float, default=2.0)
    parser.add_argument(
        "--smart-chunk-minutes",
        type=float,
        default=15.0,
        help="Durata obiettivo dei chunk automatici per audio lunghi.",
    )
    parser.add_argument(
        "--silence-search-seconds",
        type=float,
        default=60.0,
        help="Cerca il punto piu silenzioso entro +/- questi secondi dal taglio ideale.",
    )
    parser.add_argument(
        "--single-request-max-minutes",
        type=float,
        default=55.0,
        help="Durata massima prudenziale per provare una singola richiesta.",
    )
    parser.add_argument("--language", default="auto", help="Codice BCP-47, auto oppure none.")
    parser.add_argument("--vocabulary", type=Path, help="Un termine tecnico per riga (facoltativo, max 1000).")
    parser.add_argument("--all-keys-wait", type=float, default=30.0)
    parser.add_argument("--request-spacing", type=float, default=2.0)
    parser.add_argument("--request-timeout", type=float, default=600.0, help="Timeout in secondi per una singola richiesta SDK.")
    parser.add_argument(
        "--max-total-wait",
        type=float,
        default=0.0,
        help="Deadline globale in secondi, incluse richieste e attese; 0 continua finche possibile.",
    )
    parser.add_argument(
        "--min-words-per-minute",
        type=float,
        default=40.0,
        help="Soglia conservativa anti-troncamento proporzionale alla durata; 0 lascia solo il minimo di 5 parole.",
    )
    parser.add_argument(
        "--non-speech-consensus",
        type=int,
        default=3,
        help=(
            "Accetta un segmento senza testo dopo N risposte non vocali da chiavi diverse, "
            "ma solo se un altro segmento contiene parlato; 0 disabilita."
        ),
    )
    parser.add_argument("--keys-stdin", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--print-texts", action="store_true")
    parser.add_argument("--force", action="store_true", help="Ignora i checkpoint e ricalcola tutti i segmenti.")
    parser.add_argument("--prepare-only", action="store_true", help="Taglia e valida l'audio senza chiamare Gemini.")
    args = parser.parse_args(argv)
    if args.chunks < 0 or args.chunks > 100:
        parser.error("--chunks deve essere compreso tra 0 e 100")
    if args.fallback_chunks < 0 or args.fallback_chunks > 100 or args.fallback_chunks == 1:
        parser.error("--fallback-chunks deve essere 0 oppure compreso tra 2 e 100")
    if args.overlap_seconds < 0 or args.overlap_seconds > 30:
        parser.error("--overlap-seconds deve essere compreso tra 0 e 30")
    if args.smart_chunk_minutes < 2 or args.smart_chunk_minutes > 55:
        parser.error("--smart-chunk-minutes deve essere compreso tra 2 e 55")
    if args.silence_search_seconds < 0 or args.silence_search_seconds > 300:
        parser.error("--silence-search-seconds deve essere compreso tra 0 e 300")
    if args.single_request_max_minutes < 2 or args.single_request_max_minutes > 60:
        parser.error("--single-request-max-minutes deve essere compreso tra 2 e 60")
    if args.all_keys_wait <= 0:
        parser.error("--all-keys-wait deve essere maggiore di 0")
    if args.request_spacing < 0:
        parser.error("--request-spacing non puo essere negativo")
    if args.request_timeout <= 0:
        parser.error("--request-timeout deve essere maggiore di 0")
    if args.max_total_wait < 0:
        parser.error("--max-total-wait non puo essere negativo")
    if args.min_words_per_minute < 0:
        parser.error("--min-words-per-minute non puo essere negativo")
    if args.non_speech_consensus != 0 and not 2 <= args.non_speech_consensus <= 10:
        parser.error("--non-speech-consensus deve essere 0 oppure compreso tra 2 e 10")
    return args


def prepare_audio(
    args: argparse.Namespace,
    chunks: int,
) -> tuple[argparse.Namespace, float, list[dict[str, Any]]]:
    strategy_args = argparse.Namespace(**vars(args))
    _, frames = parse_mp3_frames(args.audio.read_bytes())
    duration = frames[-1].end_seconds
    use_smart_boundaries = chunks == 0 or (
        chunks == 1 and duration > args.single_request_max_minutes * 60
    )
    silence_boundaries: list[dict[str, float]] = []
    if use_smart_boundaries and duration > args.single_request_max_minutes * 60:
        safe_log(
            f"Audio lungo {duration / 60:.2f} min: cerco silenzi attorno a tagli "
            f"ogni {args.smart_chunk_minutes:.1f} min (+/-{args.silence_search_seconds:.0f}s)."
        )
        silence_boundaries = detect_silence_boundaries(
            args.audio,
            duration,
            target_seconds=args.smart_chunk_minutes * 60,
            search_seconds=args.silence_search_seconds,
        )
        selected_boundaries = [item["selected_seconds"] for item in silence_boundaries]
        effective_chunks = len(selected_boundaries) + 1
        chunking_strategy = "silence-aware-wav-16khz-mono"
        chunk_dir = args.output_dir / "audio_chunks" / f"chunks_{effective_chunks:02d}_silence_wav"
        chunk_manifest = write_wav_chunks(
            args.audio,
            chunk_dir,
            duration,
            selected_boundaries,
            args.overlap_seconds,
        )
    else:
        effective_chunks = 1 if chunks == 0 else chunks
        chunking_strategy = "single" if effective_chunks == 1 else "equal-duration"
        chunk_dir = args.output_dir / "audio_chunks" / f"chunks_{effective_chunks:02d}"
        duration, chunk_manifest = split_mp3_losslessly(
            args.audio,
            chunk_dir,
            effective_chunks,
            args.overlap_seconds,
        )
    strategy_args.chunks = effective_chunks
    strategy_args.chunking_strategy = chunking_strategy
    strategy_args.boundaries_sha256 = hashlib.sha256(
        json.dumps(silence_boundaries, sort_keys=True).encode("utf-8")
    ).hexdigest()
    manifest_payload = {
        "source_name": args.audio.name,
        "source_sha256": args.audio_sha256,
        "duration_seconds": round(duration, 3),
        "chunking_strategy": chunking_strategy,
        "silence_boundaries": silence_boundaries,
        "chunks": chunk_manifest,
    }
    atomic_write_json(
        args.output_dir / f"audio_manifest_{effective_chunks:02d}_chunks.json",
        manifest_payload,
    )
    atomic_write_json(args.output_dir / "audio_manifest.json", manifest_payload)
    safe_log(
        f"Audio validato: {duration:.2f}s ({duration / 60:.2f} min), "
        f"{effective_chunks} segmenti ({chunking_strategy})."
    )
    return strategy_args, duration, chunk_manifest


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    deadline = time.monotonic() + args.max_total_wait if args.max_total_wait > 0 else None
    args.audio = args.audio.resolve()
    args.reference = args.reference.resolve() if args.reference is not None else None
    args.vocabulary = args.vocabulary.resolve() if args.vocabulary is not None else None
    args.output_dir = args.output_dir.resolve()
    if not args.audio.is_file():
        raise SystemExit(f"Audio non trovato: {args.audio}")
    if args.audio.suffix.casefold() != ".mp3":
        raise SystemExit("Il benchmark lossless accetta soltanto file MP3.")
    if args.reference is not None and not args.reference.is_file():
        raise SystemExit(f"Riferimento non trovato: {args.reference}")
    if args.vocabulary is not None and not args.vocabulary.is_file():
        raise SystemExit(f"Vocabolario non trovato: {args.vocabulary}")
    reference_text = args.reference.read_text(encoding="utf-8-sig") if args.reference is not None else None
    args.audio_sha256 = sha256_file(args.audio)
    strategy_args, duration, chunk_manifest = prepare_audio(args, args.chunks)
    if args.prepare_only:
        safe_log(f"Preparazione completata in {args.output_dir}.")
        return 0
    keys = load_keys_from_stdin_or_environment(args.keys_stdin)
    if not keys:
        raise SystemExit(
            "Nessuna chiave trovata. Usa il launcher delle chiavi cifrate oppure imposta "
            "GEMINI_API_KEYS/GEMINI_API_KEY."
        )
    safe_log(f"Pool caricato: {len(keys)} chiavi (valori non mostrati).")
    vocabulary = load_vocabulary(args.vocabulary)
    language = (
        detect_language(reference_text)
        if args.language.casefold() == "auto" and reference_text is not None
        else (None if args.language.casefold() in ("auto", "none") else args.language)
    )
    safe_log(f"Lingua: {language or 'rilevamento automatico'}; vocabolario esplicito: {len(vocabulary)} termini.")
    models = list(dict.fromkeys(model.strip() for model in args.models.split(",") if model.strip()))
    if not models:
        raise SystemExit("Specifica almeno un modello con --models.")
    results = []
    for model in models:
        safe_log(f"\n=== Modello {model} ===")
        try:
            result = run_model(
                strategy_args,
                model,
                keys,
                reference_text,
                duration,
                chunk_manifest,
                vocabulary,
                language,
                deadline=deadline,
            )
        except (IncompleteTranscriptError, RequestRejectedError) as error:
            if strategy_args.chunks != 1 or args.fallback_chunks < 2:
                raise
            failed_checkpoint_path = (
                args.output_dir / model.replace("/", "_") / "checkpoint.json"
            )
            failed_checkpoint = load_checkpoint(failed_checkpoint_path)
            fallback_audit = {
                "from_chunks": 1,
                "to_chunks": args.fallback_chunks,
                "reason": type(error).__name__,
                "triggered_at": datetime.now(timezone.utc).isoformat(),
                "initial_request_events": failed_checkpoint.get("request_events", []),
                "initial_rejected_outputs": failed_checkpoint.get("rejected_outputs", []),
            }
            safe_log(
                f"Chunk unico non affidabile ({error}). "
                f"Fallback automatico a {args.fallback_chunks} segmenti."
            )
            fallback_args, fallback_duration, fallback_manifest = prepare_audio(
                args,
                args.fallback_chunks,
            )
            result = run_model(
                fallback_args,
                model,
                keys,
                reference_text,
                fallback_duration,
                fallback_manifest,
                vocabulary,
                language,
                deadline=deadline,
            )
            result["fallback"] = fallback_audit
            fallback_checkpoint = load_checkpoint(failed_checkpoint_path)
            fallback_checkpoint["fallback"] = fallback_audit
            atomic_write_json(failed_checkpoint_path, fallback_checkpoint)
        results.append(result)
    atomic_write_json(args.output_dir / "summary.json", {"results": results})
    safe_log(f"\nBenchmark completato. Riepilogo: {args.output_dir / 'summary.json'}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        safe_log("\nInterrotto dall'utente. I segmenti completati restano nei checkpoint.")
        raise SystemExit(130)

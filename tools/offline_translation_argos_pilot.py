#!/usr/bin/env python3
"""Synthetic Argos model pilot; does not use the full Argos wrapper or Stanza."""
import ctypes
from ctypes import wintypes
import hashlib
import json
from pathlib import Path
import platform
import socket
import sys
import time
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "local-artifacts/offline-translation"
PACKAGES = {
    "en-it": ("en_it", "dde2180001a47904ecbbd688a41e35db8a040e4fd5b52e4f29b4bb499516ab32"),
    "it-en": ("it_en", "d2dd23b8b702f612b8127f07c7a0391f5f2a8b93344e6ddc9dd93c81824e85cb"),
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


class MemoryCounters(ctypes.Structure):
    _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD)] + [
        (name, ctypes.c_size_t) for name in (
            "PeakWorkingSetSize", "WorkingSetSize", "QuotaPeakPagedPoolUsage",
            "QuotaPagedPoolUsage", "QuotaPeakNonPagedPoolUsage", "QuotaNonPagedPoolUsage",
            "PagefileUsage", "PeakPagefileUsage")]


def memory():
    if sys.platform != "win32":
        return None
    counters = MemoryCounters()
    counters.cb = ctypes.sizeof(counters)
    kernel = ctypes.WinDLL("kernel32")
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    api = ctypes.WinDLL("psapi").GetProcessMemoryInfo
    api.argtypes = [wintypes.HANDLE, ctypes.POINTER(MemoryCounters), wintypes.DWORD]
    if not api(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
        raise OSError("Unable to measure process memory")
    return {"rssBytes": counters.WorkingSetSize, "peakRssBytes": counters.PeakWorkingSetSize}


def main():
    manifest = []
    for direction, (name, expected) in PACKAGES.items():
        archive = BASE / f"translate-{name}-1_0.argosmodel"
        if digest(archive.read_bytes()) != expected:
            raise ValueError("Argos package differs from recorded pilot hash")
        selected = ["sentencepiece.model", "model/model.bin", "model/shared_vocabulary.txt", "metadata.json", "README.md"]
        files = []
        with zipfile.ZipFile(archive) as package:
            for relative in selected:
                data = package.read(f"{name}/{relative}")
                target = BASE / "argos-models" / name / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                files.append({"name": relative, "bytes": len(data), "sha256": digest(data)})
        manifest.append({"direction": direction, "package": archive.name, "packageSha256": expected, "files": files})

    attempts = 0

    def block(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        raise RuntimeError("Network disabled for offline pilot")

    socket.create_connection = block
    socket.socket.connect = block
    socket.socket.connect_ex = block
    try:
        socket.create_connection(("example.invalid", 443))
    except RuntimeError:
        pass
    assert attempts == 1
    attempts = 0
    import ctranslate2
    import sentencepiece

    fixture = ROOT / "tests/fixtures/offline-translation/cases.json"
    cases = json.loads(fixture.read_text(encoding="utf-8"))
    report = {
        "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "python": platform.python_version(), "ctranslate2": ctranslate2.__version__,
        "sentencepiece": sentencepiece.__version__, "fixtureSha256": digest(fixture.read_bytes()),
        "runnerSha256": digest(Path(__file__).read_bytes()), "device": "cpu", "computeType": "int8",
        "threads": 4, "manifest": manifest,
        "scope": "Direct Argos 1.0 models, SentencePiece and CTranslate2; not full Argos wrapper",
        "segmentation": "Only synthetic paragraph cases split on period-space; all others one sentence",
        "networkGuard": "Python socket connect blocked; not an OS firewall or native network audit",
        "models": [], "results": [],
    }
    output = BASE / f"argos-pilot-{time.time_ns()}.json"

    def save():
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    for direction, (name, _) in PACKAGES.items():
        folder = BASE / "argos-models" / name
        start = time.perf_counter()
        tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(folder / "sentencepiece.model"))
        translator = ctranslate2.Translator(str(folder / "model"), device="cpu", compute_type="int8", intra_threads=4, inter_threads=1)
        report["models"].append({"direction": direction, "loadMs": (time.perf_counter() - start) * 1000, "memory": memory()})
        for beam, repeats in [(1, 1), (4, 3)]:
            for repeat in range(repeats):
                for item in [item for item in cases if item["direction"] == direction]:
                    start = time.perf_counter()
                    sentences = item["text"].split(". ") if item["id"].endswith("paragraph") else [item["text"]]
                    if len(sentences) > 1:
                        sentences = [s + "." if i < len(sentences) - 1 else s for i, s in enumerate(sentences)]
                    tokenized = [tokenizer.encode(sentence, out_type=str) for sentence in sentences]
                    if any(len(tokens) > 256 for tokens in tokenized):
                        raise ValueError("Synthetic input exceeds pilot limit")
                    result = translator.translate_batch(tokenized, beam_size=beam, num_hypotheses=1, length_penalty=0.2, replace_unknowns=True, max_decoding_length=192)
                    translated = " ".join(tokenizer.decode(row.hypotheses[0]) for row in result)
                    row = {**item, "beam": beam, "repeat": repeat, "inputTokens": sum(map(len, tokenized)), "latencyMs": (time.perf_counter() - start) * 1000, "translation": translated}
                    report["results"].append(row)
                    print(json.dumps({"id": item["id"], "beam": beam, "repeat": repeat, "ms": round(row["latencyMs"]), "translation": translated}, ensure_ascii=False), flush=True)
                    save()
        translator.unload_model()
    report["networkAttemptsDuringInference"] = attempts
    report["memory"] = memory()
    report["complete"] = attempts == 0
    save()
    print(json.dumps({"report": str(output), "complete": report["complete"], "memory": report["memory"]}), flush=True)
    if attempts:
        raise RuntimeError("An inference dependency attempted network access")


if __name__ == "__main__":
    main()

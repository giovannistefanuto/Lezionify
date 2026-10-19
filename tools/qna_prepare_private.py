"""Read-only extraction of explicitly selected local Q&A examples.

Inputs and historical answers are private benchmark data, never console logs.
No settings, keys, audio or transcripts are opened by this tool.
"""
import argparse
import hashlib
import json
import os
import pathlib
import re


def digest(data):
    return hashlib.sha256(data).hexdigest()


def leaf_path(directory, name):
    if not isinstance(name, str) or pathlib.Path(name).name != name or "/" in name or "\\" in name:
        raise ValueError("invalid_source_filename")
    path = (directory / name).resolve()
    if path.parent != directory.resolve():
        raise ValueError("source_outside_library")
    return path


def excerpt(markdown, quote, heading, max_bytes=5500):
    # Require the saved selection to exist verbatim. Do not invent missing text.
    matches = [m.start() for m in re.finditer(re.escape(quote), markdown)]
    if not matches:
        raise ValueError("quote_not_found_verbatim")
    headings = list(re.finditer(r"(?m)^#{1,6} +.+$", markdown))
    preferred = [h for h in headings if heading and heading.strip() in h.group()]
    preferred_matches = []
    for candidate in matches:
        preceding = [h for h in headings if h.start() <= candidate]
        if preceding and preceding[-1] in preferred:
            preferred_matches.append(candidate)
    location = (preferred_matches or matches)[0]
    previous = [h for h in headings if h.start() <= location]
    start = previous[-1].start() if previous else 0
    level = previous[-1].group().split(" ", 1)[0].count("#") if previous else 1
    following = [h for h in headings if h.start() > location and h.group().split(" ", 1)[0].count("#") <= level]
    end = following[0].start() if following else len(markdown)
    selected = markdown[start:end]
    method = "heading-section"
    if len(selected.encode("utf-8")) > max_bytes:
        # A contiguous window bounded by complete Markdown lines. Preserve the
        # entire quote and balance surrounding lines; no ellipsis inside formulas.
        lines = markdown.splitlines(keepends=True)
        offsets, offset = [], 0
        for line in lines:
            offsets.append(offset)
            offset += len(line)
        left = max(i for i, n in enumerate(offsets) if n <= location)
        right = max(i for i, n in enumerate(offsets) if n < location + len(quote))
        size = len("".join(lines[left:right+1]).encode("utf-8"))
        if size > max_bytes:
            raise ValueError("quote_exceeds_excerpt_budget")
        while True:
            options = []
            if left > 0:
                options.append((len(lines[left-1].encode("utf-8")), "left"))
            if right+1 < len(lines):
                options.append((len(lines[right+1].encode("utf-8")), "right"))
            feasible = [(n, side) for n, side in options if size+n <= max_bytes]
            if not feasible:
                break
            # Alternate sides where possible to retain context around the quote.
            side = feasible[0][1] if len(feasible) == 1 else ("left" if location-offsets[left] <= offsets[right]+len(lines[right])-location-len(quote) else "right")
            amount = next(n for n, s in feasible if s == side)
            if side == "left":
                left -= 1
            else:
                right += 1
            size += amount
        start = offsets[left]
        end = offsets[right]+len(lines[right])
        selected = markdown[start:end]
        method = "bounded-line-window"
    if quote not in selected:
        raise ValueError("quote_not_in_excerpt")
    return selected, {"method": method, "start": start, "end": end, "occurrences": len(matches), "contextReconstructed": True, "originalFullContextFlagKnown": False}


def prepare(library, picks, context_mode="excerpt"):
    library_raw = (library / "library.json").read_bytes()
    lectures = {lecture["id"]: lecture for lecture in json.loads(library_raw.decode("utf-8-sig"))["lectures"]}
    files = sorted((library / "qna").glob("*.json"))
    cases = []
    for index, pick in enumerate(picks):
        file_index, thread_index = map(int, pick.split(":"))
        file = files[file_index]
        raw_thread = file.read_bytes()
        thread = json.loads(raw_thread.decode("utf-8-sig"))[thread_index]
        lecture = lectures[file.stem]
        source = leaf_path(library / "markdown", lecture["markdownFileName"])
        raw_markdown = source.read_bytes()
        markdown = raw_markdown.decode("utf-8-sig")
        messages = thread["messages"]
        user_indices = [i for i, m in enumerate(messages) if m.get("role") == "user" and m.get("text", "").strip()]
        if not user_indices:
            raise ValueError("question_missing")
        question_index = user_indices[0]
        question = messages[question_index]["text"]
        selected, selection = excerpt(markdown, thread["quote"], thread.get("contextHeading"))
        if context_mode == "document":
            if len(markdown.encode("utf-8")) > 120000:
                raise ValueError("document_exceeds_local_budget")
            selected = markdown
            selection.update({"method": "current-document", "start": 0, "end": len(markdown)})
        baseline = next((m["text"] for m in messages[question_index+1:] if m.get("role") == "ai" and m.get("text", "").strip()), None)
        cases.append({"id": f"real-{index+1:02d}", "question": question, "quote": thread["quote"], "contextHeading": thread.get("contextHeading"), "context": selected, "history": messages[:question_index], "historicalAnswer": baseline, "historicalAnswerIsGold": False, "originalModelKnown": False, "selection": selection, "sourceHashes": {"qna": digest(raw_thread), "markdown": digest(raw_markdown), "library": digest(library_raw)}, "sourceReadOnlyVerified": file.read_bytes() == raw_thread and source.read_bytes() == raw_markdown})
    return {"version": 1, "private": True, "contextMode": "reconstructed-document" if context_mode == "document" else "reconstructed-excerpt", "cases": cases}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", type=pathlib.Path, default=pathlib.Path(os.environ["APPDATA"]) / "lezionify" / "library")
    parser.add_argument("--pick", action="append", required=True, help="sorted Q&A file index:thread index")
    parser.add_argument("--context", choices=["excerpt", "document"], default="excerpt")
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parents[1] / "local-artifacts" / "qna-benchmark"
    output = args.output.resolve()
    if not output.is_relative_to(root.resolve()):
        raise ValueError("private_output_outside_artifacts")
    if output.exists():
        raise ValueError("refusing_to_overwrite_private_corpus")
    data = prepare(args.library.resolve(), args.pick, args.context)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"prepared": len(data["cases"]), "private": True, "sourceReadOnlyVerified": all(c["sourceReadOnlyVerified"] for c in data["cases"]), "contextBytes": [len(c["context"].encode("utf-8")) for c in data["cases"]]}))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print(json.dumps({"errorCategory": "private_corpus_preparation_failed"}))
        raise SystemExit(1) from None

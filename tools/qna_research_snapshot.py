"""Append a content-free research journal from local checkpointed results."""
import argparse
import collections
import datetime
import hashlib
import json
import math
import pathlib
import re
import statistics


def distribution(values):
    values = sorted(v for v in values if isinstance(v, (float, int)) and math.isfinite(v))
    return {"n": len(values), "median": statistics.median(values) if values else None, "min": min(values) if values else None, "max": max(values) if values else None, "p90Descriptive": values[math.ceil(len(values)*.9)-1] if len(values) >= 20 else None}


def snapshot(directory):
    if (directory / "INVALIDATED.json").exists():
        raise ValueError("invalidated_run")
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    rows = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(directory.glob("*.result.json"))]
    phases = {}
    for phase in sorted({r["phase"] for r in rows}):
        phases[phase] = []
        for candidate in ["groq-20b", "groq-120b", "cloudflare-qwen"]:
            selected = [r for r in rows if r["phase"] == phase and r["candidateId"] == candidate]
            successes = [r for r in selected if r["status"] == "success"]
            attempts = []
            for r in selected:
                p = directory / (r["jobId"] + (".attempts.private.json" if phase == "real" else ".attempts.json"))
                if p.exists():
                    attempts.extend(json.loads(p.read_text(encoding="utf-8")))
            phases[phase].append({"candidateId": candidate, "statuses": dict(collections.Counter(r["status"] for r in selected)), "errors": dict(collections.Counter(r["errorCategory"] for r in selected if r.get("errorCategory"))), "firstTextMs": distribution([r.get("ttftMs") for r in successes]), "totalMs": distribution([r.get("totalMs") for r in successes]), "inputTokens": distribution([(r.get("usage") or {}).get("promptTokens") for r in successes]), "outputTokens": distribution([(r.get("usage") or {}).get("completionTokens") for r in successes]), "physicalAttempts": len(attempts), "retries": sum(a.get("attempt", 0) > 1 for a in attempts), "screeningAvailable": sum(isinstance(r.get("screening", {}).get("passed"), bool) for r in successes if r.get("screening") is not None), "screeningPassed": sum(r.get("screening", {}).get("passed") is True for r in successes if r.get("screening") is not None)})
    # Verify byte-identical messages for common conditions across candidates.
    groups = collections.defaultdict(list)
    for row in rows:
        if row.get("requestHash"):
            key = tuple(row.get(k) for k in ["phase", "caseId", "repetition", "targetTokensApprox", "position", "scope"])
            groups[key].append(row)
    comparable = [group for group in groups.values() if len({r["candidateId"] for r in group}) == 3]
    return {"run": directory.name, "planned": manifest["jobs"], "recorded": len(rows), "allPlannedOutcomesRecorded": len(rows) == manifest["jobs"], "privateCorpus": manifest.get("private", False), "phases": phases, "comparableGroupsAllThree": len(comparable), "identicalMessagesForAllComparableGroups": all(len({r["requestHash"] for r in group}) == 1 for group in comparable) if comparable else None, "sourceResultSetHash": hashlib.sha256(json.dumps([(r["jobId"], r["status"], r.get("requestHash")) for r in rows], sort_keys=True).encode()).hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", action="append", required=True)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    if any(not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,90}", name) for name in args.run):
        raise ValueError("run_id_invalid")
    artifact_root = pathlib.Path(__file__).resolve().parents[1] / "local-artifacts" / "qna-benchmark"
    data = {"at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "contentFreeJournal": True, "runs": [snapshot(artifact_root / name) for name in args.run]}
    (artifact_root / "research-snapshot.json").write_text(json.dumps(data, indent=2)+"\n", encoding="utf-8")
    with (artifact_root / "research-journal.jsonl").open("a", encoding="utf-8") as journal:
        journal.write(json.dumps(data)+"\n")
    print(json.dumps(data if args.verbose else {"at": data["at"], "contentFreeJournal": True, "runs": [{"run": r["run"], "recorded": r["recorded"], "planned": r["planned"], "allPlannedOutcomesRecorded": r["allPlannedOutcomesRecorded"], "identicalMessagesForAllComparableGroups": r["identicalMessagesForAllComparableGroups"]} for r in data["runs"]]}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print(json.dumps({"errorCategory": "research_snapshot_failed"}))
        raise SystemExit(1) from None

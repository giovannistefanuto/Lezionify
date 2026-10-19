import importlib.util
import json
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("qna_snapshot", pathlib.Path(__file__).resolve().parents[2] / "tools" / "qna_research_snapshot.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SnapshotPrivacyTests(unittest.TestCase):
    def test_private_contents_and_failed_latency_do_not_enter_journal_metrics(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = pathlib.Path(temporary)
            (directory / "manifest.json").write_text(json.dumps({"jobs": 3, "private": True}), encoding="utf-8")
            for i, candidate in enumerate(["groq-20b", "groq-120b", "cloudflare-qwen"]):
                row = {"jobId": str(i), "candidateId": candidate, "caseId": "real-01", "phase": "real", "repetition": 0, "status": "failed" if i == 0 else "success", "ttftMs": 999999 if i == 0 else 100, "totalMs": 1000, "usage": None, "screening": None, "requestHash": "same-input", "answer": "PRIVATE_SENTINEL_DO_NOT_LOG", "question": "PRIVATE_SENTINEL_DO_NOT_LOG"}
                (directory / f"{i}.result.json").write_text(json.dumps(row), encoding="utf-8")
            data = module.snapshot(directory)
            self.assertNotIn("PRIVATE_SENTINEL_DO_NOT_LOG", json.dumps(data))
            self.assertEqual(data["phases"]["real"][0]["firstTextMs"]["n"], 0)
            self.assertIsNone(data["phases"]["real"][0]["firstTextMs"]["median"])
            self.assertEqual(data["phases"]["real"][1]["inputTokens"]["n"], 0)
            self.assertTrue(data["identicalMessagesForAllComparableGroups"])
            self.assertTrue(data["allPlannedOutcomesRecorded"])

    def test_invalidated_results_cannot_be_mistaken_for_valid_research(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = pathlib.Path(temporary)
            (directory / "INVALIDATED.json").write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "invalidated_run"):
                module.snapshot(directory)

    def test_single_candidate_does_not_report_successful_three_way_comparison(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = pathlib.Path(temporary)
            (directory / "manifest.json").write_text(json.dumps({"jobs": 1, "private": True}), encoding="utf-8")
            row = {"jobId": "one", "candidateId": "cloudflare-qwen", "caseId": "real-01", "phase": "real", "status": "success", "usage": None, "screening": None, "requestHash": "one-input"}
            (directory / "one.result.json").write_text(json.dumps(row), encoding="utf-8")
            data = module.snapshot(directory)
            self.assertEqual(data["comparableGroupsAllThree"], 0)
            self.assertIsNone(data["identicalMessagesForAllComparableGroups"])

    def test_mismatched_prompts_are_detected_in_matched_three_way_cases(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = pathlib.Path(temporary)
            (directory / "manifest.json").write_text(json.dumps({"jobs": 3}), encoding="utf-8")
            for i, candidate in enumerate(["groq-20b", "groq-120b", "cloudflare-qwen"]):
                row = {"jobId": str(i), "candidateId": candidate, "caseId": "real-01", "phase": "real", "repetition": 0, "status": "success", "usage": None, "screening": None, "requestHash": "different" if i == 2 else "same"}
                (directory / f"{i}.result.json").write_text(json.dumps(row), encoding="utf-8")
            data = module.snapshot(directory)
            self.assertEqual(data["comparableGroupsAllThree"], 1)
            self.assertFalse(data["identicalMessagesForAllComparableGroups"])


if __name__ == "__main__":
    unittest.main()

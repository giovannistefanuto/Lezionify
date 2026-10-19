from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = REPOSITORY_ROOT / "tools" / "gemini_transcription_benchmark.py"
SPEC = importlib.util.spec_from_file_location("gemini_transcription_benchmark", MODULE_PATH)
if SPEC is None or SPEC.loader is None:  # pragma: no cover
    raise RuntimeError(f"Impossibile importare {MODULE_PATH}")
benchmark = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = benchmark
SPEC.loader.exec_module(benchmark)


class MetricsTests(unittest.TestCase):
    def test_normalized_metrics_do_not_hide_case_and_punctuation(self) -> None:
        metrics = benchmark.calculate_metrics("Hello, WORLD!", "hello world")

        self.assertEqual(metrics.wer_percent, 0.0)
        self.assertEqual(metrics.cer_percent, 0.0)
        self.assertGreater(metrics.raw_cer_percent, 0.0)
        self.assertGreater(metrics.formatting_token_error_rate_percent, 0.0)
        self.assertGreater(metrics.punctuation_error_rate_percent, 0.0)

    def test_symbol_metric_detects_a_lost_minus_sign(self) -> None:
        metrics = benchmark.calculate_metrics("x = -1", "x = 1")

        self.assertEqual(metrics.wer_percent, 0.0)
        self.assertGreater(metrics.symbol_error_rate_percent, 0.0)


class MergeTests(unittest.TestCase):
    def test_merge_removes_only_exact_overlap(self) -> None:
        left = " ".join((["same"] * 18) + ["tail", "end"])
        right = " ".join(["tail", "end"] + (["same"] * 18) + ["conclusion"])

        merged, removed = benchmark.merge_with_overlap([left, right])

        self.assertEqual(removed, [0, 2])
        self.assertTrue(merged.endswith("conclusion\n"))
        self.assertEqual(benchmark.normalize_words(merged).count("same"), 36)


class CheckpointTests(unittest.TestCase):
    def test_saved_segment_requires_matching_content_hash(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            clean_path = Path(temporary_directory) / "segment.txt"
            clean_path.write_text("one two three", encoding="utf-8")
            chunk = {"sha256": "audio-hash"}
            saved = {
                "chunk_sha256": "audio-hash",
                "clean_sha256": benchmark.sha256_file(clean_path),
                "words": 3,
            }

            self.assertTrue(benchmark.saved_segment_is_valid(saved, chunk, clean_path))
            clean_path.write_text("one two changed", encoding="utf-8")
            self.assertFalse(benchmark.saved_segment_is_valid(saved, chunk, clean_path))

            corrupt_path = Path(temporary_directory) / "checkpoint.json"
            corrupt_path.write_text("[]", encoding="utf-8")
            self.assertEqual(benchmark.load_checkpoint(corrupt_path), {})

    def test_rejected_partial_transcript_is_preserved_separately(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            segment_dir = Path(temporary_directory)
            checkpoint: dict[str, object] = {}

            benchmark.preserve_rejected_transcript(
                segment_dir,
                1,
                "partial transcript",
                checkpoint,
                "too short",
            )

            rejected = checkpoint["rejected_outputs"][0]
            rejected_path = segment_dir / rejected["file"]
            self.assertEqual(rejected_path.read_text(encoding="utf-8"), "partial transcript\n")
            self.assertEqual(rejected["sha256"], benchmark.sha256_file(rejected_path))

    def test_signature_covers_pipeline_prompt_and_validation_policy(self) -> None:
        args = argparse.Namespace(
            audio_sha256="audio-hash",
            chunks=1,
            overlap_seconds=2.0,
            min_words_per_minute=40.0,
        )

        signature = benchmark.build_run_signature(args, "gemini-test", ["Jacobian"], "en-US")

        self.assertEqual(signature["pipeline_version"], benchmark.PIPELINE_VERSION)
        self.assertEqual(len(signature["prompt_sha256"]), 64)
        self.assertEqual(signature["minimum_words_per_minute"], 40.0)
        self.assertEqual(signature["non_speech_consensus"], 3)
        self.assertEqual(signature["transcription_mode"], "verbatim")

        legacy = {
            key: signature[key]
            for key in (
                "audio_sha256",
                "model",
                "chunks",
                "overlap_seconds",
                "language",
                "vocabulary_sha256",
            )
        }
        legacy["completed"] = {"1": {"words": 100}}
        upgraded = benchmark.initialize_checkpoint(legacy, signature)
        self.assertEqual(upgraded["pipeline_version"], benchmark.PIPELINE_VERSION)
        self.assertIn("1", upgraded["completed"])

        incompatible = {**signature, "chunking_strategy": "old-mp3", "request_events": [{"key_index": 1}]}
        replaced = benchmark.initialize_checkpoint(incompatible, signature)
        self.assertEqual(replaced["completed"], {})
        self.assertEqual(replaced["prior_attempts"][0]["request_events"], [{"key_index": 1}])


class ValidationTests(unittest.TestCase):
    def test_minimum_words_scales_with_audio_duration(self) -> None:
        chunk = {"audio_start_seconds": 0.0, "audio_end_seconds": 1023.0}

        self.assertEqual(benchmark.minimum_words_for_chunk(chunk, 40.0), 682)
        self.assertEqual(benchmark.minimum_words_for_chunk(chunk, 0.0, 1825, 1023.0), 913)

        powers = [100.0] * 200
        powers[95:105] = [0.0] * 10
        boundary, dbfs = benchmark.choose_quiet_boundary(powers, 0.1, 10.0, 2.0)
        self.assertAlmostEqual(boundary, 10.0, delta=0.6)
        self.assertLess(dbfs, -80.0)
        self.assertTrue(benchmark.is_non_speech_transcript("<cough> </cough> <snort>"))
        self.assertFalse(benchmark.is_non_speech_transcript("the professor starts speaking"))

    def test_reference_is_optional_and_single_chunk_is_default(self) -> None:
        args = benchmark.parse_args(["--audio", "lesson.mp3"])

        self.assertIsNone(args.reference)
        self.assertEqual(args.chunks, 0)
        self.assertEqual(args.fallback_chunks, 3)

    def test_report_without_reference_does_not_claim_comparison_files(self) -> None:
        report = benchmark.markdown_report("gemini-test", 60.0, None, [0], [], [], Path("output"))

        self.assertIn("Nessun riferimento", report)
        self.assertNotIn("reference.txt", report)
        self.assertNotIn("disagreements.csv", report)

        response = SimpleNamespace(
            output_text=None,
            outputs=[SimpleNamespace(type="text", text="transcript from outputs")],
        )
        self.assertEqual(
            benchmark.extract_interaction_text(response),
            "transcript from outputs",
        )
        unknown_response = SimpleNamespace(
            output_text=None,
            steps=[
                SimpleNamespace(
                    type="model_output",
                    content=[SimpleNamespace(type="UNKNOWN", raw={"transcript": "raw text"})],
                )
            ],
        )
        self.assertEqual(benchmark.extract_interaction_text(unknown_response), "raw text")


class FallbackTests(unittest.TestCase):
    def test_main_falls_back_from_one_to_three_chunks(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            audio = root / "lesson.mp3"
            output = root / "output"
            audio.write_bytes(b"synthetic")

            def fake_prepare(args: argparse.Namespace, chunks: int):
                strategy = argparse.Namespace(**vars(args))
                strategy.chunks = 1 if chunks == 0 else chunks
                return strategy, 60.0, []

            successful = {
                "model": "gemini-3.5-transcribe",
                "chunks": 3,
                "metrics": None,
                "output_dir": str(output / "gemini-3.5-transcribe"),
            }
            with (
                mock.patch.object(benchmark, "sha256_file", return_value="audio-hash"),
                mock.patch.object(benchmark, "prepare_audio", side_effect=fake_prepare) as prepare,
                mock.patch.object(benchmark, "load_keys_from_stdin_or_environment", return_value=["secret"]),
                mock.patch.object(
                    benchmark,
                    "run_model",
                    side_effect=[benchmark.IncompleteTranscriptError("troppo corta"), successful],
                ) as run_model,
            ):
                result = benchmark.main(["--audio", str(audio), "--output-dir", str(output)])

            self.assertEqual(result, 0)
            self.assertEqual([call.args[1] for call in prepare.call_args_list], [0, 3])
            self.assertEqual(run_model.call_count, 2)
            summary = json.loads((output / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["results"][0]["fallback"]["to_chunks"], 3)

    def test_multi_chunk_retries_incomplete_segments_after_trying_the_others(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            chunk_path = root / "chunk.mp3"
            chunk_path.write_bytes(b"chunk")
            first_words = " ".join(f"first{index}" for index in range(50))
            second_words = " ".join(f"second{index}" for index in range(50))
            fake_pool = mock.Mock()
            fake_pool.attempts = 2
            fake_pool.events = []
            fake_pool.summary.return_value = []
            fake_pool.call.side_effect = [
                benchmark.IncompleteTranscriptError("empty"),
                (second_words, second_words, 50),
                (first_words, first_words, 50),
            ]
            args = argparse.Namespace(
                output_dir=root / "output",
                force=False,
                audio_sha256="source",
                chunks=2,
                overlap_seconds=2.0,
                chunking_strategy="equal-duration",
                boundaries_sha256="boundaries",
                min_words_per_minute=40.0,
                non_speech_consensus=3,
                all_keys_wait=1.0,
                max_total_wait=0.0,
                request_timeout=30.0,
                fallback_chunks=3,
                request_spacing=0.0,
                print_texts=False,
            )
            manifest = [
                {
                    "index": 1,
                    "path": str(chunk_path),
                    "audio_start_seconds": 0.0,
                    "audio_end_seconds": 60.0,
                    "bytes": 5,
                    "sha256": "chunk-hash",
                },
                {
                    "index": 2,
                    "path": str(chunk_path),
                    "audio_start_seconds": 60.0,
                    "audio_end_seconds": 120.0,
                    "bytes": 5,
                    "sha256": "chunk-hash-2",
                },
            ]

            with mock.patch.object(benchmark, "RotatingGeminiPool", return_value=fake_pool):
                result = benchmark.run_model(
                    args,
                    "gemini-test",
                    ["secret"],
                    None,
                    60.0,
                    manifest,
                    [],
                    None,
                )

            self.assertEqual(fake_pool.call.call_count, 3)
            self.assertEqual(result["metrics"], None)
            transcript = root / "output" / "gemini-test" / "gemini_transcript.txt"
            merged = transcript.read_text(encoding="utf-8").strip()
            self.assertTrue(merged.startswith(first_words))
            self.assertTrue(merged.endswith(second_words))


class ErrorClassificationTests(unittest.TestCase):
    def test_rate_limit_is_retryable(self) -> None:
        error = RuntimeError("429 RESOURCE_EXHAUSTED retry in 12s")
        error.status_code = 429

        info = benchmark.classify_error(error)

        self.assertEqual(info.category, "rate_limit")
        self.assertEqual(info.retry_after_seconds, 12.0)


class PoolLifecycleTests(unittest.TestCase):
    def test_client_is_closed_after_success(self) -> None:
        client = mock.Mock()
        fake_genai = SimpleNamespace(Client=mock.Mock(return_value=client))
        fake_types = SimpleNamespace(
            HttpOptions=lambda **values: values,
            HttpRetryOptions=lambda **values: values,
        )
        pool = benchmark.RotatingGeminiPool(["secret"], 1.0, 0.0, 30.0)

        with mock.patch.object(benchmark, "genai", fake_genai), mock.patch.object(
            benchmark, "types", fake_types
        ):
            result = pool.call(lambda _client, _index: "done", "test")

        self.assertEqual(result, "done")
        client.close.assert_called_once_with()

        failing_client = mock.Mock()
        fake_genai.Client.return_value = failing_client
        fallback_pool = benchmark.RotatingGeminiPool(
            ["secret"],
            1.0,
            0.0,
            30.0,
            max_transient_attempts=1,
        )
        with mock.patch.object(benchmark, "genai", fake_genai), mock.patch.object(
            benchmark, "types", fake_types
        ):
            with self.assertRaises(benchmark.RequestRejectedError):
                fallback_pool.call(
                    lambda _client, _index: (_ for _ in ()).throw(ConnectionError("503")),
                    "test fallback",
                )
        failing_client.close.assert_called_once_with()

        restored_pool = benchmark.RotatingGeminiPool(["one", "two"], 1.0, 0.0, 30.0)
        restored_pool.restore(
            [{"key_index": 1, "disabled_reason": "invalid", "quota_failures": 2}],
            [{"key_index": 1}],
        )
        self.assertEqual(restored_pool.cursor, 1)
        self.assertEqual(restored_pool.states[0].disabled_reason, "invalid")
        self.assertEqual(restored_pool.states[0].quota_failures, 2)

    def test_deadline_uses_elapsed_wall_clock_time(self) -> None:
        with mock.patch.object(benchmark.time, "monotonic", side_effect=[100.0, 102.0]):
            pool = benchmark.RotatingGeminiPool(["secret"], 1.0, 1.0, 30.0)
            with self.assertRaises(TimeoutError):
                pool._remaining_seconds()


if __name__ == "__main__":
    unittest.main()

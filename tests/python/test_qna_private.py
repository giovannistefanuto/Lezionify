import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("qna_private", pathlib.Path(__file__).resolve().parents[2] / "tools" / "qna_prepare_private.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PrivateCorpusTests(unittest.TestCase):
    def test_quote_missing_is_rejected_instead_of_fabricated(self):
        with self.assertRaisesRegex(ValueError, "quote_not_found"):
            module.excerpt("# Section\nContent", "missing quote", "Section")

    def test_section_retains_subheadings_and_stops_at_peer(self):
        text = "# First\nBefore\n## Detail\nSelected formula\n### Subdetail\nProof\n## Next\nOther"
        selected, details = module.excerpt(text, "Selected formula", "Detail")
        self.assertIn("Proof", selected)
        self.assertNotIn("Other", selected)
        self.assertEqual(details["method"], "heading-section")
        self.assertFalse(details["originalFullContextFlagKnown"])

    def test_large_section_is_bounded_without_cutting_quote(self):
        text = "# Section\n" + "Distractor line\n"*400 + "$$A=B+C$$\n" + "Following line\n"*400
        selected, details = module.excerpt(text, "$$A=B+C$$", "Section", max_bytes=500)
        self.assertIn("$$A=B+C$$", selected)
        self.assertLessEqual(len(selected.encode("utf-8")), 500)
        self.assertEqual(selected, text[details["start"]:details["end"]])
        self.assertTrue(selected.endswith("\n"))

    def test_oversized_selection_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "quote_exceeds"):
            module.excerpt("# Section\n" + "X"*200, "X"*200, "Section", max_bytes=100)

    def test_source_paths_cannot_escape_markdown_directory(self):
        for name in ["../settings.json", "..\\settings.json", "C:\\private.txt", "/private.txt"]:
            with self.assertRaises(ValueError):
                module.leaf_path(pathlib.Path("markdown"), name)

    def test_repeated_quote_prefers_matching_heading(self):
        text = "# First\nFormula\n# Second\nMore\nFormula\n"
        selected, details = module.excerpt(text, "Formula", "Second")
        self.assertTrue(selected.startswith("# Second"))
        self.assertEqual(details["occurrences"], 2)


if __name__ == "__main__":
    unittest.main()

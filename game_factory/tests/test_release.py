import json
import tempfile
import unittest
from pathlib import Path
from game_factory.stamp_preview import stamp


class ReleaseTests(unittest.TestCase):
    def test_real_shipped_html_can_be_stamped_repeatedly(self):
        source = Path(__file__).resolve().parents[2] / "docs/preview/index.html"
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            page = directory / "index.html"
            page.write_text(source.read_text())
            stamp(directory, "123-1", "a" * 40)
            stamp(directory, "456-2", "b" * 40)
            content = page.read_text()
            self.assertIn('data-run="AI PLAYTEST BUILD 456-2"', content)
            self.assertNotIn("123-1", content)
            self.assertIn(".dataset.run + ' · CODE ' + build", content)
            self.assertEqual(json.loads((directory / "BUILD_INFO.json").read_text())["run_id"], "456-2")

    def test_missing_marker_fails_without_modifying_html(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            page = directory / "index.html"
            page.write_text("<html>broken candidate</html>")
            with self.assertRaises(ValueError):
                stamp(directory, "123")
            self.assertEqual(page.read_text(), "<html>broken candidate</html>")

    def test_reject_invalid_run_id(self):
        with self.assertRaises(ValueError):
            stamp(Path("unused"), '<script>')

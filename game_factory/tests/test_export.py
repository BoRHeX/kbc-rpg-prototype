"""Public static game release has no privileged backend requirements."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from game_factory.build_static import build


class ExportTests(unittest.TestCase):
    def test_static_bundle_renders_without_studio_backend(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=build(Path(tmp))
            self.assertTrue((out/"index.html").exists())
            self.assertTrue((out/"game.js").exists())
            html=(out/"index.html").read_text()
            js=(out/"game.js").read_text()
            self.assertIn('href="./game.css"',html)
            self.assertIn('src="./game.js"',html)
            self.assertIn("fetch('./game-config.json')",js)
            self.assertIn("fetch('./factory-report.json'",js)
            self.assertNotIn("STUDIO_TOKEN",html)
            cfg=json.loads((out/"game-config.json").read_text())
            self.assertGreater(cfg["speed"],0)
            report=json.loads((out/"factory-report.json").read_text())
            self.assertEqual(len(report["ballots"]),5)


if __name__=="__main__":
    unittest.main()

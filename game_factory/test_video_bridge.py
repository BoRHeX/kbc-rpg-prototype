"""Offline validation of the video-review to mobile-studio contract."""
import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import game_factory.video_bridge as video_bridge

from game_factory.video_bridge import (
    build_request, game_from_filename, game_title, stable_job_id,
)


class VideoBridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.game_dir = self.root / "docs/games/neon-salvage"
        self.game_dir.mkdir(parents=True)
        (self.game_dir / "index.html").write_text(
            "<!doctype html><title>Neon Salvage - BoRHeZ</title>", encoding="utf-8"
        )

    def tearDown(self):
        self.temp.cleanup()

    def test_deterministic_unique_job_id(self):
        a = stable_job_id("drive-file-A")
        self.assertEqual(a, stable_job_id("drive-file-A"))
        self.assertNotEqual(a, stable_job_id("drive-file-B"))
        self.assertRegex(a, r"^yt-[a-f0-9]{24}$")

    def test_identification_requires_exact_existing_game_prefix(self):
        self.assertEqual(
            game_from_filename("neon-salvage__review-01.mp4", self.root), "neon-salvage"
        )
        for name in [
            "review-neon-salvage.mp4",
            "NEON-SALVAGE__review.mp4",
            "unknown-game__review.mp4",
            "../neon-salvage__review.mp4",
            "neon-salvage__review.exe",
        ]:
            with self.subTest(name=name):
                self.assertIsNone(game_from_filename(name, self.root))

    def test_title_read_from_game_not_model(self):
        self.assertEqual(game_title("neon-salvage", self.root), "Neon Salvage - BoRHeZ")

    def test_nonactionable_reviews_do_not_generate_jobs(self):
        self.assertIsNone(build_request(
            "video-1", "neon-salvage", "Neon Salvage",
            {"actionable": False, "prompt": "", "acceptance": []}
        ))

    def test_valid_job_is_accepted_by_real_studio_validator(self):
        candidate = {"actionable": True,
                     "prompt": "Improve paddle movement as the player requested.",
                     "acceptance": [
                         "Dragging moves the actor at responsive speed.",
                         "Start, pause and restart retain working touch controls."
                     ]}
        job = build_request("video-1", "neon-salvage", "Neon Salvage", candidate)
        self.assertEqual(job["mode"], "update")
        self.assertEqual(job["game"], "neon-salvage")
        self.assertEqual(job["id"], stable_job_id("video-1"))
        self.assertIn("Improve paddle movement", job["prompt"])
        self.assertEqual(len(job["acceptance"]), 2)
        self.assertEqual(set(job), {"id", "mode", "game", "title", "prompt", "acceptance"})

    def test_invalid_model_payload_is_rejected(self):
        cases = [
            {},
            {"actionable": "true", "prompt": "Fix", "acceptance": ["Tests"]},
            {"actionable": True, "prompt": "", "acceptance": ["Tests"]},
            {"actionable": True, "prompt": "Fix", "acceptance": []},
            {"actionable": True, "prompt": "Fix", "acceptance": ["X" * 601]},
            {"actionable": True, "prompt": "Y" * 8000, "acceptance": ["Tests"]},
        ]
        for item in cases:
            with self.subTest(item=str(item)[:100]):
                with self.assertRaises(ValueError):
                    build_request("video-1", "neon-salvage", "Neon Salvage", item)


    def test_no_action_marker_is_private_data_free_and_idempotent(self):
        with patch.object(video_bridge, "ROOT", self.root), patch.object(video_bridge, "git", return_value=""):
            result = video_bridge.mark_no_action("private-file-id", "neon-salvage")
            self.assertEqual(result["status"], "skipped_no_actionable_update")
            marker = self.root / "game_factory/review_markers" / (stable_job_id("private-file-id") + ".json")
            data = json.loads(marker.read_text())
            self.assertEqual(data["status"], "no_actionable_gameplay_update")
            self.assertEqual(data["game"], "neon-salvage")
            self.assertNotIn("private-file-id", marker.read_text())
            repeated = video_bridge.mark_no_action("private-file-id", "neon-salvage")
            self.assertEqual(repeated["status"], "already_skipped")


if __name__ == "__main__":
    unittest.main()

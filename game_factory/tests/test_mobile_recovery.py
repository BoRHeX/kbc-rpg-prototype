"""No-model regression tests for candidate recovery and isolated Codex repair."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from game_factory import mobile_jobs as mobile
from game_factory.mobile_repair import stage, restore
from game_factory.candidate_recovery import candidate_request_matches


class RecoveryTests(unittest.TestCase):
    def test_recovery_can_only_reuse_the_original_game_brief(self):
        original = {"id": "peach-gravity-sling-01", "game": "studio-original-001",
                    "mode": "update", "title": "Gravity Sling",
                    "prompt": "Original physics and gameplay brief",
                    "acceptance": ["Gravity, ordered fruit"], "redesign": True,
                    "release_version": "0.1"}
        resumed = dict(original, resume_candidate_run=42317178651,
                       resume_candidate_branch="recovery/peach-gravity-sling-01")
        self.assertTrue(candidate_request_matches(original, resumed))
        resumed["acceptance"] = ["Different game"]
        self.assertFalse(candidate_request_matches(original, resumed))

    def test_stage_restore_are_bounded_and_hash_checked(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target = root / "docs/games/studio-original-001"
            target.mkdir(parents=True)
            work = root / "artifacts/mobile"
            work.mkdir(parents=True)
            job = {"target": "docs/games/studio-original-001", "run_id": "123-1",
                   "request": {"game": "studio-original-001", "mode": "update",
                               "id": "peach-gravity-sling-01"}}
            (work / "job.json").write_text(json.dumps(job))
            for name, text in (("index.html", "<h1>Gravity Sling</h1>"),
                               ("game.js", "(() => {})();"),
                               ("game.css", "body { color: white }")):
                (target / name).write_text(text)
            (work / "plan.json").write_text('{"update_decision":{}}')
            (work / "CODER_PROMPT.md").write_text("Repaired by sandboxed Coder")
            with patch.object(mobile, "ROOT", root), patch.object(mobile, "WORK", work):
                stage()
                (target / "game.js").write_text("BROKEN")
                restore()
                self.assertEqual((target / "game.js").read_text(), "(() => {})();")
                package = work / "repair-input"
                (package / "source" / "game.js").write_text("TAMPERED")
                with self.assertRaisesRegex(RuntimeError, "hash mismatch"):
                    restore()

    def test_repair_rejects_candidate_for_another_request(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target = root / "docs/games/studio-original-001"
            target.mkdir(parents=True)
            work = root / "artifacts/mobile"
            work.mkdir(parents=True)
            job = {"target": "docs/games/studio-original-001", "run_id": "123-1",
                   "request": {"game": "studio-original-001", "mode": "update",
                               "id": "peach-gravity-sling-01"}}
            (work / "job.json").write_text(json.dumps(job))
            for name in ("index.html","game.js","game.css"):
                (target / name).write_text("initial")
            (work / "plan.json").write_text("{}")
            (work / "CODER_PROMPT.md").write_text("original")
            with patch.object(mobile, "ROOT", root), patch.object(mobile, "WORK", work):
                stage()
                job["request"]["id"] = "unrelated-request"
                (work / "job.json").write_text(json.dumps(job))
                with self.assertRaisesRegex(RuntimeError, "another job"):
                    restore()


if __name__ == "__main__":
    unittest.main()

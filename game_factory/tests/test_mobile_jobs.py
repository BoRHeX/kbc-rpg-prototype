import json
import tempfile
import unittest
from pathlib import Path
from game_factory.mobile_jobs import digest, manifest, prepare, publish_bundle, validate_request


def request(mode="create", identifier="first-job"):
    return {"id": identifier, "game": "tiny-orbit", "mode": mode, "title": "Tiny Orbit",
            "prompt": "Drag to collect stars and avoid debris.", "acceptance": ["Collecting a star increases score."]}


def game(directory, text="version one"):
    directory.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "game.js", "game.css"):
        (directory / name).write_text(text)


def bundle(root, job):
    directory = root / "candidate"
    game(directory / "game")
    receipt = {**job, "state": "accepted", "files": manifest(directory / "game"),
               "play_path": "games/tiny-orbit/", "qa": {"proposed_action": {"approve_preview": True}},
               "acceptance": {"run_id": job["run_id"], "request_id": job["request"]["id"],
                              "platforms": [{"passed": True}, {"passed": True}]}}
    (directory / "receipt.json").write_text(json.dumps(receipt))
    return directory


class MobileJobTests(unittest.TestCase):
    def test_reject_paths_and_ambiguous_requests(self):
        for key, bad in (("game", "../escape"), ("id", "bad\nname"), ("mode", "replace"),
                         ("acceptance", []), ("prompt", "")):
            value = request()
            value[key] = bad
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_request(value)

    def test_create_update_and_duplicate_job_semantics(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            job = prepare(root, request(), "10-1")
            self.assertEqual(job["target"], "docs/games/tiny-orbit")
            self.assertEqual(job["base_manifest"], {})
            with self.assertRaises(ValueError):
                prepare(root, request("update"), "10-1")
            publish_bundle(root, bundle(root, job))
            self.assertIsNone(prepare(root, request(), "11-1"))
            with self.assertRaises(ValueError):
                prepare(root, request(identifier="another-create"), "11-1")
            changed = request()
            changed["prompt"] = "A different prompt with the same job ID."
            with self.assertRaises(ValueError):
                prepare(root, changed, "11-1")
            update = prepare(root, request("update", "next-job"), "11-1")
            self.assertEqual(update["base_manifest"], manifest(root / job["target"]))

    def test_publisher_rejects_corrupt_files_without_touching_live_game(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            job = prepare(root, request(), "10-1")
            candidate = bundle(root, job)
            (candidate / "game/game.js").write_text("corrupted")
            with self.assertRaises(ValueError):
                publish_bundle(root, candidate)
            self.assertFalse((root / job["target"]).exists())

    def test_stale_update_cannot_overwrite_newer_game(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            game(root / "docs/games/tiny-orbit", "baseline")
            job = prepare(root, request("update"), "10-1")
            candidate = bundle(root, job)
            (root / job["target"] / "game.js").write_text("newer accepted code")
            with self.assertRaises(ValueError):
                publish_bundle(root, candidate)
            self.assertEqual((root / job["target"] / "game.js").read_text(), "newer accepted code")

    def test_rejected_qa_cannot_publish(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            job = prepare(root, request(), "10-1")
            candidate = bundle(root, job)
            path = candidate / "receipt.json"
            value = json.loads(path.read_text())
            value["qa"]["proposed_action"]["approve_preview"] = False
            path.write_text(json.dumps(value))
            with self.assertRaises(ValueError):
                publish_bundle(root, candidate)

    def test_accepted_code_history_and_retry_are_reproducible(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            job = prepare(root, request(), "10-1")
            candidate = bundle(root, job)
            first = publish_bundle(root, candidate)
            self.assertEqual(publish_bundle(root, candidate), first)
            self.assertEqual(manifest(root / job["target"]), first["files"])
            self.assertTrue((root / "game_factory/results/first-job.json").exists())
            self.assertIn('href="./tiny-orbit/"', (root / "docs/games/index.html").read_text())

    def test_symlink_is_not_a_publishable_asset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "game.js").symlink_to("/etc/passwd")
            with self.assertRaises(ValueError):
                manifest(root)

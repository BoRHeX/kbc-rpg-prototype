import json
import tempfile
import unittest
from pathlib import Path
from game_factory.mobile_jobs import digest, manifest, prepare, publish_bundle, validate_request, verify_published


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
    def test_major_cataclysm_release_uses_primary_and_preserves_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            game(root / "docs/cataclysm", "new illustrated baseline")
            game(root / "docs/preview", "preserved archive")
            (root / "docs/cataclysm/qa-report.json").write_text('{"version":"0.9"}')
            req = dict(request("update", "cataclysm-10-test"), game="cataclysm",
                       title="Cataclysm 1.0: The Catastrophe", release_version="1.0")
            job = prepare(root, req, "20-1")
            self.assertEqual(job["target"], "docs/cataclysm")
            self.assertNotIn("qa-report.json", job["base_manifest"])
            candidate = bundle(root, job)
            path = candidate / "receipt.json"
            receipt = json.loads(path.read_text())
            receipt["play_path"] = "cataclysm/"
            receipt["acceptance"]["platforms"] = [
                {"passed": True, "viewport": list(size)} for size in
                ((390, 844), (360, 780), (640, 320), (667, 375),
                 (780, 360), (844, 390), (915, 412), (1280, 720))
            ]
            path.write_text(json.dumps(receipt))
            publish_bundle(root, candidate)
            self.assertEqual((root / "docs/preview/game.js").read_text(), "preserved archive")
            self.assertEqual((root / "docs/cataclysm/game.js").read_text(), "version one")
            qa = json.loads((root / "docs/cataclysm/qa-report.json").read_text())
            self.assertEqual(qa["version"], "1.0")
            self.assertEqual(qa["source_sha256"], receipt["files"])
            self.assertEqual(verify_published(root, req["id"]), receipt)
            self.assertEqual(publish_bundle(root, candidate), receipt)

    def test_major_cataclysm_cannot_publish_with_only_portrait_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            game(root / "docs/cataclysm", "baseline")
            req = dict(request("update"), game="cataclysm", release_version="1.0")
            job = prepare(root, req, "20-1")
            with self.assertRaisesRegex(ValueError, "independent acceptance"):
                publish_bundle(root, bundle(root, job))
            self.assertEqual((root / "docs/cataclysm/game.js").read_text(), "baseline")

    def test_reject_paths_and_ambiguous_requests(self):
        for key, bad in (("game", "../escape"), ("id", "bad\nname"), ("mode", "replace"),
                         ("acceptance", []), ("prompt", "")):
            value = request()
            value[key] = bad
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_request(value)

    def test_focused_physics_visual_update_is_not_a_redesign(self):
        req = request("update", "peach-gravity-sling-02")
        req.update({"game": "studio-original-001", "focus": "physics_visual",
                    "release_version": "0.2"})
        result = validate_request(req)
        self.assertEqual(result["focus"], "physics_visual")
        self.assertNotIn("redesign", result)
        self.assertEqual(result["release_version"], "0.2")
        with self.assertRaises(ValueError):
            validate_request({**req, "redesign": True})
        with self.assertRaises(ValueError):
            validate_request({**req, "focus": "other"})
        with self.assertRaises(ValueError):
            validate_request({**req, "mode": "create"})

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

    def test_locked_game_redesign_and_version_contract(self):
        req = request("update", "peach-gravity-sling-01")
        req.update({"redesign": True, "release_version": "0.1"})
        normalized = validate_request(req)
        self.assertIs(normalized["redesign"], True)
        self.assertEqual(normalized["release_version"], "0.1")
        invalid = dict(req, redesign=False)
        with self.assertRaises(ValueError):
            validate_request(invalid)
        invalid = dict(req, release_version="alpha")
        with self.assertRaises(ValueError):
            validate_request(invalid)

    def test_stamp_updates_actual_version_on_existing_game(self):
        import game_factory.mobile_jobs as mobile
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            game_dir = root / "docs/games/studio-original-001"
            game_dir.mkdir(parents=True)
            (game_dir / "index.html").write_text(
                '<small id="build-version">LOCAL BUILD</small>'
                '<span id="game-version">OLD</span>'
                '<script src="./game.js"></script>'
                '<link href="./game.css">')
            work = root / "artifacts/mobile"
            work.mkdir(parents=True)
            (work / "job.json").write_text(json.dumps({
                "request": {"id": "peach-gravity-sling-01", "mode": "update",
                            "game": "studio-original-001",
                            "release_version": "0.1"},
                "target": "docs/games/studio-original-001", "run_id": "123456-1"}))
            with patch.object(mobile, "ROOT", root), patch.object(mobile, "WORK", work):
                mobile.stamp_command()
            content = (game_dir / "index.html").read_text()
            self.assertIn('id="game-version">0.1</span>', content)
            self.assertIn('PLAYTEST 123456-1', content)

    def test_stamped_version_is_injected_when_missing(self):
        import game_factory.mobile_jobs as mobile
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target = root / "docs/games/studio-original-001"
            target.mkdir(parents=True)
            (target / "index.html").write_text(
                '<html><head><title>Peach Bounce 0.1 — Gravity Sling</title></head>'
                '<body><h1>Peach Bounce 0.1 <span>— Gravity Sling</span></h1>'
                '<small id="build-version">LOCAL BUILD</small>'
                '<script src="./game.js"></script></body></html>')
            work = root / "artifacts/mobile"
            work.mkdir(parents=True)
            (work / "job.json").write_text(json.dumps({
                "request": {"id": "peach-gravity-sling-01", "game": "studio-original-001",
                            "mode": "update", "release_version": "0.1"},
                "target": "docs/games/studio-original-001", "run_id": "123-1"}))
            with patch.object(mobile, "ROOT", root), patch.object(mobile, "WORK", work):
                mobile.stamp_command()
                first = (target / "index.html").read_text()
                mobile.stamp_command()
                second = (target / "index.html").read_text()
            self.assertEqual(first, second)
            self.assertIn('<span id="game-version">0.1</span>', second)
            self.assertEqual(second.count('id="game-version"'), 1)
            self.assertIn('PLAYTEST 123-1', second)

    def test_symlink_is_not_a_publishable_asset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "game.js").symlink_to("/etc/passwd")
            with self.assertRaises(ValueError):
                manifest(root)

    def test_delivery_verifies_the_accepted_source_without_model_calls(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            job = prepare(root, request(), "10-1")
            receipt = publish_bundle(root, bundle(root, job))
            self.assertEqual(verify_published(root, "first-job"), receipt)
            (root / job["target"] / "game.js").write_text("unexpected replacement")
            with self.assertRaisesRegex(ValueError, "differs from accepted"):
                verify_published(root, "first-job")

    def test_delivery_rejects_invalid_identity_and_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(ValueError):
                verify_published(root, "../escape")
            job = prepare(root, request(), "10-1")
            receipt = publish_bundle(root, bundle(root, job))
            receipt["qa"]["proposed_action"]["approve_preview"] = False
            (root / "game_factory/results/first-job.json").write_text(json.dumps(receipt))
            with self.assertRaisesRegex(ValueError, "gameplay evidence"):
                verify_published(root, "first-job")

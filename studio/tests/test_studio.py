"""Tests for safe demo, production queue and private login."""
import http.cookiejar
import importlib
import json
import os
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest import mock
from urllib import request, error

os.environ["STUDIO_DATA_DIR"] = tempfile.mkdtemp(prefix="borhez-studio-test-")
os.environ["STUDIO_TOKEN"] = "demo-test-access-token-of-sufficient-length"
from studio import app as studio
studio.init_db()


class StudioTests(unittest.TestCase):
    def test_demo_only_never_gets_to_publisher(self):
        job_id, new = studio.create_job("demo-test-"+os.urandom(4).hex(),
                                        "Test simulation", {}, demo=True)
        self.assertTrue(new)
        studio.process(job_id)
        job = studio.read_job(job_id)
        self.assertEqual(job["status"], "DEMO")
        self.assertFalse(job["has_preview"])
        with self.assertRaises(ValueError):
            studio.upload_private(job_id)

    def test_deduplicate_and_status(self):
        key = "same-"+os.urandom(4).hex()
        first, new1 = studio.create_job(key, "GTA 1",
                        {"gameplay.mp4":{"id":"1"},"mic.wav":{"id":"2"}})
        second, new2 = studio.create_job(key, "GTA 1", {})
        self.assertEqual(first, second)
        self.assertTrue(new1)
        self.assertFalse(new2)
        self.assertEqual(studio.read_job(first)["status"], "RECEIVED")

    def test_drive_scanner_queues_real_job_only_once(self):
        key = "folder-"+os.urandom(4).hex()
        with mock.patch.object(studio, "Drive") as drive, mock.patch.object(
                studio, "launch_process") as start:
            drive.return_value.sessions.return_value = [(
                key, "Recorded gameplay", {"gameplay.mp4":{"id":"g"},
                                             "mic.wav":{"id":"a"}})]
            self.assertEqual(len(studio.scan_drive()), 1)
            self.assertEqual(len(studio.scan_drive()), 0)
            self.assertEqual(start.call_count, 1)

    def test_login_protects_api_and_can_read_state(self):
        server = ThreadingHTTPServer(("127.0.0.1",0), studio.Handler)
        thread = threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        url = "http://127.0.0.1:%d" % server.server_port
        opener = request.build_opener(request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        try:
            with self.assertRaises(error.HTTPError) as ctx:
                request.urlopen(url+"/api/state")
            self.assertEqual(ctx.exception.code,401)
            encoded = json.dumps({"token":os.environ["STUDIO_TOKEN"]}).encode()
            opener.open(request.Request(url+"/api/login",data=encoded,
                        headers={"Content-Type":"application/json"})).read()
            with opener.open(url+"/api/state") as response:
                data = json.load(response)
            self.assertIn("team",data)
            self.assertIn("jobs",data)
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()

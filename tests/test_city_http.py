"""HTTP smoke tests for private browser interface, no API key required."""
import json
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer

from city_app import Runtime, handler_factory


class CityHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime = Runtime()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler_factory(cls.runtime))
        cls.host = "http://127.0.0.1:" + str(cls.server.server_address[1])
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join(timeout=3)

    def send(self, path, payload=None):
        kwargs = {}
        if payload is not None:
            kwargs = {
                "data": json.dumps(payload).encode(),
                "headers": {"Content-Type": "application/json"},
                "method": "POST",
            }
        with urllib.request.urlopen(urllib.request.Request(self.host + path, **kwargs), timeout=5) as r:
            return r.read().decode(), r.getheader("Content-Type")

    def test_index_html(self):
        html, mime = self.send("/")
        self.assertIn("text/html", mime)
        self.assertIn("KBC City", html)
        self.assertIn('id="map"', html)
        self.assertIn('id="chart"', html)

    def test_state_step_and_integrity(self):
        body, mime = self.send("/api/state")
        report = json.loads(body)
        self.assertTrue(report["city"]["integrity"])
        self.assertEqual(report["city"]["oracle_kbc"], 1.0)
        initial_tick = report["city"]["tick"]
        advanced, _ = self.send("/api/step", {"steps": 2, "mode": "scripted"})
        report2 = json.loads(advanced)
        self.assertEqual(report2["city"]["tick"], initial_tick + 2)
        self.assertTrue(report2["city"]["integrity"])

    def test_branch_chat_and_export(self):
        reply, _ = self.send("/api/branch", {"name": "httptrial"})
        self.assertEqual(json.loads(reply)["active"], "httptrial")
        conversation, _ = self.send("/api/chat", {
            "question": "Who knows what?", "target": "Oracle", "mode": "scripted"
        })
        self.assertIn("Oracle reference KBC=1", json.loads(conversation)["reply"])
        exported, mime = self.send("/api/export")
        self.assertIn("application/json", mime)
        self.assertIn("full_events", json.loads(exported)["city"])
        switched, _ = self.send("/api/switch", {"name": "genesis"})
        self.assertEqual(json.loads(switched)["active"], "genesis")


if __name__ == "__main__":
    unittest.main()

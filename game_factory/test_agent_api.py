"""Offline contract tests for the real agent API adapter."""
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory


class AgentAPITests(unittest.TestCase):
    def test_json_mode_appears_in_input_and_decision_is_recorded(self):
        with tempfile.TemporaryDirectory() as directory:
            ledger = CouncilMemory(Path(directory) / "agents.db")
            agent_id = ledger.register("researcher", "gpt-4.1-mini")
            result = {"claim": "Investigate new mechanics", "rationale": "Need evidence"}
            provider_reply = {
                "id": "resp-test",
                "output": [{"type": "message", "content": [
                    {"type": "output_text", "text": json.dumps(result)}
                ]}],
            }
            def fake_urlopen(request, timeout):
                request_body = json.loads(request.data)
                self.assertEqual(request_body["text"]["format"]["type"], "json_object")
                self.assertIn("json", request_body["input"].lower())
                self.assertEqual(request_body["store"], False)
                return io.BytesIO(json.dumps(provider_reply).encode("utf-8"))
            with patch.dict(os.environ, {"OPENAI_API_KEY": "test-placeholder"}):
                with patch("urllib.request.urlopen", side_effect=fake_urlopen):
                    actual = ask_agent(ledger, agent_id, "test-run", "Review code", ["file:game.js"])
            self.assertEqual(actual, result)
            self.assertEqual(ledger.history(agent_id)[0]["payload"]["result"], result)
            ledger.close()


if __name__ == "__main__":
    unittest.main()

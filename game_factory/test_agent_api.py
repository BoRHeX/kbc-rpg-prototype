"""Offline contract tests for the real agent API adapter."""
import io
import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory


class AgentAPITests(unittest.TestCase):
    def setup_sequence(self, replies):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        ledger = CouncilMemory(Path(directory) / "agents.db")
        self.addCleanup(ledger.close)
        self.enterContext(patch.dict(os.environ, {"OPENAI_API_KEY": "test-placeholder"}))
        agent_id = ledger.register("researcher", "gpt-4.1-mini")
        calls = []
        iterator = iter(replies)
        def fake_urlopen(request, timeout):
            calls.append(json.loads(request.data))
            reply = next(iterator)
            if isinstance(reply, Exception):
                raise reply
            return io.BytesIO(json.dumps(reply).encode())
        self.enterContext(patch("urllib.request.urlopen", side_effect=fake_urlopen))
        return ledger, agent_id, calls

    @staticmethod
    def reply(text, status="completed", reason=None):
        return {"id": "resp-test", "status": status,
                "incomplete_details": {"reason": reason} if reason else None,
                "output": [{"type": "message", "content": [{"type": "output_text", "text": text}]}]}

    def test_truncated_reply_retries_only_once_with_bounded_room(self):
        ledger, agent, calls = self.setup_sequence([
            self.reply('{"claim":"unfinished', "incomplete", "max_output_tokens"),
            self.reply('{"claim":"complete"}'),
        ])
        actual = ask_agent(ledger, agent, "run", "Inspect the game", [])
        self.assertEqual(actual, {"claim": "complete"})
        self.assertEqual([c["max_output_tokens"] for c in calls], [1200, 2400])
        self.assertTrue(all(c["store"] is False for c in calls))
        self.assertEqual([e["kind"] for e in ledger.history(agent)], ["model_output_rejected", "model_decision"])

    def test_incomplete_but_parseable_json_is_not_accepted(self):
        ledger, agent, calls = self.setup_sequence([
            self.reply('{}', "incomplete", "max_output_tokens"),
            self.reply('{"claim":"full answer"}'),
        ])
        self.assertEqual(ask_agent(ledger, agent, "run", "Inspect", [])["claim"], "full answer")
        self.assertEqual(len(calls), 2)

    def test_invalid_json_can_recover_with_required_object_types(self):
        ledger, agent, calls = self.setup_sequence([
            self.reply('{"claim":"unterminated'),
            self.reply('{"proposed_action":{"approve_preview":true}}'),
        ])
        self.assertIs(ask_agent(ledger, agent, "run", "Review", [])["proposed_action"]["approve_preview"], True)
        self.assertIn("field types", calls[1]["instructions"])

    def test_second_invalid_reply_stops_without_unbounded_retries(self):
        ledger, agent, calls = self.setup_sequence([self.reply('bad'), self.reply('[]')])
        with self.assertRaisesRegex(RuntimeError, "after two attempts"):
            ask_agent(ledger, agent, "run", "Inspect", [])
        self.assertEqual(len(calls), 2)
        self.assertNotIn("model_decision", [e["kind"] for e in ledger.history(agent)])

    def test_retry_room_never_exceeds_existing_4000_token_cap(self):
        ledger, agent, calls = self.setup_sequence([self.reply('bad'), self.reply('{}')])
        ask_agent(ledger, agent, "run", "Inspect", [], max_output_tokens=3000)
        self.assertEqual([c["max_output_tokens"] for c in calls], [3000, 4000])

    def test_content_filter_is_not_retried(self):
        ledger, agent, calls = self.setup_sequence([self.reply('', "incomplete", "content_filter")])
        with self.assertRaisesRegex(RuntimeError, "content_filter"):
            ask_agent(ledger, agent, "run", "Inspect", [])
        self.assertEqual(len(calls), 1)

    def test_http_errors_are_not_retried(self):
        error = urllib.error.HTTPError("https://example.invalid", 429, "quota", {},
            io.BytesIO(b'{"error":{"code":"insufficient_quota","message":"quota"}}'))
        ledger, agent, calls = self.setup_sequence([error])
        with self.assertRaisesRegex(RuntimeError, "insufficient_quota"):
            ask_agent(ledger, agent, "run", "Inspect", [])
        self.assertEqual(len(calls), 1)

    def test_structured_schema_requires_typed_format(self):
        ledger, agent, calls = self.setup_sequence([self.reply(
            '{"claim":"validated","rationale":"test","objections":[],"proposed_action":{"name":"gravity"},"required_evidence":[]}')])
        schema = {"type": "object", "properties": {
            "claim": {"type": "string"},
            "rationale": {"type": "string"},
            "objections": {"type": "array", "items": {"type": "string"}},
            "proposed_action": {"type": "object", "properties": {
                "name": {"type": "string"}}, "required": ["name"],
                "additionalProperties": False},
            "required_evidence": {"type": "array", "items": {"type": "string"}}},
            "required": ["claim","rationale","objections","proposed_action","required_evidence"],
            "additionalProperties": False}
        result = ask_agent(ledger, agent, "test", "Design gravity sling", [],
                           response_schema=schema, format_name="gravity_feature")
        self.assertEqual(result["proposed_action"]["name"], "gravity")
        fmt = calls[0]["text"]["format"]
        self.assertEqual(fmt["type"], "json_schema")
        self.assertEqual(fmt["name"], "gravity_feature")
        self.assertIs(fmt["strict"], True)
        self.assertEqual(fmt["schema"], schema)
        self.assertFalse(calls[0]["store"])

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

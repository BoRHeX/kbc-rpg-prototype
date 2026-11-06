"""Resume real council outputs after schema-only failures without replaying media."""
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from game_factory.council_resume import extract_recovery
from game_factory.update_council import negotiate_update


def response(action):
    return {"claim": "Game proposal", "proposed_action": action}


def feature(name):
    return {"feature": {"name": name, "player_experience": name+" adds playable content",
        "code_changes": [{"file": "game.js", "operation": "modify",
                           "symbol": "update()", "pseudo_code": "Integrate new state in update()."}],
        "tests": ["Observe mechanic in gameplay"]}}


def critic_action():
    return {"assessments": [{"candidate_id": r, "risk": "Conflicting update calls",
                "mitigation": "Isolate state"} for r in
                ("designer", "researcher", "engineer")],
            "compatible_ids": [["designer", "researcher", "engineer"]],
            "rationale": "All three have compatible mechanics."}


class FakeMemory:
    def register(self, role, model):
        return role


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.db_tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.db_tmp.cleanup)
        self.path = Path(self.db_tmp.name) / "memory.sqlite3"
        with sqlite3.connect(str(self.path)) as db:
            db.execute("CREATE TABLE events (agent_id TEXT,run_id TEXT,kind TEXT,payload TEXT)")
            for role in ("designer", "researcher", "engineer", "critic"):
                decision = critic_action() if role == "critic" else feature(role)
                stored = {"result": response(decision),
                          "task": "PRIVATE SPOKEN TRANSCRIPT MUST NEVER LEAK"}
                db.execute("INSERT INTO events VALUES (?,?,?,?)",
                    ("cataclysm."+role, "123456-1", "model_decision",
                     json.dumps(stored)))
            db.commit()

    def test_extract_only_validated_gameplay_outputs(self):
        output = extract_recovery(self.path, 123456)
        self.assertEqual(output["source_run_id"], 123456)
        self.assertEqual(set(output["roles"]), {"designer", "researcher",
                                                "engineer", "critic"})
        self.assertNotIn("PRIVATE SPOKEN TRANSCRIPT", json.dumps(output))
        self.assertEqual(output["roles"]["critic"]["proposed_action"]["compatible_ids"],
                         [["designer", "researcher", "engineer"]])

    def test_nested_group_resumes_directly_at_producer(self):
        recovered = extract_recovery(self.path, 123456)
        called = []
        def ask(memory, role, run_id, task, refs, **kwargs):
            called.append(role)
            return response({"selected_ids": ["designer", "researcher", "engineer"],
                "decision_reason": "All three add differentiated interactive content.",
                "interface_contracts": ["Distinct state for each entity",
                                        "Game resets all three states"],
                "integration_steps": ["Designer hazard phase", "Researcher ally phase",
                                      "Engineer enemy phase"],
                "verification": ["Check hazard", "Check ally", "Check ghosts"]})
        job = {"request": {"id": "cataclysm-07-council-001",
                "game": "cataclysm", "resume_council_run": 123456},
               "run_id": "234567-1", "target": "docs/preview"}
        result = negotiate_update(FakeMemory(), "test-model", job,
            {"job": job["request"], "recovered_council": recovered}, ask)
        self.assertEqual(called, ["producer"])
        self.assertEqual(result["update_decision"]["selection"]["selected_ids"],
                         ["designer", "researcher", "engineer"])
        self.assertNotIn("PRIVATE SPOKEN TRANSCRIPT", json.dumps(result))

    def test_wrong_run_fails_before_model_call(self):
        job = {"request": {"id": "cataclysm-07-council-001",
                "game": "cataclysm", "resume_council_run": 999},
               "run_id": "234567-1", "target": "docs/preview"}
        with self.assertRaisesRegex(ValueError, "unexpected run"):
            negotiate_update(FakeMemory(), "test-model", job,
                {"recovered_council": extract_recovery(self.path, 123456)},
                lambda *args, **kwargs: self.fail("Do not call agent"))


if __name__ == "__main__":
    unittest.main()

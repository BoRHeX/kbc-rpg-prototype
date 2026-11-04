import tempfile
import unittest
from pathlib import Path
from game_factory.agent_memory import CouncilMemory, ROLES

class CouncilMemoryTests(unittest.TestCase):
    def test_identity_survives_restart_and_model_change_is_independent(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "council.sqlite3"
            store = CouncilMemory(path)
            for role in ROLES:
                store.register(role, "model-a")
            store.record("cataclysm.designer", "run-001", "proposal",
                         {"mechanic": "dash", "status": "unverified"},
                         ["commit:abc", "test:pending"])
            store.set_conversation("cataclysm.designer", "conv-test")
            store.close()
            reopened = CouncilMemory(path)
            self.assertEqual(reopened.register("designer", "model-b"), "cataclysm.designer")
            self.assertEqual(reopened.agent("cataclysm.designer")["model"], "model-a")
            self.assertEqual(reopened.agent("cataclysm.designer")["conversation_id"], "conv-test")
            events = reopened.history("cataclysm.designer")
            self.assertEqual(len(events), 1)
            self.assertEqual(events[0]["payload"]["mechanic"], "dash")
            self.assertEqual(events[0]["source_refs"], ["commit:abc", "test:pending"])
            reopened.close()

    def test_invalid_role_and_missing_agent(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = CouncilMemory(Path(tmp) / "memory.db")
            with self.assertRaises(ValueError):
                store.register("imaginary", "model")
            with self.assertRaises(KeyError):
                store.record("missing", "run", "claim", {})
            store.close()

if __name__ == "__main__":
    unittest.main()

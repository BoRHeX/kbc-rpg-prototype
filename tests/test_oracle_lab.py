"""Run: python -m unittest discover -s tests -v"""
import unittest
from oracle_lab import OracleLab, experiment


class OracleLabTests(unittest.TestCase):
    def test_reference_and_bounds(self):
        world = OracleLab()
        self.assertEqual(world.oracle_kbc, 1)
        for name in world.agents:
            self.assertLessEqual(world.score(name), 1)
            self.assertGreaterEqual(world.score(name), 0)

    def test_inference_requires_premise(self):
        world = OracleLab()
        self.assertEqual(world.infer("Researcher"), [])
        self.assertEqual(world.score("Researcher"), 0)

    def test_communication_is_non_rivalrous(self):
        world = OracleLab()
        world.infer("Explorer")
        before = world.score("Explorer")
        self.assertTrue(world.communicate("Explorer", "Researcher", "switch_closed"))
        world.infer("Researcher")
        self.assertEqual(world.score("Explorer"), before)
        self.assertEqual(world.score("Researcher"), 1)
        self.assertTrue(all(world.verify_agent(n) for n in world.agents))

    def test_control_differs_from_treatment(self):
        result = experiment()
        self.assertEqual(result["control"]["agents"]["Researcher"]["kbc"], 0)
        self.assertEqual(result["treatment"]["agents"]["Researcher"]["kbc"], 1)
        self.assertEqual(result["receiver_gain"], 1)
        self.assertEqual(result["sender_loss"], 0)

    def test_branch_isolation(self):
        parent = OracleLab()
        clone = parent.snapshot()
        clone.infer("Explorer")
        self.assertNotEqual(parent.score("Explorer"), clone.score("Explorer"))
        self.assertEqual(parent.score("Explorer"), 1 / 3)

    def test_reject_unsupported_transmission(self):
        world = OracleLab()
        with self.assertRaises(ValueError):
            world.communicate("Researcher", "Explorer", "lamp_powered")

    def test_reject_forged_proof(self):
        world = OracleLab()
        world.agents["Researcher"].known.add("lamp_powered")
        world.agents["Researcher"].proofs["lamp_powered"] = {
            "rule": "MAGIC", "premises": []
        }
        self.assertFalse(world.verify_agent("Researcher"))

    def test_event_chain_tampering(self):
        world = OracleLab()
        world.infer("Explorer")
        self.assertTrue(world.verify_history())
        world.events[1]["details"]["fact"] = "invented"
        self.assertFalse(world.verify_history())


if __name__ == "__main__":
    unittest.main()

"""Regression tests for the autonomous-departments research scaffold."""
import unittest

from departments_lab import CouncilLab


class CouncilTests(unittest.TestCase):
    def test_communication_produces_receiver_gain_without_sender_loss(self):
        result = CouncilLab().meeting()
        p = result["evidence"]["payload"]
        self.assertGreater(p["receiver_gain"], 0)
        self.assertEqual(p["sender_loss"], 0)
        self.assertTrue(p["reproducible"])

    def test_votes_are_not_a_measure_of_knowledge_or_money(self):
        result = CouncilLab().meeting()
        self.assertEqual(result["decision"], "approve-next-bounded-experiment")
        self.assertEqual(result["vote_counts"], {"yes": 3, "no": 0, "abstain": 2})
        self.assertNotIn("kbc_minted", result)
        self.assertNotIn("revenue", result)

    def test_event_chain_detects_tampering(self):
        council = CouncilLab()
        council.meeting()
        self.assertTrue(council.history_valid())
        council.events[1]["payload"]["position"]["vote"] = "no"
        self.assertFalse(council.history_valid())

    def test_control_and_treatment_proofs_verify(self):
        evidence = CouncilLab().observe()
        for condition in ("control", "treatment"):
            self.assertTrue(evidence.payload[condition]["history_valid"])
            self.assertTrue(evidence.payload[condition]["proofs_valid"])

    def test_no_youtube_or_external_actions(self):
        result = CouncilLab().meeting()
        self.assertIn("offline deterministic", result["status"])
        self.assertEqual(result["positions"][-1]["department"], "Media")
        self.assertEqual(result["positions"][-1]["vote"], "abstain")


if __name__ == "__main__":
    unittest.main()

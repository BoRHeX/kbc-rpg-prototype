"""Unit contracts for collaborative code-language planning."""
import unittest

from game_factory.update_council import negotiate_update, parse_feature


def answer(action):
    return {"claim": "proposal", "rationale": "player behavior", "objections": [],
            "proposed_action": action, "required_evidence": ["mobile test"]}


def feature(name, file="game.js"):
    return {"feature": {"name": name, "player_experience": name + " changes gameplay",
                        "code_changes": [{"file": file, "operation": "modify",
                                          "symbol": "function updateGame",
                                          "pseudo_code": "if (condition) triggerFeature();"}],
                        "tests": ["The new mechanic has a measurable gameplay effect."]}}


class Memory:
    def register(self, role, model):
        return role


class UpdateCouncilTests(unittest.TestCase):
    def test_independent_proposals_then_critic_then_producer(self):
        calls = []
        responses = {
            "designer": answer(feature("New puzzle-like event")),
            "researcher": answer(feature("Extra progression choice")),
            "engineer": answer(feature("Dynamic enemy attack pattern")),
            "critic": answer({"assessments": [
                {"candidate_id": role, "risk": "Touch interference",
                 "mitigation": "Test pointer cancellation"} for role in
                ("designer", "researcher", "engineer")],
                "compatible_ids": ["designer", "researcher", "engineer"],
                "rationale": "Distinct game-state responsibilities"}),
            "producer": answer({"selected_ids": ["designer", "engineer"],
                "decision_reason": "Gameplay impact exceeds cosmetic additions.",
                "interface_contracts": ["Use namespaced state fields", "Reset state on restart"],
                "integration_steps": ["Add designer feature", "Add engineer feature"],
                "verification": ["Run touch controls", "Inspect gameplay effect"]}),
        }
        def ask(memory, role, run_id, task, refs, **kwargs):
            calls.append((role, task))
            return responses[role]
        job = {"run_id": "123-1", "target": "docs/preview",
               "request": {"game": "cataclysm", "mode": "update"}}
        result = negotiate_update(Memory(), "model", job,
                                  {"job": job["request"],
                                   "private_gameplay": {"transcript": "private voice",
                                                        "visual_observations": "visible boss"}},
                                  ask)
        self.assertEqual([r for r, _ in calls],
                         ["designer", "researcher", "engineer", "critic", "producer"])
        self.assertNotIn("New puzzle-like event", calls[1][1])
        self.assertIn("New puzzle-like event", calls[3][1])
        self.assertNotIn("private voice", str(result))
        selected = result["update_decision"]["selection"]
        self.assertEqual(selected["selected_ids"], ["designer", "engineer"])
        self.assertEqual(len(selected["features"]), 2)

    def test_scope_rejects_path_escape(self):
        with self.assertRaisesRegex(ValueError, "outside game file scope"):
            parse_feature("engineer", answer(feature("Hidden changes", "../secret.env")))

    def test_producer_cannot_invent_code_feature(self):
        responses = {
            "designer": answer(feature("New boss")),
            "researcher": answer(feature("New route")),
            "engineer": answer(feature("New arena")),
            "critic": answer({"assessments": [
                {"candidate_id": role, "risk": "Overlap", "mitigation": "Review symbols"}
                for role in ("designer", "researcher", "engineer")],
                "compatible_ids": ["designer", "researcher"],
                "rationale": "Only two compatible"}),
            "producer": answer({"selected_ids": ["designer", "unknown"],
                "decision_reason": "Unreviewed feature", "interface_contracts": ["a", "b"],
                "integration_steps": ["a", "b"], "verification": ["a", "b"]}),
        }
        with self.assertRaisesRegex(ValueError, "Critic-approved"):
            negotiate_update(Memory(), "model", {
                "run_id": "1-1", "target": "docs/preview",
                "request": {"game": "cataclysm"}}, {},
                lambda m, role, *args, **kwargs: responses[role])


if __name__ == "__main__":
    unittest.main()

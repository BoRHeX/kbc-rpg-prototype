"""Unit contracts for collaborative code-language planning."""
import unittest

from game_factory.update_council import negotiate_update, parse_feature, merge_feature_answer


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

    def test_one_correction_reuses_same_designer_and_preserves_autonomy(self):
        answers = {
            "designer": answer(feature("New route")),
            "researcher": answer(feature("New boss")),
            "engineer": answer(feature("New progression")),
            "critic": answer({"assessments": [
                {"candidate_id": role, "risk": "Overlap", "mitigation": "Separate state"}
                for role in ("designer", "researcher", "engineer")],
                "compatible_ids": ["designer", "researcher"],
                "rationale": "Distinct state"}),
            "producer": answer({"selected_ids": ["designer", "researcher"],
                "decision_reason": "Different interactions",
                "interface_contracts": ["shared state", "restart resets state"],
                "integration_steps": ["add route", "add boss"],
                "verification": ["play test", "restart test"]}),
        }
        calls = []
        def ask(memory, role, run_id, task, refs, **kwargs):
            calls.append(role)
            if role == "designer" and calls.count("designer") == 1:
                return answer({"feature": {"name": "New route",
                    "player_experience": "Player visits a new place",
                    "code_changes": [], "tests": ["Try new route"]}})
            return answers[role]
        job = {"run_id": "123-1", "target": "docs/preview",
               "request": {"game": "cataclysm", "mode": "update"}}
        result = negotiate_update(Memory(), "model", job,
                                  {"job": job["request"]}, ask)
        self.assertEqual(calls, ["designer", "designer", "researcher",
                                 "engineer", "critic", "producer"])
        self.assertEqual(result["update_decision"]["selection"]["selected_ids"],
                         ["designer", "researcher"])

    def test_two_invalid_designer_proposals_fail_before_other_agents(self):
        calls = []
        def ask(memory, role, *args, **kwargs):
            calls.append(role)
            return answer({"feature": {"name": "Idea", "player_experience": "Idea",
                "code_changes": [], "tests": ["test"]}})
        job = {"run_id": "123-1", "target": "docs/preview",
               "request": {"game": "cataclysm", "mode": "update"}}
        with self.assertRaisesRegex(ValueError, "1–8 code changes"):
            negotiate_update(Memory(), "model", job, {}, ask)
        self.assertEqual(calls, ["designer", "designer"])

    def test_long_redesign_description_does_not_cancel_council(self):
        response = answer(feature("Depth fruit perspective"))
        response["proposed_action"]["feature"]["player_experience"] = (
            "The pilot maneuvers through depth-perspective fruit waves; "
            + "each numbered target changes the path and catch strategy. " * 65
        )
        self.assertGreater(len(response["proposed_action"]["feature"]["player_experience"]), 850)
        result = parse_feature("designer", response)
        self.assertIn("depth-perspective", result["player_experience"])
        self.assertGreater(len(result["player_experience"]), 850)

    def test_missing_description_uses_existing_agent_rationale(self):
        response = answer(feature("Gravity lens"))
        response["proposed_action"]["feature"].pop("player_experience")
        response["rationale"] = (
            "A returning probe accelerates after a central ship-field catch."
        )
        result = parse_feature("researcher", response)
        self.assertIn("probe accelerates", result["player_experience"])

    def test_correction_preserves_original_code_when_repair_has_only_description(self):
        first = answer(feature("Perspective progression"))
        first["proposed_action"]["feature"].pop("player_experience")
        first["claim"] = ""
        first["rationale"] = ""
        corrected = answer(feature("Perspective progression"))
        corrected["proposed_action"]["feature"].pop("code_changes")
        merged = merge_feature_answer(first, corrected)
        result = parse_feature("designer", merged)
        self.assertEqual(len(result["code_changes"]), 1)
        self.assertIn("progression", result["player_experience"])

    def test_different_name_does_not_merge_unrelated_concepts(self):
        first = answer(feature("Gravity probe"))
        other = answer(feature("Unrelated orbit"))
        other["proposed_action"]["feature"]["code_changes"] = []
        with self.assertRaisesRegex(ValueError, "1–8 code changes"):
            parse_feature("designer", merge_feature_answer(first, other))

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

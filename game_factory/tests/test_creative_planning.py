"""Creative studio selection is explicit, auditable and isolated from game updates."""
import json
import tempfile
import unittest
from pathlib import Path

from game_factory.mobile_jobs import (
    catalog, creative_pitch, creative_plan, validate_request,
)


def response(action):
    return {
        "claim": "Proposed creative decision",
        "rationale": "Concrete player experience",
        "objections": [],
        "proposed_action": action,
        "required_evidence": ["Runnable game and measured controls"],
    }


def concept(title, verb):
    return {"title": title, "core_loop": verb, "player_action": "Drag one finger",
            "scoring_and_end": "Earn points for progress; timer ends the round",
            "visual_theme": "Simple graphic shapes",
            "differentiator": "A dedicated original game mechanic"}


class Memory:
    def register(self, role, model):
        return role


class CreativeSelectionTests(unittest.TestCase):
    def job(self):
        request = validate_request({
            "id": "creative-job-001", "mode": "create", "game": "new-arcade",
            "title": "Original arcade", "prompt": "Invent a new mobile game.",
            "acceptance": ["Actual original playable mechanic"],
        })
        return {"request": request, "target": "docs/games/new-arcade", "run_id": "123-1"}

    def actions(self):
        return {
            "designer": response({"concept": concept("Ripple Forge", "Sculpt waves across a grid")}),
            "researcher": response({"concept": concept("Signal Lantern", "Decode beats by shifting colors")}),
            "engineer": response({"concept": concept("Gravity Fold", "Rotate platforms to guide marbles")}),
            "critic": response({
                "assessments": [
                    {"candidate_id": role, "strength": "Clear mechanic",
                     "risk": "Touch timing", "mitigation": "Measure cancel and restart"}
                    for role in ("designer", "researcher", "engineer")
                ],
                "preferred_candidate_id": "engineer",
                "reason": "Physics mechanic has the most replay potential.",
            }),
            "producer": response({
                "selected_candidate_id": "engineer",
                "selection_reason": "Most distinctive and feasible single-finger prototype.",
                "rejected_candidates": [
                    {"candidate_id": "designer", "reason": "Too many path effects"},
                    {"candidate_id": "researcher", "reason": "More complex onboarding"},
                ],
                "implementation_directives": [
                    "Use one-finger tilt to move marbles.",
                    "Test stuck touch cancellation and physical collisions.",
                ],
            }),
        }

    def test_three_pitches_are_independent_before_critic_and_producer(self):
        answers = self.actions()
        calls = []

        def ask(memory, identity, run_id, task, refs, **kwargs):
            calls.append((identity, task))
            return answers[identity]

        plan = creative_plan(Memory(), "model", self.job(),
                             {"job": self.job()["request"], "game_contract": "Canvas"}, ask)
        self.assertEqual([name for name, _ in calls],
                         ["designer", "researcher", "engineer", "critic", "producer"])
        for role, prompt in calls[:3]:
            self.assertIn("independent proposal", prompt)
            self.assertNotIn("Ripple Forge", prompt)
            self.assertNotIn("Signal Lantern", prompt)
            self.assertNotIn("Gravity Fold", prompt)
        self.assertIn("Ripple Forge", calls[3][1])
        self.assertIn("Gravity Fold", calls[4][1])
        creative = plan["creative_decision"]
        self.assertEqual(creative["selection"]["selected_candidate_id"], "engineer")
        self.assertEqual(creative["selection"]["concept"]["title"], "Gravity Fold")
        self.assertEqual(len(creative["selection"]["rejected_candidates"]), 2)
        self.assertEqual(len(creative["candidates"]), 3)

    def test_missing_concrete_pitch_rejected(self):
        incomplete = response({"concept": {"title": "Concept only"}})
        with self.assertRaisesRegex(ValueError, "non-empty text"):
            creative_pitch("designer", incomplete)

    def test_duplicate_independent_concepts_rejected(self):
        answers = self.actions()
        answers["researcher"]["proposed_action"]["concept"]["title"] = "ripple forge"
        with self.assertRaisesRegex(ValueError, "duplicated title"):
            creative_plan(Memory(), "model", self.job(), {},
                          lambda _, role, *args, **kwargs: answers[role])

    def test_producer_cannot_invent_unreviewed_concept(self):
        answers = self.actions()
        answers["producer"]["proposed_action"]["selected_candidate_id"] = "new-concept"
        with self.assertRaisesRegex(ValueError, "not proposed"):
            creative_plan(Memory(), "model", self.job(), {},
                          lambda _, role, *args, **kwargs: answers[role])

    def test_critic_must_review_every_candidate(self):
        answers = self.actions()
        answers["critic"]["proposed_action"]["assessments"].pop()
        with self.assertRaisesRegex(ValueError, "every candidate"):
            creative_plan(Memory(), "model", self.job(), {},
                          lambda _, role, *args, **kwargs: answers[role])

    def test_dashboard_displays_only_recorded_decisions_and_escapes_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            page = root / "docs/games/new-arcade/index.html"
            page.parent.mkdir(parents=True)
            page.write_text("<title>Gravity Fold</title>")
            receipt = {
                "run_id": "123-1", "request": self.job()["request"],
                "plan": {"creative_decision": {
                    "candidates": [
                        {"candidate_id": "designer", "title": "Ripple Forge"},
                        {"candidate_id": "researcher", "title": "Signal Lantern"},
                        {"candidate_id": "engineer", "title": "Gravity Fold"},
                    ],
                    "selection": {
                        "concept": {"title": "Gravity Fold", "core_loop": "Marble physics"},
                        "selection_reason": "Selected for <originality> & replay.",
                        "rejected_candidates": [
                            {"candidate_id": "designer", "reason": "Too broad"},
                            {"candidate_id": "researcher", "reason": "Less intuitive"},
                        ],
                    },
                }},
            }
            dest = root / "game_factory/results/creative-job-001.json"
            dest.parent.mkdir(parents=True)
            dest.write_text(json.dumps(receipt))
            catalog(root)
            output = (root / "docs/games/index.html").read_text()
            self.assertIn("Creative decision", output)
            self.assertIn("Gravity Fold", output)
            self.assertIn("Ripple Forge", output)
            self.assertIn("Signal Lantern", output)
            self.assertIn("&lt;originality&gt;", output)
            self.assertNotIn("<originality>", output)
            self.assertIn("creative-job-001.json", output)


if __name__ == "__main__":
    unittest.main()

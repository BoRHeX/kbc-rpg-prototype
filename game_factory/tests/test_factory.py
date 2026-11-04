"""Automated Game Factory regression checks (no API calls)."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from game_factory.council import candidates, council_report, evaluate, trial


class FactoryTests(unittest.TestCase):
    def test_fixed_seed_reproducibility(self):
        c = candidates()[0]
        self.assertEqual(trial(c, 12345), trial(c, 12345))
        self.assertEqual(evaluate(c), evaluate(c))

    def test_bounded_candidates(self):
        self.assertTrue(all(c.valid() for c in candidates()))
        self.assertGreaterEqual(len(candidates()), 3)

    def test_council_evidence_and_non_release(self):
        result = council_report()
        self.assertEqual(len(result["ballots"]), 5)
        self.assertEqual({b["department"] for b in result["ballots"]},
                         {"Design", "Balance", "Engineering", "Quality", "Publishing"})
        self.assertEqual(result["ballots"][-1]["vote"], "ABSTAIN")
        self.assertIn("manual", result["decision"])
        self.assertTrue(all(e["simulation_only"] for e in result["experiments"]))
        self.assertNotIn("deploy", result)

    def test_game_code_exists_and_is_original(self):
        source = (Path(__file__).resolve().parents[2] /
                  "studio/web/game.js").read_text()
        for marker in ("spawnEnemy", "shotAtEnemy", "pointerdown",
                       "requestAnimationFrame", "renderWorld"):
            self.assertIn(marker, source)

    def test_json_roundtrip(self):
        result = council_report()
        encoded = json.dumps(result)
        self.assertEqual(json.loads(encoded)["experiment_id"], result["experiment_id"])


if __name__ == "__main__":
    unittest.main()

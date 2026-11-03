"""KBC City integration tests. Run: python -m unittest discover -s tests -v"""
import json
import unittest
from city_sim import KBCCity, CityManager, PLACES
from city_app import Runtime, handler_factory


class CityTests(unittest.TestCase):
    def test_oracle_and_bounds(self):
        city = KBCCity(count=5)
        self.assertEqual(city.oracle_kbc, 1)
        self.assertTrue(city.integrity_check())
        self.assertEqual(city.kbc("Explorer"), 1 / 3)
        for resident in city.residents:
            self.assertGreaterEqual(city.kbc(resident), 0)
            self.assertLessEqual(city.kbc(resident), 1)

    def test_movement_cannot_mint_kbc(self):
        city = KBCCity()
        before = city.kbc("Engineer")
        city.act("Engineer", {"action": "travel", "destination": "Library"})
        self.assertEqual(city.kbc("Engineer"), before)
        self.assertTrue(city.integrity_check())

    def test_wrong_location_cannot_study(self):
        city = KBCCity()
        with self.assertRaises(ValueError):
            city.act("Researcher", {"action": "study"})
        self.assertEqual(city.kbc("Researcher"), 0)

    def test_untrusted_policy_cannot_create_facts(self):
        city = KBCCity()
        with self.assertRaises(ValueError):
            city.act("Explorer", {"action": "mint", "fact": "lamp_powered"})
        with self.assertRaises(ValueError):
            city.act("Explorer", {"action": "share", "receiver": "Engineer",
                                  "fact": "lamp_powered"})
        self.assertTrue(city.integrity_check())

    def test_city_progress_and_auditable_sharing(self):
        city = KBCCity()
        city.advance(20)
        self.assertTrue(city.integrity_check())
        self.assertTrue(any(e["type"] == "share" for e in city.events))
        self.assertTrue(any(e["type"] == "derive" for e in city.events))
        self.assertGreater(city.kbc("Researcher"), 0)
        self.assertGreaterEqual(city.kbc("Explorer"), 1 / 3)

    def test_branch_isolation_and_switch(self):
        manager = CityManager()
        manager.fork("trial")
        manager.city.advance(10)
        self.assertEqual(manager.city.tick, 10)
        manager.switch("genesis")
        self.assertEqual(manager.city.tick, 0)
        self.assertEqual(manager.city.kbc("Researcher"), 0)
        manager.switch("trial")
        self.assertEqual(manager.city.tick, 10)
        self.assertTrue(manager.city.integrity_check())

    def test_tamper_detection(self):
        city = KBCCity()
        city.advance(2)
        self.assertTrue(city.integrity_check())
        city.events[1]["data"]["fact"] = "lamp_powered"
        self.assertFalse(city.integrity_check())

    def test_invalid_branch(self):
        manager = CityManager()
        with self.assertRaises(ValueError):
            manager.fork("../oops")
        with self.assertRaises(ValueError):
            manager.switch("missing")

    def test_agent_observation_is_limited(self):
        city = KBCCity()
        observation = city.observation_for("Researcher")
        self.assertNotIn("reference_facts", observation)
        self.assertNotIn("rules", observation)
        self.assertEqual(observation["known"], [])

    def test_oracle_chat_does_not_mint(self):
        city = KBCCity()
        initial = city.kbc("Researcher")
        reply = city.oracle_query("How are proofs derived?", "Oracle")
        self.assertIn("synthetic", reply["reply"])
        self.assertEqual(city.kbc("Researcher"), initial)
        self.assertTrue(city.integrity_check())

    def test_ai_policy_rejected_if_invalid(self):
        city = KBCCity()
        city.advance(1, policy=lambda _: {"action": "override-score", "value": 1})
        self.assertTrue(any(e["type"] == "rejected" for e in city.events))
        self.assertEqual(city.kbc("Researcher"), 0)
        self.assertTrue(city.integrity_check())

    def test_50_agent_configuration(self):
        city = KBCCity(count=50)
        self.assertEqual(len(city.residents), 50)
        self.assertTrue(city.integrity_check())
        json.dumps(city.state())


if __name__ == "__main__":
    unittest.main()

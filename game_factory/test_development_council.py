import unittest
from game_factory.development_council import apply_exact_edits, GAME_REL


class DevelopmentCouncilTests(unittest.TestCase):
    SOURCE = "function spawnEnemy() {\n  const speed = 10;\n}\nfunction tick() {}\n"

    def test_exact_mechanic_edit(self):
        edits = [{"path": GAME_REL,
                  "old": "const speed = 10;",
                  "new": "const speed = 10;\n  const slowZombieSpeed = speed * 0.5;"}]
        result = apply_exact_edits(self.SOURCE, edits)
        self.assertIn("slowZombieSpeed", result)
        self.assertEqual(self.SOURCE.count("function spawnEnemy"), 1)

    def test_rejects_unrelated_files(self):
        with self.assertRaises(ValueError):
            apply_exact_edits(self.SOURCE, [
                {"path": ".github/workflows/evil.yml",
                 "old": "const speed = 10;", "new": "const speed = 50;"}])

    def test_rejects_missing_or_ambiguous_source(self):
        with self.assertRaises(ValueError):
            apply_exact_edits(self.SOURCE, [
                {"path": GAME_REL, "old": "absent text here",
                 "new": "new speed = 10;"}])
        with self.assertRaises(ValueError):
            apply_exact_edits("repeat repeat repeat", [
                {"path": GAME_REL, "old": "repeat",
                 "new": "changed"}])

    def test_rejects_dynamic_code_or_network(self):
        for bad in ('eval("secret")', 'new Function("x")',
                    'navigator.sendBeacon("https://example.com")'):
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    apply_exact_edits(self.SOURCE, [
                        {"path": GAME_REL, "old": "const speed = 10;",
                         "new": "const speed = 10; " + bad}])

    def test_rejects_excessive_changes(self):
        with self.assertRaises(ValueError):
            apply_exact_edits(self.SOURCE, [
                {"path": GAME_REL, "old": "const speed = 10;",
                 "new": "const speed = 15;"} for _ in range(3)])


if __name__ == "__main__":
    unittest.main()

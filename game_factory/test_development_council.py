import unittest
from game_factory.development_council import apply_exact_edits, apply_mechanic_slots, GAME_REL, ENEMY_INIT_ANCHOR, ENEMY_MOVE_ANCHOR, qa_approves_draft


class DevelopmentCouncilTests(unittest.TestCase):
    SOURCE = "function spawnEnemy() {\n  const speed = 10;\n}\nfunction tick() {}\n"

    def test_draft_approval_accepts_typed_and_explicit_text(self):
        self.assertTrue(qa_approves_draft({
            "proposed_action": {"approve_draft_pr": True, "reason": "Tests passed"}
        }))
        self.assertTrue(qa_approves_draft({
            "proposed_action": "Approve draft PR with mandatory human playtesting before release"
        }))
        self.assertFalse(qa_approves_draft({
            "proposed_action": "Do not approve draft PR until defect is corrected"
        }))
        self.assertFalse(qa_approves_draft({
            "proposed_action": {"approve_draft_pr": False, "reason": "Critical defect"}
        }))
        self.assertFalse(qa_approves_draft({
            "proposed_action": "Candidate looks promising but needs evaluation"
        }))

    def test_slot_compiler_adds_real_mechanic(self):
        source = ENEMY_INIT_ANCHOR + "\n" + ENEMY_MOVE_ANCHOR
        candidate = apply_mechanic_slots(source, {
            "mechanic": "hesitant_zombie",
            "enemy_properties": {"fearTimer": 0},
            "enemy_movement_js": (
                "if(enemy.fearTimer>0){enemy.fearTimer=Math.max(0,enemy.fearTimer-dt);}"
                "else{enemy.x+=dx/d*enemy.speed*dt;enemy.y+=dy/d*enemy.speed*dt;}"
            ),
        })
        self.assertIn("hurt:0,fearTimer:0});", candidate)
        self.assertIn("enemy.fearTimer", candidate)
        self.assertNotEqual(source, candidate)

    def test_slot_compiler_rejects_invalid_state_and_code(self):
        source = ENEMY_INIT_ANCHOR + "\n" + ENEMY_MOVE_ANCHOR
        for properties, movement in (
            ({"__proto__": 0}, "enemy.x+=dx;enemy.y+=dy;"),
            ({"fearTimer": float("nan")}, "enemy.x+=dx;enemy.y+=dy;"),
            ({"fearTimer": 0}, "fetch('https://example.com');enemy.x+=dx;"),
            ({"fearTimer": 0}, "window.location='x';enemy.x+=dx;"),
            ({"fearTimer": 0}, "if(true) return 1;enemy.x+=dx;"),
        ):
            with self.subTest(properties=properties, movement=movement):
                with self.assertRaises(ValueError):
                    apply_mechanic_slots(source, {
                        "mechanic": "hesitant_zombie",
                        "enemy_properties": properties,
                        "enemy_movement_js": movement,
                    })

    def test_slot_compiler_requires_unique_known_code(self):
        with self.assertRaises(ValueError):
            apply_mechanic_slots(ENEMY_MOVE_ANCHOR, {
                "mechanic": "hesitant_zombie",
                "enemy_properties": {"fearTimer": 0},
                "enemy_movement_js": "enemy.x+=dx;enemy.y+=dy;",
            })

    def test_exact_mechanic_edit(self):
        edits = [{"path": GAME_REL,
                  "old": "const speed = 10;",
                  "new": "const speed = 10;\n  const slowZombieSpeed = speed * 0.5;"}]
        result = apply_exact_edits(self.SOURCE, edits)
        self.assertIn("slowZombieSpeed", result)
        self.assertEqual(self.SOURCE.count("function spawnEnemy"), 1)

    def test_rejects_multiline_or_double_escaped_old_anchor(self):
        for old in ("function spawnEnemy() {\\n  const speed = 10;",
                    "function spawnEnemy() {\\\\n  const speed = 10;"):
            with self.subTest(old=old):
                with self.assertRaises(ValueError):
                    apply_exact_edits(self.SOURCE, [
                        {"path": GAME_REL, "old": old,
                         "new": "function spawnEnemy() { const speed = 15;"}])

    def test_rejects_control_characters_in_generated_code(self):
        with self.assertRaises(ValueError):
            apply_exact_edits(self.SOURCE, [
                {"path": GAME_REL, "old": "const speed = 10;",
                 "new": "const speed = 15;" + chr(2)}])

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

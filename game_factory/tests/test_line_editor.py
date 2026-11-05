import unittest
from game_factory.line_editor import apply_line_edits

class LineEditorTests(unittest.TestCase):
    def test_replace_by_line_number(self):
        source = "const a = 1;\nconst a = 1;\n"
        result = apply_line_edits(source, {"path":"studio/web/game.js","line":2,"new":"const a = 2;"})
        self.assertEqual(result, "const a = 1;\nconst a = 2;\n")
    def test_reject_invalid_position(self):
        with self.assertRaises(ValueError):
            apply_line_edits("const a = 1;\n", [{"path":"studio/web/game.js","line":99,"new":"const a = 2;"}])
    def test_reject_forbidden(self):
        with self.assertRaises(ValueError):
            apply_line_edits("const a = 1;\n", [{"path":"studio/web/game.js","line":1,"new":"eval('bad')"}])
    def test_reject_duplicate(self):
        with self.assertRaises(ValueError):
            apply_line_edits("const a = 1;\n", [{"path":"studio/web/game.js","line":1,"new":"const a = 2;"},{"path":"studio/web/game.js","line":1,"new":"const a = 3;"}])

if __name__ == "__main__":
    unittest.main()

"""Protect private recording review and authenticated dashboard launch contracts."""
import ast
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class PrivateReviewWorkflowTests(unittest.TestCase):
    def test_review_syntax_and_no_public_issue_from_main(self):
        source = (ROOT / "game_factory/video_pipeline.py").read_text(encoding="utf-8")
        module = ast.parse(source)
        main = next(x for x in module.body
                    if isinstance(x, ast.FunctionDef) and x.name == "main")
        direct_calls = [
            call.func.id for call in ast.walk(main)
            if isinstance(call, ast.Call) and isinstance(call.func, ast.Name)
        ]
        self.assertNotIn("github_issue", direct_calls)
        self.assertIn("already_processed", direct_calls)

    def test_workflow_uses_latest_by_default_and_no_private_artifacts(self):
        source = (ROOT / ".github/workflows/gameplay-video-review.yml").read_text(encoding="utf-8")
        self.assertIn('default: ""', source)
        self.assertIn("video_review_trigger.json", source)
        self.assertNotIn("actions/upload-artifact", source)
        self.assertNotIn("issues: write", source)
        self.assertIn("video_bridge.py", source)

    def test_dashboard_launch_is_authenticated_github_workflow(self):
        source = (ROOT / "docs/games/index.html").read_text(encoding="utf-8")
        self.assertIn("PROCESS LATEST RECORDING", source)
        self.assertIn("actions/workflows/gameplay-video-review.yml", source)
        self.assertIn("Run workflow", source)
        self.assertNotIn("github_pat_", source)
        self.assertNotIn("ghp_", source)


if __name__ == "__main__":
    unittest.main()

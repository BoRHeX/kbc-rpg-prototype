"""Protect the persistent games homepage during future accepted game releases."""
import json
import tempfile
import unittest
from pathlib import Path
from game_factory.mobile_jobs import catalog

START = "<!-- BEGIN GENERATED GAME CARDS -->"
END = "<!-- END GENERATED GAME CARDS -->"


class DashboardCatalogTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "game_factory/results").mkdir(parents=True)
        (self.root / "docs/games").mkdir(parents=True)
        self.page = self.root / "docs/games/index.html"
        self.page.write_text(
            '<!doctype html><title>Custom Studio</title>'
            '<main><h1>YOUR ARCADE</h1>'
            '<a href="../preview/">Cataclysm</a>'
            '<strong id="game-count">0 playable games</strong>'
            '<div class="games-grid">' + START + '\nOLD LINKS\n' + END + '</div>'
            '<section id="feedback">KEEP MY FEEDBACK UI</section></main>',
            encoding="utf-8",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def receipt(self, game, job_id, run_id, title):
        data = {
            "request": {"game": game, "title": title, "id": job_id},
            "run_id": run_id,
        }
        (self.root / "game_factory/results" / (job_id + ".json")).write_text(json.dumps(data))

    def game(self, game, title):
        home = self.root / "docs/games" / game
        home.mkdir(parents=True)
        (home / "index.html").write_text(
            "<!doctype html><title>" + title + "</title>", encoding="utf-8"
        )

    def test_preserves_dashboard_and_uses_real_game_title(self):
        self.game("studio-original-001", "Peach Bounce")
        self.game("neon-salvage", "Neon Salvage")
        self.receipt("studio-original-001", "studio-create-001", "200-1", "Studio Original")
        self.receipt("neon-salvage", "neon-create-001", "100-1", "Neon Salvage")
        self.receipt("cataclysm", "cat-update-001", "300-1", "Cataclysm")
        catalog(self.root)
        markup = self.page.read_text()
        self.assertIn("YOUR ARCADE", markup)
        self.assertIn("KEEP MY FEEDBACK UI", markup)
        self.assertIn('<strong id="game-count">3 playable games</strong>', markup)
        self.assertIn("<h3>Peach Bounce</h3>", markup)
        self.assertNotIn("Studio Original</h3>", markup)
        self.assertIn('href="./neon-salvage/"', markup)
        self.assertIn('href="./studio-original-001/"', markup)
        self.assertIn('href="../preview/"', markup)
        self.assertNotIn("OLD LINKS", markup)
        self.assertEqual(markup.count(START), 1)
        self.assertEqual(markup.count(END), 1)
        catalog(self.root)
        self.assertEqual(self.page.read_text(), markup)

    def test_new_game_appears_while_design_is_kept(self):
        self.game("tiny-new-game", "Arcade &amp; Co")
        self.receipt("tiny-new-game", "new-game-001", "400-1", "Administrative title")
        catalog(self.root)
        markup = self.page.read_text()
        self.assertIn("<h3>Arcade &amp; Co</h3>", markup)
        self.assertIn('href="./tiny-new-game/"', markup)
        self.assertIn("KEEP MY FEEDBACK UI", markup)

    def test_primary_release_labels_change_without_relabeling_archives(self):
        self.page.write_text(self.page.read_text() +
            '<span>CATACLYSM 0.9</span><h2 id="builds-heading">Cataclysm 0.9 builds.</h2>'
            '<article class="build-tile"><div class="tagline">PRIMARY · CATACLYSM 0.9</div>'
            '<h3>Cataclysm 0.9</h3><a href="../cataclysm/">▶ Play Cataclysm 0.9</a></article>'
            '<article class="build-tile"><h3>Cataclysm 0.9 — Original release</h3>'
            '<a href="../preview/">▶ Play original</a></article>')
        data = {"request": {"game": "cataclysm", "id": "cat-release",
                            "title": "Cataclysm 1.0: The Catastrophe", "release_version": "1.0"},
                "target": "docs/cataclysm", "run_id": "500-1"}
        (self.root / "game_factory/results/cat-release.json").write_text(json.dumps(data))
        catalog(self.root)
        markup = self.page.read_text()
        self.assertIn("Cataclysm 1.0: The Catastrophe</h3>", markup)
        self.assertIn("PRIMARY · CATACLYSM 1.0", markup)
        self.assertIn("Cataclysm 0.9 — Original release", markup)
        self.assertIn('href="../preview/">▶ Play original', markup)
        catalog(self.root)
        self.assertEqual(self.page.read_text(), markup)

    def test_missing_marker_fails_without_erasing_page(self):
        self.page.write_text("DO NOT OVERWRITE")
        with self.assertRaisesRegex(ValueError, "start marker"):
            catalog(self.root)
        self.assertEqual(self.page.read_text(), "DO NOT OVERWRITE")


if __name__ == "__main__":
    unittest.main()

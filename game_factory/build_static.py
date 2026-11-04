"""Export the self-contained CATACLYSM game for static hosting.

Copies the playable game, its config and actual deterministic council evidence
to a self-contained directory suitable for GitHub Pages or another host.
No personal Drive files, Studio credentials, API keys or private footage.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "studio" / "web"
sys.path.insert(0, str(ROOT))
from game_factory.council import council_report


def build(target: Path) -> Path:
    target.mkdir(parents=True, exist_ok=True)
    paths = {"game.html":"index.html", "game.css":"game.css",
             "game.js":"game.js", "game-config.json":"game-config.json"}
    for name, dest in paths.items():
        shutil.copyfile(SOURCE / name, target / dest)
    html = (target / "index.html").read_text(encoding="utf-8")
    html = html.replace('href="/game.css"', 'href="./game.css"')
    html = html.replace('src="/game.js"', 'src="./game.js"')
    html = html.replace('href="/" class="back"', 'href="./" class="back"')
    (target / "index.html").write_text(html, encoding="utf-8")
    js = (target / "game.js").read_text(encoding="utf-8")
    js = js.replace("fetch('/game-config.json')", "fetch('./game-config.json')")
    js = js.replace("fetch('/factory-report.json'", "fetch('./factory-report.json'")
    (target / "game.js").write_text(js, encoding="utf-8")
    (target / "factory-report.json").write_text(
        json.dumps(council_report(), indent=2) + "\n", encoding="utf-8"
    )
    (target / "BUILD_INFO.txt").write_text(
        "BoRHeZ Games: Cataclysm static playable build.\n"
        "Does not contain uploaded footage, account analytics, or API credentials.\n"
        "The Game Factory page shows dated build-time synthetic evidence, not live agents.\n",
        encoding="utf-8",
    )
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(ROOT / "dist" / "cataclysm"))
    args = parser.parse_args()
    out = build(Path(args.out))
    print(f"Static mobile game exported to {out}")


if __name__ == "__main__":
    main()

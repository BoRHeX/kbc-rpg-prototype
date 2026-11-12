"""Reconcile Cataclysm 1.0 game/lab browser asset versions after every stage.

A stage editing the world painter previously changed visuals.js's artRelease
without rotating the actor painter's release. The browser then fetched two
different art generations. Always version BOTH together and rotate local
script and stylesheet URLs to prevent Android users seeing mixed builds.

This step operates on trusted GitHub Actions runner (not the coding sandbox).
It cannot fabricate sprites or weaken QA, and it fails closed if an expected
renderer or the paired playable page is missing.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "docs"
GAMES = ("cataclysm-1-0-major", "cataclysm-100-lab")
RELEASE = re.compile(r"\bconst\s+assetRelease\s*=\s*(['\"])[^'\"]+\1\s*;")
LOCAL_URL = re.compile(r'((?:src|href)="\./[a-zA-Z0-9_./-]+\.(?:js|css)\?build=)[^"]+')


def reconcile(stage: str, run_id: str) -> str:
    if not re.fullmatch(r"[a-z][a-z0-9-]{1,30}", stage):
        raise ValueError("Unsafe stage name")
    if not re.fullmatch(r"[0-9]{5,20}", run_id):
        raise ValueError("Expected GitHub Actions run ID")
    version = f"cataclysm-10-{stage}-{run_id}"
    pending = {}
    for dirname in GAMES:
        directory = ROOT / dirname
        for name in ("animation.js", "visuals.js"):
            path = directory / name
            source = path.read_text(encoding="utf-8")
            updated, count = RELEASE.subn("const assetRelease='"+version+"';", source)
            if count != 1:
                raise RuntimeError(f"Expected exactly one assetRelease declaration in {path}: {count}")
            if "assetRelease" not in updated or updated == "":
                raise RuntimeError("Invalid renderer source")
            pending[path] = updated
        path = directory / "index.html"
        source = path.read_text(encoding="utf-8")
        updated, count = LOCAL_URL.subn(lambda m: m.group(1) + version, source)
        if count < 5:
            raise RuntimeError(f"Expected at least five browser scripts/styles in {path}, got {count}")
        for module in ("animation.js", "visuals.js", "game.js", "score.js", "follower-behavior.js"):
            if f'./{module}?build={version}"' not in updated:
                raise RuntimeError(f"Missing versioned {module} in {path}")
        pending[path] = updated
    for path, value in pending.items():
        path.write_text(value, encoding="utf-8")
    for dirname in GAMES:
        directory = ROOT / dirname
        expected = "const assetRelease='"+version+"';"
        for file in ("animation.js", "visuals.js"):
            if (directory / file).read_text(encoding="utf-8").count(expected) != 1:
                raise RuntimeError(f"Art version inconsistency: {dirname}/{file}")
    print("PASS: synchronized all Cataclysm character/world asset URLs and HTML script/style cache revisions:", version)
    return version


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", default=os.environ.get("STAGE", ""))
    parser.add_argument("--run-id", default=os.environ.get("GITHUB_RUN_ID", ""))
    arguments = parser.parse_args()
    reconcile(arguments.stage, arguments.run_id)


if __name__ == "__main__":
    main()

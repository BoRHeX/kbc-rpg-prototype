"""Run only explicitly declared, repository-local tests for the selected game."""
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
JOB = ROOT / os.getenv("ART_JOB", "game_factory/art_department/jobs/active.json")


def run(phase):
    j = json.loads(JOB.read_text())
    key = {"unit": "unit_tests", "browser": "browser_tests"}[phase]
    tests = j.get(key, [])
    if not tests:
        raise SystemExit("No " + key + " defined; cannot accept game art")
    for item in tests:
        p = Path(item)
        if p.is_absolute() or ".." in p.parts or not str(p).startswith("game_factory/"):
            raise SystemExit("Invalid acceptance test path: " + item)
        if not (ROOT / p).is_file() or p.suffix not in (".cjs", ".js", ".py"):
            raise SystemExit("Missing executable acceptance test: " + item)
        cmd = ([sys.executable] if p.suffix == ".py" else ["node"]) + [str(p)]
        print("GATE", phase, item, flush=True)
        subprocess.run(cmd, cwd=ROOT, check=True)
    if phase == "unit":
        for game in (j["source_dir"], j["mirror_dir"]):
            script = Path(game) / "animation.js"
            if (ROOT / script).is_file():
                subprocess.run(["node", "--check", str(script)], cwd=ROOT, check=True)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("unit", "browser"):
        raise SystemExit("Usage: python -m game_factory.art_department.run_checks {unit|browser}")
    run(sys.argv[1])

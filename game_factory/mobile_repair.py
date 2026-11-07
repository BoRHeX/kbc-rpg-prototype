"""Immutable stage/restore handoff for a separate Codex repair runner.

openai/codex-action@v1 with drop-sudo cannot be invoked twice in one job.
When gameplay acceptance fails, stage only allowlisted game files and
the public game plan into a bounded artifact. A fresh GitHub job can then
run Codex once with the original sandbox security policy intact.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from game_factory import mobile_jobs as mobile

SAFE_META = ("plan.json", "CODER_PROMPT.md", "CODER_REPORT.md", "gate.log",
             "acceptance.json")


def sha_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stage():
    job = mobile.load_job()
    root = mobile.WORK / "repair-input"
    if root.exists():
        shutil.rmtree(root)
    source = root / "source"
    context = root / "context"
    source.mkdir(parents=True)
    context.mkdir(parents=True)
    hashes = {}
    for name in sorted(mobile.GAME_FILES | mobile.BUILD_FILES):
        path = mobile.ROOT / job["target"] / name
        if not path.is_file():
            if name in ("index.html", "game.js", "game.css"):
                raise RuntimeError("Missing game code for repair: " + name)
            continue
        if path.is_symlink() or path.stat().st_size > 400000:
            raise RuntimeError("Invalid staged source file: " + name)
        shutil.copy2(path, source / name)
        hashes[name] = sha_file(path)
    for name in SAFE_META:
        path = mobile.WORK / name
        if path.is_file():
            if path.stat().st_size > 200000:
                raise RuntimeError("Oversized repair context: " + name)
            shutil.copy2(path, context / name)
    if not (context / "plan.json").exists() or not (context / "CODER_PROMPT.md").exists():
        raise RuntimeError("Cannot repair without original council and coder instructions")
    (root / "manifest.json").write_text(json.dumps({
        "job_digest": mobile.digest(job), "target": job["target"],
        "source_hashes": hashes
    }, indent=2) + "\n")
    print("Staged only the game candidate and its repair evidence")


def restore():
    job = mobile.load_job()
    root = mobile.WORK / "repair-input"
    info = json.loads((root / "manifest.json").read_text())
    if info["job_digest"] != mobile.digest(job) or info["target"] != job["target"]:
        raise RuntimeError("Repair input belongs to another job or has changed")
    expected = info["source_hashes"]
    if not isinstance(expected, dict) or not {"index.html", "game.js", "game.css"} <= set(expected):
        raise ValueError("Incomplete candidate repair manifest")
    if set(expected) - (mobile.GAME_FILES | mobile.BUILD_FILES):
        raise ValueError("Unexpected repair source file")
    dest = mobile.ROOT / job["target"]
    for name, hashed in expected.items():
        path = root / "source" / name
        if not path.is_file() or path.is_symlink() or sha_file(path) != hashed:
            raise RuntimeError("Candidate source hash mismatch: " + name)
        shutil.copy2(path, dest / name)
    for name in SAFE_META:
        path = root / "context" / name
        if path.is_file():
            if path.is_symlink() or path.stat().st_size > 200000:
                raise RuntimeError("Unsafe repair context")
            shutil.copy2(path, mobile.WORK / name)
    print("Restored validated game candidate into fresh sandbox job")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("stage", "restore"))
    args = parser.parse_args()
    {"stage": stage, "restore": restore}[args.command]()

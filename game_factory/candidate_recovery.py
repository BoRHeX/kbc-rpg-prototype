"""Verified recovery of a coded game candidate after a failed acceptance gate.

A failed job's diagnostic artifact supplies its original council decision and
coder report. A separately saved recovery branch supplies its unshipped game
files. Only the matching request, target, and allowlisted code are restored.
No prior private agent ledger or raw recording is retrieved.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

from game_factory import mobile_jobs as mobile


def candidate_request_matches(original, current):
    keys = ("id", "game", "mode", "title", "prompt", "acceptance",
            "redesign", "release_version", "release_scope")
    return all(original.get(k) == current.get(k) for k in keys)


def restore_candidate():
    job = mobile.load_job()
    request = job["request"]
    run = request.get("resume_candidate_run")
    if run is None:
        mobile.output("restored", "false")
        print("No pre-coded candidate requested")
        return
    branch = request["resume_candidate_branch"]
    if (type(run) is not int or run < 1 or
            not re.fullmatch(r"recovery/[a-z0-9-]{2,80}", branch)):
        raise ValueError("Invalid candidate recovery reference")

    root = mobile.ROOT
    work = mobile.WORK
    with tempfile.TemporaryDirectory(prefix="borhez-restore-") as td:
        directory = Path(td)
        subprocess.run([
            "gh", "run", "download", str(run),
            "--repo", os.environ["GITHUB_REPOSITORY"],
            "--name", "mobile-job-diagnostics", "--dir", str(directory)
        ], check=True, timeout=180)
        recorded_job = json.loads((directory / "job.json").read_text())
        if (recorded_job.get("target") != job["target"] or
                not candidate_request_matches(recorded_job["request"], request)):
            raise RuntimeError("Candidate's original game brief differs from requested job")
        plan_path = directory / "plan.json"
        report_path = directory / "CODER_REPORT.md"
        coder_path = directory / "CODER_PROMPT.md"
        if not all(p.is_file() for p in (plan_path, report_path, coder_path)):
            raise RuntimeError("Candidate is missing required plan and coding evidence")
        plan = json.loads(plan_path.read_text())
        if "update_decision" not in plan:
            raise RuntimeError("Candidate lacks an agreed update council decision")
        # Failed jobs retain an immutable, hashed candidate inside their own
        # diagnostics when the first gate failed. Restore that exact candidate
        # before falling back to a manually saved recovery branch. This avoids
        # another model coding run and never executes artifact contents here.
        staged = directory / "repair-input" / "source"
        if staged.is_dir():
            info = json.loads((directory / "repair-input" / "manifest.json").read_text())
            hashes = info.get("source_hashes")
            if (info.get("target") != job["target"] or
                    not isinstance(hashes, dict) or
                    not {"index.html", "game.js", "game.css"} <= set(hashes) or
                    set(hashes) - (mobile.GAME_FILES | mobile.BUILD_FILES)):
                raise RuntimeError("Invalid recovered candidate manifest")
            target = root / job["target"]
            for name in sorted(mobile.GAME_FILES):
                source = staged / name
                if not source.is_file():
                    if name == "game-config.json":
                        continue
                    raise RuntimeError("Missing recovered game file: " + name)
                data = source.read_bytes()
                if (source.is_symlink() or not data or len(data) > 400000 or
                        hashlib.sha256(data).hexdigest() != hashes.get(name)):
                    raise RuntimeError("Recovered candidate checksum mismatch: " + name)
                (target / name).write_bytes(data)
            print("Restored hash-verified candidate from failed-run diagnostic artifact")
        else:
            # Older failures may have only a manually preserved recovery branch.
            subprocess.run(
                ["git", "fetch", "--no-tags", "--depth=1", "origin", branch],
                cwd=root, check=True, timeout=90)
            target = root / job["target"]
            for name in sorted(mobile.GAME_FILES):
                ref = "FETCH_HEAD:" + job["target"] + "/" + name
                attempt = subprocess.run(["git", "show", ref], cwd=root,
                                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                         timeout=30)
                if attempt.returncode != 0:
                    if name == "game-config.json":
                        continue
                    raise RuntimeError("Missing recovered source file: " + name)
                if len(attempt.stdout) > 400000 or not attempt.stdout:
                    raise RuntimeError("Recovered game source has invalid size")
                (target / name).write_bytes(attempt.stdout)
        shutil.copy2(plan_path, work / "plan.json")
        shutil.copy2(report_path, work / "CODER_REPORT.md")
        shutil.copy2(coder_path, work / "CODER_PROMPT.md")
        (work / "candidate-recovery.json").write_text(json.dumps({
            "source_run": run, "branch": branch,
            "status": "unverified draft, requires gate and independent QA"
        }, indent=2) + "\n")
    mobile.output("restored", "true")
    print("Restored the unshipped code and council agreement for independent testing")


if __name__ == "__main__":
    restore_candidate()

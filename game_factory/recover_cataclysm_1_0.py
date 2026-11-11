"""Recover the one audited Cataclysm 1.0 candidate from Actions run 43092519643.

The completed final correction labeled STAGE_REPORT as 'final-continuation'
rather than 'repair'. Normalize that ONE field, re-validate all 25 IDs and
source hashes, then require fresh independent browser checks and QA approval.
No model-generated code is run in a job holding a secret or write token.
"""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from game_factory import mobile_jobs as m
from game_factory import release_scope as scope

RUN_ID = "43092519643-1"
REQUEST_ID = "cataclysm-10-the-catastrophe-review-07-full"
SOURCE_RUN = 43092519643
CORRECT_STAGE = "repair"
ALIAS = "final-continuation"


def read(path):
    return json.loads(path.read_text(encoding="utf8"))


def check(ok, reason):
    if not ok:
        raise ValueError("Cataclysm recovery rejected: " + reason)


def context():
    job, plan = read(m.WORK / "job.json"), read(m.WORK / "plan.json")
    check(job.get("run_id") == RUN_ID, "wrong original run")
    check(job.get("request", {}).get("id") == REQUEST_ID, "wrong release request")
    check(job.get("request", {}).get("release_version") == "1.0", "not version 1.0")
    check(job.get("target") == "docs/cataclysm", "wrong target")
    m.validate_request(job["request"])
    check(m.digest(job) == os.environ.get("EXPECTED_JOB_DIGEST"), "job digest")
    check(m.digest(plan) == os.environ.get("EXPECTED_PLAN_DIGEST"), "plan digest")
    scope.validate_plan(plan, job["request"]["release_scope"])
    marker = m.ROOT / "game_factory/requests/cataclysm-1-0-recovery-43092519643.json"
    check(marker.is_file() and read(marker) ==
          {"version": 1, "recovery_run": SOURCE_RUN, "artifact": "cataclysm-pass-repair"},
          "recovery request missing or altered")
    return job, plan


def checked_files(folder, expected):
    check(isinstance(expected, dict) and set(expected) <= m.GAME_FILES | m.BUILD_FILES,
          "unexpected game file")
    check({"index.html", "game.js", "game.css"} <= set(expected), "missing core game")
    check(m.manifest(folder) == expected, "SHA-256 mismatch in candidate")
    check("Cataclysm 1.0: The Catastrophe" in (folder / "index.html").read_text(),
          "wrong game identity")


def bootstrap():
    job, _ = context()
    archive = m.WORK / "archived_repair"
    checkpoint = read(archive / "checkpoint.json")
    check(checkpoint.get("stage") == CORRECT_STAGE and checkpoint.get("passed") is False,
          "not a failed repair checkpoint")
    check(checkpoint.get("failure") == "Stage omitted, deferred or blocked required work: repair",
          "unexpected failure type; do not normalize blindly")
    check(checkpoint.get("job_digest") == m.digest(job), "checkpoint job mismatch")
    check(checkpoint.get("plan_digest") == os.environ["EXPECTED_PLAN_DIGEST"], "checkpoint plan mismatch")
    check(checkpoint.get("target") == job["target"], "checkpoint target mismatch")
    checked_files(archive / "source", checkpoint.get("files"))
    release_scope = job["request"]["release_scope"]
    check(set(checkpoint.get("reports", {})) == set(scope.STAGES), "prior stage reports missing")
    for stage in scope.STAGES:
        scope.validate_stage_report(checkpoint["reports"][stage], release_scope, stage)
    report = read(archive / "STAGE_REPORT.json")
    check(report.get("stage") == ALIAS, "unknown report label")
    report["stage"] = CORRECT_STAGE
    scope.validate_stage_report(report, release_scope, CORRECT_STAGE)
    check(m.manifest(m.ROOT / job["target"]) == job["base_manifest"],
          "0.9 base changed; refuse overwrite")
    for name in checkpoint["files"]:
        shutil.copy2(archive / "source" / name, m.ROOT / job["target"] / name)
    for name in m.GAME_FILES | m.BUILD_FILES:
        if name not in checkpoint["files"]:
            (m.ROOT / job["target"] / name).unlink(missing_ok=True)
    checkpoint.pop("failure", None)
    checkpoint.pop("qa", None)  # prior QA rejected; require a NEW independent approval
    (m.WORK / "inherited.json").write_text(json.dumps(checkpoint, indent=2) + "\n")
    (m.WORK / "STAGE_REPORT.json").write_text(json.dumps(report, indent=2) + "\n")
    shutil.copy2(archive / "CODER_REPORT.md", m.WORK / "CODER_REPORT.md")
    (m.WORK / "recovery-correction.json").write_text(json.dumps({
        "original_run": SOURCE_RUN,
        "normalized_field": "STAGE_REPORT.stage",
        "old_value": ALIAS, "new_value": CORRECT_STAGE,
        "scope": "all 25 requirement IDs; no gameplay scope altered",
        "independent_qa": "required, not yet approved"
    }, indent=2) + "\n")
    print("Recovery source verified. Only report stage alias normalized; independent QA remains mandatory.")


def restore_for_review():
    job, _ = context()
    info = read(m.WORK / "checkpoint" / "checkpoint.json")
    check(info.get("stage") == CORRECT_STAGE and info.get("passed") is True,
          "fresh independent checkpoint not accepted")
    check(not info.get("failure"), "checkpoint has failure")
    check(info.get("job_digest") == m.digest(job), "review job mismatch")
    check(info.get("plan_digest") == os.environ["EXPECTED_PLAN_DIGEST"], "review plan mismatch")
    check(set(info.get("reports", {})) == {*scope.STAGES, CORRECT_STAGE},
          "not all stages accounted for")
    for stage, report in info["reports"].items():
        scope.validate_stage_report(report, job["request"]["release_scope"], stage)
    checked_files(m.WORK / "checkpoint" / "source", info["files"])
    check(m.manifest(m.ROOT / job["target"]) == job["base_manifest"],
          "base game changed before review")
    acceptance = read(m.WORK / "acceptance.json")
    check(acceptance.get("run_id") == job["run_id"] and
          acceptance.get("request_id") == job["request"]["id"] and
          m.accepted_browser_evidence(acceptance, job["request"]),
          "eight independent browser checks missing")
    for name in info["files"]:
        shutil.copy2(m.WORK / "checkpoint" / "source" / name, m.ROOT / job["target"] / name)
    check(m.manifest(m.ROOT / job["target"]) == info["files"], "restored source mismatch")
    print("Restored exact browser-tested 1.0 for source-only independent QA.")


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["bootstrap"]:
        bootstrap()
    elif sys.argv[1:] == ["restore_for_review"]:
        restore_for_review()
    else:
        raise SystemExit("Usage: python -m game_factory.recover_cataclysm_1_0 bootstrap|restore_for_review")

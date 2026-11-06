"""Recover game-only council decisions from a failed Actions run without replaying video.

The source GitHub artifact is downloaded using the job's scoped GitHub token,
validated by run ID, reduced to source-file proposals and critique, then the
temporary SQLite archive (which may include private gameplay inputs) is deleted.
Only the reduced gameplay proposals are passed to the final Producer.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile

from game_factory.update_council import ROLES, parse_feature


def extract_recovery(db_path: Path, run_id: int) -> dict:
    if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id < 1:
        raise ValueError("Invalid recovery run ID")
    results = {}
    with sqlite3.connect(str(db_path)) as db:
        for agent_id, stored in db.execute(
            "SELECT agent_id, payload FROM events WHERE run_id=? AND kind='model_decision' "
            "ORDER BY rowid", (str(run_id) + "-1",)
        ):
            role = str(agent_id).rsplit(".", 1)[-1]
            if role not in (*ROLES, "critic"):
                continue
            result = json.loads(stored).get("result", {})
            action = result.get("proposed_action") if isinstance(result, dict) else None
            if not isinstance(action, dict):
                continue
            if role in ROLES:
                normalized = parse_feature(role, {"proposed_action": action})
                results[role] = {
                    "claim": "Recovered previously proposed game feature",
                    "proposed_action": {"feature": {k: v for k, v in normalized.items()
                                                    if k != "candidate_id"}},
                }
            elif role == "critic":
                assessments = action.get("assessments")
                candidates = action.get("compatible_ids")
                if (not isinstance(assessments, list) or len(assessments) != 3
                        or not isinstance(candidates, list)):
                    raise ValueError("Recovered Critic decision has no valid assessments")
                results[role] = {
                    "claim": "Recovered prior Critic compatibility assessment",
                    "proposed_action": {
                        "assessments": assessments,
                        "compatible_ids": candidates,
                        "rationale": action.get("rationale", ""),
                    },
                }
    if set(results) != {*ROLES, "critic"}:
        raise ValueError("Council recovery is missing validated decisions")
    return {"source_run_id": run_id, "roles": results}


def recover_command():
    job = json.loads(Path("artifacts/mobile/job.json").read_text())
    run_id = job["request"].get("resume_council_run")
    if run_id is None:
        print("No prior council to recover")
        return
    root = Path(os.environ.get("RUNNER_TEMP", "/tmp"))
    with tempfile.TemporaryDirectory(prefix="private-council-recovery-", dir=str(root)) as temp:
        # The artifact itself contains SQLite event tasks with the spoken
        # transcript. It is NEVER uploaded or moved into artifacts/mobile.
        subprocess.run([
            "gh", "run", "download", str(run_id),
            "--repo", os.environ["GITHUB_REPOSITORY"],
            "--name", "mobile-job-diagnostics",
            "--dir", str(temp),
        ], check=True, timeout=180)
        db_path = Path(temp) / "memory.sqlite3"
        if not db_path.is_file():
            raise RuntimeError("Prior council's event ledger is unavailable")
        safe = extract_recovery(db_path, run_id)
    destination = root / "borhez_council_recovered.json"
    destination.write_text(json.dumps(safe, ensure_ascii=False), encoding="utf-8")
    destination.chmod(0o600)
    print("Recovered three game proposals and Critic compatibility decision. "
          "No media, transcripts, or private agent tasks retained.")


if __name__ == "__main__":
    recover_command()

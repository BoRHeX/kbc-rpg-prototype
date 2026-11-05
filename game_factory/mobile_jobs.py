"""Prompt-to-play jobs. Trusted orchestration is separate from generated game files."""
import argparse
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "artifacts/mobile"
GAME_FILES = {"index.html", "game.js", "game.css", "game-config.json"}
BUILD_FILES = {"BUILD_INFO.json", "BUILD_INFO.txt"}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def validate_request(value):
    if not isinstance(value, dict):
        raise ValueError("Request must be an object")
    for key in ("id", "game"):
        if not isinstance(value.get(key), str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,63}", value[key]):
            raise ValueError(f"Invalid {key}: use 2–64 lowercase letters, digits and hyphens")
    if value.get("mode") not in ("create", "update"):
        raise ValueError("Mode must be create or update")
    for key, limit in (("title", 100), ("prompt", 8000)):
        if not isinstance(value.get(key), str) or not value[key].strip() or len(value[key]) > limit:
            raise ValueError(f"Missing or oversized {key}")
    checks = value.get("acceptance")
    if not isinstance(checks, list) or not 1 <= len(checks) <= 12 or any(
        not isinstance(c, str) or not c.strip() or len(c) > 600 for c in checks
    ):
        raise ValueError("Supply 1–12 concise acceptance criteria")
    return {k: value[k] for k in ("id", "game", "mode", "title", "prompt", "acceptance")}


def target_for(game):
    return "docs/preview" if game == "cataclysm" else "docs/games/" + game


def manifest(directory):
    result = {}
    if not directory.exists():
        return result
    for path in sorted(directory.rglob("*")):
        if path.is_symlink():
            raise ValueError("Game files cannot be symbolic links")
        if path.is_file():
            name = path.relative_to(directory).as_posix()
            if name not in GAME_FILES | BUILD_FILES:
                raise ValueError(f"Unexpected game file: {name}")
            if path.stat().st_size > 400_000:
                raise ValueError("Game file exceeds 400 KB")
            result[name] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def output(key, value):
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as stream:
            stream.write(f"{key}={value}\n")


def prepare(root, request, run_id):
    request = validate_request(request)
    receipt_path = root / "game_factory/results" / (request["id"] + ".json")
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text())
        if receipt.get("request_digest") != digest(request):
            raise ValueError("Job ID already belongs to a different request; use a new ID")
        return None  # Re-running a delivered request must not spend API credits again.
    target = target_for(request["game"])
    directory = root / target
    exists = (directory / "index.html").exists()
    if request["mode"] == "create" and directory.exists():
        raise ValueError("Create cannot overwrite an existing game; use update")
    if request["mode"] == "update" and not exists:
        raise ValueError("Update needs an existing game")
    return {"request": request, "target": target, "run_id": run_id,
            "base_manifest": manifest(directory), "request_digest": digest(request)}


def load_job():
    return json.loads((WORK / "job.json").read_text())


def prepare_command():
    run_id = os.getenv("GITHUB_RUN_ID", "0") + "-" + os.getenv("GITHUB_RUN_ATTEMPT", "1")
    if os.getenv("JOB_PROMPT"):
        request = {"id": "manual-" + run_id, "game": os.environ["JOB_GAME"],
                   "mode": os.environ["JOB_MODE"], "title": os.environ["JOB_GAME"],
                   "prompt": os.environ["JOB_PROMPT"],
                   "acceptance": ["Implement the supplied prompt while preserving working mobile controls."]}
    else:
        request = json.loads((ROOT / "game_factory/requests/current.json").read_text())
    job = prepare(ROOT, request, run_id)
    output("active", str(job is not None).lower())
    if job is None:
        print("Request already delivered; no model calls needed")
        return
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / "job.json").write_text(json.dumps(job, indent=2) + "\n")
    # The runner verifies this digest after the coding agent finishes.
    output("job_digest", digest(job))
    output("target", job["target"])
    output("game", job["request"]["game"])
    output("request_id", job["request"]["id"])
    output("url_path", job["target"].removeprefix("docs/") + "/")
    print(json.dumps(job["request"], indent=2))


def plan_command():
    from game_factory.agent_api import ask_agent
    from game_factory.agent_memory import CouncilMemory
    job = load_job()
    memory = CouncilMemory(WORK / "memory.sqlite3")
    model = os.getenv("COUNCIL_MODEL", "gpt-4.1-mini")
    sources = {p.name: p.read_text() for p in (ROOT / job["target"]).glob("*")
               if p.name in GAME_FILES and p.is_file()}
    prior = []
    for p in sorted((ROOT / "game_factory/results").glob("*.json")):
        item = json.loads(p.read_text())
        if item.get("request", {}).get("game") == job["request"]["game"]:
            prior.append({"request": item["request"], "run_id": item["run_id"], "qa": item.get("qa")})
    evidence = {"job": job["request"], "source": sources, "prior_jobs": prior[-3:],
                "game_contract": (ROOT / "game_factory/MOBILE_CODER_PROMPT.md").read_text()}
    if (WORK / "feedback.md").exists():
        evidence["tester_feedback"] = (WORK / "feedback.md").read_text()[:12000]
    plan = {}
    tasks = {
        "producer": "Scope this exact requested job. Define a small playable result and measurable completion criteria. Do not substitute a different game or ignore the prompt.",
        "researcher": "Inspect the supplied source and identify relevant facts and constraints. For a new game, describe the minimum implementation; for an update, identify existing behavior to preserve.",
        "designer": "Specify the core loop, mobile controls and feedback needed by this prompt. Keep it simple, playable with one finger, and compatible with the standard game contract.",
        "critic": "Challenge the plan with concrete failure cases: unresponsive start, fake progress, touch input, pause, restart, viewport overflow, balance and missing prompt requirements.",
        "engineer": "Give the coding agent a concise implementation and verification plan. It can edit real files and run tools. Preserve working behavior on updates. Do not propose fragile line patches.",
    }
    try:
        for role, task in tasks.items():
            identity = memory.register(role, model)
            plan[role] = ask_agent(memory, identity, job["run_id"],
                task + "\nEVIDENCE:\n" + json.dumps({**evidence, "plan_so_far": plan}),
                ["artifacts/mobile/job.json", job["target"]], model=model, max_output_tokens=1200)
        (WORK / "plan.json").write_text(json.dumps(plan, indent=2) + "\n")
        prompt = (ROOT / "game_factory/MOBILE_CODER_PROMPT.md").read_text()
        (WORK / "CODER_PROMPT.md").write_text(prompt + "\n\nREQUEST:\n" +
            json.dumps(job, indent=2) + "\n\nAGENT PLAN:\n" + json.dumps(plan, indent=2))
    finally:
        memory.close()


def validate_command():
    job = load_job()
    if digest(job) != os.environ["EXPECTED_JOB_DIGEST"]:
        raise ValueError("Coding agent changed the job definition")
    current = manifest(ROOT / job["target"])
    for name in ("index.html", "game.js", "game.css"):
        if name not in current:
            raise ValueError("Missing required game file: " + name)
    before = {k: v for k, v in job["base_manifest"].items() if k in GAME_FILES}
    after = {k: v for k, v in current.items() if k in GAME_FILES}
    if before == after:
        raise ValueError("No actual game code changed")
    if not (WORK / "CODER_REPORT.md").exists():
        raise ValueError("Coding agent did not supply its report")
    subprocess.run(["node", "--check", str(ROOT / job["target"] / "game.js")], check=True)


def stamp_command():
    job = load_job()
    directory = ROOT / job["target"]
    if job["request"]["game"] == "cataclysm":
        from game_factory.stamp_preview import stamp
        stamp(directory, job["run_id"], os.getenv("GITHUB_SHA", ""))
        return
    page = directory / "index.html"
    source = page.read_text()
    label = "PLAYTEST " + job["run_id"]
    source, count = re.subn(r'(<[^>]+\bid="build-version"[^>]*>)[^<]*(</[^>]+>)',
                           lambda m: m[1] + label + m[2], source)
    if count != 1:
        raise ValueError("Expected one visible build-version element")
    # Each accepted version requests fresh CSS/JS while retaining its stable play URL.
    source = re.sub(r'((?:src|href)=["\'])(\./)?(game\.(?:js|css))(?:\?[^"\']*)?(["\'])',
                    lambda m: m[1] + (m[2] or "") + m[3] + "?build=" + job["run_id"] + m[4], source)
    page.write_text(source)
    (directory / "BUILD_INFO.json").write_text(json.dumps({
        "run_id": job["run_id"], "request_id": job["request"]["id"],
        "game": job["request"]["game"], "hardware_verification": "pending",
    }, indent=2) + "\n")


def review_command():
    from game_factory.agent_api import ask_agent
    from game_factory.agent_memory import CouncilMemory
    job = load_job()
    model = os.getenv("COUNCIL_MODEL", "gpt-4.1-mini")
    memory = CouncilMemory(WORK / "memory.sqlite3")
    evidence = {"request": job["request"],
                "tests": json.loads((WORK / "acceptance.json").read_text()),
                "coder_report": (WORK / "CODER_REPORT.md").read_text()[:12000],
                "source": {name: (ROOT / job["target"] / name).read_text()
                           for name in GAME_FILES if (ROOT / job["target"] / name).exists()},
                "physical_device_test": "not performed"}
    try:
        qa = ask_agent(memory, memory.register("qa", model), job["run_id"],
            "Independently review ACTUAL source, request criteria and executed browser evidence. "
            "Approve only if the prompt has been implemented and evidence supports a playable isolated preview. "
            "Passing standard controls is insufficient if the requested gameplay is absent. "
            "proposed_action MUST be an object with approve_preview (JSON boolean), reason, "
            "criteria_results and remaining_limitations. Physical-device and fun testing remain unverified. "
            "Do not mistake a coder's earlier inability to run browsers for the later executed browser evidence.\n"
            "EVIDENCE:\n" + json.dumps(evidence),
            ["artifacts/mobile/acceptance.json", job["target"]], model=model, max_output_tokens=2200)
        (WORK / "qa.json").write_text(json.dumps(qa, indent=2) + "\n")
        if not isinstance(qa.get("proposed_action"), dict) or qa["proposed_action"].get("approve_preview") is not True:
            raise ValueError("Independent QA rejected this candidate; see qa.json")
    finally:
        memory.close()


def package_command():
    job = load_job()
    receipt = {**job, "state": "accepted", "files": manifest(ROOT / job["target"]),
               "play_path": job["target"].removeprefix("docs/") + "/",
               "plan": json.loads((WORK / "plan.json").read_text()),
               "qa": json.loads((WORK / "qa.json").read_text()),
               "acceptance": json.loads((WORK / "acceptance.json").read_text()),
               "coder_report": (WORK / "CODER_REPORT.md").read_text()}
    bundle = WORK / "release"
    bundle.mkdir(exist_ok=True)
    shutil.copytree(ROOT / job["target"], bundle / "game", dirs_exist_ok=True)
    (bundle / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")


def publish_bundle(root, bundle):
    receipt = json.loads((bundle / "receipt.json").read_text())
    request = validate_request(receipt["request"])
    target = target_for(request["game"])
    if receipt["target"] != target or receipt["request_digest"] != digest(request):
        raise ValueError("Candidate target or request was altered")
    tests = receipt.get("acceptance", {})
    if (receipt.get("state") != "accepted" or
            receipt.get("qa", {}).get("proposed_action", {}).get("approve_preview") is not True or
            tests.get("run_id") != receipt["run_id"] or tests.get("request_id") != request["id"] or
            len(tests.get("platforms", [])) != 2 or
            any(p.get("passed") is not True for p in tests["platforms"])):
        raise ValueError("Candidate lacks independent acceptance and QA approval")
    if manifest(bundle / "game") != receipt["files"]:
        raise ValueError("Candidate bytes differ from accepted manifest")
    result = root / "game_factory/results" / (request["id"] + ".json")
    if result.exists():
        previous = json.loads(result.read_text())
        if previous != receipt or manifest(root / target) != receipt["files"]:
            raise ValueError("Cannot retry publication over a different accepted game")
        return receipt  # Failed Pages jobs can retry without regenerating or recommitting code.
    if manifest(root / target) != receipt["base_manifest"]:
        raise ValueError("Game changed after this job started; refusing stale overwrite")
    for name in set(manifest(root / target)) - set(receipt["files"]):
        (root / target / name).unlink()
    shutil.copytree(bundle / "game", root / target, dirs_exist_ok=True)
    result.parent.mkdir(parents=True, exist_ok=True)
    result.write_text(json.dumps(receipt, indent=2) + "\n")
    catalog(root)
    return receipt


def catalog(root):
    latest = {}
    for path in (root / "game_factory/results").glob("*.json"):
        receipt = json.loads(path.read_text())
        game = receipt["request"]["game"]
        if game not in latest or int(receipt["run_id"].split("-")[0]) > int(latest[game]["run_id"].split("-")[0]):
            latest[game] = receipt
    links = ['<a href="../preview/">Cataclysm — survival playtest</a>']
    for game, receipt in sorted(latest.items()):
        if game != "cataclysm":
            links.append('<a href="./' + html.escape(game) + '/">' + html.escape(receipt["request"]["title"]) + '</a>')
    directory = root / "docs/games"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "index.html").write_text('''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>BoRHeZ Games</title>
<style>body{background:#0b1120;color:#f1f5f9;font:18px system-ui;margin:40px auto;max-width:640px;padding:20px}a{display:block;color:#67e8f9;padding:22px;border:1px solid #334155;border-radius:12px;margin:16px 0;text-decoration:none}p{color:#94a3b8}</style>
<h1>BoRHeZ Games</h1><p>Small games. Open one and play.</p>''' + "\n".join(links) + "\n</html>\n")


def verify_published(root, request_id):
    if not isinstance(request_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,63}", request_id):
        raise ValueError("Invalid accepted request ID")
    receipt = json.loads((root / "game_factory/results" / (request_id + ".json")).read_text())
    request = validate_request(receipt["request"])
    if request["id"] != request_id or receipt["request_digest"] != digest(request):
        raise ValueError("Accepted request identity mismatch")
    if receipt["target"] != target_for(request["game"]) or manifest(root / receipt["target"]) != receipt["files"]:
        raise ValueError("Published source differs from accepted game bytes")
    tests = receipt.get("acceptance", {})
    if (receipt.get("state") != "accepted" or
            receipt.get("qa", {}).get("proposed_action", {}).get("approve_preview") is not True or
            tests.get("run_id") != receipt["run_id"] or tests.get("request_id") != request_id or
            len(tests.get("platforms", [])) != 2 or
            any(p.get("passed") is not True for p in tests["platforms"])):
        raise ValueError("Missing accepted gameplay evidence")
    return receipt


def verify_published_command():
    request_id = os.getenv("REQUEST_ID", "")
    if not request_id:
        request_id = json.loads((ROOT / "game_factory/DELIVERY_REQUEST.json").read_text())["request_id"]
    receipt = verify_published(ROOT, request_id)
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / "delivery-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    output("play_path", receipt["play_path"])
    output("request_id", request_id)
    print("Accepted game bytes verified:", request_id, receipt["run_id"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["prepare", "plan", "validate", "stamp", "review", "package", "publish", "verify_published"])
    args = parser.parse_args()
    if args.command == "publish":
        receipt = publish_bundle(ROOT, WORK / "release")
        output("play_path", receipt["play_path"])
        output("request_id", receipt["request"]["id"])
    else:
        globals()[args.command + "_command"]()

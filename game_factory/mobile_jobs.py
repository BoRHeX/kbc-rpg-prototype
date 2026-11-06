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
    request = {k: value[k] for k in ("id", "game", "mode", "title", "prompt", "acceptance")}
    if "evidence_drive_file_id" in value:
        fid = value["evidence_drive_file_id"]
        if (request["mode"] != "update" or not isinstance(fid, str) or
                not re.fullmatch(r"[A-Za-z0-9_-]{20,100}", fid)):
            raise ValueError("Invalid private gameplay evidence file ID")
        request["evidence_drive_file_id"] = fid
    if "release_version" in value:
        version = value["release_version"]
        if (request["game"] != "cataclysm" or not isinstance(version, str)
                or not re.fullmatch(r"[0-9]{1,2}\.[0-9]{1,2}", version)):
            raise ValueError("Invalid Cataclysm release version")
        request["release_version"] = version
    if "resume_council_run" in value:
        run = value["resume_council_run"]
        if request["mode"] != "update" or type(run) is not int or run < 1:
            raise ValueError("Invalid prior council run ID")
        if "evidence_drive_file_id" in request:
            raise ValueError("Choose recovered council OR direct video, not both")
        request["resume_council_run"] = run
    return request


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


CREATIVE_PITCH_ROLES = ("designer", "researcher", "engineer")
CREATIVE_CONCEPT_FIELDS = (
    "title", "core_loop", "player_action", "scoring_and_end",
    "visual_theme", "differentiator",
)


def creative_text(value, label, limit=600):
    """Reject absent or vague structured decisions instead of silently inventing one."""
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError("Creative decision requires non-empty text: " + label)
    return value.strip()


def creative_pitch(role, result):
    action = result.get("proposed_action")
    concept = action.get("concept") if isinstance(action, dict) else None
    if not isinstance(concept, dict):
        raise ValueError(role + " must propose a concrete concept object")
    return {"candidate_id": role, **{
        field: creative_text(concept.get(field), role + "." + field)
        for field in CREATIVE_CONCEPT_FIELDS
    }}


def creative_plan(memory, model, job, evidence, ask_agent):
    """Five existing council calls: 3 independent pitches, critique, Producer decision.

    This applies ONLY to create jobs. The result is reviewable evidence, not
    private reasoning. The Producer selection is bound into the coder contract.
    """
    plan, pitches = {}, {}
    lenses = {
        "designer": "Prioritize surprising tactile interaction and a memorable visual identity.",
        "researcher": "Prioritize a distinctive rule, discovery or timing mechanic with clear player learning.",
        "engineer": "Prioritize a surprising but feasible simulation, physical interaction or risk/reward mechanic.",
    }
    common = (
        "For this NEW game, propose exactly ONE concrete, original and playable "
        "mobile game concept. Choose your own title and distinctive core mechanic. "
        "Do not recycle an existing BoRHeZ game or merely swap its art. "
        "Your proposed_action MUST be an object containing a concept object with "
        "these exact non-empty string keys: title, core_loop, player_action, "
        "scoring_and_end, visual_theme, differentiator. Define the real gameplay, "
        "not an abstract list of constraints. Limit the round to a simple "
        "one-finger mobile game; existing code/test contract is binding. "
        "Make a complete independent proposal without seeing other candidates. "
        "Keep the concept concise, plausible and clearly differentiated."
    )
    refs = ["artifacts/mobile/job.json", "game_factory/MOBILE_CODER_PROMPT.md"]
    for role in CREATIVE_PITCH_ROLES:
        identity = memory.register(role, model)
        task = common + " " + lenses[role] + "\nEVIDENCE:\n" + json.dumps(evidence)
        result = ask_agent(memory, identity, job["run_id"], task, refs,
                           model=model, max_output_tokens=1600)
        plan[role] = result
        pitches[role] = creative_pitch(role, result)

    # Detect exact repeated titles/loops before spending more agent calls.
    for field in ("title", "core_loop"):
        normalized = [re.sub(r"\s+", " ", pitches[r][field].casefold()).strip()
                      for r in CREATIVE_PITCH_ROLES]
        if len(set(normalized)) != len(normalized):
            raise ValueError("Independent creative pitches duplicated " + field)

    critic_prompt = (
        "Compare ALL three actual concept proposals, not generic project risks. "
        "For each candidate explicitly evaluate originality, first-minute fun, "
        "one-finger clarity, implementation feasibility and replay potential. "
        "Your proposed_action MUST be an object containing assessments: an array "
        "with EXACTLY one object for each candidate_id designer, researcher, "
        "engineer, each with string strength, risk, mitigation; plus "
        "preferred_candidate_id (one candidate ID) and reason (string). "
        "Highlight specific failures and how to test them. Do NOT invent a "
        "fourth concept or claim a game was tested.\nEVIDENCE:\n"
        + json.dumps({"request": job["request"], "candidates": list(pitches.values())})
    )
    plan["critic"] = ask_agent(memory, memory.register("critic", model),
                               job["run_id"], critic_prompt, refs,
                               model=model, max_output_tokens=1800)
    critique = plan["critic"].get("proposed_action")
    if not isinstance(critique, dict) or not isinstance(critique.get("assessments"), list):
        raise ValueError("Critic must provide a comparison of all concepts")
    assessments = critique["assessments"]
    ids = [entry.get("candidate_id") if isinstance(entry, dict) else None
           for entry in assessments]
    if len(ids) != len(CREATIVE_PITCH_ROLES) or set(ids) != set(CREATIVE_PITCH_ROLES):
        raise ValueError("Critic failed to assess every candidate once")
    for entry in assessments:
        for field in ("strength", "risk", "mitigation"):
            creative_text(entry.get(field), "critic." + field)
    if critique.get("preferred_candidate_id") not in pitches:
        raise ValueError("Critic preferred candidate is unknown")
    creative_text(critique.get("reason"), "critic.reason")

    producer_prompt = (
        "You are the final creative decision-maker BEFORE any coding. Choose ONE "
        "of the three supplied candidate IDs. Use the actual Critic assessments "
        "and compare originality, gameplay appeal, simplicity and feasibility. "
        "Do not replace the chosen concept with a new unreviewed game. "
        "Your proposed_action MUST be an object with: selected_candidate_id "
        "(one of designer, researcher, engineer), selection_reason (concrete string), "
        "rejected_candidates (array of exactly two objects with candidate_id "
        "and reason strings covering the two not selected), and "
        "implementation_directives (array of 2–5 specific short strings describing "
        "the selected game, its strongest mechanic and its critical test cases). "
        "Explicitly explain tradeoffs and preserve the concept's identity. "
        "Do not claim any implementation or test has happened.\nEVIDENCE:\n"
        + json.dumps({"request": job["request"], "candidates": list(pitches.values()),
                      "critic_evaluation": critique})
    )
    plan["producer"] = ask_agent(memory, memory.register("producer", model),
                                 job["run_id"], producer_prompt, refs,
                                 model=model, max_output_tokens=2000)
    selection = plan["producer"].get("proposed_action")
    if not isinstance(selection, dict):
        raise ValueError("Producer must make a structured selection")
    chosen = selection.get("selected_candidate_id")
    if chosen not in pitches:
        raise ValueError("Producer selected a concept that was not proposed")
    reason = creative_text(selection.get("selection_reason"), "producer.selection_reason", 1200)
    rejected = selection.get("rejected_candidates")
    if not isinstance(rejected, list) or len(rejected) != 2:
        raise ValueError("Producer must explain both rejected concepts")
    rejected_ids = [x.get("candidate_id") if isinstance(x, dict) else None for x in rejected]
    if set(rejected_ids) != set(pitches) - {chosen} or len(set(rejected_ids)) != 2:
        raise ValueError("Producer rejection identities do not match")
    for rejected_item in rejected:
        creative_text(rejected_item.get("reason"), "producer.rejection_reason")
    directives = selection.get("implementation_directives")
    if not isinstance(directives, list) or not 2 <= len(directives) <= 5:
        raise ValueError("Producer must give 2–5 concrete implementation directives")
    directives = [creative_text(x, "producer.directive") for x in directives]
    plan["creative_decision"] = {
        "schema_version": 1,
        "candidates": list(pitches.values()),
        "critique": critique,
        "selection": {
            "selected_candidate_id": chosen,
            "concept": pitches[chosen],
            "selection_reason": reason,
            "rejected_candidates": rejected,
            "implementation_directives": directives,
        },
    }
    return plan


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
    try:
        if job["request"]["mode"] == "create":
            plan = creative_plan(memory, model, job, evidence, ask_agent)
        else:
            from game_factory.update_council import negotiate_update
            # Private gameplay evidence never enters plan.json, CODER_PROMPT or
            # public GitHub artifacts. Only gameplay-only feature proposals do.
            private_file = Path(os.getenv("RUNNER_TEMP", "/tmp")) / "borhez_private_gameplay.json"
            if "resume_council_run" in job["request"]:
                recovered_file = Path(os.getenv("RUNNER_TEMP", "/tmp")) / "borhez_council_recovered.json"
                if not recovered_file.is_file():
                    raise RuntimeError("Validated previous council decisions not recovered")
                evidence["recovered_council"] = json.loads(recovered_file.read_text())
            elif "evidence_drive_file_id" in job["request"]:
                if not private_file.is_file():
                    raise RuntimeError("Requested private gameplay playback is missing")
                evidence["private_gameplay"] = json.loads(private_file.read_text())
            plan = negotiate_update(memory, model, job, evidence, ask_agent)
        (WORK / "plan.json").write_text(json.dumps(plan, indent=2) + "\n")
        prompt = (ROOT / "game_factory/MOBILE_CODER_PROMPT.md").read_text()
        if job["request"]["mode"] == "create":
            selection = plan["creative_decision"]["selection"]
            prompt += (
                "\n\nBINDING CREATIVE DECISION (selected BEFORE coding):\n"
                + json.dumps(selection, indent=2)
                + "\nImplement this selected concept only. Rejected concepts are "
                  "recorded alternatives, not implementation options. "
                  "If implementation is impossible, report the blocker instead "
                  "of silently changing the game. Document the selected candidate "
                  "ID and implementation evidence in CODER_REPORT.md.\n"
            )
        if job["request"]["mode"] == "update":
            selection = plan["update_decision"]["selection"]
            prompt += (
                "\n\nBINDING COLLABORATIVE UPDATE DECISION (agreed BEFORE coding):\n"
                + json.dumps(selection, indent=2)
                + "\nImplement ALL selected playable features together, "
                  "reconcile overlapping edits and preserve existing mechanics. "
                  "Each proposed code operation is a suggestion, not an executable "
                  "patch. Explain in CODER_REPORT.md how each selected feature "
                  "and interface contract was implemented and tested; do not "
                  "claim unsupplied evidence.\n"
            )
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
        version = job["request"].get("release_version")
        if version:
            page = directory / "index.html"
            content, count = re.subn(
                r'(<span\b[^>]*\bid="game-version"[^>]*>)[^<]*(</span>)',
                lambda m: m[1] + version + m[2], page.read_text())
            if count != 1:
                raise ValueError("Cataclysm version element missing or ambiguous")
            page.write_text(content)
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
                "review_stage": {
                    "decision": "Approve or reject the isolated game preview before publication.",
                    "test_order": "The independent browser tests ran after the coding agent's report. Their executed results, not earlier sandbox limitations in that report, describe current browser acceptance.",
                    "later_steps": "After preview approval the separate publisher commits source, deploys and verifies exact live bytes. Physical-device playtesting and human enjoyment feedback follow public delivery.",
                },
                "coder_report": (WORK / "CODER_REPORT.md").read_text()[:12000],
                "source": {name: (ROOT / job["target"] / name).read_text()
                           for name in GAME_FILES if (ROOT / job["target"] / name).exists()},
                "physical_device_test": "not performed",
                "creative_decision": json.loads((WORK / "plan.json").read_text()).get("creative_decision"),
                "update_decision": json.loads((WORK / "plan.json").read_text()).get("update_decision")}
    try:
        qa = ask_agent(memory, memory.register("qa", model), job["run_id"],
            "Independently review ACTUAL source, request criteria and executed browser evidence. "
            "Approve only if the prompt has been implemented and evidence supports a playable isolated preview. "
            "Passing standard controls is insufficient if the requested gameplay is absent. "
            "For new-game jobs with a creative_decision, also verify the implemented "
            "core mechanic matches the Producer-selected concept; reject silent concept swaps. "
            "For collaborative update jobs verify that ALL Producer-selected "
            "features are implemented and integration contracts are respected; "
            "do not approve cosmetic-only substitutions for gameplay content. "
            "This is a PRE-PUBLICATION preview decision. Do not require publication or live-file verification "
            "before approving the preview: the separate publisher performs those steps after approval. "
            "Mark those delivery criteria pending for the publisher, rather than failed preview criteria. "
            "Physical-device testing and human enjoyment are later playtests, not preview approval gates "
            "unless the request explicitly requires physical-device evidence. A mobile-game requirement alone does not require it. "
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
    """Regenerate game cards without replacing the designed studio homepage."""
    latest = {}
    for path in (root / "game_factory/results").glob("*.json"):
        receipt = json.loads(path.read_text())
        game = receipt["request"]["game"]
        if game not in latest or int(receipt["run_id"].split("-")[0]) > int(latest[game]["run_id"].split("-")[0]):
            latest[game] = receipt

    directory = root / "docs/games"
    directory.mkdir(parents=True, exist_ok=True)
    page = directory / "index.html"
    begin = "<!-- BEGIN GENERATED GAME CARDS -->"
    end = "<!-- END GENERATED GAME CARDS -->"
    if not page.exists():
        page.write_text(
            '<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>BoRHeZ Games</title><h1>BoRHeZ Games</h1>'
            '<a href="../preview/">Cataclysm</a><div class="games-grid">'
            + begin + "\n" + end + "</div></html>\n"
        )

    summaries = {
        "neon-salvage": "Collect glowing cores, chain multipliers, and dodge red debris in a 60-second run.",
        "studio-original-001": "Bounce a peach from your tray and clear the jam tiles. Quick, simple, replayable.",
    }
    symbols = {"neon-salvage": "🚀", "studio-original-001": "🍑"}
    cards = []
    ordered = sorted(latest.items(), key=lambda item: int(item[1]["run_id"].split("-")[0]), reverse=True)
    for game, receipt in ordered:
        if game == "cataclysm":
            continue
        target = directory / game / "index.html"
        if not target.is_file():
            raise ValueError("Catalog game is missing its published index.html: " + game)
        markup = target.read_text(encoding="utf-8")
        match = re.search(r"<title[^>]*>(.*?)</title>", markup, flags=re.I | re.S)
        title = html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip() if match else ""
        title = title or receipt["request"]["title"]
        title = html.escape(title[:100])
        safe_id = html.escape(game, quote=True)
        description = html.escape(summaries.get(game, "An original mobile browser game. Open and play."))
        symbol = html.escape(symbols.get(game, "✦"))
        # Show the human-readable decision and rejected alternatives only when
        # a new game's receipt actually contains a validated creative selection.
        decision_html = ""
        decision = receipt.get("plan", {}).get("creative_decision")
        if isinstance(decision, dict) and isinstance(decision.get("selection"), dict):
            selected = decision["selection"]
            concept = selected.get("concept", {})
            rejected = selected.get("rejected_candidates", [])
            proposals = {c.get("candidate_id"): c for c in decision.get("candidates", [])
                         if isinstance(c, dict)}
            def h(value):
                return html.escape(str(value)[:800], quote=True)
            reasons = "".join(
                "<li><b>" + h(proposals.get(r["candidate_id"], {}).get("title", r["candidate_id"]))
                + "</b>: " + h(r["reason"]) + "</li>"
                for r in rejected if isinstance(r, dict)
                and r.get("candidate_id") in proposals and isinstance(r.get("reason"), str)
            )
            decision_html = (
                '<details class="creative-decision"><summary>Creative decision · 3 pitches</summary>'
                '<div class="creative-decision-body"><p><b>Selected: ' + h(concept.get("title", "Untitled"))
                + '</b> · ' + h(concept.get("core_loop", "")) + '</p><p><b>Why:</b> '
                + h(selected.get("selection_reason", "")) + '</p>'
                + ('<p><b>Rejected alternatives:</b></p><ul>' + reasons + '</ul>' if reasons else '')
                + '<a href="https://github.com/BoRHeX/kbc-rpg-prototype/blob/main/game_factory/results/'
                + h(receipt["request"]["id"]) + '.json" target="_blank" rel="noopener noreferrer">'
                'Full agent proposals, critique &amp; QA ↗</a></div></details>'
            )
        cards.append(
            f'<article class="game-card {safe_id}">'
            f'<div class="game-art" aria-hidden="true"><span class="symbol">{symbol}</span></div>'
            f'<div class="body"><div class="label">ORIGINAL MOBILE ARCADE</div>'
            f'<h3>{title}</h3><p>{description}</p>{decision_html}'
            f'<a class="btn btn-small" href="./{safe_id}/">▶ PLAY GAME <span aria-hidden="true">↗</span></a>'
            f'</div></article>'
        )

    source = page.read_text(encoding="utf-8")
    prefix, found, tail = source.partition(begin)
    if not found:
        raise ValueError("Game catalog is missing the start marker; refusing to overwrite its design")
    _, found, suffix = tail.partition(end)
    if not found:
        raise ValueError("Game catalog is missing the end marker; refusing to overwrite its design")
    refreshed = prefix + begin + "\n" + "\n".join(cards) + "\n" + end + suffix
    game_count = 1 + sum(game != "cataclysm" for game in latest)
    refreshed = re.sub(r'(<strong id="game-count">)[^<]*(</strong>)',
                       lambda m: m[1] + str(game_count) + " playable games" + m[2], refreshed)
    page.write_text(refreshed, encoding="utf-8")



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

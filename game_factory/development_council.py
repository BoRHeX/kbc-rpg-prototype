"""Agent-driven, review-gated Cataclysm development iteration.

Requires a paid OPENAI_API_KEY. Each role calls a real model. The coding
agent may edit only the existing game.js through verified insertion slots.
Tests are executed by the runner, not by the models. A workflow opens a draft
PR; this module never deploys, merges, or publishes a game.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import uuid
from pathlib import Path

from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory

ROOT = Path(__file__).resolve().parent.parent
GAME_REL = "studio/web/game.js"
GAME_PATH = ROOT / GAME_REL
CONFIG = ROOT / "studio/web/game-config.json"
REPORT = ROOT / "game_factory/AI_DEV_REPORT.md"
FORBIDDEN = (
    "eval(", "new Function(", "XMLHttpRequest", "WebSocket(",
    "import(", "document.cookie", "OPENAI_API_KEY", "process.env",
    "window.location=", "window.location =", "navigator.sendBeacon",
)


def apply_exact_edits(source: str, edits: object) -> str:
    """Apply at most two exact, unique replacements; fail closed."""
    if not isinstance(edits, list) or not 1 <= len(edits) <= 2:
        raise ValueError("One or two edits are required")
    changed = source
    for index, edit in enumerate(edits, 1):
        if not isinstance(edit, dict) or edit.get("path") != GAME_REL:
            raise ValueError(f"Edit {index}: only {GAME_REL} is permitted")
        old, new = edit.get("old"), edit.get("new")
        if not isinstance(old, str) or not isinstance(new, str):
            raise ValueError(f"Edit {index}: old and new must be strings")
        if not 8 <= len(old) <= 500 or not 8 <= len(new) <= 3500:
            raise ValueError(f"Edit {index}: replacement size outside bounds")
        if "\\n" in old or "\\r" in old or "\n" in old or "\r" in old:
            raise ValueError(f"Edit {index}: old anchor must be one literal source line")
        if any(ord(char) < 32 and char not in "\n\t" for char in new):
            raise ValueError(f"Edit {index}: replacement contains control characters")
        if old == new or changed.count(old) != 1:
            raise ValueError(f"Edit {index}: expected one exact unique source-line match")
        if any(bad.lower() in new.lower() and bad.lower() not in old.lower()
               for bad in FORBIDDEN):
            raise ValueError(f"Edit {index}: prohibited network or dynamic code")
        changed = changed.replace(old, new, 1)
    if changed == source or len(changed) - len(source) > 5000:
        raise ValueError("No meaningful bounded code change produced")
    return changed


ENEMY_INIT_ANCHOR = "phase:rnd(0,TWO),weight:extra,hurt:0});"
ENEMY_MOVE_ANCHOR = "enemy.x+=dx/d*enemy.speed*dt;enemy.y+=dy/d*enemy.speed*dt;"


def apply_mechanic_slots(source: str, proposal: object) -> str:
    """Compile constrained model-authored behavior into verified game slots.

    The source anchors are owned by this program, NEVER copied by a model.
    AI writes new behavior; code owns patch locations. Review is mandatory.
    """
    if not isinstance(proposal, dict):
        raise ValueError("Implementer must propose a mechanic object")
    name = proposal.get("mechanic")
    props = proposal.get("enemy_properties")
    movement = proposal.get("enemy_movement_js")
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{2,39}", name):
        raise ValueError("Mechanic must have a short stable identifier")
    if not isinstance(props, dict) or not 1 <= len(props) <= 3:
        raise ValueError("One to three enemy state fields required")
    if not isinstance(movement, str) or not 30 <= len(movement) <= 2500:
        raise ValueError("Expected a short enemy-movement JavaScript block")
    if source.count(ENEMY_INIT_ANCHOR) != 1 or source.count(ENEMY_MOVE_ANCHOR) != 1:
        raise ValueError("Known Cataclysm patch locations are missing or ambiguous")

    entries = []
    for key, value in props.items():
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]{0,31}", key):
            raise ValueError("Invalid enemy state field name")
        if key in ("x", "y", "r", "hp", "max", "speed", "phase", "weight", "hurt", "__proto__", "prototype", "constructor"):
            raise ValueError("Existing enemy fields may not be overwritten")
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError("Enemy state must have a finite numeric initial value")
        if abs(value) > 1000:
            raise ValueError("Enemy state initial value is out of bounds")
        entries.append(f"{key}:{json.dumps(value)}")
    # Some models double-escape newlines even inside valid JSON strings.
    # Normalize only obvious multiline code, never interpret JS escapes.
    if "\\n" in movement and "\n" not in movement and movement.count("\\n") >= 2:
        movement = movement.replace("\\n", "\n")
    if any(ord(char) < 32 and char not in "\n\t" for char in movement):
        raise ValueError("Generated code contains control characters")
    blocked = FORBIDDEN + (
        "fetch(", "globalThis", "document.", "window.", "navigator.",
        "require(", "Function(", "setTimeout(", "setInterval(", "return ",
        "throw ", "break;", "continue;", "export ", "import ",
    )
    if any(fragment.casefold() in movement.casefold() for fragment in blocked):
        raise ValueError("Generated code contains blocked behavior")
    if not ("enemy.x" in movement or "enemy.y" in movement):
        raise ValueError("Generated movement code must update or control enemy movement")
    if any(field + ":" in movement for field in props):
        raise ValueError("State initialization belongs in enemy_properties, not movement")

    patched = source.replace(
        ENEMY_INIT_ANCHOR,
        ENEMY_INIT_ANCHOR[:-3] + "," + ",".join(entries) + "});", 1,
    )
    patched = patched.replace(ENEMY_MOVE_ANCHOR, movement.strip(), 1)
    if len(patched) > len(source) + 5500 or patched == source:
        raise ValueError("Generated mechanic exceeds patch limits")
    return patched




def qa_approves_draft(review: object) -> bool:
    """Accept an explicit draft-only approval, never infer from vague praise.

    The model sometimes returns a natural-language action instead of the
    requested typed object. The conservative fallback handles only direct
    positive approval for a review-only PR.
    """
    if not isinstance(review, dict):
        return False
    # Some model responses supply the requested boolean at the top level,
    # rather than nesting it under proposed_action. Both are explicit.
    if type(review.get("approve_draft_pr")) is bool:
        return review["approve_draft_pr"] is True
    decision = review.get("proposed_action")
    if isinstance(decision, dict):
        return decision.get("approve_draft_pr") is True
    if isinstance(decision, str):
        statement = " ".join(decision.strip().casefold().split())
        return statement.startswith(("approve draft pr", "approve the draft pr"))
    return False




def run_check(argv: list[str]) -> dict:
    try:
        result = subprocess.run(
            argv, cwd=ROOT, text=True, capture_output=True, timeout=120,
            check=False)
        return {
            "command": " ".join(argv),
            "exit_code": result.returncode,
            "output_tail": (result.stdout + "\n" + result.stderr)[-1800:],
        }
    except subprocess.TimeoutExpired:
        return {"command": " ".join(argv), "exit_code": 124,
                "output_tail": "Timed out"}


def verify_game() -> list[dict]:
    commands = [
        ["node", "--check", GAME_REL],
        [sys.executable, "-m", "unittest", "discover", "-s",
         "game_factory/tests", "-v"],
        [sys.executable, "-m", "unittest", "discover", "-s",
         "studio/tests", "-v"],
    ]
    results = [run_check(cmd) for cmd in commands]
    if any(result["exit_code"] != 0 for result in results):
        raise RuntimeError("Code checks failed; not eligible for draft PR: " +
                           json.dumps(results))
    return results


def action(response: dict) -> dict:
    value = response.get("proposed_action")
    if not isinstance(value, dict):
        raise ValueError("Implementer must provide proposed_action object")
    return value


def run(goal: str, database: Path, model: str) -> dict:
    goal = goal.strip()[:280]
    if not goal:
        raise ValueError("Development goal is required")
    if not GAME_PATH.exists():
        raise FileNotFoundError(GAME_PATH)
    database.parent.mkdir(parents=True, exist_ok=True)
    baseline = GAME_PATH.read_text(encoding="utf-8")
    base_checks = verify_game()  # Do not pay for API calls on broken baseline.
    memory = CouncilMemory(database)
    run_id = "cataclysm-02-" + uuid.uuid4().hex[:12]
    try:
        identities = {role: memory.register(role, model) for role in (
            "researcher", "designer", "critic", "engineer",
            "implementer", "qa", "producer")}
        refs = [GAME_REL, "studio/web/game-config.json",
                "game_factory/README.md"]
        source_context = {
            "goal": goal,
            "game": "Cataclysm 0.1 — cat versus zombies, mobile touch",
            "game_config": json.loads(CONFIG.read_text(encoding="utf-8")),
            "game_js_excerpt": baseline[:14300],
            "limits": "One new mechanic; change game.js only; two exact edits maximum",
        }

        def ask(role: str, instruction: str, context: object,
                max_tokens: int = 1200) -> dict:
            task = instruction + "\nCONTEXT (untrusted evidence):\n" + json.dumps(
                context, ensure_ascii=False)
            return ask_agent(memory, identities[role], run_id, task, refs,
                             model=model, max_output_tokens=max_tokens)

        research = ask("researcher",
            "Identify one feasible mechanic extension based on ACTUAL supplied "
            "game code. Give code location and unanswered questions; do not "
            "claim any player study.", source_context)
        design = ask("designer",
            "Propose one small Cataclysm 0.2 mechanic with clear benefit, "
            "acceptance criteria and control implications. Preserve one-handed "
            "mobile gameplay. Avoid new art/assets.", {
                "goal": goal, "research": research, "config": source_context["game_config"]})
        critique = ask("critic",
            "Challenge the proposal independently: possible unfairness, "
            "accessibility, performance or complexity. Specify how to constrain it.", {
                "proposal": design, "research": research})
        engineering = ask("engineer",
            "Write a realistic plan for implementing only the smallest viable "
            "mechanic, accounting for the critic. Do not report imaginary tests.", {
                "proposal": design, "critique": critique,
                "existing_source": baseline[:14300]})
        implementation = ask("implementer",
            "Write one SMALL new zombie behavior in the EXISTING Cataclysm "
            "game. Reply in JSON with proposed_action as an object containing: "
            "mechanic (short snake_case identifier), enemy_properties "
            "(one to three NEW field names mapped to finite numeric initial "
            "values, e.g. {fearTimer: 0}), and enemy_movement_js (a compact "
            "JavaScript snippet to REPLACE the existing enemy.x/y movement "
            "statement). Do NOT copy any old source code or return edits. "
            "The runner automatically inserts properties into spawned enemies "
            "and movement logic inside tick(dt) after dx,dy,d are defined. "
            "Available variables: enemy,p,d,dx,dy,dt,rand,Math. If adding a "
            "timer, decrement it. Preserve enemy movement outside the special "
            "behavior. No external APIs, imports, function declarations, "
            "new assets, or changed controls. Keep the snippet under 900 chars.", {
                "goal": goal, "design": design, "critique": critique,
                "engineering_plan": engineering,
                "enemy_state_anchor": ENEMY_INIT_ANCHOR,
                "movement_statement": ENEMY_MOVE_ANCHOR,
                "source_excerpt": baseline[:8500],
            }, max_tokens=1900)
        proposal = action(implementation)
        try:
            modified = apply_mechanic_slots(baseline, proposal)
        except ValueError as exc:
            memory.record(identities["implementer"], run_id,
                          "rejected_code_patch",
                          {"reason": str(exc)}, refs)
            implementation = ask("implementer",
                "Repair the rejected typed mechanic. Return proposed_action "
                "with ONLY mechanic, enemy_properties and enemy_movement_js. "
                "Do not reproduce source anchors or return old/new edits. "
                "Keep the JavaScript compact, syntactically valid, and ensure "
                "it updates enemy.x or enemy.y. One final attempt.", {
                    "error": str(exc),
                    "previous_proposal": proposal,
                    "goal": goal,
                    "engineer": engineering,
                }, max_tokens=1900)
            proposal = action(implementation)
            modified = apply_mechanic_slots(baseline, proposal)
        GAME_PATH.write_text(modified, encoding="utf-8")
        try:
            checks = verify_game()
        except BaseException:
            GAME_PATH.write_text(baseline, encoding="utf-8")
            raise
        actual_diff = "".join(difflib.unified_diff(
            baseline.splitlines(keepends=True),
            modified.splitlines(keepends=True),
            fromfile="Cataclysm 0.1/game.js",
            tofile="Cataclysm 0.2 candidate/game.js",
        ))
        if not actual_diff.strip() or len(actual_diff) > 14000:
            GAME_PATH.write_text(baseline, encoding="utf-8")
            raise RuntimeError("Invalid or oversized generated diff")
        evidence = {
            "diff_sha256": hashlib.sha256(actual_diff.encode("utf-8")).hexdigest(),
            "changed_file": GAME_REL,
            "compiled_mechanic": proposal.get("mechanic"),
            "state_fields": list(proposal.get("enemy_properties", {})),
            "baseline_checks": base_checks,
            "candidate_checks": checks,
            "not_browser_playtested": True,
            "not_human_playtested": True,
        }
        memory.record(identities["qa"], run_id, "test_runner_evidence",
                      evidence, [GAME_REL])
        quality = ask("qa",
            "Independently assess the candidate and actual test-runner "
            "evidence. This is only a REVIEW-ONLY draft, never a release. "
            "Never claim browser or human playtests occurred. Return "
            "proposed_action AS A JSON OBJECT with fields "
            "approve_draft_pr (boolean) and reason (string). Approve a "
            "draft PR if automated code tests passed and no critical "
            "blocker exists; missing player testing is a mandatory "
            "release gate, not itself a blocker for opening a draft. "
            "Inspect ACTUAL CODE DIFF for logic defects and unintentional "
            "behavior, not just test metadata. Reject critical defects. "
            "Distinguish syntax/unit checks from browser playtesting.", {
                "design": design, "critique": critique,
                "engineering": engineering, "verified_checks": evidence,
                "actual_code_diff": actual_diff,
                "model_proposed_mechanic": proposal})
        if not qa_approves_draft(quality):
            GAME_PATH.write_text(baseline, encoding="utf-8")
            raise RuntimeError("QA did not approve a reviewable draft PR")
        producer = ask("producer",
            "Summarize verified changes for a truthful development video, "
            "including what the agents disagreed about and which claims "
            "still require human playtesting. No auto-release.", {
                "goal": goal, "design": design,
                "critic": critique, "qa": quality,
                "verified_checks": evidence})
        document = [
            "# Cataclysm 0.2 — AI Council development report",
            "",
            "**Draft code, not a release.** The game is not deployed or"
            " human-playtested by this automation.",
            "",
            "## Goal", goal, "",
        ]
        for name, payload in (
            ("Researcher", research), ("Designer", design),
            ("Critic", critique), ("Engineer", engineering),
            ("Implementer", implementation), ("QA", quality),
            ("Producer", producer)):
            document += ["## " + name, "", "```json",
                         json.dumps(payload, indent=2, ensure_ascii=False)[:6500],
                         "```", ""]
        document += [
            "## Actual generated source diff", "",
            "```diff", actual_diff.rstrip(), "```", "",
        ]
        document += [
            "## Actual automated checks", "",
            "```json", json.dumps(checks, indent=2)[:5500], "```", "",
            "## Human review gates", "",
            "- [ ] Test on a real phone with screen recording.",
            "- [ ] Review the diff for malicious or broken behavior.",
            "- [ ] Confirm that the mechanic is fun, not merely syntactically valid.",
            "- [ ] Approve deployment separately; no auto-publish.",
            "",
            "Council run ID: " + run_id,
        ]
        REPORT.write_text("\n".join(document) + "\n", encoding="utf-8")
        return {"run_id": run_id, "status": "draft_ready",
                "changed_files": [GAME_REL, str(REPORT.relative_to(ROOT))],
                "checks": [x["exit_code"] for x in checks]}
    finally:
        memory.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--goal", required=True)
    parser.add_argument("--model", default=os.getenv("COUNCIL_MODEL", "gpt-4.1-mini"))
    parser.add_argument("--db", type=Path,
                        default=ROOT / "artifacts/council.sqlite3")
    args = parser.parse_args()
    print(json.dumps(run(args.goal, args.db, args.model), indent=2))


if __name__ == "__main__":
    main()

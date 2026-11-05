"""Bounded autonomous game-development cycle. Agents decide; runner executes/tests."""
import argparse
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path
from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory
from game_factory.development_council import apply_exact_edits, verify_game, GAME_REL

ROOT = Path(__file__).resolve().parent.parent
BACKLOG = ROOT / "game_factory" / "AUTONOMOUS_BACKLOG.md"
REPORT = ROOT / "game_factory" / "AUTONOMOUS_REPORT.md"
GAME = ROOT / GAME_REL

def cycle(memory_path: Path, feedback: str, model: str):
    memory_path.parent.mkdir(parents=True, exist_ok=True)
    ledger = CouncilMemory(memory_path)
    run_id = "studio-" + uuid.uuid4().hex[:12]
    roles = ("researcher", "designer", "critic", "engineer", "implementer", "qa", "producer")
    ids = {role: ledger.register(role, model) for role in roles}
    source = GAME.read_text()
    baseline = verify_game()
    context = {"feedback": feedback[:10000], "backlog": BACKLOG.read_text()[:5000],
               "game_source": source[:19000], "last_report": REPORT.read_text()[:2500] if REPORT.exists() else "",
               "test_results": baseline}
    def ask(role, instruction, evidence, limit=1400):
        return ask_agent(ledger, ids[role], run_id,
                         instruction + "\nEVIDENCE:\n" + json.dumps(evidence),
                         ["studio/web/game.js", "game_factory/AUTONOMOUS_BACKLOG.md"],
                         model=model, max_output_tokens=limit)
    producer = ask("producer", "Act as autonomous game producer. Choose ONE high-value small task from actual game code and tester feedback. Do not ask human for feature selection. Give precise acceptance criteria and why this task matters. Avoid duplicate mechanics.", context)
    research = ask("researcher", "Identify relevant exact code and constraints for producer task; no fabricated facts.", {"task":producer, "source":source[:19000]})
    design = ask("designer", "Design implementation and user-visible result with acceptance criteria; prioritize tester feedback.", {"task":producer, "research":research})
    critic = ask("critic", "Challenge usability, fun, mobile controls, regressions and missing tests.", {"design":design,"feedback":feedback})
    engineer = ask("engineer", "Plan a safe small patch in studio/web/game.js with existing code anchors and concrete checks.", {"design":design,"critic":critic,"source":source[:19000]})
    # Model output is untrusted: validate the patch contract, then give the
    # implementer concrete validation feedback and a chance to repair it.
    # Never publish an invalid or untested change.
    patch_contract = (
        "Implement the selected task as an actual minimal code patch. "
        "Return JSON object with proposed_action as an ARRAY (not an object, "
        "not prose) containing 1 or 2 edit objects. Each edit MUST have exactly "
        "path, old, new. path must be studio/web/game.js. old must be an EXACT "
        "unique single line copied from the supplied source (8-500 characters). "
        "new must be replacement JavaScript (8-3500 characters). "
        "Example shape: {\\\"proposed_action\\\":[{\\\"path\\\":\\\"studio/web/game.js\\\",\\\"old\\\":\\\"exact original line\\\",\\\"new\\\":\\\"replacement line\\\"}]}. "
        "Do not invent an anchor. Do not include network access or dynamic eval. "
        "You can change any small mechanic or UX behavior; no fixed zombie-only task."
    )
    evidence = {"producer": producer, "design": design, "engineer": engineer,
                "critic": critic, "source": source[:19000]}
    changed = None
    edits = None
    repair_error = None
    for attempt in range(3):
        instruction = patch_contract
        if repair_error:
            instruction += ("\\nPREVIOUS PATCH REJECTED BY VALIDATOR: " + repair_error +
                            ". Return a corrected proposed_action ARRAY using exact source anchors.")
        implementer = ask("implementer", instruction, evidence, 3500)
        edits = implementer.get("proposed_action")
        # Accept the common single-edit-object response but still validate it.
        if isinstance(edits, dict) and {"path", "old", "new"} <= edits.keys():
            edits = [edits]
        try:
            changed = apply_exact_edits(source, edits)
            break
        except (ValueError, TypeError) as exc:
            repair_error = str(exc)
            ledger.record(ids["implementer"], run_id, "patch_rejected",
                          {"attempt": attempt + 1, "error": repair_error})
    if changed is None:
        raise RuntimeError("Implementer failed patch validation after three attempts: " + str(repair_error))
    GAME.write_text(changed)
    try:
        checks = verify_game()
    except Exception:
        GAME.write_text(source)
        raise
    qa = ask("qa", "Review ACTUAL successful test outputs and changed source. Identify gaps and reject release if needed. This is a draft, not a public release.", {"checks":checks,"edits":edits,"critic":critic})
    final = ask("producer", "Decide next backlog priority from work performed and QA; never claim deployment. Give concise game tester release notes.", {"task":producer,"qa":qa,"checks":checks})
    report = {"run_id":run_id,"producer":producer,"research":research,"design":design,"critic":critic,"engineer":engineer,"implementation":edits,"qa":qa,"next":final,"checks":checks}
    REPORT.write_text("# Autonomous Game Studio — latest cycle\n\n```json\n"+json.dumps(report,indent=2)+"\n```\n")
    ledger.record(ids["producer"],run_id,"completed_goal",{"task":producer,"next":final})
    print(json.dumps({"status":"draft_ready","run_id":run_id,"changes":len(edits)}))
    ledger.close()

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--feedback-file",default="game_factory/TESTER_FEEDBACK.md")
    p.add_argument("--memory",default="artifacts/autonomous.sqlite3")
    args=p.parse_args()
    feedback=Path(args.feedback_file).read_text() if Path(args.feedback_file).exists() else ""
    cycle(Path(args.memory),feedback,os.getenv("COUNCIL_MODEL","gpt-4.1-mini"))

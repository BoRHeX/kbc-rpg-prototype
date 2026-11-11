"""Bounded five-agent architecture council for Cataclysm major production.

Only writes public architecture documentation. Never changes playable game
source, workflows, tests, or billing settings; no tools execute model output.
The user-authorized work_order and acceptance requirements are immutable.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / "game_factory" / "cataclysm_next"
OUT = SPEC / "architecture"
GAME = ROOT / "docs" / "cataclysm-1-0-preview" / "game.js"
RUN_ID = os.environ.get("GITHUB_RUN_ID", "local") + "-" + os.environ.get("GITHUB_RUN_ATTEMPT", "1")
ROLES = ("researcher", "designer", "engineer", "critic", "producer")
MODEL = os.environ.get("COUNCIL_MODEL", "gpt-4.1-mini")


def verified_contract():
    contract = json.loads((SPEC / "work_order.json").read_text())
    assert contract["order_id"] == "cataclysm-1-0-catastrophe-major-20261111"
    assert contract["budget"]["planning_roles_max"] == 5 and contract["budget"]["provider_calls_with_response_retry_max"] == 10
    assert contract["constraints"]["total_seconds"] == 1300
    assert contract["constraints"]["total_minimum_animation_frames"] == 378
    assert len(contract["jobs"]) == 11
    assert set(contract["source_documents"]) == {
        "PRODUCTION_BRIEF.md", "AGENT_ORCHESTRATION.md",
        "ACCEPTANCE.md", "DECISIONS.md"}
    for path in contract["source_documents"]:
        assert (SPEC / path).is_file(), "missing binding document " + path
    return contract


def source_inventory(code):
    """Static audit is source evidence, not a claim of executed functionality."""
    needles = {
        "game_entry": r"function start\(",
        "game_loop": r"function tick\(",
        "world_chunk": r"function chunkAt\(",
        "enemy_spawn": r"function spawnEnemy\(",
        "enemy_traits": r"const EnemyTraits",
        "fusion": r"function beginFusion\(",
        "companion_ability": r"function companionSpecialAbilityActivate\(",
        "upgrade_offers": r"function offerUpgrade\(",
        "score": r"function updateHud\(",
        "audio_scheduler": r"function music\(",
        "sprite_renderer": r"function catSprite\(",
        "boss_spawn": r"function spawnBoss\(",
        "final_boss": r"function spawnFinalBoss\(",
        "diagnostics": r"CATACLYSM_DIAGNOSTICS",
    }
    matches = {}
    for k, pattern in needles.items():
        ms = [code[:m.start()].count("\n") + 1 for m in re.finditer(pattern, code)]
        if not ms:
            raise ValueError("Baseline source lacks expected public interface " + k)
        matches[k] = ms
    return {"source": "docs/cataclysm-1-0-preview/game.js",
            "lines": code.count("\n") + 1,
            "bytes": len(code.encode("utf-8")),
            "critical_function_lines": matches,
            "known_legacy_constraints": [
                "Monolithic global game variable and direct canvas drawing",
                "Different night, wave and boss intervals must be replaced by single 13s clock",
                "Current companion skills require explicit button activation",
                "Existing posed cat renderer has no complete 6/12/24-frame registry",
                "No boss/elite reroll economy and no 9+9+9 verified campaign victory",
            ]}


def agent_task(role, contract, inventory, earlier):
    shared = (
        "You are planning Gate 0 only; DO NOT claim game code was changed, "
        "published or tested. The seven creator requirements R1-R7 in the "
        "attached work order are FIXED; do not vote items out, reduce counts or "
        "present baseline 1.0 as satisfying them. Produce a concise, actionable "
        "architecture and task decomposition in JSON, grounded in the real source "
        "function inventory and the contracts. Do not invent media/recording details. "
        "The 100-night 13-second schedule is exact; 9th-night boss gives 11 events, "
        "6th-night elite gives 16 events, overlapping every 18. "
        "The 9+9+9 cumulative final interpretation is explicitly PROVISIONAL. "
        "Don't mark it user-approved. Bounded architecture only. "
    )
    focus = {
        "researcher":"Audit source versus R1-R7; identify actual migration seams, behavior risks, and missing QA evidence.",
        "designer":"Design the real 100-night play experience, distinct enemy identities, cast-distance rules and upgrade/reroll economy; flag provisional final-fight interpretation.",
        "engineer":"Propose concrete module decomposition, typed interface signatures, test fixtures, dependency DAG, and minimal safe first code refactor.",
        "critic":"Challenge the earlier proposals: find conflicts between 378 clip frames, 27 unique archetypes, audio memory, 13s waves, source constraints, and performance.",
        "producer":"Resolve role recommendations into ONE Gate0 implementation plan, small sequential PR milestones, agent assignments and explicit acceptance. Do not start code; preserve unresolved final-night semantics.",
    }
    evidence = json.dumps({"contract": {
        "order_id":contract["order_id"],"constraints":contract["constraints"],
        "jobs":contract["jobs"],"victory":contract["victory"]},
        "source_inventory":inventory, "prior_roles":earlier}, separators=(",",":"))
    return shared + focus[role] + "\nPUBLIC EVIDENCE: " + evidence


def assess(reply, role):
    assert isinstance(reply, dict), role + " response not an object"
    assert {"claim", "rationale", "objections", "proposed_action", "required_evidence"} <= set(reply), role + " missing fields"
    assert isinstance(reply["proposed_action"], dict), role + " proposed_action must be an object"
    assert len(json.dumps(reply)) <= 17000, role + " response too large"


def main():
    contract = verified_contract()
    inventory = source_inventory(GAME.read_text(encoding="utf8"))
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "SOURCE_AUDIT.json").write_text(json.dumps(inventory,indent=2) + "\n")
    memory = CouncilMemory(OUT / "private_architecture_ledger.sqlite3")
    results = {}
    try:
        for role in ROLES:  # at most FIVE bounded provider requests, no autonomous loops
            agent = memory.register(role, MODEL, agent_id=f"cataclysm.major.{role}")
            output = ask_agent(memory, agent, RUN_ID,
                               agent_task(role,contract,inventory,results),
                               ["PRODUCTION_BRIEF.md","AGENT_ORCHESTRATION.md","DECISIONS.md","ACCEPTANCE.md","work_order.json",inventory["source"]],
                               max_output_tokens=2300,word_limit=820)
            assess(output,role)
            results[role] = output
            (OUT / ("ROLE_" + role.upper() + ".json")).write_text(json.dumps(output,indent=2)+"\n")
            print("PASS: architecture " + role + " returned bounded public decision")
        producer = results["producer"]
        report = [
            "# Gate 0 architecture council — Cataclysm 1.0",
            "",
            "Order: " + contract["order_id"], "Planning run: " + RUN_ID,
            "Baseline: " + inventory["source"],
            "**Status:** Proposed architecture only. No game code, live page, "
            "QA gate or release has changed.",
            "",
            "## Producer decision",
            producer["claim"], "",
            "### Implementation decision",
            "```json", json.dumps(producer["proposed_action"],indent=2), "```", "",
            "### Objections / open blockers",
            *("- " + str(x) for x in producer["objections"]), "",
            "### Required proof",
            *("- " + str(x) for x in producer["required_evidence"]), "",
            "## Next required step",
            "Check the module contracts and begin a single isolated engine-refactor PR, "
            "then authorize independent specialist work only after tests. "
            "No user requirement may be removed.",
        ]
        (OUT / "PRODUCER_HANDOFF.md").write_text("\n".join(report)+"\n")
        (OUT / "COUNCIL_DECISIONS.json").write_text(json.dumps({
            "run_id":RUN_ID,"order_id":contract["order_id"],
            "status":"proposed_not_implemented","roles_requested":5,"provider_calls_with_retries_max":10,
            "roles":results,"baseline":inventory},indent=2)+"\n")
    finally:
        memory.close()
        (OUT / "private_architecture_ledger.sqlite3").unlink(missing_ok=True)

    assert all((OUT / ("ROLE_" + role.upper() + ".json")).is_file() for role in ROLES)
    assert (OUT / "PRODUCER_HANDOFF.md").is_file()
    print("Gate 0 planning complete; agent source edits and publication remain prohibited.")


if __name__ == "__main__":
    main()

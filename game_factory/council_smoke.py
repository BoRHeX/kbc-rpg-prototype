"""Smoke-test real API-backed council identities with durable history.

This does not edit game files or publish anything. It verifies that two
different persistent council agents can make model calls and retain evidence.
"""
import argparse
import json
import os
from pathlib import Path

from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", default="artifacts/council.sqlite3")
    p.add_argument("--model", default=os.getenv("COUNCIL_MODEL", "gpt-4.1-mini"))
    args = p.parse_args()
    db = Path(args.db)
    db.parent.mkdir(parents=True, exist_ok=True)
    memory = CouncilMemory(db)
    try:
        researcher = memory.register("researcher", args.model)
        designer = memory.register("designer", args.model)
        research = ask_agent(
            memory, researcher, "cataclysm-02-smoke",
            "Analyze this existing game brief. Suggest ONE question to investigate before adding mechanics: mobile cat evades zombies, auto-shoots, picks up fish, survives waves. No claims of real gameplay testing.",
            ["game_factory/README.md", "studio/web/game.js"],
        )
        design = ask_agent(
            memory, designer, "cataclysm-02-smoke",
            "Suggest ONE small new Cataclysm 0.2 mechanic for human review, taking the researcher's observations as unverified context: " + json.dumps(research),
            ["game_factory/README.md", "researcher:cataclysm-02-smoke"],
        )
        print(json.dumps({
            "status": "API-backed council smoke completed",
            "agent_ids": [researcher, designer],
            "researcher_history": len(memory.history(researcher)),
            "designer_history": len(memory.history(designer)),
            "research_proposal": research,
            "design_proposal": design,
            "limitations": "No game code edited, tests run or preview deployed",
        }, indent=2))
    finally:
        memory.close()

if __name__ == "__main__":
    main()

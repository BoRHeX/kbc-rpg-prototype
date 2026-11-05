"""Role-based game studio planning. No source-code editing in this stage."""
import json, os, uuid
from pathlib import Path
from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory

root=Path(__file__).resolve().parent.parent
mempath=root/"artifacts"/"autonomous.sqlite3"
mempath.parent.mkdir(exist_ok=True)
memory=CouncilMemory(mempath)
run_id="studio-"+uuid.uuid4().hex[:12]
model=os.getenv("COUNCIL_MODEL","gpt-4.1-mini")
roles=("producer","researcher","designer","critic","engineer")
ids={role:memory.register(role,model) for role in roles}
feedback=(root/"game_factory"/"TESTER_FEEDBACK.md").read_text()[:9000]
issues=(root/"game_factory"/"RECENT_TESTER_ISSUES.md").read_text()[:14000]
source=(root/"docs"/"preview"/"game.js").read_text()[:23000]
history=(root/"game_factory"/"AUTONOMOUS_REPORT.md")
last=history.read_text()[:2000] if history.exists() else ""
def ask(role,objective,evidence):
    return ask_agent(memory,ids[role],run_id,objective+"\nEVIDENCE:\n"+json.dumps(evidence),
        ["game_factory/RECENT_TESTER_ISSUES.md","docs/preview/game.js"],model=model,max_output_tokens=1600)
context={"tester_feedback":feedback,"issues":issues,"game_js":source,"last_run":last}
results={}
results["producer"]=ask("producer",
    "Select ONE priority job for an independent code editor. Unresolved P0 game-unplayable issues MUST be addressed before new mechanics. Define measurable acceptance checks. Do not give line-by-line edits.",context)
results["researcher"]=ask("researcher",
    "Examine evidence and source; identify reproducible checks and distinguish confirmed facts from hypotheses.",
    {"producer":results["producer"],"source":source})
results["designer"]=ask("designer",
    "Describe expected player-facing behavior, UX and acceptance criteria for selected issue.",
    {"producer":results["producer"],"researcher":results["researcher"]})
results["critic"]=ask("critic",
    "Challenge incorrect assumptions and propose adversarial tests including actual mobile start, timer, touch and browser errors.",
    {"producer":results["producer"],"designer":results["designer"],"tester":feedback})
results["engineer"]=ask("engineer",
    "Design implementation strategy for a CODING AGENT with direct file tools and ability to execute shell tests, not fragile single-line patches. Give a concise plan and rollback strategy.",
    {"producer":results["producer"],"researcher":results["researcher"],"critic":results["critic"],"source":source[:14500]})
report="# Cataclysm autonomous studio plan\n\nRun: "+run_id+"\n\n"
for role,result in results.items():
    report+="## "+role.capitalize()+"\n\n```json\n"+json.dumps(result,ensure_ascii=False,indent=2)+"\n```\n\n"
(root/"game_factory"/"AGENT_PLAN.md").write_text(report)
print("AI Council planned run",run_id,"roles",",".join(roles))
memory.close()

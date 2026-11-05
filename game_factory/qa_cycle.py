"""Evidence-based independent AI QA after browser acceptance succeeds."""
import json, os
from pathlib import Path
from uuid import uuid4
from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory

root=Path(__file__).resolve().parent.parent
memory=CouncilMemory(root/"artifacts"/"autonomous.sqlite3")
model=os.getenv("COUNCIL_MODEL","gpt-4.1-mini")
qa_id=memory.register("qa",model)
producer_id=memory.register("producer",model)
run="studio-qa-"+uuid4().hex[:12]
evidence={
    "plan":(root/"game_factory"/"AGENT_PLAN.md").read_text()[:9000],
    "coder_report":(root/"game_factory"/"CODER_REPORT.md").read_text()[:5000] if (root/"game_factory"/"CODER_REPORT.md").exists() else "Not supplied",
    "browser_evidence":(root/"game_factory"/"QA_RESULTS.txt").read_text()[:6500],
    "human_device_test":"NOT PERFORMED: only simulated mobile Chromium environments were tested"
}
qa=ask_agent(memory,qa_id,run,
 "Evaluate the actual browser acceptance tests, not confidence or untested claims. "
 "Identify whether an ISOLATED PLAYTEST PREVIEW can be published (not a fully certified Samsung release). "
 "Report concrete limitations. Be candid if testing evidence is insufficient.\nEVIDENCE:\n"+json.dumps(evidence),["game_factory/QA_RESULTS.txt","game_factory/AGENT_PLAN.md"],model=model,max_output_tokens=1500)
final=ask_agent(memory,producer_id,run,
 "Summarize delivered changes and choose the next development priority based on real QA. "
 "Do not claim physical Samsung validation or production release.\nEVIDENCE:\n"+json.dumps({"qa":qa,"browser_evidence":evidence["browser_evidence"],"plan":evidence["plan"][:3500]}),["game_factory/QA_RESULTS.txt","game_factory/AGENT_PLAN.md"],model=model,max_output_tokens=1200)
(root/"game_factory"/"AGENT_QA.md").write_text(
 "# Independent AI quality review\n\nRun: "+run+"\n\n"
 "## Executed browser evidence\n\n```\n"+evidence["browser_evidence"]+"\n```\n\n"
 "## QA role\n\n```json\n"+json.dumps(qa,ensure_ascii=False,indent=2)+"\n```\n\n"
 "## Producer handoff\n\n```json\n"+json.dumps(final,ensure_ascii=False,indent=2)+"\n```\n")
print("QA and producer decisions recorded")
memory.close()

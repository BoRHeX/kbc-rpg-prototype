"""Run a REAL BoRHeZ Studio multi-pass production council with preserved free-form model dialogue.

Not a game build and not a workflow change; proposes a documented creator-aligned production contract.
"""
from __future__ import annotations
import concurrent.futures as fut
from pathlib import Path
import datetime, json, os, sys, urllib.request, urllib.error, hashlib
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"game_factory/studio_meetings/2026-11-15-multipass-council"
MODEL=os.getenv("STUDIO_MEETING_MODEL","gpt-4.1-mini")
URL="https://api.openai.com/v1/responses"
ROLES={
 "producer":"Build producer: autonomy, milestones, scope, arbitration and costs",
 "creative_director":"Creative lead: authored worlds and expressive game identity, art debt",
 "game_designer":"Gameplay design: player enjoyment, 1.3 difficulty, incremental vertical slices",
 "illustrator":"Illustrator and image-asset engineer: true raster generation and style coherence",
 "animator":"Sprite animator: motion states and handoff to runtime at actual phone size",
 "audio_director":"Composer/sound designer: tracks, sound assets, audio state synchronization",
 "systems_engineer":"Game engineer: preserving inherited systems and integration contracts",
 "world_designer":"Level designer: 1.4 districts, guardian encounters, illustrated environments",
 "studio_architect":"Workflow architect: GitHub Actions runner isolation, memory, artifact transfer",
 "qa_lead":"Independent QA: honesty, failure evidence, usable broken build, stable rollback",
 "release_engineer":"Build/release engineer: immutable candidate assets, Pages, automation outages",
 "contrarian":"Challenge everyone: runaway costs, infinite passes, bad incentives, unjustified gate removal"
}
def read(path,limit):
 p=ROOT/path
 return p.read_text(encoding="utf8",errors="replace")[:limit] if p.exists() else "[MISSING "+path+"]"
def evidence():
 return {
  "creator_request":read("game_factory/studio_meetings/2026-11-15-multipass-council/CREATOR_BRIEF.md",18000),
  "1_3_implementation_evidence":read("docs/cataclysm-1-3/STUDIO-REPORT.md",11500),
  "studio_charter":read("game_factory/CATACLYSM_STUDIO_CONSTITUTION.md",12500),
  "roadmap_1_4":read("game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md",13000),
  "workflow_history":read(".github/workflows/cataclysm-1-3-playable-first.yml",4500),
  "prior_studio_roadmap":read("game_factory/studio_meetings/2026-11-14-roadmap-council/PROPOSED_ROADMAP.md",4000),
 }
def call(role,round_name,context,max_tokens=2800,structured=False):
 key=os.getenv("OPENAI_API_KEY")
 if not key: raise RuntimeError("OPENAI_API_KEY absent; refusing pretend council")
 role_desc=ROLES.get(role,"Lead council producer")
 inst=("You are ONE independent AI perspective in BoRHeZ Games Studio: "+role+": "+role_desc+
 ". You are not a human and cannot pretend to have personally played the game. "
 "Can write any language/symbols/code/Chinese characters; exact original text preserved. "
 "Candid criticisms are essential. Give decisions, constraints and an unexpectedly useful insight. "
 "Latest creator request controls; avoid claiming tests or tools exist that have not been verified. "
 "The discussion does NOT itself start version 1.4, and cannot change committed user gameplay scope. ")
 if round_name=="opening":
  inst+=("You have no current co-worker speeches. Think independently about replacing one-pass production with "
   "multiple illustrated concept/asset/sprite/integration/polish passes, AND publishing broken development candidates "
   "without damaging stable releases. Talk about YOUR specialty: propose exact outputs, QA failure behavior, "
   "when agents can add work passes, and at least one counterargument. What makes illustrated imagery genuinely possible? "
   "Ground in current Cataclysm 1.3 evidence. UNDER 650 words, free-form, no JSON.")
 elif round_name=="debate":
  inst+=("You are reading the actual opening speeches of your peers. Respond to at least TWO named colleagues, "
    "challenge one and adopt another's good idea. Resolve the tension between always-publish and honest QA. "
    "Propose a concrete 1.4 plan or release/asset risk; allow departments to add useful passes within bounds. "
    "UNDER 520 words, free-form, no JSON.")
 else:
  inst+=("You are the council Producer summarizing ACTUAL independent role utterances and their replies, not inventing consensus. "
    "Produce one VALID JSON OBJECT only, keys: headline, reasoning, release_policy, passes, dynamic_pass_rules, "
    "illustrated_asset_contract, integration_contract, qa_contract, preservation_contract, rollout_plan, "
    "failure_scenarios, genuine_disagreements, owner_approval_boundaries, next_action, autonomous_capabilities. "
    "passes must be a flexible list of 5 to 10 objects. Each pass has keys id, name, goal, accountable_role, "
    "required_inputs, concrete_outputs, evidence, failed_step_handling, add_more_pass_when. "
    "Include concept, real raster illustration asset generation, sprites/animation, systems/game integration, "
    "visual/audio integration, post-integration fixes/QA and always-attempted candidate publication. "
    "Separate stage archives from final candidate snapshots; mark BROKEN/PARTIAL/PLAYABLE/VERIFIED with evidence. "
    "Keep previous stable release intact if new candidate cannot boot; log known defects. "
    "Never assert that GitHub/Pages will publish in an outage. "
    "Every proposed pass MUST have a visible artifact/manifest, and agents may add specialized passes with a finite budget. "
    "Specify actual image-generation access requirement; don't pretend text-only codex automatically paints new sprites. "
    "Producer output should be practical, concise but detailed enough for engineer implementation. "
    "Record genuine disagreements and distinguish creator approval from new council suggestions.")
 fmt={"type":"json_object"} if structured else {"type":"text"}
 data={"model":MODEL,"store":False,"instructions":inst,
       "input":json.dumps(context,ensure_ascii=False),"max_output_tokens":max_tokens,
       "text":{"format":fmt}}
 req=urllib.request.Request(URL,method="POST",data=json.dumps(data).encode(),
      headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
 try:
  with urllib.request.urlopen(req,timeout=180) as resp: result=json.load(resp)
 except urllib.error.HTTPError as e:
  raise RuntimeError(f"{role} HTTP {e.code}: {e.read(350).decode(errors='replace')}") from None
 status=result.get("status")
 fragments=[s.get("text","") for o in result.get("output",[]) if o.get("type")=="message"
      for s in o.get("content",[]) if s.get("type")=="output_text"]
 answer="".join(fragments)
 if status!="completed" or not answer.strip():
  raise RuntimeError(f"{role} {round_name}: {status}; reason {result.get('incomplete_details')}; output chars {len(answer)}")
 reply={"role":role,"phase":round_name,"model":MODEL,"response_id":result.get("id"),
        "verbatim":answer,"usage":result.get("usage"),"status":status}
 if structured:
  policy=json.loads(answer)
  ps=policy.get("passes",[])
  if not isinstance(ps,list) or not 5<=len(ps)<=10: raise ValueError("Producer didn't specify 5-10 real passes")
  required={"id","name","goal","accountable_role","required_inputs","concrete_outputs","evidence","failed_step_handling","add_more_pass_when"}
  for p in ps:
   if not required<=set(p) or any(not str(p.get(k,"")).strip() for k in required):
    raise ValueError("Incomplete producer stage")
  reply["parsed"]=policy
 return reply
def round_calls(label,by_role,tokens):
 ok={};errors={}
 with fut.ThreadPoolExecutor(max_workers=4) as pool:
  pending={pool.submit(call,r,label,ctx,tokens):r for r,ctx in by_role.items()}
  for task in fut.as_completed(pending):
   role=pending[task]
   try:
    ok[role]=task.result()
    print(f"COUNCIL {label} {role}: complete",flush=True)
   except Exception as e:
    errors[role]=str(e)[:600]
    print(f"COUNCIL {label} {role}: {e}",file=sys.stderr,flush=True)
 return {"responses":{r:ok[r] for r in ROLES if r in ok},"errors":errors}
def pretty(value):
 if isinstance(value,str): return value
 if isinstance(value,(list,dict)): return json.dumps(value,ensure_ascii=False,indent=2)
 return str(value)
def write(rec):
 DIR.mkdir(parents=True,exist_ok=True)
 (DIR/"FULL_TRANSCRIPT.json").write_text(json.dumps(rec,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 lines=["# BoRHeZ Studio — production architecture council, 15 November 2026",
 "Real separately invoked AI department positions; this is not a human staff meeting.",
 f"**Opening statements:** {len(rec['opening']['responses'])}; **peer replies:** {len(rec['debate']['responses'])}; **synthesis:** {bool(rec.get('synthesis'))}.",
 "**Purpose:** Multi-pass illustrated game development and preservation of working, rough and broken candidate builds.",
 "Status: council discussion only; no new Cataclysm 1.4 code was executed.",""]
 for phase,header in [("opening","Independent opening positions"),("debate","Actual peer debate")]:
  lines+=["## "+header,""]
  for role,x in rec[phase]["responses"].items():
   lines+=["### "+role.replace("_"," ").title(),"",x["verbatim"],""]
  if rec[phase]["errors"]: lines+=["### Unavailable replies (not fabricated)",pretty(rec[phase]["errors"])]
 if rec.get("synthesis"): lines+=["## Producer synthesis (verbatim JSON)","",rec["synthesis"]["verbatim"]]
 else: lines+=["## Producer synthesis unavailable","This stage did not finish."]
 def clean(t): return "\n".join(line.rstrip() for line in t.splitlines()).rstrip()+"\n"
 (DIR/"FULL_TRANSCRIPT.md").write_text(clean("\n".join(lines)),encoding="utf8")
 if rec.get("synthesis"):
  data=rec["synthesis"]["parsed"]
  (DIR/"MULTIPASS_POLICY.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
  guide=["# BoRHeZ Games Studio — council-proposed multi-pass development architecture",
     "**From actual 15 November 2026 council.** Creator has authorized discussing and dynamically adding production passes; final technical implementation remains separate. This document does not launch 1.4.",
     "## Council recommendation",pretty(data.get("headline")),"",
     "## Reasoning",pretty(data.get("reasoning")),"",
     "## Release policy",pretty(data.get("release_policy")),"",
     "## Evolving pass sequence",""]
  for i,p in enumerate(data["passes"],1):
   guide+=["### "+str(i)+". "+p["name"],"",
    "**Owner:** "+pretty(p["accountable_role"]),
    "**Goal:** "+pretty(p["goal"]),
    "**Inputs:** "+pretty(p["required_inputs"]),
    "**Deliverables:** "+pretty(p["concrete_outputs"]),
    "**Evidence:** "+pretty(p["evidence"]),
    "**On failure:** "+pretty(p["failed_step_handling"]),
    "**When agents add passes:** "+pretty(p["add_more_pass_when"]),""
   ]
  for key in ("dynamic_pass_rules","illustrated_asset_contract","integration_contract","qa_contract",
              "preservation_contract","rollout_plan","failure_scenarios","genuine_disagreements",
              "owner_approval_boundaries","next_action","autonomous_capabilities"):
   guide+=["## "+key.replace("_"," ").title(),pretty(data.get(key)),""]
  guide+=["## Traceability","Full verbatim discussion: [FULL_TRANSCRIPT.md](FULL_TRANSCRIPT.md).",
      "Structured policy: [MULTIPASS_POLICY.json](MULTIPASS_POLICY.json).",
      "New workflows must EXPLICITLY ingest this policy; writing a policy file alone does not change existing CI."]
  (DIR/"MULTIPASS_POLICY.md").write_text(clean("\n".join(guide)),encoding="utf8")
def main():
 packet=evidence()
 opening=round_calls("opening",{r:{"source_context":packet,"role_specialty":spec} for r,spec in ROLES.items()},2900)
 if len(opening["responses"])<10:
  record={"opening":opening,"debate":{"responses":{},"errors":{}},"synthesis":None}
  write(record)
  raise SystemExit("Fewer than 10 independent voices")
 statements={r:x["verbatim"] for r,x in opening["responses"].items()}
 debate=round_calls("debate",{r:{"creator_request":packet["creator_request"],
     "source_1_3":packet["1_3_implementation_evidence"][:4500],
     "your_prior_statement":s,"colleagues_real_statements":statements} for r,s in statements.items()},2450)
 replies={r:x["verbatim"] for r,x in debate["responses"].items()}
 synthesis=None
 if len(replies)>=10:
  summary_input={"creator_commission":packet["creator_request"],
      "1_3_source_evidence":packet["1_3_implementation_evidence"][:6000],
      "opening":{r:s[:1100] for r,s in statements.items()},
      "actual_discussion":{r:s[:1250] for r,s in replies.items()},
      "errors":{"opening":opening["errors"],"debate":debate["errors"]}}
  for budget in [9500,11500]:
   try:
    synthesis=call("producer","synthesis",summary_input,budget,True)
    break
   except Exception as e:
    print("PRODUCER synthesis retry needed: "+str(e),file=sys.stderr,flush=True)
 record={"schema":"borhez.studio.multipass-meeting.v1","run_id":os.getenv("GITHUB_RUN_ID"),
       "created_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
       "source_sha256":hashlib.sha256(json.dumps(packet,sort_keys=True).encode()).hexdigest(),
       "model":MODEL,"roles":ROLES,"opening":opening,"debate":debate,"synthesis":synthesis,
       "did_start_1_4":False,"did_edit_game_source":False}
 write(record)
 if not synthesis: raise SystemExit("No valid producer policy; transcripts preserved")
 print(f"DONE {len(statements)} independent remarks, {len(replies)} real peer responses, "
       f"{len(synthesis['parsed']['passes'])} proposed passes",flush=True)
if __name__=="__main__": main()

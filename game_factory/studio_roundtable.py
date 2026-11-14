"""Real multi-agent BoRHeZ studio meeting. No game implementation."""
import concurrent.futures as futures
import hashlib
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "game_factory/studio_meetings"
ROLES = {
 "producer": "Production strategy, governance and sustainable workload",
 "designer": "Cataclysm and cross-game gameplay design and retention",
 "engineer": "Game systems, interaction between mechanics, performance and saving",
 "studio_architect": "GitHub workflow architecture, durable memory, agent autonomy, costs",
 "art_director": "Original drawn art, styling, city environments and cross-game aesthetics",
 "animator": "Actual character motion and the image-reference animation pipeline",
 "composer": "Original soundtrack, SFX, audio integration and adaptive music",
 "narrative": "Characters, dialogue, humor and authored stories in every game",
 "qa_lead": "Evidence, Samsung touch, browser honesty, playtest regressions",
 "contrarian": "Identify missing assumptions, better alternatives and ignored problems"
}
FILES = {
 "constitution": ("game_factory/CATACLYSM_STUDIO_CONSTITUTION.md", 7200),
 "cataclysm_roadmap": ("game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md", 15500),
 "studio_audit": ("game_factory/STUDIO_AUDIT_2026_11_13.md", 7100),
 "cataclysm_12_report": ("docs/cataclysm-1-2/STUDIO-REPORT.md", 7100),
 "peach_bounce": ("game_factory/results/peach-orbital-guidance-03-pass2.json", 4100),
 "old_roadmap": ("game_factory/CATACLYSM_1_0_ROADMAP.md", 3700),
}
OWNER = (
 "An OPEN-FLOOR meeting requested by BoRHeZ studio creator. Each AI role has "
 "permission to form a candid opinion, criticize studio conditions, disagree "
 "with the roadmap and recommend overlooked or surprising changes. "
 "Discuss Cataclysm, the Flame Game, Peach Bounce and the studio itself. "
 "The latest released Cataclysm candidate is 1.2; 1.3 FELINE COMPANY is unbuilt; "
 "1.4 THE UNSEEN CITY is planned. The owner wants 1.4 soon but requests this "
 "discussion FIRST. Don't start development, pretend to have human feelings, "
 "or invent progress. Keep changes proposals pending creator approval."
)

def read(path, limit):
    p = ROOT / path
    return p.read_text(encoding="utf-8", errors="replace")[:limit] if p.exists() else "[Unavailable: "+path+"]"

def web_doc(url, limit):
    try:
        req=urllib.request.Request(url, headers={"User-Agent":"BoRHeZ-Studio-Meeting"})
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.read(limit).decode("utf-8", errors="replace")
    except Exception as e:
        return "[Cross-game file inaccessible: "+str(type(e).__name__)+"]"

def materials():
    ledger=json.loads(read("game_factory/CATACLYSM_MASTER_LEDGER.json", 160000))
    return {
      "owner_request": OWNER,
      "sources": {name: {"reference":p,"excerpt":read(p,n)} for name,(p,n) in FILES.items()},
      "ledger": {"versions":ledger["versions"],
        "future_features":[{"id":e["id"],"feature":e["feature"]} for e in ledger["requirements"] if e["version"] in ("1.3","1.4","1.5","1.6","1.7","2.0")]},
      "flame_readme":web_doc("https://raw.githubusercontent.com/BoRHeX/flame-game-studio/main/README.md",5100),
      "flame_roadmap":web_doc("https://raw.githubusercontent.com/BoRHeX/flame-game-studio/main/design/roadmap.md",5600),
      "references":["https://github.com/BoRHeX/kbc-rpg-prototype/issues/46",
        "https://github.com/BoRHeX/kbc-rpg-prototype/issues/82",
        "https://github.com/BoRHeX/kbc-rpg-prototype/issues/85",
        "https://github.com/BoRHeX/flame-game-studio"]
    }

def call(role,stage,payload,token_limit):
    key=os.environ.get("OPENAI_API_KEY")
    if not key: raise RuntimeError("No OPENAI_API_KEY; cannot fabricate an agent's opinion")
    model=os.environ.get("STUDIO_MEETING_MODEL","gpt-4.1-mini")
    if stage=="opening":
        prompt=("Give one independently reasoned perspective. JSON keys: position, "
        "best_studio_strength, overlooked_problem, grounded_evidence_reference, "
        "unusual_new_idea, cross_game_synergy, concrete_recommendation, counterargument, "
        "question_for_colleague, take_on_1_3_before_1_4.")
    elif stage=="challenge":
        prompt=("Read real first-round speeches. Name a colleague and directly challenge "
        "one concrete position while recognizing a useful different idea. "
        "JSON keys: challenge_to, challenge, agreement_with, changed_mind_about, "
        "new_unnoticed_insight, proposed_experiment, cross_game_opportunity, "
        "revised_1_3_vs_1_4_sequence, evidence_to_collect.")
    else:
        prompt=("Synthesize actual opinions without fabricating consensus; name real dissent. "
        "JSON keys: central_findings (list), explicit_disagreements (list), "
        "studio_infrastructure_changes (list), cross_game_findings (list), "
        "proposals_for_1_8_and_1_9 (list), 1_3_to_1_4_sequence, "
        "prioritized_actions (list of objects with owner/action/why/prerequisite), "
        "creator_decisions_required (list), unresolved_evidence (list).")
    body={"model":model,
      "instructions":"You are an independently invoked AI role: "+role+" — "+ROLES.get(role,role)+". "
        +"Be specific and independent, allow dissent, distinguish source observation from proposal. "
        +"No fake observations, invented tests or releases. Never claim that you are a human or a living worker. "
        +"Answer all requested fields. Produce valid concise JSON only. "
        +prompt,
      "input":json.dumps({"task":prompt,"evidence_and_actual_remarks":payload},ensure_ascii=False),
      "max_output_tokens":token_limit,"store":False,"text":{"format":{"type":"json_object"}}}
    req=urllib.request.Request("https://api.openai.com/v1/responses",
      data=json.dumps(body).encode(),method="POST",
      headers={"Content-Type":"application/json","Authorization":"Bearer "+key})
    try:
        with urllib.request.urlopen(req,timeout=155) as r: data=json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError("Provider HTTP "+str(e.code)+" "+e.read(260).decode("utf-8","replace")) from None
    if data.get("status")!="completed":
        raise RuntimeError("Model response not complete: "+str(data.get("status")))
    output="".join(part.get("text","") for item in data.get("output",[])
      if item.get("type")=="message" for part in item.get("content",[])
      if part.get("type")=="output_text")
    response=json.loads(output)
    if not isinstance(response,dict): raise RuntimeError("Non-object model reply")
    return {"role":role,"model":model,"response_id":data.get("id"),"statement":response}

def batch(stage,inputs,limit):
    answer={};errors={}
    with futures.ThreadPoolExecutor(max_workers=3) as pool:
        scheduled={pool.submit(call,role,stage,content,limit):role for role,content in inputs.items()}
        for future in futures.as_completed(scheduled):
            role=scheduled[future]
            try:
                answer[role]=future.result()
                print(stage+" "+role+" completed",flush=True)
            except Exception as e:
                errors[role]=str(e)[:500]
                print(stage+" "+role+" ERROR "+str(e)[:200],file=sys.stderr,flush=True)
    return {"responses":{k:answer[k] for k in ROLES if k in answer},"errors":errors}

def fmt(value):
    if isinstance(value,list): return "; ".join(fmt(x) for x in value)
    if isinstance(value,dict): return ", ".join(k+": "+fmt(v) for k,v in value.items())
    return str(value).replace("\n"," ")

def save(record):
    OUT.mkdir(parents=True,exist_ok=True)
    basename="2026-11-14-open-floor"
    (OUT/(basename+".json")).write_text(json.dumps(record,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    lines=["# BoRHeZ Games Studio — independent open-floor meeting",
      "**Held:** 14 November 2026. **GitHub Actions run:** "+os.environ.get("GITHUB_RUN_ID","local"),
      "**Participants:** "+str(len(record["opening"]["responses"]))+" independent AI role calls; "
         +str(len(record["challenge"]["responses"]))+" cross-agent challenge calls.",
      "AI proposals and opinions, not human testimony or accepted game work. "
      +"No Cataclysm or other game source is changed by this meeting.",
      "",
      "## Producer summary — PROPOSED, not creator-approved"]
    if record["synthesis"]:
        for k,v in record["synthesis"]["statement"].items():
            lines.extend(["### "+k.replace("_"," ").title(),fmt(v),""])
    else:
        lines.append("Synthesis failed; original independent speeches below are preserved.")
    for stage,label in [("opening","Opening round — independent opinions"),
                        ("challenge","Challenge round — responding to real colleagues")]:
        lines.extend(["","## "+label])
        for role,reply in record[stage]["responses"].items():
            lines.append("### "+role.replace("_"," ").title())
            for k,v in reply["statement"].items():
                lines.append("- **"+k.replace("_"," ")+":** "+fmt(v))
            lines.append("")
    if record["opening"]["errors"] or record["challenge"]["errors"]:
        lines.extend(["## Participants unavailable","No statements were fabricated:",
          json.dumps({"opening":record["opening"]["errors"],"challenge":record["challenge"]["errors"]},indent=2)])
    lines.extend(["## Decisions and limits",
      "- This is an advisory meeting: no feature commits, releases or autonomous future triggers.",
      "- Cataclysm 1.3 is not evidenced as delivered; 1.4 remains unlaunched.",
      "- Approved roadmap and master feature ledger remain authoritative until the creator updates them.",
      "- Future runs must read this record for proposals, dissent and follow-up evidence.",
      "- Exact attributed model outputs and source packet are preserved in the adjacent JSON file.",""])
    (OUT/(basename+".md")).write_text("\n".join(lines),encoding="utf-8")

def main():
    evidence=materials()
    opening=batch("opening",{r:{"evidence":evidence,"role_focus":focus}
       for r,focus in ROLES.items()},1250)
    if len(opening["responses"])<6:
        raise SystemExit("Fewer than six real responses; cannot claim a meeting")
    statements={r:a["statement"] for r,a in opening["responses"].items()}
    challenges=batch("challenge",{r:{"owner_goal":OWNER,"your_role":focus,
      "first_round_actual_statements":statements}
      for r,focus in ROLES.items() if r in statements},1100)
    summary=None
    try:
        summary=call("producer","synthesis",{"owner_goal":OWNER,
          "openings":statements,
          "challenges":{r:a["statement"] for r,a in challenges["responses"].items()},
          "source_register":evidence["references"]},2100)
    except Exception as e:
        print("Synthesis unavailable: "+str(e),file=sys.stderr,flush=True)
    record={"schema":"borhez.roundtable.v1","held_utc":datetime.now(timezone.utc).isoformat(),
      "run_id":os.environ.get("GITHUB_RUN_ID","local"),
      "evidence":evidence,"opening":opening,"challenge":challenges,"synthesis":summary,
      "source_sha":hashlib.sha256(json.dumps(evidence,sort_keys=True).encode()).hexdigest(),
      "real_agent_calls":len(opening["responses"])+len(challenges["responses"])+int(bool(summary)),
      "creator_has_approved_proposals":False,"game_source_changed":False}
    save(record)
    print("MEETING MINUTES created; calls="+str(record["real_agent_calls"]),flush=True)

if __name__=="__main__":
    main()

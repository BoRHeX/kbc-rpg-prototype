"""BoRHeZ Games Studio: actual multi-model-call Cataclysm version-planning council.

Meeting only: no game commits. Opening speeches are independent free text;
round two uses actual speeches, followed by a detailed structured producer plan.
Unrestricted languages, Unicode, pseudocode, and code excerpts are preserved.
"""
from __future__ import annotations
import concurrent.futures
import hashlib
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"game_factory/studio_meetings/2026-11-14-roadmap-council"
API="https://api.openai.com/v1/responses"
MODEL=os.environ.get("ROADMAP_COUNCIL_MODEL","gpt-4.1-mini")
ORDER=["1.3","1.4","1.5","1.6","1.69","1.7","1.8","1.9"]
ROLES={
  "producer":"Release producer; full 0.1-to-2.0 continuity, gates, dependencies, creator authority",
  "creative_director":"Creative director; 2.0 artistic/gameplay identity, ambitious surprises, honest originality",
  "gameplay_designer":"Roguelite game designer; player agency, risk, replayability, card builds and minute-one experience",
  "combat_balance":"Combat and AI enemy ecology; pressure curves, zombie variety, bosses, solo/squad balance",
  "companion_ai":"Companion systems; 16 cats, eating, personalities, levels, fusion, MECHA CREW and slot accounting",
  "world_designer":"Level/world director; seeded districts, in-run directional cues, fishing, biomes, late-catacombs",
  "systems_engineer":"Core engineer; save/resume, architecture, version integration, 1k nights and performance limits",
  "art_director":"Original illustration director; drawn sprites, characters, environments, UI and cohesive art",
  "animator":"Character animator; actual poses/animation states at Samsung screen scale, drawn fidelity",
  "composer":"Sound and original music director; adaptive scores, sync events, SFX, mix and sonic world",
  "narrative":"Narrative designer; dialogue, world lore, humor, companion identities and memorable discoveries",
  "qa_mobile":"Independent QA and Android UX; measured experience, testability, touch comfort, honest release evidence",
  "studio_architect":"Autonomous production studio engineer; workflow routing, budgets, real agent memory, shared tooling",
  "contrarian":"Independent challenger; find hidden tradeoffs, question scope and offer imaginative alternate paths"
}
MEETING_REQUEST="game_factory/studio_meetings/2026-11-14-roadmap-council/MEETING_REQUEST.md"

def file_excerpt(path,cap):
    p=ROOT/path
    return p.read_text("utf-8",errors="replace")[:cap] if p.is_file() else "[NOT FOUND: "+path+"]"

def remote_excerpt(url,cap):
    try:
        r=urllib.request.Request(url,headers={"User-Agent":"BoRHeZ-Cataclysm-Roadmap-Council/1.0"})
        with urllib.request.urlopen(r,timeout=24) as response:
            return response.read(cap).decode("utf-8",errors="replace")
    except Exception as exc:
        return "[External reference unavailable: "+type(exc).__name__+"]"

def evidence():
    ledger=json.loads(file_excerpt("game_factory/CATACLYSM_MASTER_LEDGER.json",150000))
    past=json.loads(file_excerpt("game_factory/studio_meetings/2026-11-14-open-floor.json",220000))
    summaries={}
    for r,a in past["opening"]["responses"].items():
        p=a.get("statement",{})
        summaries[r]={k:p.get(k,"") for k in
            ("position","overlooked_problem","unusual_new_idea","take_on_1_3_before_1_4")}
    return {
        "creator_commission":file_excerpt(MEETING_REQUEST,14000),
        "authoritative_roadmap":file_excerpt("game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md",24000),
        "master_ledger":{"product_identity":ledger.get("product_identity"),
          "release_order":ledger.get("release_order"),
          "versions":ledger.get("versions"),
          "planned_features":[{"id":a["id"],"version":a["version"],"requirement":a["feature"],
           "status":a["status"]} for a in ledger["requirements"] if a["version"] in ORDER+["2.0"]]},
        "studio_charter":file_excerpt("game_factory/CATACLYSM_STUDIO_CONSTITUTION.md",12000),
        "current_1_2":file_excerpt("docs/cataclysm-1-2/STUDIO-REPORT.md",7000),
        "current_1_2_plan":file_excerpt("docs/cataclysm-1-2/PRODUCTION-PLAN.md",2600),
        "original_roadmap":file_excerpt("game_factory/CATACLYSM_1_0_ROADMAP.md",10000),
        "studio_audit":file_excerpt("game_factory/STUDIO_AUDIT_2026_11_13.md",6200),
        "previous_council_observations":summaries,
        "peach_bounce_recent_history":file_excerpt("game_factory/results/peach-orbital-guidance-03-pass2.json",1900),
        "flame_game_roadmap":remote_excerpt("https://raw.githubusercontent.com/BoRHeX/flame-game-studio/main/design/roadmap.md",4800),
        "source_register":{
          "owner_1_0":"https://github.com/BoRHeX/kbc-rpg-prototype/issues/46",
          "owner_1_1":"https://github.com/BoRHeX/kbc-rpg-prototype/issues/82",
          "owner_1_2":"https://github.com/BoRHeX/kbc-rpg-prototype/issues/85",
          "early_review":"https://github.com/BoRHeX/kbc-rpg-prototype/issues/23",
          "roadmap":"game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md",
          "historical":"game_factory/CATACLYSM_1_0_ROADMAP.md",
          "game_1_2":"docs/cataclysm-1-2/STUDIO-REPORT.md",
          "previous_meeting":"game_factory/studio_meetings/2026-11-14-open-floor.json"
        }
    }

def api_call(role,phase,payload,max_output=1800,json_mode=False):
    key=os.environ.get("OPENAI_API_KEY")
    if not key: raise RuntimeError("Missing OPENAI_API_KEY; cannot pretend agent conversation happened")
    foundation=(
        "You are a separately invoked AI agent representing "+role+": "+ROLES.get(role,role)+". "
        "You are not a human. You may use any language, Unicode (including Chinese), "
        "mathematical symbols, original notation, ASCII graphics, concise pseudocode, "
        "or software code if it helps your design argument. No language or formatting censorship. "
        "Do not use fictional personal memories or claim unverified game builds. "
        "Prioritize REAL integrated changes to the SAME existing Cataclysm, not separate games. "
        "Preserve owner-approved features and mark new ideas PROPOSED. "
        "Be creative, skeptical and specific. Openly disagree when merited."
    )
    if phase=="opening":
        instruction=(
          "This is your INDEPENDENT proposal, before hearing any current colleagues. "
          "Propose how the ONE Cataclysm game can move through EXACTLY eight interim releases "
          "1.3,1.4,1.5,1.6,1.69,1.7,1.8,1.9 and then 2.0. "
          "Even outside your specialty give a coherent path, but go deep in your specialty. "
          "For EACH release suggest at least one tangible player-visible change. "
          "Address mechanics, content, graphics/animation, sound, UI and inheritance. "
          "Say what you would change about the supplied roadmap, what is missing from 2.0, "
          "and one unexpected creative idea nobody is asking for. "
          "1.69 is a creative open slot: pitch an original version identity. "
          "1.8 and 1.9 need concrete proposals, not placeholders. "
          "Risk/cost matters but should not erase the game's fun. "
          "Do not be swayed by the previous council's majority; challenge its reasoning. "
          "In your first round: eight numbered release-specific sentences (one each), "
          "then 2-4 substantive specialty paragraphs and one controversial idea. "
          "Keep the total under 900 words, using free-form text. Do not force JSON."
        )
    elif phase=="debate":
        instruction=(
          "This is Round 2. You are now seeing TRUE direct opening speeches from ALL "
          "colleagues. Debate them: address and quote two identifiable roles, challenge at "
          "least one assumption, adopt at least one good competing idea, and propose a "
          "specific version-to-version tradeoff or improvement. Discuss what should "
          "be built FIRST in 1.3 and what can be explored from 1.4 concurrently. "
          "Offer one integration surprise nobody noticed. If creative, use code, symbols "
          "or Chinese characters naturally. Keep your actual response under 650 words, "
          "write free-form plain text, not JSON."
        )
    else:
        instruction=(
          "You are the final PRODUCER, synthesizing actual opening remarks and challenges, "
          "and the original creator-approved map. Produce one VALID JSON OBJECT with keys "
          "product_identity, major_2_0, overall_architecture, version_order, releases, "
          "dependency_graph, novel_cross_system_opportunities, areas_of_disagreement, "
          "source_evidence_gaps, approvals_needed, immediate_next_steps. "
          "Version_order MUST be exactly ['1.3','1.4','1.5','1.6','1.69','1.7','1.8','1.9']. "
          "Releases MUST be an array of EIGHT objects ordered as above, each with string "
          "fields version, name, signature_player_experience, gameplay_mechanics, "
          "content_and_characters, visual_art_and_animation, music_and_sound, "
          "ui_and_mobile_controls, architecture_and_qa, inherited_systems, "
          "prerequisites_and_handoff, tradeoffs_and_scope, acceptance_demo, approval_status. "
          "Every release must be a meaningful player-visible improvement. "
          "1.69, 1.8, 1.9 specifics are creator-unapproved PROPOSALS. "
          "Distinguish real implemented 1.2 from plans. "
          "Never invent consensus: accurately summarize role disagreements and alternatives. "
          "Provide imaginative but feasible detail about new music/art/content each version. "
          "Explicitly enumerate 2.0 final integration requirements in major_2_0. "
          "Be concise: use short but specific phrases per field; target 2-3 focused "
          "sentences per release field so all 8 release entries fit. "
          "Respond JSON object only. Use clear English for decision usability."
        )
    body={"model":MODEL,"store":False,"instructions":foundation+" "+instruction,
       "input":json.dumps({"stage":phase,"content":payload},ensure_ascii=False),
       "max_output_tokens":max_output,"text":{"format":{"type":"json_object"} if json_mode else {"type":"text"}}}
    request=urllib.request.Request(API,method="POST",
      data=json.dumps(body).encode("utf-8"),
      headers={"Content-Type":"application/json","Authorization":"Bearer "+key})
    try:
        with urllib.request.urlopen(request,timeout=180) as response: result=json.load(response)
    except urllib.error.HTTPError as e:
        msg=e.read(500).decode("utf-8",errors="replace")
        raise RuntimeError("OpenAI HTTP "+str(e.code)+": "+msg) from None
    status=result.get("status")
    if status not in ("completed","incomplete"):
        raise RuntimeError(role+" "+phase+" invalid provider status: "+str(status))
    reason=(result.get("incomplete_details") or {}).get("reason")
    if status=="incomplete" and reason!="max_output_tokens":
        raise RuntimeError(role+" "+phase+" incomplete for non-budget reason: "+str(reason))
    output="".join(piece.get("text","") for message in result.get("output",[])
      if message.get("type")=="message" for piece in message.get("content",[])
      if piece.get("type")=="output_text")
    if not output.strip(): raise RuntimeError(role+" "+phase+" had no visible statement")
    data={"role":role,"stage":phase,"model":MODEL,"provider_response_id":result.get("id"),
          "text":output,"usage":result.get("usage"),
          "verified_complete":status=="completed",
          "truncation_reason":reason if status=="incomplete" else None}
    if json_mode:
        answer=json.loads(output)
        if not isinstance(answer,dict): raise ValueError("Producer did not return an object")
        if answer.get("version_order")!=ORDER:
            raise ValueError("Producer misplaced a Cataclysm version; expected "+str(ORDER))
        releases=answer.get("releases")
        if not isinstance(releases,list) or [x.get("version") for x in releases]!=ORDER:
            raise ValueError("Producer roadmap does not contain all eight versions in sequence")
        for entry in releases:
            for key in ["name","signature_player_experience","gameplay_mechanics",
                 "content_and_characters","visual_art_and_animation","music_and_sound",
                 "ui_and_mobile_controls","architecture_and_qa","inherited_systems",
                 "prerequisites_and_handoff","acceptance_demo","approval_status"]:
                if not str(entry.get(key,"")).strip():
                    raise ValueError("Producer failed feature "+entry["version"]+"."+key)
        data["parsed"]=answer
    return data

def concurrent_round(phase,inputs,max_output):
    results={};errors={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        tasks={pool.submit(api_call,role,phase,value,max_output):role for role,value in inputs.items()}
        for task in concurrent.futures.as_completed(tasks):
            role=tasks[task]
            try:
                results[role]=task.result()
                print("COUNCIL "+phase+" "+role+" complete",flush=True)
            except Exception as error:
                errors[role]=str(error)[:700]
                print("COUNCIL "+phase+" "+role+" failed: "+str(error)[:180],file=sys.stderr,flush=True)
    return {"responses":{k:results[k] for k in ROLES if k in results},"errors":errors}

def phrase(value):
    if isinstance(value,str): return value
    if isinstance(value,list): return "; ".join(phrase(x) for x in value)
    if isinstance(value,dict): return "; ".join(k+": "+phrase(v) for k,v in value.items())
    return str(value)

def report(record):
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"FULL_TRANSCRIPT.json").write_text(
        json.dumps(record,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    discussion=["# CATACLYSM — Second studio meeting: the road from 1.2 to 2.0",
        "**Held:** 14 November 2026. **GitHub run:** "+os.environ.get("GITHUB_RUN_ID","local"),
        "**Purpose:** ONE Cataclysm game, eight cumulative updates and the final 2.0 major release.",
        "**Model:** "+MODEL+". **Independent opening voices:** "+str(len(record["opening"]["responses"]))
          +". **Replies:** "+str(len(record["debate"]["responses"]))+".",
        "**Source status:** these are AI role outputs, not human employee accounts or proven implemented game features.",
        "The adjacent FULL_TRANSCRIPT.json preserves each model's exact Unicode/plain-text response and source evidence.",
        "No new game code or 1.3/1.4 development is authorized by this meeting.", ""]
    for stage,label in [("opening","Round 1 — independent feature proposals"),
                        ("debate","Round 2 — actual dialogue and objections")]:
        discussion.append("## "+label)
        for role,response in record[stage]["responses"].items():
            discussion.extend(["### "+role.replace("_"," ").title(),
                "> " + response["text"].replace("\n","\n> "), ""])
        if record[stage]["errors"]:
            discussion.extend(["### Missing model outputs (not fabricated)",
                "> "+json.dumps(record[stage]["errors"],ensure_ascii=False),""])
    (OUT/"FULL_TRANSCRIPT.md").write_text("\n".join(discussion)+"\n",encoding="utf-8")
    if record.get("producer_roadmap") and record["producer_roadmap"].get("parsed"):
        plan=record["producer_roadmap"]["parsed"]
        (OUT/"PROPOSED_ROADMAP.json").write_text(json.dumps(plan,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        m=["# Cataclysm — Council-proposed roadmap from 1.2 to 2.0",
           "**Status:** advisory proposal, not automatically creator-approved or implemented.",
           "**Product:** "+phrase(plan.get("product_identity","ONE Cataclysm game")),
           "**Eight updates:** "+" → ".join(ORDER)+" → **2.0 THE CATACOMBS**.",
           "",
           "## Council's eight integrated releases"]
        for v in plan["releases"]:
            m.extend(["### "+v["version"]+" — "+v["name"],
              "**Player experience:** "+phrase(v.get("signature_player_experience")),
              "**Mechanics:** "+phrase(v.get("gameplay_mechanics")),
              "**Content/cast:** "+phrase(v.get("content_and_characters")),
              "**Illustration/animation:** "+phrase(v.get("visual_art_and_animation")),
              "**Original music/SFX:** "+phrase(v.get("music_and_sound")),
              "**UI/touch:** "+phrase(v.get("ui_and_mobile_controls")),
              "**Engineering/QA:** "+phrase(v.get("architecture_and_qa")),
              "**Inherited:** "+phrase(v.get("inherited_systems")),
              "**Dependencies / handoff:** "+phrase(v.get("prerequisites_and_handoff")),
              "**Tradeoffs:** "+phrase(v.get("tradeoffs_and_scope")),
              "**Demo:** "+phrase(v.get("acceptance_demo")),
              "**Approval status:** "+phrase(v.get("approval_status")),""])
        for key in ("major_2_0","overall_architecture","dependency_graph",
                    "novel_cross_system_opportunities","areas_of_disagreement",
                    "source_evidence_gaps","approvals_needed","immediate_next_steps"):
            m.extend(["## "+key.replace("_"," ").title(),phrase(plan.get(key)),""])
        m += ["## Interpret with caution","Original creator-approved mechanics in the source roadmap remain authoritative.",
              "The special 1.69 identity and 1.8/1.9 proposals require creator approval.",
              "No actual source was built; studio must check every feature against real code at each version.",
              "Full attributed discussion: [FULL_TRANSCRIPT.md](FULL_TRANSCRIPT.md) and [FULL_TRANSCRIPT.json](FULL_TRANSCRIPT.json)."]
        (OUT/"PROPOSED_ROADMAP.md").write_text("\n\n".join(m)+"\n",encoding="utf-8")
    else:
        (OUT/"PRODUCER_SYNTHESIS_FAILED.md").write_text(
           "Producer synthesis was incomplete or invalid; independent dialogue preserved in FULL_TRANSCRIPT.",
           encoding="utf-8")

def main():
    packet=evidence()
    if packet["master_ledger"]["product_identity"]["count_intermediate"]!=8:
        raise SystemExit("Missing creator's eight-release continuity rule")
    if packet["master_ledger"]["product_identity"]["intermediate_updates"]!=ORDER:
        raise SystemExit("Incorrect explicit 1.69 custom release order")
    opening=concurrent_round("opening",
      {r:{"evidence":packet,"unique_role_mandate":mission} for r,mission in ROLES.items()},3000)
    if len(opening["responses"])<11: raise SystemExit("Too few real independently generated roadmap proposals")
    first={r:v["text"] for r,v in opening["responses"].items()}
    debate=concurrent_round("debate",
      {r:{"creator_request":packet["creator_commission"],
          "your_own_prior_opinion":first[r],
          "all_real_opening_statements":first,
          "your_specialty":mission}
       for r,mission in ROLES.items() if r in first},2400)
    second={r:v["text"] for r,v in debate["responses"].items()}
    if len(second)<10: raise SystemExit("Too few real peer discussions")
    producer=None
    synth_input={
      "creator_brief":packet["creator_commission"],
      "approved_destination":packet["authoritative_roadmap"],
      "source_feature_ledger":packet["master_ledger"],
      "opening_statements":first,
      "real_discussion":second,
      "disagreements_and_missing_voices":{"opening":opening["errors"],"debate":debate["errors"]}}
    try:
        producer=api_call("producer","synthesis",synth_input,9000,True)
        print("PRODUCER eight-update roadmap complete",flush=True)
    except Exception as exc:
        print("PRODUCER synthesis first attempt failed: "+str(exc),file=sys.stderr,flush=True)
        try:
            producer=api_call("producer","synthesis",
              {"creator_brief":packet["creator_commission"],
               "approved_destination":packet["authoritative_roadmap"][:11500],
               "first_round":{r:s[:1050] for r,s in first.items()},
               "debate":{r:s[:850] for r,s in second.items()},
               "error_to_correct":str(exc)},11000,True)
        except Exception as exc2:
            print("PRODUCER synthesis second attempt failed: "+str(exc2),file=sys.stderr,flush=True)
    record={"schema":"borhez.cataclysm.roadmap_council.v1",
       "created_utc":datetime.now(timezone.utc).isoformat(),
       "github_run_id":os.environ.get("GITHUB_RUN_ID","local"),
       "model":MODEL,"evidence":packet,
       "opening":opening,"debate":debate,"producer_roadmap":producer,
       "all_languages_permitted":True,
       "some_opening_or_debate_responses_truncated":any(
            not a["verified_complete"] for a in list(opening["responses"].values())+list(debate["responses"].values())),
       "creator_has_approved_new_mechanics":False,"game_files_modified":False,
       "source_packet_sha256":hashlib.sha256(json.dumps(packet,sort_keys=True).encode()).hexdigest()}
    report(record)
    if producer is None: raise SystemExit("All opinions saved but eight-version synthesis missing")
    print("COMPLETE: "+str(len(first))+" opening and "+str(len(second))+" debate replies; 8 version roadmap",flush=True)

if __name__=="__main__": main()

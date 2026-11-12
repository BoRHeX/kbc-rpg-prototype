"""Five independent AI-studio art reviews; no source edits at this planning stage."""
import json
import os
from pathlib import Path
from game_factory.agent_api import ask_agent
from game_factory.agent_memory import CouncilMemory

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/"artifacts"/"cataclysm-art"
WORK.mkdir(parents=True,exist_ok=True)
REQUEST=(ROOT/"game_factory/requests/cataclysm_art_pass_01.md").read_text()
ANIMATION=(ROOT/"docs/cataclysm-1-0-major/animation.js").read_text()
VISUAL=(ROOT/"docs/cataclysm-1-0-major/visuals.js").read_text()
INDEX=(ROOT/"docs/cataclysm-1-0-major/index.html").read_text()
memory=CouncilMemory(WORK/"memory.sqlite3")
roles=(
 ("producer","Define the deliverable, a game-ready asset catalog, and reject fake/inert artwork."),
 ("designer","Art direct a coherent modern graphic-novel / neon-noir cartoon-cat apocalypse with clear animation and silhouettes."),
 ("researcher","Inspect integration interfaces and identify feasibility, source dependencies and asset/runtime loading risks."),
 ("engineer","Design the sprite/rig/atlas pipeline and actual drawImage integration, minimize frame costs, preserve gameplay contracts."),
 ("critic","Identify ways to accidentally deliver only concept art, broken images, identical silhouettes, or unusable Android frame rates. Specify adversarial acceptance."),
)
run_id="cataclysm-art-"+os.getenv("GITHUB_RUN_ID","local")
model=os.getenv("COUNCIL_MODEL","gpt-4.1-mini")
result={}
try:
 for role,task in roles:
  agent=memory.register(role,model,agent_id="cataclysm.art."+role)
  input_evidence={
    "creator_brief":REQUEST[:6500],
    "other_art_council":{k:v for k,v in result.items()},
    "source_excerpt":(ANIMATION[:3800] if role in ("researcher","engineer") else VISUAL[:1400]),
    "boot":INDEX[-1000:],
  }
  result[role]=ask_agent(memory,agent,run_id,task+"\n"+json.dumps(input_evidence),
      ["game_factory/requests/cataclysm_art_pass_01.md",
       "docs/cataclysm-1-0-major/animation.js",
       "docs/cataclysm-1-0-major/visuals.js"],model=model,max_output_tokens=950,word_limit=320)
  print("Art council:",role,flush=True)
 (WORK/"ART_COUNCIL.json").write_text(json.dumps(result,indent=2))
 lines=["# Cataclysm 1.0 - Art Studio production council",""]
 for role,decision in result.items():
  lines+=["## "+role.capitalize(),"",json.dumps(decision,indent=2),""]
 (WORK/"ART_COUNCIL.md").write_text("\n".join(lines))
finally:
 memory.close()

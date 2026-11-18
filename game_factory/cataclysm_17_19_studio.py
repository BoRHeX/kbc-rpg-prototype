"""BoRHeZ Games Studio: 1.7, 1.8, 1.9 ten-pass asset and candidate controller.

Called from separate isolated GitHub jobs. Never fabricates art or browser evidence.
"""
from __future__ import annotations
import base64, datetime as dt, hashlib, html, json, os, pathlib, shutil, sys, urllib.error, urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
API="https://api.openai.com/v1/images/generations"
IMAGE_MODEL=os.getenv("BORHEZ_IMAGE_MODEL","gpt-image-2.5-flare")
VERSIONS={"1.7":("1.69","THE LONG NIGHT"),
          "1.8":("1.7","DISTILLED ADVANCEMENT"),
          "1.9":("1.8","POLISH & GATING")}
ART_TASKS={
"1.7":[
 ("long_night_chapter_city_atlas","opaque",
  """Genuine illustrated 2D top-down video game environment atlas for a grimly charming cartoon cat versus zombie city survival roguelite: four clear visual chapter biomes in one original detailed painterly square sheet, early abandoned brick coastal district, neon flooding and ivy jungle alleys, violet nocturnal occult streets, midnight burning industrial edges, seamless town roofs and pavement motifs, dynamic atmospheric light and strong readable 64px mobile textures. Regions separated for manual sprite slicing. No letters, labels, UI, borders or screenshots."""),
 ("long_night_ten_chapter_emblems","transparent",
  """A genuinely hand-painted 2D GAME ART ATLAS on full transparent alpha: ten visually diverse, individually recognizable chapter emblems for a ten-chapter, thousand-night cartoon cat-vs-undead marathon: coastline, sewer, market, rooftops, ruins, flooded district, lantern festival, rusty factory, occult cathedral and long-night climax. Ten ornate small glowing medallions cleanly arranged 5 by 2, each separated, centered and suitable for crop/animated UI, with detailed characterful brushes. No words, numbers, captions, watermarks, panels, backgrounds or fonts."""),
 ("long_night_climax_boss_stage","transparent",
  """High-quality original hand-painted 2D top-down mobile game sprite source atlas on full transparent alpha showing four distinct atmospheric night-1000 campaign climax scenes: an endless torchlit gateway, two unique imposing evolved undead feline lieutenants with glowing armor, and a survival squad of illustrated cats in a last-night standoff, four separate figures/props suitable for animated 2D sprites and rewards. Detailed painterly urban fantasy; rich indigo/amber/cyan neon contrast, clear silhouettes at mobile size, full bodies and visual margin, no UI text, watermarks or backgrounds.""")
],
"1.8":[
 ("companion_fusion_evolutions","transparent",
  """A truly hand-painted 2D video game sprite atlas with fully transparent alpha, showing two original fused CAT companions, not just reskinned existing cats: an ANGLER+TRAPPER hybrid carrying a living net turret with mechanical fishing lures and distinctive dual-cat partnership, and a SCOUT+SNIPER hybrid long-range lookout rig with telescopic periscope and visible cat crew. Two action states each: walking/aiming, hooking/launching. Four coherent separated poses in a square 2x2 grid, mobile readability, distinctive bodies, fine painted mechanical details, whimsical expressive feline survival game art, no labels, backgrounds, frame borders or watermarks."""),
 ("weather_city_biome_atlas","opaque",
  """Original richly hand-illustrated top-down mobile game environmental atlas of a ruined cartoon feline city under four real WEATHER CONDITIONS in 2 by 2 separated districts: pounding rain with wet roofs and specular reflections; purple lightning electrical storm; layered pale fog and greenish eerie glow; clear post-storm amber sunshine. Each biome has distinct cover, light pools and puddles reflecting possible gameplay visibility and AI adaptations. Carefully textured painterly source art, readable mobile 48-96px, no text, no UI, no watermark or screenshot frame."""),
 ("companion_mood_missions","transparent",
  """An original painterly 2D mobile game icon and character atlas with fully transparent background: expressive cartoon cats showing curious, worried, determined, excited moods as four separated illustrated character poses; whimsical small illustrated side-mission beacons, scavenger caches, rainy fish and an eerie drone-cat rescue marker. Cohesive well-painted textured Cataclysm game style, rich neon amber cyan indigo, mobile-readable, separated items ready for sprite cropping, no captions, no panels, no watermarks.""")
],
"1.9":[
 ("cataclysm_menu_cover","opaque",
  """Beautiful original vertical-feeling square illustrated GAME TITLE SCREEN artwork for a darkly funny top-down feline-versus-zombie action roguelite nearing a major 2.0 expansion: brave white quadruped cat hero with expressive eyes and independent tail gun, a visible detailed mecha and companion squad in rain-soaked abandoned ruined city, a glowing mysterious stairwell descending into underground darkness as teased destination, moody neon cyan amber violet lighting and mature painted cartoon style. Detailed concept illustration with uncluttered central panel for later UI overlay. NO WORDS, title text, logos, buttons, watermarks or frames."""),
 ("codex_collectibles_atlas","transparent",
  """Real hand-drawn painterly 2D game UI icon atlas on transparent background for illustrated Cataclysm roguelite: separated high-quality tiny portraits/icons of distinct feline companion evolutions, mutant enemy bestiary, bait fish/jackpot mementos, rare boss relic and old weapons—varied distinct shapes and whimsical detail, consistent palette and 40-80px legibility. Organize as separate cells for crop/hover and catalog integration. No glyph/text labels, no words, no borders or watermarks."""),
 ("threshold_trial_arena","opaque",
  """Original rich painterly top-down mobile video game environment atlas for a PRE-CATACOMB Threshold Trial before version 2.0, flooded ruined city street transitioning to stone stairwell and giant ancient underground sealed door, cracked pavement, stair glyphs, torchlit echoing vestibule, narrow tactical alleys and hazard props; true functional illustrated world art, tile-friendly separated sections, neon lavender cyan brass and midnight blue, readable miniature characters and painted edges, no title, UI labels, captions or watermark.""")
]}

def now(): return dt.datetime.now(dt.timezone.utc).isoformat()
def game(version):
 if version not in VERSIONS: raise ValueError("Expected 1.7 / 1.8 / 1.9")
 return ROOT/"docs"/("cataclysm-"+version)
def studio(version):return game(version)/"STUDIO"
def save_json(path,x):
 path=pathlib.Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(x,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
def load_json(path,default=None):
 try:return json.loads(pathlib.Path(path).read_text(encoding="utf8"))
 except (ValueError,OSError): return default
def digest(path):return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()

def setup(version):
 previous=VERSIONS[version][0]
 source=game(previous)
 target=game(version)
 if not (source/"game.js").is_file():raise RuntimeError(f"Missing actual predecessor {source}; refusing a blank game")
 if not (target/"game.js").is_file():
  if target.exists(): shutil.rmtree(target)
  shutil.copytree(source,target)
  shutil.rmtree(target/"STUDIO",ignore_errors=True)
  for name in ["STUDIO-REPORT.md","PRODUCTION-PLAN.md","SOURCE-TRACE.json"]:
   (target/name).unlink(missing_ok=True)
  (target/"STUDIO").mkdir(parents=True,exist_ok=True)
  (target/"STUDIO/BASELINE.json").write_text(json.dumps({"source":str(source.relative_to(ROOT)),
     "source_js_sha256":digest(source/"game.js"),"version":version,"created_utc":now()},indent=2)+"\n",encoding="utf8")
 else:
  (target/"STUDIO").mkdir(parents=True,exist_ok=True)
  print("Restored existing stage source",target)
 print("ONE-GAME 1.7→1.8→1.9; source",source,"target",target)

def artifacts(version):
 d=game(version)
 if not d.is_dir():return {"n_files":0,"bytes":0}
 files=[p for p in d.rglob("*") if p.is_file()]
 return {"n_files":len(files),"bytes":sum(p.stat().st_size for p in files),
         "game_sha256":digest(d/"game.js") if (d/"game.js").exists() else "MISSING"}

def record(pass_id,version,outcome,detail=""):
 d=studio(version);d.mkdir(parents=True,exist_ok=True)
 ledger=load_json(d/"PASS_LEDGER.json",{"version":version,"baseline":VERSIONS[version][0],"runs":[]})
 entry={"pass":int(pass_id),"outcome":outcome,"detail":str(detail)[:700],
        "at_utc":now(),"github_run_id":os.getenv("GITHUB_RUN_ID"),
        "source":artifacts(version)}
 ledger["runs"]=[x for x in ledger["runs"] if x["pass"]!=entry["pass"]]+[entry]
 save_json(d/"PASS_LEDGER.json",ledger)
 print("RECORDED",pass_id,version,outcome,"files=",entry["source"]["n_files"])

def image_call(prompt,bg):
 key=os.getenv("OPENAI_API_KEY")
 if not key:raise RuntimeError("Image API credential missing")
 body={"model":IMAGE_MODEL,"prompt":prompt,"size":"1024x1024",
       "n":1,"quality":"medium","background":bg,"output_format":"png"}
 request=urllib.request.Request(API,method="POST",
     headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"},
     data=json.dumps(body).encode("utf8"))
 try:
  with urllib.request.urlopen(request,timeout=185) as response:
   response_json=json.load(response)
 except urllib.error.HTTPError as error:
  raise RuntimeError(f"Images API HTTP {error.code}: {error.read(550).decode(errors='replace')}") from None
 b64=((response_json.get("data")or [{}])[0]).get("b64_json")
 if not b64:raise RuntimeError("No actual PNG bytes returned by the images API")
 return base64.b64decode(b64,validate=True),response_json.get("usage")

def art(version):
 from PIL import Image
 d=game(version);p=d/"art/generated";p.mkdir(parents=True,exist_ok=True)
 manifest={"version":version,"model":IMAGE_MODEL,"status":"ART-BLOCKED",
  "images":[],"requested":len(ART_TASKS[version]),"created_utc":now(),
  "provenance":"Actual image-generation API PNG byte outputs, not canvas-drawn text model shapes"}
 for name,bg,prompt in ART_TASKS[version]:
  item={"name":name,"background":bg,"prompt":prompt,"status":"FAILED"}
  try:
   raw,usage=image_call(prompt,bg)
   file=p/(name+".png");file.write_bytes(raw)
   with Image.open(file) as im:im.verify()
   with Image.open(file) as im:
    im.load();sz=list(im.size);mode=im.mode
    if bg=="transparent" and im.convert("RGBA").getchannel("A").getextrema()[0]==255:
     raise RuntimeError("Transparency failed: all pixels opaque")
   item.update({"status":"GENERATED","path":str(file.relative_to(d)),"sha256":digest(file),
                "size":sz,"mode":mode,"bytes":len(raw),"usage":usage})
  except Exception as e:item["error"]=str(e)[:560]
  manifest["images"].append(item)
  save_json(studio(version)/"IMAGE_MANIFEST.json",manifest)
 n=sum(x["status"]=="GENERATED" for x in manifest["images"])
 manifest["number_generated"]=n
 manifest["status"]="GENERATED" if n==len(ART_TASKS[version]) else ("PARTIAL" if n else "ART-BLOCKED")
 save_json(studio(version)/"IMAGE_MANIFEST.json",manifest)
 record({"1.7":"03","1.8":"05","1.9":"08"}[version],version,manifest["status"],"Actual API raster image stage")
 print("ART",version,manifest["status"],n,"/",len(ART_TASKS[version]))

def candidate(version):
 d=game(version);s=studio(version);s.mkdir(parents=True,exist_ok=True)
 data=load_json(s/"BROWSER_QA.json",{})
 existing=load_json(s/"CANDIDATE_STATUS.json",{})
 is_verified=bool(data.get("both_orientations_passed",False))
 checked=bool(data.get("checks"))
 flags=[]
 if not (d/"game.js").is_file():flags.append("No real inherited game.js available")
 else:
  source=game(VERSIONS[version][0])/"game.js"
  if source.exists() and digest(source)==digest(d/"game.js"):
   flags.append("Game runtime unchanged from predecessor; new mechanic not proven in actual game.js")
 if not (d/"index.html").is_file() or version not in (d/"index.html").read_text(errors="replace"):
  flags.append("Version identity missing from HTML")
 if not (s/"FINAL_REPORT.md").is_file():flags.append("Final independent QA report missing")
 artdoc=load_json(s/"IMAGE_MANIFEST.json",{})
 if artdoc.get("status")!="GENERATED":flags.append("Original illustrated art incomplete or not generated")
 if (s/"PUBLISH_FALLBACK.txt").exists():flags.append("Source artifact unavailable; predecessor fallback used")
 if is_verified:
  status="PARTIAL" if flags else "PLAYABLE"
 elif checked and any(x.get("passed") is False for x in data.get("checks",[])):
  status="BROKEN"
 else:
  status="UNVERIFIED" # No QA evidence != proven broken source.
 doc={"version":version,"title":VERSIONS[version][1],"status":status,"experimental":True,
      "stable_promotion":False,"producer_run":os.getenv("GITHUB_RUN_ID"),
      "browser":data,"flaws":flags,"art_status":artdoc.get("status","NOT_TESTED"),
      "previous_version":VERSIONS[version][0],"owner_accepted":False,
      "source_evidence":artifacts(version),
      "note":"Only actual browser checks support PLAYABLE. UNVERIFIED is not proof of a crash."}
 save_json(s/"CANDIDATE_STATUS.json",doc)
 location=ROOT/"docs"/("cataclysm-"+version+"-candidate");location.mkdir(parents=True,exist_ok=True)
 issues="".join("<li>"+html.escape(str(x))+"</li>" for x in flags) or "<li>Browser startup passed; full game, marathon and physical-phone performance are not yet verified.</li>"
 # Plain HTML with no claims of completion if only tests are incomplete.
 body=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cataclysm {version}: {html.escape(status)} candidate</title>
<style>body{{max-width:720px;margin:auto;padding:2rem 1rem;background:#08141c;color:#e8e8e7;font:16px/1.6 system-ui}}
a{{color:#8ce7d7}}section{{background:#13232f;padding:1rem;border-radius:12px}}.status{{font-weight:bold;color:#f0b97d}}</style>
<h1>CATACLYSM {version} — {html.escape(VERSIONS[version][1])}</h1>
<p class="status">EXPERIMENTAL / {status}</p>
<p>The continuing one Cataclysm game. This candidate does not replace the last accepted playable version.</p>
<p><a href="../cataclysm-{version}/">Open actual {version} game source</a> · <a href="../cataclysm-{VERSIONS[version][0]}/">Previous version</a></p>
<section><h2>Verification and known limitations</h2><ul>{issues}</ul><p>Browser acceptance: {'passed basic portrait and landscape checks' if is_verified else 'not established'}. No real Samsung hardware acceptance claimed.</p></section>
<p><a href="../cataclysm-{version}/STUDIO/FINAL_REPORT.md">Developer report</a> · <a href="../cataclysm-{version}/STUDIO/CANDIDATE_STATUS.json">Evidence JSON</a> · <a href="../cataclysm-{version}/STUDIO/IMAGE_MANIFEST.json">Original art</a></p>
<p>GitHub run {html.escape(str(os.getenv('GITHUB_RUN_ID','unknown')))}. Roadmap continues to 2.0, not reached by 1.9.</p></html>'''
 (location/"index.html").write_text(body,encoding="utf8")
 print("EXPERIMENTAL",version,status,"issues",flags)
 return doc

def cli():
 if len(sys.argv)<2:raise SystemExit("setup|art|record|candidate")
 cmd=sys.argv[1]
 if cmd=="setup":setup(sys.argv[2])
 elif cmd=="art":
  try:art(sys.argv[2])
  except Exception as e:
   save_json(studio(sys.argv[2])/"IMAGE_MANIFEST.json",
       {"version":sys.argv[2],"status":"ART-BLOCKED","error":str(e)[:1000],"images":[]})
   record({"1.7":"03","1.8":"05","1.9":"08"}[sys.argv[2]],sys.argv[2],"ART-BLOCKED",str(e))
   print("ART BLOCKED",e,file=sys.stderr)
 elif cmd=="record":record(sys.argv[2],sys.argv[3],sys.argv[4],
                           sys.argv[5] if len(sys.argv)>5 else "")
 elif cmd=="candidate":candidate(sys.argv[2])
 else:raise SystemExit("Unknown studio command: "+cmd)
if __name__=="__main__":cli()

"""BoRHeZ multipass Cataclysm 1.5 production runtime.

No illusions about image availability, QA, or publication: store verifiable
assets and status manifests. Used by separate ephemeral GitHub Action jobs.
"""
from __future__ import annotations

import base64
import datetime
import hashlib
import html
import json
import os
from pathlib import Path
import sys
import traceback
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "docs/cataclysm-1-5"
STUDIO = GAME / "STUDIO"
ART = GAME / "art/generated"
MODEL = os.getenv("BORHEZ_IMAGE_MODEL", "gpt-image-2.5-flare")
MAX_IMAGES = 3
IMAGE_API = "https://api.openai.com/v1/images/generations"
PASS_LABELS = {
    "01": "Concept and asset design",
    "02": "Original raster illustration",
    "03": "Sprite animation and music/SFX",
    "04": "Mechanics and art integration",
    "05": "Gameplay polish and independent QA",
    "06": "Optional repair / art or game integration",
    "07": "Optional second repair / review",
    "08": "Optional final recovery and QA",
}

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf8")

def read_json(path, fallback=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf8"))
    except (OSError, json.JSONDecodeError, TypeError):
        return fallback

def sha(path):
    digest=hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            digest.update(chunk)
    return digest.hexdigest()

def stage_files():
    if not GAME.is_dir():
        return []
    return [{"path":str(p.relative_to(GAME)),
             "bytes":p.stat().st_size,
             "sha256":sha(p)}
            for p in GAME.rglob("*") if p.is_file()
            and not p.name.endswith(".log")][:450]

def record(stage, outcome, details=""):
    STUDIO.mkdir(parents=True,exist_ok=True)
    doc=read_json(STUDIO/"PASS_LEDGER.json",{"version":"1.5",
       "one_game":"Cataclysm","baseline":"docs/cataclysm-1-4",
       "runs":[]})
    snapshot={
      "pass":str(stage).zfill(2),
      "name":PASS_LABELS.get(str(stage).zfill(2), "Additional pass"),
      "outcome":str(outcome),
      "details":details[:1200],
      "timestamp_utc":now(),
      "github_run_id":os.getenv("GITHUB_RUN_ID"),
      "sha":hashlib.sha256(json.dumps(stage_files(),sort_keys=True).encode()).hexdigest(),
      "file_count":len(stage_files()),
      "notes":"Pass outputs archived independently. Failed work is never discarded."}
    doc["runs"]=[x for x in doc.get("runs",[]) if x["pass"]!=snapshot["pass"]]+[snapshot]
    write_json(STUDIO/"PASS_LEDGER.json",doc)
    print(f"STUDIO PASS {stage}: {outcome} | {snapshot['file_count']} files")

BRIEFS=[
 ("fishing_pond_world_atlas","opaque",
  """Genuinely illustrated hand-painted TOP-DOWN mobile roguelite urban fishing location atlas, dark colorful flooded city in ruins. Multiple beautifully distinct usable tile-art environments: old flooded canal with quay, drainage pond, bright puddles in abandoned road, sewer grate with clear water, fishing spots with ripples, docked tiny skiff, cracked concrete and moss. Cozy and sinister cats versus undead mood. Painterly texture, readable 48px mobile composition, matching neon turquoise indigo and warm amber highlights of Cataclysm 1.5. Square packed sheet with clear separations. No letters, GUI, labels, captions or watermark. Real image art for game textures, not code shapes."""),
 ("fishing_cat_gear_atlas","transparent",
  """Original charming illustrated 2D TOP DOWN/three-quarter game sprite atlas on FULLY TRANSPARENT alpha, for a dark colorful mobile cat zombie-survival game. A small white four-legged cat fishing with a tiny improvised rod, line and hook, and independent detailed equipment illustrations: basic repaired rod, rare glowing fishbone hook, worm bait, royal green catnip bait, cast and reel poses, wet net full of cartoon fish, exaggerated jackpot shining treasure chest. Actual painted expressive character poses and intricate equipment, separated clearly in neat visual cells, room around each, no text, no borders, no backgrounds, no watermarks. Style feels hand illustrated rather than primitive boxes and circles."""),
 ("abyssal_catch_mutant_atlas","transparent",
  """Real illustrated painterly 2D sprite sheet, FULLY TRANSPARENT alpha: legendary giant terrifying but funny MUTANT ZOMBIE FISH monster from abandoned city sewer, with glowing cyan eyes, ancient bone hook in jaws, green algae armor, oversized fins, and zombie-cat whiskers, shown in four DISTINCT full-body poses (lurking, hooked, lunging attack, stunned/defeated) arranged in 2x2 regions with generous separation. Strong mobile readable silhouette, painterly brush textures, dramatic dark turquoise gold-magenta accents. Suitable for top down cartoon-cat roguelite. NO letters, labels, background, decorative UI, frame lines or watermarks.""")
]
def call_image(prompt, background):
    token=os.getenv("OPENAI_API_KEY","")
    if not token:
        raise RuntimeError("OPENAI_API_KEY missing. Image rendering unavailable.")
    body={"model":MODEL,"prompt":prompt,"n":1,"size":"1024x1024",
          "quality":"medium","output_format":"png","background":background}
    req=urllib.request.Request(IMAGE_API,
         data=json.dumps(body).encode("utf8"),method="POST",
         headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=190) as response:
            payload=json.load(response)
    except urllib.error.HTTPError as e:
        text=e.read(1300).decode("utf8",errors="replace")
        raise RuntimeError(f"Image model HTTP {e.code}: {text}") from None
    raw=(payload.get("data") or [{}])[0].get("b64_json")
    if not raw:
        raise RuntimeError("Image API responded without a generated image.")
    return base64.b64decode(raw,validate=True),payload.get("usage")

def art():
    from PIL import Image
    ART.mkdir(parents=True,exist_ok=True)
    STUDIO.mkdir(parents=True,exist_ok=True)
    manifest={"producer":"OpenAI Images API (real binary output)",
       "model":MODEL,"requested_max_images":MAX_IMAGES,
       "made_at_utc":now(),"images":[],"errors":[],"status":"ART-BLOCKED",
       "illustrated_asset_evidence":"Generated base64 PNG, validated PNG dimensions, file hash and alpha coverage; not procedural canvas shapes."}
    # No Codex model may mark original art completed without these files.
    for name,bg,prompt in BRIEFS[:MAX_IMAGES]:
        item={"name":name,"background":bg,
              "prompt":prompt,"model":MODEL,"kind":"generated-original-illustration"}
        try:
            image_bytes,usage=call_image(prompt,bg)
            path=ART/(name+".png")
            path.write_bytes(image_bytes)
            with Image.open(path) as im:
                im.verify()
            with Image.open(path) as im:
                im.load()
                item.update({"mode":im.mode,"size":list(im.size)})
                if bg=="transparent":
                    rgba=im.convert("RGBA")
                    alpha=rgba.getchannel("A")
                    item["has_alpha_channel"]= "A" in im.getbands()
                    item["alpha_extrema"]=list(alpha.getextrema())
                    if alpha.getextrema()[0]==255:
                        raise ValueError("Transparency requested but all pixels are opaque.")
            item.update({"path":str(path.relative_to(GAME)),
                         "bytes":len(image_bytes),"sha256":sha(path),
                         "usage":usage,"status":"GENERATED"})
        except Exception as err:
            # Keep previous originals and do not fabricate successful art.
            item.update({"status":"FAILED","error":str(err)[:550]})
            manifest["errors"].append({"asset":name,"error":str(err)[:550]})
        manifest["images"].append(item)
        write_json(STUDIO/"IMAGE_MANIFEST.json",manifest)
    made=sum(x["status"]=="GENERATED" for x in manifest["images"])
    manifest["status"]="GENERATED" if made==len(BRIEFS) else ("PARTIAL" if made else "ART-BLOCKED")
    manifest["number_generated"]=made
    write_json(STUDIO/"IMAGE_MANIFEST.json",manifest)
    (STUDIO/"ART_DELIVERY.md").write_text(
        "# REAL ILLUSTRATION PASS\n\n"
        f"Model: {MODEL}. Valid generated images: {made}/{len(BRIEFS)}. "
        f"Status: **{manifest['status']}**.\n\n"
        "Illustration outputs reside in art/generated/. They are source atlases, "
        "not automatically animation-ready sheets. Integrator must explicitly load "
        "the actual PNGs. Missing images may not be replaced with geometry and then "
        "called illustrated assets. Every failed API call is recorded in IMAGE_MANIFEST.json.\n",
        encoding="utf8")
    record("02",manifest["status"],"Direct image API output; see STUDIO/IMAGE_MANIFEST.json")
    print("ART RESULT",manifest["status"],made)

def result():
    browser=read_json(STUDIO/"BROWSER_QA.json",{})
    images=read_json(STUDIO/"IMAGE_MANIFEST.json",{})
    stages=read_json(STUDIO/"PASS_LEDGER.json",{})
    flags=[]
    old=ROOT/"docs/cataclysm-1-4/game.js"
    new=GAME/"game.js"
    if not new.is_file() or new.stat().st_size<1000:
        flags.append("Missing active 1.5 game.js")
    if new.is_file() and old.is_file() and sha(new)==sha(old):
        flags.append("1.5 game.js identical to 1.4: no implemented mechanics")
    idx=GAME/"index.html"
    if not idx.is_file() or "1.5" not in idx.read_text(encoding="utf8",errors="replace"):
        flags.append("No 1.5 identity in game index")
    produced=[x for x in images.get("images",[]) if x.get("status")=="GENERATED"]
    if not produced:
        flags.append("No original raster art produced (ART-BLOCKED)")
    if produced:
        js_text=" ".join(p.read_text(encoding="utf8",errors="replace") for p in GAME.glob("*.js"))
        html_text=idx.read_text(encoding="utf8",errors="replace") if idx.is_file() else ""
        # The game loads DERIVED sprites via art/animated/ rather than naming original
        # art/generated source atlases. Check runtime adapters AND generated descendants.
        derived=(GAME/"art/animated")
        actual_derived=[p for p in derived.glob("*") if p.is_file() and ("fish" in p.name.lower() or "bait" in p.name.lower() or "catch" in p.name.lower())] if derived.exists() else []
        if not actual_derived or not ("art/animated/" in (js_text+html_text) and "fish" in (js_text+html_text).lower()):
            flags.append("Illustration integration unverified: no referenced fishing sprite derivatives found")
    if not (STUDIO/"FINAL_REPORT.md").is_file():
        flags.append("Studio final implementation report missing")
    boots=bool(browser.get("both_orientations_passed",False))
    if not boots:
        flags.append("Browser launch/nonblank gate did not pass both orientations")
    if not boots:
        status="BROKEN"
    elif flags:
        status="PARTIAL"
    else:
        status="PLAYABLE"
    doc={"version":"1.5","major_title":"HOOK, LINE & CATNIP",
      "status":status,"experimental":True,"stable_promotion":False,
      "previous_playtested":"cataclysm-1-4","last_prior_stable":"cataclysm-1-3","created_at":now(),
      "run":os.getenv("GITHUB_RUN_ID"),"browser":browser,
      "art_status":images.get("status","UNKNOWN"),
      "flaws":flags,"pass_count":len(stages.get("runs",[])),
      "owner_playtest_required":True,
      "note":"Candidate retained whether playable or broken; never a verified Samsung test."}
    write_json(STUDIO/"CANDIDATE_STATUS.json",doc)
    print("CANDIDATE STATUS",status,flags)
    return doc

def candidate_page():
    doc=result()
    destination=ROOT/"docs/cataclysm-1-5-candidate"
    destination.mkdir(parents=True,exist_ok=True)
    status=html.escape(doc["status"])
    issues="".join(f"<li>{html.escape(str(x))}</li>" for x in doc["flaws"]) or "<li>Basic browser start passed; full mobile gameplay acceptance remains pending.</li>"
    page=f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Cataclysm 1.5 — {status} experimental build</title>
    <style>body{{margin:auto;padding:2rem 1rem;max-width:45rem;background:#071821;color:#e7f2ee;font:16px/1.65 system-ui}}
    a{{color:#73d9cc}}.pill{{border:1px solid #debd78;border-radius:20px;padding:4px 12px;display:inline-block}}
    section{{padding:1rem;background:#0e2730;border:1px solid #234e55;border-radius:12px}}</style>
    <h1>CATACLYSM 1.5 · HOOK, LINE & CATNIP</h1>
    <p class="pill">EXPERIMENTAL — {status}</p><p>This is the evolving single Cataclysm game.
    Failed tests do not delete the build. This candidate has not replaced the previous 1.4 build.</p>
    <p><a href="../cataclysm-1-5/">Open the actual 1.5 candidate game</a></p>
    <p><a href="../cataclysm-1-4/">Play previous 1.4 candidate</a></p><p><a href="../cataclysm-1-3/">Earlier 1.3 rollback</a></p>
    <section><h2>Known limitations</h2><ul>{issues}</ul></section>
    <p><a href="../cataclysm-1-5/STUDIO/FINAL_REPORT.md">Development report</a> ·
    <a href="../cataclysm-1-5/STUDIO/CANDIDATE_STATUS.json">Machine-readable QA status</a> ·
    <a href="../cataclysm-1-5/STUDIO/IMAGE_MANIFEST.json">Real illustration evidence</a></p>
    <p>Run {html.escape(str(doc['run']))}. Previous versions remain untouched; this candidate is not stable.</p>
    </html>"""
    (destination/"index.html").write_text(page,encoding="utf8")
    return doc

def request_extra(stage):
    # A stage can autonomously request repairs by producing EXTRA_PASS_REQUEST.json.
    # A broken Chrome build is also justification for at least one retry.
    qa=read_json(STUDIO/"BROWSER_QA.json",{})
    req=read_json(STUDIO/"EXTRA_PASS_REQUEST.json",{})
    if req.get("request") is False:
        needed=False
    else:
        needed=(not qa.get("both_orientations_passed",False)
                or bool(req.get("request",False)))
    # Cap is enforced by caller to three total. No loops/repeated paid calls.
    reason=req.get("reason","Browser crash or explicit specialist repair request")
    return {"needs_extra":needed,"reason":reason[:240]}

def cli():
    if len(sys.argv)<2:
        raise SystemExit("Use art | record STAGE OUTCOME | candidate | extra")
    cmd=sys.argv[1]
    if cmd=="art":
        try: art()
        except Exception as exc:
            STUDIO.mkdir(parents=True,exist_ok=True)
            write_json(STUDIO/"IMAGE_MANIFEST.json",{"status":"ART-BLOCKED",
                     "errors":[{"error":str(exc)[:700]}],"images":[]})
            record("02","ART-BLOCKED",str(exc))
            print("ART BLOCKED",str(exc),file=sys.stderr)
    elif cmd=="record":
        record(sys.argv[2],sys.argv[3],
               sys.argv[4] if len(sys.argv)>4 else "")
    elif cmd=="candidate":
        candidate_page()
    elif cmd=="extra":
        print(json.dumps(request_extra(sys.argv[2] if len(sys.argv)>2 else "05")))
    else:
        raise SystemExit("Unknown command "+cmd)
if __name__=="__main__":
    cli()

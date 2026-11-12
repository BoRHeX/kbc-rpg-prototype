"""Texture-first Cataclysm 1.0 art production on a trusted Actions runner.

Existing image model API is called ONLY from a trusted runner with the studio's
configured secret. The coding sandbox receives no secrets and cannot gate art
production on an unavailable built-in image tool.
"""
from __future__ import annotations

import base64
import concurrent.futures as futures
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import subprocess
import time

from openai import OpenAI
from PIL import Image, ImageDraw, ImageOps

from game_factory.reference_animator import normalize_frames, atlas, model_json

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "docs/cataclysm-1-0-major/art"
EVIDENCE = ROOT / "artifacts/cataclysm-art"
MODEL = os.environ.get("STUDIO_IMAGE_MODEL", "gpt-image-2.6-flare")
STATIC_MODEL = os.environ.get("STUDIO_ANCHOR_MODEL", "gpt-image-2.6-sunburst")
ALLIES = ("shooter", "healer", "tank", "brawler", "sniper", "engineer", "trapper", "bard")
GROUND = ("rain-slick cobblestone and damp harbor", "cracked overgrown alley asphalt", 
          "scorched ember-strewn street", "abandoned violet neon district")
PROPS = {"building": "damaged multistory apartment facade with shattered windows and neon",
         "car": "abandoned dented urban car with cracked glass",
         "dumpster": "heavy rusty industrial dumpster with ripped stickers and bent lid"}

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inventory() -> dict[str, str]:
    return {str(p.relative_to(ART)): digest(p) for p in sorted(ART.rglob("*")) if p.is_file()}

def catalog() -> dict:
    raw = subprocess.check_output(["node", "-e",
        "console.log(JSON.stringify(require('./docs/cataclysm-1-0-major/campaign.js').catalog))"],
        cwd=ROOT, text=True)
    return json.loads(raw)

def reference_for_actor(name: str) -> bytes:
    # Existing atlas is an identity reference ONLY; new art is painted, not filtered.
    source = ART / (name + "-run.png")
    with Image.open(source) as raw:
        img = raw.convert("RGBA").crop((0,0,96,96))
    canvas = Image.new("RGBA", (384,384), (250,250,250,255))
    img = img.resize((354,354), Image.Resampling.NEAREST)
    canvas.alpha_composite(img, (15,15))
    out = BytesIO()
    canvas.convert("RGB").save(out, "PNG")
    return out.getvalue()

def gif_to_atlas(blob: bytes, count: int) -> bytes:
    frames = normalize_frames(blob)
    if len(frames) != count:
        raise ValueError(f"Image model delivered {len(frames)} frames; expected {count}")
    # Ensure distinct silhouette/body poses, not palette flicker or 2 repeated flips.
    masks = []
    for frame in frames:
        a = frame.getchannel("A").resize((24,24), Image.Resampling.NEAREST)
        masks.append(hashlib.sha256(a.tobytes()).hexdigest())
    if len(set(masks)) < max(4, count // 2):
        raise ValueError("Insufficient independently posed silhouette frames")
    return atlas(frames)

def generate_actor(name: str, tier: str, frames: int) -> tuple[str, bytes, str]:
    client = OpenAI(timeout=240, max_retries=1)
    subject = (
        "living friendly anthropomorphic CAT ally, distinct readable profession "
        + name.upper() + ", authentic role equipment and equipment motion, expressive face, "
        "recognizable ears, muzzle, fur, tail and articulate walking legs"
        if tier == "ally" else
        "hostile fantasy ZOMBIE CAT creature, " + tier.upper() + " tier named " + name.upper()
        + ", visibly undead feline ears, muzzle, paws, eyes and tail, asymmetrical deterioration, "
        "tier-specific mutations and silhouette, broken armor or other distinctive anatomy"
    )
    prompt = (
        "Repaint and ANIMATE exactly ONE original illustrated 2D game character, "
        "using the attached first frame ONLY to identify its role and silhouette. "
        "This is NOT a request for vector shapes, game-code polygons, procedural "
        "circles, generic humanoids or a collage. Paint real fur, cloth, metal, "
        "layered inking, shaded body volumes, expression and costume as a coherent "
        "premium indie 2D sprite. Keep the character fully inside each frame, "
        "face roughly 3/4 forward with the same fixed camera, centered feet at "
        "a consistent floor-height, and a clean legible outline at 64px display size. "
        "ACTOR: " + subject + ". The action is a seamless looping " + str(frames)
        + "-pose walk/run/idle acting study, with alternation of leg contact, knee bend, "
        "head/body counter-motion, arms and tail following with different timing. "
        "Each adjacent frame must have genuinely different physical acting; no "
        "mirror-flipping one pose, hue cycles or camera moves. Preserve identifying "
        "features from frame to frame. ONE character per frame and no others. "
        "Pure solid chroma green #00FF00 background for automatic transparent extraction, "
        "no scenery, ground, shadow plane, lettering, labels, panel frames or text. "
        "Use the reference for identity; substantially improve its PAINTED quality."
    )
    last = None
    for attempt in range(2):
        try:
            with BytesIO(reference_for_actor(name)) as ref:
                ref.name = name + "-reference.png"
                result = client.images.edit(
                    model=MODEL, image=ref, prompt=prompt, size="512x512",
                    output_format="gif", frame_count=frames, frame_duration_ms=150,
                    quality="medium")
            data = base64.b64decode(result.data[0].b64_json)
            return name, gif_to_atlas(data, frames), tier
        except Exception as exc:
            last = exc
            print(f"ART RETRY {name} {attempt+1}: {str(exc)[:240]}", flush=True)
            time.sleep(4 * (attempt+1))
    raise RuntimeError(f"Failed to render {name}: {last}")

def static_reference(source: Path) -> bytes:
    with Image.open(source) as raw:
        img = raw.convert("RGBA")
    # Only original first tile of the source, no multiple scattered frames.
    img.thumbnail((768,768), Image.Resampling.LANCZOS)
    rgb = Image.new("RGB", img.size, "#6a727e")
    rgb.paste(img, mask=img.getchannel("A"))
    buf=BytesIO();rgb.save(buf,"PNG");return buf.getvalue()

def generate_environment(name: str, description: str, size: int, ground: bool) -> tuple[str, bytes]:
    client = OpenAI(timeout=240, max_retries=1)
    prompt = (
        "Paint a single original illustrated 2D top-down MOBILE GAME TEXTURE in "
        "the Cataclysm illustrated neon-noir cat apocalypse art style. "
        "Real intentional painted materials and brush texture, cracks, moss, "
        "uneven illumination, controlled shadows and readability, not CSS or vector "
        "geometry. Subject: " + description + ". "
        + ("Seamless square TILING GROUND surface, top-down, no character, "
           "no perspective horizon, restrained contrast for character visibility. "
           if ground else
           "Exactly ONE complete isolated environmental PROP viewed from above "
           "in 3/4 view, centered against ONE flat PURE CHROMA GREEN #00FF00 background "
           "so the green can be deleted to transparent alpha; no labels. ")
        + "Original unlicensed indie-game illustration, no text, letters or logos."
    )
    source = ART / name
    with BytesIO(static_reference(source)) as ref:
        ref.name="reference.png"
        result=client.images.edit(model=STATIC_MODEL, image=ref, prompt=prompt,
                                  output_format="png", size="1024x1024", quality="medium")
    data=base64.b64decode(result.data[0].b64_json)
    with Image.open(BytesIO(data)) as raw:
        img=raw.convert("RGBA")
    # Ground is opaque and safe; props retain existing alpha if model supplies it.
    # The source shape is intentionally not expanded beyond existing draw bounds.
    img=ImageOps.fit(img, (size,size), method=Image.Resampling.LANCZOS)
    if not ground:
        # Preserve the model's intended subject with an alpha matte; do not paint a
        # new geometry proxy. Background removal uses edge-connected color only.
        from game_factory.reference_animator import remove_uniform_background
        img=remove_uniform_background(img)
        if img.getchannel("A").getextrema()[0] >= 245:
            raise ValueError("Environmental prop has an opaque unremovable background: "+name)
    out=BytesIO();img.save(out,"PNG",optimize=True)
    return name,out.getvalue()

def contact_sheet(names: list[str], target: Path) -> None:
    # Exactly the PNG files the runtime will decode; not a separate concept render.
    w=8*112; h=((len(names)+7)//8)*132
    sheet=Image.new("RGB", (w,max(h,132)), "#1b2536")
    d=ImageDraw.Draw(sheet)
    for i,name in enumerate(names):
        with Image.open(ART/(name+"-run.png")) as raw:
            img=raw.convert("RGBA").crop((0,0,96,96)).resize((100,100),Image.Resampling.NEAREST)
        x=(i%8)*112+6;y=(i//8)*132+6
        sheet.paste(img,(x,y),img)
        d.text((x,y+103),name[:15],fill="#eceeee")
    sheet.save(target)

def main() -> None:
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("The trusted art production job requires existing OPENAI_API_KEY secret")
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    before=inventory()
    (EVIDENCE/"sha256-before.json").write_text(json.dumps(before,indent=2))
    existing_manifest = before.get("character-animations.json")
    hero_original = {k:v for k,v in before.items() if k.startswith("hero-") or k.startswith("characters/hero/")}
    groups=catalog()
    enemies=[(entry["id"],tier) for tier in ("normal","bosses","elites","superElites")
             for entry in groups.get(tier, [])]
    if len(enemies)!=27 or len(set(n for n,_ in enemies))!=27:
        # Common catalogue key is 'normals'; inspect the actual catalog if changed.
        raise RuntimeError("Unexpected enemy catalogue shape: "+str([(k,len(v)) for k,v in groups.items()]))
    actors=[(name,"ally",12) for name in ALLIES]+[(name,tier,6) for name,tier in enemies]
    print("Trusted image studio painting",len(actors),"characters", flush=True)
    failures={}
    staged={}
    with futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(generate_actor,*spec):spec[0] for spec in actors}
        for job in futures.as_completed(jobs):
            name=jobs[job]
            try:
                key,png,tier=job.result()
                staged[key+"-run.png"]=png
                (EVIDENCE/("candidate-"+key+".png")).write_bytes(png)
                with (EVIDENCE/"log.txt").open("a") as log:
                    log.write(key+" "+tier+" generated\n")
                print("Painted:",key,tier,flush=True)
            except Exception as exc:
                failures[name]=str(exc)[:350]
                print("Generation rejected:",name,failures[name],flush=True)
    if failures:
        (EVIDENCE/"image-failures.json").write_text(json.dumps(failures,indent=2))
        raise RuntimeError("Not every Cataclysm actor could be painted. No new art published.")
    for name,idx in [("ground-"+str(i)+".png",i) for i in range(4)]:
        key,png=generate_environment(name,GROUND[idx],300,True)
        staged[key]=png
        (EVIDENCE/("candidate-"+key)).write_bytes(png)
    for key,description in PROPS.items():
        name="prop-"+key+".png"
        staged[name]=generate_environment(name,description,288,False)[1]
        (EVIDENCE/("candidate-"+name)).write_bytes(staged[name])
    # The painter wrote all 42 new images. Validate against source and commit
    # atomically only after each generated image exists.
    for name,png in staged.items():
        with Image.open(BytesIO(png)) as im:
            im.verify()
        if hashlib.sha256(png).hexdigest()==before.get(name):
            raise RuntimeError("No visual change to "+name)
    for name,png in staged.items():
        (ART/name).write_bytes(png)
    after=inventory()
    assert after.get("character-animations.json")==existing_manifest
    assert all(after.get(k)==v for k,v in hero_original.items()),"Approved hero changed"
    assert len(staged)==42, "Expected 35 actor atlases + 7 environment images"
    (EVIDENCE/"sha256-after.json").write_text(json.dumps(after,indent=2))
    (EVIDENCE/"changed-art.json").write_text(json.dumps(sorted(staged),indent=2))
    contact_sheet(list(ALLIES), EVIDENCE/"new-companions.png")
    contact_sheet([n for n,_ in enemies], EVIDENCE/"new-horde.png")
    print(f"PAINTING COMPLETE: {len(staged)} actual images, hero untouched, no gameplay changes",flush=True)

if __name__=="__main__":
    main()

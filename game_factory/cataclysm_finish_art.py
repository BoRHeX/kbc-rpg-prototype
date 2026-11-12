"""Trusted Actions-only painter for the final Cataclysm 1.0 integration pass.

Coding sandboxes cannot access the image-generation tool. This runner uses the
studio's existing OPENAI_API_KEY image endpoint and writes real alpha sprites.
No background jobs, no modification to other games.
"""
from __future__ import annotations

import base64
import concurrent.futures
import hashlib
import json
import os
from io import BytesIO
from pathlib import Path
import time

from PIL import Image, ImageOps
from openai import OpenAI
from game_factory.reference_animator import normalize_frames, atlas, remove_uniform_background

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/"docs/cataclysm-1-0-major/art"
LAB=ROOT/"docs/cataclysm-100-lab/art"
EVIDENCE=ROOT/"artifacts/cataclysm-10-finish/art"
MODEL=os.environ.get("STUDIO_IMAGE_MODEL","gpt-image-2.6-flare")
STATIC=os.environ.get("STUDIO_ANCHOR_MODEL","gpt-image-2.6-sunburst")
ROLES={
 "shooter":{"attack":"dual-hand aiming recoil with coherent barrel direction",
   "special":"pause, check an equipment pouch at the waist, adjust utility gear with both paws, then return to an alert ready stance, no firing or mechanical instructions",
   "hit":"flinch and lose ammunition grip, recover to readiness"},
 "healer":{"attack":"light defensive gesture and urgent glance toward player",
   "special":"kneel and perform medical treatment at arm's length, reach toward player",
   "hit":"surprised stumble interrupting bandage application"},
 "tank":{"attack":"advance with shield, purposeful wide planted weight",
   "special":"raise shield to intercept frontal attack, dramatic braced stance",
   "hit":"interrupt shield-down recharging rest, recover defensive posture"},
 "brawler":{"attack":"two distinct claw swipes with broad weight transfer and lunging legs",
   "special":"rapid claw combination with confident stance and momentum",
   "hit":"resting after fighting, startled and interrupted during recharge"},
 "sniper":{"attack":"kneel, draw long rifle into shoulder, recoil shot and recover",
   "special":"careful kneeling aiming preparation; elbows anchored, eye behind scope",
   "hit":"rifle aim broken, stumbling upright and resetting stance"},
 "engineer":{"attack":"brief defensive tool swing while holding equipment",
   "special":"stop, crouch, unfold and construct a compact mechanical turret",
   "hit":"tool slips while interrupted mid-build; pick it up and recover"},
 "trapper":{"attack":"hold and assemble trap mechanism with both paws",
   "special":"kneel and set a snare at feet, waiting for player assistance",
   "hit":"sudden interruption while planting trap, scramble and regain posture"},
 "bard":{"attack":"emphatic taunt gesture toward unseen enemies, no separate target shown",
   "special":"sing continuously with opened expressive mouth and rhythmic sway, music gesture",
   "hit":"song interrupted by stagger, close mouth and recover breath"}
}
GROUNDS=[
 "top-down wet cobblestone dark neon harbor alley, subtle asphalt segments",
 "top-down cracked garden district road, moss and small plants in seams",
 "top-down scorched industrial asphalt, embers in small cracks",
 "top-down dark midnight-violet neon district pavement and drains"
]
PROPS={
 "prop-building.png":"single orthographic top-down damaged building ROOFTOP and visible building footprint, no facade pasted upright, perspective consistent with top-down streets, vents and controlled neon",
 "prop-car.png":"one abandoned dented car seen in strict high-angle TOP-DOWN game perspective, aligned to traffic road axes",
 "prop-dumpster.png":"one rusty lidded dumpster seen in high-angle TOP-DOWN game perspective, compact and grounded"
}

def png_ref(role):
    source=GAME/(role+"-run.png")
    with Image.open(source) as im:
        frame=im.convert("RGBA").crop((0,0,96,96))
    frame=frame.resize((384,384),Image.Resampling.LANCZOS)
    out=Image.new("RGBA",frame.size,(234,234,234,255));out.alpha_composite(frame)
    io=BytesIO();out.convert("RGB").save(io,"PNG");return io.getvalue()

def image_bytes(img):
    buf=BytesIO();img.save(buf,"PNG",optimize=True);return buf.getvalue()

def checked_cache(path: Path, width: int, height: int) -> bytes | None:
    """Reuse only dimensionally valid, complete images saved by a previous attempt."""
    if not path.is_file():
        return None
    try:
        data=path.read_bytes()
        with Image.open(BytesIO(data)) as im:
            im.verify()
        with Image.open(BytesIO(data)) as im:
            if im.format!="PNG" or im.width!=width or im.height!=height:
                raise ValueError("Unexpected cached frame size")
        return data
    except Exception as exc:
        print("INVALID CACHED FRAME",path,str(exc)[:120],flush=True)
        path.unlink(missing_ok=True)
        return None


def perform_role(role,state,task):
    reference=png_ref(role)
    client=OpenAI(timeout=240,max_retries=1)
    prompt=(
      "Professional ORIGINAL hand-painted 2D mobile game character animation, "
      "reference-image continuity is mandatory. One anthropomorphic feline "
      "character, exact identity, species, costume, palette, accessories and "
      "role-specific equipment from the attached reference PNG. "
      "Create EIGHT DIFFERENT sequential 2D acting poses, not an 8-up poster, "
      "not duplicating or mirroring one static pose, genuine joint and torso motion. "
      "Production action: "+task+". "
      "Keep a single fully visible character in every frame, stable silhouette scale, "
      "head/muzzle, ears, tail and both feet in frame, feet anchored to same floor-line. "
      "Side 3/4 consistent camera, hand-illustrated fur and fabric shading, "
      "readable at ~64 pixel game size. No polygons, cut-out shapes, vector art, "
      "background scenes, speech bubbles, text, extra cats or source watermarks. "
      "Solid pure chroma green #00FF00 background in every frame for alpha extraction. "
      "Motion should synchronize to actual combat state: "+state+". Seamless short loop."
    )
    last=None
    for attempt in range(2):
      try:
        with BytesIO(reference) as ref:
          ref.name=role+"-reference.png"
          result=client.images.edit(model=MODEL,image=ref,prompt=prompt,
                     size="512x512",output_format="gif",frame_count=8,
                     frame_duration_ms=150,quality="medium")
        frames=normalize_frames(base64.b64decode(result.data[0].b64_json))
        if len(frames)!=8:raise ValueError("Expected 8 animation frames")
        digests={hashlib.sha256(x.tobytes()).hexdigest() for x in frames}
        if len(digests)<6:raise ValueError("Repeated art poses")
        return role,state,atlas(frames)
      except Exception as exc:
        last=exc
        print("RETRY",role,state,str(exc)[:200],flush=True)
        time.sleep((attempt+1)*3)
    raise RuntimeError(f"Painted motion {role}/{state} failed: {last}")


def generate_hero_aim():
    """Eight real painted compass-direction dual-pistol poses for joint aiming."""
    original=GAME/"characters/hero/anchor.png"
    client=OpenAI(timeout=240,max_retries=1)
    prompt=(
      "Animate the SAME illustrated WHITE CAT with coral red scarf, expressive blue eyes, "
      "identical head, clothing and TWO separate pistols as the supplied official anchor art. "
      "Create EXACTLY EIGHT PAINTED complete character key poses representing eight "
      "consecutive directional dual-pistol aiming bearings, in this strict order: "
      "(1) both pistols aim right/east, (2) lower-right/southeast, (3) down/south, "
      "(4) lower-left/southwest, (5) left/west, (6) upper-left/northwest, "
      "(7) up/north, (8) upper-right/northeast. "
      "These are DIFFERENT gun bearing poses, not running frames. "
      "Arms are genuine painted anatomically attached forearms, hands and pistols; "
      "barrels must point to each bearing, consistent shoulder anchors and body "
      "scale, unchanged hero identity, premium indie cartoon furry painted texture. "
      "Both pistols visible where anatomy permits; no detached floating gun. "
      "Whole character in each frame with stable planted feet and no extra cats. "
      "Pure chroma-green #00FF00 background throughout, no text or captions. "
      "One character per frame, clean illustrated 2D sprites for a mobile game."
    )
    last=None
    for attempt in range(2):
      try:
        with BytesIO(original.read_bytes()) as ref:
          ref.name="approved-cataclysm-hero.png"
          result=client.images.edit(model=MODEL,image=ref,prompt=prompt,
                     size="512x512",output_format="gif",
                     frame_count=8,frame_duration_ms=175,quality="high")
        frames=normalize_frames(base64.b64decode(result.data[0].b64_json))
        if len(frames)!=8:raise ValueError("No eight directional hero aim poses")
        if len({hashlib.sha256(x.tobytes()).hexdigest() for x in frames})<7:
          raise ValueError("Hero did not paint eight different gun-bearing poses")
        return atlas(frames)
      except Exception as exc:
        last=exc;print("RETRY hero aiming",str(exc)[:200],flush=True)
        time.sleep((attempt+1)*3)
    raise RuntimeError("Hero gun aim art missing: "+str(last))

def scene_image(name,description,ground):
    original=GAME/name
    with Image.open(original) as im:
      raw=im.convert("RGBA")
    raw.thumbnail((750,750),Image.Resampling.LANCZOS)
    if raw.getchannel("A").getextrema()[0]<255:
      backdrop=Image.new("RGBA",raw.size,"#00FF00")
      backdrop.alpha_composite(raw)
      raw=backdrop
    client=OpenAI(timeout=240,max_retries=1)
    prompt=(
      "Original seamless hand-painted 2D top-down mobile game environment texture, "
      "consistent projection: true elevated TOP-DOWN, not eye-level, no upright side-view facade. "
      "Paint real material details with restrained complexity, consistent with "
      "premium 2D indie illustrated white cat apocalypse Cataclysm neon city. "
      "Subject: "+description+". "
      + ("SQUARE seamlessly tileable opaque road surface, evenly lit, no horizon, "
         "legible silhouettes of characters will be drawn on top. " if ground else
         "Exactly one isolated prop fully inside image; plain pure chroma GREEN "
         "#00FF00 background for transparent cutout, no floor or standalone "
         "backdrop, preserve readable correct footprint. ")
      + "Use original for identity/role, improve visual projection. No words."
    )
    with BytesIO(image_bytes(raw)) as ref:
      ref.name="source-texture.png"
      result=client.images.edit(model=STATIC,image=ref,prompt=prompt,
                           output_format="png",size="1024x1024",quality="medium")
    raw=base64.b64decode(result.data[0].b64_json)
    with Image.open(BytesIO(raw)) as im:
      img=im.convert("RGBA")
    img=ImageOps.fit(img,(300 if ground else 288,)*2,method=Image.Resampling.LANCZOS)
    if not ground:
      img=remove_uniform_background(img)
      if img.getchannel("A").getextrema()[0]>=220:raise ValueError("Opaque prop background: "+name)
    return name,image_bytes(img)

def main():
    if not os.environ.get("OPENAI_API_KEY"):raise RuntimeError("Trusted OpenAI image secret unavailable")
    EVIDENCE.mkdir(parents=True,exist_ok=True)
    before=json.loads((GAME/"character-animations.json").read_text())
    original_hero=json.dumps(before.get("characters",{}).get("hero"),sort_keys=True)
    hero_hash={str(p.relative_to(GAME)):hashlib.sha256(p.read_bytes()).hexdigest()
               for p in (GAME/"characters/hero").rglob("*") if p.is_file()}
    tasks=[(name,state,detail) for name,actions in ROLES.items() for state,detail in actions.items()]
    generated={}; failures={}
    painted=EVIDENCE/"rendered"
    painted.mkdir(parents=True,exist_ok=True)
    todo=[]
    for role,state,detail in tasks:
      cached=checked_cache(painted/(role+"-"+state+".png"),8*96,96)
      if cached is not None:
        generated[(role,state)]=cached
        print("RESUMED APPROVED ART",role,state,flush=True)
      else:
        todo.append((role,state,detail))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
      jobs={executor.submit(perform_role,*task):task for task in todo}
      for job in concurrent.futures.as_completed(jobs):
        task=jobs[job]
        try:
          role,state,data=job.result()
          generated[(role,state)]=data
          (painted/(role+"-"+state+".png")).write_bytes(data)
          print("SAVED PAINTED FRAME",role,state,len(data),flush=True)
        except Exception as exc:
          failures["/".join(task[:2])]=str(exc)[:350]
    if failures:
      (EVIDENCE/"failures.json").write_text(json.dumps(failures,indent=2))
      raise RuntimeError("Character animation job incomplete; nothing published")
    hero_path=painted/"hero-aim.png"
    hero_aim=checked_cache(hero_path,8*96,96)
    if hero_aim is None:
      hero_aim=generate_hero_aim()
      hero_path.write_bytes(hero_aim)
    scenes={}
    for i,description in enumerate(GROUNDS):
      key="ground-"+str(i)+".png"
      cache=painted/key
      data=checked_cache(cache,300,300)
      if data is None:
        data=scene_image(key,description,True)[1]
        cache.write_bytes(data)
      scenes[key]=data
    for key,description in PROPS.items():
      cache=painted/key
      data=checked_cache(cache,288,288)
      if data is None:
        data=scene_image(key,description,False)[1]
        cache.write_bytes(data)
      scenes[key]=data
    # All assets generated before anything is touched. Existing hero unchanged.
    for (role,state),data in generated.items():
      path=GAME/"characters"/role/(state+".png")
      path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
      mirror=LAB/"characters"/role/(state+".png")
      mirror.parent.mkdir(parents=True,exist_ok=True);mirror.write_bytes(data)
      before.setdefault("characters",{}).setdefault(role,{})[state]={
        "frames":8,"fps":8,"scale":1,"embedded_weapon":True}
    for name,data in scenes.items():
      (GAME/name).write_bytes(data);(LAB/name).write_bytes(data)
    for key,value in json.loads(original_hero).items():
      assert before["characters"]["hero"][key]==value, "Existing approved hero state altered"
    (GAME/"characters/hero/aim.png").write_bytes(hero_aim)
    (LAB/"characters/hero/aim.png").write_bytes(hero_aim)
    before["characters"]["hero"]["aim"]={"frames":8,"fps":8,"scale":1,"embedded_weapon":True}
    assert hero_hash=={str(p.relative_to(GAME)):hashlib.sha256(p.read_bytes()).hexdigest()
                       for p in (GAME/"characters/hero").rglob("*") if p.is_file() and p.name!="aim.png"}
    final=json.dumps(before,indent=2)+"\n"
    (GAME/"character-animations.json").write_text(final)
    (LAB/"character-animations.json").write_text(final)
    summary={"status":"generated","count_role_animations":len(generated),"count_hero_aim_directions":8,
       "count_scene_assets":len(scenes),
       "stated_role_actions":[f"{r}:{s}" for r,s in sorted(generated)],
       "protected_hero_identical":True}
    (EVIDENCE/"result.json").write_text(json.dumps(summary,indent=2))
    print(json.dumps(summary),flush=True)

if __name__=="__main__":
    main()

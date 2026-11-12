"""Image reference -> visible character -> generated motion -> validated game atlas.

A reusable Cataclysm adapter, not a bespoke one-off animation prompt.
Authenticated Drive IDs or repository-controlled reference files are accepted.
Raw references remain temporary; only generated game sprites enter public source.
"""
from __future__ import annotations

import argparse
import base64
from io import BytesIO
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import time

from PIL import Image, ImageChops, ImageDraw, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
GAME_DIR = ROOT / "docs/cataclysm-1-0-major/art"
LAB_DIR = ROOT / "docs/cataclysm-100-lab/art"
MANIFEST = "character-animations.json"
ACTOR_PATTERN = re.compile(r"^[a-z][a-z0-9-]{1,50}$")
DRIVE_PATTERN = re.compile(r"^[A-Za-z0-9_-]{20,100}$")
STATES = frozenset(("idle", "walk", "run", "attack", "aim", "hit", "feral", "adrenaline", "special"))
CELL_SIZE = 96
MAX_REFERENCE_BYTES = 8 * 1024 * 1024
IMAGE_MODEL = "gpt-image-2.6-flare"
VISION_MODEL = "gpt-6.1-terra"
ANCHOR_MODEL = "gpt-image-2.6-sunburst"
HERO_REFERENCE = ROOT / "docs/cataclysm-1-0-major/art/hero-idle.png"
FRAME_TARGET = {"idle":6,"run":8,"attack":8,"hit":6,"feral":8,"adrenaline":8}
ART_DIRECTION = "LITE MOBILE — texture-first, hand-illustrated 2D game character"
ALLOWED_REPO_DIR = ROOT / "game_factory/art_references"
CATALOG_PATH = ROOT / "docs/cataclysm-1-0-major/campaign.js"
ROLES = ("shooter", "healer", "tank", "brawler", "sniper", "engineer", "trapper", "bard")


def validate_job(actor: str, states: str, reference_path: str = "", drive_file_id: str = "") -> list[str]:
    if not ACTOR_PATTERN.fullmatch(actor):
        raise ValueError("Actor must be a safe lowercase character ID")
    if actor != "hero" and actor not in ROLES and actor not in _known_enemies():
        raise ValueError("Target must be an existing playable hero, companion or enemy archetype")
    parsed = [x.strip() for x in states.split(",")]
    if not 1 <= len(parsed) <= 6 or len(set(parsed)) != len(parsed) or any(x not in STATES for x in parsed):
        raise ValueError("Supply 1-6 unique animation states: " + ",".join(sorted(STATES)))
    if bool(reference_path) == bool(drive_file_id):
        raise ValueError("Supply exactly one repository image path or one authenticated Drive image ID")
    if reference_path:
        path = (ROOT / reference_path).resolve()
        approved_folder = path.is_relative_to(ALLOWED_REPO_DIR.resolve())
        approved_hero = actor == "hero" and path == HERO_REFERENCE.resolve()
        if not (approved_folder or approved_hero) or path.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            raise ValueError("Reference outside authorized artist directory / trusted hero source")
    elif not DRIVE_PATTERN.fullmatch(drive_file_id):
        raise ValueError("Malformed authenticated Drive image ID")
    return parsed


def _known_enemies() -> set[str]:
    # Stable catalog names are extracted from the checked-in deterministic source,
    # never from free-form model output or a workflow input.
    text = CATALOG_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"\bid\s*:\s*['\"]([a-z][a-z0-9-]+)['\"]", text))


def _verify_image(data: bytes) -> bytes:
    if not 200 <= len(data) <= MAX_REFERENCE_BYTES:
        raise ValueError("Reference image byte size out of bounds")
    with Image.open(BytesIO(data)) as original:
        if original.format not in ("PNG", "JPEG", "WEBP"):
            raise ValueError("Reference must be PNG, JPEG or WebP")
        if original.width > 4096 or original.height > 4096 or original.width * original.height > 12_000_000:
            raise ValueError("Reference image is too large")
        img = original.convert("RGBA")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def load_reference(reference_path: str = "", drive_file_id: str = "", actor: str = "") -> bytes:
    if reference_path:
        path = (ROOT / reference_path).resolve()
        approved = path.is_relative_to(ALLOWED_REPO_DIR.resolve())
        hero = actor == "hero" and path == HERO_REFERENCE.resolve()
        if not (approved or hero) or not path.is_file():
            raise ValueError("Reference not found in approved art folder")
        if hero:
            # Existing source is a 24-frame PNG atlas. The visual artist should
            # see ONE isolated character, not 24 copies on a horizontal strip.
            with Image.open(path) as image:
                pose = image.convert("RGBA").crop((0, 0, 96, 96))
                pose = pose.resize((384, 384), Image.Resampling.NEAREST)
                buffer = BytesIO()
                pose.save(buffer, "PNG")
                return _verify_image(buffer.getvalue())
        return _verify_image(path.read_bytes())
    import requests
    from game_factory.private_playback import get_access_token
    with requests.Session() as session:
        token = get_access_token(session)
        api = "https://www.googleapis.com/drive/v3/files/" + drive_file_id
        headers = {"Authorization": "Bearer " + token}
        meta = session.get(api, headers=headers, params={"fields": "id,name,size,mimeType,parents"}, timeout=35)
        meta.raise_for_status()
        info = meta.json()
        allowed_folder = os.environ.get("ART_REFERENCE_FOLDER_ID", "")
        if allowed_folder and allowed_folder not in info.get("parents", []):
            raise ValueError("Drive reference is outside the authorized art-reference folder")
        if info.get("mimeType") not in ("image/png", "image/jpeg", "image/webp") or int(info.get("size", 0)) > MAX_REFERENCE_BYTES:
            raise ValueError("Drive reference must be a bounded PNG/JPEG/WebP file")
        with session.get(api, headers=headers, params={"alt": "media"}, timeout=90) as response:
            response.raise_for_status()
            return _verify_image(response.content)


def data_url(png: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(png).decode("ascii")


def model_json(client, prompt: str, images: list[bytes]) -> dict:
    content = [{"type": "input_text", "text": prompt}]
    content += [{"type": "input_image", "image_url": data_url(x), "detail": "high"} for x in images]
    response = client.responses.create(
        model=os.environ.get("STUDIO_VISION_MODEL", VISION_MODEL),
        input=[{"role": "user", "content": content}],
        text={"format": {"type": "json_object"}},
        store=False,
    )
    value = json.loads(response.output_text)
    if not isinstance(value, dict):
        raise RuntimeError("Vision analysis did not return a JSON object")
    return value


def analyze_reference(client, image: bytes, actor: str, notes: str) -> dict:
    brief = model_json(client, (
        "You are the BoRHeZ visual character identity artist. Inspect the ACTUAL image pixels. "
        "Return JSON keys single_character (bool), subject (string), silhouette (string), "
        "palette (list of strings), outfit (string), face (string), equipment (string), "
        "camera_angle (string), artistic_style (string), animation_risks (string). "
        "Reject group photos, banners, collages and screenshots containing multiple main subjects "
        "unless exactly one isolated character can be identified. Never invent a different character. "
        "No private identity inference. Target existing game character: " + actor +
        ". Creator notes: " + notes[:450]
    ), [image])
    if brief.get("single_character") is not True:
        raise ValueError("Reference image does not contain one unambiguous isolated game character")
    if not isinstance(brief.get("subject"), str) or not brief["subject"].strip():
        raise ValueError("Vision could not describe the visible character")
    return brief


def remove_uniform_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    lo, hi = img.getchannel("A").getextrema()
    if lo < 120:
        return img
    # GIF cannot be assumed to preserve transparency. Ask the image model for
    # a flat green canvas; remove only edge-connected near-uniform background.
    for xy in ((0, 0), (img.width-1, 0), (0, img.height-1), (img.width-1, img.height-1)):
        background = img.getpixel(xy)
        if background[1] > background[0]*1.35 and background[1] > background[2]*1.2:
            ImageDraw.floodfill(img, xy, (0, 0, 0, 0), thresh=45)
    return img


def normalize_frames(gif_data: bytes) -> list[Image.Image]:
    frames = []
    with Image.open(BytesIO(gif_data)) as anim:
        if anim.format != "GIF" or getattr(anim, "n_frames", 1) < 2:
            raise ValueError("Image model returned no real animation")
        for frame in ImageSequence.Iterator(anim):
            rendered = remove_uniform_background(frame.convert("RGBA"))
            alpha = rendered.getchannel("A")
            bbox = alpha.point(lambda v: 255 if v>26 else 0).getbbox()
            if not bbox:
                raise ValueError("Image model returned an empty frame")
            if sum(1 for value in alpha.resize((24,24)).getdata() if value<100) < 35:
                raise ValueError("Animation background is not sufficiently transparent")
            crop = rendered.crop(bbox)
            factor = min(86/crop.width, 77/crop.height, 1.0 if crop.width<=86 and crop.height<=77 else 100.0)
            scaled = crop.resize((max(1,round(crop.width*factor)),max(1,round(crop.height*factor))),Image.Resampling.LANCZOS)
            out = Image.new("RGBA", (CELL_SIZE,CELL_SIZE))
            out.alpha_composite(scaled, ((CELL_SIZE-scaled.width)//2, 84-scaled.height))
            frames.append(out)
    if len(frames)>16:
        raise ValueError("Too many frames from image generation")
    # Real frame variation is measured, not inferred from file hashes or metadata.
    deltas = []
    for a,b in zip(frames,frames[1:]):
        diff = ImageChops.difference(a,b).convert("RGB")
        bbox = diff.point(lambda p:255 if p>18 else 0).getbbox()
        deltas.append(bool(bbox))
    if sum(deltas)<max(1,(len(frames)-1)//3):
        raise ValueError("Animation frames do not contain enough visible motion")
    return frames


def atlas(frames: list[Image.Image]) -> bytes:
    img = Image.new("RGBA", (len(frames)*CELL_SIZE,CELL_SIZE))
    for i, frame in enumerate(frames):
        img.alpha_composite(frame,(i*CELL_SIZE,0))
    buf = BytesIO()
    img.save(buf,format="PNG",optimize=True)
    return buf.getvalue()


def contact_sheet(frames: list[Image.Image]) -> bytes:
    count=min(6,len(frames))
    sheet=Image.new("RGBA",(count*128,128),(24,31,45,255))
    for i in range(count):
        sheet.alpha_composite(frames[i].resize((112,112),Image.Resampling.NEAREST),(i*128+8,8))
    buf=BytesIO();sheet.convert("RGB").save(buf,format="PNG")
    return buf.getvalue()


def inspect_animation(client, reference: bytes, frames: list[Image.Image], state: str, actor: str, texture_first: bool = False) -> dict:
    phase = {
        "run": "contact, compression, passing, up, alternating leg cycle with real weight transfer",
        "attack": "anticipation, weapon fire, recoil, recovery with distinct pistol/arm positions",
        "idle": "breathing, blinking and secondary tail/scarf motion while feet stay grounded",
        "hit": "recognizable impact, stagger or fall-back, and recovery",
        "feral": "aggressive gait and body language with crimson eyes, beyond hue shifts",
        "adrenaline": "faster run-and-gun with differentiated energetic posture and weapon action",
    }.get(state, "distinct natural movement matching the state")
    result = model_json(client, (
        "You are independent game-animation visual QA. Image 1 shows the authorized reference character; "
        "image 2 shows sequential frames drawn from the generated " + state + " motion. "
        "Required action phases for THIS state: " + phase + ". "
        "Return JSON with booleans same_character, visible_motion, usable_in_game and "
        "booleans painted_texture, articulated_key_poses, distinct_motion_phases and "
        "a short concern string. Evaluate subject identity (fur/face/outfit/equipment), "
        "visibly PAINTED RASTER TEXTURE, limbs and joints, real contact-to-passing foot "
        "motion or recoil phase, not merely palette changes or mirrored frames. "
        "Be strict about unrelated characters and "
        "severe silhouette distortion. No extra text. Character id: " + actor
    ), [reference, contact_sheet(frames)])
    required = ["same_character", "visible_motion", "usable_in_game"]
    if texture_first:
        required += ["painted_texture", "articulated_key_poses", "distinct_motion_phases"]
    if not all(result.get(key) is True for key in required):
        raise ValueError("Independent visual review rejected generated " + state
                         + ": " + str(result.get("concern", ""))[:250])
    return result


def generate_visual_anchor(client, reference: bytes, actor: str, identity: dict, notes: str) -> bytes:
    """Real image-model painting, not Pillow-drawn limbs, gradients or geometry."""
    prompt = (
        "Create ONE production-quality 2D illustrated GAME CHARACTER TEXTURE, not "
        "a sprite sheet or diagram. Use the attached existing sprite image ONLY "
        "as character identity reference. Repaint the same character entirely "
        "as convincing premium hand-painted raster game art with subtle real "
        "fur texture, layered fabric folds, metal pistol material, intentional "
        "shaded volumes, clean high-contrast silhouette and expressive eyes. "
        "The Cataclysm hero is an expressive WHITE CAT with CORAL/RED scarf, "
        "TWO distinct hand-held pistols, pointed ears, feline muzzle, tail. "
        "Keep costume and facial identity, avoid new accessories and humans. "
        "Show ONE complete full-body 3/4 side action-ready pose (head to planted "
        "feet fully inside canvas). Character should occupy ~75% of image height, "
        "centered in a 512x512 square. Plain neutral background, no environment, "
        "text, captions, logo, panels, sprite grids, vector stick-figure, "
        "procedural polygon look or seams between assembled shapes. "
        "Style: illustrated indie-game character texture with readable "
        "detail when eventually reduced to a ~64px mobile sprite, not a photorealistic "
        "render and not super-detailed mush. ANIMATION IDENTITY: "
        + json.dumps(identity, ensure_ascii=False)[:1000] + ". "
        + notes[:400]
    )
    with BytesIO(reference) as image:
        response = client.images.edit(
            model=os.environ.get("STUDIO_ANCHOR_MODEL", ANCHOR_MODEL),
            image=image, prompt=prompt, output_format="png",
            size="512x512", quality="high"
        )
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("Texture artist produced no painted visual anchor")
    anchor = _verify_image(base64.b64decode(response.data[0].b64_json))
    # Model-produced anchor is kept as real raster art, not recreated with primitives.
    return anchor


def inspect_visual_anchor(client, source: bytes, anchor: bytes, actor: str) -> dict:
    result = model_json(client, (
        "Independent character-art director. Compare supplied ORIGINAL reference "
        "(first image) and newly PAINTED texture-first visual anchor (second). "
        "Return JSON keys same_character (bool), illustrated_not_procedural (bool), "
        "readable_at_mobile_scale (bool), one_full_character (bool), concern (string). "
        "Reject altered species, missing red/coral scarf, missing dual pistols, "
        "two or more characters, vector-like stitched limbs, unreadable silhouette. "
        "Character: " + actor
    ), [source, anchor])
    if not all(result.get(key) is True for key in (
            "same_character", "illustrated_not_procedural",
            "readable_at_mobile_scale", "one_full_character")):
        raise ValueError("Painted visual anchor rejected: " + str(result.get("concern", ""))[:250])
    return result


def generate_animation(client, reference: bytes, identity: dict, actor: str, state: str, notes: str, texture_first: bool = False) -> bytes:
    # One model call per motion state, with a hard max set by the job validator.
    from io import BytesIO
    motion = {
      "idle":"gentle breathing, blinking and subtle tail motion while standing ready",
      "walk":"looping alternating leg walk cycle, clear foot plants, tail counterbalance",
      "run":"looping fast run cycle, powerful alternating leg strides and scarf/tail flutter",
      "attack":"weapon firing or claw-strike cycle, recoil and recovery, distinct action frames",
      "aim":"steady tracking aim, upper body rotates slightly while feet stay grounded",
      "hit":"brief damage recoil and recover to ready stance",
      "feral":"orange spiky larger aggressive run with visible energized fur transformation",
      "adrenaline":"crimson-red overdrive run-and-gun, fierce expression and rapid motion",
      "special":"character's role-specific signature skill, visually animated and readable"
    }[state]
    if texture_first:
        number = FRAME_TARGET.get(state, 6)
        timing = 125 if state in ("run", "attack", "feral", "adrenaline") else 180
        prompt = (
            "This is a professional 2D drawn-animation assignment. ANIMATE THE "
            "ACTUAL PAINTED CHARACTER in the supplied image without changing its "
            "face, species, white fur, red/coral scarf, two pistols or illustration "
            "style. Generate a seamless loop of exactly " + str(number) + " DISTINCT "
            "HAND-ILLUSTRATED FRAMES for: " + motion + ". "
            "Each frame must contain the WHOLE SINGLE CHARACTER, never multiple "
            "characters in one frame, at identical camera angle, scale and feet origin. "
            "Preserve real painted raster textures and colored shading from the anchor "
            "across ALL frames. For RUN: explicitly animate two alternating contact, "
            "down/compression, passing/raised-foot and up/recovery poses with real "
            "joint bending, visible planted feet and torso weight transfer. "
            "For ATTACK: distinct anticipation, firing, alternating gun recoil and "
            "recovery, NOT one firing pose with flickering flashes. For HIT: clear "
            "impact recoil and regain balance. For FERAL: crimson glowing eyes and "
            "aggressive body language; for ADRENALINE: fast controlled run-and-gun. "
            "Any tiny mirrored shift, hue change, full-body wobble or reusing a frame "
            "is NOT counted as animation. Tail and scarf follow motion with delayed "
            "secondary action. No scenery, ground plane, camera movement, text, "
            "frame borders or collage. Solid pure flat #00FF00 chroma-green canvas "
            "in EVERY frame, no gradients or shadows cast on background. "
            "Produce actual 2D hand-painted sequential animation as a GIF "
            "with stable proportions and recognizable cat in every frame. "
            "Identity: " + json.dumps(identity, ensure_ascii=False)[:1000]
            + ". Notes: " + notes[:350]
        )
    else:
        number = 6
        timing = 140
        prompt = (
        "Animate the SINGLE game character shown in the supplied reference PNG. "
        "Generate one seamless loop with exactly six distinct frames for the motion: "+motion+". "
        "Keep same identifiable face, fur, costume, accessories, weapon, proportions and camera angle "
        "in EVERY frame. Keep feet and character centered in the same canvas coordinates, "
        "without camera tracking or background scrolling. Flat solid pure chroma-green (#00FF00) "
        "background in every frame for automatic removal; NO gradient, floor, scenery, words, "
        "captions, borders or other subjects. High-quality 2D sprite animation with visible "
        "leg/body/tail/weapon motion and stable silhouette. "
        "Visible identity: "+json.dumps(identity,ensure_ascii=False)[:1300]+". "
        "Character role: "+actor+". Additional action: "+notes[:400]
    )
    with BytesIO(reference) as image:
        result = client.images.edit(
            model=os.environ.get("STUDIO_IMAGE_MODEL",IMAGE_MODEL),
            image=image,
            prompt=prompt,
            output_format="gif",
            frame_count=number,
            frame_duration_ms=timing,
            size="512x512",
            quality="high" if texture_first else "medium",
        )
    if not result.data or not result.data[0].b64_json:
        raise RuntimeError("Image model returned no animation")
    return base64.b64decode(result.data[0].b64_json)


def write_result(actor: str, sprites: dict[str,bytes], reference: bytes, qa: dict[str,dict],
                 output: Path=GAME_DIR, mirror: Path=LAB_DIR, anchor: bytes | None = None) -> dict:
    # Manifest update only after every requested state passed local and vision QA.
    manifest_path=output/MANIFEST
    document=json.loads(manifest_path.read_text(encoding="utf-8"))
    if document.get("version")!=1 or not isinstance(document.get("characters"),dict):
        raise ValueError("Unrecognized animation manifest")
    for state, data in sprites.items():
        with Image.open(BytesIO(data)) as img:
            if img.size[1]!=96 or img.size[0]%96 or img.mode!="RGBA":
                raise ValueError("Incorrect game atlas dimensions or transparency")
        asset=output/"characters"/actor/(state+".png")
        asset.parent.mkdir(parents=True,exist_ok=True)
        asset.write_bytes(data)
        dest=mirror/"characters"/actor/(state+".png")
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(asset,dest)
    if anchor is not None:
        for folder in (output, mirror):
            p = folder / "characters" / actor / "anchor.png"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(anchor)
    mapping=document["characters"].setdefault(actor,{})
    for state,data in sprites.items():
        with Image.open(BytesIO(data)) as img:
            frame_count=img.width//96
        mapping[state]={"frames":frame_count,"fps":(6 if state in ("idle","hit") else 8) if anchor is not None else (10 if state in ("idle","walk","aim") else 12),
                        "embedded_weapon":True,"scale":1.08 if state=="feral" else 1.14 if state=="adrenaline" else 1.0,
                        "reference_sha256":hashlib.sha256(reference).hexdigest()[:20],
                        **({"art_direction":"LITE_MOBILE_TEXTURE_FIRST"} if anchor is not None else {})}
    encoded=json.dumps(document,indent=2,sort_keys=True)+"\n"
    manifest_path.write_text(encoded,encoding="utf-8")
    (mirror/MANIFEST).write_text(encoded,encoding="utf-8")
    return {"actor":actor,"states":list(sprites),"frames":{s:Image.open(BytesIO(x)).width//CELL_SIZE for s,x in sprites.items()},
            "manifest":str(manifest_path.relative_to(ROOT) if manifest_path.is_relative_to(ROOT) else manifest_path),
            "reference_sha256":hashlib.sha256(reference).hexdigest(),"visual_checks":qa}


def run(argv=None):
    parser=argparse.ArgumentParser(description="Turn an isolated artist-supplied reference into game animation")
    parser.add_argument("--actor",required=True)
    parser.add_argument("--states",default="run")
    parser.add_argument("--reference",default="")
    parser.add_argument("--drive-file-id",default="")
    parser.add_argument("--notes",default="")
    parser.add_argument("--max-generations",type=int,default=6)
    parser.add_argument("--texture-first",action="store_true",help="Paint an original anchor (one additional image call) then produce raster GIF animations")
    parser.add_argument("--work-dir",default="artifacts/character-animation")
    args=parser.parse_args(argv)
    if len(args.notes)>700 or not 1<=args.max_generations<=6:
        raise ValueError("Notes/max image generation requests exceed hard limit")
    states=validate_job(args.actor,args.states,args.reference,args.drive_file_id)
    if len(states)>args.max_generations:
        raise ValueError("States exceed the explicitly approved API generation limit")
    from openai import OpenAI
    work=(ROOT/args.work_dir).resolve()
    if not work.is_relative_to((ROOT/"artifacts").resolve()):
        raise ValueError("Work directory must stay under ignored Actions artifacts")
    work.mkdir(parents=True,exist_ok=True)
    reference=load_reference(args.reference,args.drive_file_id,args.actor)
    client=OpenAI()
    identity=analyze_reference(client,reference,args.actor,args.notes)
    (work/"vision-identity.json").write_text(json.dumps(identity,indent=2))
    anchor = None
    art_reference = reference
    if args.texture_first:
        # One independent high-quality painted anchor, then one actual GIF model
        # call per state. Total upper bound: 1+len(states) image calls, never unbounded.
        anchor = generate_visual_anchor(client, reference, args.actor, identity, args.notes)
        (work/"painted-hero-anchor.png").write_bytes(anchor)
        (work/"anchor-review.json").write_text(json.dumps(
            inspect_visual_anchor(client, reference, anchor, args.actor), indent=2))
        art_reference = anchor
    sprites={};reviews={}
    for state in states:
        generated=generate_animation(client,art_reference,identity,args.actor,state,args.notes,args.texture_first)
        # Raw model GIF is saved only inside the Actions artifact workspace.
        (work/(state+".gif")).write_bytes(generated)
        frames=normalize_frames(generated)
        reviews[state]=inspect_animation(client,art_reference,frames,state,args.actor,args.texture_first)
        sprites[state]=atlas(frames)
        (work/(state+"-contact.png")).write_bytes(contact_sheet(frames))
        print("Validated image-derived motion:",args.actor,state,len(frames),flush=True)
    report=write_result(args.actor,sprites,reference,reviews,anchor=anchor)
    (work/"report.json").write_text(json.dumps(report,indent=2))
    print(json.dumps({key:value for key,value in report.items() if key!="frames"},indent=2))


if __name__=="__main__":
    run()

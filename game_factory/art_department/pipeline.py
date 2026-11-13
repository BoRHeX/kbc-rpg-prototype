"""Reusable source/image/motion gates for BoRHeZ Art & Animation Department.

Production is performed by the GitHub coding worker; this independent module
handles intake, visual understanding, provenance, frame validation and critique.
"""
from __future__ import annotations
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

from PIL import Image, ImageChops, ImageDraw, ImageStat, ImageOps

ROOT = Path(__file__).resolve().parents[2]
JOB_PATH = ROOT / os.environ.get("ART_JOB", "game_factory/art_department/jobs/active.json")
OUT = ROOT / "artifacts/art-department"
OUT.mkdir(parents=True, exist_ok=True)


def job():
    data = json.loads(JOB_PATH.read_text(encoding="utf-8"))
    for field in ("game", "character", "reference", "source_dir", "states", "mirror_dir"):
        assert data.get(field), "Missing job field: " + field
    for key in ("game", "character"):
        assert re.fullmatch(r"[a-z0-9-]+", data[key]), "Invalid " + key
    for key in ("source_dir", "mirror_dir"):
        assert data[key].startswith("docs/") and ".." not in Path(data[key]).parts
        assert (ROOT / data[key]).is_dir(), "Missing game directory " + data[key]
    assert data["reference"].startswith("docs/") and ".." not in Path(data["reference"]).parts
    assert (ROOT / data["reference"]).is_file(), "Image reference is required"
    assert re.fullmatch(r"[a-z0-9_-]+\.py", data["allowed_generator"])
    assert len(data["states"]) >= 2 and len(set(data["states"])) == len(data["states"])
    assert all(re.fullmatch(r"[a-z0-9-]+", s) for s in data["states"])
    assert 2 <= int(data["frames_per_state"]) <= 48
    assert 48 <= int(data["frame_size"]) <= 256
    return data


def atlas_paths(j):
    return [ROOT / j["source_dir"] / "art" / (j["character"] + "-" + state + ".png")
            for state in j["states"]]


def as_b64(path):
    return "data:image/png;base64," + base64.b64encode(Path(path).read_bytes()).decode("ascii")


def vision(prompt, images, model="gpt-4.1-mini"):
    key = os.environ.get("OPENAI_API_KEY", "")
    if not key:
        raise RuntimeError("OPENAI_API_KEY missing: image understanding/review is mandatory")
    pieces = [{"type": "input_text", "text": prompt}]
    pieces += [{"type": "input_image", "image_url": as_b64(p)} for p in images]
    payload = json.dumps({"model": model, "input": [{"role": "user", "content": pieces}],
                          "max_output_tokens": 1000}).encode()
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses", data=payload,
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(request, timeout=110) as response:
        result = json.load(response)
    answer = "\n".join(c["text"] for item in result.get("output", [])
                       for c in item.get("content", []) if c.get("type") == "output_text")
    if not answer.strip():
        raise RuntimeError("Vision model returned no visible assessment")
    return answer


def reference_sample(j):
    im = Image.open(ROOT / j["reference"]).convert("RGBA")
    s = int(j["frame_size"])
    # Existing sprite sheets may be wider than one frame. Use their first pose.
    if im.width >= s and im.height >= s:
        im = im.crop((0, 0, s, s))
    im.thumbnail((512, 512))
    im.resize((max(384, im.width), max(384, im.height)), Image.Resampling.NEAREST).save(
        OUT / "reference.png")


def prepare():
    j = job()
    reference_sample(j)
    brief = (
        "You are the VISUAL SCOUT of a reusable game character animation department. "
        "Examine the actual attached reference pixel image (not its filename). "
        "Describe species/anatomy, silhouette, apparel and gear, exact visual landmarks, "
        "body part topology/head/torso/arms/legs/tail, visual palette, weapon pivot, "
        "likely animation constraints and what must stay consistent across states. "
        "Propose materially different motion in idle/run/hit/attack/power states, "
        "including identifiable changes at 96px. Distinguish observations from proposals. "
        "Do NOT give generic graphic-design advice. The character must be recognizable."
        " Job art brief: " + j["visual_direction"]
    )
    notes = vision(brief, [OUT / "reference.png"])
    (OUT / "reference-analysis.md").write_text("# Reference image analysis\n\n" + notes + "\n")
    print("Visual scout inspected actual image; spec:", j["game"], j["character"])


def changed_paths():
    tracked = subprocess.check_output(["git", "diff", "--name-only", "HEAD"], cwd=ROOT).decode().splitlines()
    untracked = subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard"],
                                        cwd=ROOT).decode().splitlines()
    return set(tracked + untracked)



def silhouette_families(atlas, frame_count, size, state):
    """Count articulated full-body pose families, including mirror-equivalent frames.

    Ignore paint/lighting noise: work from normalized binary alpha silhouettes.
    In a 2-pose loop repeated 12 times this yields at most two families, even if
    every PNG frame has a different RGB pixel hash or minor color variation.
    """
    masks = []
    for k in range(frame_count):
        frame = atlas.crop((k * size, 0, (k + 1) * size, size))
        a = frame.getchannel("A").resize((48, 48), Image.Resampling.NEAREST)
        masks.append(a.point(lambda x: 255 if x >= 100 else 0))
    def difference(left, right):
        a, b = left.tobytes(), right.tobytes()
        union = sum(1 for x, y in zip(a, b) if x or y)
        altered = sum(1 for x, y in zip(a, b) if x != y)
        return altered / max(1, union)
    families = []
    for mask in masks:
        if not any(min(difference(mask, old), difference(mask, ImageOps.mirror(old))) < 0.055
                   for old in families):
            families.append(mask)
    minimum = {'run': 8, 'attack': 7, 'adrenaline': 8, 'feral': 7,
               'hit': 5, 'idle': 3}.get(state, 6)
    assert len(families) >= minimum, (
        f'{state}: only {len(families)} non-mirrored body silhouettes, need {minimum}; '
        'reject two-pose, palette-only, bouncing or mirrored loops')
    return len(families)

def validate():
    j = job()
    if j.get('atlas_layout') == 'rigged-parts':
        from .rigged import validate as validate_rigged
        return validate_rigged()
    if j.get('atlas_layout') == 'directional-grid':
        from .modern import validate as validate_modern
        return validate_modern()
    base = Path(j["source_dir"])
    mirror = Path(j["mirror_dir"])
    art = ROOT / base / "art"
    generator = art / j["allowed_generator"]
    assert generator.is_file(), "Missing reproducible character generator"
    candidate = {p.relative_to(ROOT).as_posix() for p in atlas_paths(j)}
    allowed = candidate | {(base / "animation.js").as_posix(), generator.relative_to(ROOT).as_posix()}
    changes = changed_paths()
    forbidden = sorted(p for p in changes if p not in allowed and not p.startswith("artifacts/"))
    assert not forbidden, "Artist altered files outside job scope: " + str(forbidden)
    assert (base / "animation.js").as_posix() in allowed
    assert candidate.issubset(changes), "Every state must contain new generated artwork: " + str(candidate - changes)
    assert generator.relative_to(ROOT).as_posix() in changes, "Generator must be new or revised"
    n, s = int(j["frames_per_state"]), int(j["frame_size"])
    score = {}
    contact = Image.new("RGB", (5 * 180, len(j["states"]) * 190), "#17202b")
    draw = ImageDraw.Draw(contact)
    for row, (state, p) in enumerate(zip(j["states"], atlas_paths(j))):
        raw = p.read_bytes()
        assert raw.startswith(bytes.fromhex("89504e470d0a1a0a")), "Not a PNG: " + str(p)
        baseline = subprocess.run(["git", "show", "HEAD:" + p.relative_to(ROOT).as_posix()],
                                  cwd=ROOT, capture_output=True, check=False)
        if baseline.returncode == 0:
            assert hashlib.sha256(baseline.stdout).digest() != hashlib.sha256(raw).digest(), (
                "Old sprite sheet reused: " + str(p))
        with Image.open(p) as src:
            assert src.mode == "RGBA", "Transparent RGBA required: " + str(p)
            assert src.size == (n * s, s), "Wrong sheet geometry: " + str(p) + " " + str(src.size)
            alpha = src.getchannel("A")
            bounds = alpha.getextrema()
            assert bounds[0] == 0 and bounds[1] >= 220, "Missing real transparency/opaque figure"
            frames = [src.crop((k * s, 0, (k + 1) * s, s)).convert("RGB") for k in range(n)]
            deltas = [sum(ImageStat.Stat(ImageChops.difference(frames[k], frames[(k+1) % n])).sum)
                      for k in range(n)]
            animated = sum(d >= 2000 for d in deltas)
            assert animated >= n - 3, (state + " lacks meaningful frame changes " + str(animated))
            assert len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames}) >= n - 2, (
                "Identical frames " + state)
            families = silhouette_families(src, n, s, state)
            score[state] = {"animated_transitions": animated, "non_mirrored_silhouette_families": families, "bytes": len(raw)}
            draw.text((5, row * 190 + 6), state, fill="#fff9df")
            for k, frame_no in enumerate((0, n // 4, n // 2, 3 * n // 4)):
                crop = src.crop((frame_no * s, 0, (frame_no + 1) * s, s))
                crop.thumbnail((150, 150))
                tile = Image.new("RGBA", (150, 150), "#314352")
                tile.alpha_composite(crop, ((150 - crop.width)//2, (150 - crop.height)//2))
                contact.paste(tile.convert("RGB"), (125 + k * 190, row * 190 + 20))
    contact.save(OUT / "animation-contact.png")
    assert "drawImage(" in (ROOT / base / "animation.js").read_text(), "No actual image integration in renderer"
    # Mirror only the artist's requested character sprites, never unrelated game content.
    dst = ROOT / mirror / "art"
    dst.mkdir(parents=True, exist_ok=True)
    for p in atlas_paths(j):
        (dst / p.name).write_bytes(p.read_bytes())
    (OUT / "mechanical-gate.json").write_text(json.dumps(score, indent=2))
    print("PASS mechanical art gates:", score)


def review():
    j = job()
    images = [OUT / "reference.png", OUT / "animation-contact.png",
              OUT / "motion-render.png", OUT / "run-cycle.png", OUT / "attack-cycle.png",
              OUT / "actual-game.png"]
    assert all(p.is_file() and p.stat().st_size > 3000 for p in images), (
        "Missing real visual evidence " + str([p for p in images if not p.is_file()]))
    instruction = (
        "Independent game-art QA. Images ordered: reference hero; new sprite contact sheet "
        "(rows are states, columns different animation frames); real browser Canvas rendered "
        "animation; full 24-frame run cycle; full 24-frame attack cycle; screenshot after "
        "actually starting the game. Count ACTUAL distinct poses, disregard tiny differences. "
        "Assess (1) identifiable consistent character and props, (2) convincing anatomical "
        "articulation between frames rather than static shifts, (3) art aesthetic and readability "
        "at native/mobile game scale, (4) actual integration and visible gameplay. "
        "Do not approve merely because files and tests exist. FAIL if run reads as just "
        "two alternating or mirrored poses, or if primary joint articulation is invisible. "
        "Respond with ONLY valid JSON keys pass (boolean), identity (integer 0-5), "
        "motion (integer 0-5), quality (integer 0-5), integration (integer 0-5), "
        "concerns (array of strings). Reject if indistinct shapes, few believable pose "
        "changes, missing body parts, inconsistent identity, or game screenshot is not "
        "proof of integration. Visual direction: " + j["visual_direction"]
    )
    if j.get('atlas_layout') == 'rigged-parts':
        instruction += (
            " This is now a CONTINUOUS two-bone inverse-kinematics rig, NOT a "
            "massive pre-baked whole-body atlas. A separate real browser review "
            "provides 24 sequential ACTUAL gait samples, 12 mobile-size frames "
            "for every state, and a real game screenshot. Judge the painted upper "
            "body against the independent lower-leg textures. The CAT's face, "
            "dual pistols, aiming, jacket and scarf must retain their approved "
            "identity; the legs MUST plant, bend, lift and alternate at phone "
            "scale. Do not approve on code/IK mathematics alone. "
            "If the feet are apparently locked, detached, deformed or static, "
            "give leg_motion at most 2 and set pass=false even if all tests pass. "
            "Do not require exactly 24 prepainted whole-body images: the rig "
            "constructs 60Hz unique poses from painted component textures. "
            "Return separate leg_motion score 0-5 and approve only if >=4. "
        )
    if j.get('atlas_layout') == 'directional-grid':
        instruction += (
            " CRITICAL EXTRA REQUIREMENT: score LEG MOTION separately. "
            "The creator reports that legs are frozen while the torso and guns animate. "
            "Use the 24-frame run sheet AND phone-size images to track knees, feet, "
            "ground contact and full foot swings. Even if arms, eyes, tail and "
            "gun recoil look excellent, if either leg stays fixed relative to "
            "hips across running, walking and buffs, set leg_motion 0-2 and "
            "PASS=false. Do not mistake camera bob, torso translation, shadows, "
            "a two-pose flip or color animation for a running gait. "
            "Require convincing planted foot, passing leg, toe-off and airborne "
            "foot positions in a smooth readable loop. "
            "Return the additional JSON key leg_motion (integer 0-5). "
            "The independent pipeline REQUIRES leg_motion >=4 for acceptance."
        )
    answer = vision(instruction, images)
    (OUT / "visual-review-raw.txt").write_text(answer)
    try:
        verdict = json.loads(answer.strip().removeprefix("```json").removesuffix("```").strip())
    except json.JSONDecodeError as exc:
        raise RuntimeError("Visual reviewer must return valid JSON") from exc
    scores = ("identity", "motion", "quality", "integration") + (
        ("leg_motion",) if j.get('atlas_layout') in ('directional-grid','rigged-parts') else ()
    )
    minimum = int(j["minimum_visual_score"])
    attempt = int(os.environ.get("ART_REVIEW_ATTEMPT", "1"))
    assert 1 <= attempt <= 3, "Visual-review attempt must be bounded"
    (OUT / "visual-review.json").write_text(json.dumps(verdict, indent=2))
    (OUT / f"visual-review-attempt-{attempt}.json").write_text(json.dumps(verdict, indent=2))
    approved = verdict.get("pass") is True and all(
        isinstance(verdict.get(x), int) and verdict[x] >= minimum for x in scores
    )
    if not approved:
        concerns = verdict.get("concerns", [])
        if not isinstance(concerns, list):
            concerns = [str(concerns)]
        brief = [
            "# Mandatory art revision — rejected visual attempt " + str(attempt),
            "",
            "This is an independent evaluation of the real browser-rendered character.",
            "Do not modify or bypass the scoring. Change the ART AND ANIMATION.",
            "Required minimum for each category: " + str(minimum) + "/5",
            "Observed scores: " + json.dumps({key: verdict.get(key) for key in scores}),
            "",
            "## Specific actionable failures",
        ]
        brief += ["- " + str(c) for c in concerns]
        brief += [
            "",
            "Fix pose choreography and anatomical articulation in the actual generator.",
            "A 24-frame atlas with 2-3 readable poses is a failure even if alpha",
            "silhouette counts and image hashes look sufficiently different.",
            "Review all 24 run/attack browser frames and keep version 1.0.",
        ]
        (OUT / "revision-brief.md").write_text("\n".join(brief) + "\n")
        print("REJECTED visual attempt", attempt, json.dumps(verdict), flush=True)
        raise AssertionError("Image review REJECTED candidate: " + json.dumps(verdict))
    (OUT / "accepted.json").write_text(json.dumps({
        "attempt": attempt, "verdict": verdict, "request_id": j.get("request_id")
    }, indent=2))
    print("PASS independent image-based assessment on attempt", attempt, verdict)


if __name__ == "__main__":
    import sys
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    actions = {"prepare": prepare, "gate": validate, "review": review}
    if action not in actions:
        raise SystemExit("Usage: python -m game_factory.art_department.pipeline {prepare|gate|review}")
    actions[action]()

"""Skeletal-texture art gate. Enforces the actual runtime parts and IK solver.

The animation solution is a continuous articulated rig, not more crossfaded
whole-character frames. The creative animator owns texture quality; this file
and the independent Chrome reviewer own acceptance.
"""
from __future__ import annotations
import hashlib
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageStat

ROOT=Path(__file__).resolve().parents[2]
MAIN=Path("docs/cataclysm-1-0-major")
LAB=Path("docs/cataclysm-100-lab")

def job():
    j=json.loads((ROOT/"game_factory/art_department/jobs/active.json").read_text())
    assert j["atlas_layout"]=="rigged-parts" and j["character"]=="hero"
    assert j["source_dir"]==str(MAIN) and j["mirror_dir"]==str(LAB)
    assert j["family"].startswith("hero-ik-")
    assert j["rig_parts"]==["torso","thigh","calf","paw"]
    return j

def changes():
    return set(subprocess.check_output(
      ["git","diff","--name-only","HEAD"],cwd=ROOT,text=True).splitlines()+
      subprocess.check_output(
      ["git","ls-files","--others","--exclude-standard"],cwd=ROOT,text=True).splitlines())

def validate():
    j=job()
    pack_rel=Path("art/characters/hero")/j["family"]
    altered=changes()
    source=MAIN/pack_rel
    assert str(source/"generate.py") in altered,"Artist must provide actual reproducible texture source"
    allowed_files={str(base/name) for base in (MAIN,LAB)
                    for name in ("animation.js","hero-kinematics.js","hero-rig-renderer.js",
                                 "game.js","index.html","art/actor-packs.json","visuals.js")}
    prefixes=[str(base/pack_rel)+"/" for base in (MAIN,LAB)]
    extras=[p for p in altered if p not in allowed_files
            and not any(p.startswith(pre) for pre in prefixes)
            and not p.startswith("artifacts/")]
    assert not extras,"Rig artist edited unrelated gameplay or CI: "+str(sorted(extras)[:30])
    assert str(MAIN/"art/actor-packs.json") in altered,"New pack MUST be selected in active runtime manifest"
    manifest_main=json.loads((ROOT/MAIN/"art/actor-packs.json").read_text())
    manifest_lab=json.loads((ROOT/LAB/"art/actor-packs.json").read_text())
    assert manifest_main==manifest_lab,"Main and Night99 must load the identical canonical rig"
    hero=manifest_main["characters"]["hero"]
    assert hero["family"]==j["family"],"Art must replace active hero renderer family"
    parts=hero.get("rig",{}).get("parts")
    assert isinstance(parts,dict) and set(parts)==set(j["rig_parts"]),"Expected four independent painted rig parts"
    for part in j["rig_parts"]:
        info=parts[part]
        assert info["url"]==str(pack_rel/(part+".png"))
        width=info.get("frames",0)*96 if part=="torso" else info.get("width")
        height=info.get("bearings",0)*96 if part=="torso" else info.get("height")
        assert width and height and width<=1024 and height<=1024,(part,"invalid dimensions")
        assert part!="torso" or (info["frames"]>=3 and info["bearings"]==8)
        files=[ROOT/base/pack_rel/(part+".png") for base in (MAIN,LAB)]
        for path in files:
            assert path.is_file() and str(path.relative_to(ROOT)) in altered,path
            with Image.open(path) as img:
                assert img.mode=="RGBA" and img.size==(width,height),(part,img.mode,img.size)
                alpha=img.getchannel("A")
                assert alpha.getextrema()==(0,255),"Translucent part must be properly masked"
                bbox=alpha.getbbox()
                assert bbox and (bbox[2]-bbox[0])*(bbox[3]-bbox[1])>.08*img.width*img.height,(part,"blank painted texture")
                if part=="torso":
                    # Authoritative upper-body image MUST NOT contain immobile
                    # legacy legs under the waist; IK limbs own that region.
                    for facing in range(8):
                        for frame in range(info["frames"]):
                            tile=img.crop((frame*96,facing*96,(frame+1)*96,(facing+1)*96))
                            lower=tile.crop((0,76,96,96)).getchannel("A")
                            assert sum(1 for x in lower.getdata() if x>=128)<50,(
                                "Static lower-body pixels remain in upper torso! "+str((facing,frame)))
            assert hashlib.sha256(path.read_bytes()).digest()==hashlib.sha256(files[0].read_bytes()).digest(),(
                "Main and lab images differ: "+part)
    for base in (MAIN,LAB):
        for script in ("hero-kinematics.js","hero-rig-renderer.js","animation.js"):
            assert (ROOT/base/script).is_file(),(base,script)
        assert "CATA_HERO_KINEMATICS" in (ROOT/base/"game.js").read_text()
        assert "kinematics:anim.gaitPose" in (ROOT/base/"game.js").read_text()
        assert "CATA_HERO_RIG_RENDER" in (ROOT/base/"animation.js").read_text()
        assert "hero-rig-renderer.js" in (ROOT/base/"index.html").read_text()
    assert (ROOT/MAIN/"hero-kinematics.js").read_bytes()==(ROOT/LAB/"hero-kinematics.js").read_bytes()
    assert (ROOT/MAIN/"hero-rig-renderer.js").read_bytes()==(ROOT/LAB/"hero-rig-renderer.js").read_bytes()
    assert (ROOT/MAIN/"animation.js").read_bytes()==(ROOT/LAB/"animation.js").read_bytes()
    assert "const STRESS_MODE=false;" in (ROOT/MAIN/"game.js").read_text()
    assert "const STRESS_MODE=true;" in (ROOT/LAB/"game.js").read_text()
    subprocess.run(["node","game_factory/art_department/tests/hero-kinematics.cjs"],cwd=ROOT,check=True)
    print("PASS four painted articulated texture parts, world-planted IK, one active hero rig, mirrored Night99 and untouched gameplay")

"""Modern, reusable, fail-closed character animation pack gate.

Unlike the legacy horizontal-atlas gate, checks the exact multi-directional
texture family consumed by the running game. The author may invent choreography,
but must visibly articulate feet relative to the torso. This file is trusted QA:
the creative agent may not edit it.
"""
from __future__ import annotations
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
from PIL import Image, ImageChops, ImageDraw, ImageOps

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/"artifacts/art-department"
OUT.mkdir(parents=True,exist_ok=True)

def request():
    j=json.loads((ROOT/"game_factory/art_department/jobs/active.json").read_text())
    assert j.get("atlas_layout")=="directional-grid" and j.get("character")=="hero"
    assert j.get("family") and j.get("state_frames") and j.get("states")
    assert set(j["states"])==set(j["state_frames"])
    assert all(8<=int(n)<=32 for n in j["state_frames"].values())
    assert int(j["frame_size"])==96 and int(j["bearings"])==8
    assert j["source_dir"]=="docs/cataclysm-1-0-major"
    assert j["mirror_dir"]=="docs/cataclysm-100-lab"
    return j

def relative(j,mode,kind):
    root=Path(j["source_dir"] if mode=="main" else j["mirror_dir"])
    pack=root/"art"/"characters"/"hero"/j["family"]
    if kind=="pack":return pack
    if kind=="manifest":return root/"art"/"actor-packs.json"
    if kind=="renderer":return root/"animation.js"
    if kind=="game":return root/"game.js"
    raise ValueError(kind)

def files(j):
    p=relative(j,"main","pack")
    return {s:p/(s+".png") for s in j["states"]}

def changed_paths():
    a=subprocess.check_output(["git","diff","--name-only","HEAD"],cwd=ROOT,text=True).splitlines()
    b=subprocess.check_output(["git","ls-files","--others","--exclude-standard"],cwd=ROOT,text=True).splitlines()
    return set(a+b)

def actor_manifest(j,mode):
    p=ROOT/relative(j,mode,"manifest")
    data=json.loads(p.read_text())
    hero=data["characters"]["hero"]
    assert hero["family"]==j["family"],f"{mode}: unchanged hero family, animation won't appear in game"
    assert set(j["states"]).issubset(set(hero["states"])),f"{mode}: missing hero states in real game manifest"
    for s,n in j["state_frames"].items():
        item=hero["states"][s]
        expected=f"characters/hero/{j['family']}/{s}.png"
        assert item["url"]==expected,(mode,s,item["url"])
        assert item["frames"]==n and item["bearings"]==8,(mode,s,item)
        assert 5<=float(item["fps"])<=30,(mode,s,"unreasonable frame speed")
    return hero

def normalize_lower(frame):
    """Remove global bobbing: compare leg silhouettes relative to chest position."""
    a=frame.getchannel("A").point(lambda x:255 if x>=115 else 0)
    torso=a.crop((24,37,73,61))
    pix=torso.load();mass=0;centroid=0
    for y in range(torso.height):
        for x in range(torso.width):
            if pix[x,y]:
                mass+=1;centroid+=(x+24)
    dx=round(48-centroid/max(1,mass))
    # shift only to compensate whole-body translation, preserving actual gait
    aligned=ImageChops.offset(a,dx,0)
    return aligned.crop((14,60,82,94))

def motion_deltas(silhouettes):
    def difference(a,b):
        aa=a.tobytes();bb=b.tobytes()
        union=sum(1 for x,y in zip(aa,bb) if x or y)
        delta=sum(1 for x,y in zip(aa,bb) if x!=y)
        return delta/max(1,union)
    return [difference(silhouettes[i],silhouettes[(i+1)%len(silhouettes)]) for i in range(len(silhouettes))]

def check_motion(j,atlas,state,n,bearing):
    s=int(j["frame_size"])
    imgs=[atlas.crop((k*s,bearing*s,(k+1)*s,(bearing+1)*s)) for k in range(n)]
    lower=[normalize_lower(img) for img in imgs]
    masks=[img.getchannel("A").point(lambda x:255 if x>=115 else 0) for img in imgs]
    # Critical: the moving legs must actually change SHAPE after removing
    # whole-body vertical/sideways translation and torso color/recoil.
    lower_deltas=motion_deltas(lower)
    lower_hashes={hashlib.sha256(x.tobytes()).hexdigest() for x in lower}
    lower_silhouette_changes=sum(x>.035 for x in lower_deltas)
    assert len(lower_hashes)>=min(9,max(6,n//2)),(
        f"{state} direction {bearing}: only {len(lower_hashes)} leg poses; "
        "stop animating only the upper body and frozen feet")
    assert lower_silhouette_changes>=max(5,int(n*.45)),(
        f"{state} direction {bearing}: leg silhouette changes in only {lower_silhouette_changes}/{n} transitions")
    # Large-scale, not palette-only: compare pairs one-quarter gait apart.
    spaced=[lower[i] for i in range(0,n,max(1,n//8))]
    variants=[]
    for image in spaced:
        if not any(min(motion_deltas([image,other])[0],
                       motion_deltas([ImageOps.mirror(image),other])[0])<.06 for other in variants):
            variants.append(image)
    assert len(variants)>=4,(state,bearing,"still only mirrored/palette-shifted lower-body poses")
    return {"leg_unique":len(lower_hashes),"leg_transitions":lower_silhouette_changes,
            "leg_families":len(variants)}

def validate():
    j=request()
    changes=changed_paths()
    main=relative(j,"main","pack")
    generator=main/j["allowed_generator"]
    assert (ROOT/generator).is_file(),f"Missing reproducible animator {generator}"
    assert generator.as_posix() in changes,"Animator must actually be authored/updated"
    # Allow only animation integration in the two supported Cataclysm modes.
    allowed_files={relative(j,m,k).as_posix() for m in ("main","lab")
                   for k in ("manifest","renderer","game")}
    allowed_files|={str(Path(j["source_dir"])/"index.html"),str(Path(j["mirror_dir"])/"index.html")}
    allowed_files|={str(Path(j["source_dir"])/"visuals.js"),str(Path(j["mirror_dir"])/"visuals.js")}
    pack_prefixes=[str(relative(j,m,"pack"))+"/" for m in ("main","lab")]
    bad=[p for p in changes if p not in allowed_files and
         not any(p.startswith(prefix) for prefix in pack_prefixes) and
         not p.startswith("artifacts/")]
    assert not bad,"Animation agent edited unrelated files: "+str(sorted(bad)[:30])
    expected={p.as_posix() for p in files(j).values()}
    assert expected.issubset(changes),"New pack not produced: "+str(expected-changes)
    assert relative(j,"main","manifest").as_posix() in changes,"Modern runtime manifest not integrated"
    for mode in ("main","lab"):actor_manifest(j,mode)
    assert json.loads((ROOT/relative(j,"main","manifest")).read_text())==json.loads(
        (ROOT/relative(j,"lab","manifest")).read_text()),"Main and lab select different actor packs"
    assert (ROOT/relative(j,"main","renderer")).read_bytes()==(ROOT/relative(j,"lab","renderer")).read_bytes(),(
        "Shared character renderer changed in only one game mode")
    for mode in ("main","lab"):
        code=(ROOT/relative(j,mode,"game")).read_text()
        assert "STRESS_MODE="+("false" if mode=="main" else "true") in code,(
            "Campaign must start Night1, Night99 lab must remain independent")
        assert "gaitClock" in code and "catSprite(" in code
    contact=Image.new("RGB",(1100,len(j["states"])*164),"#15232d")
    dc=ImageDraw.Draw(contact)
    report={}
    for row,(state,path) in enumerate(files(j).items()):
        assert path.as_posix() in changes, "Atlas not regenerated: "+state
        with Image.open(ROOT/path) as atlas:
            n=int(j["state_frames"][state])
            assert atlas.mode=="RGBA"
            assert atlas.size==(n*96,8*96),(state,atlas.size)
            assert atlas.getchannel("A").getextrema()==(0,255),(state,"alpha missing")
            ds=[]
            for bearing in (0,2,4,6):
                frames=[atlas.crop((i*96,bearing*96,(i+1)*96,(bearing+1)*96)) for i in range(n)]
                assert len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})>=max(8,n-3),(
                    state,bearing,"duplicate frames")
                if state in {"walk","run","sprint","overdrive","shield-run","feral","adrenaline","run-fire"}:
                    ds.append(check_motion(j,atlas,state,n,bearing))
            report[state]=ds
            dc.text((8,row*164+7),state,fill="#ffffff")
            # Mix bearings and time phases, with each image displayed at twice
            # real game size AND a 48px thumbnail, so frozen feet are obvious.
            for i,(bearing,phase) in enumerate(((0,0),(0,n//4),(0,n//2),(0,3*n//4),
                                                (2,n//4),(4,n//2),(6,3*n//4))):
                image=atlas.crop((phase*96,bearing*96,(phase+1)*96,(bearing+1)*96))
                tile=image.resize((128,128),Image.Resampling.NEAREST)
                contact.paste(tile.convert("RGB"),(130+i*135,row*164+14))
                contact.paste(image.resize((32,32),Image.Resampling.NEAREST).convert("RGB"),
                              (146+i*135,row*164+143-20))
    contact.save(OUT/"animation-contact.png")
    (OUT/"mechanical-gate.json").write_text(json.dumps(report,indent=2))
    # Production mirrors updated by artist; do not overwrite independent lab
    # game.js (it contains a different STRESS_MODE and spawn setup).
    for state,src in files(j).items():
        dst=relative(j,"lab","pack")/(state+".png")
        assert dst.is_file() and src.is_file(),(src,dst)
        assert hashlib.sha256((ROOT/src).read_bytes()).digest()==hashlib.sha256(
            (ROOT/dst).read_bytes()).digest(), "Night99 shows different "+state+" artwork"
    print("PASS modern character art gate",len(j["states"]),"fully integrated eight-direction actions")

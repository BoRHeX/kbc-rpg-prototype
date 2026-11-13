"""One surgical visual correction to the preserved Cataclysm 1.0 IK candidate.

The existing four painted parts and gameplay remain untouched. Increase actual
knee/foot silhouette travel instead of generating more art or lowering QA.
Both game modes get byte-identical gait/render logic. Fail if source changed.
"""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[2]
MODES=("cataclysm-1-0-major","cataclysm-100-lab")
REPLACEMENTS={
    "const cadence=moving?clamp(.95+speedRatio*1.15,1.1,4.5):0;":
    "const cadence=moving?clamp(1.12+speedRatio*1.46,1.3,5.5):0;",
    "const phase=fract(rig.cycle),stanceFrac=.58;":
    "const phase=fract(rig.cycle),stanceFrac=.51;",
    "const stride=clamp(12+speedRatio*8,13,31),lift=moving?clamp(4+speedRatio*4,5,16):0;":
    "const stride=clamp(16+speedRatio*14,18,43),lift=moving?clamp(6+speedRatio*5.5,8,21):0;",
    "const hip={x:side*6.3,y:4+brace};":
    "const hip={x:side*7.3,y:4+brace};",
    "const foot={x:clamp(side*7+(world.x-x)*.48,-21,21),":
    "const foot={x:clamp(side*9+(world.x-x)*.82,-30,30),",
    "y:clamp(26+(world.y-y)*.29-air,8,37)};":
    "y:clamp(28+(world.y-y)*.38-air*1.18,5,40)};",
    "const ik=solveIK(hip,foot,14.5,15.5,bend);":
    "const ik=solveIK(hip,foot,17,18,bend);",
}
RENDER_REPLACEMENTS={
    "const w=part.drawWidth||18,h=part.drawHeight||11;":
    "const w=part.drawWidth||21,h=part.drawHeight||13;",
}
for name in MODES:
    base=ROOT/"docs"/name
    path=base/"hero-kinematics.js"
    content=path.read_text()
    for old,new in REPLACEMENTS.items():
        assert content.count(old)==1,(name,"gait unexpectedly changed",old)
        content=content.replace(old,new)
    path.write_text(content)
    path=base/"hero-rig-renderer.js"
    content=path.read_text()
    for old,new in RENDER_REPLACEMENTS.items():
        assert content.count(old)==1,(name,"renderer unexpectedly changed",old)
        content=content.replace(old,new)
    path.write_text(content)
    path=base/"art/actor-packs.json"
    data=json.loads(path.read_text())
    hero=data["characters"]["hero"]
    assert hero["family"]=="hero-ik-rig-v1"
    parts=hero["rig"]["parts"]
    for k,w in (("thigh",17),("calf",14),("paw",23)):
        assert k in parts
        parts[k]["drawWidth"]=w
    parts["paw"]["drawHeight"]=13
    path.write_text(json.dumps(data,indent=2)+"\n")
main=ROOT/"docs"/MODES[0]
lab=ROOT/"docs"/MODES[1]
for relative in ("hero-kinematics.js","hero-rig-renderer.js","art/actor-packs.json"):
    assert (main/relative).read_bytes()==(lab/relative).read_bytes(),relative
print("PASS: single existing rig, visibly larger planted/passing steps and knee articulation, matching campaign/lab; no new art or gameplay rules")

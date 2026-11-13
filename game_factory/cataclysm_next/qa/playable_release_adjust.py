"""Minimal, idempotent adjustments to the recovered, previously QA-accepted Cataclysm 1.0 candidate.

Only the playable campaign initial XP level and the disposable Night 100 lab scenario
are changed. Do not regenerate or discard art, score, animation or world work.
"""
from pathlib import Path

root=Path("docs")
campaign=root/"cataclysm-1-0-major"/"game.js"
lab=root/"cataclysm-100-lab"/"game.js"

src=campaign.read_text()
old="level:0,damage:1"
new="level:1,damage:1"
if old in src:
    assert src.count(old)==1, "ambiguous level initialization"
    src=src.replace(old,new,1)
elif new not in src:
    raise RuntimeError("Campaign starter level initialization is unrecognized")
campaign.write_text(src)

src=lab.read_text()
# Apply the QA-only override at the moment the night-100 lab actually releases
# an encounter. This works even if the development team changed queue setup.
marker="function releaseLabSpawn(){"
injection="""function releaseLabSpawn(){
    if(game && game.campaign.night===100 &&
       new URLSearchParams(location.search).has('qaNight100') &&
       game.labFinalSpawned===0 && game.labQueue?.length>1){
      // The QA scenario gets ONE boss. This does not touch the full campaign.
      game.labQueue=game.labQueue.filter(item=>item.id==='boss').slice(0,1);
      game.labFinalTotal=game.labQueue.length;
    }
"""
if marker in src:
    assert src.count(marker)==1, "ambiguous lab spawn function"
    src=src.replace(marker,injection,1)
elif injection not in src:
    raise RuntimeError("Night 100 QA spawn function is unrecognized")
lab.write_text(src)
print("PASS recovered Cataclysm campaign level 1 and QA-only single boss; painted art preserved")

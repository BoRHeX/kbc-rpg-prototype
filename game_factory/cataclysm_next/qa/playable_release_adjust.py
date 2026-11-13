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
old="g.labWave=wave;g.labQueue=wave.queue.map(x=>({...x}));g.labNextSpawn=g.t;"
replacement="""g.labWave=wave;g.labQueue=wave.queue.map(x=>({...x}));g.labNextSpawn=g.t;
    // Isolated QA Night100 scenario: ONE boss, not an 18-enemy horde.
    // The full campaign and its director's original roster are unchanged.
    if(n===100&&new URLSearchParams(location.search).has('qaNight100'))
      g.labQueue=g.labQueue.filter(item=>item.id==='boss').slice(0,1);"""
if old in src:
    assert src.count(old)==1, "ambiguous final-encounter init"
    src=src.replace(old,replacement,1)
elif replacement not in src:
    raise RuntimeError("Night 100 QA spawn initialization is unrecognized")
lab.write_text(src)
print("PASS recovered Cataclysm campaign starts at level 1; test Night100 summons one boss; art preserved")

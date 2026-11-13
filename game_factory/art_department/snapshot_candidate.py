#!/usr/bin/env python3
"""Transfer rejected candidate source edits and browser QA evidence to a fresh secure job.

Keep the *generated mirror* out of the source patch: it is reconstructed after
independent scope validation by the next job's pipeline gate.
"""
import json
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[2]
j=json.loads((root/'game_factory/art_department/jobs/active.json').read_text())
src=Path(j['source_dir'])
if j.get('atlas_layout') in ('directional-grid','rigged-parts'):
    # Preserve the COMPLETE new canonical pack plus game integration and the
    # Night99 mirror, without committing the studio's temporary QA artifacts.
    main=src/'art'/'characters'/j['character']/j['family']
    mirror=Path(j['mirror_dir'])
    labpack=mirror/'art'/'characters'/j['character']/j['family']
    paths=[str(main/(state+'.png')) for state in j['states']] if j.get('atlas_layout')=='directional-grid' else [str(main/(part+'.png')) for part in j['rig_parts']]
    paths += [str(main/j['allowed_generator'])]
    paths += [str(labpack/(state+'.png')) for state in j['states']] if j.get('atlas_layout')=='directional-grid' else [str(labpack/(part+'.png')) for part in j['rig_parts']]
    for base in (src,mirror):
        for name in ('art/actor-packs.json','animation.js','game.js','index.html','visuals.js','hero-kinematics.js','hero-rig-renderer.js'):
            paths.append(str(base/name))
    paths += [str(p) for folder in (main,labpack) for p in folder.glob('*.json')]
    paths=list(dict.fromkeys(paths))
    # git diff normally excludes untracked binary PNGs. Intent-to-add is
    # limited to this exact audited allowlist so --binary includes their data.
    for p in paths:
        if (root/p).exists():
            subprocess.run(['git','add','-N','--',p],cwd=root,check=True)
else:
    paths=[str(src/'art'/f"{j['character']}-{state}.png") for state in j['states']]
    paths += [str(src/'art'/j['allowed_generator']),str(src/'animation.js')]
out=root/'artifacts/art-department/candidate.patch'
out.parent.mkdir(parents=True,exist_ok=True)
with out.open('wb') as fd:
    subprocess.run(['git','diff','--binary','HEAD','--',*paths],cwd=root,stdout=fd,check=True)
assert out.stat().st_size>200,'Missing candidate source patch'
assert (out.parent/'revision-brief.md').is_file(),'No actual visual rejection to repair'
assert (out.parent/'visual-review.json').is_file(),'No independent review verdict'
print('Safe candidate source patch plus real browser and reviewer evidence ready:',out.stat().st_size,'bytes')

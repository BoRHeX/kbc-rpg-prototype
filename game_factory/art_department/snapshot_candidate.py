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

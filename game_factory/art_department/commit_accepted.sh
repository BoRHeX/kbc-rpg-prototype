#!/usr/bin/env bash
# Commit only an independently accepted art candidate and create one PR.
set -euo pipefail
test -s artifacts/art-department/accepted.json
python - <<'PY'
import json
from pathlib import Path
v=json.loads(Path('artifacts/art-department/accepted.json').read_text())
j=json.loads(Path('game_factory/art_department/jobs/active.json').read_text())
if v.get('verdict',{}).get('pass') is not True or v.get('request_id') != j.get('request_id'):
    raise SystemExit('Candidate missing review acceptance for active job')
keys=('identity','motion','quality','integration')
if j.get('atlas_layout') in ('directional-grid','rigged-parts'):
    keys+=('leg_motion',)
if any(v['verdict'].get(key,0)<j['minimum_visual_score'] for key in keys):
    raise SystemExit('Candidate scored below visual acceptance threshold')
print('Publishing independently accepted art candidate, review attempt',v['attempt'])
PY
branch="studio/art-department-${GITHUB_RUN_ID}"
git config user.name "BoRHeZ Art Department"
git config user.email "github-actions[bot]@users.noreply.github.com"
git checkout -b "$branch"
python - <<'PY'
import json,subprocess
from pathlib import Path
j=json.loads(Path('game_factory/art_department/jobs/active.json').read_text())
src=Path(j['source_dir']);mirror=Path(j['mirror_dir'])
if j.get('atlas_layout') in ('directional-grid','rigged-parts'):
    pack=src/'art'/'characters'/j['character']/j['family']
    mirrorpack=mirror/'art'/'characters'/j['character']/j['family']
    paths=[pack/(s+'.png') for s in j['states']] if j.get('atlas_layout')=='directional-grid' else [pack/(part+'.png') for part in j['rig_parts']]
    paths += [mirrorpack/(s+'.png') for s in j['states']] if j.get('atlas_layout')=='directional-grid' else [mirrorpack/(part+'.png') for part in j['rig_parts']]
    paths += [pack/j['allowed_generator']]
    paths += [p for folder in (pack,mirrorpack) for p in folder.glob('*.json')]
    paths += [folder/name for folder in (src,mirror) for name in
              ('art/actor-packs.json','animation.js','game.js','index.html','visuals.js','hero-kinematics.js','hero-rig-renderer.js')]
else:
    paths=[src/'art'/f"{j['character']}-{s}.png" for s in j['states']]
    paths += [src/'art'/j['allowed_generator'],src/'animation.js']
    paths += [mirror/'art'/f"{j['character']}-{s}.png" for s in j['states']]
paths=list(dict.fromkeys(paths))
subprocess.run(['git','add','--',*[str(p) for p in paths if p.is_file()]],check=True)
PY
git diff --cached --check
git diff --cached --quiet && { echo "::error::No accepted art changes"; exit 1; }
git commit -m "Cataclysm 1.0: independent visual QA accepted articulated hero motion"
gh auth setup-git
git push --set-upstream origin "$branch"
pr="$(gh pr create --base main --head "$branch" --title "Cataclysm 1.0: independently approved character motion" --body "Character-only animation improvement from the reusable Art Department. Reproducible atlas generation, frame/silhouette validation, all gameplay and real-browser tests, full-cycle motion visual review, automatic revisions if rejected, and independent minimum 4/5 identity/motion/quality/integration acceptance. Version remains 1.0. Evidence is in the originating workflow artifacts.")"
echo "pr=${pr##*/}" >> "$GITHUB_OUTPUT"
echo "Accepted character PR: $pr" >> "$GITHUB_STEP_SUMMARY"

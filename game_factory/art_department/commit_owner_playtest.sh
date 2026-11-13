#!/usr/bin/env bash
# Owner-requested playable Cataclysm 1.0. This is NOT independent art approval.
set -euo pipefail
test -s artifacts/art-department/runtime-parts.json
test -s artifacts/art-department/run-cycle.png
test -s artifacts/art-department/visual-review.json
python - <<'PY'
import json
from pathlib import Path
j=json.loads(Path('game_factory/art_department/jobs/active.json').read_text())
assert j['game']=='cataclysm' and j['character']=='hero' and j['atlas_layout']=='rigged-parts'
assert j['family']=='hero-ik-rig-v1' and j['source_dir']=='docs/cataclysm-1-0-major'
for base in ('docs/cataclysm-1-0-major','docs/cataclysm-100-lab'):
    manifest=json.loads((Path(base)/'art/actor-packs.json').read_text())
    assert manifest['characters']['hero']['family']==j['family'],base
    assert all((Path(base)/'art/characters/hero'/j['family']/(part+'.png')).is_file()
               for part in ('torso','thigh','calf','paw'))
v=json.loads(Path('artifacts/art-department/visual-review.json').read_text())
print('Explicit owner playtest: independent art review NOT accepted:',v)
PY
branch="studio/art-department-\${GITHUB_RUN_ID}"
git config user.name "BoRHeZ Games Studio"
git config user.email "github-actions[bot]@users.noreply.github.com"
git checkout -b "$branch"
python - <<'PY'
import json,subprocess
from pathlib import Path
j=json.loads(Path('game_factory/art_department/jobs/active.json').read_text())
paths=[]
for folder in (Path(j['source_dir']),Path(j['mirror_dir'])):
    pack=folder/'art/characters/hero'/j['family']
    paths.extend(pack/(p+'.png') for p in j['rig_parts'])
    paths.extend(folder/p for p in
        ('art/actor-packs.json','animation.js','visuals.js','game.js',
         'index.html','hero-kinematics.js','hero-rig-renderer.js'))
paths.append(Path(j['source_dir'])/'art/characters/hero'/j['family']/j['allowed_generator'])
subprocess.run(['git','add','--',*[str(p) for p in paths if p.is_file()]],check=True)
PY
git diff --cached --check
test -n "$(git diff --cached --name-only)"
git commit -m "Cataclysm 1.0 owner playtest: animated white-cat IK gait (visual polish open)"
gh auth setup-git
git push --set-upstream origin "$branch"
pr="$(gh pr create --base main --head "$branch" \
  --title "Cataclysm 1.0 owner playtest: playable articulated hero" \
  --body "OWNER PLAYTEST — not independent art approval. User explicitly requested a playable 1.0 from the existing near-complete game. Reuse original game, soundtrack, companion/enemy progression, fish, bosses, cards and dialogue. Only the white-cat animated character pack is new. All source/unit, 8 viewport, live WASD IK and browser gameplay tests pass. Independent art review still rated leg animation below 4/5. This remains a known visual limitation for subsequent polish. Strict visual review evidence remains in workflow artifacts. Preserve Night1 main and Night99 lab.")"
echo "pr=\${pr##*/}" >> "$GITHUB_OUTPUT"
echo "OWNER PLAYTEST (not final art acceptance): $pr" >> "$GITHUB_STEP_SUMMARY"

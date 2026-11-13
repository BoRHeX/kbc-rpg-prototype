"""Make a rejected animation gate automatically actionable by the next studio runner."""
from pathlib import Path
import json
import os

root=Path(__file__).resolve().parents[2]
out=root/'artifacts/art-department'
out.mkdir(parents=True,exist_ok=True)
job=json.loads((root/'game_factory/art_department/jobs/active.json').read_text())
phase=os.environ.get('ART_REVIEW_ATTEMPT','1')
log=out/('mechanical-gate-'+phase+'.log')
detail=log.read_text(errors='replace')[-16000:] if log.exists() else 'No recorded stdout; inspect the failing CI step.'
head=detail[-9000:]
brief=(
    '# Autonomous revision after mechanical animation rejection\n\n'
    'The independent validator rejected the previous candidate BEFORE visual review. '
    'Do not modify, remove or weaken validation. Correct the actual generated '
    'sprite art, generator, new pack manifests and game animation binding. '
    'Preserve approved gameplay and character appearance.\n\n'
    'You must inspect the exact exception/test output below and resolve its root. '
    'If the error concerns immobile feet, make real thigh/knee/paw movement '
    'with visible planted, passing, airborne and strike poses, not more colors.\n\n'
    '## Independent failing gate\n\n'+head+'\n'
)
(out/'revision-brief.md').write_text(brief)
verdict={'pass':False,'identity':0,'motion':0,'quality':0,'integration':0,
         'leg_motion':0,'concerns':['Mechanical gate failure: '+head[-1400:]]}
(out/'visual-review.json').write_text(json.dumps(verdict,indent=2)+'\n')
(out/f'visual-review-attempt-{phase}.json').write_text(json.dumps(verdict,indent=2)+'\n')
print('Produced automatic animation repair brief from real CI mechanical error, attempt',phase)

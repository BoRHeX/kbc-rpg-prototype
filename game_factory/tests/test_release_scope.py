"""Scope loss, staged-source integrity and fail-closed publishing regressions."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import yaml
from game_factory import mobile_jobs as mobile
from game_factory import release_scope as release


def scope():
    return {'previous_qa_run': 43087177881, 'qa_feedback': 'Full scope was omitted.',
            'requirements': [dict(id='requirement-'+s, stage=s, owner=o,
                description='Implement '+s, verification='Execute actual '+s+' state checks')
                for s,o in zip(release.STAGES, ('designer','researcher','engineer','designer'))]}


def request():
    return {'id':'complete-release-test','game':'cataclysm','mode':'update',
            'title':'Cataclysm 1.0','prompt':'Complete the entire release.',
            'release_version':'1.0','acceptance':['Complete all four subsystems.'],
            'release_scope':scope()}


def answer(action):
    return dict(claim='Planned',rationale='Requirement coverage',objections=[],
                proposed_action=action,required_evidence=['Actual gameplay'])


def plan():
    return {'release_scope':scope(),'stage_order':list(release.STAGES),
            'requirements':{r['id']:{'files':['game.js'],'symbols':'tick',
                'implementation':'Implement actual game state','verification':'Run actual-source checks'}
                for r in scope()['requirements']},
            'critic':answer({'blockers':[]}),
            'producer':answer({'blockers':[],'stage_contracts':{s:'Implement '+s for s in release.STAGES}})}


def report(stage):
    return {'stage':stage,'blockers':[], 'requirements':{
        r['id']:{'status':'implemented','source':'game.js actual tick state',
                 'verification':'Executed the game source and asserted transitions'}
        for r in scope()['requirements'] if stage=='repair' or r['stage']==stage}}


def proof():
    results={r['id']:{'status':'implemented','evidence':'Source and executed checks'} for r in scope()['requirements']}
    return {'request':request(),'scope_completion':{'contract_digest':mobile.digest(scope()),
            'reports':{s:report(s) for s in release.STAGES},'qa_requirements':results},
            'qa':answer({'approve_preview':True,'requirements':copy.deepcopy(results)})}


class Memory:
    def register(self, role, model, agent_id=None):
        return agent_id or role


class ReleaseScopeTests(unittest.TestCase):
    def test_duplicate_or_unassigned_scope_cannot_enter_pipeline(self):
        for mutation in ('duplicate','stage','owner','empty-stage'):
            value=scope()
            if mutation=='duplicate':value['requirements'][1]['id']=value['requirements'][0]['id']
            if mutation=='stage':value['requirements'][1]['stage']='skip-evolution'
            if mutation=='owner':value['requirements'][1]['owner']='random-agent'
            if mutation=='empty-stage':value['requirements'][1]['stage']='foundation'
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                release.validate_scope(value)

    def test_ordinary_workflow_does_not_spend_on_a_full_release(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);path=root/'game_factory/requests/current.json';path.parent.mkdir(parents=True)
            path.write_text(json.dumps(request()))
            output=root/'outputs'
            with patch.object(mobile,'ROOT',root),patch.dict(os.environ,{'GITHUB_OUTPUT':str(output)},clear=False):
                with patch.dict(os.environ,{},clear=False):
                    os.environ.pop('FULL_RELEASE_PIPELINE',None)
                    mobile.prepare_command()
            self.assertIn('active=false',output.read_text())
            self.assertFalse((root/'artifacts').exists())

    def test_planning_assigns_every_requirement_instead_of_selecting_two(self):
        calls=[]
        def ask(memory, agent, run, task, refs, **kwargs):
            calls.append(agent)
            if agent=='cataclysm.release-evidence':
                return answer({'coverage_complete':True,'omissions':[], 'observations':[]})
            if agent in release.ROLES:
                owned=[r for r in scope()['requirements'] if r['owner']==agent]
                return answer({'requirements':{r['id']:plan()['requirements'][r['id']] for r in owned},'evidence_notes':[]})
            if agent=='critic':return answer({'blockers':[]})
            return answer({'blockers':[],'stage_contracts':{s:'Keep '+s for s in release.STAGES}})
        result=release.plan_release(Memory(),'model',{'request':request(),'target':'docs/cataclysm','run_id':'123-1'},
                                    {'private_gameplay':{'transcript':'private speech must not be published'}},ask)
        self.assertEqual(set(result['requirements']),{r['id'] for r in scope()['requirements']})
        self.assertNotIn('selected_ids',str(result))
        self.assertNotIn('private speech',str(result))
        self.assertEqual(calls,['cataclysm.release-evidence',*release.ROLES,'critic','producer'])

    def test_old_two_feature_plan_cannot_erase_complete_scope(self):
        value=plan();value['requirements'].pop('requirement-evolution')
        with self.assertRaisesRegex(ValueError,'every requirement'):
            release.validate_plan(value,scope())
        value=plan();value['producer']=answer({'selected_ids':['designer','researcher'],'blockers':[]})
        with self.assertRaisesRegex(ValueError,'four stages'):
            release.validate_plan(value,scope())

    def test_stage_cannot_defer_or_fabricate_requirement_coverage(self):
        for mutation in ('missing','blocked','deferred','no-evidence'):
            value=report('foundation');key='requirement-foundation'
            if mutation=='missing':value['requirements'].clear()
            if mutation=='blocked':value['blockers']=['Do it later']
            if mutation=='deferred':value['requirements'][key]['status']='deferred'
            if mutation=='no-evidence':value['requirements'][key]['verification']=''
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                release.validate_stage_report(value,scope(),'foundation')

    def test_publisher_rejects_missing_stage_and_inconsistent_qa_approval(self):
        release.verify_completion(proof())
        value=proof();value['scope_completion']['reports'].pop('evolution')
        with self.assertRaisesRegex(ValueError,'four implementation reports'):
            release.verify_completion(value)
        value=proof();key='requirement-evolution'
        value['scope_completion']['qa_requirements'][key]['status']='missing'
        value['qa']['proposed_action']['requirements'][key]['status']='missing'
        with self.assertRaisesRegex(ValueError,'every release requirement'):
            release.verify_completion(value)
        value=proof();value['scope_completion']['contract_digest']='changed'
        with self.assertRaisesRegex(ValueError,'changed complete-release'):
            release.verify_completion(value)

    def fixture(self):
        tmp=self.enterContext(tempfile.TemporaryDirectory());root=Path(tmp);work=root/'artifacts/mobile';work.mkdir(parents=True)
        target=root/'docs/cataclysm';target.mkdir(parents=True)
        for n in ('index.html','game.js','game.css'):(target/n).write_text('baseline')
        (root/'game_factory').mkdir()
        (root/'game_factory/MOBILE_CODER_PROMPT.md').write_text('Implement allowed game files and report actual checks.')
        subprocess.run(['git','init','-q'],cwd=root,check=True)
        subprocess.run(['git','-c','user.email=test@example.invalid','-c','user.name=test','add','docs','game_factory'],cwd=root,check=True)
        subprocess.run(['git','-c','user.email=test@example.invalid','-c','user.name=test','commit','-qm','baseline'],cwd=root,check=True)
        (root/'.gitignore').write_text('artifacts/\n')
        subprocess.run(['git','add','.gitignore'],cwd=root,check=True)
        subprocess.run(['git','-c','user.email=test@example.invalid','-c','user.name=test','commit','-qm','ignore runtime'],cwd=root,check=True)
        job=mobile.prepare(root,request(),'123-1');(work/'job.json').write_text(json.dumps(job));(work/'plan.json').write_text(json.dumps(plan()))
        self.enterContext(patch.object(mobile,'ROOT',root));self.enterContext(patch.object(mobile,'WORK',work))
        self.enterContext(patch.dict(os.environ,{'EXPECTED_JOB_DIGEST':mobile.digest(job),'EXPECTED_PLAN_DIGEST':mobile.digest(plan()),
            'RELEASE_STAGE':'foundation','PREVIOUS_STAGE':'','PASS_GATE_OUTCOME':'success'}))
        return root,work,target,job

    def test_checkpoint_restores_exact_predecessor_and_rejects_corruption(self):
        root,work,target,job=self.fixture();release.prepare_pass_command()
        (target/'game.js').write_text('implemented foundation')
        (work/'STAGE_REPORT.json').write_text(json.dumps(report('foundation')))
        (work/'CODER_REPORT.md').write_text('Actual foundation implementation and checks')
        release.checkpoint_command()
        shutil_source=work/'checkpoint';previous=work/'previous'
        import shutil
        shutil.copytree(shutil_source,previous)
        (target/'game.js').write_text('baseline again')
        with patch.dict(os.environ,{'RELEASE_STAGE':'evolution','PREVIOUS_STAGE':'foundation'}):
            release.prepare_pass_command()
        self.assertEqual((target/'game.js').read_text(),'implemented foundation')
        (previous/'source/game.js').write_text('corrupted')
        with self.assertRaisesRegex(ValueError,'hash mismatch'):
            release.restore_checkpoint(job,previous,'foundation')

    def test_failed_gate_saves_candidate_but_cannot_advance(self):
        root,work,target,job=self.fixture();release.prepare_pass_command()
        (target/'game.js').write_text('unfinished but valuable code')
        (work/'STAGE_REPORT.json').write_text(json.dumps(report('foundation')))
        (work/'CODER_REPORT.md').write_text('Work remains')
        with patch.dict(os.environ,{'PASS_GATE_OUTCOME':'failure'}),self.assertRaisesRegex(ValueError,'gate failed'):
            release.checkpoint_command()
        self.assertEqual((work/'checkpoint/source/game.js').read_text(),'unfinished but valuable code')
        self.assertFalse(json.loads((work/'checkpoint/checkpoint.json').read_text())['passed'])
        with self.assertRaisesRegex(ValueError,'incomplete predecessor'):
            release.restore_checkpoint(job,work/'checkpoint','foundation')

    def test_changed_plan_and_skipped_predecessor_are_rejected(self):
        root,work,target,job=self.fixture()
        with patch.dict(os.environ,{'RELEASE_STAGE':'builds','PREVIOUS_STAGE':'foundation'}),self.assertRaisesRegex(ValueError,'skip'):
            release.prepare_pass_command()
        changed=plan();changed['requirements']['requirement-foundation']['implementation']='Altered after plan freeze'
        (work/'plan.json').write_text(json.dumps(changed))
        with self.assertRaisesRegex(ValueError,'changed the council plan'):
            release.prepare_pass_command()

    def test_workflow_order_preservation_and_bounded_content_continuation(self):
        root=Path(__file__).resolve().parents[2]
        main=yaml.load((root/'.github/workflows/cataclysm-complete-release.yml').read_text(),Loader=yaml.BaseLoader)
        helper=yaml.load((root/'.github/workflows/cataclysm-release-pass.yml').read_text(),Loader=yaml.BaseLoader)
        self.assertNotIn('schedule',main['on'])
        for stage,previous in zip(release.STAGES[1:],release.STAGES[:-1]):
            self.assertIn(previous,main['jobs'][stage]['needs'])
            self.assertEqual(main['jobs'][stage]['with']['previous_stage'],previous)
        self.assertIn("needs_repair == 'true'",main['jobs']['continuation']['if'])
        self.assertIn("needs_repair == 'false'",main['jobs']['publish']['if'])
        steps=helper['jobs']['code']['steps']
        code=[s for s in steps if s.get('uses')=='openai/codex-action@v1']
        self.assertEqual(len(code),1)
        saved=next(s for s in steps if s.get('name')=='Preserve candidate even when content QA rejects it')
        self.assertEqual(saved['if'],'always()')
        self.assertEqual(saved['with']['path'],'artifacts/mobile/checkpoint')


if __name__=='__main__':unittest.main()

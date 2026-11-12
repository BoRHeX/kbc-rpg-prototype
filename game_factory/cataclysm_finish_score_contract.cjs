'use strict';
// Immutable independent scoring acceptance: a winning run retains farmed points.
// The two game modes must calculate score identically.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../docs');
const main=path.join(base,'cataclysm-1-0-major');
const lab=path.join(base,'cataclysm-100-lab');
for(const dir of [main,lab]){
  assert.ok(fs.existsSync(path.join(dir,'score.js')),dir+' missing shared score implementation');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
  assert.match(html,/src="\.\/score\.js\?build=[^"]+"/,'Score module must load before game');
  assert.ok(html.indexOf('src="./score.js?')<html.indexOf('src="./game.js?'),'Score must load first');
  assert.match(game,/CATA_SCORE/,'Real game must use shared scoring API');
  assert.doesNotMatch(game,/victory\s*\?\s*MAJOR\.VICTORY_SCORE\s*:/,'Victory must ADD bonus, not replace score');
}
const mainText=fs.readFileSync(path.join(main,'score.js'),'utf8');
const labText=fs.readFileSync(path.join(lab,'score.js'),'utf8');
assert.equal(mainText,labText,'Campaign and laboratory must use same immutable scoring rules');
const scoring=require(path.join(main,'score.js'));
for(const api of ['advanceSurvival','tally','newLedger','awardMilestone']){
  assert.equal(typeof scoring[api],'function','Missing scoring API '+api);
}
assert.equal(scoring.advanceSurvival(0,10,1),20,'Night 1 survival 2 points/sec');
const later=scoring.advanceSurvival(0,10,100);
assert.ok(later>20&&later<100,'Late nights slowly increase survival reward');
assert.equal(scoring.advanceSurvival(100,0,99),100,'Paused time does not advance score');
const ledger=scoring.newLedger();
assert.equal(scoring.awardMilestone(ledger,'night100',999999999),true);
assert.equal(scoring.awardMilestone(ledger,'night100',999999999),false,'Milestone cannot be awarded twice');
assert.equal(ledger.milestonePoints,999999999);
const farmer=scoring.tally({survivalPoints:1234.99,weightedKills:80,fish:45,milestonePoints:ledger.milestonePoints});
const baseScore=Math.floor(1234.99)+80*7+45*9;
assert.equal(farmer.total,999999999+baseScore,'Completion bonus MUST be additive');
const smaller=scoring.tally({survivalPoints:1234.99,weightedKills:10,fish:10,milestonePoints:ledger.milestonePoints});
assert.ok(farmer.total>smaller.total,'A better winning farm must rank higher');
const incomplete=scoring.tally({survivalPoints:1234.99,weightedKills:80,fish:45,milestonePoints:0});
assert.equal(incomplete.total,baseScore);
console.log('PASS 1.0: weighted kills, fish, increasing night survival rewards, additive single-shot 999999999 bonus and shared game/lab formula');

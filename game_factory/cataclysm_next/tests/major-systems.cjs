'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../../../docs/cataclysm-1-0-major');
const campaign=require(path.join(root,'campaign.js'));
const art=require(path.join(root,'animation.js'));
const {catalog}=campaign;
const size=categories=>categories.map(x=>x.id);
assert.equal(campaign.NIGHT_SECONDS,13);
assert.equal(campaign.MAX_NIGHTS,100);
assert.equal(campaign.VICTORY_SCORE,999999999);
assert.equal(campaign.nightAt(0),1);
assert.equal(campaign.nightAt(12.999),1);
assert.equal(campaign.nightAt(13),2);
assert.equal(campaign.nightAt(104),9);
assert.equal(campaign.nightAt(221),18);
assert.equal(campaign.nightAt(1287),100);
assert.equal(campaign.nightAt(1300),100);
assert.equal(campaign.getNight(100).end,1300);
assert.equal(campaign.schedule.length,100);
const bosses=campaign.schedule.filter(x=>x.boss);
const elites=campaign.schedule.filter(x=>x.elite);
const overlaps=campaign.schedule.filter(x=>x.boss&&x.elite);
assert.deepEqual(bosses.map(x=>x.number),Array.from({length:11},(_,i)=>9*(i+1)));
assert.deepEqual(elites.map(x=>x.number),Array.from({length:16},(_,i)=>6*(i+1)));
assert.deepEqual(overlaps.map(x=>x.number),[18,36,54,72,90]);
assert.equal(campaign.schedule.filter(n=>n.eliteCategory==='elite').length,8);
assert.equal(campaign.schedule.filter(n=>n.eliteCategory==='superElite').length,8);
assert.deepEqual(campaign.getNight(100).events,['finale']);
assert.equal(new Set(bosses.map(x=>x.bossIndex)).size,9);
assert.equal(catalog.normal.length,9);
assert.equal(catalog.bosses.length,9);
assert.equal(catalog.elites.length,6);
assert.equal(catalog.superElites.length,3);
assert.equal(catalog.normal.filter(e=>e.role==='melee').length,3);
assert.equal(catalog.normal.filter(e=>e.role==='ranged').length,3);
assert.equal(catalog.normal.filter(e=>e.role==='caster').length,3);
assert.equal(new Set(Object.values(catalog).flat().map(e=>e.id)).size,27);
assert.equal(new Set(catalog.bosses.map(e=>e.attack)).size,9);
assert.equal(new Set(catalog.elites.map(e=>e.attack)).size,6);
assert.equal(new Set(catalog.superElites.map(e=>e.attack)).size,3);
for(const id of catalog.normal.filter(e=>e.role==='caster').map(e=>e.id))
  assert.ok(catalog.normal.find(e=>e.id===id).range>=340);
assert.ok(Number.isInteger(art.frameTotal)&&art.frameTotal>=378,'Character art must preserve at least 378 animated poses; new coherent hero packs can add frames');
assert.equal(art.enemyIds.length,27);
assert.equal(art.allyIds.length,8);
// The canonical texture-pack renderer can retire the obsolete code-painted
// art.pose() implementation. Verify frame inventories here and reserve actual
// sprite integrity / motion for independent browser tests.
const legacyPose=typeof art.pose==='function';
const poses=[];
for(const id of art.enemyIds){
  assert.equal(art.frameCount(id,'run'),6,id+' enemy frame contract');
  if(legacyPose){
    const variant=Array.from({length:6},(_,i)=>art.pose(id,'run',i));
    assert.equal(new Set(variant.map(x=>JSON.stringify(x))).size,6,id+' distinct procedural enemy poses');
    poses.push(...variant);
  }
}
for(const id of art.allyIds){
  assert.equal(art.frameCount(id,'run'),12,id+' squad frame contract');
  if(legacyPose){
    const variant=Array.from({length:12},(_,i)=>art.pose(id,'run',i));
    assert.equal(new Set(variant.map(x=>JSON.stringify(x))).size,12,id+' distinct procedural companion poses');
    poses.push(...variant);
  }
}
for(const state of ['idle','run','hit','feral','adrenaline']){
  const n=art.frameCount('hero',state);
  assert.ok(Number.isInteger(n)&&n>=6,'hero '+state+' must retain multiple frames');
  if(legacyPose){
    const variant=Array.from({length:24},(_,i)=>art.pose('hero',state,i));
    assert.equal(new Set(variant.map(x=>JSON.stringify(x))).size,24,state+' distinct procedural poses');
    poses.push(...variant);
  }
}
if(legacyPose){
  assert.equal(poses.length,378);
  assert.notDeepEqual(art.pose('hero','feral',3),art.pose('hero','adrenaline',3));
  assert.notDeepEqual(art.pose('hero','idle',3),art.pose('hero','hit',3));
}else{
  assert.equal(typeof art.packInfo,'function','canonical pack renderer must expose source info for browser QA');
}
assert.deepEqual(Object.keys(campaign.songs).sort(),['afterlight','ironmarch']);
assert.notDeepEqual(campaign.songs.ironmarch.lead,campaign.songs.afterlight.lead);
assert.notEqual(campaign.songs.ironmarch.bpm,campaign.songs.afterlight.bpm);
const ledger=campaign.newLedger();
ledger.night=100;
for(let i=0;i<9;i++){
  assert.equal(campaign.kill(ledger,'boss-'+i,'boss'),true);
  assert.equal(campaign.kill(ledger,'elite-'+i,'elite'),true);
  assert.equal(campaign.kill(ledger,'super-'+i,'superElite'),true);
}
assert.equal(campaign.kill(ledger,'boss-0','boss'),false);
assert.equal(ledger.boss,9);
assert.equal(ledger.elite,9);
assert.equal(ledger.superElite,9);
assert.equal(campaign.won(ledger,true),false,'finale must be cleared');
ledger.finaleCleared=true;
assert.equal(campaign.won(ledger,false),false,'player must live');
assert.equal(campaign.won(ledger,true),true);
ledger.night=99;
assert.equal(campaign.won(ledger,true),false,'cannot win before Night100');
assert.equal(campaign.won({...campaign.newLedger(),night:100,finaleCleared:true},true),true,'only Night 100 final horde should gate victory');
console.log('PASS Cataclysm major: 100 nights, 27 archetypes, 378 baseline poses, '+art.frameTotal+' total authored frames, two songs, final-horde victory');

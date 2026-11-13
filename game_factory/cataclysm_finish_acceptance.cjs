'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const stage=process.argv[2],valid=['score','followers','animation','presentation','balance','personality','polishui'];
assert.ok(valid.includes(stage),'Unexpected finishing stage: '+stage);
const dirs=['cataclysm-1-0-major','cataclysm-100-lab'].map(dir=>path.resolve(__dirname,'../docs',dir));
const read=(i,file)=>fs.readFileSync(path.join(dirs[i],file),'utf8');
const roles=['shooter','healer','tank','brawler','sniper','engineer','trapper','bard'];
for(let i=0;i<2;i++){
 const game=read(i,'game.js'),html=read(i,'index.html');
 assert.match(game,/CATA_SCORE/,'Game source must actually consume scoring module');
 assert.match(html,/src="\.\/score\.js\?build=/,'Score must be wired to page');
 assert.doesNotMatch(game,/victory\s*\?\s*MAJOR\.VICTORY_SCORE\s*:/);
}
if(stage==='score'){console.log('PASS scoring complete and synced');process.exit(0);}
for(let i=0;i<2;i++){
 const src=read(i,'follower-behavior.js');
 assert.match(read(i,'index.html'),/src="\.\/follower-behavior\.js\?build=/);
 assert.match(read(i,'game.js'),/CATA_FOLLOWERS/,'Follower game loop must use common role behavior module');
 assert.ok(src.length>2000,'AI behavior module is implausibly empty');
}
const defs=require(path.join(dirs[0],'follower-behavior.js'));
assert.equal(typeof defs.roleSpecs,'object','Expose roleConfigs for independent QA');
assert.equal(typeof defs.canInterrupt,'function','Expose follower interruption contract');
for(const id of roles){
 const spec=defs.roleSpecs[id];
 assert.ok(spec,'Missing behavior definition: '+id);
 assert.ok(Number.isFinite(spec.moveSpeed)&&spec.moveSpeed>0,'Role speed invalid '+id);
 assert.ok(Number.isFinite(spec.offsetX)&&Number.isFinite(spec.offsetY),'Formation anchor invalid '+id);
}
assert.equal(defs.canInterrupt('tank','guarding'),false,'Guarding tank is unstoppable');
assert.equal(defs.canInterrupt('brawler','attacking'),false,'Attacking brawler is unstoppable');
assert.equal(defs.canInterrupt('tank','recovering'),true,'Tank recovery CAN be interrupted');
assert.equal(defs.canInterrupt('brawler','recovering'),true,'Brawler recovery CAN be interrupted');
assert.equal(defs.canInterrupt('sniper','aiming'),true,'Sniper aiming can be interrupted');
console.log('PASS 8 role-specific follower speeds, formation positions, interruption contract');
if(stage==='followers')process.exit(0);
for(let i=0;i<2;i++){
 const manifest=JSON.parse(read(i,'art/character-animations.json'));
 const heroAim=manifest.characters?.hero?.aim;
 assert.ok(heroAim&&heroAim.frames===8,'Hero requires eight real painted gun-direction poses');
 const heroFile=path.join(dirs[i],'art','characters','hero','aim.png');
 assert.ok(fs.existsSync(heroFile),'Hero directional artwork missing');
 const heroPng=fs.readFileSync(heroFile);
 assert.equal(heroPng.readUInt32BE(16),8*96,'Hero gun bearing sprite dimensions incorrect');
 assert.equal(heroPng.readUInt32BE(20),96);
 for(const role of roles){
   for(const state of ['attack','special','hit']){
      const entry=manifest.characters?.[role]?.[state];
      assert.ok(entry&&entry.frames>=6,'Missing painted behavioral animation '+role+':'+state);
      const file=path.join(dirs[i],'art','characters',role,state+'.png');
      assert.ok(fs.existsSync(file),'Missing physical painted sprite '+file);
      const png=fs.readFileSync(file);
      assert.equal(png.subarray(1,4).toString(),'PNG');
      assert.equal(png.readUInt32BE(16),entry.frames*96,'Sprite width must equal frames*96');
      assert.equal(png.readUInt32BE(20),96,'Sprite height must be 96');
   }
 }
 for(let t=0;t<4;t++)assert.ok(fs.existsSync(path.join(dirs[i],'art',`ground-${t}.png`)));
 for(const p of ['prop-building.png','prop-car.png','prop-dumpster.png'])assert.ok(fs.existsSync(path.join(dirs[i],'art',p)));
}
console.log('PASS 24 actual pose atlases, 7 city textures and game/lab parity');
if(stage==='animation')process.exit(0);
for(let i=0;i<2;i++){
 assert.match(read(i,'index.html'),/upgrade-overlay/);
 assert.match(read(i,'game.css'),/upgrade/);
 assert.match(read(i,'game.js'),/rerollMajorChoices/,'Existing 4-choice reroll system retained');
}
if(stage==='presentation'){console.log('PASS presentation retained upgrade and reroll systems');process.exit(0);}
for(let i=0;i<2;i++){
 const game=read(i,'game.js');
 assert.doesNotMatch(game,/p.invs*=s*Math.max(p.inv,s*17)/,'No artificial 17 second finale invulnerability');
 assert.doesNotMatch(game,/g.player.invs*=s*Math.max(g.player.inv,s*17)/,'No artificial 17 second finale invulnerability');
 assert.match(game,/finalizeMajorVictory/,'Actual final enemy and victory gate retained');
 assert.match(game,/CATA_SCORE/);
}
console.log('PASS Cataclysm 1.0 independent finishing acceptance, combat finale and all dependencies');

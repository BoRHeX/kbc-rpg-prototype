'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const gameRoot=path.resolve(__dirname,'../../../docs');
const mode=(name)=>require(path.join(gameRoot,name,'director.js'));
for(const name of ['cataclysm-1-0-major','cataclysm-100-lab']){
 const dir=mode(name);
 assert.equal(dir.FINAL_INTERVAL_SECONDS,9,'each final major encounter starts nine seconds apart');
 assert.equal(dir.finalHorde.length,18,'18 real distinct final encounters');
 assert.deepEqual(dir.finalHorde.map(x=>x.id),[...Array(9).fill('boss'),...Array(3).fill('superElite'),...Array(6).fill('elite')]);
 assert.deepEqual(dir.finalHorde.slice(0,9).map(x=>x.index),[8,7,6,5,4,3,2,1,0]);
 assert.equal(typeof dir.normalSpawnInterval,'function','ordinary mobs use a continuous time-based rate controller');
 const low={elapsed:20,alive:6,cap:72,hpFraction:1,killRate:1};
 const late={...low,elapsed:1200};
 const dense={...low,alive:60};
 const hurt={...low,hpFraction:.15};
 const rate=(arg)=>dir.normalSpawnInterval(arg);
 for(const test of [low,late,dense,hurt,{...low,elapsed:12.99},{...low,elapsed:13.01}]){
  const interval=rate(test);
  assert.ok(Number.isFinite(interval)&&interval>=.15&&interval<=6,'bounded positive ordinary spawn interval: '+name);
 }
 assert.ok(rate(late)<=rate(low),'continuous game pressure may increase over time');
 assert.ok(rate(dense)>rate(low),'crowding must reduce spawn rate');
 assert.ok(rate(hurt)>=rate(low),'critically injured player gets breathing room');
 assert.ok(Math.abs(rate({...low,elapsed:12.99})-rate({...low,elapsed:13.01}))<.15,'13-second milestone is not a mob-spawn reset');
 const run=dir.create(123456);
 const waves=[];
 for(let night=1;night<=100;night++){
  const w=run.plan(night);waves.push(w);
  assert.equal(w.night,night);
  assert.ok(w.interval>0);
 }
 assert.ok(waves[98].queue.some(x=>x.id==='boss'),'prelude boss remains scheduled');
 assert.equal(waves[99].interval,9,'finale timing is not 0.9 seconds');
 assert.deepEqual(waves[99].queue.map(x=>x.id),dir.finalHorde.map(x=>x.id));
}
console.log('PASS Cataclysm: continuous bounded normal spawning independent of nights and 9-second 18-major finale');

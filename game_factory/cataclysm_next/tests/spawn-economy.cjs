'use strict';
const assert=require('node:assert/strict');
const director=require('../../../docs/cataclysm-1-0-major/director.js');
const {create,healthScale,priceFor,finalHorde}=director;
assert.equal(healthScale(1),1);
assert.ok(healthScale(99)>2);
assert.ok(priceFor('shambler',99)>priceFor('shambler',1));
assert.equal(finalHorde.length,18);
assert.deepEqual(finalHorde.map(x=>x.id),[...Array(9).fill('boss'),...Array(3).fill('superElite'),...Array(6).fill('elite')]);
assert.deepEqual(finalHorde.slice(0,9).map(x=>x.index),[8,7,6,5,4,3,2,1,0]);
assert.deepEqual(finalHorde.slice(9,12).map(x=>x.index),[2,1,0]);
assert.deepEqual(finalHorde.slice(12).map(x=>x.index),[5,4,3,2,1,0]);
const d=create(123456),waves=[];
for(let n=1;n<=100;n++){
 const w=d.plan(n);waves.push(w);
 assert.equal(w.night,n);assert.ok(w.spent>=0&&w.unspent>=-.01,'no overspending at '+n);
 assert.ok(w.bankAfter>=0,'bank nonnegative '+n);
 assert.ok(w.interval>0,'positive spawn interval '+n);
 if(n<100){assert.equal(w.scripted,false);assert.ok((w.queue.length-1)*w.interval<13,'wave fits 13s at '+n);
  const actual=Math.round(w.queue.reduce((t,e)=>t+e.cost,0)*10)/10;
  assert.ok(Math.abs(actual-w.spent)<.001,'prices reconcile at '+n);
  for(const item of w.queue)assert.equal(item.cost,priceFor(item.id,n));
 }else{
  assert.equal(w.scripted,true);assert.equal(w.spent,0);
  assert.equal(w.interval,.9);assert.equal(w.queue.length,18);
  assert.deepEqual(w.counts,{boss:9,superElite:3,elite:6});
  assert.equal(w.bankAfter,waves[98].bankAfter,'credits stop after Night 99');
 }
}
assert.equal(waves[0].night,1);assert.ok(waves[98].queue.some(x=>x.id==='boss'),'Night 99 prelude boss must be affordable');
const b=create(123456);for(let n=1;n<=99;n++)b.plan(n);
const repeat=b.plan(100);
assert.deepEqual(repeat.queue,waves[99].queue,'deterministic finale');
console.log('PASS 100-night spawn budget, scaled enemy prices, 99 boss and scripted 18-major finale');

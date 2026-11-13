/* Pure milestone/event planner and continuous ordinary spawn pacing.
   Historical credit plans remain bookkeeping only; live normal releases use normalSpawnInterval. */
(function(root){
'use strict';
const NIGHT_SECONDS=13,FINAL_NIGHT=100,FINAL_INTERVAL_SECONDS=9;
// Seconds between individual releases; no credits accumulate at a night boundary.
function normalSpawnInterval({elapsed=0,alive=0,cap=54,hpFraction=1,killRate=0}={}){
 const finite=(v,f)=>Number.isFinite(v)?v:f;
 const t=Math.max(0,finite(elapsed,0)),density=Math.max(0,finite(alive,0))/Math.max(1,finite(cap,54));
 const pressure=1+1.6*(1-Math.exp(-t/600));
 const recovery=1+1.4*Math.max(0,1-Math.min(1,finite(hpFraction,1)));
 return Math.max(.16,Math.min(1.5,.64/pressure*recovery*(1+3*density*density)/(1+Math.min(2,Math.max(0,finite(killRate,0)))*.18)));
}
const NORMAL=Object.freeze([
 {id:'shambler',cost:1,rank:1,role:'melee'},
 {id:'dasher',cost:2,rank:2,role:'melee'},
 {id:'weaver',cost:5,rank:3,role:'ranged'},
 {id:'stalker',cost:2.6,rank:3,role:'melee'},
 {id:'orbiter',cost:7,rank:4,role:'ranged'},
 {id:'ghost',cost:12,rank:5,role:'ranged'},
 {id:'hexer',cost:9,rank:6,role:'caster'},
 {id:'summoner',cost:10,rank:7,role:'caster'},
 {id:'blight',cost:9,rank:8,role:'caster'}
]);
const COSTS=Object.freeze({...Object.fromEntries(NORMAL.map(x=>[x.id,x.cost])),elite:18,superElite:26,boss:34});
const SURPRISE_NIGHTS=Object.freeze([17,38,59,83]);
const healthScale=n=>1+Math.max(0,Math.min(99,n-1))*.011;
const priceFor=(id,n)=>Math.round(COSTS[id]*healthScale(n)*10)/10;
const rankOf=id=>NORMAL.find(x=>x.id===id)?.rank||({elite:9,superElite:10,boss:11})[id]||0;
const FINAL_HORDE=Object.freeze([
 ...Array.from({length:9},(_,i)=>Object.freeze({id:'boss',index:8-i,rank:11-i*.2,cost:0})),
 ...Array.from({length:3},(_,i)=>Object.freeze({id:'superElite',index:2-i,rank:10-i*.2,cost:0})),
 ...Array.from({length:6},(_,i)=>Object.freeze({id:'elite',index:5-i,rank:9-i*.2,cost:0}))
]);
function isPeak(n){return n%9===0||n%6===0||SURPRISE_NIGHTS.includes(n)||n===100;}
function reserveShare(n){
 if(n>=95&&n<100)return [0,.08,.14,.21,.23,.20][n-94];
 for(let gap=1;gap<=5;gap++)if(isPeak(n+gap))return [0,.38,.29,.21,.14,.08][gap];
 return 0;
}
const budgetForNight=n=>Math.floor(12+n*.95);
function create(seed=990100){
 let state=seed>>>0,bank=0,lastNight=0,totalSpent=0,totalEarned=0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 function plan(n){
  if(!Number.isInteger(n)||n!==lastNight+1||n<1||n>100)throw Error('Director requires sequential nights 1–100');
  if(n===100){
   lastNight=100;
   return Object.freeze({night:100,income:0,reserved:0,released:0,bankAfter:bank,budget:0,spent:0,unspent:0,
    isPeak:true,isSurprise:false,rank:11,interval:FINAL_INTERVAL_SECONDS,scripted:true,queue:FINAL_HORDE,
    counts:Object.freeze({boss:9,superElite:3,elite:6})});
  }
  const income=budgetForNight(n),peak=isPeak(n),reserved=Math.floor(income*reserveShare(n));
  // Day 96/99 savings are deliberately protected for the coming endgame.
  const release=peak&&n!==96&&n!==99?bank:0;
  bank=bank-release+reserved;
  const budget=income-reserved+release,queue=[];
  const spent=()=>Math.round(queue.reduce((total,e)=>total+e.cost,0)*10)/10;
  const buy=(id)=>{
   const cost=priceFor(id,n);
   if(!Number.isFinite(cost)||spent()+cost>budget+.0001)return false;
   queue.push({id,cost,rank:rankOf(id)});return true;
  };
  if(n===99)buy('boss');
  else{
   if(n%9===0)buy('boss');
   if(n%6===0)buy((n/6)%2===1?'elite':'superElite');
  }
  const tier=Math.min(9,1+Math.floor((n-1)/11));
  const order=NORMAL.filter(e=>e.rank<=tier);
  const max=n>=95?24:Math.min(22,5+Math.floor(n/8));
  const weight=e=>Math.max(1,9-2*Math.abs(e.rank-(tier-1)));
  for(let attempts=0;queue.length<max&&attempts<200;attempts++){
   const remaining=budget-spent(),choices=order.filter(e=>priceFor(e.id,n)<=remaining+.0001&&(e.role==='melee'||queue.filter(q=>NORMAL.find(a=>a.id===q.id)?.role!=='melee').length<Math.floor((queue.length+1)/3)));
   if(!choices.length)break;
   const sum=choices.reduce((total,e)=>total+weight(e),0);
   let roll=rand()*sum,chosen=choices[choices.length-1];
   for(const e of choices){roll-=weight(e);if(roll<0){chosen=e;break;}}
   if(!buy(chosen.id))break;
  }
  if(n===99)queue.sort((a,b)=>a.id==='boss'?-1:b.id==='boss'?1:0);
  const total=spent(),unspent=Math.round((budget-total)*10)/10;
  lastNight=n;totalSpent+=total;totalEarned+=income;
  return Object.freeze({night:n,income,reserved,released:release,bankAfter:bank,budget,spent:total,unspent,
   isPeak:peak,isSurprise:SURPRISE_NIGHTS.includes(n),rank:tier,interval:Math.min(.9,12.3/Math.max(1,queue.length)),scripted:false,
   queue:Object.freeze(queue.map(e=>Object.freeze({...e}))),
   counts:Object.freeze(queue.reduce((counts,e)=>(counts[e.id]=(counts[e.id]||0)+1,counts),{}))});
 }
 function primeTo(n){let wave;while(lastNight<n)wave=plan(lastNight+1);return wave;}
 function snapshot(){return {seed,bank,lastNight,totalSpent,totalEarned,rankPrices:COSTS,surprises:[...SURPRISE_NIGHTS]};}
 return Object.freeze({plan,primeTo,snapshot});
}
function xpRequired(level){return [6,8,10,13,16,20,24,28,32,36][Math.max(1,Math.floor(level))-1]??(7+3*Math.max(1,Math.floor(level)));}
const API=Object.freeze({xpRequired,create,normal:NORMAL,costs:COSTS,priceFor,healthScale,finalHorde:FINAL_HORDE,
 FINAL_INTERVAL_SECONDS,normalSpawnInterval,rankOf,isPeak,reserveShare,budgetForNight,SURPRISE_NIGHTS,NIGHT_SECONDS,FINAL_NIGHT});
root.CATA_LAB_DIRECTOR=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);

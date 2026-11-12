/* Night 99–100 balance lab. Deterministic, seedable spawn-point economy.
   A wave has an allocation (income + bank); only purchased enemies can spawn.
   Ordinary waves save an increasing share of their budget before a peak.
   No unplanned timer spawns, no negative credits, no fabricated boss count gates. */
(function(root){
'use strict';
const NIGHT_SECONDS=13, FINAL_NIGHT=100;
const NORMAL=Object.freeze([
 {id:'shambler',cost:1,rank:1,role:'melee'},
 {id:'dasher',cost:2,rank:2,role:'melee'},
 {id:'weaver',cost:3,rank:3,role:'ranged'},
 {id:'stalker',cost:3,rank:3,role:'melee'},
 {id:'orbiter',cost:4,rank:4,role:'ranged'},
 {id:'ghost',cost:5,rank:5,role:'ranged'},
 {id:'hexer',cost:6,rank:6,role:'caster'},
 {id:'summoner',cost:7,rank:7,role:'caster'},
 {id:'blight',cost:8,rank:8,role:'caster'}
]);
const COSTS=Object.freeze({...Object.fromEntries(NORMAL.map(x=>[x.id,x.cost])),elite:18,superElite:26,boss:34});
const SURPRISE_NIGHTS=Object.freeze([17,38,59,83,100]);
const ORDER=Object.freeze([...NORMAL].sort((a,b)=>a.cost-b.cost));
const rankOf=id=>NORMAL.find(x=>x.id===id)?.rank||({elite:9,superElite:10,boss:11})[id]||0;
function isPeak(n){return n===100||n%9===0||n%6===0||SURPRISE_NIGHTS.includes(n);}
function isSurprise(n){return SURPRISE_NIGHTS.includes(n);}
function reserveShare(n){
 if(n>=95&&n<100)return [0,.08,.14,.21,.29,.38][n-94];
 for(let gap=1;gap<=5;gap++)if(isPeak(n+gap)){
   return [0,.38,.29,.21,.14,.08][gap];
 }
 return 0;
}
function budgetForNight(n){return Math.floor(25+n*.8);}
function create(seed=990100){
 let state=seed>>>0,bank=0,lastNight=0,totalSpent=0,totalEarned=0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 function plan(n){
  if(n!==lastNight+1||n<1||n>100)throw Error('Director requires sequential nights');
  const income=budgetForNight(n),peak=isPeak(n);
  const reserved=Math.floor(income*reserveShare(n));
  if(!peak||n===96||n===99){ /* Finale reserves survive the elite and boss milestones. */ }
  const release=peak&&n!==96&&n!==99?bank:0;
  if(release)bank=0;
  bank+=reserved;
  const budget=income-reserved+release;
  const queue=[],specials=[];
  const buy=(id)=>{
   if(!Number.isInteger(COSTS[id]))throw Error('Unknown enemy '+id);
   const spent=queue.reduce((acc,item)=>acc+COSTS[item.id],0);
   if(spent+COSTS[id]>budget)return false;
   queue.push({id,cost:COSTS[id],rank:rankOf(id)});return true;
  };
  if(n===99)buy('boss');
  else if(n===100){
   for(const enemy of NORMAL)buy(enemy.id);
   buy('elite');buy('superElite');
  }else{
   if(n%9===0)buy('boss');
   if(n%6===0)buy((n/6)%2===1?'elite':'superElite');
  }
  const normalBudget=budget-queue.reduce((acc,item)=>acc+item.cost,0);
  const tier=Math.min(8,1+Math.floor((n-1)/11));
  const order=ORDER.filter(x=>x.rank<=tier);
  const maximum=n===100?33:n>=95?24:Math.min(22,5+Math.floor(n/8));
  // Balanced power vs quantity. Late-game monsters get substantial weight.
  const weight=x=>Math.max(1,9-Math.abs(x.rank-(n===100?7:tier-1))*2);
  let attempts=0;
  while(queue.length<maximum&&attempts++<200){
    const remaining=budget-queue.reduce((acc,item)=>acc+item.cost,0);
    const choices=order.filter(x=>x.cost<=remaining);
    if(!choices.length)break;
    const total=choices.reduce((acc,x)=>acc+weight(x),0);
    let roll=rand()*total,choice=choices[choices.length-1];
    for(const x of choices){roll-=weight(x);if(roll<0){choice=x;break;}}
    if(!buy(choice.id))break;
  }
  if(n===100){
    // The final sequence is curated, not an uncontrolled random arrival.
    // Cheapest first, casters and elite threats nearer the finale; prelude boss remains in play.
    queue.sort((a,b)=>a.rank-b.rank);
  }else if(n===99)queue.sort((a,b)=>a.id==='boss'?-1:b.id==='boss'?1:0);
  const spent=queue.reduce((acc,item)=>acc+item.cost,0);
  const unspent=budget-spent;
  const result=Object.freeze({
   night:n,income,reserved,released:release,bankAfter:bank,budget,spent,unspent,
   isPeak:peak,isSurprise:isSurprise(n),rank:tier,interval:n===100?1:n>=95?.45:.9,
   queue:Object.freeze(queue.map(x=>Object.freeze({...x}))),
   counts:Object.freeze(queue.reduce((acc,x)=>(acc[x.id]=(acc[x.id]||0)+1,acc),{}))
  });
  lastNight=n;totalSpent+=spent;totalEarned+=income;
  return result;
 }
 function primeTo(n){
  if(n<lastNight)throw Error('Cannot rewind director');
  let last=null;
  while(lastNight<n)last=plan(lastNight+1);
  return last;
 }
 function snapshot(){return {seed,bank,lastNight,totalSpent,totalEarned,rankPrices:COSTS,surprises:[...SURPRISE_NIGHTS]};}
 return Object.freeze({plan,primeTo,snapshot});
}
const API=Object.freeze({create,normal:NORMAL,costs:COSTS,rankOf,isPeak,reserveShare,budgetForNight,SURPRISE_NIGHTS,NIGHT_SECONDS,FINAL_NIGHT});
root.CATA_LAB_DIRECTOR=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);

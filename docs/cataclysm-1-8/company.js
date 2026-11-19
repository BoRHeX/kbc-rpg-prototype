/* Department A simulation contract. No DOM, timers, network or combat RNG. */
(function(root){
'use strict';
const identities={
 shooter:['shooter','Crossfire: piercing double volley'],healer:['healer','Field hospital: moving triage'],tank:['tank','Bulwark: emergency sanctuary'],brawler:['brawler','Pounce: stunning cleave'],sniper:['sniper','Rail whisker: six-body shot'],engineer:['engineer','Walking workshop: long-lived turret'],trapper:['trapper','Thicket: wide lasting nets'],bard:['bard','Encore: healing anthem'],
 angler:['trapper','Deep pockets: two-fish catches'],scout:['sniper','Watchtower: mass weak-point marks'],alchemist:['healer','Catalyst: food-powered healing cloud'],salvager:['engineer','Scrap factory: recycled kill turret'],saboteur:['trapper','Blackout: caster disruption field'],stormcaller:['bard','Tempest: chain lightning storm'],courier:['shooter','Express meal: feeds two allies'],hexcat:['sniper','Ninefold hex: elite armor breaker']};
const newRoles=Object.keys(identities).slice(8);
function init(c){if(c.level)return;c.level=1;c.work=0;c.food=0;c.energy=70;c.nextWork=0;c.evolved=false;}
function earn(c,n){init(c);c.work+=n;const old=c.level;c.level=c.work>=75?3:c.work>=24?2:1;c.evolved=c.level===3;return old!==c.level;}
function ledger(g){return g.companyFish||(g.companyFish={spawned:0,player:0,eaten:0});}
function eat(g,c,f){const i=g.fishItems.indexOf(f);if(i<0)return false;init(c);g.fishItems.splice(i,1);ledger(g).eaten+=f.value;c.food+=f.value;c.energy=Math.min(100,c.energy+f.value*25);earn(c,f.value*6);return true;}
function committed(g,r){return g.companionSquad.some(c=>c.type===r||c.components?.some(a=>a.type===r));}
function fuse(g){const a=g.companionSquad.find(c=>c.type==='engineer'&&c.level===3),b=g.companionSquad.find(c=>c.type==='shooter'&&c.level===3);if(!a||!b)return null;const c={...a,type:'mecha',components:[a,b],turret:null,traps:[],pendingSpecial:false,forage:null,level:3,rank:1,phase:'following',state:'building',heat:0,mechaStage:'build',mechaClock:2,shotTimer:0};g.companionSquad=g.companionSquad.filter(x=>x!==a&&x!==b);g.companionSquad.push(c);return c;}
function steal(g,f){
  const i=g.fishItems.indexOf(f);
  if(i<0||f.value<1||f.attracted||f.companionCollected||(f.reservedRole&&f.reservedUntil>g.t))return 0;
  const value=Math.min(2,f.value),l=ledger(g);
  l.stolen=(l.stolen||0)+value;
  f.value-=value;
  if(!f.value)g.fishItems.splice(i,1);
  return value;
}
function returnStolen(g,value){
  const l=ledger(g);l.stolen=Math.max(0,(l.stolen||0)-value);
  l.spawned-=value; // addFish accounts for this transfer back to the ground.
}
function diagnostics(g){const l=ledger(g),onGround=g.fishItems.reduce((s,f)=>s+f.value,0),roles=g.companionSquad.flatMap(c=>c.components?c.components.map(a=>a.type):[c.type]);return {fish:{...l,onGround,balance:l.spawned-l.player-l.eaten-(l.stolen||0)-onGround},slots:g.companionSquad.length,unique:new Set(roles).size===roles.length,roster:g.companionSquad.map(c=>({role:c.type,level:c.level,work:c.work,food:c.food,state:c.state,evolution:identities[c.type]?.[1],components:c.components?.map(a=>a.type),heat:c.heat,stage:c.mechaStage}))};}
root.CATA_COMPANY={identities,newRoles,init,earn,ledger,eat,steal,returnStolen,committed,fuse,diagnostics};
if(typeof module==='object')module.exports=root.CATA_COMPANY;
})(globalThis);

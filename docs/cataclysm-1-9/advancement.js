/* Distilled Advancement uses active simulation time and an isolated seed stream. */
(function(root){
  'use strict';
  const recipes={trawl:['angler','trapper'],spotter:['scout','sniper']};
  const names={trawl:'Trawl Team',spotter:'Spotter Pair'};
  const skies=['clear','rain','fog','storm'];
  const moods=['curious','worried','determined','excited'];
  const hash=(g,d,n,salt)=>root.CATA_LONG_NIGHT.hash(g.longNight.rng.root^Math.imul(d+1,7919)^Math.imul(n+1,104729)^salt);
  const ready=(g,type)=>recipes[type].map(role=>g.companionSquad.find(c=>c.type===role&&c.level===3&&c.work>=75&&!c.components&&(c.mergeAfter||0)<=g.t));
  function merge(g,type){
    const parents=ready(g,type);
    if(!parents.every(Boolean)||g.companionSquad.length>4)return false;
    for(const p of parents){
      p.forage=null;p.castTarget=null;p.traps=[];p.turret=null;p.pendingSpecial=false;p.committed=false;
      p.phase='following';p.state='following';p.specialDuration=0;
      for(const f of g.fishItems)if(f.reservedRole===p.type){delete f.reservedRole;delete f.reservedUntil;}
    }
    const a=parents[0];
    const crew={...a,type,components:parents,mood:'curious',moodCheck:0,excitedUntil:0,
      actionUntil:0,abilityAt:g.t+2,workTurn:0,windup:null};
    g.companionSquad=g.companionSquad.flatMap(c=>c===a?[crew]:parents.includes(c)?[]:[c]);
    return true;
  }
  function split(g,type,placement){
    const crew=g.companionSquad.find(c=>c.type===type);
    if(!recipes[type]||!crew||g.companionSquad.length>=4||!placement)return false;
    crew.components.forEach((p,i)=>{
      Object.assign(p,i?placement:{x:crew.x,y:crew.y});
      p.mergeAfter=g.t+10;p.specialCooldown=Math.max(10,p.specialCooldown||0);
      p.nextWork=Math.max(10,p.nextWork||0);p.forageCooldown=5;
    });
    g.companionSquad=g.companionSquad.flatMap(c=>c===crew?crew.components:[c]);
    return true;
  }
  const initial=()=>({weather:'clear',district:-1,strike:null,nextStrike:0,mission:null,rushUntil:0,wardUntil:0});
  function weather(g,d){
    const n=g.longNight.night;
    if(n<=3)return 'clear';
    return skies[hash(g,d,Math.floor((n-1)/3),(0x2937^Math.imul(g.longNight.chapter,31337)))%4];
  }
  const range=(sky,distance,spotter=false)=>sky==='fog'?Math.min(distance,spotter?360:300):distance;
  const rainPace=(sky,dashing)=>sky==='rain'&&dashing?.85:1;
  function mood(p,g,energy,danger,mission){
    if(g.t<(p.moodCheck||0))return null;
    p.moodCheck=g.t+2;
    const worried=energy<25||danger;
    if(worried){p.safeAfter=g.t+4;if(energy<25)p.hungryWorry=true;}
    const next=worried||p.mood==='worried'&&(g.t<(p.safeAfter||0)||p.hungryWorry&&energy<35)?'worried':
      mission?'determined':g.t<(p.excitedUntil||0)?'excited':'curious';
    if(next===p.mood)return null;
    if(next!=='worried')p.hungryWorry=false;
    p.mood=next;return next;
  }
  function missionKind(g,chapter){
    return ((hash(g,0,0,0x7523)+chapter)%2===0)?'cache':'rescue';
  }
  function missionTick(g,dt,distance){
    const s=g.advancement,m=s.mission;
    if(m.status==='done')return false;
    if(distance>56){m.hold=0;return false;}
    m.status='active';
    m.hold+=dt;
    if(m.hold+1e-8<(m.kind==='cache'?2:3))return false;
    m.status='done';m.hold=0;
    if(m.kind==='cache')s.rushUntil=g.t+6;else s.wardUntil=g.t+12;
    return true;
  }
  function ward(g){
    if(!(g.advancement?.wardUntil>g.t))return false;
    g.advancement.wardUntil=0;return true;
  }
  function mark(g,e,damage,source){
    if(source==='spotter'||!(e.spotterMark>g.t))return damage;
    e.spotterMark=0;return damage*1.2;
  }
  root.CATA_ADVANCEMENT={recipes,names,skies,moods,hash,initial,ready,merge,split,weather,range,rainPace,mood,missionKind,missionTick,ward,mark};
})(globalThis);

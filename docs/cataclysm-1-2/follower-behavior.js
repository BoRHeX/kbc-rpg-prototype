/* Shared invulnerable follower state machine. Times are running simulation seconds. */
(function(root){
  'use strict';
  const roleSpecs=Object.freeze({
    shooter:{moveSpeed:275,offsetX:92,offsetY:8,prepare:.18,act:.12,recover:.45,range:540,magazine:6,reload:1.65,hint:'Right flank · six rounds, vulnerable reload'},
    healer:{moveSpeed:255,offsetX:25,offsetY:40,prepare:.9,act:1.6,recover:1.2,range:100,hint:'Stay still nearby for treatment'},
    tank:{moveSpeed:230,offsetX:8,offsetY:-92,prepare:.35,act:2.5,recover:1.6,range:260,hint:'Front guard · vulnerable recharge'},
    brawler:{moveSpeed:335,offsetX:-70,offsetY:-65,prepare:.25,act:.32,recover:.85,range:240,hint:'Front left · lunge then vulnerable rest'},
    sniper:{moveSpeed:240,offsetX:-110,offsetY:92,prepare:1.15,act:.15,recover:1.4,range:780,hint:'Rear left · kneeling clear shot'},
    engineer:{moveSpeed:210,offsetX:110,offsetY:100,prepare:2.2,act:.25,recover:2.5,range:540,hint:'Rear right · hold position to build turret'},
    trapper:{moveSpeed:265,offsetX:-55,offsetY:-22,prepare:.85,act:.2,recover:2.1,range:300,hint:'Stay within 110 to help place snare'},
    bard:{moveSpeed:250,offsetX:0,offsetY:120,prepare:.5,act:3,recover:.8,range:260,hint:'Song draws brief attention · stay ready to dodge'}
  });
  function canInterrupt(role,state){return !!roleSpecs[role]&&!(role==='tank'&&state==='guarding')&&!(role==='brawler'&&state==='attacking');}
  function init(p){
    if(p.followerStats)return p;
    p.animationTime=0;p.state='following';p.phase='following';p.stateTime=0;p.protection=0;p.ammo=roleSpecs[p.type].magazine||0;
    p.followerStats={casts:0,specialCasts:0,interrupts:0,aborts:0,usefulSeconds:0,stateSeconds:{},hits:{melee:0,projectile:0}};return p;
  }
  function enter(p,phase,time=0,label=phase){init(p);p.phase=phase;p.state=label;p.stateTime=time;p.animationTime=0;p.actionLength=time;}
  function interrupt(p,source='melee'){
    init(p);p.followerStats.hits[source]=(p.followerStats.hits[source]||0)+1;
    if(p.protection>0||p.phase==='interrupted'||!canInterrupt(p.type,p.state))return false;
    p.followerStats.interrupts++;p.pendingSpecial=false;p.specialDuration=0;p.committed=false;
    enter(p,'interrupted',.42);p.protection=1.5;return true;
  }
  function tick(p,dt){
    init(p);p.animationTime+=dt;p.protection=Math.max(0,p.protection-dt);p.stateTime=Math.max(0,p.stateTime-dt);
    const stats=p.followerStats;stats.stateSeconds[p.state]=(stats.stateSeconds[p.state]||0)+dt;
    if(p.phase==='acting'&&p.productive)stats.usefulSeconds+=dt;
    if(p.phase==='interrupted'&&p.stateTime===0)enter(p,'following');
  }
  const api={roleSpecs,canInterrupt,init,enter,interrupt,tick};
  root.CATA_FOLLOWERS=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);

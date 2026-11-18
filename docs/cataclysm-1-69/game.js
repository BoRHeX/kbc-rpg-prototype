/* CATACLYSM: fully original mobile-first Canvas arcade by BoRHeZ Games. */
'use strict';
(function () {
  const BUILD = '1.69';
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), ctx = canvas.getContext('2d', {alpha:false});
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches && new URLSearchParams(location.search).get('motion')!=='full';
  const MIN_SHOT_INTERVAL = .04;
  const PATCH_ID = 'cataclysm-169-the-wild-card';
  const WORLD_SCROLL_Y=0; // World coordinates change only through chosen movement or physical contact.
  const MAJOR = globalThis.CATA_MAJOR, ART = globalThis.CATA_ART, VIS = globalThis.CATA_VISUALS, LAB = globalThis.CATA_LAB_DIRECTOR, HAZ = globalThis.CATA_HAZARDS;
  const STRESS_MODE=false;
  const LAB_MODE=true, FIRE=globalThis.CATA_LAB_FIRE;
  if(!LAB||!FIRE||!HAZ)throw Error('Director, firestorm or hazard animation module failed to load');
  if(!MAJOR||!ART||!VIS)throw Error('Catastrophe visual/campaign/animation modules did not load');
  const CATS = globalThis.CATA_CATS;
  if(!CATS)throw Error("Cat personality module failed to load");
  const FOLLOWERS = globalThis.CATA_FOLLOWERS;
  if(!FOLLOWERS)throw Error("Follower behavior module failed to load");
  const SCORE = globalThis.CATA_SCORE;
  if(!SCORE)throw Error('Scoring module failed to load');
  const AUDIO_PASS_ID = 'the-wild-card';
  const UNLOCKS = {shambler:0,weaver:40,dasher:50,orbiter:70,stalker:85,hexer:95,ghost:140,summoner:160,blight:190,gas:240};
  const availableThreats = t => Object.keys(UNLOCKS).filter(k=>t>=UNLOCKS[k]);
  let W = 1280, H = 720;
  const TWO = Math.PI * 2;
  const cfg = {speed:235,enemySpeed:63,spawnInterval:1.65,shotInterval:.62,
    enemyHp:3,spawnRamping:.010,fishDropChance:.09,maxEnemies:95};
  fetch('./game-config.json', {cache:'no-store'}).then(r => r.ok ? r.json() : null).then(data => {
    if (!data || typeof data !== 'object') return;
    for (const [key, value] of Object.entries(data)) {
      if (Object.prototype.hasOwnProperty.call(cfg, key) && typeof value === 'number' &&
          Number.isFinite(value) && value > 0) cfg[key] = value;
    }
  }).catch(() => { /* defaults are a complete playable configuration */ });
  let game = null, last = 0, keys = {}, pointer = null, muted = false, audio = null;
  let volume=.7;
  try {muted=localStorage.getItem('cataclysm-muted')==='true';const saved=localStorage.getItem('cataclysm-volume');if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch(e){}
  function saveAudioPreferences(){try{localStorage.setItem('cataclysm-muted',String(muted));localStorage.setItem('cataclysm-volume',String(volume));}catch(e){}}
  let musicBus = null, musicNext = 0, musicBeat = 0;
  let seeded = 424242, stars = [], city = [], noticeTTL = 0, noticeQueue = [];
  const rand = () => ((seeded = (Math.imul(1664525, seeded) + 1013904223) >>> 0) / 4294967296);
  const clamp = (v, lo, hi) => Math.min(hi,Math.max(lo,v));
  const WORLD_SIZE = 1340; // Two painted 670-unit street blocks per streamed chunk.
  function wrapCoord(value) { return value; }
  function wrappedDelta(from,to) { return to-from; }
  function verticalDelta(from,to){return to-from;}
  function dist(x,y,x2,y2) { return Math.hypot(wrappedDelta(x,x2),verticalDelta(y,y2)); }
  const rnd = (a,b)=>a+(b-a)*rand();


  // 1.4 city: geometry and routes share the same collision authority.
  const CITY_NAMES=['Cinder Court','Sluice Market','Ember Depot','Glass Terminus'];
  const cityImages={},cityLifeLedger=new Set();
  for(const name of ['city-wet-street','city-paving-blue','city-asphalt','city-paving-grey','city-shop-warm','city-waterfront','city-shop-neon','city-archway','guardian-frames','mecha-frames']){
    const im=new Image();im.src='./art/animated/'+name+'.png';cityImages[name]=im;
  }
  const cityReady=im=>im&&im.complete&&im.naturalWidth>0;
  const cityDistrict=(x,y)=>Math.max(0,Math.min(1,Math.floor(x/2680)))+2*Math.max(0,Math.min(1,Math.floor(y/2680)));

  // 1.5: dedicated deterministic fishing stream; rewards use the company ledger.
  const fishingImages={};
  for(const name of ['locations','cat','gear','mutant']){const im=new Image();im.src='./art/animated/fishing-'+name+'-strip.png';fishingImages[name]=im;}
  const baitTables={plain:[66,8,8,1,5,12],worm:[62,14,8,1,5,10],fishbone:[45,20,12,3,8,12],catnip:[30,25,16,5,12,12]};
  function fishingInit(){
    const f=game.fishing={rod:0,line:0,bait:'plain',charges:0,ordinal:0,caught:0,jackpot:0,cache:false,awards:[],resolved:[],active:null,spots:[],nonce:crypto.getRandomValues(new Uint32Array(1))[0]};
    for(let d=0;d<4;d++)for(let n=0;n<2;n++){
      const jitter=((Math.imul(game.unseen.seed+d*31+n*97,1664525)>>>0)%160);
      // Wide existing street corridors: approach from plaza without crossing a building.
      const x=d%2*2680+ (n?1550:900)+jitter,y=Math.floor(d/2)*2680+1340;
      f.spots.push({id:d*2+n,d,x,y,water:{x:x-80,y:y-180,w:160,h:100,kind:'water'},used:0,time:0});
    }
    game.unseen.solids.push(...f.spots.map(a=>a.water));game.unseen.solidCacheKey=null;
    for(let d=0;d<4;d++)addFish(d%2*2680+1340,Math.floor(d/2)*2680+1700,4);
  }
  function fishingOdds(bait='plain',tier=0,line=0,cache=false){const w=[...baitTables[bait]];const risk=Math.min(3,tier)*4;w[0]-=risk;w[5]+=risk;const safe=Math.min(4,line*2);w[5]-=safe;w[0]+=safe;if(cache){w[0]+=w[3];w[3]=0;}return w;}
  function fishingAward(id,value){const f=game.fishing;if(f.awards.includes(id))return;f.awards.push(id);f.jackpot=Math.min(10000,f.jackpot+value);}
  function fishingHazard(a){
    const g=game;if(g.enemies.filter(e=>e.fishingHazard).length>=6)return;
    for(let n=0;n<(a.outcome===4?1:3)&&g.enemies.filter(e=>e.fishingHazard).length<6;n++){
      const e=spawnEnemy('shambler',{labPurchase:true});if(!e)continue;
      const q=nearestSafeSpace(a.spot.x+180+n*45,a.spot.y+150,32);
      Object.assign(e,q,{fishingHazard:true,arrivalUntil:g.t+1.2});
      if(a.outcome===4)Object.assign(e,{mutant:true,fishingMutant:true,traits:null,r:32,hp:24,max:24,speed:45,damage:1,rewardValue:6,fishClock:0});
    }
    cityCue('fishing-ambush-tension');notify('SPLASH WARNING · MOVE! Sewer creatures incoming',3);
  }
  function fishingResolve(a){
    const f=game.fishing;if(a.resolved||f.resolved.includes(a.id))return;a.resolved=true;f.resolved.push(a.id);const o=a.outcome;
    if(o>=4){fishingHazard(a);return;}
    const value=[1,3,2,5][o];addFish(a.spot.x,a.spot.y+25,value);f.caught+=value;
    if(o===1)fishingAward('rare-'+a.id,250);
    if(o===2)game.rerollTokens=Math.min(9,game.rerollTokens+1);
    if(o===3){f.cache=true;fishingAward('cache',1000);}
    cityCue(o===3?'fishing-jackpot':o===1?'fishing-rare-catch':'fishing-reel');
    notify(['FISH +1','LEGENDARY LANTERN KOI +3','TREASURE +2 FISH + REROLL','JACKPOT CACHE +5'][o],3);
    f.effect={x:a.spot.x,y:a.spot.y,t:game.t,frame:o===3?5:4};
  }
  function fishingTick(dt,input){
    const g=game,f=g.fishing,p=g.player;if(!f)return;
    const spot=f.spots.find(a=>(a.used<3||f.active?.spot===a)&&g.unseen.open[a.d]&&dist(p.x,p.y,a.x,a.y)<52);
    const moving=Math.hypot(input.x,input.y)>.05;
    if(f.active&&(moving||spot!==f.active.spot||dist(p.x,p.y,f.active.x,f.active.y)>6||p.hp<f.active.hp)){
      const a=f.active;if(a.committed&&a.outcome>=4)fishingHazard(a);f.active=null;cityCue('fishing-reel');
    }
    if(!spot||moving)return;
    if(spot.cooldown>g.t)return;
    spot.time+=dt;
    if(p.hp<=1&&g.enemies.some(e=>dist(e.x,e.y,p.x,p.y)<100))fishingAward('daring-'+spot.id,100);
    if(!f.active){if(!spot.heard){spot.heard=true;cityCue('fishing-water-ambience');}f.active={spot,x:p.x,y:p.y,hp:p.hp,age:0,committed:false};}
    const a=f.active;a.age+=dt;
    if(a.age>=1&&!a.committed){
      a.committed=true;a.bait=f.bait;a.id=++f.ordinal;spot.used++;
      let seed=(g.unseen.seed^f.nonce^Math.imul(a.id,2654435761)^spot.id)>>>0;
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const weights=fishingOdds(f.bait,Math.floor(spot.time/8)+Math.floor((spot.used-1)/3),f.line,f.cache);
      let roll=seed/4294967296*100;a.outcome=weights.findIndex(w=>(roll-=w)<0);
      a.until=4+(seed%200)/100-.1*f.rod;
      if(f.charges>0)MUTANTS.say(g,'Bait is in. Move to pull the line.');
      if(f.charges>0&&!--f.charges)f.bait='plain';cityCue('fishing-cast-splash');
    }
    if(a.committed&&a.age>=a.until-.65&&!a.bite){a.bite=true;cityCue('fishing-bite-warning');}
    if(a.committed&&a.age>=a.until){fishingResolve(a);a.spot.cooldown=g.t+4;f.active=null;}
  }
  function fishingSprite(kind,frame,x,y,size){const im=fishingImages[kind],cell=kind==='gear'?192:256;if(!cityReady(im))return;ctx.drawImage(im,frame*cell,0,cell,cell,x-size/2,y-size/2,size,size);}
  function fishingDraw(){
    const f=game.fishing;if(!f)return;
    for(const a of f.spots){if(dist(a.x,a.y,game.player.x,game.player.y)>Math.max(W,H))continue;
      fishingSprite('locations',a.id%3,a.x,a.y-130,180);
      outline(a.x,a.y,48,a.used>=3?'#768388':'#8de8d9',2);
      ctx.fillStyle='#defef5';ctx.font='12px system-ui';ctx.fillText(a.used>=3?'FISHED OUT':'STOP TO CAST · '+(3-a.used)+' left',a.x-65,a.y+65);
      outline(a.x,a.y-125,12+Math.sin(game.t*3)*4,'#9fffea',2);
    }
    const a=f.active;if(a){const p=game.player,frame=a.bite?6:a.committed?1:5;
      const size=64,x=p.x+35,y=p.y-25;
      // Calibrated to the cleaned 256px crops: the VFX line leaves the painted rod tip.
      const tip=frame===1?[.96,.09]:frame===6?[.88,.05]:[.85,.13];
      const tx=x+(tip[0]-.5)*size,ty=y+(tip[1]-.5)*size;
      fishingSprite('cat',frame,x,y,size);
      ctx.strokeStyle='#ecf9dc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx,ty);ctx.quadraticCurveTo((tx+a.spot.x)/2,Math.min(ty,a.spot.y-125)-20,a.spot.x,a.spot.y-125);ctx.stroke();}
    if(f.effect&&game.t-f.effect.t<1.5)fishingSprite('gear',f.effect.frame,f.effect.x,f.effect.y-35,65);
  }

  function createCity(seed){
    const c={seed,discovered:[true,false,false,false],open:[true,false,false,false],kills:[0,0,0,0],guardians:[null,null,null,null],defeated:[false,false,false,false],solids:[],gates:[],route:null,nextRoute:0};
    for(let d=0;d<4;d++){
      const ox=d%2*2680,oy=Math.floor(d/2)*2680;
      for(let row=0;row<3;row++)for(let col=0;col<3;col++){
        if(row===1&&col===1)continue;
        const jitter=((Math.imul(seed^(d*17+row*3+col),1664525)>>>0)%65);
        c.solids.push({x:ox+340+col*760+jitter,y:oy+340+row*760,w:d===2?180:300,h:d===1?180:d===2?400:280,kind:'building',style:d});
      }
    }
    for(const [a,b,x,y,vertical] of [[0,1,2680,1340,true],[0,2,1340,2680,false],[1,3,4020,2680,false],[2,3,2680,4020,true]])c.gates.push({a,b,x,y,vertical,attempts:0,cooldown:0,active:false,done:false});
    try{const saved=JSON.parse(localStorage.getItem('cataclysm-14-discovery-'+seed));if(Array.isArray(saved)&&saved.length===4)c.discovered=saved;}catch(e){}
    return c;
  }
  function citySolids(){
    const c=game?.unseen;if(!c)return [];
    const signature=c.gates.map(g=>g.done?'1':'0').join('');if(c.solidCacheKey===signature)return c.solidCache;c.solidCacheKey=signature;
    const s=[...c.solids,{x:-200,y:-200,w:5760,h:200},{x:-200,y:5360,w:5760,h:200},{x:-200,y:0,w:200,h:5360},{x:5360,y:0,w:200,h:5360}];
    for(const g of c.gates){
      const base=g.vertical?Math.floor(g.y/2680)*2680:Math.floor(g.x/2680)*2680;
      if(g.vertical){s.push({x:g.x-40,y:base,w:80,h:1140},{x:g.x-40,y:base+1540,w:80,h:1140});if(!g.done)s.push({x:g.x-40,y:g.y-200,w:80,h:400,gate:true});}
      else{s.push({x:base,y:g.y-40,w:1140,h:80},{x:base+1540,y:g.y-40,w:1140,h:80});if(!g.done)s.push({x:g.x-200,y:g.y-40,w:400,h:80,gate:true});}
    }c.solidCache=s;return s;
  }
  function cityBeacon(g){const from=game.unseen.open[g.a]?g.a:g.b,sign=from===g.a?-1:1;return {x:g.x+(g.vertical?sign*300:0),y:g.y+(!g.vertical?sign*300:0),kind:'beacon',gate:g};}
  function cityLine(a,b){const n=Math.ceil(dist(a.x,a.y,b.x,b.y)/30);for(let i=0;i<=n;i++)if(!isTerrainClear(a.x+(b.x-a.x)*i/Math.max(1,n),a.y+(b.y-a.y)*i/Math.max(1,n),29))return false;return true;}
  function cityRoute(){
    const c=game.unseen,p=game.player,step=80,N=67,targets=[...game.powerups.filter(t=>['rage','magnet'].includes(t.kind)),...c.gates.filter(g=>!g.done&&!g.active&&game.t>=g.cooldown&&(c.open[g.a]||c.open[g.b])).map(cityBeacon)];
    if(!targets.length)return null;
    const id=(x,y)=>y*N+x,coords=i=>({x:(i%N)*step+40,y:Math.floor(i/N)*step+40});
    const startX=clamp(Math.floor(p.x/step),0,N-1),startY=clamp(Math.floor(p.y/step),0,N-1),start=id(startX,startY),origin=coords(start);
    if(!cityLine(p,origin))return null;
    const costs=new Int32Array(N*N).fill(-1),prev=new Int32Array(N*N).fill(-1),queue=[start];costs[start]=0;
    for(let q=0;q<queue.length;q++){const i=queue[q],x=i%N,y=Math.floor(i/N);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const j=id(nx,ny);if(costs[j]>=0)continue;const edge=Math.min(i,j)+':'+Math.max(i,j);if(c.navKey!==c.solidCacheKey){c.navKey=c.solidCacheKey;c.navEdges={};}if(c.navEdges[edge]===undefined)c.navEdges[edge]=cityLine(coords(i),coords(j));if(!c.navEdges[edge])continue;costs[j]=costs[i]+step;prev[j]=i;queue.push(j);}}
    let best=null;
    for(const t of targets){const tx=Math.floor(t.x/step),ty=Math.floor(t.y/step);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=tx+dx,y=ty+dy;if(x<0||y<0||x>=N||y>=N)continue;const i=id(x,y);if(costs[i]<0||!cityLine(coords(i),t))continue;const distance=dist(p.x,p.y,origin.x,origin.y)+costs[i]+dist(t.x,t.y,coords(i).x,coords(i).y);if(t.expires&&distance/p.speed>t.expires-game.t-1)continue;if(!best||distance<best.distance)best={target:t,distance,node:i};}}
    if(!best)return null;let i=best.node;const path=[best.target];while(i!==start&&i>=0){path.push(coords(i));i=prev[i];}path.push(origin);best.waypoint=origin;for(const point of path){if(cityLine(p,point)){best.waypoint=point;break;}}return best;
  }
  function cityDefeat(e){
    const c=game.unseen;if(!c||e.mRaised)return;c.kills[cityDistrict(e.x,e.y)]++;
    if(e.cityGate?.active&&e.cityGateAttempt===e.cityGate.attempts)e.cityGate.damage+=e.max;
    if(e.cityGuardian!==undefined){fishingAward('guardian-'+e.cityGuardian,500);addFish(e.x,e.y,6);const d=e.cityGuardian;c.defeated[d]=true;cityCue('guardian-defeat');notify(CITY_NAMES[d]+' guardian defeated · city remembers',5);
      const key='cataclysm-14-life-'+c.seed;
      if(d===3&&(c.seed%4===0)&&!c.rewardUsed&&!cityLifeLedger.has(key)){c.rewardUsed=true;cityLifeLedger.add(key);try{if(localStorage.getItem(key))return;localStorage.setItem(key,'earned');}catch(err){}if(game.lives<9){game.lives++;cityCue('life-recovery');notify('GUARDIAN WARRANTY · +1 LIFE · once for this seed',5);}else notify('GUARDIAN WARRANTY · lives already full · reward spent',4);}
    }
  }
  function cityTick(dt){
    const g=game,c=g.unseen;if(!c)return;const p=g.player,d=cityDistrict(p.x,p.y);cityAmbience(d);
    if(!c.discovered[d]){c.discovered[d]=true;try{localStorage.setItem('cataclysm-14-discovery-'+c.seed,JSON.stringify(c.discovered));}catch(e){}notify(CITY_NAMES[d]+' · “The city kept my parking ticket.”',4);}
    const explorers=g.companionSquad.flatMap(cat=>cat.components||[cat]).filter(cat=>['scout','courier'].includes(cat.type));
    for(const gate of c.gates){
      if(explorers.some(cat=>cat.type==='scout')&&dist(p.x,p.y,gate.x,gate.y)<550){const adjacent=d===gate.a?gate.b:gate.a;if(!c.discovered[adjacent]){c.discovered[adjacent]=true;notify('SCOUT · '+CITY_NAMES[adjacent]+' marked beyond the gate',3);}}
      if(c.open[gate.a]&&c.open[gate.b])gate.done=true;if(gate.done)continue;
      const b=cityBeacon(gate);
      if(!gate.active&&g.t>=gate.cooldown&&(c.open[gate.a]||c.open[gate.b])&&dist(p.x,p.y,b.x,b.y)<100){cityCue('gate-begin');gate.active=true;gate.until=g.t+24;gate.damage=0;gate.next=0;gate.attempts++;gate.mobHp=2+Math.min(2.5,p.level*.03);gate.required=gate.mobHp*Math.max(6,Math.ceil((12+Math.min(12,Math.floor(p.level/6)))/(1+(gate.attempts-1)*.7)*(explorers.some(cat=>cat.type==='courier')?.9:1)));notify('DPS GATE · defeat marked horde in 24s · retreat allowed · retries ease',5);}
      if(gate.active){
        if(g.t>=gate.next){gate.next=g.t+1;for(let n=0;n<3;n++){const e=spawnEnemy('shambler',{labPurchase:true});if(e){Object.assign(e,nearestSafeSpace(b.x+(n-1)*90,b.y-160,24));e.cityGate=gate;e.cityGateAttempt=gate.attempts;e.hp=e.max=gate.mobHp;}}}
        if(gate.damage>=gate.required||(gate.attempts>=3&&g.t>=gate.until)){cityCue(gate.damage>=gate.required?'gate-pass':'gate-relief');gate.active=false;gate.done=true;c.open[gate.a]=c.open[gate.b]=true;notify('STREET OPEN · '+(gate.attempts>=3?'relief route secured':'horde check passed'),4);c.nextRoute=0;}
        else if(g.t>=gate.until){cityCue('gate-fail');gate.active=false;gate.cooldown=g.t+12;notify('GATE HELD · 12s recovery · easier retry; third attempt survival opens relief route',5);}
      }
    }
    const center={x:d%2*2680+1340,y:Math.floor(d/2)*2680+1340};
    if(c.kills[d]>=12&&!c.guardians[d]&&!c.defeated[d]&&dist(p.x,p.y,center.x,center.y)<230){const e=spawnEnemy('shambler',{labPurchase:true});if(e){// Pick a clear plaza perimeter point; never materialize a contact hit on the player.
      const entries=Array.from({length:16},(_,i)=>({x:center.x+Math.cos(i*TWO/16)*330,y:center.y+Math.sin(i*TWO/16)*330}));
      const entry=entries.filter(q=>isTerrainClear(q.x,q.y,52)&&cityLine(center,q)&&dist(p.x,p.y,q.x,q.y)>260).sort((a,b)=>dist(p.x,p.y,b.x,b.y)-dist(p.x,p.y,a.x,a.y))[0];
      if(!entry){g.enemies.splice(g.enemies.indexOf(e),1);return;}
      Object.assign(e,entry);e.cityGuardian=d;e.r=48;e.hp=e.max=65+d*45+Math.min(300,p.level*4);e.speed=65+d*12;e.cityPulse=g.t+3;c.guardians[d]=true;MUTANTS.say(g,'Guardian awake. Clear the plaza!');fishingAward('provoke-'+d,100);cityCue('guardian-warning');notify(['BELLKEEPER','MOTHER DREDGE','KILN MOTHER','LAST CONDUCTOR'][d]+' PROVOKED · leave the plaza to retreat',5);}}
    for(const e of g.enemies)if(e.cityGuardian!==undefined){if(e.cityRushUntil&&g.t>=e.cityRushUntil){e.speed=65;e.cityRushUntil=0;}if(g.t>=e.cityPulse){e.cityPulse=g.t+5;e.cityWarning=g.t+1;cityCue('guardian-warning');}if(!e.cityWarning||g.t<e.cityWarning)continue;e.cityWarning=0;e.cityAttackUntil=g.t+.45;const kind=e.cityGuardian;if(kind===0){e.speed=190;e.cityRushUntil=g.t+.9;}else if(kind===1){for(let n=0;n<3;n++)spawnEnemy('shambler',{labPurchase:true});}else if(kind===2){g.hazards.toxicGasClouds.push({x:e.x,y:e.y,age:0,life:5,r:95});}else{for(let n=0;n<8;n++){const a=n*Math.PI/4;g.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*130,vy:Math.sin(a)*130,r:6,life:3,damage:.5});}}}
    if(g.t>=c.nextRoute){c.nextRoute=g.t+.8;const key=[Math.floor(p.x/40),Math.floor(p.y/40),g.powerups.map(t=>t.x+','+t.y+','+t.kind).join('|'),c.gates.map(t=>[t.done,t.active,g.t>=t.cooldown].join(',')).join('|')].join(':');if(key!==c.routeKey){c.routeKey=key;c.route=cityRoute();}}
    const status=$('city-status');if(status)status.textContent=CITY_NAMES[d]+' · '+Math.min(12,c.kills[d])+'/12 provocation · '+(c.defeated[d]?'guardian defeated':c.guardians[d]?'guardian awake':'enter central plaza after 12 kills')+(c.gates.some(t=>t.active)?' · HORDE '+Math.ceil(c.gates.find(t=>t.active).until-g.t)+'s':'');
  }
  let cityAudioVoices=0;
  const cityAudioBuffers=new Map();
  async function cityCue(name){
    if(!audio||!fxBus||muted||game?.mode!=='running'||cityAudioVoices+MUTANT_MEDIA.fxCount()>=8)return;
    const origin=game;
    try{let buffer=cityAudioBuffers.get(name);if(!buffer){const response=await fetch('./audio/generated/'+name+'.wav');if(!response.ok)return;buffer=await audio.decodeAudioData(await response.arrayBuffer());cityAudioBuffers.set(name,buffer);}
      if(game!==origin||game?.mode!=='running'||document.hidden||muted||cityAudioVoices+MUTANT_MEDIA.fxCount()>=8)return;const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.value=.6;source.connect(gain);gain.connect(fxBus);cityAudioVoices++;source.onended=()=>{cityAudioVoices--;source.disconnect();gain.disconnect();};source.start();
    }catch(e){/* Inherited synthesized cues remain available if WAV decoding fails. */}
  }
  function cityArt(im,x,y,w,h){if(!cityReady(im))return false;ctx.drawImage(im,x,y,w,h);return true;}
  function cityActor(kind,state,x,y,size){const im=cityImages[kind+'-frames'];if(!cityReady(im))return false;ctx.drawImage(im,(state*2+(reducedMotion?0:Math.floor((game?.t||0)*5)%2))*256,0,256,256,x-size/2,y-size/2,size,size);return true;}
  function cityDraw(cx,cy){
    const c=game?.unseen;if(!c)return false;
    for(let d=0;d<4;d++){
      const ox=d%2*2680,oy=Math.floor(d/2)*2680;
      if(ox>cx+W||ox+2680<cx||oy>cy+H||oy+2680<cy)continue;
      ctx.save();ctx.beginPath();ctx.rect(ox,oy,2680,2680);ctx.clip();
      for(let y=Math.floor(Math.max(cy,oy)/320)*320;y<Math.min(cy+H,oy+2680);y+=320)
        for(let x=Math.floor(Math.max(cx,ox)/320)*320;x<Math.min(cx+W,ox+2680);x+=320)
          cityArt(cityImages[['city-wet-street','city-paving-blue','city-asphalt','city-paving-grey'][d]],x,y,320,320);
      ctx.restore();
    }
    for(const s of citySolids())if(s.x+s.w>cx&&s.x<cx+W&&s.y+s.h>cy&&s.y<cy+H){if(!cityArt(cityImages[['city-shop-warm','city-waterfront','city-shop-neon','city-archway'][s.style||0]],s.x,s.y,s.w,s.h)){ctx.fillStyle='#342d40';ctx.fillRect(s.x,s.y,s.w,s.h);}}
    ctx.font='bold 16px system-ui';ctx.fillStyle='#fff0c9';ctx.textAlign='center';
    for(const g of c.gates)if(!g.done&&(c.open[g.a]||c.open[g.b])){const b=cityBeacon(g);outline(b.x,b.y,50,'#f6e5af',3);ctx.fillText(g.active?Math.ceil(g.damage)+' / '+Math.ceil(g.required)+' horde HP':'BEACON · approach',b.x,b.y-65);}
    const d=cityDistrict(game.player.x,game.player.y),x=d%2*2680+1340,y=Math.floor(d/2)*2680+1340;if(!c.defeated[d]){outline(x,y,230,'#e5a77b66',2);ctx.fillText('GUARDIAN PLAZA · 12 local kills provoke',x,y-235);}ctx.textAlign='left';return true;
  }
  function cityArrow(){const r=game?.unseen?.route;if(!r||game.mode!=='running')return;if(r.target.gate?(r.target.gate.done||r.target.gate.active||game.t<r.target.gate.cooldown):(!game.powerups.includes(r.target)||r.target.expires<=game.t))return;const p=game.player,t=r.target,dx=t.x-p.x,dy=t.y-p.y;if(Math.abs(dx)<W/2-45&&Math.abs(dy)<H/2-65)return;const a=Math.atan2(r.waypoint.y-p.y,r.waypoint.x-p.x),scale=Math.min((W/2-45)/Math.max(.001,Math.abs(Math.cos(a))),(H/2-85)/Math.max(.001,Math.abs(Math.sin(a)))),x=W/2+Math.cos(a)*scale,y=H/2+Math.sin(a)*scale;ctx.save();ctx.translate(x,y);ctx.rotate(a);polygon(0,0,[[18,0],[-10,-10],[-5,0],[-10,10]],'#ffe2a2');ctx.restore();ctx.fillStyle='#fff4d8';ctx.font='bold 13px system-ui';ctx.textAlign='center';const label=t.kind+' '+Math.ceil(r.distance)+'u',half=ctx.measureText(label).width/2+8;ctx.fillText(label,clamp(x,half,W-half),Math.min(H-76,y+27));ctx.textAlign='left';}
  function cityMap(){
    if(!game||!['paused','dead'].includes(game.mode))return;
    const c=game.unseen,panel=$('city-map-panel');if(!panel)return;panel.hidden=!panel.hidden;
    panel.replaceChildren();const title=document.createElement('p');title.textContent='Seed '+c.seed+' · North ↑ · frontier beacons open streets';panel.append(title);
    const grid=document.createElement('div');grid.style.display='grid';grid.style.gridTemplateColumns='1fr 1fr';grid.style.gap='10px';
    for(let d=0;d<4;d++){const cell=document.createElement('div');cell.style.padding='12px';cell.style.border='1px solid #b99b78';cell.textContent=(c.discovered[d]?CITY_NAMES[d]:'Undiscovered')+' · '+(c.open[d]?'open':'locked')+(c.defeated[d]?' · guardian defeated':'');grid.append(cell);}panel.append(grid);
  }
  let cityAmbientSource=null,cityAmbientDistrict=-1,cityAmbientToken=0;
  function stopCityAmbience(){cityAmbientToken++;cityAmbientSource?.stop();cityAmbientSource=null;cityAmbientDistrict=-1;}
  async function cityAmbience(d){
    if(!audio||!masterBus||muted||audio.state!=='running'||cityAmbientDistrict===d)return;
    stopCityAmbience();cityAmbientDistrict=d;const token=cityAmbientToken;
    try{const response=await fetch('./audio/generated/district-'+['cinder','sluice','ember','terminus'][d]+'.wav');if(!response.ok)throw Error('ambient missing');const buffer=await audio.decodeAudioData(await response.arrayBuffer());if(token!==cityAmbientToken||game?.mode!=='running')return;
      const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=.07;source.connect(gain);gain.connect(masterBus);source.onended=()=>{source.disconnect();gain.disconnect();};cityAmbientSource=source;source.start();
    }catch(e){if(token===cityAmbientToken)cityAmbientDistrict=-1;}
  }

  const BIOMES = [
    {id:'neon-city',name:'NEON CITY',floor:'#17262b',speed:1,cover:'compact blocks'},
    {id:'canal-gardens',name:'CANAL GARDENS',floor:'#153d3a',speed:1.12,cover:'long horizontal islands'},
    {id:'ember-works',name:'EMBER WORKS',floor:'#432c2b',speed:.94,cover:'tall furnace cover'},
    {id:'crystal-yard',name:'CRYSTAL YARD',floor:'#302c49',speed:1.06,cover:'small scattered crystals'}
  ];
  let chunkCache=new Map();
  function initMap(){city=[];stars=[];chunkCache=new Map();}
  function chunkAt(cx,cy=0){
    if(game?.unseen)return {index:cx+','+cy,cx,cy,biome:cityDistrict(cx*WORLD_SIZE,cy*WORLD_SIZE),solids:[]};
    const key=cx+','+cy;
    if(chunkCache.has(key)){const c=chunkCache.get(key);chunkCache.delete(key);chunkCache.set(key,c);return c;}
    const hash=(x,y)=>((Math.imul(x|0,374761393)^Math.imul(y|0,668265263))>>>0);
    const solids=[],biome=hash(Math.floor(cx/5),Math.floor(cy/5))%4;
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){
      const wx=cx*2+col,wy=cy*2+row,n=hash(wx,wy)%9;
      const kind=n===0||n===5?'car':n===2||n===7?'dumpster':'building';
      const w=kind==='car'?72:kind==='dumpster'?66:218,h=kind==='car'?126:kind==='dumpster'?64:218;
      solids.push({x:wx*670+(kind==='car'?335-w/2:kind==='dumpster'?440:22),y:wy*670+225,
        w,h,lit:n%2===0,kind,style:n%4});
    }
    const chunk={index:key,cx,cy,biome,solids};chunkCache.set(key,chunk);
    while(chunkCache.size>64)chunkCache.delete(chunkCache.keys().next().value);
    return chunk;
  }
  function terrainNear(y,x=game?.player.x||0,radius=350){
    if(game?.unseen)return citySolids();
    const solids=[];
    for(let cy=Math.floor((y-radius)/WORLD_SIZE);cy<=Math.floor((y+radius)/WORLD_SIZE);cy++)
      for(let cx=Math.floor((x-radius)/WORLD_SIZE);cx<=Math.floor((x+radius)/WORLD_SIZE);cx++)solids.push(...chunkAt(cx,cy).solids);
    return solids;
  }
  function updateFoundation(dt){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,w=g.world;
    w.transition=Math.max(0,(w.transition||0)-dt);
    w.epoch=chunkAt(Math.floor(p.x/WORLD_SIZE),Math.floor(p.y/WORLD_SIZE)).biome;
    w.currentBiomeId=BIOMES[w.epoch].id;
    w.minY=Math.min(w.minY,p.y);w.maxY=Math.max(w.maxY,p.y);w.cameraY=p.y-H/2;
    w.chunk=Math.floor(p.x/WORLD_SIZE)+','+Math.floor(p.y/WORLD_SIZE);
    for(const level of [3,6,9])if(p.level>=level&&!g.progressionMilestones.includes(level)){
      g.progressionMilestones.push(level);
      if(level===3){p.ricochet++;notify('LEVEL 3 · COVER RICOCHET unlocked',4,'milestone-3');}
      if(level===6){g.cityEvents.relayUnlocked=true;p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);notify('LEVEL 6 · RALLY FIELDS + extra heart',4,'milestone-6');}
      if(level===9){p.speed+=30;notify('LEVEL 9 · FLEET PAWS · SPEED UP',5,'milestone-9');}
    }
    const sh=g.risingShadow;
    if(false){sh.active=true;sh.warning=8;sh.y=p.y+H/2+260;}
    if(sh.active&&!g.endgame.active){
      if(sh.warning>0)sh.warning=Math.max(0,sh.warning-dt);
      else {sh.y-=Math.min(p.speed*.45,85+Math.max(0,sh.y-p.y-H)*.08)*dt;
        if(p.y+p.r>sh.y&&p.inv<=0){damageTaken();p.hp=Math.max(0,p.hp-.75);p.inv=1.5;sh.hits++;g.shake=.5;burst(p.x,p.y,'#aa72ea',12);notify('SHADOW HIT · Escape UP ↑',2);if(p.hp<=0){loseLife();return;}}
      }
    }
    if(false && p.level>=99&&!g.endgame.complete){ // Legacy level-99 finale retired by 100-night campaign
      if(!g.endgame.active){g.endgame.active=true;sh.warning=8;notify('LEVEL 99 · NINE CROWNS · Defeat the Catastrophe nine times',5);}
      g.endgame.cooldown=Math.max(0,g.endgame.cooldown-dt);
      if(!g.enemies.some(e=>e.finalBoss)&&g.endgame.cooldown===0)spawnFinalBoss();
    }
  }
  function spawnFinalBoss(){
    const g=game;if(g.mode!=='running'||g.endgame.complete||g.enemies.some(e=>e.finalBoss))return;
    // Endgame takes priority over city hazards and reserves the same 12-cost boss
    // as the ordinary director. Withdraw distant threats without rewards.
    if(g.cityEvents.active)finishCityEncounter(false);
    g.enemies=g.enemies.filter(e=>e.variant!=='boss');
    let threat=g.enemies.reduce((n,e)=>n+enemyThreat(e),0);
    const distant=[...g.enemies].sort((a,b)=>dist(b.x,b.y,g.player.x,g.player.y)-dist(a.x,a.y,g.player.x,g.player.y));
    for(const e of distant){
      if(threat+12<=g.director.budget&&g.enemies.length<liveCap())break;
      threat-=enemyThreat(e);g.enemies.splice(g.enemies.indexOf(e),1);
    }
    g.director.recovery=Math.max(g.director.recovery,4);
    const round=g.endgame.victories+1,hp=(240+round*90)*g.runScale;
    g.enemies.push({...safeSpawn(Math.max(W,H)/2+180,60),variant:'boss',finalBoss:true,round,
      r:48,hp,max:hp,damage:1.5,speed:75+round*3,phase:0,weight:30,hurt:0,night:99});
    g.endgame.spawned++;notify('CATASTROPHE · CROWN '+round+'/9',4,'crown-'+round);
  }
  // Translate each rectangle to its nearest periodic image before circle testing.
  function terrainContact(x,y,r,c) {
    const cx=x+wrappedDelta(x,c.x+c.w/2),cy=y+verticalDelta(y,c.y+c.h/2);
    const left=cx-c.w/2,top=cy-c.h/2;
    const qx=clamp(x,left,left+c.w),qy=clamp(y,top,top+c.h);
    const dx=x-qx,dy=y-qy,d=Math.hypot(dx,dy);
    if(d>=r)return null;
    if(d>1e-8)return {x:dx/d*(r-d+.001),y:dy/d*(r-d+.001)};
    const sides=[{d:x-left,x:-1,y:0},{d:left+c.w-x,x:1,y:0},
      {d:y-top,x:0,y:-1},{d:top+c.h-y,x:0,y:1}];
    const side=sides.reduce((a,b)=>a.d<b.d?a:b);
    return {x:side.x*(side.d+r+.001),y:side.y*(side.d+r+.001)};
  }
  function isTerrainClear(x,y,r) {
    if(game?.unseen&&(x<r||y<r||x>5360-r||y>5360-r))return false;
    return terrainNear(y,x,r).every(c=>!terrainContact(wrapCoord(x),y,r,c));
  }
  function nearestSafeSpace(x,y,r=24) {
    x=wrapCoord(x);
    if(game?.unseen){x=clamp(x,r+1,5359-r);y=clamp(y,r+1,5359-r);}
    if(isTerrainClear(x,y,r))return {x,y};
    for(let ring=12;ring<=WORLD_SIZE;ring+=12){
      const count=Math.max(8,Math.ceil(TWO*ring/18));
      for(let i=0;i<count;i++){
        const a=i*TWO/count,nx=wrapCoord(x+Math.cos(a)*ring),ny=(y+Math.sin(a)*ring);
        if(isTerrainClear(nx,ny,r))return {x:nx,y:ny};
      }
    }
    return {x,y};
  }
  function settleTerrain(actor) {
    for(let pass=0;pass<4;pass++){
      let hit=false;
      for(const c of terrainNear(actor.y,actor.x,actor.r)){const push=terrainContact(actor.x,actor.y,actor.r,c);
        if(push){actor.x=wrapCoord(actor.x+push.x);actor.y=(actor.y+push.y);hit=true;}}
      if(!hit)return;
    }
    if(!isTerrainClear(actor.x,actor.y,actor.r))Object.assign(actor,nearestSafeSpace(actor.x,actor.y,actor.r));
  }
  function moveWithCollision(actor,dx,dy) {
    if(ignoresTerrain(actor)){
      // Flying/phasing crosses props, never the enclosing city wall or locked districts.
      const x=clamp(actor.x+dx,actor.r+31,5329-actor.r),y=clamp(actor.y+dy,actor.r+31,5329-actor.r);
      if(game.unseen.open[cityDistrict(x,y)]){actor.x=x;actor.y=y;}
      return;
    }
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
    actor.x=wrapCoord(actor.x);
    settleTerrain(actor);
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,Math.min(6,actor.r/2))));
    for(let i=0;i<steps;i++){
      actor.x=wrapCoord(actor.x+dx/steps);actor.y=(actor.y+dy/steps);
      settleTerrain(actor);
    }
  }
  function blockingTerrain(x,y,dx,dy,r) {
    let first=null,best=Infinity;
    for(const c of terrainNear(y,x)){
      const left=x+wrappedDelta(x,c.x+c.w/2)-c.w/2-r;
      const top=y+verticalDelta(y,c.y+c.h/2)-c.h/2-r;
      let enter=0,leave=1;
      for(const [origin,delta,lo,hi] of [[x,dx,left,left+c.w+2*r],[y,dy,top,top+c.h+2*r]]){
        if(Math.abs(delta)<1e-9){if(origin<lo||origin>hi){leave=-1;break;}}
        else {const a=(lo-origin)/delta,b=(hi-origin)/delta;enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));}
      }
      if(enter<=leave&&leave>0&&enter<best){best=enter;first={left,top,w:c.w+2*r,h:c.h+2*r};}
    }
    return first;
  }
  function navigationDelta(actor,tx,ty) {
    const dx=wrappedDelta(actor.x,tx),dy=verticalDelta(actor.y,ty);
    const wall=blockingTerrain(actor.x,actor.y,dx,dy,actor.r+2);
    if(!wall){delete actor.navWaypoint;return {x:dx,y:dy};}
    const waypoint=actor.navWaypoint;
    if(waypoint&&dist(actor.x,actor.y,waypoint.x,waypoint.y)>8&&dist(tx,ty,waypoint.tx,waypoint.ty)<160){
      const wx=wrappedDelta(actor.x,waypoint.x),wy=waypoint.y-actor.y;
      if(!blockingTerrain(actor.x,actor.y,wx,wy,actor.r))return {x:wx,y:wy};
    }
    delete actor.navWaypoint;
    let choice=null,best=Infinity;
    // Sparse blocks leave ample space for these visible, generously padded corners.
    for(const x of [wall.left-8,wall.left+wall.w+8])for(const y of [wall.top-8,wall.top+wall.h+8]){
      const vx=wrappedDelta(actor.x,x),vy=verticalDelta(actor.y,y);
      if(Math.hypot(vx,vy)<8||blockingTerrain(actor.x,actor.y,vx,vy,actor.r))continue;
      const score=Math.hypot(vx,vy)+dist(x,y,tx,ty);
      if(score<best){best=score;choice={x:vx,y:vy};}
    }
    if(choice)actor.navWaypoint={x:wrapCoord(actor.x+choice.x),y:actor.y+choice.y,tx,ty};
    return choice||{x:dx,y:dy};
  }
  function resolveActorCollisions() {
    const actors=[game.player,...game.enemies.filter(e=>e.hp>0&&!ignoresTerrain(e)&&!e.cocoon&&!['disguise','leap','landing-warning'].includes(e.mState)),...game.companionSquad];
    // Periodic spatial bins bound work at the mob cap, including opposite seams.
    const cells=24,cellSize=WORLD_SIZE/cells;
    for(let pass=0;pass<4;pass++){
      const bins=new Map();
      for(let i=0;i<actors.length;i++){
        const a=actors[i],key=Math.floor(a.x/cellSize)+','+Math.floor(a.y/cellSize);
        if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);
      }
      let overlap=false;
      for(let i=0;i<actors.length;i++){
        const a=actors[i],col=Math.floor(a.x/cellSize),row=Math.floor(a.y/cellSize);
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
          const list=bins.get((col+ox)+','+(row+oy));
          if(!list)continue;
          for(const j of list){if(j<=i)continue;const b=actors[j];
            let dx=wrappedDelta(a.x,b.x),dy=verticalDelta(a.y,b.y),r=a.r+b.r;
            if(Math.abs(dx)>=r||Math.abs(dy)>=r)continue;
            let d=Math.hypot(dx,dy);if(d>=r-.001)continue;
            overlap=true;if(d<.00001){dx=1;dy=0;d=1;}
            const nx=dx/d,ny=dy/d,amount=r-Math.hypot(wrappedDelta(a.x,b.x),verticalDelta(a.y,b.y))+.002;
            if(a===game.player)moveWithCollision(b,nx*amount,ny*amount);
            else {moveWithCollision(a,-nx*amount/2,-ny*amount/2);moveWithCollision(b,nx*amount/2,ny*amount/2);}
            // Transfer the part blocked by a wall to the other actor.
            const remaining=r-dist(a.x,a.y,b.x,b.y);
            if(remaining>0){moveWithCollision(b,nx*remaining,ny*remaining);
              const rest=r-dist(a.x,a.y,b.x,b.y);if(rest>0&&a!==game.player)moveWithCollision(a,-nx*rest,-ny*rest);}
          }
        }
      }
      if(!overlap)break;
    }
  }
  function moveProjectile(s,dt) {
    const steps=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy)*dt/3));
    for(let i=0;i<steps;i++){
      s.x=wrapCoord(s.x+s.vx*dt/steps);s.y=(s.y+s.vy*dt/steps);
      if(!isTerrainClear(s.x,s.y,s.r))return false;
      if(game.enemies.some(e=>!s.hit.includes(e)&&dist(e.x,e.y,s.x,s.y)<e.r+s.r))break;
    }
    return true;
  }
  let personalBest = 0, completedRuns = 0;
  try { completedRuns = Math.max(0, Math.floor(Number(localStorage.getItem('cataclysm-runs')) || 0)); }
  catch (err) { /* session progression works without storage */ }
  function recordRun() {
    if (STRESS_MODE || !game || game.runRecorded || (game.t < 30 && game.mode !== 'dead')) return;
    game.runRecorded = true; completedRuns++;
    try { localStorage.setItem('cataclysm-runs', String(completedRuns)); } catch (err) { /* session only */ }
  }
  function difficulty() {
    return game.runScale * (1 + (game.wave - 1) * .065 + game.bossEncounters * .10);
  }
  const MAX_COMPANIONS = 4;
  const COMPANY=globalThis.CATA_COMPANY;
  const roleNames = Object.keys(COMPANY.identities);
  const specialNames = {shooter:'Burst',healer:'Heal',tank:'Guard',brawler:'Claws',sniper:'Deadeye',engineer:'Turret',trapper:'Snare',bard:'Anthem'};
  const commonIds = ['damage','fire-rate','speed','xp-gain'];
  const squadIds = ['squad-damage','squad-rate','squad-count','squad-spread','squad-bounce'];
  const equipmentIds=['equip-lens','equip-coil','equip-capacitor'];
  const EXPLORATION=Object.freeze({first:150,intervalMin:120,intervalMax:180,chance:.18,cap:2,magnetSweep:true});
  const majorUpgradeIds=['armor','critical','shield-pulse','area-burst','focus','squad-range','tactical-momentum'];
  const drawnCards={'tail-pierce': ['Needle tail', 'Tail rounds pierce +1 body per rank.'], 'tail-burst': ['Stuttering whisker', 'Fire an extra echo volley after each shot. Stacks up to three echoes.'], 'tail-turbo': ['Hot brass', 'Tail fires 20% faster; muzzle damage +5%.'], 'lucky-bounce': ['Bank shot kitten', 'Tail rounds bounce +1 time and gain 5% critical chance.'], 'sprint-dodge': ['Liquid cat', 'Gain a brief dodge every 5s while running; each rank adds 0.15s.'], 'shield-rebound': ['Spite bubble', 'Taking damage retaliates against all enemies within 180px. +3 damage per rank.'], 'squad-crossfire': ['Alley firing line', 'All follower shots +25% damage and +1 piercing.'], 'fish-momentum': ['Sardine zoomies', 'Fish grant 4s of +25% movement and firing speed per rank.']};
  const lifeCards={
    'curiosity':['Curiosity pays rent','Unlock FOUR random offers; gain 1 reroll token.'],
    'omniscience':['Five brain cells','Requires Curiosity. Unlock FIVE random offers; gain 1 reroll.'],
    'loaded-dice':['Loaded yarn dice','Gain 3 real rerolls. Available twice per run.'],
    'second-wind':['Emergency cardboard box','Revive at 80% HP, with +1s grace. Once per run.'],
    'quiet-repair':['Purr therapy','After 8s without damage, heal 0.06 HP/s; doubles with no allies.'],
    'clock-shield':['Bubble appointment','Every 18 active seconds gain 1.1s invulnerability.'],
    'glass-cat':['Porcelain menace','Tail damage +40%; maximum and current HP ×0.75. Up to two ranks.'],
    'fleet-return':['Return to zoom','Move +10%; respawn grace +0.4s. Once per run.'],
    'solo-contract':['Table for one','While alone: +30% tail damage and 15% mitigation. Dormant with allies.'],
    'squad-care':['Group purr insurance','With allies: heal 0.025 HP/s per ally after 8s unharmed.'],
    'last-laugh':['Last laugh','On your LAST life: +60% tail damage. No free lives.'],
    'revenant-tail':['Haunted tail','For 8s after revival: tail rounds pierce +2 bodies.']
  };
  for(const id of Object.keys(lifeCards)){
    const b=document.createElement('button');b.type='button';b.className='upgrade';b.dataset.upgrade=id;b.hidden=true;
    $('upgrade-overlay').append(b);
  }
  for(const role of COMPANY.newRoles){const b=document.createElement('button');b.type='button';b.className='upgrade';b.dataset.upgrade='companion-'+role;b.hidden=true;$('upgrade-overlay').append(b);}
  const lifeRank=id=>game.upgrades.filter(u=>u.type===id).length;
  const fishingCards={'fishing-rod':['Fishing rod','Reel 0.1s faster; rank cap 2'], 'fishing-line':['Strong line','Convert 2% ambush to fish; rank cap 2'], 'fishing-worm':['Worm pack','6 charges: 62/14/8/1/5/10% fish/rare/treasure/cache/mutant/ambush'], 'fishing-fishbone':['Glowing fishbone','4 charges: 45/20/12/3/8/12% outcomes'], 'fishing-catnip':['Royal catnip','2 charges: 30/25/16/5/12/12% outcomes']};
  for(const [id,[title,desc]] of Object.entries(fishingCards)){const b=document.createElement('button');b.type='button';b.className='upgrade';b.dataset.upgrade=id;b.hidden=true;b.textContent=title+' · '+desc;$('upgrade-overlay').append(b);}
  const upgradeIds = [...Object.keys(fishingCards),...Object.keys(lifeCards),...Object.keys(drawnCards),...equipmentIds,...commonIds,'recover','multi-shot','ricochet','fish-magnet',...majorUpgradeIds,...roleNames.map(r=>'companion-'+r),...squadIds];
  function upgradeAvailable(type) {
    if(fishingCards[type]){const k=type.slice(8),f=game.fishing;return ['rod','line'].includes(k)?f[k]<2:k==='catnip'?f.caught>=3:true;}
    if(!game)return false;
    if(lifeCards[type]){
      if(type==='omniscience'&&game.offerCount!==4)return false;
      if(type==='curiosity'&&game.offerCount!==3)return false;
      if(type==='solo-contract'&&game.companionSquad.length)return false;
      if(type==='squad-care'&&!game.companionSquad.length)return false;
      return lifeRank(type)<(['loaded-dice','glass-cat'].includes(type)?2:1);
    }
    if(type==='tail-burst'&&(game.player.tailBurst||0)>=3)return false;
    if(type==='squad-crossfire')return game.companionSquad.length>0;
    if(type.startsWith('companion-')&&game.companionSquad.some(c=>c.components?.some(a=>a.type===type.slice(10))))return false;
    if(type.startsWith('companion-'))return roleNames.includes(type.slice(10))&&(game.companionSquad.some(c=>c.type===type.slice(10))||game.companionSquad.length<MAX_COMPANIONS);
    if(type==='armor')return game.player.armor<.65;
    if(type==='critical')return game.player.criticalBoost<.5;
    if(type==='squad-range')return game.companionSquad.length>0;
    if(type==='squad-count')return game.companionSquad.length>0&&game.companionSquad.length<MAX_COMPANIONS;
    if(squadIds.includes(type))return game.companionSquad.length>0;
    if(type==='recover')return game.player.hp<game.player.maxHp;
    return upgradeIds.includes(type);
  }
  function offerRand(){game.offerState=(Math.imul(1664525,game.offerState)+1013904223)>>>0;return game.offerState/4294967296;}
  function rateUpgradeFactor(){return 1-.15/Math.sqrt(1+game.upgrades.filter(u=>u.type==='fire-rate').length*.25);}
  function upgradeText(id){
    const p=game.player,q=game.squadStats,n=v=>Number(v.toFixed(2));
    if(lifeCards[id])return lifeCards[id][1];
    if(drawnCards[id])return drawnCards[id][1];
    const rows={damage:['Damage',p.damage,p.damage+.25], 'fire-rate':['Shots/s',1/p.shotInterval,1/(p.shotInterval*rateUpgradeFactor())],speed:['Move speed',p.speed,p.speed+18/Math.sqrt(1+(p.speed-cfg.speed)/180)],'xp-gain':['XP multiplier',p.xpGain,p.xpGain+.2],
      'squad-damage':['Follower damage % of player',q.damage*100,(q.damage+.15)*100],'squad-rate':['Follower fire multiplier',q.rate,q.rate*1.2], 'squad-count':['Recruit random unique ally',game.companionSquad.length,game.companionSquad.length+1], 'squad-spread':['Follower spread rank',q.spread,q.spread+1], 'squad-bounce':['Follower bounce rank',q.bounce,q.bounce+1],
      'multi-shot':['Player spread rank',p.multishot,p.multishot+1],ricochet:['Player bounce rank',p.ricochet,p.ricochet+1],'fish-magnet':["Cat’s Catch range",135+p.magnet*65+(p.speed-cfg.speed)*2/3,200+p.magnet*65+(p.speed-cfg.speed)*2/3]};
    if(equipmentIds.includes(id)){const key=id.slice(6),rank=game.equipment[key];return ({lens:'Prism lens · piercing + marks; coil marks conduct damage',coil:'Frost coil · shots slow; lens hits conduct; traps mark',capacitor:'Rune capacitor · longer runes; coil kills recharge specials'})[key]+' · '+rank+' → '+(rank+1);}
    if(rows[id]){const [label,old,next]=rows[id];return label+' · '+n(old)+' → '+n(next);}
    if(id==='recover')return 'HP '+n(p.hp)+' → '+n(Math.min(p.maxHp+.25,p.hp+1))+' · Max '+n(p.maxHp)+' → '+n(p.maxHp+.25);
    const majorRows={armor:['Damage reduction %',p.armor*100,Math.min(.65,p.armor+.1)*100],critical:['Bonus critical %',p.criticalBoost*100,Math.min(.5,p.criticalBoost+.07)*100],
      'shield-pulse':['Max HP',p.maxHp,p.maxHp+.5],'area-burst':['Encore radius',majorEncoreRadius(),majorEncoreRadius()+45],focus:['Weapon damage',p.damage,p.damage*1.11],
      'squad-range':['Companion reach bonus',40*(p.squadRange||0),40*((p.squadRange||0)+1)],'tactical-momentum':['Move speed',p.speed,p.speed*1.08]};
    if(majorRows[id]){const [label,old,next]=majorRows[id];return label+' · '+n(old)+' → '+n(next);}
    const role=id.slice(10),ally=game.companionSquad.find(c=>c.type===role);
    return role.toUpperCase()+' · '+(ally?'Train rank '+ally.rank+' → '+(ally.rank+1):'Recruit permanent follower');
  }

  function renderUpgradeCard(button){
    const id=button.dataset.upgrade,role=id.startsWith('companion-')?id.slice(10):null;
    const category=role?'PERMANENT COMPANION':id.startsWith('squad-')?'SQUAD':equipmentIds.includes(id)?'EQUIPMENT':commonIds.includes(id)?'CORE':'SPECIALTY';
    const hints={damage:'Strengthens player shots and companion attacks.', 'fire-rate':'More volleys; very fast fire aggregates damage.',speed:'Also extends fish pickup reach.', 'xp-gain':'Reach the next four-choice investment sooner.',
      'equip-lens':'Pierce + marks; pair with Frost coil for conduction.', 'equip-coil':'Slows targets; lens conducts and traps mark.', 'equip-capacitor':'Longer runes; coil kills recharge specials.',
      'squad-range':'Also adds 10 percentage points of follower damage.', 'tactical-momentum':'Also reduces weapon interval by 8%.', 'shield-pulse':'Also heals 0.75 HP and grants 2s protection.',critical:'Total critical chance caps at 75%.',armor:'Mitigation caps at 65%.',
      recover:'Restore one heart and grow your maximum HP.', 'multi-shot':'Adds two spread shots; dense volleys aggregate damage.',ricochet:'Shots seek another target after impact.', 'fish-magnet':'Draw fish toward you from farther away.',focus:'All player shots hit 11% harder.', 'area-burst':'A wider fish-triggered Encore catches more enemies.', 'squad-damage':'Every follower hits harder.', 'squad-rate':'All followers fire more often.', 'squad-spread':'Adds spread to follower volleys.', 'squad-bounce':'Follower shots bounce to another enemy.',
      'squad-count':'Recruits a distinct permanent role; four active maximum.'};
    button.replaceChildren();
    const badge=document.createElement('span');badge.className='upgrade-category';badge.textContent=category;
    const icon=document.createElement('span');icon.className='upgrade-art';icon.setAttribute('aria-hidden','true');
    if(role){const portrait=document.createElement('span');portrait.className='cat-portrait';portrait.style.backgroundImage='url("./art/characters/'+(COMPANY.identities[role]?.[0]||role)+'/attack.png")';icon.append(portrait);icon.classList.add('role-art');}
    else {const art=/fish/.test(id)?'fish':/speed|momentum/.test(id)?'fleet':/recover|armor|shield/.test(id)?'ward':/equip|xp|focus/.test(id)?'prism':'weapon';icon.style.backgroundImage='url("./art/cards/'+art+'.svg")';}
    button.dataset.category=category;
    const titles={'damage':'Heavy little thunder','fire-rate':'Rapid paws',speed:'Alley runners',recover:'HP patch · no extra life','xp-gain':'Street wisdom','multi-shot':'Wide awake',ricochet:'Second chances','fish-magnet':'The good catch',armor:'Nine-life lining',critical:'Perfect opening','shield-pulse':'Pocket sanctuary','area-burst':'Encore amplifier',focus:'Steady whiskers','squad-range':'Farther together','tactical-momentum':'Never miss a beat','equip-lens':'Prism lens','equip-coil':'Frost coil','equip-capacitor':'Rune capacitor','squad-damage':'Pack a punch','squad-rate':'In good rhythm','squad-count':'Room for one more','squad-spread':'Cover the alley','squad-bounce':'Passing shots'};
    const title=document.createElement('strong');title.className='upgrade-name';title.textContent=role?role[0].toUpperCase()+role.slice(1)+' · '+(game.companionSquad.some(c=>c.type===role)?'Train':'Recruit'):fishingCards[id]?.[0]||lifeCards[id]?.[0]||drawnCards[id]?.[0]||titles[id]||id;
    const value=document.createElement('span');value.className='upgrade-effect';value.textContent=fishingCards[id]?.[1]||upgradeText(id);
    const hint=document.createElement('small');hint.textContent=role?(FOLLOWERS.roleSpecs[role]?.hint||COMPANY.identities[role][1]):hints[id]||'Permanent investment · stacks with your current build.';
    button.append(badge,icon,title,value,hint);
  }

  function readBest() {
    try {
      const stored = Number(localStorage.getItem(STRESS_MODE?'cataclysm-lab-best':'cataclysm-best'));
      if (Number.isFinite(stored) && stored >= 0) personalBest = Math.max(personalBest, stored);
    } catch (err) { /* keep this session's best when storage is disabled */ }
  }
  function renderBest() {
    if($('best'))$('best').textContent = personalBest.toLocaleString();
  }
  readBest();
  function scoreSnapshot(g=game) {
    const inputs = {survivalPoints:g.survivalPoints,weightedKills:g.kills,fish:g.fish,
      milestonePoints:g.scoreLedger.milestonePoints};
    const tally=SCORE.tally(inputs);
    return {...tally,total:g.qaSpawnScale>1?0:tally.total,unrankedTotal:g.qaSpawnScale>1?tally.total:null,...inputs,eligible:!(g.qaSpawnScale>1),ruleVersion:SCORE.RULE_VERSION,
      awarded:[...g.scoreLedger.awarded]};
  }
  function saveBest() {
    if (!game || game.qaSpawnScale>1) return;
    const score = scoreSnapshot().total;
    readBest();
    if (score > personalBest) {
      personalBest = score;
      try {
        const key=STRESS_MODE?'cataclysm-lab-best':'cataclysm-best';
        localStorage.setItem(key,String(personalBest));
        localStorage.setItem(key+'-breakdown',JSON.stringify(scoreSnapshot()));
      }
      catch (err) { /* the visible session best still survives restart */ }
    }
    renderBest();
  }
  // Original score: E natural minor, eight-bar pedal/chord phrase. All timing is audio time.
  const audioVoices = new Set(), sfxLast = Object.create(null);
  const scoreCounts = {drums:0,bass:0,lead:0,bossDrops:0};
  const arrangement={phase:'groove',biome:-1,event:null,transitions:0,drops:0};
  let masterBus=null, fxBus=null, scoreBus=null, noiseBuffer=null, gritCurve=null, musicMode='silent', scoreStep=0;
  function unlockAudio() {
    if(muted)return;
    try {
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      if(!audio)audio=new AC();
      // Called directly by the trusted Play/restart/unmute gesture, before any async work.
      if(audio.state==='suspended'){const resumed=audio.resume();if(resumed&&resumed.catch)resumed.catch(()=>{});}
      if(!masterBus){
        masterBus=audio.createGain();masterBus.gain.value=volume;
        let output=audio.destination;
        try {const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-20;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.16;limiter.connect(output);output=limiter;}catch(e){/* gain headroom remains safe */}
        masterBus.connect(output);
      }
      if(!musicBus){musicBus=audio.createGain();musicBus.gain.value=0;musicBus.connect(masterBus);}
      if(!scoreBus){scoreBus=audio.createGain();scoreBus.connect(musicBus);}
      if(!fxBus){fxBus=audio.createGain();fxBus.gain.value=.65;fxBus.connect(masterBus);}
      if(!noiseBuffer)try {
        noiseBuffer=audio.createBuffer(1,audio.sampleRate,audio.sampleRate);
        const data=noiseBuffer.getChannelData(0);let seed=19473;
        for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
      }catch(e){/* percussion falls back to pitched transients */}
      if(!gritCurve)try {gritCurve=new Float32Array(512);for(let i=0;i<512;i++)gritCurve[i]=Math.tanh((i/255.5-1)*5)*.65;}catch(e){/* plain saw riff */}
    }catch(e){/* audio unavailable: game remains playable */}
  }
  function stopVoices(group) {
    for(const v of audioVoices)if(!group||v.group===group){
      try {const t=audio.currentTime;v.env.gain.cancelScheduledValues(t);v.env.gain.setTargetAtTime(.0001,t,.004);v.source.stop(t+.02);v.clean();}catch(e){v.clean();}
    }
  }
  // At most 40 music and 12 effects sources; each voice owns and disconnects its nodes.
  function voice(hz,t,len,level,type='sine',group='music',filterHz=0,sweep=0,distort=false) {
    if(!audio||muted||document.hidden||audio.state!=='running'||!masterBus)return;
    if(group==='fx'&&game&&(game.mode==='paused'||game.mode==='dead'))return;
    if(audioVoices.size>=52||[...audioVoices].filter(v=>v.group===group).length>=(group==='music'?40:12-cityAudioVoices-MUTANT_MEDIA.fxCount()))return;
    let source, nodes=[],entry;
    try {
      const noisy=type==='noise'&&noiseBuffer;
      source=noisy?audio.createBufferSource():audio.createOscillator();nodes.push(source);
      if(noisy)source.buffer=noiseBuffer;
      else {source.type=type==='noise'?'triangle':type;source.frequency.setValueAtTime(Math.max(25,hz),t);if(sweep&&!filterHz)source.frequency.exponentialRampToValueAtTime(Math.max(25,sweep),t+len);}
      let tail=source;
      if(distort&&gritCurve)try {const sh=audio.createWaveShaper();sh.curve=gritCurve;tail.connect(sh);nodes.push(sh);tail=sh;}catch(e){/* optional coloration */}
      if(filterHz)try {
        const f=audio.createBiquadFilter();f.type=noisy?'highpass':'lowpass';f.Q.value=noisy?.6:3;
        f.frequency.setValueAtTime(filterHz,t);
        if(sweep){for(let n=1;n<=4;n++)f.frequency.exponentialRampToValueAtTime(n%2?sweep:filterHz,t+len*n/4);}
        tail.connect(f);nodes.push(f);tail=f;
      }catch(e){/* keep oscillator/noise audible */}
      const env=audio.createGain();nodes.push(env);env.gain.setValueAtTime(.0001,t);
      env.gain.linearRampToValueAtTime(level,t+.004);env.gain.exponentialRampToValueAtTime(.0001,t+len);
      tail.connect(env);env.connect(group==='music'?scoreBus:fxBus);
      entry={source,env,group,clean(){audioVoices.delete(entry);nodes.forEach(n=>{try{n.disconnect();}catch(e){}});}};
      audioVoices.add(entry);source.onended=entry.clean;source.start(t);source.stop(t+len+.01);
      return true;
    }catch(e){if(entry)entry.clean();else nodes.forEach(n=>{try{n.disconnect();}catch(e){}});}
  }
  function drum(kind,t,accent=1) {
    scoreCounts.drums++;
    if(kind==='kick'){voice(145,t,.16,.16*accent,'sine','music',0,43);voice(1100,t,.018,.022*accent,'noise');}
    else if(kind==='snare'){voice(185,t,.1,.065*accent,'triangle','music',0,100);voice(1000,t,.13,.09*accent,'noise','music',1200);}
    else voice(6000,t,kind==='open'?.13:.035,.025*accent,'noise','music',6500);
  }
  function playSfx(kind) {
    if(muted||!audio||audio.state!=='running'||!fxBus||document.hidden)return;
    const t=audio.currentTime, limits={shot:.075,volley:.12,hit:.07,critical:.09,fish:.075};
    if(t-(sfxLast[kind]??-100)<(limits[kind]||.18))return;sfxLast[kind]=t;
    const tone=(hz,d,v=.06,type='sine',delay=0,end=0)=>voice(hz,t+delay,d,v,type,'fx',0,end);
    const crunch=(d,v,hz)=>voice(hz,t,d,v,'noise','fx',hz);
    if(kind.startsWith('company-')){
      const event=kind.slice(8),patterns={feed:[740,510,820],catch:[390,780,990],evolve:[523,659,784,1046],build:[110,165,220],board:[180,360,540],fire:[130,195],breakdown:[310,190,80],repaired:[220,440,660],mark:[880,1100],brew:[330,466,660],recycle:[140,280],blackout:[210,90],arc:[1174,587,1174],delivery:[659,880],curse:[415,392,196]};
      (patterns[event]||[440,550]).forEach((hz,i)=>tone(hz,.10,.025,event==='breakdown'?'sawtooth':'triangle',i*.065));return;
    }
    if(kind==='shot'||kind==='volley'){crunch(.045,.065,1800);tone(kind==='shot'?220:330,.055,.035,'sawtooth',0,75);}
    else if(kind==='hit'||kind==='critical'){crunch(.06,.055,800);tone(kind==='critical'?780:170,.07,.035,'triangle',0,90);}
    else if(kind==='danger'){tone(240,.16,.05,'sawtooth',0,100);}
    else if(kind==='guard'){crunch(.12,.06,700);tone(120,.23,.07,'triangle');}
    else if(kind==='reroll'){[440,554.37,739.99,880].forEach((n,i)=>tone(n,.09,.055,'triangle',i*.04));}
    else if(kind==='boss-spawn'){crunch(.27,.16,330);tone(94,.42,.10,'sawtooth');tone(141,.34,.055,'square',.12);}
    else if(kind==='super-elite'){tone(175,.22,.065,'sawtooth');tone(261,.27,.06,'square',.12);crunch(.12,.08,540);}
    else if(kind==='elite-spawn'){tone(310,.2,.055,'sawtooth');tone(465,.17,.045,'triangle',.09);}
    else if(kind==='boss-warn'){tone(200,.17,.07,'sawtooth',0,160);tone(330,.15,.04,'square',.12);}
    else if(kind==='enemy-cast'){tone(380,.15,.05,'sine',0,165);tone(540,.15,.035,'triangle',.07);}
    else if(kind==='enemy-shot'){crunch(.09,.05,1300);tone(300,.13,.045,'triangle',0,190);}
    else if(kind==='boss-defeat'){crunch(.25,.12,500);[164.81,246.94,329.63,493.88].forEach((hz,i)=>tone(hz,.28,.06,'triangle',i*.075));}
    else if(kind==='elite-defeat'){tone(492,.17,.06,'triangle');tone(738,.17,.04,'sine',.1);}
    else if(kind==='victory'){[261.63,329.63,392,523.25,659.25,783.99,1046.5].forEach((n,i)=>tone(n,.38,.08,'triangle',i*.12));}
    else if(kind==='failure'){[220,196,164.81,110].forEach((n,i)=>tone(n,.24,.05,'sawtooth',i*.12));}
    else {const notes=kind==='level'?[659.25,783.99,987.77,1318.51]:kind==='heal'?[329.63,493.88,659.25]:kind==='power'?[440,659.25,880]:[987.77,1318.51];
      notes.forEach((hz,i)=>tone(hz,kind==='level'?.22:.13,.035,'sine',i*.055));}
  }
  // Preserve legacy event contract without letting it create contexts outside gestures.
  function sound(freq=480,len=.08,type='sine',volume=.035) {
    if(!audio||muted||document.hidden)return;
    const t=audio.currentTime;if(t-(sfxLast.legacy??-100)<.065)return;sfxLast.legacy=t;
    voice(freq,t,Math.min(.4,len),Math.min(.045,volume),type,'fx',0,Math.max(80,freq*.72));
  }
  function music() {
    const active=!!(audio&&musicBus&&!muted&&!document.hidden&&game&&game.mode==='running'&&audio.state==='running');
    const next=active?(game.enemies.some(e=>e.variant==='boss')?'boss':(Math.floor((game.campaign.night-1)/12)%3===0?'ironmarch':Math.floor((game.campaign.night-1)/12)%3===1?'afterlight':'survival')):'silent';
    if(!audio||!musicBus)return;
    const now=audio.currentTime;
    MUTANT_MEDIA.sync(game,active,audio,musicBus,scoreBus,fxBus,()=>12-cityAudioVoices-[...audioVoices].filter(v=>v.group==='fx').length);
    if(masterBus)masterBus.gain.setTargetAtTime(muted||document.hidden||game&&game.mode==='paused'?0:volume,now,.015);
    if(next!==musicMode){
      const previous=musicMode;stopVoices('music');musicMode=next;scoreStep=0;musicNext=now+.015;
      musicBus.gain.cancelScheduledValues(now);musicBus.gain.setTargetAtTime(active?.62:0,now,.018);
      if(next==='silent')stopVoices('fx');
      if(next==='boss'){
        scoreCounts.bossDrops++;drum('snare',now,.8);
        voice(420,now,.22,.055,'sawtooth','music',2400,140);
        voice(100,now+.16,.36,.12,'sine','music',0,30);musicNext=now+.28;
      }else if(next==='survival'&&previous==='boss'){
        drum('kick',now);[164.81,246.94,329.63].forEach(h=>voice(h,now,.35,.035,'triangle'));musicNext=now+.12;
      }
    }
    if(!active){musicNext=now;return;}
    const biome=game.world.epoch%4,event=game.cityEvents.active?game.cityEvents.active.kind:null;
    const phase=next==='boss'?'boss-drop':event?'event':game.t%32>=24?'buildup':game.t%32<8?'drop':'groove';
    if(arrangement.biome!==biome||arrangement.event!==event||arrangement.phase!==phase){
      if(arrangement.biome!==biome||arrangement.event!==event){
        voice(165*Math.pow(2,biome/12),now,.25,.035,'triangle');drum('open',now,.6);
      }
      if(phase==='drop'||phase==='boss-drop'){arrangement.drops++;drum('kick',now,1.1);}
      arrangement.phase=phase;arrangement.biome=biome;arrangement.event=event;arrangement.transitions++;
    }
    if(musicNext<now-.15)musicNext=now;
    const boss=next==='boss',newSong=MAJOR.songs[next],stepLen=60/(newSong?newSong.bpm:boss?142:174)/4;
    // E minor: E–C–G–D, each root lasts two bars; fixed original rhythmic motifs.
    while(musicNext<now+.12){
      const s=scoreStep%16,bar=Math.floor(scoreStep/16)%8,t=musicNext;
      const root=[82.4069,65.4064,97.9989,73.4162][(Math.floor(bar/2)+biome)%4];
      if(newSong){
        // Two distinct original 16-step phrases, with separated percussion and melodic contour.
        const rootHz=newSong.roots[bar%newSong.roots.length],semi=newSong.lead[s],bassSemi=newSong.bass[s];
        if(next==='ironmarch'){
          if([0,6,8,11].includes(s))drum('kick',t,1.1);
          if([4,12].includes(s))drum('snare',t,.9);
          if(s%2===0)drum('hat',t,.85);
          if(s%4===3)drum('hat',t,.42);
        }else{
          if([0,7,10].includes(s))drum('kick',t,.8);
          if([5,13].includes(s))drum('snare',t,.55);
          if(s%3===0)drum('hat',t,.45);
        }
        if(bassSemi!==null){
          const hz=rootHz*.5*Math.pow(2,bassSemi/12);
          scoreCounts.bass++;
          voice(hz,t,stepLen*(next==='ironmarch'?1.7:2.8),next==='ironmarch'?.076:.048,'sawtooth','music',next==='ironmarch'?650:900,0,next==='ironmarch');
          voice(hz/2,t,stepLen*2,.032,'sine');
        }
        if(semi!==null){
          const hz=rootHz*2*Math.pow(2,semi/12);scoreCounts.lead++;
          voice(hz,t,stepLen*(next==='ironmarch'?1.3:2.7),next==='ironmarch'?.037:.028,
            next==='ironmarch'?'square':'triangle','music',next==='ironmarch'?1800:2600);
          if(next==='afterlight')voice(hz*.5,t+stepLen*.2,stepLen*2,.013,'sine','music',1900);
        }
        if(s===15&&bar%2===1){
          voice(rootHz*4,t,stepLen*1.7,.031,'triangle','music',2500);
        }
        musicBeat++;scoreStep++;musicNext+=stepLen;
        continue;
      }
      if(phase==='buildup'&&s%2===0){drum('snare',t,.22+(game.t%8)/24);voice(root*4,t,stepLen,.012,'sawtooth','music',800+(game.t%8)*400);}
      if(phase==='event'&&s===15)drum('snare',t,.55);
      if((boss?[0,7,10]:[0,6,10,14]).includes(s))drum('kick',t);
      if((boss?[8]:[4,12]).includes(s))drum('snare',t);
      if(s%2===0)drum(s===14?'open':'hat',t,s%4===0?1:.65);
      if(!boss&&[3,11].includes(s))drum('hat',t,.4);
      if(bar%4===3&&[13,15].includes(s))drum('snare',t,.38);
      if((boss?[0,3,6,10,12]:[0,2,5,6,8,10,13]).includes(s)){
        scoreCounts.bass++;
        voice(root/2,t,stepLen*(boss?2.7:1.5),.075,'sine');
        voice(root,t,stepLen*(boss?2.8:1.1),boss?.065:.045,'sawtooth','music',boss?230:1100,boss?2100:0,true);
        if(!boss)voice(root*1.5,t,stepLen*1.05,.028,'sawtooth','music',1500,0,true);
      }
      if(!boss&&[3,7,11,14].includes(s)){
        scoreCounts.lead++;
        const semis=[7,10,12,14,12,7,5,2],hz=164.8138*Math.pow(2,semis[(bar*2+Math.floor(s/4))%8]/12);
        voice(hz,t,stepLen*2,.025,'triangle','music',2400);voice(hz*1.005,t,stepLen*1.8,.01,'sawtooth','music',1800);
      }else if(boss&&s===14&&bar%2===1){scoreCounts.lead++;[root*2,root*3].forEach(h=>voice(h,t,.12,.025,'square','music',1700));}
      musicBeat++;scoreStep++;musicNext+=stepLen;
    }
  }
  const SPAWN_MARGIN=96;
  function outsideViewport(x,y,pad=SPAWN_MARGIN){
    const p=game.player;
    return Math.abs(y-p.y)>H/2+pad || Math.abs(x-p.x)>W/2+pad;
  }
  function safeSpawn(radius=600, margin=30) {
    const p=game.player,pad=SPAWN_MARGIN+Math.max(30,margin);
    for(let i=0;i<16;i++){
      const edge=Math.floor(rand()*4),offset=80+i*24;
      const x=edge<2?p.x+(edge===0?-1:1)*(W/2+pad+offset):p.x+rnd(-W/2,W/2);
      const y=edge<2?p.y+rnd(-H/2,H/2):p.y+(edge===2?-1:1)*(H/2+pad+offset);
      const spot=nearestSafeSpace(x,y,Math.max(30,margin));
      if(outsideViewport(spot.x,spot.y,pad)&&game.unseen.open[cityDistrict(spot.x,spot.y)])return spot;
    }
    for(let i=0;i<64;i++){const a=i*TWO/64,q=nearestSafeSpace(p.x+Math.cos(a)*400,p.y+Math.sin(a)*400,margin+30);if(game.unseen.open[cityDistrict(q.x,q.y)]&&cityLine(p,q))return q;}return nearestSafeSpace(p.x+100,p.y,margin+30);
  }

  const MUTANTS=window.CATA_MUTATIONS, MUTANT_MEDIA=window.CATA_MUTATION_MEDIA;
  const mutationAPI={
    district:p=>cityDistrict(p.x,p.y),
    clear:(p,r)=>game.unseen.open[cityDistrict(p.x,p.y)]&&isTerrainClear(p.x,p.y,r),
    line:cityLine,
    get roofRange(){return Math.max(W,H)/2+220;},
    route(e,p){const v=navigationDelta(e,p.x,p.y);return {x:e.x+v.x,y:e.y+v.y};},
    entry(roof){
      const p=game.player;
      for(let i=0;i<24;i++){
        const angle=(i+game.director.serial%24)*TWO/24,c=Math.cos(angle),s=Math.sin(angle);
        const edge=Math.min((W/2+50)/Math.max(.001,Math.abs(c)),(H/2+50)/Math.max(.001,Math.abs(s)));
        const r=roof?edge:Math.min(350,Math.max(205,edge));
        const q={x:p.x+c*r,y:p.y+s*r};
        if(this.clear(q,29)&&cityLine(p,q)&&(!roof||outsideViewport(q.x,q.y,35)))return q;
      }
      return null;
    },
    spawn(pos,raised){
      const g=game,cost=raised?1:3;
      if(g.enemies.length>=liveCap()||g.enemies.filter(e=>!e.majorId).length>=110||
        (raised&&g.enemies.filter(e=>e.mRaised).length>=5)||
        g.enemies.reduce((n,e)=>n+enemyThreat(e),cityThreat())+cost>g.director.budget||
        !this.clear(pos,23)||dist(pos.x,pos.y,g.player.x,g.player.y)<70)return null;
      const e={x:pos.x,y:pos.y,id:++g.director.serial,variant:'shambler',r:20,
        hp:3,max:3,damage:.65,speed:90,phase:0,hurt:0,weight:raised?0:1,
        mRaised:raised,mRetreat:raised?g.t+24:Infinity,arrivalUntil:raised?g.t+.55:0,threatCost:cost,applyMutation};
      g.enemies.push(e);return e;
    },
    steal:COMPANY.steal,
    refund(e,value){COMPANY.returnStolen(game,value);addFish(e.x,e.y,value);},
    volley(e,count){
      for(let i=0;i<count&&game.enemyShots.length<80;i++){
        const a=(i+.5)*TWO/count;
        game.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*192,vy:Math.sin(a)*192,r:8,life:1.5,damage:.9,kind:'hex'});
      }
    }
  };

  const WILDCARD=window.CATA_WILDCARD, WILDCARD_ART=window.CATA_WILDCARD_ART;
  const wildcardAPI={
    district:mutationAPI.district,clear:mutationAPI.clear,line:cityLine,
    bypass:ignoresTerrain,reward:addFish,
    admit(){
      const g=game;
      if(g.director.blocked||g.director.recovery>0||
        g.enemies.some(e=>e.family==='mimic-stray'||e.cityGate)||
        g.unseen.gates.some(gate=>gate.active))return;
      const position=mutationAPI.entry(false);
      if(!position||cityDistrict(position.x,position.y)!==0)return;
      const enemy=mutationAPI.spawn(position,false);
      if(!enemy)return;
      MUTANTS.attach(g,enemy,'mimic-stray');
      enemy.hp=enemy.max=5;enemy.speed=100;enemy.damage=.8;enemy.mRetreat=g.t+12;
      return enemy;
    }
  };

  function edgeAid(dt) {
    // Horizontal seams have no edges. Retain the crowd emergency shield.
    const g=game,p=g.player;
    g.edgeWarning=false;g.escapeCooldown=Math.max(0,g.escapeCooldown-dt);g.escape=Math.max(0,g.escape-dt);
    const crowded=g.enemies.filter(e=>dist(e.x,e.y,p.x,p.y)<145).length>=6;
    if(!crowded)g.escapeArmed=true;
    if(crowded&&g.escapeArmed&&g.escapeCooldown===0){
      g.escapeOrigin={x:p.x,y:p.y};g.escapeOverdriveTimer=4.5;g.escapeArmed=false;
      g.escape=2.5;g.escapeCooldown=10.5;
      notify('EMERGENCY SHIELD · Break through the crowd',2.5);sound(740,.18);
    }
  }
  function notify(message,duration=1.5,id=message) {
    // Rare story beats only. Environmental warnings, ability triggers and ordinary loot are visual.
    if(!/^(NIGHT 99|NIGHT 100|BOSS|SUPER-ELITE|ELITE|LEVEL [369]|THE CATASTROPHE|CROWN)/.test(message))return;
    duration=Math.min(duration,2.2);
    if(noticeTTL>0){if(noticeQueue.length<2&&!noticeQueue.some(n=>n.id===id))noticeQueue.push({message,duration,id});return;}
    if(game){game.lastNotice={id,message,time:game.t};}
    $('notice').textContent=message; $('notice').hidden=false; noticeTTL=duration;
  }
  function start() {
    stopCityAmbience();
    MUTANT_MEDIA.reset();stopVoices();musicMode='silent';scoreStep=0;
    arrangement.phase='groove';arrangement.biome=-1;arrangement.event=null;musicNext=0;musicBeat=0;
    recordRun();
    const runSeed=new URLSearchParams(location.search).get('seed');
    seeded=(runSeed!==null?Number(runSeed):(Date.now()^0xD00DCA7))>>>0;
    const citySeed=seeded;
    initMap();
    const player={x:1340,y:1340,r:21,hp:3,maxHp:3,inv:0,speed:cfg.speed,armor:0,criticalBoost:0,focus:0,areaBurst:0,tacticalMomentum:0,
      animation:{state:'idle',clock:0,frame:0,attack:0,hit:0,moving:false},survivalTimer:0,survivalInstinctBuff:0,xpGain:1,autoFireDisabled:false,silence:0,phaseCooldown:0,petPicks:0,shots:0,aim:0,level:1,damage:1,multishot:0,ricochet:0,magnet:0,shotInterval:Math.max(MIN_SHOT_INTERVAL,cfg.shotInterval)};
    game={mode:'running',t:0,run:completedRuns+1,runScale:1+Math.log2(1+completedRuns)*.18,runRecorded:false,bossEncounters:0,player,enemies:[],shots:[],fishItems:[],particles:[],pickupEffects:[],spawnCount:0,
      squadTactic:'default',squadTacticDuration:0,squadTacticCooldown:0,nextTactic:0,nightCycle:{waveCount:1},companionSquad:[],squadStats:{damage:.5,rate:1,count:1,spread:0,bounce:0},offerSeed:(new URLSearchParams(location.search).has('seed')?Number(new URLSearchParams(location.search).get('seed')):crypto.getRandomValues(new Uint32Array(1))[0])>>>0,offerState:0,companionRanks:Object.fromEntries(roleNames.map(r=>[r,0])),
      feralInstinct:{active:false,timer:0,duration:6,armed:true},effectiveBuffs:{speed:1,damage:1,fire:1,magnet:0,healing:0,mitigation:0},
      hazards:{toxicGasClouds:[],spawnTimer:0},powerups:[],buffs:{rage:0,magnet:0,survivalInstinct:0},survivalTimer:0,lastDamage:-10,escapeOverdriveTimer:0,feralInstinctOverdrive:0,escapeOrigin:null,runicRelic:{held:null,active:null,duration:0,cooldown:0,nextSpawn:35,items:[]},nextPower:EXPLORATION.first,powerCount:0,bossMilestone:0,
      escape:0,escapeCooldown:0,escapeArmed:true,edgeWarning:false,kills:0,fish:0,survivalPoints:0,scoreLedger:SCORE.newLedger(),xp:0,upgrades:[],pendingUpgrade:false,wave:1,spawn:1.5,shake:0,now:0};
    game.unseen=createCity(citySeed);fishingInit();
    WILDCARD.init(game,wildcardAPI,STRESS_MODE);
    game.lives=9;game.lifeLosses=0;game.offerCount=3;game.grace=0;game.reviveClock=0;game.lifeReward={checked:false,claimed:false,won:false,at:180,chance:.18};
    $('revive-panel').hidden=true;
    game.campaign=MAJOR.newLedger();game.rerollTokens=2;game.rerollDrops=[];game.enemyShots=[];game.majorEncounterSerial=0;
    game.majorFinalSpawned=false;game.victory=false;
    game.wavePulse=0;game.bossFlash=0;game.magnetFlash=0;game.magnetSweepCount=0;game.magnetSweepFish=0;
    game.equipment={lens:0,coil:0,capacitor:0};game.buildEffects={conducted:0,recharged:0,slowed:0};game.exploration={attempts:0,spawned:0,lastSpawn:-150};
    game.encore={charge:0,window:0,cooldown:0,wave:null,activations:0,hits:0};
    game.director={budget:12,aliveThreat:0,nearby:0,kills:0,dps:0,pendingKills:0,pendingDamage:0,blocked:false,recovery:0,mutationCooldown:0,spawnDelay:1.65,spawns:0,suppressed:0,mutations:0,criticalShots:0,fusionCooldown:12,fusions:0,emerged:0,cocoonsDestroyed:0,serial:0,frameMs:16.7,framePressure:false};
    game.cityEvents={active:null,nextCrane:90,nextCity:120,cityIndex:0,serial:0,
      counts:{crane:0,street:0,elite:0},completed:{crane:0,street:0,elite:0},recoveryUntil:0,
      relayUnlocked:false,relay:null,playerHits:0,enemyHits:0,avoids:0,maxDebris:0};
    game.world={epoch:0,currentBiomeId:BIOMES[0].id,epochs:[{from:Number.MAX_SAFE_INTEGER,biome:0}],frontier:0,minY:2100,maxY:2100,cameraY:2100-H/2,chunk:0,scrollDirection:'static',scrollSpeed:0};
    game.progressionMilestones=[];game.risingShadow={active:false,warning:0,y:0,hits:0};
    game.endgame={active:false,victories:0,spawned:0,cooldown:0,complete:false,reward:null};
    game.offerState=game.offerSeed;
    game.catSpeech=CATS.create(game.offerSeed^0xCA7);game.formationPlan={side:1,spacing:1,next:0,changes:0};
    $('pause-overlay').hidden=true;clearInput(); noticeTTL=0;noticeQueue=[];$('notice').hidden=true;$('upgrade-overlay').hidden=true;
    pointer=null; $('start-overlay').hidden=true; $('pause').hidden=false;
    $('pause').textContent='Ⅱ';$('stick').hidden=true;
    musicBeat=0;musicNext=audio?audio.currentTime:0;sound(700,.12);last=performance.now();
    if(STRESS_MODE){setupNight100Lab();startMajorNight(new URLSearchParams(location.search).has('qaNight100')?100:99);}
    else {setupCreditCampaign();startMajorNight(1);}
    updateHud();
  }
  // One-button late-game test; normal 1.0 score and run history are not touched.
  function setupCreditCampaign(){
    const g=game;
    const param=Number(new URLSearchParams(location.search).get('directorSeed'));
    const seed=Number.isFinite(param)&&param>0?param>>>0:g.offerSeed;
    g.labEconomy=LAB.create(seed);g.labQueue=[];g.labWave=null;g.labNextSpawn=0;
    g.labFinalTotal=0;g.labFinalSpawned=0;g.labSpawned=0;g.labFinalBossId=null;
    g.damagePopups=[];$('arena').classList.remove('lab-inferno');
  }
  function setupNight100Lab(){
    const g=game,p=g.player,params=new URLSearchParams(location.search);
    const qa=params.has('qaNight100');
    const directorSeed=Number(params.get('directorSeed'))||990100;
    g.labEconomy=LAB.create(directorSeed);
    g.labEconomy.primeTo(qa?99:98);
    const intro=qa?100:99;
    g.t=MAJOR.getNight(intro).start;g.wave=intro;g.nightCycle.waveCount=intro;g.campaign.night=intro-1;
    g.labQueue=[];g.labWave=null;g.labNextSpawn=g.t;
    g.labFinalTotal=0;g.labFinalSpawned=0;g.labSpawned=0;g.labFinalBossId=null;
    g.damagePopups=[];g.isStressTest=true;
    g.qaSpawnScale=qa?clamp(Number(params.get('qaSpawnScale'))||1,1,30):1;
    g.runScale=2;
    p.level=100;p.damage=6;p.maxHp=26;p.hp=26;p.inv=0;p.speed=340;
    p.shotInterval=.26;p.multishot=1;p.ricochet=2;p.magnet=2;
    p.armor=.28;p.criticalBoost=.2;p.xpGain=1.4;p.focus=2;p.areaBurst=2;
    g.squadStats.damage=.68;g.squadStats.rate=1.5;g.squadStats.count=1;
    g.squadStats.spread=1;g.squadStats.bounce=1;
    g.equipment.lens=1;g.equipment.coil=1;g.equipment.capacitor=1;
    for(const role of ['shooter','healer','tank','sniper']){
      summonCompanion(role);summonCompanion(role);summonCompanion(role);
    }
    g.rerollTokens=3;g.nextPower=g.t+120;
    g.cityEvents.nextCrane=Infinity;g.cityEvents.nextCity=Infinity;
    g.hazards.spawnTimer=Infinity;
    g.world.epoch=7;g.world.currentBiomeId=BIOMES[3].id;
    g.progressionMilestones=[3,6,9];
    $('arena').classList.remove('lab-inferno');
  }
  function claimLifeReward(){
    const g=game,p=g.player,r=g.lifeReward;
    if(r.claimed||!r.won)return false;
    r.claimed=true;
    if(g.lives<9){g.lives++;$('life-announcement').textContent='Rare lost life recovered. '+g.lives+' of 9 lives.';notify('RARE LOST LIFE +1 · THE WARRANTY STILL EXISTS',4);}
    else {p.maxHp+=.5;p.hp=Math.min(p.maxHp,p.hp+.5);notify('RARE LOST LIFE · AT CAP: +0.5 MAX HP INSTEAD',4);}
    playSfx('level');updateHud();return true;
  }
  function loseLife(){
    const g=game,p=g.player;
    if(g.mode!=='running'||p.hp>0||g.grace>0)return;
    WILDCARD.lifeLost(g);
    g.lives=Math.max(0,g.lives-1);g.lifeLosses++;
    if(g.lives===1)MUTANTS.say(g,'One life left. Keep a street open.');
    clearInput();
    $('life-announcement').textContent=g.lives+' of 9 lives remaining.';
    const hud=$('lives-hud');hud.classList.remove('life-lost');void hud.offsetWidth;hud.classList.add('life-lost');
    if(!g.lives){updateHud();end();return;}
    g.mode='reviving';g.reviveClock=.9;p.animation.state='hit';
    $('revive-title').textContent=g.lives===1?'LAST LIFE. MAKE IT WEIRD.':'LIFE '+(g.lifeLosses)+' · RETURN TO SENDER';
    $('revive-copy').textContent=g.lives===1?'“The warranty department has blocked my number.”':'“I meant to do that. For tax reasons.”';
    $('revive-detail').textContent=g.lives+' lives remain · XP, squad and upgrades kept';
    $('revive-panel').hidden=false;playSfx('danger');sound(165,.3,'triangle');updateHud();
  }
  function reviveTick(dt){
    const g=game,p=g.player;
    g.reviveClock=Math.max(0,g.reviveClock-dt);
    if(g.reviveClock>0)return;
    // Same run, same position, same enemy/pickup ledgers. Clear only hostile shots
    // already overlapping the cat. Grace permits movement out of the crowd.
    g.enemyShots=g.enemyShots.filter(s=>dist(s.x,s.y,p.x,p.y)>110);
    g.grace=2.8+(p.returnGrace||0)+(p.secondWind?1:0);
    p.hp=Math.max(.5,p.maxHp*(p.secondWind?.8:.6));p.inv=g.grace;
    p.animation.hit=0;p.animation.recovery=.35;p.animation.state='recover';p.revenantUntil=g.t+8;
    g.lastDamage=g.t;g.mode='running';clearInput();
    $('revive-panel').hidden=true;
    MUTANTS.say(g,'Back up. Clear the street.');
    burst(p.x,p.y,'#a8ffee',28);playSfx('level');
    notify(g.lives===1?'LAST LIFE · “ONE MORE BAD IDEA.”':'BACK ON MY NONSENSE · '+g.lives+' LIVES',3);
    updateHud();
  }
  function end() {
    if(game?.fishing)game.fishing.active=null;
    stopCityAmbience();
    if(!game || game.mode==='dead')return;
    game.mode='dead';$('revive-panel').hidden=true;clearInput();persistEncounterLedger();recordRun();saveBest();$('overlay-title').textContent='NINE LIVES. ZERO LEFT.';
    $('overlay-copy').textContent='You survived '+Math.floor(game.t)+' seconds, defeated '+
      game.kills+' zombies, and rescued '+game.fish+' fish. Score: '+scoreSnapshot().total.toLocaleString()+'. Fishing JACKPOT '+game.fishing.jackpot+' (separate, cap 10,000). Ready for another run?';
    $('play').textContent='↻ PLAY AGAIN'; $('start-overlay').hidden=false;
    $('pause').hidden=true;$('stick').hidden=true;pointer=null;music();
  }
  function pause() {
    stopCityAmbience();
    if(!game || ['dead','won','upgrade'].includes(game.mode))return;
    // Freeze the reserved cast with simulation time; pausing cannot erase its danger.
    clearInput();
    if(['running','reviving'].includes(game.mode)){
      game.wildcard.pulse=null;game.pausedFrom=game.mode;game.mode='paused';$('pause-overlay').hidden=false;$('resume').focus({preventScroll:true});$('overlay-title').textContent='PAUSED';
      $('overlay-copy').textContent='Your cat is taking a well-deserved break. Resume to continue the same run.';
      $('play').textContent='▶ RESUME'; $('start-overlay').hidden=true;
      $('pause').textContent='▶';$('stick').hidden=true;pointer=null;
    }else{
      game.mode=game.pausedFrom||'running';$('pause-overlay').hidden=true;$('start-overlay').hidden=true;$('pause').textContent='Ⅱ';$('pause').focus({preventScroll:true});
      last=performance.now();
    }
  }
  function clearInput() {
    if(pointer && typeof pointer.id==='number') {
      try { canvas.releasePointerCapture(pointer.id); } catch(e) { /* already released */ }
    }
    pointer=null;keys={};$('stick').hidden=true;$('thumb').style.transform='translate(0,0)';
  }
  // All four choices are real, unique and weighted; rerolls cannot sell an empty pool.
  function rollMajorChoices(){
    const buttons=[...document.querySelectorAll('[data-upgrade]')];
    let pool=buttons.filter(b=>upgradeAvailable(b.dataset.upgrade));
    const prior=[...(game.offered||[])].sort().join('|'),offered=[];
    const weight=b=>commonIds.includes(b.dataset.upgrade)?5:['squad-damage','squad-rate','squad-count'].includes(b.dataset.upgrade)?3:majorUpgradeIds.includes(b.dataset.upgrade)?3:1;
    for(let i=0;i<game.offerCount&&pool.length;i++){
      const eligible=i===0?pool.filter(b=>commonIds.includes(b.dataset.upgrade)):pool;
      const use=eligible.length?eligible:pool;
      let roll=offerRand()*use.reduce((n,b)=>n+weight(b),0),chosen=use[use.length-1];
      for(const b of use){roll-=weight(b);if(roll<0){chosen=b;break;}}
      offered.push(chosen);pool=pool.filter(b=>b!==chosen&&(!fishingCards[chosen.dataset.upgrade]||!fishingCards[b.dataset.upgrade]));
    }
    if(offered.map(x=>x.dataset.upgrade).sort().join('|')===prior&&pool.length){
      const replacements=pool.filter(b=>!fishingCards[b.dataset.upgrade]||!offered.some(o=>fishingCards[o.dataset.upgrade]));if(replacements.length)offered[offered.length-1]=replacements[Math.floor(offerRand()*replacements.length)];
    }
    $('upgrade-overlay').dataset.offers=String(offered.length);
    $('reroll-upgrades').setAttribute('aria-label','Reroll all '+offered.length+' offered upgrades');
    game.offered=offered.map(b=>b.dataset.upgrade);
    buttons.forEach(b=>{b.hidden=!offered.includes(b);b.disabled=false;renderUpgradeCard(b);});
    $('reroll-count').textContent=game.rerollTokens;
    $('reroll-upgrades').disabled=game.rerollTokens<1;
    return offered;
  }
  function rerollMajorChoices(){
    if(!game||game.mode!=='upgrade'||game.rerollTokens<1)return;
    game.rerollTokens--;
    const offers=rollMajorChoices();playSfx('reroll');notify('CHOICES REROLLED · '+game.rerollTokens+' REMAIN');
    offers[0]?.focus({preventScroll:true});
  }
  $('reroll-upgrades').onclick=rerollMajorChoices;

  function offerUpgrade() {
    game.pendingUpgrade=true;game.mode='upgrade';clearInput();
    const milestone=game.player.level%3===0;
    if(milestone){
      game.player.maxHp=game.player.maxHp+1;
      game.player.hp=Math.min(game.player.maxHp,game.player.hp+1);
    }
    $('upgrade-title').textContent='LEVEL '+game.player.level+' · CHOOSE ONE';
    $('upgrade-copy').textContent=(milestone?'+1 maximum heart. ':'')+game.offerCount+' random offers. Choose one investment. Combat frozen.';
    const offered=rollMajorChoices();
    $('upgrade-overlay').hidden=false;$('pause').hidden=true;
    updateHud();music();playSfx('level');offered[0]?.focus({preventScroll:true});
  }

  function chooseUpgrade(type) {
    if(!game||game.mode!=='upgrade'||!game.pendingUpgrade||!upgradeAvailable(type)||!game.offered.includes(type))return;
    const p=game.player;
    if(fishingCards[type]){const k=type.slice(8),f=game.fishing;if(['rod','line'].includes(k))f[k]++;else {f.bait=k;f.charges=k==='worm'?6:k==='fishbone'?4:2;}}
    else if(type==='curiosity'){game.offerCount=4;game.rerollTokens++;}
    else if(type==='omniscience'){game.offerCount=5;game.rerollTokens++;}
    else if(type==='loaded-dice')game.rerollTokens+=3;
    else if(type==='second-wind')p.secondWind=true;
    else if(type==='quiet-repair')p.quietRepair=true;
    else if(type==='clock-shield'){p.clockShield=true;p.nextShield=game.t+18;}
    else if(type==='glass-cat'){p.damage*=1.4;p.maxHp*=.75;p.hp=Math.min(p.hp*.75,p.maxHp);}
    else if(type==='fleet-return'){p.speed*=1.1;p.returnGrace=.4;}
    else if(type==='solo-contract')p.soloContract=true;
    else if(type==='squad-care')p.squadCare=true;
    else if(type==='last-laugh')p.lastLaugh=true;
    else if(type==='revenant-tail')p.revenantTail=true;
    else if(type==='tail-pierce')p.tailPierce=(p.tailPierce||0)+1;
    else if(type==='tail-burst')p.tailBurst=(p.tailBurst||0)+1;
    else if(type==='tail-turbo'){p.shotInterval*=.8;p.damage*=1.05;}
    else if(type==='lucky-bounce'){p.ricochet++;p.criticalBoost=Math.min(.5,p.criticalBoost+.05);}
    else if(type==='sprint-dodge')p.sprintDodge=(p.sprintDodge||0)+1;
    else if(type==='shield-rebound')p.shieldRebound=(p.shieldRebound||0)+1;
    else if(type==='squad-crossfire'){p.crossfire=(p.crossfire||0)+1;game.squadStats.damage*=1.25;}
    else if(type==='fish-momentum')p.fishMomentum=(p.fishMomentum||0)+1;
    else if(type==='fire-rate')p.shotInterval*=rateUpgradeFactor();
    else if(type==='damage')p.damage+=.25;
    else if(type==='recover'){p.maxHp+=.25;p.hp=Math.min(p.maxHp,p.hp+1);}
    else if(type==='speed')p.speed+=18/Math.sqrt(1+(p.speed-cfg.speed)/180);
    else if(type==='xp-gain')p.xpGain+=.2;
    else if(type==='armor')p.armor=Math.min(.65,p.armor+.1);
    else if(type==='critical')p.criticalBoost=Math.min(.5,p.criticalBoost+.07);
    else if(type==='shield-pulse'){p.maxHp+=.5;p.hp=Math.min(p.maxHp,p.hp+.75);p.inv=Math.max(p.inv,2);}
    else if(type==='area-burst')p.areaBurst++;
    else if(type==='focus'){p.focus++;p.damage*=1.11;}
    else if(type==='squad-range'){p.squadRange=(p.squadRange||0)+1;game.squadStats.damage+=.1;}
    else if(type==='tactical-momentum'){p.tacticalMomentum++;p.speed*=1.08;p.shotInterval*=.92;}
    else if(type.startsWith('companion-'))summonCompanion(type.slice(10));
    else if(type==='squad-damage')game.squadStats.damage+=.15;
    else if(type==='squad-rate')game.squadStats.rate*=1.2;
    else if(type==='squad-count'){const roles=roleNames.filter(r=>!COMPANY.committed(game,r));summonCompanion(roles[Math.floor(offerRand()*roles.length)]);}
    else if(type==='squad-spread')game.squadStats.spread++;
    else if(type==='squad-bounce')game.squadStats.bounce++;
    else if(type==='multi-shot')p.multishot++;
    else if(type==='ricochet')p.ricochet++;
    else if(type==='fish-magnet')p.magnet++;
    else if(equipmentIds.includes(type))game.equipment[type.slice(6)]++;
    else return;
    game.upgrades.push({level:p.level,type});game.pendingUpgrade=false;
    $('upgrade-overlay').hidden=true;$('pause').hidden=false;$('pause').focus({preventScroll:true});
    clearInput();p.inv=Math.max(p.inv,1);game.mode='running';last=performance.now();notify('UPGRADE EQUIPPED');
    if(game.xp>=xpRequired(p.level)){game.xp-=xpRequired(p.level);p.level++;offerUpgrade();}
  }
  document.querySelectorAll('[data-upgrade]').forEach(button=>{
    button.addEventListener('click',()=>chooseUpgrade(button.dataset.upgrade));
  });
  function resumeOrStart() { if(game && game.mode==='paused')pause();else start(); }
  function moveInput() {
    let vx=0,vy=0;
    if(keys.ArrowLeft||keys.a||keys.A)vx--;
    if(keys.ArrowRight||keys.d||keys.D)vx++;
    if(keys.ArrowUp||keys.w||keys.W)vy--;
    if(keys.ArrowDown||keys.s||keys.S)vy++;
    if(pointer){vx+=pointer.vx;vy+=pointer.vy;}
    const mag=Math.hypot(vx,vy); return mag>0?{x:vx/Math.max(1,mag),y:vy/Math.max(1,mag)}:{x:0,y:0};
  }
  const xpRequired=LAB.xpRequired;
  const threatWeights={...LAB.costs};
  const rangedRole=id=>['ranged','caster'].includes(MAJOR.catalog.normal.find(e=>e.id===id)?.role);
  function clearShot(a,b){const n=Math.ceil(dist(a.x,a.y,b.x,b.y)/18);for(let i=1;i<n;i++)if(!isTerrainClear(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,3))return false;return true;}
  const liveCap=()=>game?.director.framePressure?100:140;
  const enemyThreat=e=>e.threatCost??(e.elite?6:(threatWeights[e.variant]||1)*(e.weight===2?1.5:1)+(e.mutation?1:0));
  const ThreatDirector=Object.freeze({getThreatBudget:()=>game?game.director.budget:12});
  function updateDirector(dt){
    if(!game||game.mode!=='running')return;
    const g=game,d=g.director,p=g.player,a=1-Math.exp(-dt/12);
    d.kills+=(d.pendingKills/Math.max(dt,.001)-d.kills)*a;
    d.dps+=(d.pendingDamage/Math.max(dt,.001)-d.dps)*a;
    d.pendingKills=0;d.pendingDamage=0;
    // Infinite travel must not leave the normal cap stranded behind the camera.
    // Withdrawal grants no combat credit; scripted encounters always remain alive.
    const beforeCull=g.enemies.length,retireDistance=Math.max(W,H)*1.6+700;
    g.enemies=g.enemies.filter(e=>e.majorId||e.encounterId||e.cityGuardian!==undefined||dist(e.x,e.y,p.x,p.y)<=retireDistance);
    d.withdrawn=(d.withdrawn||0)+beforeCull-g.enemies.length;
    d.aliveThreat=cityThreat();d.eventThreat=d.aliveThreat;d.nearby=0;
    for(const e of g.enemies){d.aliveThreat+=enemyThreat(e);if(dist(e.x,e.y,p.x,p.y)<200)d.nearby++;}
    d.recovery=Math.max(0,d.recovery-dt);d.mutationCooldown=Math.max(0,d.mutationCooldown-dt);
    // Strong builds earn clearance, never retaliatory threat.
    const target=STRESS_MODE?240:clamp(34+g.t/20,34,96);
    // Slow upward response; health loss and nearby crowding open a recovery window.
    d.budget+=(target-d.budget)*(1-Math.exp(-dt/20));
    if(d.aliveThreat>=d.budget||d.nearby>=22||g.enemies.length>=liveCap())d.blocked=true;
    else if(d.aliveThreat<d.budget*.72&&d.nearby<13)d.blocked=false;
    d.spawnDelay=LAB.normalSpawnInterval({elapsed:g.t,alive:g.enemies.filter(e=>!e.majorId).length,
      cap:110,hpFraction:p.hp/p.maxHp,killRate:d.kills});
  }
  function applyMutation(type,duration){
    if(!['burst','shield','weave'].includes(type))return;
    this.mutation=type;this.mutationTime=clamp(duration,1,10);this.mutationAge=0;
    this.mutationX=0;this.mutationY=0;
  }
  function updateEnemyBehavior(e,dt,vx,vy,pace){
    if(e.elite){
      e.huntAge+=dt;const cycle=e.huntAge%5;
      if(cycle<1.5){e.huntX=vx;e.huntY=vy;pace=0;}
      else if(cycle<2.2){vx=e.huntX;vy=e.huntY;pace=2.4;}
      else pace=.45;
      return {vx,vy,pace};
    }
    ({vx,vy,pace}=traitBehavior(e,dt,vx,vy,pace));
    if(!e.mutation)return {vx,vy,pace};
    e.mutationTime=Math.max(0,e.mutationTime-dt);e.mutationAge+=dt;
    if(!e.mutationTime){e.mutation=null;return {vx,vy,pace};}
    if(e.mutation==='burst'){
      // One second stationary warning, then a committed, dodgeable 0.6s rush.
      if(e.mutationAge<1){e.mutationX=vx;e.mutationY=vy;pace=.15;}
      else if(e.mutationAge<1.6){vx=e.mutationX;vy=e.mutationY;pace=1.8;}
      else pace=.8;
    }else if(e.mutation==='weave'){
      const angle=Math.sin(e.mutationAge*3)*.65,c=Math.cos(angle),s=Math.sin(angle);
      const x=vx*c-vy*s;vy=vx*s+vy*c;vx=x;pace*=.9;
    }
    return {vx,vy,pace};
  }
  function spawnEnemy(type,mutationFlags){
    const d=game.director,bought=!!(mutationFlags&&mutationFlags.labPurchase);
    if(game.mode!=='running'||game.enemies.length>=liveCap()||game.enemies.filter(e=>!e.majorId).length>=110)return null;
    const unlocked=availableThreats(game.t).filter(k=>k!=='gas');
    let variant=unlocked.includes(type)?type:unlocked[(game.spawnCount+1)%unlocked.length];
    const normals=game.enemies.filter(e=>!e.majorId);
    if(rangedRole(variant)&&normals.filter(e=>rangedRole(e.variant)).length>=Math.min(game.t<360?6:8,Math.floor((normals.length+1)/3)))variant='shambler';
    const extra=(game.t>70&&rand()<.17&&variant==='shambler')?2:1;
    const traits=makeTraits(variant,game.spawnCount,game.t);
    const cost=(threatWeights[variant]||1)*(extra===2?1.5:1)+traitCost(traits);
    d.aliveThreat=cityThreat()+game.enemies.reduce((n,e)=>n+enemyThreat(e),0);
    if(!bought&&(d.blocked||d.aliveThreat+cost>d.budget)){d.suppressed++;return null;}
    const scale=1+Math.min(.45,game.campaign.night*.0045),hp=(2+(extra-1))*scale;
    const e={...safeSpawn(rnd(560,730)),variant,dash:0,r:variant==='weaver'?15:extra===2?25:18,
      hp,max:hp,damage:1+Math.floor((scale-1)/1.5),speed:cfg.enemySpeed*(.85+rand()*.5)*(1+Math.min(.45,game.t/400)),
      phase:rnd(0,TWO),weight:extra,hurt:0,mutation:null,mutationTime:0,applyMutation};
    installTraits(e,traits);e.id=++d.serial;e.threatCost=bought?LAB.priceFor(variant,game.campaign.night):cost;
    const spec=MAJOR.catalog.normal.find(a=>a.id===variant);
    if(spec){e.role=spec.role;e.attackKind=spec.attack;e.attackCooldown=2.5+rand()*2;e.windup=0;
      e.hp*=spec.hp;e.max=e.hp;e.speed*=spec.speed;e.r=spec.role==='caster'?21:e.r;}

    if(!bought&&game.t>=360&&d.mutationCooldown===0&&d.aliveThreat+cost+1<=d.budget&&
      game.enemies.filter(n=>n.mutation).length<2&&rand()<.18){
      const requested=mutationFlags&&mutationFlags.type;
      e.applyMutation(['burst','shield','weave'].includes(requested)?requested:['burst','shield','weave'][Math.floor(rand()*3)],8);
      e.threatCost++;d.mutationCooldown=6;d.mutations++;
    }
    game.enemies.push(e);game.spawnCount++;d.spawns++;d.aliveThreat+=enemyThreat(e);
    if(!game.normalArrivals)game.normalArrivals=[];
    game.normalArrivals.push({timestamp:game.t,id:e.id,kind:variant,x:e.x,y:e.y,playerX:game.player.x,playerY:game.player.y,viewportWidth:W,viewportHeight:H,night:game.campaign.night});
    if(game.normalArrivals.length>512)game.normalArrivals.shift();
    return e;
  }
  // Each of four anatomy slots has one bounded behavior; inheritance never stacks slots.
  const EnemyTraits=Object.freeze({
    legs:['feet','tentacles','wings','phase'],torso:['lean','plated'],arms:['claws','hooks'],head:['single','howler']
  });
  function makeTraits(variant,serial,t){
    return {legs:variant==='orbiter'?'wings':variant==='ghost'?'phase':t>=120&&serial%3===0?'tentacles':'feet',
      torso:t>=180&&serial%4===0?'plated':'lean',arms:t>=240&&serial%3===1?'hooks':'claws',head:t>=360&&serial%5===0?'howler':'single'};
  }
  function traitCost(t){return (t.legs==='feet'?0:.5)+(t.torso==='plated'?.6:0)+(t.arms==='hooks'?.4:0)+(t.head==='howler'?.5:0);}
  function installTraits(e,t){
    e.traits={...t};e.traitAge=0;
    if(t.torso==='plated'){e.hp*=1.7;e.max=e.hp;e.speed*=.8;}
    if(t.legs==='tentacles')e.speed*=.85;
    if(t.arms==='hooks')e.damage*=1.25;
  }
  function ignoresTerrain(e){return !!(e.traits&&(e.traits.legs==='wings'||e.traits.legs==='phase'&&e.traitAge%7>=1.5));}
  function canEnemyContact(e){
    if(e.cocoon||e.consumed||(e.arrivalUntil||0)>game.t)return false;
    if(!MUTANTS.contact(e)||e.pack?.mState==='rally'||e.packScatter>game.t)return false;
    if(!e.traits)return true;
    if(e.traits.legs==='wings')return e.pack?.mState==='charge'?isTerrainClear(e.x,e.y,e.r):e.traitAge%6>=4.5&&e.traitAge%6<5.5;
    if(e.traits.legs==='phase')return e.traitAge%7<1.5&&isTerrainClear(e.x,e.y,e.r);
    return true;
  }
  function traitBehavior(e,dt,vx,vy,pace){
    if(!e.traits)return {vx,vy,pace};
    e.traitAge+=dt;const t=e.traits;
    if(t.legs==='tentacles'){const a=Math.sin(e.traitAge*2)*.5,c=Math.cos(a),s=Math.sin(a);[vx,vy]=[vx*c-vy*s,vx*s+vy*c];}
    if(t.legs==='wings'){const c=e.traitAge%6;pace*=c<3.5?.8:c<4.5?.1:c<5.5?1.7:.5;}
    if(t.legs==='phase'){
      // Never snap a phaser out of solid cover: remain harmless until it exits.
      if(e.traitAge%7<1.5&&!isTerrainClear(e.x,e.y,e.r))e.traitAge=Math.floor(e.traitAge/7)*7+1.5;
      pace*=e.traitAge%7<1.5?.45:.9;
    }
    if(t.head==='howler'){const c=e.traitAge%8;if(c<1)pace=0;else if(c<2)pace*=1.35;}
    return {vx,vy,pace};
  }
  function inheritTraits(a,b){
    // Fixed slot precedence makes the same parents produce the same combination.
    return {legs:['phase','wings','tentacles','feet'].find(v=>[a.legs,b.legs].includes(v)),
      torso:[a.torso,b.torso].includes('plated')?'plated':'lean',
      arms:[a.arms,b.arms].includes('hooks')?'hooks':'claws',head:[a.head,b.head].includes('howler')?'howler':'single'};
  }
  function beginFusion(a,b){
    const g=game;
    if(g.mode!=='running'||!a||!b||a===b||[a,b].some(e=>!g.enemies.includes(e)||e.consumed||e.pack||e.family||e.mRaised||e.fishingMutant||e.cityGuardian!==undefined||e.cityGate||e.cocoon||e.mutant||e.elite||e.variant==='boss'||!e.traits)||g.enemies.some(e=>e.cocoon))return null;
    if(dist(a.x,a.y,b.x,b.y)>110)return null;
    if(g.enemies.filter(e=>e.mutant||e.cocoon).length>=2)return null;
    const cost=enemyThreat(a)+enemyThreat(b),traits=inheritTraits(a.traits,b.traits);
    const pos=nearestSafeSpace(a.x+wrappedDelta(a.x,b.x)/2,(a.y+b.y)/2,30);
    // Reserve exactly both parents' threat throughout incubation and emergence.
    const c={...pos,id:++g.director.serial,variant:'cocoon',cocoon:true,r:30,hp:Math.min(30,(a.max+b.max)*.65),
      speed:0,damage:0,phase:0,hurt:0,weight:a.weight+b.weight,rewardValue:(a.rewardValue||1)+(b.rewardValue||1),
      threatCost:cost,traits,traitAge:0,parentIds:[a.id,b.id],incubation:4,age:0,offspringHp:Math.min(90,a.max+b.max),offspringSpeed:Math.min(115,Math.max(a.speed,b.speed))};
    c.max=c.hp;
    a.consumed=b.consumed=true;g.enemies=g.enemies.filter(e=>e!==a&&e!==b);g.enemies.push(c);
    g.director.fusions++;g.director.fusionCooldown=18;MUTANTS.say(g,'Break that cocoon before it hatches!');
    notify('FUSION · Break the cocoon before it hatches!',3);burst(c.x,c.y,'#e7a4fa',12);return c;
  }
  function updateEvolution(dt){
    if(!game||game.mode!=='running')return;
    const g=game,d=g.director;d.fusionCooldown=Math.max(0,d.fusionCooldown-dt);
    for(const c of [...g.enemies])if(c.cocoon&&!c.consumed){
      c.age+=dt;c.phase+=dt;c.hurt=Math.max(0,c.hurt-dt);c.incubation=Math.max(0,c.incubation-dt);
      if(c.incubation===0){
        const m={...c,traits:{...c.traits},cocoon:false,mutant:true,variant:'mutant',age:0,r:26,hp:c.offspringHp,max:c.offspringHp,
          speed:c.offspringSpeed,damage:c.traits.arms==='hooks'?1.25:1,traitAge:0,applyMutation};
        m.emergence=.6;
        if(m.traits.legs==='tentacles')m.speed*=.85;
        if(m.traits.torso==='plated')m.speed*=.8;
        c.consumed=true;g.enemies.splice(g.enemies.indexOf(c),1,m);d.emerged++;
        burst(m.x,m.y,'#f7b9ff',16);notify('MUTANT EMERGED · Inherited anatomy',2);
      }
    }
    if(g.t<360||g.enemies.filter(e=>e.mutant||e.cocoon).length>=2||d.fusionCooldown>0||d.recovery>0||g.player.hp<1.5||g.cityEvents.active||g.enemies.some(e=>e.variant==='boss'))return;
    const pool=g.enemies.filter(e=>e.traits&&!e.pack&&!e.family&&!e.mRaised&&!e.fishingMutant&&e.cityGuardian===undefined&&!e.cityGate&&!e.cocoon&&!e.mutant&&!e.elite&&!e.consumed);
    for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++)if(dist(pool[i].x,pool[i].y,pool[j].x,pool[j].y)<110){beginFusion(pool[i],pool[j]);return;}
  }
  function drawAnatomy(e){
    if(e.cocoon){
      const pulse=reducedMotion?0:Math.sin(e.age*7)*2;
      circle(0,0,e.r+pulse,'#744a8b');outline(0,0,e.r+5,'#ffcbf3',3);
      for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(0,0,Math.max(5,(e.r-3)*Math.min(1,e.age/.8)),7,i*Math.PI/5,0,TWO);ctx.strokeStyle='#f2b2ed';ctx.lineWidth=2;ctx.stroke();}
      ctx.fillStyle='#fff1cb';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('COCOON '+Math.ceil(e.incubation),0,-40);ctx.textAlign='left';return;
    }
    if(e.mutant&&e.traitAge<.6){const f=e.traitAge/.6;outline(0,0,reducedMotion?e.r+12:e.r+12+f*24,'#f7b9ff',3);}
    const t=e.traits;if(!t)return;
    if(t.legs==='tentacles')for(let i=0;i<6;i++){const a=i*TWO/6+(reducedMotion?0:Math.sin(e.traitAge*3+i)*.2);ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(Math.cos(a)*(e.r+13),Math.sin(a)*(e.r+13));ctx.strokeStyle='#a4e0bb';ctx.lineWidth=5;ctx.stroke();}
    if(t.legs==='wings'){polygon(-e.r,0,[[-24,-16],[-7,-7],[-3,14]],'#82e8f0');polygon(e.r,0,[[24,-16],[7,-7],[3,14]],'#82e8f0');}
    if(t.torso==='plated')outline(0,4,e.r+3,'#b9cdda',5);
    if(t.arms==='hooks')for(const side of [-1,1]){ctx.beginPath();ctx.arc(side*(e.r+6),0,9,0,Math.PI*1.5);ctx.strokeStyle='#ffc87b';ctx.lineWidth=4;ctx.stroke();}
    if(t.head==='howler'){circle(-9,-e.r-5,6,'#ffcf8c');circle(9,-e.r-5,6,'#ffcf8c');}
    if(t.legs==='phase'||t.legs==='wings'||e.mutant){outline(0,0,e.r+9,canEnemyContact(e)?'#ffb18e':'#bda7ff',3);
      ctx.fillStyle='#fff2ce';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(t.legs==='phase'?(canEnemyContact(e)?'SOLID · HIT NOW':'PHASE · HARMLESS'):t.legs==='wings'?(e.traitAge%6>=3.5&&e.traitAge%6<4.5?'DIVE!':'FLYING'):'MUTANT',0,-e.r-25);ctx.textAlign='left';}
  }
  const SpawnManager=Object.freeze({spawnEnemy});
  const Shot={calculateDamage(){return this.damage*(this.critical?1.75:1);},isCriticalHit(){return !!this.critical;}};
  function prepareShot(shot){
    shot.x=wrapCoord(shot.x);
    const p=game.player;
    shot.pierce=Math.min(8,game.equipment.lens+(p.tailPierce||0)+(p.revenantTail&&game.t<p.revenantUntil?2:0));shot.mark=game.equipment.lens>0;
    shot.damage*=1+.15*Math.log1p(Math.max(0,game.equipment.lens-4));
    shot.critical=rand()<clamp(.06+(p.level-1)*.004+Math.max(0,p.damage-1)*.012+p.criticalBoost,.06,.75);
    shot.calculateDamage=Shot.calculateDamage;shot.isCriticalHit=Shot.isCriticalHit;
    if(shot.critical)game.director.criticalShots++;
    return shot;
  }
  function shotAtEnemy(echo=false) {
    if(game.player.autoFireDisabled||!game.enemies.length)return;
    const p=game.player;
    let enemy=null,best=460;
    for(const e of game.enemies){const d=dist(e.x,e.y,p.x,p.y);if(d<best){best=d;enemy=e;}}
    if(!enemy)return;
    const dx=(wrappedDelta(p.x,enemy.x))/best,dy=(verticalDelta(p.y,enemy.y))/best;
    p.aim=Math.atan2(dy,dx);
    const spread=Math.min(4,p.multishot);
    for(let i=-spread;i<=spread&&game.shots.length<160;i++){
      const a=p.aim+i*.18;
      const barrel=ART.heroBarrels(p.aim,27,p.animation.gaitPose?.headingX<-.1?-1:1)[0];
      game.shots.push(prepareShot({x:p.x+barrel.x,y:p.y+barrel.y,vx:Math.cos(a)*600,vy:Math.sin(a)*600,
        life:Math.min(2,.85+p.ricochet*.25),r:6,damage:p.damage*game.effectiveBuffs.damage*((1+Math.min(4,p.multishot)*.35)/(1+2*spread))*Math.max(1,MIN_SHOT_INTERVAL*game.effectiveBuffs.fire/p.shotInterval),bounces:Math.min(3,p.ricochet),hit:[],
        kind:p.multishot>0?'spread':'normal',trail:[],flash:0}));
    }
    if(!echo&&p.tailBurst){p.echoShots=p.tailBurst;p.echoTimer=.11;}
    p.animation.attack=.32;p.lastShotAt=game.t;
    playSfx('shot');
  }
  // Content updates use simulation seconds, so pause and upgrades freeze every timer.
  // One visible representative per role; count investments multiply squad effectiveness.
  function summonCompanion(type='shooter') {
    if(!game||!roleNames.includes(type)||game.companionSquad.some(c=>c.components?.some(a=>a.type===type)))return false;
    const p=game.player;
    let ally=game.companionSquad.find(c=>c.type===type);
    if(!ally&&game.companionSquad.length>=MAX_COMPANIONS)return false;
    if(ally)ally.rank++;
    else {ally={type,rank:1,...nearestSafeSpace(p.x+45,p.y,18),r:18,shotTimer:0,flash:0,specialAbilityReady:true,specialCooldown:0,specialDuration:0};game.companionSquad.push(ally);}
    FOLLOWERS.init(ally);COMPANY.init(ally);COMPANY.earn(ally,ally.rank>1?8:0);
    game.companionRanks[type]=ally.rank;
    if(game.catSpeech)CATS.emit(game.catSpeech,type,'recruit');
    return true;
  }
  // One turret and at most three temporary traps per recruited cat. No extra actors.
  function squadHit(enemy,damage){
    if(enemy.hp<=0)return;
    game.director.pendingDamage+=Math.min(enemy.hp,damage);
    enemy.hp-=damage;enemy.hurt=.15;
    if(enemy.hp<=0)defeatEnemy(enemy);
  }
  function squadShot(pet,target,damage,pierce=0,origin=pet,offset=0){
    if(!target||game.shots.length>=148)return;
    const a=Math.atan2(verticalDelta(origin.y,target.y),wrappedDelta(origin.x,target.x))+offset;
    game.shots.push({x:origin.x,y:origin.y,vx:Math.cos(a)*700,vy:Math.sin(a)*700,life:1.5,r:5,
      damage:damage,bounces:Math.min(2,game.squadStats.bounce),pierce:pierce+(game.player.crossfire||0),mark:pet.type==='sniper',hit:[],speaker:pet.type,kind:'pet',trail:[],flash:0});
    return true;
  }
  // Foraging consumes existing food and never credits it to the player.
  function forageSafe(pet,fish){
    const g=game,p=g.player;
    if(g.enemies.some(e=>e.hp>0&&dist(e.x,e.y,fish.x,fish.y)<110))return false;
    if(dist(fish.x,fish.y,p.x,p.y)>600)return false;
    const dx=fish.x-pet.x,dy=fish.y-pet.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/20));
    const zones=[...cityZones(),...g.hazards.toxicGasClouds.map(c=>({...c,r:Math.max(120,gasRadius(c))}))];
    for(let i=0;i<=steps;i++){
      const x=pet.x+dx*i/steps,y=pet.y+dy*i/steps;
      if(!isTerrainClear(x,y,pet.r)||zones.some(z=>dist(x,y,z.x,z.y)<z.r+pet.r+35)||g.risingShadow.active&&y>g.risingShadow.y-70)return false;
    }
    return true;
  }
  function updateForaging(pet,dt){
    const g=game;
    pet.forageCooldown=Math.max(0,(pet.forageCooldown??(3+roleNames.indexOf(pet.type)*.3))-dt);
    if(pet.forage){
      const f=pet.forage.target;pet.forage.age+=dt;
      if(pet.phase!=='following'||pet.pendingSpecial||!g.fishItems.includes(f)||f.attracted||!forageSafe(pet,f)||pet.forage.age>7){
        pet.forage=null;pet.forageCooldown=24;if(pet.phase==='following')pet.state='following';g.formationPlan.next=0;return null;
      }
      if(dist(pet.x,pet.y,f.x,f.y)<28){
        pet.state='feeding';pet.forage.eating+=dt;
        if(pet.forage.eating>=.85){
          // Remove the cache atomically; player pickup cannot credit the same food.
          const priorLevel=pet.level;COMPANY.eat(g,pet,f);companyEvent(pet,pet.level>priorLevel?'evolve':'feed');playSfx('fish');
          pet.forage=null;pet.forageCooldown=8;pet.meals=(pet.meals||0)+1;pet.state='following';g.formationPlan.next=0;
          CATS.emit(g.catSpeech,pet.type,'fed');return null;
        }
      }else pet.state='seeking-fish';
      return f;
    }
    if(pet.energy>85||pet.forageCooldown>0||pet.phase!=='following'||pet.pendingSpecial||pet.specialDuration>0||g.companionSquad.some(c=>c.forage))return null;
    // Deterministic nearest eligible existing fish; no scan during a role preparation.
    const choices=g.fishItems.filter(f=>!f.attracted&&(!f.reservedRole||f.reservedRole===pet.type||g.t>=f.reservedUntil)&&!f.companionCollected&&dist(f.x,f.y,pet.x,pet.y)<220).sort((a,b)=>dist(a.x,a.y,pet.x,pet.y)-dist(b.x,b.y,pet.x,pet.y));
    const f=choices.find(f=>forageSafe(pet,f));
    pet.forageCooldown=5;
    if(f){pet.forage={target:f,age:0,eating:0};pet.state='seeking-fish';CATS.emit(g.catSpeech,pet.type,'seek');return f;}
    return null;
  }
  function adaptFormation(){
    const g=game,plan=g.formationPlan;if(g.t<plan.next)return;
    plan.next=g.t+16;
    const pressure=g.enemies.filter(e=>e.hp>0&&!e.cocoon&&dist(e.x,e.y,g.player.x,g.player.y)<500);
    const side=pressure.reduce((sum,e)=>sum+(e.x>g.player.x?1:-1),0)>0?-1:1;
    const spacing=pressure.length>5?1.15:1;
    if(side!==plan.side||spacing!==plan.spacing)plan.changes++;
    plan.side=side;plan.spacing=spacing;
  }
  // Department B can subscribe to these simulation events and replace drawCompanyOverlay.
  function companyEvent(pet,event){playSfx('company-'+event);pet.companyEvent=event;pet.eventUntil=game.t+1;globalThis.CATA_COMPANY_PRESENTATION?.event?.({role:pet.type,event,x:pet.x,y:pet.y,level:pet.level});}
  function updateMecha(pet,target,dt,damage){
    pet.mechaClock-=dt;pet.state=pet.mechaStage;
    if(pet.mechaStage==='build'&&pet.mechaClock<=0){pet.mechaStage='board';pet.mechaClock=1;companyEvent(pet,'board');playSfx('guard');}
    else if(pet.mechaStage==='board'&&pet.mechaClock<=0){pet.mechaStage='fire';companyEvent(pet,'fire');}
    else if(pet.mechaStage==='fire'){
      pet.heat=Math.max(0,pet.heat-dt*4);pet.shotTimer-=dt;
      if(target&&pet.shotTimer<=0){const fired=squadShot(pet,target,damage*2.2,3);
        if(fired&&target.hp>0&&target.wildcardMark?.until>game.t)
          WILDCARD.pulse(game,wildcardAPI,pet,target.wildcardMark.scout);
        pet.heat+=13;pet.shotTimer=.18;pet.flash=.15;playSfx('volley');}
      if(pet.heat>=100){pet.mechaStage='repair';pet.mechaClock=6;companyEvent(pet,'breakdown');playSfx('guard');}
    }else if(pet.mechaStage==='repair'){pet.heat=Math.max(0,pet.heat-dt*18);if(pet.mechaClock<=0){pet.mechaStage='board';pet.mechaClock=1;companyEvent(pet,'repaired');}}
  }
  function updateCompanyRole(pet,target,dt,damage){
    const g=game,p=g.player;pet.nextWork-=dt;if(pet.nextWork>0)return;
    const evolved=pet.level===3,radius=evolved?260:170;
    const enemies=g.enemies.filter(e=>e.hp>0&&!e.cocoon&&dist(e.x,e.y,pet.x,pet.y)<radius);
    let worked=false;
    if(pet.type==='angler'&&!target){addFish(pet.x+35,pet.y,evolved?2:1);const catchFish=g.fishItems.at(-1);if(g.fishItems.length<180){catchFish.reservedRole=pet.type;catchFish.reservedUntil=g.t+12;pet.forageCooldown=0;}pet.nextWork=18;worked=true;companyEvent(pet,'catch');}
    if(pet.type==='scout'&&target){for(const e of enemies.length?enemies:[target]){
        e.squadMark=evolved?8:4;e.wildcardMark={scout:pet,until:g.t+2};
      }pet.nextWork=6;worked=true;companyEvent(pet,'mark');}
    if(pet.type==='alchemist'&&pet.energy>=25&&target){pet.energy-=20;for(const e of enemies)e.squadSlow=evolved?6:3;p.hp=Math.min(p.maxHp,p.hp+(evolved?.45:.18));pet.nextWork=8;worked=true;companyEvent(pet,'brew');}
    if(pet.type==='salvager'&&g.kills>(pet.scrapKills||0)+4){pet.scrapKills=g.kills;pet.turret={x:pet.x,y:pet.y,life:evolved?14:7,timer:0,skin:'brass'};pet.nextWork=10;worked=true;companyEvent(pet,'recycle');}
    if(pet.type==='saboteur'&&target){for(const e of enemies){e.squadStun=evolved?2:1;e.shootTimer=Math.max(e.shootTimer||0,3);}g.enemyShots=g.enemyShots.filter(s=>dist(s.x,s.y,pet.x,pet.y)>radius);pet.nextWork=10;worked=true;companyEvent(pet,'blackout');}
    if(pet.type==='stormcaller'&&target){for(const e of enemies.slice(0,evolved?7:3)){squadHit(e,damage*.9);e.squadStun=.5;burst(e.x,e.y,'#93dfff',3);}pet.nextWork=6;worked=true;companyEvent(pet,'arc');}
    if(pet.type==='courier'){
      const food=g.fishItems.filter(f=>!f.attracted&&dist(f.x,f.y,pet.x,pet.y)<radius).sort((a,b)=>dist(a.x,a.y,pet.x,pet.y)-dist(b.x,b.y,pet.x,pet.y));
      for(const f of food.slice(0,evolved?2:1)){const recipient=g.companionSquad.filter(c=>c!==pet).sort((a,b)=>(a.energy||0)-(b.energy||0))[0]||pet;const priorLevel=recipient.level;if(COMPANY.eat(g,recipient,f)){
        if(recipient.type==='scout')WILDCARD.pulse(g,wildcardAPI,pet,recipient);
        companyEvent(recipient,recipient.level>priorLevel?'evolve':'feed');worked=true;burst(recipient.x,recipient.y,'#f5cf75',5);}}
      pet.nextWork=4;if(worked)companyEvent(pet,'delivery');
    }
    if(pet.type==='hexcat'&&target){const victim=enemies.find(e=>e.creditCategory)||target;victim.squadMark=evolved?10:5;victim.squadSlow=3;squadHit(victim,damage*(victim.creditCategory?(evolved?5:2):1));pet.nextWork=9;worked=true;companyEvent(pet,'curse');}
    if(worked){if(COMPANY.earn(pet,3)){notify(pet.type.toUpperCase()+' LEVEL '+pet.level,2);companyEvent(pet,'evolve');playSfx('level');}pet.flash=.5;playSfx(pet.type==='stormcaller'?'volley':'guard');}
  }
  function drawCompanyOverlay(pet){
    globalThis.CATA_COMPANY_PRESENTATION?.draw(ctx,pet,game.t,(role,r,t)=>catSprite(role,r,t,false,pet.aim||0,'idle'),reducedMotion,pet.type==='mecha'&&cityReady(cityImages['mecha-frames']));
  }

  function updateCompanions(dt) {
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,q=g.squadStats;
    adaptFormation();
    const fusion=COMPANY.fuse(g);if(fusion){companyEvent(fusion,'build');notify('MECHA CREW · BUILD / BOARD / FIRE',3);playSfx('level');}
    for(const enemy of g.enemies){
      enemy.squadStun=Math.max(0,(enemy.squadStun||0)-dt);
      enemy.squadSlow=Math.max(0,(enemy.squadSlow||0)-dt);
      enemy.squadMark=Math.max(0,(enemy.squadMark||0)-dt);
    }
    const still=Math.hypot(moveInput().x,moveInput().y)<.05 && !p.animation.moving && g.t-(g.lastDamage||-100)>1;
    for(const pet of g.companionSquad){
      FOLLOWERS.init(pet);FOLLOWERS.tick(pet,dt);COMPANY.init(pet);pet.energy=Math.max(0,pet.energy-dt*.8);
      if(pet.level===3&&pet.type==='healer'&&p.hp<p.maxHp)p.hp=Math.min(p.maxHp,p.hp+dt*.035);
      const spec=FOLLOWERS.roleSpecs[pet.type]||FOLLOWERS.roleSpecs[COMPANY.identities[pet.type]?.[0]||'engineer'];
      const displaced=pet.anchorX!==undefined&&dist(pet.x,pet.y,pet.anchorX,pet.anchorY)>4;
      pet.specialCooldown=Math.max(0,pet.specialCooldown-dt);
      pet.specialAbilityReady=pet.specialCooldown===0&&!pet.pendingSpecial;
      pet.specialDuration=Math.max(0,pet.specialDuration-dt);pet.flash=Math.max(0,pet.flash-dt);
      let nearest=null,best=spec.range+(p.squadRange||0)*40;
      for(const e of g.enemies){const d=dist(pet.x,pet.y,e.x,e.y);if(pet.type==='sniper'&&pet.pendingSpecial&&!e.creditCategory&&e.hp<=p.damage*3)continue;if(e.hp>0&&!e.cocoon&&d<best){best=d;nearest=e;}}
      const los=target=>{
        if(!target||!isTerrainClear(pet.x,pet.y,5)||!isTerrainClear(target.x,target.y,5))return false;
        const dx=wrappedDelta(pet.x,target.x),dy=verticalDelta(pet.y,target.y),steps=Math.ceil(Math.hypot(dx,dy)/16);
        for(let i=1;i<steps;i++)if(!isTerrainClear(wrapCoord(pet.x+dx*i/steps),pet.y+dy*i/steps,5))return false;
        return true;
      };
      pet.aim=nearest?Math.atan2(verticalDelta(pet.y,nearest.y),wrappedDelta(pet.x,nearest.x)):p.aim;
      // Support roles carry sidearms without replacing their automatic specials.
      // Shooter/sniper already fire in the committed attack state; brawler never fires.
      if(!['shooter','sniper','brawler','mecha'].includes(pet.type)){
        pet.shotTimer-=dt;
        if(pet.shotTimer<=0&&pet.phase!=='interrupted'){
          let target=null,range=500+(p.squadRange||0)*40;
          for(const e of g.enemies){const d=dist(pet.x,pet.y,e.x,e.y);if(e.hp>0&&!e.cocoon&&d<range&&los(e)){target=e;range=d;}}
          if(target){pet.aim=Math.atan2(target.y-pet.y,target.x-pet.x);const gun={healer:[1.2,.7],tank:[1.6,1.5],engineer:[.8,.65],trapper:[1.3,1.1],bard:[.95,.65]}[pet.type]||[1.3,.7];
            squadShot(pet,target,p.damage*q.damage*(1+pet.rank*.12)*gun[1]);pet.flash=.16;
            pet.shotTimer=gun[0]/q.rate;
          }
        }
      }
      const food=updateForaging(pet,dt);
      const near=dist(pet.x,pet.y,p.x,p.y),formation=citySafeTarget(wrapCoord(p.x+spec.offsetX*g.formationPlan.side*g.formationPlan.spacing),p.y+spec.offsetY*g.formationPlan.spacing,pet);
      let tx=formation.x,ty=formation.y;
      if(pet.type==='sniper'&&nearest&&!los(nearest)){
        // Step sideways around cover before kneeling rather than fire through buildings.
        const side=Math.sin(g.t*.5)>0?1:-1;
        const flank=citySafeTarget(wrapCoord(p.x+spec.offsetX+Math.cos(pet.aim+Math.PI/2)*90*side),p.y+spec.offsetY+Math.sin(pet.aim+Math.PI/2)*90*side,pet);
        tx=flank.x;ty=flank.y;
      }
      if(pet.type==='brawler'&&nearest&&best<240){tx=wrapCoord(nearest.x-Math.cos(pet.aim)*38);ty=nearest.y-Math.sin(pet.aim)*38;}
      if(food){tx=food.x;ty=food.y;}
      if(nearest&&best<65&&pet.type!=='brawler'){tx=pet.x-Math.cos(pet.aim)*130;ty=pet.y-Math.sin(pet.aim)*130;pet.state='escape';}
      else if(!food&&pet.phase==='following')pet.state=nearest?(pet.type==='tank'?'protect':'attack'):pet.energy<25?'rest':'follow';
      if(!nearest&&pet.energy<25)pet.energy=Math.min(100,pet.energy+dt*4);
      const anchored=pet.phase==='preparing'||pet.phase==='acting';
      const hold=anchored&&['sniper','engineer','healer','trapper'].includes(pet.type);
      const oldX=pet.x,oldY=pet.y;
      if(pet.phase!=='interrupted'&&!hold){
        const route=navigationDelta(pet,tx,ty),d=Math.hypot(route.x,route.y),step=Math.min(d,spec.moveSpeed*(pet.type==='courier'?1.6:1)*dt*(1+Math.min(2,near/500))*(pet.phase==='acting'&&pet.type==='brawler'?1.8:1));
        if(d>5)moveWithCollision(pet,route.x/d*step,route.y/d*step);
      }
      pet.moving=dist(oldX,oldY,pet.x,pet.y)>dt*6;
      const damage=p.damage*g.effectiveBuffs.damage*q.damage*(1+pet.rank*.07)*Math.sqrt(q.count)*.8;
      if(pet.turret){
        const t=pet.turret;t.life-=dt;t.timer-=dt;
        let target=null,range=520;
        for(const e of g.enemies){const r=dist(t.x,t.y,e.x,e.y);if(e.hp>0&&r<range){range=r;target=e;}}
        if(target){t.aim=Math.atan2(target.y-t.y,target.x-t.x);pet.followerStats.turretUsefulSeconds=(pet.followerStats.turretUsefulSeconds||0)+dt;}
        if(t.timer<=0&&target){squadShot(pet,target,damage*.65,0,t);t.timer=.35;}
        if(t.life<=0)pet.turret=null;
      }
      pet.traps=(pet.traps||[]).filter(t=>{t.life-=dt;return t.life>0;});
      for(const t of pet.traps)for(const e of g.enemies)if(e.hp>0&&dist(t.x,t.y,e.x,e.y)<t.r){e.squadSlow=.35;if(g.equipment.coil)e.squadMark=2;}
      if(pet.type==='mecha'){updateMecha(pet,nearest,dt,damage);continue;}
      if(COMPANY.newRoles.includes(pet.type)){updateCompanyRole(pet,nearest,dt,damage);continue;}
      if(food)continue;
      const valid=pet.type==='healer'?still&&near<100&&p.hp<p.maxHp:
        pet.type==='trapper'?near<110&&!!nearest:
        pet.type==='engineer'?near<220&&!!nearest&&!displaced:
        pet.type==='sniper'?!!nearest&&los(nearest)&&near<250&&!displaced:
        pet.type==='brawler'?!!nearest&&best<85:!!nearest;
      pet.productive=valid;pet.anchorX=pet.x;pet.anchorY=pet.y;
      if(anchored&&!valid&&!(pet.type==='shooter'&&pet.state==='reloading')){
        pet.followerStats.aborts++;pet.pendingSpecial=false;pet.specialDuration=0;pet.committed=false;
        FOLLOWERS.enter(pet,'recovering',.4);continue;
      }
      if(pet.phase==='interrupted')continue;
      if(pet.phase==='recovering'){
        if(pet.stateTime===0){if(pet.state==='reloading')pet.ammo=spec.magazine;FOLLOWERS.enter(pet,'following');}
        continue;
      }
      if(pet.phase==='following'){
        if(pet.type==='shooter'&&pet.ammo<=0){FOLLOWERS.enter(pet,'recovering',spec.reload,'reloading');continue;}
        if(!valid)continue;
        pet.actionArt=pet.pendingSpecial||!['shooter','sniper','brawler'].includes(pet.type)?'special':'attack';
        FOLLOWERS.enter(pet,'preparing',spec.prepare,pet.type==='sniper'?'aiming':pet.type==='engineer'?'building':pet.type==='healer'?'treating':'preparing');
      }else if(pet.phase==='preparing'&&pet.stateTime===0){
        if(pet.pendingSpecial)pet.actionArt='special';
        FOLLOWERS.enter(pet,'acting',Math.max(spec.act,ART.actionDuration(pet.type,pet.actionArt)),pet.type==='tank'?'guarding':pet.type==='brawler'?'attacking':pet.type==='bard'?'singing':'acting');
        pet.committed=false;
      }else if(pet.phase==='acting'){
        // Painted frame 3 (of 8) commits damage/build; interruption before it cancels.
        if(!pet.committed&&pet.animationTime>=ART.actionDuration(pet.type,pet.actionArt)*.375){
        if(!pet.pendingSpecial)playSfx(['shooter','sniper'].includes(pet.type)?'shot':pet.type==='healer'?'heal':'guard');
        pet.followerStats.casts++;if(COMPANY.earn(pet,2)){companyEvent(pet,'evolve');notify(pet.type.toUpperCase()+' LEVEL '+pet.level,2);playSfx('level');}pet.committed=true;pet.flash=.2;
        if(pet.type==='healer')pet.treatmentStartHp=p.hp;if(pet.pendingSpecial)pet.castTarget=nearest;
        if(pet.pendingSpecial){pet.pendingSpecial=false;pet.followerStats.specialCasts++;resolveCompanionSpecial(pet.type);pet.castTarget=null;if(pet.type==='tank'||pet.type==='bard')pet.stateTime=Math.max(spec.act,pet.specialDuration);}
        else if(pet.type==='shooter'||pet.type==='sniper'){
          const spread=pet.type==='sniper'?0:Math.min(3,q.spread);
          for(let i=-spread;i<=spread;i++)squadShot(pet,nearest,damage*(pet.type==='sniper'?2.8:1)*(1+q.spread*2)/(1+spread*2),pet.type==='sniper'?2:0,pet,i*.18);
          if(pet.level===3)squadShot(pet,nearest,damage,pet.type==='sniper'?6:2,pet,.06);if(pet.type==='shooter')pet.ammo--;
        }else if(pet.type==='engineer'&&!pet.turret)pet.turret={x:pet.x,y:pet.y,life:pet.level===3?16:8,timer:0,skin:pet.rank>=2?'porcelain':'brass'};
        else if(pet.type==='trapper'){if(pet.traps.length>=3)pet.traps.shift();pet.traps.push({x:pet.x,y:pet.y,r:pet.level===3?110:65,life:pet.level===3?10:5});}
        else if(pet.type==='brawler'&&nearest){squadHit(nearest,damage*2);if(pet.level===3)for(const e of [...g.enemies])if(e!==nearest&&dist(e.x,e.y,pet.x,pet.y)<100)squadHit(e,damage);nearest.squadStun=nearest.variant==='boss'?.1:.35;}
        if(pet.type==='bard'&&pet.level===3)p.hp=Math.min(p.maxHp,p.hp+.15);
        if(pet.type==='tank'&&pet.level===3)p.inv=Math.max(p.inv,.8);
        if(pet.type==='bard'&&g.t>=(pet.nextTaunt||0)){pet.tauntUntil=g.t+.65;pet.nextTaunt=g.t+5;}
        }
        if(pet.type==='healer'&&valid&&pet.committed)p.hp=Math.min(p.maxHp,p.hp+(.10+.025*pet.rank*q.count)*dt);
        if(pet.stateTime===0){
          if(pet.type==='healer'&&p.hp>pet.treatmentStartHp)CATS.emit(g.catSpeech,'hero','healed',{gap:22});
          const reload=pet.type==='shooter'&&pet.ammo<=0;
          FOLLOWERS.enter(pet,'recovering',reload?spec.reload:Math.max(.12,spec.recover/(q.rate*(1+pet.rank*.1))),reload?'reloading':'recovering');
          pet.specialDuration=0;
        }
      }
    }
  }

  // State-aware auto-cast: never waste the healer, sniper or defense abilities.
  function autoActivateMajorAbilities(){
    const g=game;if(!g||g.mode!=='running')return;
    for(const pet of g.companionSquad){
      if(COMPANY.newRoles.includes(pet.type)||pet.type==='mecha')continue;
      if(!pet.specialAbilityReady||pet.specialCooldown>0||pet.forage||pet.phase!=='following')continue;
      const nearby=g.enemies.filter(e=>e.hp>0&&!e.cocoon&&dist(pet.x,pet.y,e.x,e.y)<(pet.type==='sniper'?780:pet.type==='trapper'?300:pet.type==='bard'?260:450));
      const injured=g.player.hp<g.player.maxHp-.3;
      const arrivalSoon=g.labQueue?.length&&['boss','elite','superElite'].includes(g.labQueue[0].id)&&g.labNextSpawn-g.t<3;
      const urgent=nearby.some(e=>e.creditCategory)||nearby.filter(e=>dist(g.player.x,g.player.y,e.x,e.y)<180).length>=3||g.player.hp<g.player.maxHp*.5;
      if(arrivalSoon&&!urgent&&pet.type!=='healer')continue;
      const settled=!g.player.animation.moving&&Math.hypot(moveInput().x,moveInput().y)<.05&&g.t-g.lastDamage>1;
      const valid=pet.type==='healer'?injured&&settled&&dist(pet.x,pet.y,g.player.x,g.player.y)<100:
        pet.type==='tank'?nearby.some(e=>dist(g.player.x,g.player.y,e.x,e.y)<230):
        pet.type==='brawler'?nearby.some(e=>dist(pet.x,pet.y,e.x,e.y)<190):
        pet.type==='sniper'?nearby.some(e=>e.creditCategory||e.hp>g.player.damage*3):
        pet.type==='engineer'?nearby.length>0&&(!pet.turret||pet.turret.life<1):
        pet.type==='trapper'?nearby.length>0&&(!pet.traps||pet.traps.length<3):
        pet.type==='bard'?nearby.length>1||nearby.some(e=>e.creditCategory):
        pet.type==='shooter'?nearby.length>1||nearby.some(e=>e.creditCategory):nearby.length>0;
      if(valid)companionSpecialAbilityActivate(pet.type);
    }
    if(g.companionSquad.length&&g.squadTacticCooldown<=0&&g.enemies.some(e=>dist(e.x,e.y,g.player.x,g.player.y)<480)){
      g.squadTactic=g.player.hp<g.player.maxHp*.45?'defensive':g.player.hp<g.player.maxHp*.8?'supportive':'aggressive';
      g.squadTacticDuration=15;g.squadTacticCooldown=25;
    }
    const relic=g.runicRelic;
    if(relic.held&&relic.cooldown<=0&&
      (g.enemies.some(e=>e.creditCategory&&dist(e.x,e.y,g.player.x,g.player.y)<340)||
       g.player.hp<g.player.maxHp*.4))activateRunicRelic();
  }
  // A shared cooldown per role prevents duplicate recruits from spamming abilities.
  function companionSpecialAbilityActivate(type){
    if(!game||game.mode!=='running')return;
    const pet=game.companionSquad.find(c=>c.type===type);
    if(!pet||pet.forage||!pet.specialAbilityReady||pet.specialCooldown>0)return;
    FOLLOWERS.init(pet);
    if(pet.phase==='interrupted'||pet.phase==='recovering'||pet.phase==='acting'||pet.pendingSpecial)return;
    pet.pendingSpecial=true;pet.specialAbilityReady=false;
  }
  function resolveCompanionSpecial(type){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,pet=g.companionSquad.find(c=>c.type===type);
    if(!pet||pet.specialCooldown>0)return;
    if(type==='shooter'&&g.shots.length>144)return;
    pet.specialCooldown=type==='healer'?24:18;
    pet.specialAbilityReady=false;pet.flash=.4;placeRelay(pet.x,pet.y);
    CATS.emit(g.catSpeech,type,'special');
    if(type==='shooter'){
      for(let i=0;i<16;i++){
        const a=i*TWO/16;
        g.shots.push({x:pet.x,y:pet.y,vx:Math.cos(a)*620,vy:Math.sin(a)*620,
          life:1.1,r:7,damage:p.damage*g.effectiveBuffs.damage*(2+pet.rank*.25)*g.squadStats.damage*g.squadStats.count,
          bounces:Math.min(2,g.squadStats.bounce),hit:[],speaker:pet.type,kind:'pet',trail:[],flash:0});
    return true;
      }
    }else if(type==='healer'){
      // Allies have no HP pool; healing restores their shared protected player.
      p.hp=Math.min(p.maxHp,p.hp+1+Math.min(.5,pet.rank*.1));
      for(const ally of g.companionSquad){ally.flash=.5;burst(ally.x,ally.y,'#8affbd',6);}
    }else if(type==='tank')pet.specialDuration=6;
    else if(type==='engineer'){pet.specialDuration=8;pet.turret={x:pet.x,y:pet.y,life:pet.level===3?16:8,timer:0,skin:pet.rank>=2?'porcelain':'brass'};}
    else if(type==='trapper'){
      pet.traps=[-1,0,1].map(i=>({x:wrapCoord(pet.x+i*85),y:pet.y,r:95,life:8}));pet.specialDuration=8;
    }else if(type==='bard')pet.specialDuration=7;
    else if(type==='brawler'){
      for(const e of [...g.enemies])if(e.hp>0&&dist(pet.x,pet.y,e.x,e.y)<190){
        squadHit(e,p.damage*g.squadStats.damage*g.squadStats.count*(4+pet.rank*.3));e.squadStun=e.variant==='boss'?.5:2;
      }
    }else if(type==='sniper'){
      const target=pet.castTarget; // The preparation loop already verified range and line of sight.
      squadShot(pet,target,p.damage*g.squadStats.damage*g.squadStats.count*(8+pet.rank),6);
    }
    burst(pet.x,pet.y,type==='tank'?'#94cfff':'#8affbd',12);
    notify(type.toUpperCase()+' · '+specialNames[type],2);
    playSfx(type==='shooter'?'volley':type==='healer'?'heal':'guard');
    updateSupport(0);updateHud();
  }
  for(const type of roleNames.filter(t=>$('ability-'+t)))$('ability-'+type).onclick=()=>companionSpecialAbilityActivate(type);
  function updateSupport(dt){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,f=g.feralInstinct;
    let nearby=0;
    for(const e of g.enemies)if(e.hp>0&&(wrappedDelta(p.x,e.x))**2+(verticalDelta(p.y,e.y))**2<=10000)nearby++;
    if(f.active){
      f.timer=Math.max(0,f.timer-dt);
      if(f.timer===0){f.active=false;notify('FERAL INSTINCT · Ended. Escape the crowd to rearm',2);}
    }else if(nearby<3)f.armed=true;
    else if(f.armed){f.active=true;f.armed=false;f.timer=f.duration;notify('FERAL INSTINCT ACTIVE · 6s',2);}
    g.feralInstinctOverdrive=Math.max(0,g.feralInstinctOverdrive-dt);
    g.escapeOverdriveTimer=Math.max(0,g.escapeOverdriveTimer-dt);
    if(g.escapeOverdriveTimer>0&&g.escape===0&&g.escapeOrigin&&dist(p.x,p.y,g.escapeOrigin.x,g.escapeOrigin.y)>80&&!g.enemies.some(e=>dist(e.x,e.y,p.x,p.y)<180)){
      g.escapeOverdriveTimer=0;g.feralInstinctOverdrive=4;
      notify('FERAL INSTINCT OVERDRIVE! · 4s',4,'overdrive');sound(880,.22,'triangle');
    }
    const adrenaline=g.buffs.survivalInstinct>0,overdrive=g.feralInstinctOverdrive>0;
    const b={speed:(f.active?1.3:1)*(adrenaline?1.15:1)*(overdrive?1.45:1),damage:(g.buffs.rage>0?2:1)*(f.active?1.25:1)*(overdrive?1.6:1),fire:1,magnet:0,healing:0,mitigation:0};
    for(const ally of g.companionSquad)if(dist(ally.x,ally.y,p.x,p.y)<180){
      const strength=ally.rank*g.squadStats.count;
      // Treatment is applied only by the stationary healer action.
      if(ally.type==='tank'&&ally.state==='guarding')b.mitigation+=.2+.04*strength;
      if(ally.type==='shooter')b.fire+=.05;
      if(ally.type==='bard'&&ally.state==='singing'){b.fire+=.08;b.damage*=ally.specialDuration>0?1.35:1.08;b.speed*=ally.specialDuration>0?1.12:1;}
    }
    if(p.soloContract&&!g.companionSquad.length){b.damage*=1.3;b.mitigation+=.15;}
    if(p.lastLaugh&&g.lives===1)b.damage*=1.6;
    if(g.t-g.lastDamage>=8){
      if(p.quietRepair)b.healing+=g.companionSquad.length?.06:.12;
      if(p.squadCare)b.healing+=.025*g.companionSquad.length;
    }
    b.fire=Math.min(1.7,b.fire);b.magnet=Math.min(180,b.magnet);b.healing=Math.min(.3,b.healing);b.mitigation=Math.min(.4,b.mitigation);
    if(g.companionSquad.length){
      if(g.squadTactic==='defensive')b.mitigation=Math.min(.6,b.mitigation+.2);
      if(g.squadTactic==='supportive'){b.magnet+=60;}
    }
    if(g.companionSquad.some(c=>c.type==='tank'&&c.state==='guarding'&&c.specialDuration>0))b.mitigation=Math.min(.8,b.mitigation+.45);
    b.fire*=adrenaline?1.2:1;
    g.effectiveBuffs=b;
    p.hp=Math.min(p.maxHp,p.hp+b.healing*dt);
  }
  function damageTaken(){if(game.player.shieldRebound){for(const e of [...game.enemies])if(dist(e.x,e.y,game.player.x,game.player.y)<180)squadHit(e,3*game.player.shieldRebound);burst(game.player.x,game.player.y,'#91f4ff',24);}CATS.emit(game.catSpeech,'hero','hurt');for(const pet of game.companionSquad)if(pet.type==='healer'&&['preparing','acting'].includes(pet.phase))FOLLOWERS.interrupt(pet,'player-hit');game.player.animation.hit=.35;game.player.animation.state='hit';game.director.recovery=5;game.lastDamage=game.t;game.survivalTimer=0;game.buffs.survivalInstinct=0;game.player.survivalTimer=0;game.player.survivalInstinctBuff=0;}
  function activateRunicRelic(){
    if(!game||game.mode!=='running')return;
    const r=game.runicRelic;
    if(!r.held||r.cooldown>0||r.active)return;
    placeRelay(game.player.x,game.player.y);r.active=r.held;r.held=null;r.duration=6+2*Math.log1p(game.equipment.capacitor);r.cooldown=10/(1+game.equipment.capacitor*.12);
    notify('RUNIC '+r.active.toUpperCase()+' · 6s',3,'relic');sound(640,.3,'triangle');updateHud();
  }
  $('runic-relic-activate').onclick=activateRunicRelic;
  function spawnRelic(){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,r=g.runicRelic;
    if(g.t<r.nextSpawn||r.items.length>=3)return;
    const a=rnd(0,TWO);
    r.items.push({...safeSpawn(600,24),type:rand()<.5?'shield':'slow'});
    r.nextSpawn=g.t+45;
    notify('RUNIC RELIC beyond view · ◇ shield / ❄ slow',2,'relic-spawn');sound(340,.3,'triangle',.025);
  }
  function updateRelics(dt){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,r=g.runicRelic,wasActive=r.active,wasCooling=r.cooldown>0;
    r.duration=Math.max(0,r.duration-dt);r.cooldown=Math.max(0,r.cooldown-dt);
    if(r.duration===0&&wasActive){r.active=null;notify('RUNIC '+wasActive.toUpperCase()+' ended',1.5,'relic-end');sound(300,.12,'triangle',.018);}
    if(wasCooling&&r.cooldown===0&&r.held){notify('RUNIC RELIC ready',1.5);sound(520,.08,'triangle',.018);}
    spawnRelic();
    if(!r.held){const i=r.items.findIndex(item=>dist(item.x,item.y,p.x,p.y)<45);if(i>=0){r.held=r.items.splice(i,1)[0].type;notify('RUNIC RELIC · Auto-ready',3,'relic-pickup');sound(460,.12,'triangle',.025);}}
  }
  function updateGhosts(dt) {
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player;
    p.silence=Math.max(0,p.silence-dt);p.phaseCooldown=Math.max(0,p.phaseCooldown-dt);
    const ghost=g.enemies.find(e=>e.id===g.phaseCaster&&e.hp>0);
    if(g.phaseWindup>0){
      g.phaseWindup=Math.max(0,g.phaseWindup-dt);
      if(!g.phaseWindup){
        if(ghost&&dist(ghost.x,ghost.y,p.x,p.y)<=220&&clearShot(ghost,p)){p.silence=1.2;notify('GHOST PHASE · Fire silenced 1.2s',1.2);}
        g.phaseCaster=null;
      }
    }else if(p.phaseCooldown===0){
      const caster=g.enemies.find(e=>e.variant==='ghost'&&e.hp>0&&dist(e.x,e.y,p.x,p.y)<=220&&clearShot(e,p));
      if(caster){g.phaseCaster=caster.id;g.phaseWindup=1.25;p.phaseCooldown=16;notify('GHOST PHASE · Leave the violet ring!',1.25);}
    }
    p.autoFireDisabled=p.silence>0;
  }
  function gasRadius(cloud) {
    const active=cloud.age-1;
    return active<0?0:110*Math.min(1,active/2,(6-active)/2);
  }
  function gasSpawn() {
    const g=game,p=g.player;
    // Keep the full cloud inside the map, outside the cat, ally and ghost bodies.
    for(let i=0;i<32;i++){
      const spot=safeSpawn(rnd(270,380),130);
      if(dist(spot.x,spot.y,p.x,p.y)<250||
        g.companionSquad.some(pet=>dist(spot.x,spot.y,pet.x,pet.y)<160)||
        g.enemies.some(e=>e.variant==='ghost'&&dist(spot.x,spot.y,e.x,e.y)<140))continue;
      return {...spot,age:0};
    }
    return null;
  }
  function updateGas(dt) {
    if(!game||game.mode!=='running'||game.campaign.night===100||game.isStressTest)return;
    const g=game,p=g.player,h=g.hazards;
    // Guardian gas exists before ambient gas unlocks; always age and resolve existing clouds.
    if(g.t>=UNLOCKS.gas)h.spawnTimer-=dt;
    if(g.t>=UNLOCKS.gas&&h.spawnTimer<=0){
      const cloud=gasSpawn();
      if(cloud){h.toxicGasClouds.push(cloud);sound(340,.3,'triangle',.025);}
      h.spawnTimer=cloud?30:1;
    }
    let exposed=false;
    if(h.toxicGasClouds.some(c=>c.age<1&&dist(c.x,c.y,p.x,p.y)<160))MUTANTS.say(g,"Gas ahead. Find clear pavement.", "gas");
    for(let i=h.toxicGasClouds.length-1;i>=0;i--){
      const c=h.toxicGasClouds[i];c.age+=dt;
      if(c.age>=(c.life||7)){h.toxicGasClouds.splice(i,1);continue;}
      if(c.age>=1&&dist(c.x,c.y,p.x,p.y)<gasRadius(c)+p.r)exposed=true;
    }
    // One exposure clock prevents overlapping clouds multiplying damage.
    h.exposure=exposed?(h.exposure||0)+dt:0;
    if(h.exposure>=1){h.exposure-=1;
      if(p.inv===0&&!(g.runicRelic.active==='shield'&&g.runicRelic.duration>0)){damageTaken();p.hp=Math.max(0,p.hp-(1-g.effectiveBuffs.mitigation));p.inv=.35;g.shake=.3;
        burst(p.x,p.y,'#b6ee75',10);sound(170,.1);
        if(p.hp<=0){loseLife();return;}}
    }
  }
  let cosmeticState=0x9e3779b9;
  function cosmeticRand() { cosmeticState=(Math.imul(cosmeticState,1664525)+1013904223)>>>0;return cosmeticState/4294967296; }
  function burst(x,y,col,n=10) {
    const cap=game.director.framePressure?120:280;
    if(reducedMotion||game.particles.length>=cap)return;
    const count=Math.min(n,cap-game.particles.length);
    for(let i=0;i<count;i++){const a=cosmeticRand()*TWO,s=50+cosmeticRand()*155;
      game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
        life:.18+cosmeticRand()*.37,ttl:.55,col,r:2+cosmeticRand()*3});
    }
  }
  function dropPower(x,y,kind) {
    // Exploration supplies always originate offscreen, including boss boost rewards.
    // Earned fish and labelled encounter caches remain visible at the legitimate source.
    if(!game||game.mode!=='running'||game.t-game.exploration.lastSpawn<EXPLORATION.intervalMin||game.powerups.length>=48||game.powerups.filter(p=>p.kind!=='relay').length>=EXPLORATION.cap)return false;
    game.exploration.lastSpawn=game.t;game.exploration.spawned++;
    game.powerups.push({...safeSpawn(600,24),kind,expires:game.t+120});return true;
  }
  // The 100-night encounter director owns its event ledger; never infer credit from a despawn.
  function spawnMajorEncounter(kind,night,finalWave=false,rosterIndex=null){
    const g=game,roster=kind==='boss'?MAJOR.catalog.bosses:kind==='elite'?MAJOR.catalog.elites:MAJOR.catalog.superElites;
    const event=MAJOR.getNight(Math.min(100,night));
    const index=rosterIndex!==null?rosterIndex:kind==='boss'?event.bossIndex>=0?event.bossIndex:8:
      kind==='elite'?Math.floor(night/12)%roster.length:Math.floor(night/12)%roster.length;
    const spec=roster[index%roster.length],boss=kind==='boss';
    const baseHp=boss?21:kind==='superElite'?21:13;
    const hp=Math.min(165,(baseHp+night*(boss?.62:kind==='superElite'?.44:.33))*(1+Math.min(.5,(g.player.level-1)*.014)));
    const point=safeSpawn(boss?650:610,boss?48:36);
    const e={...point,id:++g.director.serial,majorId:'major-'+(++g.majorEncounterSerial),
      variant:boss?'boss':'shambler',role:'special',bossKind:boss?spec.id:null,eliteKind:!boss?spec.id:null,
      creditCategory:kind,name:spec.name,attackKind:spec.attack,attackCooldown:2.1,windup:0,attackTarget:null,
      finalWave,elite:!boss,superElite:kind==='superElite',r:boss?43:kind==='superElite'?34:28,
      hp,max:hp,damage:boss?1.25:kind==='superElite'?1.2:.8,
      speed:cfg.enemySpeed*(boss?.82:kind==='superElite'?1.25:1.1),phase:0,weight:boss?16:6,hurt:0,
      huntAge:0,huntX:1,huntY:0,night,traits:{legs:'feet',torso:'plated',arms:'claws',head:'howler'},traitAge:0};
    g.enemies.push(e);
    g.director.recovery=Math.max(g.director.recovery,2);
    notify((boss?'BOSS':kind==='superElite'?'SUPER-ELITE':'ELITE')+' · '+spec.name.toUpperCase(),2.9,'night-event-'+night+'-'+kind);
    playSfx(boss?'boss-spawn':kind==='superElite'?'super-elite':'elite-spawn');
    return e;
  }
  function persistEncounterLedger(){
    const g=game;if(!g)return;
    try{localStorage.setItem(STRESS_MODE?'cataclysm-lab-encounters':'cataclysm-major-encounters',JSON.stringify({
      patch:PATCH_ID,seed:g.labEconomy?.snapshot().seed,mode:g.mode,time:g.t,hp:g.player.hp,
      finalSpawned:g.labFinalSpawned,arrivals:g.finalArrivals||[],slainIds:g.finalDefeated||[],
      slainCounts:{boss:g.campaign.boss,elite:g.campaign.elite,superElite:g.campaign.superElite},
      finalSlainCounts:Object.fromEntries(['boss','elite','superElite'].map(k=>[k,(g.finalArrivals||[]).filter(a=>a.kind===k&&a.slainAt!=null).length])),
      intervalSeconds:LAB.FINAL_INTERVAL_SECONDS,effectiveIntervalSeconds:LAB.FINAL_INTERVAL_SECONDS/(g.qaSpawnScale||1),scoreEligible:!(g.qaSpawnScale>1)}));}catch(e){}
  }
  function releaseLabSpawn(){
    const g=game;
    if(!g||!g.labQueue?.length||g.t+1e-6<g.labNextSpawn)return;
    if(g.enemies.length>=liveCap()){
      const ordinary=g.enemies.findIndex(e=>!e.majorId);
      if(ordinary<0)return;
      g.enemies.splice(ordinary,1); // Reserve the scheduled major's slot; no kill or drop credit.
    }
    const item=g.labQueue[0],isMajor=['boss','elite','superElite'].includes(item.id);
    const e=isMajor?spawnMajorEncounter(item.id,g.campaign.night,g.campaign.night===100,item.index??null):
      spawnEnemy(item.id,{labPurchase:true});
    if(!e)return;
    g.labQueue.shift();g.labSpawned++;
    if(isMajor&&item.id==='boss'&&g.campaign.night>=99){g.bossFlash=Math.max(g.bossFlash,.65);g.shake=Math.max(g.shake,.23);}
    e.labRank=item.rank;e.labCost=item.cost;e.threatCost=item.cost;e.night=g.campaign.night;
    if(g.campaign.night===99&&item.id==='boss'){
      g.labFinalBossId=e.majorId;e.name='THE CATASTROPHE';
    }
    if(g.campaign.night===100){e.finalWave=true;g.labFinalSpawned++;g.finalArrivals.push({timestamp:g.t,kind:item.id,majorId:e.majorId,rosterId:e.bossKind||e.eliteKind});}
    const scale=1+Math.max(0,item.rank-3)*.09+(item.index==null?0:item.index*.08);
    // Seeded finale comparisons: the old wave died as it arrived (~17–19s).
    // Durable, independently active champions create overlapping attack decisions.
    e.hp*=scale*(e.finalWave?1.6:1);e.max=e.hp;
    if(e.finalWave){e.damage*=1.65;e.speed*=1.2;e.attackCooldown=1.2;}

    g.labNextSpawn=g.t+g.labWave.interval/(g.qaSpawnScale||1);
    if(e.finalWave)persistEncounterLedger();
    if(g.campaign.night===100)notify('FINAL HORDE · '+g.labFinalSpawned+'/'+g.labFinalTotal,1,'lab-spawn-'+g.labFinalSpawned);
  }
  function startMajorNight(n){
    const g=game,key='night-'+n;
    if(g.campaign.events.includes(key))return;
    g.campaign.events.push(key);g.campaign.night=n;
    g.wavePulse=1; // One visual dim/expanding shock ring per actual 13-second night release.
    if(n===100)g.bossFlash=1;
    const wave=g.labEconomy.plan(n);
    g.labWave=wave;g.labQueue=wave.queue.filter(x=>['boss','elite','superElite'].includes(x.id)).map(x=>({...x}));g.labNextSpawn=g.t;
    if(n===100){
      // Normal spawning continues with eighteen reserved major slots.
      if(g.cityEvents.active)finishCityEncounter(false);
      g.finalArrivals=[];g.finalStartedAt=g.t;
      g.majorFinalSpawned=true;g.labFinalTotal=g.labQueue.length;g.labFinalSpawned=0;g.finalDefeated=[];g.defeatedBoss=null;
      $('arena').classList.add('lab-inferno');
      notify('NIGHT 100 · FIRESTORM · FINAL HORDE',5,'finale');
    }else{
      $('arena').classList.remove('lab-inferno');
      if(n===99)notify('NIGHT 99 · THE CATASTROPHE APPROACHES',4,'prelude');
      else if(n%5===1)notify('NIGHT '+n+'/100 · SURVIVE THE CITY',1.6,'night-'+n);
    }
    releaseLabSpawn(); // First encounter is released immediately on entering the night.
  }
  function finalizeMajorVictory(){
    const g=game;
    if(!g||g.victory||g.mode!=='running'||!g.majorFinalSpawned)return;
    if(g.labFinalTotal!==18||g.labFinalSpawned!==18||g.labQueue.length>0||new Set(g.finalDefeated).size!==18)return;
    if(g.enemies.some(e=>e.finalWave&&!e.consumed&&e.hp>0))return;
    g.campaign.finaleCleared=true;
    if(!MAJOR.won(g.campaign,g.player.hp>0))return;
    if(!(g.qaSpawnScale>1))SCORE.awardMilestone(g.scoreLedger,'night100',MAJOR.VICTORY_SCORE);
    g.victory=true;g.mode='won';persistEncounterLedger();g.campaign.won=true;g.victoryAge=0;
    saveBest();
    const scoring=scoreSnapshot(g);
    clearInput();stopVoices('music');stopVoices('fx');
    try{if(!(g.qaSpawnScale>1))localStorage.setItem(STRESS_MODE?'cataclysm-lab-win':'cataclysm-major-win',JSON.stringify({score:scoring.total,scoring,night:100,finalWave:g.labFinalTotal,seed:g.labEconomy.snapshot().seed}));}catch(e){}
    $('overlay-title').textContent='THE CATASTROPHE · DEFEATED';
    $('overlay-copy').textContent='NIGHT 100 CLEAR · 18/18 DEFEATED · '+scoring.total.toLocaleString()+' POINTS. Survival '+scoring.components.survival.toLocaleString()+' · weighted kills '+scoring.components.kills.toLocaleString()+' · collected fish '+scoring.components.fish.toLocaleString()+' · milestones '+scoring.components.milestones.toLocaleString()+'. Fishing JACKPOT '+g.fishing.jackpot+' (separate). Time '+Math.floor(g.t)+'s · HP '+g.player.hp.toFixed(1)+'/'+g.player.maxHp+'.';
    $('play').textContent='↻ NEW RUN';$('start-overlay').hidden=true;
    $('pause').hidden=true;$('stick').hidden=true;updateHud();
    playSfx('victory');
  }
  function fireMajorAttack(e,target){
    const g=game,kind=e.attackKind||'single',d=Math.max(1,dist(e.x,e.y,target.x,target.y));
    const shotCap=e.creditCategory?32:16;
    if(g.enemyShots.length>=shotCap||d>Math.hypot(W,H)*.65+100||!clearShot(e,target))return;
    const theta=Math.atan2(verticalDelta(e.y,target.y),wrappedDelta(e.x,target.x));
    const patterns={single:[0],hex:[0],pierce:[0],charge:[-.15,0,.15],cleave:[-.45,-.2,0,.2,.45],
      spiral:[-.75,-.4,0,.4,.75],summon:[-.35,0,.35],plague:[-.3,0,.3],
      shockwave:[-1.5,-1,-.5,0,.5,1,1.5],chain:[-.4,-.2,0,.2,.4],
      nova:[-2.4,-1.8,-1.2,-.6,0,.6,1.2,1.8,2.4]} ;
    if(kind==='summon'&&g.enemies.length<liveCap()-3){
      if(g.campaign.night!==100)for(let i=0;i<2;i++)spawnEnemy('shambler');
    }
    for(const a of patterns[kind]||[0]){
      if(g.enemyShots.length>=shotCap)break;
      const angle=theta+a,speed=kind==='pierce'?405:kind==='shockwave'||kind==='nova'?265:310;
      g.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        life:kind==='plague'?2.5:2.1,r:kind==='shockwave'?12:kind==='nova'?10:8,kind,damage:e.damage*.58,trail:[]});
    }
    burst(e.x,e.y,kind==='plague'?'#bbee83':'#eeabd1',8);
    playSfx(kind==='plague'?'enemy-cast':'enemy-shot');
  }
  function updateMajorEnemyAttack(e,dt,target,d){
    if(e.fishingMutant){e.fishClock+=dt;const t=e.fishClock%4;
      if(t<1){e.speed=0;e.fishAim=Math.atan2(game.player.y-e.y,game.player.x-e.x);}
      else if(t<1.45){e.speed=0;moveWithCollision(e,Math.cos(e.fishAim)*360*dt,Math.sin(e.fishAim)*360*dt);}
      else e.speed=35;return;
    }

    const role=e.role || (MAJOR.catalog.normal.find(n=>n.id===e.variant)||{}).role;
    if(role!=='ranged'&&role!=='caster'&&!e.creditCategory)return;
    e.attackCooldown=(e.attackCooldown??(2+rand()))-dt;
    if(e.windup>0){
      e.windup-=dt;
      if(e.windup<=0){fireMajorAttack(e,e.attackTarget||target);e.windup=0;}
    }else if(e.attackCooldown<=0&&d<(role==='caster'?500:e.creditCategory?630:460)&&d>50){
      e.windup=e.creditCategory?1:role==='caster'?1.1:.85;
      e.attackTarget={x:target.x,y:target.y};
      e.attackCooldown=e.finalWave?2.8:e.creditCategory?4.2:role==='caster'?5.8:4.6;
      if(e.creditCategory)playSfx('boss-warn');
    }
  }
  function updateEnemyProjectiles(dt){
    const g=game,p=g.player;
    for(let i=g.enemyShots.length-1;i>=0;i--){
      const s=g.enemyShots[i];s.life-=dt;
      s.x=wrapCoord(s.x+s.vx*dt);s.y+=s.vy*dt;
      if(s.life<=0||!isTerrainClear(s.x,s.y,s.r)){g.enemyShots.splice(i,1);continue;}
      // Followers stagger but do not absorb attacks: the same projectile can still hit the player.
      s.followerHits=s.followerHits||[];
      for(const pet of g.companionSquad)if(!s.followerHits.includes(pet.type)&&dist(s.x,s.y,pet.x,pet.y)<pet.r+s.r){
        s.followerHits.push(pet.type);FOLLOWERS.interrupt(pet,'projectile');
      }
      if(p.inv===0&&dist(s.x,s.y,p.x,p.y)<p.r+s.r){
        if(g.runicRelic.active!=='shield'){
          damageTaken();p.hp=Math.max(0,p.hp-s.damage*(1-g.effectiveBuffs.mitigation)*(1-Math.min(.65,p.armor)));
          p.inv=1.25;burst(p.x,p.y,'#ff8c9f',12);playSfx('danger');
        }
        g.enemyShots.splice(i,1);
        if(p.hp<=0){loseLife();return;}
      }
    }
  }

  function spawnBoss(night) {
    if(game.enemies.length>=liveCap()){const i=game.enemies.findIndex(e=>e.variant!=='boss');if(i<0)return;game.enemies.splice(i,1);}
    // The scheduled boss occupies the same budget, replacing distant ordinary threats.
    // No kill credit or drops for enemies withdrawn by the director.
    const budget=ThreatDirector.getThreatBudget();
    let threat=cityThreat()+game.enemies.reduce((n,e)=>n+enemyThreat(e),0);
    const distant=game.enemies.filter(e=>e.variant!=='boss').sort((a,b)=>
      dist(b.x,b.y,game.player.x,game.player.y)-dist(a.x,a.y,game.player.x,game.player.y));
    for(const e of distant){if(threat+12<=budget)break;threat-=enemyThreat(e);game.enemies.splice(game.enemies.indexOf(e),1);}
    // A surviving previous King occupies the reserved boss slot until defeated.
    if(threat+12>budget)return;
    game.director.recovery=Math.max(game.director.recovery,4);
    game.bossEncounters++;
    const hp=(65+night*4)*game.runScale*Math.pow(1.55,game.bossEncounters-1);
    game.enemies.push({...safeSpawn(650,60),
      variant:'boss',r:44,hp,max:hp,damage:2*Math.pow(1.15,game.bossEncounters-1),speed:cfg.enemySpeed,phase:0,weight:20,hurt:0,night});
    notify('NIGHT '+game.nightCycle.waveCount+' · THE ALLEY KING',3);sound(110,.5,'sawtooth');
  }
  function addFish(x,y,value=1) {
    // Merge nearby drops at the rendering budget; never discard earned XP.
    COMPANY.ledger(game).spawned+=value;
    if(game.fishItems.length>=180){
      const f=game.fishItems.reduce((a,b)=>dist(a.x,a.y,x,y)<dist(b.x,b.y,x,y)?a:b);
      f.value+=value;return;
    }
    game.fishItems.push({...nearestSafeSpace(x,y,12),r:12,value,phase:inkHash(x,y)*TWO,attracted:false});
  }
  // Fishbone Encore: earned pickup rhythm, never a replacement for dodging.
  const ENCORE_RADIUS=230,ENCORE_WINDOW=8,ENCORE_COOLDOWN=10;
  const majorEncoreRadius=()=>ENCORE_RADIUS+Math.min(4,game?.player.areaBurst||0)*25;
  function updateEncore(dt){
    if(!game||game.mode!=='running')return;
    const c=game.encore;
    c.cooldown=Math.max(0,c.cooldown-dt);
    c.window=Math.max(0,c.window-dt);
    if(!c.window)c.charge=0;
    if(c.wave){c.wave.life=Math.max(0,c.wave.life-dt);if(!c.wave.life)c.wave=null;}
    for(const e of game.enemies)e.encoreSlow=Math.max(0,(e.encoreSlow||0)-dt);
  }
  function collectEncore(value){
    const g=game,c=g.encore,p=g.player;
    if(c.cooldown>0)return; // Fish still award their full XP and score while rearming.
    if(!c.charge)c.window=ENCORE_WINDOW;
    c.charge=Math.min(3,c.charge+value); // Merged caches retain their earned fish value.
    if(c.charge<3)return;
    c.charge=0;c.window=0;c.cooldown=ENCORE_COOLDOWN;c.activations++;
    c.wave={x:p.x,y:p.y,life:3};
    let hits=0;
    for(const e of [...g.enemies]){
      const dx=wrappedDelta(p.x,e.x),dy=verticalDelta(p.y,e.y);
      if(e.hp<=0||Math.hypot(dx,dy)>ENCORE_RADIUS||blockingTerrain(p.x,p.y,dx,dy,0))continue;
      // A single hit respects shield/elite armor; the King takes a quarter hit and mild slow.
      const armor=e.elite&&e.huntAge%5<1.5?.35:e.mutation==='shield'&&e.mutationAge>=1?.5:1;
      const damage=p.damage*2*armor*(e.variant==='boss'?.25:1);
      g.director.pendingDamage+=Math.min(e.hp,damage);
      e.hp-=damage;e.hurt=.15;e.encoreSlow=3;hits++;
      if(e.hp<=0)defeatEnemy(e);
    }
    c.hits+=hits;
    burst(p.x,p.y,'#ffcf80',reducedMotion?4:14);
    playSfx('power'); // Reuse the capped, original effects bus; music keeps its own tempo.
    notify('FISHBONE ENCORE · '+hits+' hit · slow 3s',2,'encore');
  }
  function renderEncore(){
    const c=game.encore,w=c.wave;
    if(!w)return;
    ctx.save();ctx.globalAlpha=Math.min(1,w.life);
    // One outward sweep, then a steady boundary: no strobe or full-screen flash.
    const r=reducedMotion?ENCORE_RADIUS:majorEncoreRadius()*Math.min(1,(3-w.life)/.5);
    outline(w.x,w.y,r,'#ffcf80',3);
    ctx.setLineDash([8,12]);outline(w.x,w.y,ENCORE_RADIUS,'#ffcf8066',2);ctx.setLineDash([]);
    ctx.fillStyle='#fff0c6';ctx.font='bold 15px system-ui';ctx.textAlign='center';
    ctx.fillText('FISHBONE ENCORE',w.x,w.y-60);ctx.restore();
  }
  // Shared encounter manager: one event at a time, no solid geometry, bounded costs.
  function cityThreat(){
    const e=game.cityEvents.active;
    return e?(e.kind==='elite'?(e.eliteSpawned?0:6):5):0;
  }
  function cityApproachSafe(){
    const g=game,sh=g.risingShadow;
    return !g.endgame.active&&(!sh.active||(sh.warning===0&&g.player.y-sh.y>=H*.65));
  }
  function citySpawnBlocked(){
    if(LAB_MODE)return false; // Disabled legacy city encounter cannot suppress paid lab spawns.
    const m=game.cityEvents;
    return game.t<m.recoveryUntil||m.active?.kind==='elite'||
      (!m.active&&cityApproachSafe()&&game.director.recovery===0&&(game.player.level>=3||game.t>=180)&&game.player.hp>=1.5&&
        game.t%300<270&&!game.enemies.some(e=>e.variant==='boss')&&game.t>=Math.min(m.nextCrane,m.nextCity)-4);
  }
  function relayProtects(x,y){
    const r=game.cityEvents.relay;
    return !!(r&&dist(x,y,r.x,r.y)<r.r);
  }
  function placeRelay(x,y){
    if(game.cityEvents.relayUnlocked){game.cityEvents.relay={x,y,r:95,life:4};burst(x,y,'#87ffdc',12);}
  }
  function cityZones(){
    const e=game.cityEvents.active;
    return !e?[]:e.kind==='street'?e.zones:e.kind==='crane'?e.debris.filter(d=>d.age<1.6):[];
  }
  function citySafeTarget(x,y,pet){
    // Repel both a formation destination and a follower already in a warning circle.
    // The circles are damage zones, never collision walls; escape always remains possible.
    let moved=false;
    for(const z of cityZones()){
      const inside=dist(pet.x,pet.y,z.x,z.y)<z.r+25;
      if(inside||dist(x,y,z.x,z.y)<z.r+25){
        const a=Math.atan2(verticalDelta(z.y,inside?pet.y:y),wrappedDelta(z.x,inside?pet.x:x));
        x=wrapCoord(z.x+Math.cos(a)*(z.r+50));
        y=(z.y+Math.sin(a)*(z.r+50));moved=true;
      }
    }
    if(moved)game.cityEvents.avoids++;
    return nearestSafeSpace(x,y,pet.r);
  }
  function cityDamage(x,y,r,amount){
    const g=game,p=g.player,m=g.cityEvents;
    if(dist(p.x,p.y,x,y)<r+p.r&&!p.inv&&!relayProtects(p.x,p.y)&&g.runicRelic.active!=='shield'){
      damageTaken();p.hp=Math.max(0,p.hp-amount*(1-g.effectiveBuffs.mitigation));p.inv=1.3;
      m.playerHits++;burst(p.x,p.y,'#ff936a',9);sound(190,.12,'triangle');
      if(p.hp<=0){loseLife();return;}
    }
    for(const enemy of [...g.enemies])if(enemy.hp>0&&dist(enemy.x,enemy.y,x,y)<r+enemy.r){
      const damage=amount*4;g.director.pendingDamage+=Math.min(enemy.hp,damage);
      enemy.hp-=damage;enemy.hurt=.15;m.enemyHits++;
      if(enemy.hp<=0)defeatEnemy(enemy);
    }
  }
  function pardonShadow(){game.risingShadow.y=Math.min(game.risingShadow.y,game.player.y-H);}
  function defeatEnemy(e){
    const g=game,i=g.enemies.indexOf(e);if(i<0)return;
    if(e.consumed||e.hp>0)return;
    e.consumed=true;MUTANTS.death(g,e,mutationAPI);if(e.fishingMutant)fishingAward('mutant-'+e.id,500);cityDefeat(e);
    if(e.creditCategory)CATS.emit(g.catSpeech,'hero','defeated');
    if(e.finalWave){
      g.finalDefeated.push(e.majorId);
      const arrival=g.finalArrivals.find(a=>a.majorId===e.majorId);if(arrival)arrival.slainAt=g.t;
      persistEncounterLedger();
      if(e.bossKind==='the-catastrophe'||g.finalDefeated.length===18){
        const fallen={x:e.x,y:e.y,r:e.r,id:e.bossKind||e.eliteKind,name:e.name};
        if(e.bossKind==='the-catastrophe'||!g.defeatedBoss)g.defeatedBoss=fallen;
      }
    }
    if(e.cocoon){g.director.cocoonsDestroyed++;notify('COCOON BROKEN · Evolution stopped',2);}
    if(g.equipment.capacitor&&g.equipment.coil&&e.squadSlow>0){const refund=.3*g.equipment.capacitor;g.runicRelic.cooldown=Math.max(0,g.runicRelic.cooldown-refund);for(const ally of g.companionSquad)ally.specialCooldown=Math.max(0,ally.specialCooldown-refund);g.buildEffects.recharged++;}
    g.director.pendingKills++;g.kills+=e.weight;burst(e.x,e.y,'#93eaac',14);
    if(e.creditCategory){
      MAJOR.kill(g.campaign,e.majorId,e.creditCategory);
      if(e.finalWave)persistEncounterLedger();
      if(e.creditCategory==='boss'&&g.campaign.night>=99){g.bossFlash=1;g.shake=Math.max(g.shake,.55);}
      const fish=e.creditCategory==='boss'?9:e.creditCategory==='superElite'?6:3;
      addFish(e.x,e.y,fish);
      // All three high-rank categories drop a tangible magnet, not a random chance.
      if(g.powerups.length<48)g.powerups.push({...nearestSafeSpace(e.x+32,e.y,24),kind:'magnet',expires:g.t+90,source:e.creditCategory});
      notify(e.name.toUpperCase()+' DEFEATED · +'+fish+' FISH + MAGNET',2,'major-kill-'+e.majorId);
    }
    if(e.creditCategory||e.elite){
      const amount=e.creditCategory==='boss'?2:e.creditCategory==='superElite'?3:1;
      if(g.rerollDrops.length<16)g.rerollDrops.push({x:e.x,y:e.y,value:amount,expires:g.t+65,age:0});
      playSfx(e.creditCategory==='boss'?'boss-defeat':'elite-defeat');
    }
    if(e.finalBoss){
      g.endgame.victories++;g.endgame.cooldown=8;g.director.recovery=Math.max(g.director.recovery,8);pardonShadow();
      game.player.hp=game.player.maxHp;game.player.inv=4;
      notify('CROWN '+g.endgame.victories+'/9 CLAIMED · Recovery 8s',4);
      if(g.endgame.victories===9){g.endgame.complete=true;g.endgame.reward='Ninefold Dawn';g.fish+=999;COMPANY.ledger(g).spawned+=999;COMPANY.ledger(g).player+=999;g.enemies.splice(i,1);end();
        $('overlay-title').textContent='NINEFOLD DAWN · VICTORY';$('overlay-copy').textContent='All nine Catastrophe crowns claimed. Reward: 999 fish and the Ninefold Dawn title. The city is free.';return;}
    }else if(e.variant==='boss'&&!e.creditCategory){
      addFish(e.x,e.y,9);g.player.hp=Math.min(g.player.maxHp,g.player.hp+1);g.director.recovery=Math.max(g.director.recovery,6);pardonShadow();
      notify('ALLEY KING DEFEATED · +20 KILLS',3);
    }else if(e.family==='mimic-stray')addFish(e.x,e.y,2);else if(!e.mRaised&&!e.creditCategory&&e.rewardValue)addFish(e.x,e.y,e.rewardValue);else if(!e.mRaised&&!e.creditCategory&&rand()<cfg.fishDropChance)addFish(e.x,e.y);
    if(!e.creditCategory&&!e.mRaised)g.xp+=.55*g.player.xpGain;
    g.enemies.splice(i,1);sound(620,.06,'triangle',.02);
  }
  function spawnCityEncounter(kind){
    const g=game,m=g.cityEvents,p=g.player,cost=kind==='elite'?6:5;
    if(!cityApproachSafe())return false;
    if(m.active||g.t<m.recoveryUntil||p.hp<1.5||g.director.recovery>0||g.director.framePressure)return false;
    // Bosses keep priority. Defer during the boss approach and while a King lives.
    if(g.t%300>270||g.enemies.some(e=>e.variant==='boss'))return false;
    // Reserve budget by withdrawing distant ordinary threats, as the existing boss does.
    let threat=g.enemies.reduce((v,e)=>v+enemyThreat(e),0);
    const distant=g.enemies.filter(e=>!e.majorId&&dist(e.x,e.y,p.x,p.y)>300).sort((a,b)=>dist(b.x,b.y,p.x,p.y)-dist(a.x,a.y,p.x,p.y));
    for(const e of distant){if(threat+cost<=g.director.budget)break;threat-=enemyThreat(e);g.enemies.splice(g.enemies.indexOf(e),1);}
    if(threat+cost>g.director.budget||g.enemies.length>=liveCap())return false;
    const {x,y}=nearestSafeSpace(p.x+80,p.y,60);
    m.active={kind,id:++m.serial,age:0,x,y,duration:kind==='elite'?21:11,warning:3,
      zones:kind==='street'?[-1,1].map(side=>({...nearestSafeSpace(x+side*115,y,30),r:30})):[],
      debris:[],nextDrop:3,pulses:0,eliteSpawned:false};
    m.counts[kind]++;g.director.recovery=Math.max(g.director.recovery,3);
    // Fixed schedule anchor prevents countdown drift; crane cadence 45–75 seconds.
    if(kind==='crane')m.nextCrane=g.t+rnd(45,75);
    else {m.nextCity=g.t+120;m.cityIndex++;}
    return true;
  }
  function finishCityEncounter(success){
    const g=game,m=g.cityEvents,e=m.active;if(!e)return;
    // A timed-out elite escapes without kill credit or reward.
    g.enemies=g.enemies.filter(n=>n.encounterId!==e.id);
    if(success){
      g.player.hp=Math.min(g.player.maxHp,g.player.hp+.5);pardonShadow();
      m.completed[e.kind]++;
      // One unclaimed tactical cache at a time; expires rather than accumulating.
      g.powerups=g.powerups.filter(p=>p.kind!=='relay');
      if(g.powerups.length<48)g.powerups.push({...nearestSafeSpace(g.player.x+65,g.player.y,24),kind:'relay',expires:g.t+45});
      notify('CITY CLEAR · Collect ◇ rally relay',2,'city-clear');
    }else notify('CITY EVENT WITHDREW · Clear escape route',2,'city-end');
    m.active=null;m.recoveryUntil=g.t+6;g.director.recovery=Math.max(g.director.recovery,6);
  }
  function spawnCraneDebris(){
    const e=game.cityEvents.active;
    if(!e||e.kind!=='crane'||e.debris.length>=6)return;
    // Predictable alternating offsets; every landing has 1.6 seconds of warning.
    const i=e.pulses++,offsets=[[-80,-35],[0,40],[80,-35],[0,-65]];
    const o=offsets[i%offsets.length];
    e.debris.push({...nearestSafeSpace(e.x+o[0],e.y+o[1],38),r:38,age:0,hit:false});
    game.cityEvents.maxDebris=Math.max(game.cityEvents.maxDebris,e.debris.length);
  }
  function damageElectricGate(e,amount){
    if(e.zones.length<2)return;
    const [a,b]=e.zones,dx=wrappedDelta(a.x,b.x),dy=b.y-a.y,denom=dx*dx+dy*dy||1;
    const closest=(x,y)=>{const q=clamp((wrappedDelta(a.x,x)*dx+(y-a.y)*dy)/denom,0,1);return {x:wrapCoord(a.x+dx*q),y:a.y+dy*q};};
    const g=game,p=g.player,m=g.cityEvents,pt=closest(p.x,p.y);
    if(dist(p.x,p.y,pt.x,pt.y)<24+p.r&&!p.inv&&!relayProtects(p.x,p.y)&&g.runicRelic.active!=='shield'){
      damageTaken();p.hp=Math.max(0,p.hp-amount*(1-g.effectiveBuffs.mitigation));p.inv=1.3;m.playerHits++;
      burst(p.x,p.y,'#8ceeff',14);playSfx('danger');if(p.hp<=0){loseLife();return;}
    }
    for(const enemy of [...g.enemies]){const target=closest(enemy.x,enemy.y);
      if(enemy.hp>0&&dist(enemy.x,enemy.y,target.x,target.y)<24+enemy.r){
        enemy.hp-=amount*4;enemy.hurt=.15;m.enemyHits++;if(enemy.hp<=0)defeatEnemy(enemy);
      }
    }
  }
  function updateCityEncounter(dt){
    if(!game||game.mode!=='running'||game.campaign.night===100||game.isStressTest)return;
    const g=game,m=g.cityEvents;
    if(m.active&&(g.enemies.some(e=>e.variant==='boss')||g.endgame.active||(g.risingShadow.active&&g.risingShadow.warning===0&&g.risingShadow.y-g.player.y<H*.65))){finishCityEncounter(false);return;}
    if(m.relay){m.relay.life-=dt;if(m.relay.life<=0)m.relay=null;}
    if(!m.active){
      if(g.t>=90&&(g.player.level>=3||g.t>=180)&&g.t>=m.recoveryUntil){
        const kind=m.nextCrane<=m.nextCity?'crane':'street';
        if(g.t>=Math.min(m.nextCrane,m.nextCity))spawnCityEncounter(kind);
      }
      return;
    }
    const e=m.active;e.age+=dt;
    if(e.kind==='elite'&&e.age>=e.warning&&!e.eliteSpawned&&g.enemies.length<liveCap()){
      const hp=18+Math.min(20,g.player.level);
      g.enemies.push({...safeSpawn(600,40),r:26,variant:'shambler',elite:true,encounterId:e.id,
        hp,max:hp,damage:.8,speed:105,weight:3,phase:0,hurt:0,huntAge:0,huntX:1,huntY:0});
      e.eliteSpawned=true;
    }
    if(e.kind==='elite'&&e.eliteSpawned&&!g.enemies.some(n=>n.encounterId===e.id)){finishCityEncounter(true);return;}
    if(e.kind==='crane'){
      if(e.age>=e.nextDrop&&e.age<9){spawnCraneDebris();e.nextDrop+=.9;}
      for(const d of e.debris){
        d.age+=dt;
        if(d.age>=1.6&&!d.hit){d.hit=true;cityDamage(d.x,d.y,d.r,.65);if(g.mode!=='running')return;}
      }
      e.debris=e.debris.filter(d=>d.age<2.1);
    }else if(e.kind==='street'&&e.age>=e.warning){
      // Telegraphs become two separated electric pools; the middle street stays open.
      const pulse=Math.floor((e.age-e.warning)/1.5)+1;
      if(pulse>e.pulses){e.pulses=pulse;damageElectricGate(e,.45);if(g.mode!=='running')return;}
    }
    if(e.age>=e.duration)finishCityEncounter(e.kind!=='elite');
  }
  function updateCityNotice(){
    // Environmental hazards retain visual and audible telegraphs, never text announcements.
    $('city-notice').hidden=true;
  }
  function renderCityEncounter(){
    const m=game.cityEvents,e=m.active;
    if(m.relay){circle(m.relay.x,m.relay.y,m.relay.r,'#87ffdc22');outline(m.relay.x,m.relay.y,m.relay.r,'#87ffdc',3);}
    if(!e)return;
    if(e.kind==='street')HAZ.electric(ctx,e,game.t,reducedMotion);
    else if(e.kind==='crane')HAZ.crane(ctx,e,game.t,reducedMotion);
  }
  function tick(dt) {
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player;
    cityTick(dt);
    g.grace=Math.max(0,g.grace-dt);
    if(g.grace>0)p.inv=Math.max(p.inv,g.grace+dt);
    if(false){
      g.lifeReward.checked=true;g.lifeReward.won=offerRand()<g.lifeReward.chance;claimLifeReward();
    }
    if(p.clockShield&&g.t>=p.nextShield){p.inv=Math.max(p.inv,1.1);p.nextShield=g.t+18;burst(p.x,p.y,'#a8ffee',12);}
    g.squadTacticDuration=Math.max(0,g.squadTacticDuration-dt);
    g.squadTacticCooldown=Math.max(0,g.squadTacticCooldown-dt);
    if(!g.squadTacticDuration)g.squadTactic='default';
    updateEncore(dt);
    // Split at night boundaries: new rates never reprice time already survived.
    const tickEnd=g.t+dt;
    for(let cursor=g.t;cursor<tickEnd;){
      const night=MAJOR.nightAt(cursor);
      const until=night===100?tickEnd:Math.min(tickEnd,night*MAJOR.NIGHT_SECONDS);
      g.survivalPoints=SCORE.advanceSurvival(g.survivalPoints,until-cursor,night);
      cursor=until;
    }
    g.t+=dt;g.shake=Math.max(0,g.shake-dt*5);
    g.wavePulse=Math.max(0,g.wavePulse-dt*.76);
    g.bossFlash=Math.max(0,g.bossFlash-dt*.7);
    g.magnetFlash=Math.max(0,g.magnetFlash-dt);
    const nextNight=MAJOR.nightAt(g.t),previousNight=g.campaign.night;
    g.wave=nextNight;g.nightCycle.waveCount=nextNight;
    if(nextNight>previousNight)for(let n=previousNight+1;n<=nextNight;n++)startMajorNight(n);
    if(g.t>1330&&!g.victory&&g.campaign.night<100){end();$('overlay-title').textContent='THE CATASTROPHE ENDURES';$('overlay-copy').textContent='Run limit reached. The final tally: '+g.campaign.boss+' bosses · '+g.campaign.elite+' elites · '+g.campaign.superElite+' super-elites. Need 9 of each and the Night100 final clear.';return;}
    updateFoundation(dt);if(g.mode!=='running')return;
    for(const key of Object.keys(g.buffs))g.buffs[key]=Math.max(0,g.buffs[key]-dt);
    if(g.t>=g.nextPower){
      g.exploration.attempts++;
      if(rand()<EXPLORATION.chance)dropPower(0,0,['rage','magnet','heal'][Math.floor(rand()*3)]);
      g.nextPower=g.t+rnd(EXPLORATION.intervalMin,EXPLORATION.intervalMax);
    }
    updateCityEncounter(dt);if(g.mode!=='running')return;
    updateEvolution(dt);updateDirector(dt);
    g.spawn-=dt;p.inv=Math.max(0,p.inv-dt);
    for(let i=g.damagePopups.length-1;i>=0;i--){g.damagePopups[i].age+=dt;if(g.damagePopups[i].age>=.9)g.damagePopups.splice(i,1);}
    if(LAB_MODE)releaseLabSpawn();
    if(g.spawn<=0){spawnEnemy();g.spawn=g.director.spawnDelay;}
    if(g.buffs.survivalInstinct===0){
      g.survivalTimer+=dt;
      if(g.survivalTimer>=10){g.survivalTimer=0;g.buffs.survivalInstinct=8;notify('ADRENALINE SURGE · 8s',2,'adrenaline');sound(1200,.18,'sine');}
    }
    p.survivalTimer=g.survivalTimer;p.survivalInstinctBuff=g.buffs.survivalInstinct;
    updateRelics(dt);
    edgeAid(dt);
    updateSupport(dt);
    updateGas(dt);if(g.mode!=='running')return;
    updateGhosts(dt);
    autoActivateMajorAbilities();
    const beforeX=p.x,beforeY=p.y;
    const input=moveInput();
    p.zoom=Math.max(0,(p.zoom||0)-dt);
    if(p.sprintDodge&&Math.hypot(input.x,input.y)>.1&&g.t>=(p.nextDodge||0)){p.inv=Math.max(p.inv,.25+.15*p.sprintDodge);p.nextDodge=g.t+5;burst(p.x,p.y,'#a3f9da',8);}
    const speed=(cfg.speed+300*Math.log1p((p.speed-cfg.speed)/300))*g.effectiveBuffs.speed*(p.zoom>0?1+.25*p.fishMomentum:1);
    const biomeSpeed=BIOMES[g.world.epoch%4].speed;
    moveWithCollision(p,input.x*speed*biomeSpeed*dt,(input.y*speed*biomeSpeed+WORLD_SCROLL_Y)*dt);
    WILDCARD.tick(g,wildcardAPI,dt);
    updateCompanions(dt);
    fishingTick(dt,input);
    MUTANTS.tick(g,mutationAPI);
    g.world.cameraY=p.y-H/2;g.world.chunk=Math.floor(p.x/WORLD_SIZE)+','+Math.floor(p.y/WORLD_SIZE);g.world.minY=Math.min(g.world.minY,p.y);g.world.maxY=Math.max(g.world.maxY,p.y);
    let aimTarget=null,aimDistance=460;
    for(const e of g.enemies){const d=dist(p.x,p.y,e.x,e.y);if(e.hp>0&&d<aimDistance){aimTarget=e;aimDistance=d;}}
    if(aimTarget)p.aim=Math.atan2(verticalDelta(p.y,aimTarget.y),wrappedDelta(p.x,aimTarget.x));
    else if(Math.hypot(input.x,input.y)>.1)p.aim=Math.atan2(input.y,input.x);
    if(p.echoShots>0){p.echoTimer-=dt;if(p.echoTimer<=0){shotAtEnemy(true);p.echoShots--;p.echoTimer=.11;}}
    p.shots-=dt*(p.zoom>0?1+.25*p.fishMomentum:1);if(p.shots<=0){shotAtEnemy();p.shots=Math.max(MIN_SHOT_INTERVAL,p.shotInterval/g.effectiveBuffs.fire);}
    const anim=p.animation;
    const wasHit=anim.hit>0,wasMoving=anim.moving;
    anim.clock+=dt;anim.attack=Math.max(0,anim.attack-dt);anim.hit=Math.max(0,anim.hit-dt);
    if(g.shots.some(s=>s.kind==='normal'&&dist(s.x,s.y,p.x,p.y)<65))anim.attack=.14;
    anim.moveSpeed=dt>0?Math.hypot(wrappedDelta(beforeX,p.x),p.y-beforeY-WORLD_SCROLL_Y*dt)/dt:0;
    anim.moving=anim.moveSpeed>6;
    anim.recovery=Math.max(0,(anim.recovery||0)-dt);
    if(wasHit&&anim.hit===0)anim.recovery=8/23;
    // Ease gait speed over starts/stops without layering or crossfading bodies.
    anim.gaitSpeed=(anim.gaitSpeed||0)+(Number(anim.moving)-(anim.gaitSpeed||0))*Math.min(1,dt*12);
    if(wasMoving&&!anim.moving)anim.settle=.16;
    anim.settle=Math.max(0,(anim.settle||0)-dt);
    anim.gaitClock=(anim.gaitClock||0)+dt*(anim.settle>0?Math.max(.7,anim.gaitSpeed):anim.gaitSpeed);
    if(!anim.moving&&Math.abs(Math.sin(anim.gaitClock*16/12*TWO))<.2)anim.settle=0;
    anim.visualMoving=anim.moving||anim.settle>0;
    // Visual-only grounded gait. The real-world foot anchor is updated from
    // actual player displacement; combat, collision and XP remain unchanged.
    const gaitSystem=window.CATA_HERO_KINEMATICS;
    if(gaitSystem){
      if(!anim.ikRig)anim.ikRig=gaitSystem.create();
      anim.gaitPose=gaitSystem.advance(anim.ikRig,{
        x:p.x,y:p.y,
        vx:dt>0?wrappedDelta(beforeX,p.x)/dt:0,
        vy:dt>0?(p.y-beforeY-WORLD_SCROLL_Y*dt)/dt:0,
        dt,baseSpeed:cfg.speed,
        shielded:p.inv>0,damaged:anim.hit>0,
        feral:g.buffs.rage>0||g.feralInstinct.active,
        adrenaline:g.buffs.survivalInstinct>0||g.feralInstinctOverdrive>0
      });
    }
    anim.state=anim.hit>0?'hit':anim.moving?'run':anim.attack>0?'attack':'idle';
    anim.frame=Math.floor(anim.clock*12)%12;
    for(const enemy of g.enemies){
      if(enemy.hp<=0||enemy.mRetreat<=g.t||enemy.cocoon||(enemy.arrivalUntil||0)>g.t)continue;
      const guard=g.companionSquad.find(c=>c.type==='tank'&&c.state==='guarding'&&dist(c.x,c.y,enemy.x,enemy.y)<260);
      const bard=g.companionSquad.find(c=>c.type==='bard'&&c.state==='singing'&&c.tauntUntil>g.t&&dist(c.x,c.y,enemy.x,enemy.y)<260);
      const target=bard||guard||p;
      const dx=wrappedDelta(enemy.x,target.x),dy=verticalDelta(enemy.y,target.y), d=Math.max(1,Math.hypot(dx,dy));
      let vx=dx/d,vy=dy/d,pace=1;
      const enemyRole=enemy.role||(MAJOR.catalog.normal.find(n=>n.id===enemy.variant)||{}).role;
      if(enemyRole==='caster'||enemyRole==='ranged'){
        const minRange=enemyRole==='caster'?225:155,maxRange=enemyRole==='caster'?340:enemy.variant==='ghost'?405:310;
        if(d<minRange){vx=-dx/d;vy=-dy/d;pace=enemyRole==='caster'?1.5:1.1;}
        else if(d>maxRange){pace=enemyRole==='caster'?.95:1.1;}
        else {vx=-dy/d;vy=dx/d;pace=enemyRole==='caster'?.68:.9;}
      }else if(enemy.variant==='orbiter'){
        // Circle at close range, then periodically cut inward.
        const orbit=d<240&&enemy.phase%12<8;
        if(orbit){vx=-dy/d;vy=dx/d;pace=1.2;}
      }else if(enemy.variant==='stalker'){
        // Flank the direction of travel rather than following the same pursuit line.
        const side=Math.sin(enemy.phase*.35)>0?1:-1;
        const tx=p.x+input.x*160-dy/d*side*110,ty=p.y+input.y*160+dx/d*side*110;
        const length=Math.max(1,dist(enemy.x,enemy.y,tx,ty));
        vx=(wrappedDelta(enemy.x,tx))/length;vy=(verticalDelta(enemy.y,ty))/length;pace=1.15;
        if(d<100){vx=dx/d;vy=dy/d;}
      }else if(enemy.variant==='weaver'){
        const weave=Math.sin(enemy.phase*1.8)*.85;
        vx-=dy/d*weave;vy+=dx/d*weave;pace=.95;
      }else if(enemy.variant==='dasher'||enemy.variant==='boss'){
        // A bright stationary wind-up precedes each short, committed dash.
        const cycle=enemy.phase%(enemy.variant==='boss'?7:9);
        if(cycle<2){pace=.25;enemy.dashX=vx;enemy.dashY=vy;}
        else if(cycle<3.2){pace=2.5;vx=enemy.dashX??vx;vy=enemy.dashY??vy;}
        else pace=.8;
      }
      const committed=(enemy.variant==='boss'||enemy.variant==='dasher')&&enemy.phase%(enemy.variant==='boss'?7:9)>=2&&enemy.phase%(enemy.variant==='boss'?7:9)<3.2;
      if(!ignoresTerrain(enemy)&&!committed&&!enemy.elite&&!(enemy.mutation==='burst'&&enemy.mutationAge<1.6)){
        const route=navigationDelta(enemy,enemy.x+vx*Math.min(d,350),enemy.y+vy*Math.min(d,350));
        const length=Math.max(1,Math.hypot(route.x,route.y));vx=route.x/length;vy=route.y/length;
      }
      ({vx,vy,pace}=updateEnemyBehavior(enemy,dt,vx,vy,pace));
      const packMove=MUTANTS.pack(g,enemy);
      if(packMove)({vx,vy,pace}=packMove);
      else if(enemy.packScatter>g.t)({vx,vy,pace}=enemy.packDash);
      if(enemy.family){
        ({vx,vy,pace}=MUTANTS.behavior(g,enemy,input,mutationAPI));
        if(enemy.family==='feral-fish-thief'&&enemy.mState==='escape'&&g.t>=enemy.mUntil)enemy.mEscaped=true;
      }
      // Extra speed is countered dynamically, including enemies already alive.
      // Far pursuers close the gap; nearby dashes remain telegraphed and dodgeable.
      const adaptation=Math.min(120,Math.max(0,p.speed-cfg.speed)*.25);
      const slow=(g.runicRelic.active==='slow'&&dist(enemy.x,enemy.y,p.x,p.y)<260)||relayProtects(enemy.x,enemy.y)?.45:1;
      const encoreSlow=enemy.encoreSlow>0?(enemy.variant==='boss'?.85:.45):1;
      const chase=(enemy.fishingMutant&&enemy.fishClock%4<1.45?0:1)*(enemy.squadStun>0?0:enemy.squadSlow>0?.4:1)*Math.min(slow,encoreSlow,enemy.wildcardSlow>g.t?.8:1)*(enemy.wildcardDraft>g.t?1.15:1)*(d>330?Math.max(enemy.speed+adaptation,Math.min(420,p.speed*1.08)):enemy.speed+adaptation);
      moveWithCollision(enemy,vx*chase*pace*dt,vy*chase*pace*dt);
      enemy.phase+=dt*3;enemy.hurt=Math.max(0,enemy.hurt-dt);
      if(!enemy.family&&!enemy.mRaised)updateMajorEnemyAttack(enemy,dt,target,d);
      if(enemy.hp>0&&canEnemyContact(enemy)&&!(enemy.squadStun>0))for(const pet of g.companionSquad){
        if(dist(pet.x,pet.y,enemy.x,enemy.y)<pet.r+enemy.r+.5)FOLLOWERS.interrupt(pet,'melee');
      }
      if(canEnemyContact(enemy)&&g.mode==='running'&&!g.pendingUpgrade&&dist(p.x,p.y,enemy.x,enemy.y)<p.r+enemy.r+.5&&p.inv===0&&!(g.runicRelic.active==='shield'&&g.runicRelic.duration>0)){
        damageTaken();p.hp=Math.max(0,p.hp-enemy.damage*(1-g.effectiveBuffs.mitigation)*(1-p.armor));p.inv=1.3;g.shake=.6;burst(p.x,p.y,'#fb7995',14);
        playSfx('danger');if(p.hp<=0){loseLife();return;}notify('OUCH! ♥ -'+(enemy.damage*(1-g.effectiveBuffs.mitigation)).toFixed(1));
      }
    }
    if(g.enemies.some(e=>e.mEscaped||e.mRetreat<=g.t))g.enemies=g.enemies.filter(e=>!e.mEscaped&&!(e.mRetreat<=g.t));
    resolveActorCollisions();
    updateEnemyProjectiles(dt);if(g.mode!=='running')return;
    for(let i=g.shots.length-1;i>=0;i--){
      const s=g.shots[i];
      s.trail.push({x:s.x,y:s.y});if(s.trail.length>(reducedMotion?1:6))s.trail.shift();
      s.flash=Math.max(0,s.flash-dt);s.life-=dt;
      if(!moveProjectile(s,dt)){g.shots.splice(i,1);continue;}
      if(s.life<=0){if(!s.hit.length)CATS.emit(g.catSpeech,s.speaker||'hero','miss');g.shots.splice(i,1);continue;}
      const idx=g.enemies.findIndex(e=>!s.hit.includes(e)&&dist(e.x,e.y,s.x,s.y)<e.r+s.r);
      if(idx>=0){
        const e=g.enemies[idx],raw=s.calculateDamage?s.calculateDamage():s.damage;
        const hitDamage=raw*(e.squadSlow>0&&g.equipment.lens&&g.equipment.coil?1+.25*Math.sqrt(g.equipment.lens*g.equipment.coil):1)*(e.squadMark>0?1.2:1)*(e.elite&&e.huntAge%5<1.5?.35:e.mutation==='shield'&&e.mutationAge>=1?.5:1);
        g.director.pendingDamage+=Math.min(e.hp,hitDamage);e.hp-=hitDamage;e.hurt=.12;
        if(s.critical||e.creditCategory)g.damagePopups.push({x:e.x,y:e.y-e.r-24,amount:Math.round(hitDamage*10)/10,critical:s.critical,major:!!e.creditCategory,age:0});
        if(g.damagePopups.length>80)g.damagePopups.shift();
        burst(s.x,s.y,s.critical?'#fff09a':'#a5f8ff',s.critical?7:4);playSfx(s.critical?'critical':'hit');
        if(g.equipment.coil){e.squadSlow=Math.max(e.squadSlow||0,1+Math.log1p(g.equipment.coil));g.buildEffects.slowed++;if(g.equipment.lens)g.buildEffects.conducted++;}
        s.hit.push(e);if(s.mark)e.squadMark=4;
        if(s.pierce>0){s.pierce--;}else if(s.bounces>0){
          s.bounces--;s.kind='bounce';s.flash=.16;burst(s.x,s.y,'#ffd568',9);
          const next=g.enemies.filter(n=>!s.hit.includes(n)).sort((a,b)=>dist(a.x,a.y,s.x,s.y)-dist(b.x,b.y,s.x,s.y))[0];
          if(next){const a=Math.atan2(verticalDelta(s.y,next.y),wrappedDelta(s.x,next.x));s.vx=Math.cos(a)*600;s.vy=Math.sin(a)*600;s.life=Math.max(.3,s.life);s.damage*=.65;}
          else {s.vx*=-1;s.vy*=-1;}
        }else g.shots.splice(i,1);
        if(e.hp<=0){
          defeatEnemy(e);
          if(g.mode!=='running')return;
        }
      }
    }
    for(let i=g.fishItems.length-1;i>=0;i--){
      const f=g.fishItems[i];f.phase+=dt*4;
      if(f.reservedRole&&g.t<f.reservedUntil)continue;
      const d=dist(f.x,f.y,p.x,p.y);
      if(d<135+p.magnet*65+(p.speed-cfg.speed)*2/3+g.effectiveBuffs.magnet)f.attracted=true;
      if(f.attracted){const route=navigationDelta(f,p.x,p.y),length=Math.max(1,Math.hypot(route.x,route.y)),step=Math.min(length,(f.swept?Math.max(950,p.speed*3):p.speed+240)*dt);
        moveWithCollision(f,route.x/length*step,route.y/length*step);}
      if(d<28||f.companionCollected){
        CATS.emit(g.catSpeech,'hero','fish',{gap:18});
        COMPANY.ledger(g).player+=f.value;if(p.fishMomentum)p.zoom=4;g.fish+=f.value;g.xp+=f.value*p.xpGain;g.fishItems.splice(i,1);burst(f.x,f.y,'#f5cf75',7);
        g.pickupEffects.push({x:f.x,y:f.y,life:.9,value:f.value});
        if(g.pickupEffects.length>24)g.pickupEffects.shift();
        playSfx('fish');collectEncore(f.value);
        if(g.xp>=xpRequired(p.level)){
          g.xp-=xpRequired(p.level);p.level++;offerUpgrade();return;
        }
      }
    }
    for(let i=g.rerollDrops.length-1;i>=0;i--){
      const token=g.rerollDrops[i];token.age+=dt;
      if(token.expires<=g.t){g.rerollDrops.splice(i,1);continue;}
      const d=dist(p.x,p.y,token.x,token.y);
      if(d<165+p.magnet*45+g.effectiveBuffs.magnet){
        const length=Math.max(1,d),speed=Math.min(length,(p.speed+240)*dt);
        moveWithCollision(token,wrappedDelta(token.x,p.x)/length*speed,(p.y-token.y)/length*speed);
      }
      if(d<32){g.rerollTokens=Math.min(99,g.rerollTokens+token.value);
        notify('REROLL TOKENS +'+token.value+' · TOTAL '+g.rerollTokens,2);
        playSfx('reroll');g.rerollDrops.splice(i,1);}
    }
    for(let i=g.powerups.length-1;i>=0;i--){
      const item=g.powerups[i];
      if(item.expires&&g.t>item.expires){g.powerups.splice(i,1);continue;}
      if(dist(item.x,item.y,p.x,p.y)<p.r+23){
        if(item.kind==='relay'){g.cityEvents.relayUnlocked=true;for(const pet of g.companionSquad)pet.specialCooldown=Math.max(0,pet.specialCooldown-4);}
        else if(item.kind==='heal')p.hp=Math.min(p.maxHp,p.hp+1);
        else if(item.kind==='magnet'){
          // One sweep of all fish currently on the board, never an ongoing pickup aura.
          for(const fish of g.fishItems){fish.attracted=true;fish.swept=true;}
          g.buffs.magnet=0;g.magnetSweepCount=(g.magnetSweepCount||0)+1;
          g.magnetSweepFish=g.fishItems.length;g.magnetFlash=.9;
        }else g.buffs[item.kind]=12;
        g.powerups.splice(i,1);burst(item.x,item.y,'#c2a4ff',12);playSfx(item.kind==='heal'?'heal':'power');
        notify(item.kind==='relay'?'RALLY RELAY · Specials / runes leave a safe slowing field':item.kind==='heal'?'HEART · +1 HP':item.kind==='rage'?'RAGE · DOUBLE DAMAGE 12s':'MAGNET · FISH SWEEP',2);
      }
    }
    // A merged fish cache can earn several levels; resolve one choice at a time.
    if(g.xp>=xpRequired(p.level)){g.xp-=xpRequired(p.level);p.level++;offerUpgrade();return;}
    finalizeMajorVictory();if(g.mode!=='running')return;
    for(let i=g.pickupEffects.length-1;i>=0;i--){g.pickupEffects[i].life-=dt;if(g.pickupEffects[i].life<=0)g.pickupEffects.splice(i,1);}
    for(let i=g.particles.length-1;i>=0;i--){
      const s=g.particles[i];s.x=wrapCoord(s.x+s.vx*dt);s.y=(s.y+s.vy*dt);s.vx*=.96;s.vy*=.96;s.life-=dt;
      if(s.life<=0)g.particles.splice(i,1);
    }
    if(noticeTTL>0){noticeTTL-=dt;if(noticeTTL<=0){$('notice').hidden=true;if(noticeQueue.length){const n=noticeQueue.shift();notify(n.message,n.duration,n.id);}}}
    updateHud();
  }
  let lastMajorHud=-1;
  function renderMajorBuffs(){
    if(!game||Math.floor(game.t*4)===lastMajorHud)return;
    lastMajorHud=Math.floor(game.t*4);
    const g=game,p=g.player;
    const active=[
      ['⚡','ADRENALINE',g.buffs.survivalInstinct],
      ['♨','FERAL',g.feralInstinct.active?g.feralInstinct.timer:0],
      ['✦','RAGE',g.buffs.rage],
      ['✚','INVULNERABLE',p.inv],['⬟','SHIELD',g.runicRelic.duration],
      ['⟳','REROLL',g.rerollTokens]
    ].filter(item=>item[2]>0 && item[1]!=='REROLL').slice(0,3);
    const icon=$('major-buff-icons');icon.replaceChildren();
    for(const [glyph,title,duration] of active){
      const chip=document.createElement('span');chip.className='major-buff active';
      const symbol=document.createElement('strong');symbol.textContent=glyph;
      const text=document.createElement('span');text.textContent=Math.ceil(duration)+'s';chip.title=title;
      chip.append(symbol,text);icon.append(chip);
    }
  }

  function updateHud(){
    if(!game)return;
    updateCityNotice();
    $('lives-count').textContent=game.lives+' / 9';
    $('life-pips').textContent='●'.repeat(game.lives)+'○'.repeat(9-game.lives);
    $('lives-hud').classList.toggle('last-life',game.lives===1);
    $('lives-hud').setAttribute('aria-label',game.lives+' of 9 lives remaining');
    $('grace-status').textContent=game.grace>0?'SAFE RETURN · '+game.grace.toFixed(1)+'s':'';
    $('time').textContent=String(Math.floor(game.t/60)).padStart(2,'0')+':'+
      String(Math.floor(game.t%60)).padStart(2,'0');
    $('score').textContent=scoreSnapshot().total;
    $('night-count').textContent=game.campaign.night+'/100';
    $('reroll-count').textContent=game.rerollTokens;
    $('reroll-upgrades').disabled=game.rerollTokens<1;
    $('build-stats').textContent='Speed '+Math.round(game.player.speed)+' · Damage '+game.player.damage.toFixed(2)+
      ' · Next level '+xpRequired(game.player.level)+' XP · XP ×'+game.player.xpGain.toFixed(1)+' · Shots/s '+(1/game.player.shotInterval).toFixed(2)+' · Spread '+(1+game.player.multishot*2)+
      ' · Bounces '+game.player.ricochet+' · Pickup '+Math.round(135+game.player.magnet*65+(game.player.speed-cfg.speed)*2/3)+'px'+' · Lens '+game.equipment.lens+' / Coil '+game.equipment.coil+' / Rune '+game.equipment.capacitor;
    $('fish').textContent=game.fish;$('fishing-status').textContent='Rod '+game.fishing.rod+' · Line '+game.fishing.line+' · '+game.fishing.bait+' '+game.fishing.charges+' · JACKPOT '+game.fishing.jackpot;$('kills').textContent=game.kills;
    const encore=game.encore;
    const encoreText=encore.cooldown>0?'ENCORE '+Math.ceil(encore.cooldown)+'s':encore.charge?'FISH · '+encore.charge+'/3 · '+Math.ceil(encore.window)+'s':'FISH · 0/3';
    $('encore-label').textContent=encoreText;
    $('encore-meter').value=encore.cooldown>0?1-encore.cooldown/ENCORE_COOLDOWN:encore.charge/3;
    $('encore-meter').setAttribute('aria-label',encore.cooldown>0?'Fishbone Encore rearming: '+Math.ceil(encore.cooldown)+' seconds': 'Fishbone Encore: '+encore.charge+' of 3 fish in eight seconds');
    const p=game.player;
    const relic=game.runicRelic,button=$('runic-relic-activate');
    button.hidden=true;
    button.disabled=game.mode!=='running'||!relic.held||relic.cooldown>0;
    button.textContent=relic.active?'Rune '+relic.active+' · '+Math.ceil(relic.duration)+'s':relic.held?'Activate '+relic.held+(relic.cooldown>0?' · '+Math.ceil(relic.cooldown)+'s':''):'Rune cooldown · '+Math.ceil(relic.cooldown)+'s';
    button.setAttribute('aria-label',button.textContent);
    for(const type of roleNames){
      const ally=game.companionSquad.find(c=>c.type===type),btn=$('ability-'+type);
      if(!btn)continue;btn.hidden=!ally;
      if(!ally)continue;
      btn.disabled=game.mode!=='running'||!ally.specialAbilityReady||ally.pendingSpecial||['interrupted','recovering','acting'].includes(ally.phase);
      const name=specialNames[type];
      const icons={shooter:'✹',healer:'✚',tank:'⬟',brawler:'⚔',sniper:'◎',engineer:'⚙',trapper:'⌁',bard:'♫'};
      btn.textContent=icons[type]+(ally.specialDuration>0?' '+Math.ceil(ally.specialDuration):ally.specialCooldown>0?' '+Math.ceil(ally.specialCooldown):'');
      const cooperation=type==='healer'&&ally.phase==='following'?'Stand still':type==='trapper'&&ally.phase==='following'?'Stay nearby':type==='tank'&&ally.phase==='recovering'?'Charging':ally.state||'following';
      btn.textContent+=' '+type+' · '+cooperation;
      btn.dataset.phase=ally.phase;
      btn.title=FOLLOWERS.roleSpecs[type].hint;
      btn.setAttribute('aria-label',type+' '+(ally.state||'following')+' · '+btn.title+' · special: '+btn.textContent);
      btn.style.setProperty('--ready',((1-ally.specialCooldown/(type==='healer'?24:18))*100)+'%');
    }
    const roster=game.companionSquad,ready=role=>roster.some(c=>c.type===role&&c.level===3);
    $('support-status').textContent=roster.length?roster.length+'/4 · '+roster.map(c=>c.type+' L'+c.level+' '+(c.level<3?Math.floor(c.work)+'/'+(c.level===1?24:75):'★')+' f'+(c.food||0)+' '+(c.mechaStage?c.mechaStage+' '+Math.ceil(c.heat)+'°':c.forage?'eat':c.state.slice(0,4))).join(' | ')+(roster.some(c=>c.type==='mecha')?' · Crew committed':' · Mecha E'+(ready('engineer')?'✓':'—')+' S'+(ready('shooter')?'✓':'—')):'SOLO · 0/4 · kills earn XP · recruit via cards';
    $('xp-level').textContent=game.xp.toFixed(0)+' / '+(xpRequired(p.level))+' · L'+p.level;
    $('night-status').textContent=STRESS_MODE?'LAB · NIGHT '+game.campaign.night+' · LV '+p.level:game.campaign.night>=99?(game.campaign.night===100?'THE CATASTROPHE':'THE FINAL NIGHT APPROACHES'):'';
    const boss=game.enemies.find(e=>e.variant==='boss');$('boss-status').hidden=!boss;
    if(boss){$('boss-status').querySelector('span').textContent=(boss.name||'BOSS').toUpperCase();$('boss-status').setAttribute('aria-label',boss.name||'Boss');$('boss-health').value=boss.hp/boss.max;$('boss-health').setAttribute('aria-label',(boss.name||'Boss')+' '+Math.ceil(boss.hp)+' / '+Math.ceil(boss.max)+' HP');}
    $('encounter-status').textContent=''; // Credits remain in test diagnostics.
    renderMajorBuffs();
    $('buff-status').textContent='';
    const tactic=$('squad-tactic'),names=['ATK','GUARD','HEAL'];
    tactic.disabled=game.mode!=='running'||game.squadTacticCooldown>0;
    tactic.textContent=game.squadTacticDuration>0?game.squadTactic.toUpperCase()+' '+Math.ceil(game.squadTacticDuration)+'s':game.squadTacticCooldown>0?'Tactic '+Math.ceil(game.squadTacticCooldown)+'s':'Tactic: '+names[game.nextTactic];
    tactic.setAttribute('aria-label','Squad tactics toggle: '+tactic.textContent);
    $('health').parentElement.classList.toggle('hurt',p.inv>0&&game.escape===0);
    $('health').textContent=(Math.ceil(p.hp*10)/10)+' / '+p.maxHp;
    $('health').setAttribute('aria-label',p.hp+' HP remaining out of '+p.maxHp+' maximum');
  }
  function circle(x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,TWO);ctx.fillStyle=c;ctx.fill();}
  function outline(x,y,r,c,w=2){ctx.beginPath();ctx.arc(x,y,r,0,TWO);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
  function polygon(x,y,points,color) {
    ctx.beginPath();ctx.moveTo(x+points[0][0],y+points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(x+points[i][0],y+points[i][1]);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  const Renderer=Object.freeze({drawCriticalHitEffect(shot){
    if(!shot.critical)return;
    outline(shot.x,shot.y,10,'#fff09a',2);
    ctx.fillStyle='#fff6c9';ctx.fillRect(shot.x-2,shot.y-15,4,5);
  }});
  // Illustration only: coordinate hashes never advance the simulation RNG.
  const inkHash = (x,y) => ((Math.imul(x|0,374761393)^Math.imul(y|0,668265263))>>>0)/4294967296;
  let renderBiome=0;
  function streetScene(cx,cy){
    if(cityDraw(cx,cy))return;
    const left=cx,top=cy,right=cx+W,bottom=cy+H;
    if(right<=left||bottom<=top)return;
    ctx.fillStyle=BIOMES[renderBiome].floor;ctx.fillRect(left,top,right-left,bottom-top);
    for(let cy=Math.floor(top/WORLD_SIZE);cy<=Math.floor(bottom/WORLD_SIZE);cy++)
      for(let cx=Math.floor(left/WORLD_SIZE);cx<=Math.floor(right/WORLD_SIZE);cx++){
        const l=Math.max(left,cx*WORLD_SIZE),t=Math.max(top,cy*WORLD_SIZE),r=Math.min(right,(cx+1)*WORLD_SIZE),b=Math.min(bottom,(cy+1)*WORLD_SIZE);
        ctx.save();ctx.beginPath();ctx.rect(l,t,r-l,b-t);ctx.clip();
        VIS.ground(ctx,{left:l,top:t,right:r,bottom:b},chunkAt(cx,cy).biome);ctx.restore();
      }
    for(const c of city){
      if(c.x+c.w<cx-40||c.x>cx+W+40||c.y+c.h<cy-40||c.y>cy+H+40)continue;
      VIS.prop(ctx,c,renderBiome,game?game.t:0,reducedMotion);
      if(game&&game.campaign.night>=99)FIRE.world(ctx,c,game.t,game.campaign.night===100?1:.32,reducedMotion);
    }
  }

  // Effects Pass 2: stateless illustrations. Never allocate simulation particles or use rand().
  function inkBox(x,y,w,h,fill,edge='#091822',line=3){
    ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle=edge;ctx.lineWidth=line;ctx.strokeRect(x,y,w,h);
  }
  function drawFishPickup(f){
    circle(f.x,f.y,18,'#dfc26b33');ctx.save();ctx.translate(f.x,f.y+(reducedMotion?0:Math.sin(f.phase)*4));
    polygon(9,0,[[0,0],[11,-8],[11,8]],'#f6cb62');
    ctx.fillStyle='#ffdc7b';ctx.beginPath();ctx.ellipse(0,0,12,7,0,0,TWO);ctx.fill();
    circle(-6,-1,1.6,'#523322');ctx.restore();
  }
  const MUTATION_TELLS={
    reveal:['TEETH!', '#ffd680'], countdown:['STOP THE BELL','#ffcd81'],
    'landing-warning':['LANDING','#ffac92'], leap:['LANDING','#ffac92'],
    ritual:['BREAK RITUAL','#bfffad'], rally:['PACK CHARGE','#efa9ff'],
    snatch:['FISH SNATCH','#ffcf7d'], escape:['STOLEN FISH','#ffcf7d'],
    transition:['EVOLVING','#c9b7ff'], 'boss-warning':['MOVE!','#ffa5c1']
  };
  function drawMutationTell(g,e){
    const tell=MUTATION_TELLS[e.mState];
    if(!tell)return;
    const point=['ritual','landing-warning','leap','boss-warning'].includes(e.mState)&&e.mTarget?e.mTarget:e;
    const [label,color]=tell;
    const radius=e.mState==='boss-warning'&&!e.mTarget?70:e.mState==='landing-warning'||e.mState==='leap'?40:36;
    circle(point.x,point.y,radius,'#130d23ad');
    outline(point.x,point.y,radius,color,4);
    ctx.save();ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillStyle=color;
    ctx.strokeStyle='#151025';ctx.lineWidth=4;
    ctx.strokeText(label,point.x,point.y-44);ctx.fillText(label,point.x,point.y-44);
    if(e.mState==='boss-warning'&&!e.mTarget){
      ctx.strokeStyle=color;ctx.lineWidth=3;
      const count=e.mHybrid?5:8;
      const directions=e.family==='patchwork-broodmother'?[e.mDash]:Array.from({length:count},(_,i)=>{
        const angle=(i+.5)*TWO/count;return {vx:Math.cos(angle),vy:Math.sin(angle)};
      });
      for(const v of directions){
        const length=Math.hypot(v.vx,v.vy)||1,dx=v.vx/length,dy=v.vy/length;
        ctx.beginPath();ctx.moveTo(e.x+dx*38,e.y+dy*38);ctx.lineTo(e.x+dx*118,e.y+dy*118);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawSupply(item,time){
    const color={rage:'#ff9a4f',magnet:'#77cfff',heal:'#fff0d9',relay:'#7affcb'}[item.kind];
    ctx.save();ctx.translate(item.x,item.y);
    ctx.fillStyle='#020e19aa';ctx.beginPath();ctx.ellipse(3,19,23,8,0,0,TWO);ctx.fill();
    ctx.globalAlpha=reducedMotion?.8:.65+.2*Math.sin(time*3+item.x);
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(-25,-27,50,51);ctx.globalAlpha=1;
    if(item.kind==='rage'){
      inkBox(-13,-23,26,43,'#bd432f');inkBox(-13,-23,26,6,'#efc49c');
      ctx.fillStyle='#f68943';ctx.fillRect(-10,-15,6,29);ctx.fillStyle='#ffe4b7';ctx.fillRect(-8,-21,9,2);
      polygon(0,0,[[3,-13],[-8,3],[0,2],[-3,13],[10,-4],[2,-3]],'#fff0ac');
      inkBox(-11,17,22,4,'#c2a69a','#091822',2);
    }else if(item.kind==='magnet'){
      inkBox(-20,-18,40,36,'#306b99');inkBox(-14,-24,28,6,'#a2c2d2');
      ctx.fillStyle='#538db2';ctx.fillRect(-17,-14,5,28);
      ctx.strokeStyle='#091822';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(-8,-10);ctx.lineTo(-8,2);ctx.arc(0,2,8,Math.PI,0,true);ctx.lineTo(8,-10);ctx.stroke();
      ctx.strokeStyle='#c0e9ed';ctx.lineWidth=6;ctx.stroke();
      ctx.fillStyle='#ff8c7a';ctx.fillRect(-11,-12,6,7);ctx.fillStyle='#82dfff';ctx.fillRect(5,-12,6,7);
    }else if(item.kind==='heal'){
      inkBox(-8,-25,16,7,'#73898b');inkBox(-23,-17,46,35,'#e9e6cf');
      ctx.fillStyle='#a8bcb5';ctx.fillRect(-21,10,42,6);ctx.fillStyle='#fff8e3';ctx.fillRect(-20,-14,39,4);
      ctx.fillStyle='#c94e5e';ctx.fillRect(-5,-10,10,23);ctx.fillRect(-12,-3,24,9);
      ctx.fillStyle='#7e9491';ctx.fillRect(-20,-4,4,9);ctx.fillRect(16,-4,4,9);
    }else{
      inkBox(-21,-14,42,32,'#356b65');polygon(0,0,[[-21,-14],[-13,-21],[15,-21],[21,-14]],'#7bb6a1');
      ctx.fillStyle='#1b393e';ctx.fillRect(-15,-7,30,18);ctx.fillStyle='#8affd8';ctx.fillRect(-3,-4,6,12);
      ctx.strokeStyle='#b4ffe2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-21);ctx.lineTo(0,-30);ctx.stroke();circle(0,-30,3,'#b4ffe2');
      for(const side of [-1,1]){ctx.beginPath();ctx.arc(0,-28,10,side<0?2.5:-.65,side<0?3.8:.65);ctx.stroke();}
      ctx.fillStyle='#91b7a5';ctx.fillRect(-19,12,8,5);ctx.fillRect(11,12,8,5);
    }
    ctx.restore();
  }
  function drawCraneCargo(d){
    const progress=clamp(d.age/1.6,0,1);
    ctx.save();ctx.translate(d.x,d.y);
    if(!d.hit){
      // The circle remains the exact warning radius. Cargo and shadow stay inside it horizontally.
      ctx.fillStyle='#0a121b';ctx.globalAlpha=.15+progress*.4;ctx.beginPath();ctx.ellipse(0,3,15+progress*15,8+progress*8,0,0,TWO);ctx.fill();ctx.globalAlpha=1;
      const height=reducedMotion?24:(1-progress*progress)*130;
      ctx.translate(0,-height);ctx.scale(.7+.3*progress,.7+.3*progress);
      inkBox(-25,-16,44,38,'#a06c39');
      polygon(0,0,[[-25,-16],[-15,-25],[29,-25],[19,-16]],'#dba95f');
      polygon(0,0,[[19,-16],[29,-25],[29,12],[19,22]],'#634a32');
      ctx.strokeStyle='#14212a';ctx.lineWidth=3;ctx.strokeRect(-25,-16,44,38);
      ctx.strokeStyle='#704823';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-23,-6+i*10);ctx.lineTo(17,-6+i*10);ctx.stroke();}
      for(const x of [-17,8]){inkBox(x,-16,5,38,'#879594','#14212a',1);polygon(0,0,[[x,-16],[x+10,-25],[x+15,-25],[x+5,-16]],'#b6bfb0');}
      inkBox(-7,-9,13,17,'#ead7a0','#352b21',1);polygon(0,0,[[-5,3],[0,-6],[5,3]],'#443b2f');
      ctx.fillStyle='#e5d2a3';for(const x of [-15,10])for(const y of [-12,17])ctx.fillRect(x,y,2,2);
    }else{
      const fade=clamp((2.1-d.age)/.5,0,1),spread=reducedMotion?24:12+(1-fade)*24;
      ctx.globalAlpha=fade;
      // Finite impact from existing debris lifetime; no new objects or timers.
      for(let i=0;i<8;i++){const a=i*TWO/8;circle(Math.cos(a)*spread,Math.sin(a)*spread*.5,5+(1-fade)*4,'#bd9d7666');
        if(i%2===0){ctx.strokeStyle='#ffd083';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(Math.cos(a)*16,Math.sin(a)*12);ctx.lineTo(Math.cos(a)*(spread+6),Math.sin(a)*(spread+6));ctx.stroke();}}
      inkBox(-19,-12,38,25,'#725539');ctx.strokeStyle='#c2a16a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-15,-7);ctx.lineTo(13,8);ctx.moveTo(13,-7);ctx.lineTo(-15,8);ctx.stroke();
    }
    ctx.restore();
  }
  function drawRage(g,aim,front=false){
    // Imported orange feral animation carries the effect on the character itself.
    if(g.buffs.rage<=0||ART.hasReferenceAnimation('hero','feral'))return;
    const fade=Math.min(1,g.buffs.rage/1.2),t=reducedMotion?0:g.t;
    ctx.save();ctx.globalAlpha=fade;
    if(!front){
      // Ember mantle hugs the silhouette, leaving the larger buff rings readable.
      circle(0,3,34,'#ff612518');circle(0,3,29,'#ff912523');
      for(let i=0;i<7;i++){
        const a=i*TWO/7,phase=(t*1.6+i*.37)%1,r=27+phase*8;
        ctx.globalAlpha=fade*(1-phase)*.85;
        ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r);ctx.rotate(a);
        polygon(0,0,[[0,-3],[8+phase*5,0],[0,3],[-4,0]],i%2?'#ff6a39':'#ffc66d');ctx.restore();
      }
    }else{
      ctx.translate(16,16);ctx.rotate(aim);ctx.globalAlpha=fade;
      inkBox(4,-7,19,3,'#ff7e38','#ffcb7033',2);
      ctx.strokeStyle='#ffd48a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(5,4);ctx.lineTo(10,1);ctx.lineTo(15,5);ctx.lineTo(23,1);ctx.stroke();
    }
    ctx.restore();
  }
  // Cosmetic only: identical targeting, projectile cadence, lifetime and footprint.
  function drawEngineerTurret(c,t,time){
    const porcelain=t.skin==='porcelain',motion=!reducedMotion;
    const metal=porcelain?'#b9ddd7':'#c99e55',shade=porcelain?'#477a86':'#795337';
    const light=t.life<1?'#ff926a':porcelain?'#8effed':'#ffe4a3';
    const kick=motion?Math.max(0,(t.timer-.25)/.1):0;
    const fold=motion?Math.max(0,1-t.life)*5:0;
    c.save();c.translate(t.x,t.y);c.lineJoin='round';c.lineCap='round';
    c.fillStyle='#071b23a9';c.beginPath();c.ellipse(0,16,24,8,0,0,TWO);c.fill();
    // Splayed shock-absorber feet and a low, riveted turntable.
    for(const side of [-1,1]){
      c.strokeStyle='#142d38';c.lineWidth=8;c.beginPath();c.moveTo(side*5,5);c.lineTo(side*(19-fold),17);c.stroke();
      c.strokeStyle=metal;c.lineWidth=4;c.stroke();c.fillStyle=shade;c.fillRect(side*(19-fold)-5,15,10,4);
    }
    c.fillStyle=shade;c.strokeStyle=metal;c.lineWidth=2;c.beginPath();c.ellipse(0,6,14,9,0,0,TWO);c.fill();c.stroke();
    for(let i=0;i<4;i++){c.fillStyle=t.life>i*2?light:'#203d43';c.fillRect(-9+i*5,7,3,3);}
    c.save();c.translate(0,-4+fold);c.rotate(Number.isFinite(t.aim)?t.aim:0);c.translate(-kick*4,0);
    c.fillStyle=shade;c.strokeStyle='#152c37';c.lineWidth=3;
    c.beginPath();c.roundRect(-14,-12,30,24,porcelain?10:4);c.fill();c.stroke();
    c.fillStyle=metal;c.beginPath();c.roundRect(-12,-11,25,18,porcelain?9:3);c.fill();
    // Ceramic model has twin cooling fins; brass model has a winding key.
    c.fillStyle=shade;
    if(porcelain){c.fillRect(-9,-16,17,3);c.fillRect(-9,12,17,3);}
    else{c.fillRect(-20,-3,8,6);c.strokeStyle=metal;c.lineWidth=3;c.beginPath();c.ellipse(-23,0,4,7,0,0,TWO);c.stroke();}
    c.fillStyle='#243d49';c.fillRect(9,-5,23,10);c.fillStyle=metal;c.fillRect(12,-4,12,3);
    c.fillStyle=shade;c.fillRect(27,-7,7,14);c.fillStyle='#101f2b';c.fillRect(33,-4,3,8);
    c.fillStyle=light;c.beginPath();c.arc(3,-5,3,0,TWO);c.fill();
    // Tiny inspection marks: a purposeful machine, with a cat's quality control.
    c.fillStyle='#203740';for(let i=0;i<3;i++)c.fillRect(-8+i*4,2,2,4);
    if(kick>0){c.globalAlpha=Math.min(1,kick);c.fillStyle='#fff2bd';c.beginPath();c.moveTo(36,0);c.lineTo(46,-5);c.lineTo(42,0);c.lineTo(48,4);c.closePath();c.fill();}
    c.restore();
    if(t.life<1){c.strokeStyle=light;c.lineWidth=2;c.beginPath();c.arc(0,-7,20,-Math.PI/2,-Math.PI/2+Math.max(0,t.life)*TWO);c.stroke();}
    c.restore();
  }
  window.drawEngineerTurret=drawEngineerTurret;
  function drawCompanionEffect(pet){
    ctx.save();ctx.translate(pet.x,pet.y);
    if(pet.type==='tank'&&pet.state==='guarding'&&pet.specialDuration>0){
      polygon(0,0,[[-29,-24],[29,-24],[32,10],[19,33],[0,41],[-19,33],[-32,10]],'#89cfff18');
      ctx.strokeStyle='#94cfff';ctx.lineWidth=3;ctx.stroke();
      for(let i=-1;i<=1;i++)inkBox(i*17-5,-29,10,5,'#c5eeff','#294d69',1);
    }
    const elapsed=(pet.type==='healer'?24:18)-pet.specialCooldown;
    if(elapsed>=0&&elapsed<.25&&pet.type!=='tank'){
      const f=elapsed/.65,color=pet.type==='healer'?'#8affbd':'#ffce86';ctx.globalAlpha=1-f;
      outline(0,0,reducedMotion?36:24+f*45,color,3);
      for(let i=0;i<3;i++){
        const a=i*TWO/3,r=reducedMotion?32:24+f*36,x=Math.cos(a)*r,y=Math.sin(a)*r;
        ctx.save();ctx.translate(x,y);
        if(pet.type==='healer'){ctx.fillStyle=color;ctx.fillRect(-2,-6,4,12);ctx.fillRect(-6,-2,12,4);}
        else{ctx.rotate(a);polygon(0,0,[[0,-3],[11,0],[0,3]],color);}ctx.restore();
      }
    }
    ctx.restore();
  }
  function catSprite(type,r,time,hurt=false,aim=0,requestedState='run'){
    // A new character-reference atlas can be shipped by manifest alone.
    // State requests come from actual game behavior, not a static animation preview.
    if(type==='mecha')return;
    type=COMPANY.identities[type]?.[0]|| (type==='mecha'?'engineer':type);
    const isHero=type==='hero'&&game;
    const state=isHero?(game.player.animation.hit>0?'hit':game.player.animation.recovery>0?'recover':game.player.animation.visualMoving?'run':game.player.animation.attack>0?'attack':'idle'):requestedState;
    const effect=isHero?(game.buffs.rage>0||game.feralInstinct.active?'feral':game.buffs.survivalInstinct>0||game.feralInstinctOverdrive>0?'adrenaline':null):null;
    VIS.aura(ctx,type,r,time,effect||state,reducedMotion);
    const anim=isHero?game.player.animation:null;
    const artTime=isHero?(state==='hit'?.35-anim.hit:state==='recover'?8/23-anim.recovery:anim.visualMoving?anim.gaitClock:state==='attack'?Math.max(0,game.t-(game.player.lastShotAt??game.t)):time):time;
    if(type==='hero')return globalThis.CATA_HERO_ILLUSTRATED.draw(ctx,r,artTime,state,!!anim?.visualMoving,effect,anim?.gaitPose,reducedMotion,aim);
    return ART.draw(ctx,type,r,isHero?game.t:artTime,state,aim,!!hurt,reducedMotion,!!(isHero&&game.player.animation.visualMoving),effect,!!(isHero&&game.player.animation.attack>0),isHero?{kinematics:anim.gaitPose,speedRatio:anim.gaitPose?.speedRatio||0,shielded:game.player.inv>0}:null);
  }
  function renderWorld(){
    const source=game,p=source.player;
    const viewX=p.x-W/2,viewY=p.y-H/2;
    const shakeX=reducedMotion?0:Math.sin(source.t*71)*source.shake*5;
    const shakeY=reducedMotion?0:Math.cos(source.t*83)*source.shake*5;
    ctx.fillStyle='#0e1d2b';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(-viewX+shakeX,-viewY+shakeY);
    renderBiome=source.world.epoch%4;
    city=terrainNear(p.y,p.x,Math.max(W,H)/2+350);
    streetScene(viewX,viewY);ctx.restore();
    const actorTiles=[{x:0,y:0}];
    for(const tile of actorTiles){
      const cameraX=viewX-tile.x,cameraY=viewY-tile.y;
      const visible=(a,pad=80)=>a.x+pad>=cameraX&&a.x-pad<=cameraX+W&&a.y+pad>=cameraY&&a.y-pad<=cameraY+H;
      const g={...source,
        fishItems:source.fishItems.filter(a=>visible(a)),pickupEffects:source.pickupEffects.filter(a=>visible(a)),
        powerups:source.powerups.filter(a=>visible(a)),companionSquad:source.companionSquad.filter(a=>visible(a,280)),
        shots:source.shots.filter(a=>visible(a,80)),
        enemyShots:source.enemyShots.filter(a=>visible(a,80)),
        rerollDrops:source.rerollDrops.filter(a=>visible(a,80)),
        enemies:source.enemies.filter(a=>visible(a.mAir||a,280)),
        particles:source.particles.filter(a=>visible(a,20)),
        runicRelic:{...source.runicRelic,items:source.runicRelic.items.filter(a=>visible(a))},
        hazards:{toxicGasClouds:source.hazards.toxicGasClouds.filter(a=>visible(a,120))}};
      ctx.save();ctx.translate(-cameraX+shakeX,-cameraY+shakeY);
    WILDCARD_ART.drawWorld(ctx,source,reducedMotion);
    fishingDraw();
    const shadow=source.risingShadow;
    if(shadow.active){ctx.fillStyle='#291331cc';ctx.fillRect(cameraX,Math.max(cameraY,shadow.y),W,Math.max(0,Math.min(H,cameraY+H-shadow.y)));
      ctx.strokeStyle=shadow.warning>0?'#ffc979':'#cb83ff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(cameraX,shadow.y);ctx.lineTo(cameraX+W,shadow.y);ctx.stroke();}
    if(g.defeatedBoss){
      const b=g.defeatedBoss;
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.PI/2);ctx.globalAlpha=.72;
      catSprite(b.id,b.r,0,false,0,'hit');ctx.restore();
      ctx.fillStyle='#ffe6ae';ctx.font='bold 16px system-ui';ctx.textAlign='center';
      ctx.fillText(b.name+' · DEFEATED',b.x,b.y+b.r+28);ctx.textAlign='left';
    }
    for(const e of g.enemies)if((e.arrivalUntil||0)>g.t){
      outline(e.x,e.y,e.r+18,'#ffd282',3);
      ctx.fillStyle='#ffe3af';ctx.font='bold 13px system-ui';ctx.textAlign='center';
      ctx.fillText('INCOMING',e.x,e.y-e.r-24);ctx.textAlign='left';
    }
    renderCityEncounter();
    renderEncore();
    for(const rune of g.runicRelic.items){outline(rune.x,rune.y,24,'#94cfff',3);ctx.fillStyle='#d6eaff';ctx.font='bold 26px system-ui';ctx.fillText(rune.type==='shield'?'◇':'❄',rune.x-12,rune.y+9);}
    for(const token of g.rerollDrops){
      ctx.save();ctx.translate(token.x,token.y);
      ctx.rotate(reducedMotion?0:source.t*1.4);outline(0,0,17,'#ffe29a',3);
      circle(0,0,11,'#715833');ctx.fillStyle='#fff6c2';ctx.font='bold 17px system-ui';
      ctx.textAlign='center';ctx.fillText('⟳',0,6);ctx.textAlign='left';
      ctx.restore();
      ctx.fillStyle='#fff1bd';ctx.font='bold 12px system-ui';ctx.fillText('×'+token.value,token.x+18,token.y-15);
    }
    for(const f of g.fishItems)drawFishPickup(f);
    for(const f of g.pickupEffects){
      ctx.save();ctx.globalAlpha=f.life/.9;
      outline(f.x,f.y,reducedMotion?23:20+(1-f.life/.9)*30,'#ffdc7b',3);
      ctx.fillStyle='#ffdc7b';ctx.font='bold 18px system-ui';ctx.textAlign='center';
      ctx.fillText('+'+f.value+' FISH',f.x,f.y-(reducedMotion?26:26+(1-f.life/.9)*24));ctx.restore();
    }
    for(const item of g.powerups)drawSupply(item,g.t);
    for(const c of g.hazards.toxicGasClouds)HAZ.gas(ctx,c,g.t,c.age<1?110:gasRadius(c),c.age<1,reducedMotion);
    for(const pet of g.companionSquad){
      for(const t of pet.traps||[]){circle(t.x,t.y,t.r,'#87c9d10a');outline(t.x,t.y,t.r,'#87c9d15c',1);outline(t.x,t.y,12,'#d7f5e5',3);}
      if(pet.turret)drawEngineerTurret(ctx,pet.turret,g.t);
      drawCompanionEffect(pet);
      ctx.save();ctx.translate(pet.x,pet.y);
      if(pet.forage?.eating>0)ctx.rotate(Math.sin(g.t*14)*.09);
      if(pet.type==='mecha'&&cityActor('mecha',pet.mechaStage==='repair'?3:pet.heat>=90?2:pet.flash>0?1:0,0,0,100)){}else catSprite(pet.type,18,pet.phase==='preparing'?Math.min(.125,pet.animationTime):['acting','interrupted'].includes(pet.phase)?pet.animationTime:g.t,false,pet.aim||0,pet.phase==='interrupted'?'hit':['preparing','acting'].includes(pet.phase)?pet.actionArt:pet.moving?'run':'idle');
      if(pet.flash>0)outline(0,0,19,'#ffe7ab',3);
      ctx.fillStyle='#ffddaa';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(pet.type.toUpperCase()+' L'+pet.level+' '+(pet.forage?'NOM':pet.mechaStage||''),0,30);ctx.textAlign='left';ctx.restore();drawCompanyOverlay(pet);
    }
    for(const s of g.shots){
      const color=s.kind==='pet'?'#ffce86':s.kind==='bounce'?'#ffd568':s.kind==='spread'?'#ff94cd':'#71e5ff';
      if(s.trail.length){
        ctx.beginPath();ctx.moveTo(s.x+wrappedDelta(s.x,s.trail[0].x),s.y+verticalDelta(s.y,s.trail[0].y));
        for(const point of s.trail)ctx.lineTo(s.x+wrappedDelta(s.x,point.x),s.y+verticalDelta(s.y,point.y));
        ctx.lineTo(s.x,s.y);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
        ctx.strokeStyle='#fff6d5';ctx.lineWidth=1;ctx.stroke();
      }
      circle(s.x,s.y,s.kind==='normal'?5:7,'#0a1b25');
      circle(s.x,s.y,s.kind==='normal'?3:5,color);
      circle(s.x,s.y,1.5,'#fff7d9');
       VIS.shot(ctx,s,g.t,reducedMotion);
      Renderer.drawCriticalHitEffect(s);
      if(s.flash>0){
        ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=clamp(s.flash*8,0,1);
        const n=s.critical?8:4;
        for(let i=0;i<n;i++){const a=i*TWO/n+.3;ctx.save();ctx.rotate(a);
          polygon(0,0,[[8,-1],[s.critical?27:18,0],[8,2]],s.critical?'#fff09a':'#a5f8ff');ctx.restore();}
        if(s.critical){outline(0,0,18,'#fff09a',2);ctx.fillStyle='#fff0ac';ctx.font='bold 11px system-ui';ctx.fillText('CRIT',-13,-25);}
        ctx.restore();
      }
    }
    for(const s of g.enemyShots){
      ctx.save();ctx.translate(s.x,s.y);
      circle(0,0,s.r+4,s.kind==='plague'?'#baf58d45':'#fcb6b342');
      circle(0,0,s.r,s.kind==='plague'?'#c9f392':s.kind==='hex'?'#ff9de9':'#ffac86');
      ctx.restore();
    }
    for(const corpse of source.mutationEcology?.corpses||[]){
      if(visible(corpse)){circle(corpse.x,corpse.y,12,'#1a2838b0');outline(corpse.x,corpse.y,12,'#86ab8c99',2);}
    }
    for(const e of source.enemies)if(e.family)drawMutationTell(source,e);
    for(const e of [...g.enemies.filter(e=>e.variant!=='ghost'),...g.enemies.filter(e=>e.variant==='ghost')]){
      if(e.family){
        if(e.family==='pack-leader')outline(e.x,e.y,e.r+7,'#efa9ff',2);
        if(e.mState==='disguise')drawFishPickup(e);
        else MUTANT_MEDIA.draw(ctx,source,e,reducedMotion);
        continue;
      }
      if(e.pack||e.packScatter>source.t)outline(e.x,e.y,e.r+5,e.pack?'#efa9ff':'#bab3c8',2);
      if(e.x+e.r+230<cameraX||e.x-e.r-230>cameraX+W||e.y+e.r+230<cameraY||e.y-e.r-230>cameraY+H)continue;
      ctx.save();if(e.variant==='ghost')ctx.globalAlpha=.62;ctx.translate(e.x,e.y);ctx.rotate(reducedMotion?0:Math.sin(e.phase)*.045);
      if(!reducedMotion){const gait=Math.sin(e.phase*6);ctx.translate(e.hurt?-Math.cos(Math.atan2(p.y-e.y,wrappedDelta(e.x,p.x)))*3:0,-Math.abs(gait)*1.8);ctx.scale(1+Math.abs(gait)*.025,e.hurt?.94:1-Math.abs(gait)*.025);}
      circle(0,9,e.r*1.04,'#070d15a0');if(e.cityWarning>source.t){outline(0,0,e.r+28,'#ffbd7d',4);ctx.fillStyle='#ffe5bc';ctx.font='bold 14px system-ui';ctx.fillText('WARNING',-35,-e.r-35);}if(e.cityGate){outline(0,0,e.r+5,'#f6e5af',2);}
      if(e.creditCategory==='boss'&&source.campaign.night>=99)FIRE.bossAura(ctx,e.r,g.t,!!e.finalWave,reducedMotion);
      if(e.encoreSlow>0)outline(0,0,e.r+6,'#ffcf80',2);
      if(e.elite){outline(0,0,e.r+12,'#f1c3ff',4);
        if(e.huntAge%5<1.5){ctx.strokeStyle='#f1c3ff';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(e.huntX*210,e.huntY*210);ctx.stroke();}}

      if(e.windup>0){
        const c=e.attackKind==='plague'?'#c1e975':e.attackKind==='shockwave'?'#9dd7ff':'#ff9dca';
        outline(0,0,e.r+15+(1-e.windup)*8,c,4);
        ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);
        const target=source.player,dx=wrappedDelta(e.x,target.x),dy=target.y-e.y;
        const dd=Math.max(1,Math.hypot(dx,dy));ctx.lineTo(dx/dd*Math.min(250,dd),dy/dd*Math.min(250,dd));ctx.stroke();ctx.restore();
      }
      const color=e.variant==='ghost'?'#c7adff':e.variant==='orbiter'?'#65d6ef':e.variant==='stalker'?'#ffdb76':e.variant==='boss'?'#e56d9f':e.variant==='weaver'?'#b294ed':e.variant==='dasher'?'#f6af62':'#6faa8f';
      if((e.variant==='dasher'&&e.phase%9<2)||(e.variant==='boss'&&e.phase%7<2))outline(0,0,e.r+8,'#ffe6a1',3);
      if(e.variant==='ghost')outline(0,0,e.r+9,'#c7adff',3);
      if(source.phaseCaster===e.id&&source.phaseWindup>0){outline(0,0,220,'#d5a5ff',3);outline(0,0,e.r+18,'#ffffff',3);}
      if(e.mutation){
        const color=e.mutation==='burst'?'#ffb45f':e.mutation==='shield'?'#84dbff':'#eea4ff';
        outline(0,0,e.r+12,color,e.mutationAge<1?4:2);
        // Mutation symbols removed; keep meaningful attack telegraphs.
      }
      drawAnatomy(e);
      if(e.fishingMutant){fishingSprite('mutant',e.fishClock%4<1?1:e.fishClock%4<1.45?2:0,0,0,100);}else if(e.cityGuardian!==undefined&&cityActor('guardian',e.hurt?3:e.cityAttackUntil>source.t?2:1,0,0,e.r*3)){}else if(!e.cocoon)catSprite(e.bossKind||e.eliteKind||e.variant,e.r,e.phase,e.hurt,0,e.hurt?'hit':e.windup>0?'attack':'run');
      if(e.hurt){
        VIS.impact(ctx,e.r,e.phase,false,reducedMotion);
         outline(0,0,e.r+5,'#fff5db',2);
        // Existing hurt lifetime provides finite contact sparks even when the shot is removed.
        for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*TWO/4+.4);
          polygon(e.r+3,0,[[0,-2],[9,0],[0,2]],'#ffd48a');ctx.restore();}
      }
      // Regular zombies: silhouette and hit reaction only. Major enemies: slim bar when injured.
      if(e.creditCategory&&e.hp<e.max){
        const pct=clamp(e.hp/e.max,0,1),barW=e.r*2;
        ctx.fillStyle='#14212dcc';ctx.fillRect(-e.r,-e.r-19,barW,4);
        ctx.fillStyle=e.creditCategory==='boss'?'#ffc477':'#d99ac5';ctx.fillRect(-e.r,-e.r-19,barW*pct,4);
      }
      ctx.restore();
    }
    if(visible(p,300)){
    ctx.save();ctx.translate(p.x,p.y);
    if(p.autoFireDisabled)outline(0,0,39,'#c7adff',3);
    if(g.buffs.survivalInstinct>0)outline(0,0,48+(reducedMotion?0:Math.sin(g.t*4)*2),'#ffe79c',3);
    if(g.feralInstinctOverdrive>0)outline(0,0,53,'#ff7fad',4);
    if(g.runicRelic.active)outline(0,0,g.runicRelic.active==='slow'?260:38,'#94cfff',3);
    if(g.feralInstinct.active)outline(0,0,43,'#ff995e',4);
    if(g.escape>0)outline(0,0,36,'#7cf2d0',4);
    if(p.inv>0)outline(0,0,32,'#fff2cc',3);
    // Rendering uses the same target bearing as the shot simulation.
    const aim=p.aim;
    drawRage(g,aim);
    catSprite('hero',27,g.t,p.animation.state==='hit',aim);
    globalThis.CATA_HERO_RIG_RENDER.drawTail(ctx,aim,27,g.t,p.animation.gaitPose?.headingX<-.1?-1:1,p.animation.attack>.23,reducedMotion);

    ctx.restore();
    }
    for(const hit of g.damagePopups){
      if(!hit.critical&&!hit.major)continue;
      ctx.save();ctx.globalAlpha=Math.max(0,1-hit.age/.9);ctx.font=hit.critical?'bold 19px system-ui':'bold 15px system-ui';
      ctx.textAlign='center';ctx.fillStyle=hit.critical?'#ffe38a':'#ffffff';
      ctx.fillText('-'+hit.amount,hit.x,hit.y-hit.age*40);ctx.restore();
    }
    for(const e of g.particles){
      if(e.x<cameraX-10||e.x>cameraX+W+10||e.y<cameraY-10||e.y>cameraY+H+10)continue;
      ctx.globalAlpha=clamp(e.life/e.ttl,0,1);
      if(e.col==='#fff09a'){
        // These particles are emitted by the existing critical-hit event only.
        ctx.fillStyle=e.col;ctx.fillRect(e.x-e.r*2,e.y-1,e.r*4,2);ctx.fillRect(e.x-1,e.y-e.r*2,2,e.r*4);
      }else circle(e.x,e.y,e.r,e.col);
    }
    ctx.globalAlpha=1;
    ctx.restore();
    }
    const grad=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,650);
    grad.addColorStop(0,'#06132100');grad.addColorStop(1,'#030c1c99');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    VIS.atmosphere(ctx,W,H,source.t,source.campaign.night,reducedMotion);
    if(source.campaign.night>=99){
      FIRE.sky(ctx,W,H,source.t,source.campaign.night===100?1:.25,reducedMotion);
      FIRE.finale(ctx,W,H,source.t,source.campaign.night,source.bossFlash,reducedMotion);
    }
    FIRE.wave(ctx,W,H,source.wavePulse,source.campaign.night,reducedMotion);
    cityArrow();
    if(source.world.transition>0){
      ctx.save();ctx.globalAlpha=(source.world.transition/2.5)*.12;
      ctx.fillStyle=BIOMES[source.world.epoch%4].floor;ctx.fillRect(0,0,W,H);ctx.restore();
    }
    if(source.victory&&source.defeatedBoss){
      ctx.fillStyle='#08131bbd';ctx.fillRect(0,0,W,H);
      ctx.save();ctx.translate(W/2,H*.42);ctx.rotate(Math.PI/2);
      catSprite(source.defeatedBoss.id,76,0,false,0,'hit');ctx.restore();
      ctx.fillStyle='#ffe5a9';ctx.font='bold 25px system-ui';ctx.textAlign='center';
      ctx.fillText('THE CATASTROPHE · DEFEATED',W/2,H*.42+115);
      ctx.font='18px system-ui';ctx.fillText('18 / 18 · THE CITY SEES DAWN',W/2,H*.42+148);ctx.textAlign='left';
    }
    ctx.fillStyle='#162d41';ctx.fillRect(20,H-21,160,8);
    ctx.fillStyle='#77f3c1';ctx.fillRect(20,H-21,160*(source.xp/(xpRequired(p.level))),8);
  }
  function staticScreen() {
    ctx.save();ctx.translate(-650,-650);streetScene(650,650);ctx.restore();
    ctx.save();ctx.translate(W*.78,H*.55);ctx.scale(3,3);catSprite('hero',27,0,false,-.4);ctx.restore();
    ctx.fillStyle='#08131b80';ctx.fillRect(0,0,W,H);
  }
  function frame(now) {
    if(game&&game.mode==='running'){
      const d=game.director,sample=clamp(now-last,0,100);
      d.frameMs+=(sample-d.frameMs)*.03;
      if(d.frameMs>38)d.framePressure=true;
      else if(d.frameMs<28)d.framePressure=false;
    }
    const dt=Math.min(.05,Math.max(0,(now-last)/1000||0));last=now;
    if(game&&game.mode==='reviving')reviveTick(dt);
    else if(game&&game.mode==='running'){tick(dt);if(game.mode==='running')CATS.tick(game.catSpeech,game,dt,CATS.guideAvailable());}
    if(game&&['dead','won'].includes(game.mode)&&game.catSpeech.terminal!==game.mode){
      game.catSpeech.terminal=game.mode;CATS.emit(game.catSpeech,'hero',game.mode==='won'?'victory':'death');CATS.dispatch(game.catSpeech,['hero',...game.companionSquad.map(c=>c.type)],game.campaign.night);
    }
    if(game&&game.mode==='won'){
      game.victoryAge+=dt;
      for(let i=game.particles.length-1;i>=0;i--){
        const s=game.particles[i];s.x=wrapCoord(s.x+s.vx*dt);s.y+=s.vy*dt;s.life-=dt;
        if(s.life<=0)game.particles.splice(i,1);
      }
      game.bossFlash=Math.max(0,1-game.victoryAge/1.8);
      if(game.victoryAge>=2.4)$('start-overlay').hidden=false;
    }
    const speech=$('mutation-speech');
    const caption=game&&(game.mutantSpeech?.until>game.t?game.mutantSpeech:game.wildcard.caption);
    const showSpeech=game?.mode==='running'&&caption?.until>game.t;
    speech.hidden=!showSpeech;
    if(showSpeech&&speech.textContent!==caption.text)speech.textContent=caption.text;
    const festival=$('festival-status'), f=game?.wildcard;
    const festivalVisible=game?.mode==='running'&&['lighting','listening','fading'].includes(f.phase);
    festival.hidden=!festivalVisible;
    if(festivalVisible){
      const status=f.phase==='lighting'?'Midnight Festival · lanterns waking':
        f.phase==='listening'?'Light both lanterns · '+f.stamps+'/2 · '+Math.ceil(44-game.t)+'s':
        f.result==='success'?'Festival complete · 2 fish dropped':'Festival closed';
      if(festival.firstElementChild.textContent!==status)festival.firstElementChild.textContent=status;
      festival.dataset.lit=f.stamps;
    }
    music();
    if(game)renderWorld();else staticScreen();
    CATS.render(game?.catSpeech,game,canvas,W,H,reducedMotion||!game?0:Math.sin(game.t*71)*game.shake*5,reducedMotion||!game?0:Math.cos(game.t*83)*game.shake*5);
    requestAnimationFrame(frame);
  }
  function pointerCoords(ev){
    const rect=canvas.getBoundingClientRect();
    return {x:(ev.clientX-rect.left)*W/rect.width,y:(ev.clientY-rect.top)*H/rect.height};
  }
  canvas.addEventListener('pointerdown',ev=>{
    if(!game||game.mode!=='running'||pointer)return;
    ev.preventDefault();canvas.setPointerCapture(ev.pointerId);
    const p=pointerCoords(ev);pointer={id:ev.pointerId,startX:p.x,startY:p.y,vx:0,vy:0};
    $('stick').hidden=false;
    const box=canvas.getBoundingClientRect();
    const scale=box.width/W, sy=box.height/H;
    $('stick').style.left=(p.x*scale-57)+'px';$('stick').style.top=(p.y*sy-57)+'px';
  });
  canvas.addEventListener('pointermove',ev=>{
    if(!game||game.mode!=='running'||!pointer||ev.pointerId!==pointer.id)return;
    const p=pointerCoords(ev),dx=p.x-pointer.startX,dy=p.y-pointer.startY;
    const d=Math.max(1,Math.hypot(dx,dy));
    pointer.vx=dx/Math.max(55*W/canvas.getBoundingClientRect().width,d);pointer.vy=dy/Math.max(55*H/canvas.getBoundingClientRect().height,d);
    const scale=canvas.getBoundingClientRect().width/W;
    $('thumb').style.transform='translate('+pointer.vx*33+'px,'+pointer.vy*33+'px)';
  });
  function pointerEnd(ev){
    if(pointer&&ev.pointerId===pointer.id){pointer=null;$('stick').hidden=true;
      $('thumb').style.transform='translate(0,0)';}
  }
  canvas.addEventListener('pointerup',pointerEnd);
  canvas.addEventListener('lostpointercapture',pointerEnd);
  canvas.addEventListener('pointercancel', ev => {
    if (pointer && ev.pointerId === pointer.id) {
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch (e) { /* ignore */ }
      pointer = null;
      $('stick').hidden = true;
      $('thumb').style.transform = 'translate(0,0)';
    }
  });

  /* Fallback touch handlers for Samsung Android pointer event quirk workaround */
  const ua = navigator.userAgent || '';
  const isSamsungAndroid = ua.includes('Android') && ua.includes('Samsung');
  if (isSamsungAndroid) {
    canvas.addEventListener('touchstart', ev => {
      if (!game || game.mode !== 'running' || pointer) return;
      ev.preventDefault();
      const t = ev.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const p = {
        x: (t.clientX - rect.left) * W / rect.width,
        y: (t.clientY - rect.top) * H / rect.height
      };
      pointer = { id: 'touch', startX: p.x, startY: p.y, vx: 0, vy: 0 };
      $('stick').hidden = false;
      const box = canvas.getBoundingClientRect();
      const scale = box.width / W, sy = box.height / H;
      $('stick').style.left = (p.x * scale - 57) + 'px';
      $('stick').style.top = (p.y * sy - 57) + 'px';
    }, { passive: false });

    canvas.addEventListener('touchmove', ev => {
      if (!game || game.mode !== 'running' || !pointer || pointer.id !== 'touch') return;
      ev.preventDefault();
      const t = ev.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const p = {
        x: (t.clientX - rect.left) * W / rect.width,
        y: (t.clientY - rect.top) * H / rect.height
      };
      const dx = p.x - pointer.startX;
      const dy = p.y - pointer.startY;
      const d = Math.max(1, Math.hypot(dx, dy));
      pointer.vx = dx / Math.max(55*W/rect.width, d);
      pointer.vy = dy / Math.max(55*H/rect.height, d);
      const scale = canvas.getBoundingClientRect().width / W;
      $('thumb').style.transform = 'translate(' + pointer.vx * 33 + 'px,' + pointer.vy * 33 + 'px)';
    }, { passive: false });

    function touchEnd(ev) {
      if (!game || game.mode !== 'running' || !pointer || pointer.id !== 'touch') return;
      ev.preventDefault();
      pointer = null;
      $('stick').hidden = true;
      $('thumb').style.transform = 'translate(0,0)';
    }
    canvas.addEventListener('touchend', touchEnd, { passive: false });
    canvas.addEventListener('touchcancel', touchEnd, { passive: false });
  }
  window.addEventListener('keydown',ev=>{
    if(game&&game.mode==='upgrade'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.key)){
      ev.preventDefault();const cards=[...document.querySelectorAll('.upgrade:not([hidden])')];
      const i=cards.indexOf(document.activeElement),cols=matchMedia('(orientation:portrait)').matches?2:game.offerCount;
      const step=ev.key==='ArrowLeft'?-1:ev.key==='ArrowRight'?1:ev.key==='ArrowUp'?-cols:cols;
      cards[(Math.max(0,i)+step+cards.length)%cards.length]?.focus({preventScroll:true});return;
    }
    if(game&&['paused','upgrade'].includes(game.mode)&&ev.key==='Tab'){
      const panel=$(game.mode==='paused'?'pause-overlay':'upgrade-overlay');
      const items=[...panel.querySelectorAll('button:not([hidden]):not(:disabled),a,input,[tabindex="0"]')].filter(n=>n.getClientRects().length);
      const first=items[0],end=items[items.length-1];
      if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();end.focus();}else if(!ev.shiftKey&&document.activeElement===end){ev.preventDefault();first.focus();}
    }
    if(ev.key==='Escape'&&!ev.repeat){ev.preventDefault();pause();music();return;}
    if(game&&game.mode==='paused')return;
    if(ev.target.closest && ev.target.closest('input, textarea, select'))return;
    if((ev.key===' '||ev.key==='Enter')&&ev.target.closest&&ev.target.closest('button, a'))return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(ev.key))ev.preventDefault();
    if(game&&game.mode==='running')keys[ev.key]=true;if(!ev.repeat&&(ev.key==='Escape'||ev.key===' '))pause();
  });
  window.addEventListener('keyup',ev=>{keys[ev.key]=false;});
  window.addEventListener('blur',()=>{if(game&&['running','reviving'].includes(game.mode))pause();music();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&['running','reviving'].includes(game.mode))pause();music();});
  // Mobile Chrome requires a direct user gesture to remove browser chrome. Fullscreen
  // is independent of gameplay: denial or OS exit never prevents starting/resuming.
  function syncFullscreenButton() {
    const control=$('fullscreen');
    const active=!!document.fullscreenElement;
    control.textContent=active?'⛶ Exit':'⛶ Full';
    control.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
    control.setAttribute('aria-pressed',String(active));$('pause-fullscreen').textContent=active?'Exit fullscreen':'Fullscreen';
  }
  function enterFullscreen() {
    if(document.fullscreenElement||!$('arena').requestFullscreen)return;
    try {
      const request=$('arena').requestFullscreen({navigationUI:'hide'});
      if(request && typeof request.catch==='function')request.catch(()=>{/* unsupported or denied by browser */});
    }catch(err){/* start the game normally when fullscreen is unavailable */}
  }
  function toggleFullscreen() {
    if(document.fullscreenElement){
      try{const request=document.exitFullscreen();if(request&&request.catch)request.catch(()=>{});}catch(e){}
    }else enterFullscreen();
  }
  $('fullscreen').onclick=toggleFullscreen;
  $('pause-fullscreen').onclick=toggleFullscreen;
  if($('city-map'))$('city-map').onclick=cityMap;
  $('resume').onclick=()=>{unlockAudio();pause();music();};
  CATS.registerGuide({available:()=>!!$('pause-guide')});
  document.addEventListener('fullscreenchange',()=>{
    syncFullscreenButton();
    requestAnimationFrame(resizeViewport);
  });
  document.addEventListener('fullscreenerror',syncFullscreenButton);
  if(!$('arena').requestFullscreen)$('fullscreen').hidden=true;
  syncFullscreenButton();
  $('play').onclick=()=>{unlockAudio();enterFullscreen();resumeOrStart();music();};$('pause').onclick=()=>{unlockAudio();pause();music();};
  $('restart').onclick=()=>{unlockAudio();start();music();};$('mute').onclick=()=>{
    muted=!muted;saveAudioPreferences();if(muted)stopVoices();else unlockAudio();music();$('mute').textContent=muted?'♪ Sound off':'♪ Sound on';
    $('mute').setAttribute('aria-pressed',String(muted));
    $('mute').setAttribute('aria-label',muted?'Unmute sound':'Mute sound');
  };
  $('volume').value=String(Math.round(volume*100));
  $('volume').oninput=()=>{volume=Number($('volume').value)/100;saveAudioPreferences();unlockAudio();music();};
  $('mute').textContent=muted?'♪ Sound off':'♪ Sound on';
  $('mute').setAttribute('aria-pressed',String(muted));
  $('mute').setAttribute('aria-label',muted?'Unmute sound':'Mute sound');
  $('squad-tactic').onclick=()=>{
    if(!game||game.mode!=='running'||game.squadTacticCooldown>0)return;
    game.squadTactic=['aggressive','defensive','supportive'][game.nextTactic];
    game.nextTactic=(game.nextTactic+1)%3;game.squadTacticDuration=15;game.squadTacticCooldown=25;
    clearInput();notify(game.squadTactic.toUpperCase()+' · 15s');updateHud();
  };
  function resizeViewport(){
    clearInput();
    const vw=window.visualViewport?visualViewport.width:innerWidth,vh=window.visualViewport?visualViewport.height:innerHeight;
    $('arena').style.height=vh+'px';
    const rect=canvas.getBoundingClientRect(),scale=720/Math.min(rect.width,rect.height);
    W=rect.width*scale;H=rect.height*scale;
    const dpr=Math.min(2,devicePixelRatio||1);
    canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  }
  window.addEventListener('resize',resizeViewport);
  window.addEventListener('orientationchange',resizeViewport);
  if(window.visualViewport)visualViewport.addEventListener('resize',resizeViewport);
  resizeViewport();
  renderBest();
  // Read-only snapshots let QA verify simulation progress without changing game state.
  window.CATACLYSM_DIAGNOSTICS = Object.freeze({
    snapshot: () => ({unseen:game?JSON.parse(JSON.stringify(game.unseen,(k,v)=>['cityGate','solidCache','navEdges'].includes(k)?undefined:v)):null,nineLives:game?{lives:game.lives,losses:game.lifeLosses,grace:game.grace,reviveClock:game.reviveClock,offerCount:game.offerCount,reward:{...game.lifeReward},perks:{solo:!!game.player.soloContract,repair:!!game.player.quietRepair,shield:!!game.player.clockShield,revenant:!!game.player.revenantTail,secondWind:!!game.player.secondWind,squadCare:!!game.player.squadCare,lastLaugh:!!game.player.lastLaugh}}:null,major:{campaign:game?{...game.campaign}:null,nightDuration:MAJOR.NIGHT_SECONDS,roster:{normal:MAJOR.catalog.normal.length,boss:MAJOR.catalog.bosses.length,elite:MAJOR.catalog.elites.length,superElite:MAJOR.catalog.superElites.length},animationFrames:ART.frameTotal,songs:Object.keys(MAJOR.songs),rerollTokens:game?game.rerollTokens:0,rerollDrops:game?game.rerollDrops.length:0,enemyShots:game?game.enemyShots.length:0,victory:game?game.victory:false},world:{size:null,chunkSize:WORLD_SIZE,cacheLimit:64,wrap:false,wrapY:false,topology:'seeded-connected-city',...(game?JSON.parse(JSON.stringify(game.world)):{}),chunks:[...chunkCache.values()].map(c=>({index:c.index,biome:BIOMES[c.biome].id,solids:c.solids.map(s=>({...s}))})),solids:game?terrainNear(game.player.y).map(s=>({...s})):[]},progressionMilestones:game?[...game.progressionMilestones]:[],risingShadow:game?{...game.risingShadow}:null,endgame:game?{...game.endgame}:null,cityEvents:game?JSON.parse(JSON.stringify(game.cityEvents)):null,director:game?{...game.director,maxEnemies:liveCap(),minSpawnDelay:.16,maxSpawnDelay:1.5,normalArrivals:game.normalArrivals||[]}:null,viewport:{width:W,height:H,pixels:[canvas.width,canvas.height]},squadTactic:game?game.squadTactic:'default',squadTacticDuration:game?game.squadTacticDuration:0,squadTacticCooldown:game?game.squadTacticCooldown:0,nightCycle:game?{...game.nightCycle}:{waveCount:1},build: BUILD,patch:PATCH_ID,threatUnlocks:{...UNLOCKS},availableThreats:game?availableThreats(game.t):[],
      catSpeech:game?JSON.parse(JSON.stringify(game.catSpeech)):null,catSpeechVisuals:CATS.presentation(),formationPlan:game?{...game.formationPlan}:null,
      company:game?COMPANY.diagnostics(game):null,
      wildcard:game?{phase:game.wildcard.phase,stamps:game.wildcard.stamps||0,
        result:game.wildcard.result||null,nextPulse:game.wildcard.nextPulse,
        pulseNight:game.wildcard.pulseNight,pulses:game.wildcard.pulses}:null,
      companions:{behaviorVersion:4,states:game?game.companionSquad.map(c=>({role:c.type,state:c.state,phase:c.phase,ammo:c.ammo,protection:c.protection,stats:c.followerStats,uptime:c.followerStats?c.followerStats.usefulSeconds/Math.max(.001,Object.values(c.followerStats.stateSeconds).reduce((a,b)=>a+b,0)):0})):[],limit:MAX_COMPANIONS,roles:[...roleNames],active:game?game.companionSquad.map(c=>c.type):[],ranks:game?{...game.companionRanks}:{},uniqueCount:roleNames.length},
      survivalTimer:game?game.survivalTimer:0,escapeOverdriveTimer:game?game.escapeOverdriveTimer:0,feralInstinctOverdrive:game?game.feralInstinctOverdrive:0,
      runicRelic:game?{...game.runicRelic,items:game.runicRelic.items.map(i=>({...i}))}:null,offered:game?[...(game.offered||[])]:[],lastNotice:game&&game.lastNotice?{...game.lastNotice}:null, mode: game ? game.mode : 'ready',
      time: game ? game.t : 0,
      equipment:game?{...game.equipment}:null,buildEffects:game?{...game.buildEffects}:null,exploration:game?{...game.exploration,nextPower:game.nextPower,rules:{...EXPLORATION}}:null,
      encore:game?{...game.encore,wave:game.encore.wave?{...game.encore.wave}:null,radius:ENCORE_RADIUS,windowDuration:ENCORE_WINDOW,cooldownDuration:ENCORE_COOLDOWN}:null,
      run:game?game.run:completedRuns+1,runScale:game?game.runScale:1,
      difficulty:game?difficulty():1,bossEncounters:game?game.bossEncounters:0,
      escapeArmed:!!(game&&game.escapeArmed),
      upgradeAvailability:game?Object.fromEntries(upgradeIds.map(k=>[k,upgradeAvailable(k)])):{},
      score:game?scoreSnapshot().total:0,
      scoring:game?scoreSnapshot():null,
      kills:game?game.kills:0,fish:game?game.fish:0,xp:game?game.xp:0,wave:game?game.wave:1,
      escape:game?game.escape:0,escapeCooldown:game?game.escapeCooldown:0,edgeWarning:!!(game&&game.edgeWarning),
      presentation:{artVersion:ART.assetVersion,aimFrame:game?ART.aimFrame(game.player.aim):0,artStatus:ART.overrideStatus(),followerAnimations:game?game.companionSquad.map(p=>({role:p.type,phase:p.phase,state:p.actionArt,time:p.animationTime,committed:p.committed})):[],reducedMotion,poseHz:12,animation:game?{...game.player.animation}:null,particles:game?game.particles.length:0,visualPass:VIS.pass,hazardPass:HAZ.pass,worldScrollY:WORLD_SCROLL_Y,wavePulse:game?game.wavePulse:0,bossFlash:game?game.bossFlash:0,magnetSweepCount:game?game.magnetSweepCount:0,magnetSweepFish:game?game.magnetSweepFish:0,firestorm:!!(game&&game.campaign.night===100)},
      lab:game?{enabled:true,source:STRESS_MODE?'night99-stress-test':'full-campaign',economy:game.labEconomy?.snapshot(),wave:game.labWave,
        pending:game.labQueue?.length||0,finalSpawned:game.labFinalSpawned,finalTotal:game.labFinalTotal,finalIntervalSeconds:LAB.FINAL_INTERVAL_SECONDS,effectiveIntervalSeconds:LAB.FINAL_INTERVAL_SECONDS/(game.qaSpawnScale||1),qaSpawnScale:game.qaSpawnScale||1,arrivals:(game.finalArrivals||[]).map(a=>({...a})),finalSlainCounts:Object.fromEntries(['boss','elite','superElite'].map(k=>[k,(game.finalArrivals||[]).filter(a=>a.kind===k&&a.slainAt!=null).length])),slainIds:[...(game.finalDefeated||[])],
        finalBossId:game.labFinalBossId,finalDefeated:game.finalDefeated?.length||0,defeatedBoss:game.defeatedBoss||null}:null,
      music:{volume,voices:audioVoices.size,scheduledAhead:audio?Math.max(0,musicNext-audio.currentTime):0,arrangement:{...arrangement},mode:musicMode,enabled:!muted,active:!!(audio&&audio.state==='running'&&musicBus&&!muted&&!document.hidden&&game&&game.mode==='running'),beat:musicBeat,...scoreCounts,pass:AUDIO_PASS_ID,boss:!!(game&&game.enemies.some(e=>e.variant==='boss'))},
      pendingUpgrade:!!(game&&game.pendingUpgrade),
      fishItems:game?game.fishItems.map(f=>({...f})):[],
      powerups:game?game.powerups.map(f=>({...f})):[],buffs:game?{...game.buffs}:{},
      bossMilestone:game?game.bossMilestone:0,
      beacons:[],beaconCharges:0,offerSeed:game?game.offerSeed:null,offerState:game?game.offerState:null,companionSquad:game?JSON.parse(JSON.stringify(game.companionSquad)):[],squadStats:game?{...game.squadStats}:{},
      activeCompanion:game&&game.companionSquad[0]?JSON.parse(JSON.stringify(game.companionSquad[0])):null,
      companionRanks:game?{...game.companionRanks}:{},feralInstinct:game?{...game.feralInstinct}:null,
      effectiveBuffs:game?{...game.effectiveBuffs}:{},
      petCompanion:game&&game.companionSquad[0]?JSON.parse(JSON.stringify(game.companionSquad[0])):null,
      toxicGasClouds:game?game.hazards.toxicGasClouds.map(c=>({...c,radius:gasRadius(c)})):[],
      gasSpawnTimer:game?game.hazards.spawnTimer:0,
      pickupEffects:game?game.pickupEffects.map(f=>({...f})):[],
      upgrades:game?game.upgrades.map(u=>({...u})):[],
      enemies:game?game.enemies.map(e=>({id:e.id,family:e.family||null,mutantState:e.mState||null,traits:e.traits?{...e.traits}:null,traitAge:e.traitAge||0,terrain:ignoresTerrain(e)?'bypass':'solid',contact:canEnemyContact(e),cocoon:!!e.cocoon,incubation:e.incubation||0,mutant:!!e.mutant,parentIds:e.parentIds?[...e.parentIds]:[],rewardValue:e.rewardValue||0,x:e.x,y:e.y,r:e.r,hp:e.hp,variant:e.variant,name:e.name||'',majorId:e.majorId||null,bossKind:e.bossKind||null,eliteKind:e.eliteKind||null,creditCategory:e.creditCategory||null,labCost:e.labCost||0,labRank:e.labRank||0,arrivalRemaining:Math.max(0,(e.arrivalUntil||0)-game.t),finalWave:!!e.finalWave,finalBoss:!!e.finalBoss,round:e.round||0,phase:e.phase,speed:e.speed,max:e.max,damage:e.damage,encoreSlow:e.encoreSlow||0,elite:!!e.elite,huntAge:e.huntAge||0,encounterId:e.encounterId||null,threat:enemyThreat(e),mutation:e.mutation||null,mutationTime:e.mutationTime||0,mutationAge:e.mutationAge||0})):[],
      shots:game?game.shots.map(s=>({x:s.x,y:s.y,life:s.life,kind:s.kind,bounces:s.bounces,damage:s.damage,critical:!!s.critical,hitDamage:s.calculateDamage?s.calculateDamage():s.damage})):[],
      input: pointer?{vx:pointer.vx,vy:pointer.vy}:null,
      player: game ? {x: game.player.x, y: game.player.y,r:game.player.r,inv:game.player.inv,survivalTimer:game.player.survivalTimer,survivalInstinctBuff:game.player.survivalInstinctBuff,hp:game.player.hp,maxHp:game.player.maxHp,
        autoFireDisabled:game.player.autoFireDisabled,silence:game.player.silence,phaseCooldown:game.player.phaseCooldown,petPicks:game.player.petPicks,
        xpRequired:xpRequired(game.player.level),xpGain:game.player.xpGain,level:game.player.level,damage:game.player.damage,speed:game.player.speed,
        shotInterval:game.player.shotInterval,multishot:game.player.multishot,ricochet:game.player.ricochet,magnet:game.player.magnet} : null})
  });
  if(new URLSearchParams(location.search).get('qa')==='nine-lives')window.CATA_12_QA=Object.freeze({
    lethal:()=>{if(game.mode==='running'&&!game.grace){game.player.hp=0;loseLife();}},
    tick:dt=>{if(game.mode==='reviving')reviveTick(dt);else tick(dt);},
    offer:()=>offerUpgrade(),choose:id=>{if(upgradeAvailable(id)){game.offered=[id];chooseUpgrade(id);}},
    reward:()=>{game.lifeReward.checked=true;game.lifeReward.won=true;return claimLifeReward();},
    seedProgress:()=>{game.fish=17;game.xp=2;summonCompanion('shooter');},
    pause, start
  });
  if(new URLSearchParams(location.search).get('qa')==='company')window.CATA_13_QA=Object.freeze({start,recruit:summonCompanion,meal:(role,value=1)=>{const c=game.companionSquad.find(c=>c.type===role);if(!c)return false;addFish(c.x,c.y,value);return COMPANY.eat(game,c,game.fishItems.at(-1));},work:(role,n=24)=>{const c=game.companionSquad.find(c=>c.type===role);if(c)COMPANY.earn(c,n);},tick,diagnostics:()=>COMPANY.diagnostics(game)});
  window.spawnRelic=spawnRelic;
  last=performance.now();requestAnimationFrame(frame);
  Promise.all([ART.ready,globalThis.CATA_HERO_ILLUSTRATED.ready]).then(()=>window.CATACLYSM_BOOT.ready(BUILD)).catch(error=>window.CATACLYSM_BOOT.fail('Character pack failed: '+error.message));
})();
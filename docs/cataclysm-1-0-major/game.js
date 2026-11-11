/* CATACLYSM: fully original mobile-first Canvas arcade by BoRHeZ Games. */
'use strict';
(function () {
  const BUILD = '1.0';
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), ctx = canvas.getContext('2d', {alpha:false});
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MIN_SHOT_INTERVAL = .04;
  const PATCH_ID = 'cataclysm-10-major-campaign-01';
  const MAJOR = globalThis.CATA_MAJOR, ART = globalThis.CATA_ART;
  if(!MAJOR||!ART)throw Error('Catastrophe major modules did not load');
  const AUDIO_PASS_ID = 'catastrophe-adaptive-02';
  const UNLOCKS = {shambler:0,weaver:40,dasher:50,orbiter:70,stalker:85,hexer:95,ghost:140,summoner:160,blight:190,gas:1200};
  const availableThreats = t => Object.keys(UNLOCKS).filter(k=>t>=UNLOCKS[k]);
  let W = 1280, H = 720;
  const TWO = Math.PI * 2;
  const cfg = {speed:235,enemySpeed:63,spawnInterval:1.65,shotInterval:.62,
    enemyHp:3,spawnRamping:.010,fishDropChance:.65,maxEnemies:95};
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
  const WORLD_SIZE = 4200;
  function wrapCoord(value) { return ((value % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE; }
  function wrappedDelta(from,to) { return wrapCoord(to-from+WORLD_SIZE/2)-WORLD_SIZE/2; }
  function verticalDelta(from,to){return to-from;}
  function dist(x,y,x2,y2) { return Math.hypot(wrappedDelta(x,x2),verticalDelta(y,y2)); }
  const rnd = (a,b)=>a+(b-a)*rand();

  const BIOMES = [
    {id:'neon-city',name:'NEON CITY',floor:'#17262b',speed:1,cover:'compact blocks'},
    {id:'canal-gardens',name:'CANAL GARDENS',floor:'#153d3a',speed:1.12,cover:'long horizontal islands'},
    {id:'ember-works',name:'EMBER WORKS',floor:'#432c2b',speed:.94,cover:'tall furnace cover'},
    {id:'crystal-yard',name:'CRYSTAL YARD',floor:'#302c49',speed:1.06,cover:'small scattered crystals'}
  ];
  let chunkCache=new Map();
  function initMap(){city=[];stars=[];chunkCache=new Map();}
  function chunkAt(index){
    if(chunkCache.has(index))return chunkCache.get(index);
    const epochs=game&&game.world?game.world.epochs:[];
    let biome=0;for(const e of epochs)if(index>=e.from)biome=e.biome;
    const solids=[];
    for(let row=0;row<6;row++)for(let col=0;col<6;col++){
      if(row===3&&col===3)continue;
      const n=(row*7+col*11+Math.abs(index)*5)%9, shift=((index%3+3)%3)*23;
      const kind=n===0||n===5?'car':n===2||n===7?'dumpster':'building';
      const w=kind==='car'?146:kind==='dumpster'?86:biome===1?340:biome===2?390:305+((col+row)%3)*50;
      const h=kind==='car'?76:kind==='dumpster'?79:biome===2?410:biome===3?240:300+((col*2+row)%3)*45;
      solids.push({x:210+col*670+shift,y:index*WORLD_SIZE+225+row*665,
        w,h,lit:(row+col)%2===0,kind,style:n%4});
    }
    const chunk={index,biome,solids};chunkCache.set(index,chunk);
    if(chunkCache.size>12){const far=[...chunkCache.keys()].sort((a,b)=>Math.abs(b-index)-Math.abs(a-index));chunkCache.delete(far[0]);}
    return chunk;
  }
  function terrainNear(y){const i=Math.floor(y/WORLD_SIZE);return [-1,0,1].flatMap(d=>chunkAt(i+d).solids);}
  function updateFoundation(dt){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,w=g.world;
    w.transition=Math.max(0,(w.transition||0)-dt);
    const epoch=Math.floor(g.t/180);
    if(epoch>w.epoch){w.transition=2.5;w.epoch=epoch;w.currentBiomeId=BIOMES[epoch%4].id;
      // Only assign unvisited terrain beyond the padded viewport: no solid appears on actors.
      const from=Math.max(w.epochs[w.epochs.length-1].from+1,w.frontier+1,Math.floor((p.y+H/2+400)/WORLD_SIZE)+1);
      w.epochs.push({from,biome:epoch%4});
      for(const index of chunkCache.keys())if(index>=from)chunkCache.delete(index);
      notify(BIOMES[epoch%4].name+' · '+BIOMES[epoch%4].cover,4,'biome-'+epoch);
      if(g.cityEvents.active)finishCityEncounter(false);
      p.inv=Math.max(p.inv,2);g.cityEvents.recoveryUntil=Math.max(g.cityEvents.recoveryUntil,g.t+5);
    }
    w.frontier=Math.max(w.frontier,Math.floor((p.y+H/2+320)/WORLD_SIZE));
    w.maxY=Math.max(w.maxY,p.y);w.cameraY=p.y-H/2;w.chunk=Math.floor(p.y/WORLD_SIZE);
    for(const level of [3,6,9])if(p.level>=level&&!g.progressionMilestones.includes(level)){
      g.progressionMilestones.push(level);
      if(level===3){p.ricochet++;notify('LEVEL 3 · COVER RICOCHET unlocked',4,'milestone-3');}
      if(level===6){g.cityEvents.relayUnlocked=true;p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);notify('LEVEL 6 · RALLY FIELDS + extra heart',4,'milestone-6');}
      if(level===9){p.speed+=30;notify('LEVEL 9 · SHADOW RISING · RUN DOWN ↓',5,'milestone-9');}
    }
    const sh=g.risingShadow;
    if(p.level>=9&&!sh.active){sh.active=true;sh.warning=8;sh.y=p.y-H/2-260;}
    if(sh.active&&!g.endgame.active){
      if(sh.warning>0)sh.warning=Math.max(0,sh.warning-dt);
      else {sh.y+=Math.min(p.speed*.45,85+Math.max(0,p.y-sh.y-H)*.08)*dt;
        if(p.y-p.r<sh.y&&p.inv<=0){damageTaken();p.hp=Math.max(0,p.hp-.75);p.inv=1.5;sh.hits++;g.shake=.5;burst(p.x,p.y,'#aa72ea',12);notify('SHADOW HIT · Escape DOWN ↓',2);if(p.hp<=0){end();return;}}
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
    return terrainNear(y).every(c=>!terrainContact(wrapCoord(x),y,r,c));
  }
  function nearestSafeSpace(x,y,r=24) {
    x=wrapCoord(x);
    if(isTerrainClear(x,y,r))return {x,y};
    for(let ring=12;ring<=WORLD_SIZE;ring+=12){
      const count=Math.max(8,Math.ceil(TWO*ring/18));
      for(let i=0;i<count;i++){
        const a=i*TWO/count,nx=wrapCoord(x+Math.cos(a)*ring),ny=(y+Math.sin(a)*ring);
        if(isTerrainClear(nx,ny,r))return {x:nx,y:ny};
      }
    }
    return {x:1200,y};
  }
  function settleTerrain(actor) {
    for(let pass=0;pass<4;pass++){
      let hit=false;
      for(const c of terrainNear(actor.y)){const push=terrainContact(actor.x,actor.y,actor.r,c);
        if(push){actor.x=wrapCoord(actor.x+push.x);actor.y=(actor.y+push.y);hit=true;}}
      if(!hit)return;
    }
    if(!isTerrainClear(actor.x,actor.y,actor.r))Object.assign(actor,nearestSafeSpace(actor.x,actor.y,actor.r));
  }
  function moveWithCollision(actor,dx,dy) {
    if(ignoresTerrain(actor)){actor.x=wrapCoord(actor.x+dx);actor.y+=dy;return;}
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
    for(const c of terrainNear(y)){
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
    const actors=[game.player,...game.enemies.filter(e=>e.hp>0&&!ignoresTerrain(e)&&!e.cocoon),...game.companionSquad];
    // Periodic spatial bins bound work at the mob cap, including opposite seams.
    const cells=24,cellSize=WORLD_SIZE/cells;
    for(let pass=0;pass<12;pass++){
      const bins=new Map();
      for(let i=0;i<actors.length;i++){
        const a=actors[i],key=Math.floor(a.x/cellSize)+','+Math.floor(a.y/cellSize);
        if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);
      }
      let overlap=false;
      for(let i=0;i<actors.length;i++){
        const a=actors[i],col=Math.floor(a.x/cellSize),row=Math.floor(a.y/cellSize);
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
          const list=bins.get(((col+ox+cells)%cells)+','+(row+oy));
          if(!list)continue;
          for(const j of list){if(j<=i)continue;const b=actors[j];
            let dx=wrappedDelta(a.x,b.x),dy=verticalDelta(a.y,b.y),r=a.r+b.r;
            if(Math.abs(dx)>=r||Math.abs(dy)>=r)continue;
            let d=Math.hypot(dx,dy);if(d>=r-.001)continue;
            overlap=true;if(d<.00001){dx=1;dy=0;d=1;}
            const nx=dx/d,ny=dy/d,amount=r-Math.hypot(wrappedDelta(a.x,b.x),verticalDelta(a.y,b.y))+.002;
            moveWithCollision(a,-nx*amount/2,-ny*amount/2);
            moveWithCollision(b,nx*amount/2,ny*amount/2);
            // Transfer the part blocked by a wall to the other actor.
            const remaining=r-dist(a.x,a.y,b.x,b.y);
            if(remaining>0){moveWithCollision(b,nx*remaining,ny*remaining);
              const rest=r-dist(a.x,a.y,b.x,b.y);if(rest>0)moveWithCollision(a,-nx*rest,-ny*rest);}
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
    if (!game || game.runRecorded || (game.t < 30 && game.mode !== 'dead')) return;
    game.runRecorded = true; completedRuns++;
    try { localStorage.setItem('cataclysm-runs', String(completedRuns)); } catch (err) { /* session only */ }
  }
  function difficulty() {
    return game.runScale * (1 + (game.wave - 1) * .065 + game.bossEncounters * .10);
  }
  const MAX_COMPANIONS = 4;
  const roleNames = ['shooter','healer','tank','brawler','sniper','engineer','trapper','bard'];
  const specialNames = {shooter:'Burst',healer:'Heal',tank:'Guard',brawler:'Claws',sniper:'Deadeye',engineer:'Turret',trapper:'Snare',bard:'Anthem'};
  const commonIds = ['damage','fire-rate','speed','xp-gain'];
  const squadIds = ['squad-damage','squad-rate','squad-count','squad-spread','squad-bounce'];
  const equipmentIds=['equip-lens','equip-coil','equip-capacitor'];
  const EXPLORATION=Object.freeze({first:150,intervalMin:120,intervalMax:180,chance:.18,cap:2,magnetDuration:60});
  const majorUpgradeIds=['armor','critical','shield-pulse','area-burst','focus','squad-range','tactical-momentum'];
  const upgradeIds = [...equipmentIds,...commonIds,'recover','multi-shot','ricochet','fish-magnet',...majorUpgradeIds,...roleNames.map(r=>'companion-'+r),...squadIds];
  function upgradeAvailable(type) {
    if(!game)return false;
    if(type.startsWith('companion-'))return roleNames.includes(type.slice(10))&&(game.companionSquad.some(c=>c.type===type.slice(10))||game.companionSquad.length<MAX_COMPANIONS);
    if(type==='squad-count')return game.companionSquad.length>0&&game.companionSquad.length<MAX_COMPANIONS;
    if(squadIds.includes(type))return game.companionSquad.length>0;
    if(type==='recover')return game.player.hp<game.player.maxHp;
    return upgradeIds.includes(type);
  }
  function offerRand(){game.offerState=(Math.imul(1664525,game.offerState)+1013904223)>>>0;return game.offerState/4294967296;}
  function upgradeText(id){
    const p=game.player,q=game.squadStats,n=v=>Number(v.toFixed(2));
    const rows={damage:['Damage',p.damage,p.damage+.25], 'fire-rate':['Shots/s',1/p.shotInterval,1/(p.shotInterval*.85)],speed:['Move speed',p.speed,p.speed+18/Math.sqrt(1+(p.speed-cfg.speed)/180)],'xp-gain':['XP multiplier',p.xpGain,p.xpGain+.2],
      'squad-damage':['Follower damage % of player',q.damage*100,(q.damage+.15)*100],'squad-rate':['Follower fire multiplier',q.rate,q.rate*1.2], 'squad-count':['Recruit random unique ally',game.companionSquad.length,game.companionSquad.length+1], 'squad-spread':['Follower spread rank',q.spread,q.spread+1], 'squad-bounce':['Follower bounce rank',q.bounce,q.bounce+1],
      'multi-shot':['Player spread rank',p.multishot,p.multishot+1],ricochet:['Player bounce rank',p.ricochet,p.ricochet+1],'fish-magnet':["Cat’s Catch range",135+p.magnet*65,200+p.magnet*65]};
    if(equipmentIds.includes(id)){const key=id.slice(6),rank=game.equipment[key];return ({lens:'Prism lens · piercing + marks; coil marks conduct damage',coil:'Frost coil · shots slow; lens hits conduct; traps mark',capacitor:'Rune capacitor · longer runes; coil kills recharge specials'})[key]+' · '+rank+' → '+(rank+1);}
    if(rows[id]){const [label,old,next]=rows[id];return label+' · '+n(old)+' → '+n(next);}
    if(id==='recover')return 'Patch up · +1 HP, +0.25 maximum HP';
    const majorUpgrades={
      armor:'Armored fur · reduce incoming damage by 10% (max 65%)',
      critical:'Precision claws · +7% critical shot chance',
      'shield-pulse':'Shield pulse · +0.5 maximum HP and a recovery window',
      'area-burst':'Shock burst · +1 Fishbone Encore damage radius rank',
      focus:'Hunter instinct · +11% player weapon damage',
      'squad-range':'Long-range squad · +10% companion damage and range',
      'tactical-momentum':'Momentum · +8% movement and fire rate'
    };
    if(majorUpgrades[id])return majorUpgrades[id];
    const role=id.slice(10),ally=game.companionSquad.find(c=>c.type===role);
    return role.toUpperCase()+' · '+(ally?'Train rank '+ally.rank+' → '+(ally.rank+1):'Recruit permanent follower');
  }

  function readBest() {
    try {
      const stored = Number(localStorage.getItem('cataclysm-best'));
      if (Number.isFinite(stored) && stored >= 0) personalBest = Math.max(personalBest, stored);
    } catch (err) { /* keep this session's best when storage is disabled */ }
  }
  function renderBest() {
    $('best').textContent = personalBest.toLocaleString();
  }
  readBest();
  function saveBest() {
    if (!game) return;
    const score = game.victory?MAJOR.VICTORY_SCORE:Math.floor(game.t*2 + game.kills*7 + game.fish*9);
    readBest();
    if (score > personalBest) {
      personalBest = score;
      try { localStorage.setItem('cataclysm-best',String(personalBest)); }
      catch (err) { /* the visible session best still survives restart */ }
    }
    renderBest();
  }
  // Original score: E natural minor, eight-bar pedal/chord phrase. All timing is audio time.
  const audioVoices = new Set(), sfxLast = Object.create(null);
  const scoreCounts = {drums:0,bass:0,lead:0,bossDrops:0};
  const arrangement={phase:'groove',biome:-1,event:null,transitions:0,drops:0};
  let masterBus=null, fxBus=null, noiseBuffer=null, gritCurve=null, musicMode='silent', scoreStep=0;
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
    if(audioVoices.size>=52||[...audioVoices].filter(v=>v.group===group).length>=(group==='music'?40:12))return;
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
      tail.connect(env);env.connect(group==='music'?musicBus:fxBus);
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
    if(kind==='shot'||kind==='volley'){crunch(.045,.065,1800);tone(kind==='shot'?220:330,.055,.035,'sawtooth',0,75);}
    else if(kind==='hit'||kind==='critical'){crunch(.06,.055,800);tone(kind==='critical'?780:170,.07,.035,'triangle',0,90);}
    else if(kind==='danger'){tone(240,.16,.05,'sawtooth',0,100);}
    else if(kind==='guard'){crunch(.12,.06,700);tone(120,.23,.07,'triangle');}
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
    const next=active?(game.enemies.some(e=>e.variant==='boss')?'boss':'survival'):'silent';
    if(!audio||!musicBus)return;
    const now=audio.currentTime;
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
    const boss=next==='boss',stepLen=60/(boss?142:174)/4;
    // E minor: E–C–G–D, each root lasts two bars; fixed original rhythmic motifs.
    while(musicNext<now+.12){
      const s=scoreStep%16,bar=Math.floor(scoreStep/16)%8,t=musicNext;
      const root=[82.4069,65.4064,97.9989,73.4162][(Math.floor(bar/2)+biome)%4];
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
    return Math.abs(y-p.y)>H/2+pad || (W+pad*2<WORLD_SIZE && Math.abs(wrappedDelta(p.x,x))>W/2+pad);
  }
  function safeSpawn(radius=600, margin=30) {
    // Vertical origins remain valid even when a wide viewport sees the whole cylinder.
    const p=game.player,pad=SPAWN_MARGIN+Math.max(30,margin),side=rand()<.5?-1:1;
    for(let i=0;i<12;i++){
      const spot=nearestSafeSpace(p.x+rnd(-W/2,W/2),p.y+side*(H/2+pad+80+i*48),Math.max(30,margin));
      if(outsideViewport(spot.x,spot.y,pad))return spot;
    }
    return nearestSafeSpace(1200,p.y+side*(H/2+pad+WORLD_SIZE),Math.max(30,margin));
  }
  function edgeAid(dt) {
    // Horizontal seams have no edges. Retain the crowd emergency shield.
    const g=game,p=g.player;
    g.edgeWarning=false;g.escapeCooldown=Math.max(0,g.escapeCooldown-dt);g.escape=Math.max(0,g.escape-dt);
    const crowded=g.enemies.filter(e=>dist(e.x,e.y,p.x,p.y)<145).length>=6;
    if(!crowded)g.escapeArmed=true;
    if(crowded&&g.escapeArmed&&g.escapeCooldown===0){
      g.escapeOrigin={x:p.x,y:p.y};g.escapeOverdriveTimer=4.5;g.escapeArmed=false;
      g.escape=2.5;g.escapeCooldown=10.5;p.inv=Math.max(p.inv,2.5);
      notify('EMERGENCY SHIELD · Break through the crowd',2.5);sound(740,.18);
    }
  }
  function notify(message,duration=1.5,id=message) {
    if(noticeTTL>0){if(noticeQueue.length<4&&!noticeQueue.some(n=>n.id===id))noticeQueue.push({message,duration,id});return;}
    if(game){game.lastNotice={id,message,time:game.t};}
    $('notice').textContent=message; $('notice').hidden=false; noticeTTL=duration;
  }
  function start() {
    stopVoices();musicMode='silent';scoreStep=0;
    arrangement.phase='groove';arrangement.biome=-1;arrangement.event=null;musicNext=0;musicBeat=0;
    recordRun();
    seeded=(Date.now()^0xD00DCA7)>>>0;
    initMap();
    const player={x:2100,y:2100,r:21,hp:3,maxHp:3,inv:0,speed:cfg.speed,armor:0,criticalBoost:0,focus:0,areaBurst:0,tacticalMomentum:0,
      animation:{state:'idle',clock:0,frame:0,attack:0,hit:0,moving:false},survivalTimer:0,survivalInstinctBuff:0,xpGain:1,autoFireDisabled:false,silence:0,phaseCooldown:0,petPicks:0,shots:0,aim:0,level:1,damage:1,multishot:0,ricochet:0,magnet:0,shotInterval:Math.max(MIN_SHOT_INTERVAL,cfg.shotInterval)};
    game={mode:'running',t:0,run:completedRuns+1,runScale:1+Math.log2(1+completedRuns)*.18,runRecorded:false,bossEncounters:0,player,enemies:[],shots:[],fishItems:[],particles:[],pickupEffects:[],spawnCount:0,
      squadTactic:'default',squadTacticDuration:0,squadTacticCooldown:0,nextTactic:0,nightCycle:{waveCount:1},companionSquad:[],squadStats:{damage:.5,rate:1,count:1,spread:0,bounce:0},offerSeed:(new URLSearchParams(location.search).has('seed')?Number(new URLSearchParams(location.search).get('seed')):crypto.getRandomValues(new Uint32Array(1))[0])>>>0,offerState:0,companionRanks:Object.fromEntries(roleNames.map(r=>[r,0])),
      feralInstinct:{active:false,timer:0,duration:6,armed:true},effectiveBuffs:{speed:1,damage:1,fire:1,magnet:0,healing:0,mitigation:0},
      hazards:{toxicGasClouds:[],spawnTimer:0},powerups:[],buffs:{rage:0,magnet:0,survivalInstinct:0},survivalTimer:0,lastDamage:-10,escapeOverdriveTimer:0,feralInstinctOverdrive:0,escapeOrigin:null,runicRelic:{held:null,active:null,duration:0,cooldown:0,nextSpawn:35,items:[]},nextPower:EXPLORATION.first,powerCount:0,bossMilestone:0,
      escape:0,escapeCooldown:0,escapeArmed:true,edgeWarning:false,kills:0,fish:0,xp:0,upgrades:[],pendingUpgrade:false,wave:1,spawn:0,shake:0,now:0};
    game.campaign=MAJOR.newLedger();game.rerollTokens=0;game.rerollDrops=[];game.enemyShots=[];game.majorEncounterSerial=0;
    game.majorFinalSpawned=false;game.victory=false;
    game.equipment={lens:0,coil:0,capacitor:0};game.buildEffects={conducted:0,recharged:0,slowed:0};game.exploration={attempts:0,spawned:0,lastSpawn:-150};
    game.encore={charge:0,window:0,cooldown:0,wave:null,activations:0,hits:0};
    game.director={budget:12,aliveThreat:0,nearby:0,kills:0,dps:0,pendingKills:0,pendingDamage:0,blocked:false,recovery:0,mutationCooldown:0,spawnDelay:1.65,spawns:0,suppressed:0,mutations:0,criticalShots:0,fusionCooldown:12,fusions:0,emerged:0,cocoonsDestroyed:0,serial:0,frameMs:16.7,framePressure:false};
    game.cityEvents={active:null,nextCrane:90,nextCity:120,cityIndex:0,serial:0,
      counts:{crane:0,street:0,elite:0},completed:{crane:0,street:0,elite:0},recoveryUntil:0,
      relayUnlocked:false,relay:null,playerHits:0,enemyHits:0,avoids:0,maxDebris:0};
    game.world={epoch:0,currentBiomeId:BIOMES[0].id,epochs:[{from:-Number.MAX_SAFE_INTEGER,biome:0}],frontier:1,maxY:2100,cameraY:2100-H/2,chunk:0};
    game.progressionMilestones=[];game.risingShadow={active:false,warning:0,y:0,hits:0};
    game.endgame={active:false,victories:0,spawned:0,cooldown:0,complete:false,reward:null};
    game.offerState=game.offerSeed;
    clearInput(); noticeTTL=0;noticeQueue=[];$('notice').hidden=true;$('upgrade-overlay').hidden=true;
    pointer=null; $('start-overlay').hidden=true; $('pause').hidden=false;
    $('pause').textContent='Ⅱ';$('stick').hidden=true;
    musicBeat=0;musicNext=audio?audio.currentTime:0;sound(700,.12);last=performance.now();startMajorNight(1);updateHud();
  }
  function end() {
    if(!game || game.mode==='dead')return;
    game.mode='dead';recordRun();saveBest();$('overlay-title').textContent='NINE LIVES. ZERO LEFT.';
    $('overlay-copy').textContent='You survived '+Math.floor(game.t)+' seconds, defeated '+
      game.kills+' zombies, and rescued '+game.fish+' fish. Ready for another run?';
    $('play').textContent='↻ PLAY AGAIN'; $('start-overlay').hidden=false;
    $('pause').hidden=true;$('stick').hidden=true;pointer=null;music();
  }
  function pause() {
    if(!game || game.mode==='dead'||game.mode==='upgrade')return;
    clearInput();
    if(game.mode==='running'){
      game.mode='paused';$('overlay-title').textContent='PAUSED';
      $('overlay-copy').textContent='Your cat is taking a well-deserved break. Resume to continue the same run.';
      $('play').textContent='▶ RESUME'; $('start-overlay').hidden=false;
      $('pause').textContent='▶';$('stick').hidden=true;pointer=null;
    }else{
      game.mode='running';$('start-overlay').hidden=true;$('pause').textContent='Ⅱ';
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
    const prior=(game.offered||[]).join('|'),offered=[];
    const weight=b=>commonIds.includes(b.dataset.upgrade)?5:['squad-damage','squad-rate','squad-count'].includes(b.dataset.upgrade)?3:majorUpgradeIds.includes(b.dataset.upgrade)?3:1;
    for(let i=0;i<4&&pool.length;i++){
      const eligible=i===0?pool.filter(b=>commonIds.includes(b.dataset.upgrade)):pool;
      const use=eligible.length?eligible:pool;
      let roll=offerRand()*use.reduce((n,b)=>n+weight(b),0),chosen=use[use.length-1];
      for(const b of use){roll-=weight(b);if(roll<0){chosen=b;break;}}
      offered.push(chosen);pool=pool.filter(b=>b!==chosen);
    }
    if(offered.map(x=>x.dataset.upgrade).join('|')===prior&&pool.length){
      offered[offered.length-1]=pool[Math.floor(offerRand()*pool.length)];
    }
    game.offered=offered.map(b=>b.dataset.upgrade);
    buttons.forEach(b=>{b.hidden=!offered.includes(b);b.disabled=false;b.textContent=upgradeText(b.dataset.upgrade);});
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
    $('upgrade-copy').textContent=(milestone?'+1 maximum heart. ':'')+'Choose one investment. Combat frozen.';
    const offered=rollMajorChoices();
    $('upgrade-overlay').hidden=false;$('pause').hidden=true;
    updateHud();music();playSfx('level');offered[0]?.focus({preventScroll:true});
  }

  function chooseUpgrade(type) {
    if(!game||game.mode!=='upgrade'||!game.pendingUpgrade||!upgradeAvailable(type)||!game.offered.includes(type))return;
    const p=game.player;
    if(type==='fire-rate')p.shotInterval*=.85;
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
    else if(type==='squad-count'){const roles=roleNames.filter(r=>!game.companionSquad.some(c=>c.type===r));summonCompanion(roles[Math.floor(offerRand()*roles.length)]);}
    else if(type==='squad-spread')game.squadStats.spread++;
    else if(type==='squad-bounce')game.squadStats.bounce++;
    else if(type==='multi-shot')p.multishot++;
    else if(type==='ricochet')p.ricochet++;
    else if(type==='fish-magnet')p.magnet++;
    else if(equipmentIds.includes(type))game.equipment[type.slice(6)]++;
    else return;
    game.upgrades.push({level:p.level,type});game.pendingUpgrade=false;
    $('upgrade-overlay').hidden=true;$('pause').hidden=false;
    clearInput();p.inv=Math.max(p.inv,1);game.mode='running';last=performance.now();notify('UPGRADE EQUIPPED');
    if(game.xp>=7+p.level*3){game.xp-=7+p.level*3;p.level++;offerUpgrade();}
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
  const threatWeights={shambler:1,weaver:1.4,dasher:2,orbiter:2.2,stalker:2.6,ghost:3,hexer:2.5,summoner:3,blight:2.8,boss:12};
  const liveCap=()=>Math.min(72,Math.max(1,Math.floor(cfg.maxEnemies)));
  const enemyThreat=e=>e.threatCost??(e.elite?6:(threatWeights[e.variant]||1)*(e.weight===2?1.5:1)+(e.mutation?1:0));
  const ThreatDirector=Object.freeze({getThreatBudget:()=>game?game.director.budget:12});
  function updateDirector(dt){
    if(!game||game.mode!=='running')return;
    const g=game,d=g.director,p=g.player,a=1-Math.exp(-dt/12);
    d.kills+=(d.pendingKills/Math.max(dt,.001)-d.kills)*a;
    d.dps+=(d.pendingDamage/Math.max(dt,.001)-d.dps)*a;
    d.pendingKills=0;d.pendingDamage=0;
    d.aliveThreat=cityThreat();d.eventThreat=d.aliveThreat;d.nearby=0;
    for(const e of g.enemies){d.aliveThreat+=enemyThreat(e);if(dist(e.x,e.y,p.x,p.y)<200)d.nearby++;}
    d.recovery=Math.max(0,d.recovery-dt);d.mutationCooldown=Math.max(0,d.mutationCooldown-dt);
    // Strong builds earn clearance, never retaliatory threat.
    const target=clamp(12+Math.min(22,g.t/60),12,38);
    // Slow upward response; health loss and nearby crowding open a recovery window.
    d.budget+=(target-d.budget)*(1-Math.exp(-dt/20));
    if(d.aliveThreat>=d.budget||d.nearby>=9||g.enemies.length>=liveCap())d.blocked=true;
    else if(d.aliveThreat<d.budget*.72&&d.nearby<5)d.blocked=false;
    d.spawnDelay=clamp(cfg.spawnInterval/(1+Math.min(1.5,g.t/240))*(d.recovery>0||p.hp<1.5?1.8:1)*(g.t%36>27?1.5:1),.75,2.8);
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
    const d=game.director;
    if(citySpawnBlocked()||game.mode!=='running'||game.enemies.length>=liveCap()||d.blocked||(d.recovery>0&&game.enemies.length>0)||d.framePressure)return null;
    const unlocked=availableThreats(game.t).filter(k=>k!=='gas');
    const variant=unlocked.includes(type)?type:unlocked[(game.spawnCount+1)%unlocked.length];
    const extra=(game.t>70&&rand()<.17&&variant==='shambler')?2:1;
    const traits=makeTraits(variant,game.spawnCount,game.t);
    const cost=(threatWeights[variant]||1)*(extra===2?1.5:1)+traitCost(traits);
    d.aliveThreat=cityThreat()+game.enemies.reduce((n,e)=>n+enemyThreat(e),0);
    if(d.aliveThreat+cost>d.budget){d.blocked=true;d.suppressed++;return null;}
    const scale=difficulty(),hp=(cfg.enemyHp+(extra-1)*3)*scale;
    const e={...safeSpawn(rnd(560,730)),variant,dash:0,r:variant==='weaver'?15:extra===2?25:18,
      hp,max:hp,damage:1+Math.floor((scale-1)/1.5),speed:cfg.enemySpeed*(.85+rand()*.5)*(1+Math.min(.45,game.t/400)),
      phase:rnd(0,TWO),weight:extra,hurt:0,mutation:null,mutationTime:0,applyMutation};
    installTraits(e,traits);e.id=++d.serial;e.threatCost=cost;
    const spec=MAJOR.catalog.normal.find(a=>a.id===variant);
    if(spec){e.role=spec.role;e.attackKind=spec.attack;e.attackCooldown=1.2+rand()*1.5;e.windup=0;
      e.hp*=spec.hp;e.max=e.hp;e.speed*=spec.speed;e.r=spec.role==='caster'?21:e.r;}

    if(game.t>=360&&d.mutationCooldown===0&&d.aliveThreat+cost+1<=d.budget&&
      game.enemies.filter(n=>n.mutation).length<2&&rand()<.18){
      const requested=mutationFlags&&mutationFlags.type;
      e.applyMutation(['burst','shield','weave'].includes(requested)?requested:['burst','shield','weave'][Math.floor(rand()*3)],8);
      e.threatCost++;d.mutationCooldown=6;d.mutations++;
    }
    game.enemies.push(e);game.spawnCount++;d.spawns++;d.aliveThreat+=enemyThreat(e);
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
    if(e.cocoon||e.consumed)return false;
    if(!e.traits)return true;
    if(e.traits.legs==='wings')return e.traitAge%6>=4.5&&e.traitAge%6<5.5;
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
    if(g.mode!=='running'||!a||!b||a===b||[a,b].some(e=>!g.enemies.includes(e)||e.consumed||e.cocoon||e.mutant||e.elite||e.variant==='boss'||!e.traits)||g.enemies.some(e=>e.cocoon))return null;
    if(dist(a.x,a.y,b.x,b.y)>110)return null;
    const cost=enemyThreat(a)+enemyThreat(b),traits=inheritTraits(a.traits,b.traits);
    const pos=nearestSafeSpace(a.x+wrappedDelta(a.x,b.x)/2,(a.y+b.y)/2,30);
    // Reserve exactly both parents' threat throughout incubation and emergence.
    const c={...pos,id:++g.director.serial,variant:'cocoon',cocoon:true,r:30,hp:Math.min(30,(a.max+b.max)*.65),
      speed:0,damage:0,phase:0,hurt:0,weight:a.weight+b.weight,rewardValue:(a.rewardValue||1)+(b.rewardValue||1),
      threatCost:cost,traits,traitAge:0,parentIds:[a.id,b.id],incubation:4,age:0,offspringHp:Math.min(90,a.max+b.max),offspringSpeed:Math.min(115,Math.max(a.speed,b.speed))};
    c.max=c.hp;
    a.consumed=b.consumed=true;g.enemies=g.enemies.filter(e=>e!==a&&e!==b);g.enemies.push(c);
    g.director.fusions++;g.director.fusionCooldown=18;
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
    if(g.t<360||d.fusionCooldown>0||d.recovery>0||g.player.hp<1.5||g.cityEvents.active||g.enemies.some(e=>e.variant==='boss'))return;
    const pool=g.enemies.filter(e=>e.traits&&!e.cocoon&&!e.mutant&&!e.elite&&!e.consumed);
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
    shot.pierce=Math.min(4,game.equipment.lens);shot.mark=game.equipment.lens>0;
    shot.damage*=1+Math.max(0,game.equipment.lens-4)*.12;
    shot.critical=rand()<clamp(.06+(p.level-1)*.004+Math.max(0,p.damage-1)*.012+p.criticalBoost,.06,.75);
    shot.calculateDamage=Shot.calculateDamage;shot.isCriticalHit=Shot.isCriticalHit;
    if(shot.critical)game.director.criticalShots++;
    return shot;
  }
  function shotAtEnemy() {
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
      game.shots.push(prepareShot({x:p.x+dx*18,y:p.y+dy*18,vx:Math.cos(a)*600,vy:Math.sin(a)*600,
        life:Math.min(2,.85+p.ricochet*.25),r:6,damage:p.damage*game.effectiveBuffs.damage*((1+2*p.multishot)/(1+2*spread))*(1+Math.max(0,p.ricochet-8)*.12)*Math.max(1,MIN_SHOT_INTERVAL*game.effectiveBuffs.fire/p.shotInterval),bounces:Math.min(8,p.ricochet),hit:[],
        kind:p.multishot>0?'spread':'normal',trail:[],flash:0}));
    }
    p.animation.attack=.14;
    playSfx('shot');
  }
  // Content updates use simulation seconds, so pause and upgrades freeze every timer.
  // One visible representative per role; count investments multiply squad effectiveness.
  function summonCompanion(type='shooter') {
    if(!game||!roleNames.includes(type))return false;
    const p=game.player;
    let ally=game.companionSquad.find(c=>c.type===type);
    if(!ally&&game.companionSquad.length>=MAX_COMPANIONS)return false;
    if(ally)ally.rank++;
    else {ally={type,rank:1,...nearestSafeSpace(p.x+45,p.y,18),r:18,shotTimer:0,flash:0,specialAbilityReady:true,specialCooldown:0,specialDuration:0};game.companionSquad.push(ally);}
    game.companionRanks[type]=ally.rank;
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
      damage:damage*(1+Math.max(0,game.squadStats.bounce-8)*.12),bounces:Math.min(8,game.squadStats.bounce),pierce,mark:pet.type==='sniper',hit:[],kind:'pet',trail:[],flash:0});
  }
  function updateCompanions(dt) {
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,q=g.squadStats;
    for(const enemy of g.enemies){
      enemy.squadStun=Math.max(0,(enemy.squadStun||0)-dt);
      enemy.squadSlow=Math.max(0,(enemy.squadSlow||0)-dt);
      enemy.squadMark=Math.max(0,(enemy.squadMark||0)-dt);
    }
    for(const [index,pet] of g.companionSquad.entries()){
      const wasCooling=pet.specialCooldown>0;
      pet.specialCooldown=Math.max(0,pet.specialCooldown-dt);
      pet.specialDuration=Math.max(0,pet.specialDuration-dt);
      pet.specialAbilityReady=pet.specialCooldown===0;
      if(wasCooling&&pet.specialAbilityReady)notify(pet.type.toUpperCase()+' special ready',1.5);
      pet.flash=Math.max(0,pet.flash-dt);
      let nearest=null,best=pet.type==='sniper'?780:540;
      for(const e of g.enemies){const d=dist(pet.x,pet.y,e.x,e.y);if(e.hp>0&&d<best){best=d;nearest=e;}}
      const angle=nearest?Math.atan2(verticalDelta(pet.y,nearest.y),wrappedDelta(pet.x,nearest.x)):p.aim;
      const slot=-Math.PI*.75+index*Math.PI/2;
      let tx=wrapCoord(p.x+Math.cos(slot)*82),ty=(p.y+Math.sin(slot)*82);
      if(pet.type==='brawler'&&nearest&&best<220){tx=wrapCoord(nearest.x-Math.cos(angle)*42);ty=(nearest.y-Math.sin(angle)*42);}
      const safe=citySafeTarget(tx,ty,pet),route=navigationDelta(pet,safe.x,safe.y);
      const d=Math.max(1,Math.hypot(route.x,route.y)),step=Math.min(d,(p.speed+90)*dt);
      moveWithCollision(pet,route.x/d*step,route.y/d*step);
      const damage=p.damage*g.effectiveBuffs.damage*q.damage*(1+pet.rank*.1)*q.count;
      if(pet.turret){
        const t=pet.turret;t.life-=dt;t.timer-=dt;
        let target=null,range=520;
        for(const e of g.enemies){const r=dist(t.x,t.y,e.x,e.y);if(e.hp>0&&r<range){range=r;target=e;}}
        if(t.timer<=0&&target){squadShot(pet,target,damage*.65,0,t);t.timer=.35;}
        if(t.life<=0)pet.turret=null;
      }
      pet.traps=(pet.traps||[]).filter(t=>{t.life-=dt;return t.life>0;});
      for(const t of pet.traps)for(const e of g.enemies)if(e.hp>0&&dist(t.x,t.y,e.x,e.y)<t.r){e.squadSlow=.35;if(g.equipment.coil)e.squadMark=2;}
      pet.shotTimer-=dt;
      if(pet.shotTimer>0)continue;
      const interval=({shooter:.8,healer:1.4,tank:1.4,brawler:.7,sniper:1.8,engineer:1.1,trapper:2.4,bard:1.2})[pet.type]/(q.rate*(1+pet.rank*.1));
      pet.shotTimer=Math.max(MIN_SHOT_INTERVAL,interval);
      const power=damage*Math.max(1,MIN_SHOT_INTERVAL/interval);
      if(pet.type==='trapper'){
        if(pet.traps.length>=3)pet.traps.shift();
        pet.traps.push({x:pet.x,y:pet.y,r:65,life:5});
      }
      if(!nearest)continue;
      if(pet.type==='brawler'){
        if(dist(pet.x,pet.y,nearest.x,nearest.y)<85){squadHit(nearest,power*2);nearest.squadStun=nearest.variant==='boss'?.1:.35;burst(pet.x,pet.y,'#ffb49b',5);}
      }else if(pet.type==='bard'){
        for(const e of [...g.enemies])if(e.hp>0&&dist(pet.x,pet.y,e.x,e.y)<210)squadHit(e,power*.6);
        burst(pet.x,pet.y,'#dfaaff',5);
      }else{
        const spread=pet.type==='sniper'?0:Math.min(3,q.spread);
        for(let i=-spread;i<=spread;i++)squadShot(pet,nearest,power*(pet.type==='sniper'?2.8:pet.type==='shooter'?1:.5)*(1+q.spread*2)/(1+spread*2),pet.type==='sniper'?2:0,pet,i*.18);
      }
      pet.flash=.15;
    }
  }
  // A shared cooldown per role prevents duplicate recruits from spamming abilities.
  function companionSpecialAbilityActivate(type){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,pet=g.companionSquad.find(c=>c.type===type);
    if(!pet||!pet.specialAbilityReady||pet.specialCooldown>0)return;
    if(type==='shooter'&&g.shots.length>144)return;
    pet.specialCooldown=type==='healer'?24:18;
    pet.specialAbilityReady=false;pet.flash=.4;placeRelay(pet.x,pet.y);
    if(type==='shooter'){
      for(let i=0;i<16;i++){
        const a=i*TWO/16;
        g.shots.push({x:pet.x,y:pet.y,vx:Math.cos(a)*620,vy:Math.sin(a)*620,
          life:1.1,r:7,damage:p.damage*g.effectiveBuffs.damage*(2+pet.rank*.25)*g.squadStats.damage*g.squadStats.count,
          bounces:Math.min(8,g.squadStats.bounce),hit:[],kind:'pet',trail:[],flash:0});
      }
    }else if(type==='healer'){
      // Allies have no HP pool; healing restores their shared protected player.
      p.hp=Math.min(p.maxHp,p.hp+1+Math.min(.5,pet.rank*.1));
      for(const ally of g.companionSquad){ally.flash=.5;burst(ally.x,ally.y,'#8affbd',6);}
    }else if(type==='tank')pet.specialDuration=6;
    else if(type==='engineer'){pet.specialDuration=8;pet.turret={x:pet.x,y:pet.y,life:8,timer:0};}
    else if(type==='trapper'){
      pet.traps=[-1,0,1].map(i=>({x:wrapCoord(pet.x+i*85),y:pet.y,r:95,life:8}));pet.specialDuration=8;
    }else if(type==='bard')pet.specialDuration=7;
    else if(type==='brawler'){
      for(const e of [...g.enemies])if(e.hp>0&&dist(pet.x,pet.y,e.x,e.y)<190){
        squadHit(e,p.damage*g.squadStats.damage*g.squadStats.count*(4+pet.rank*.3));e.squadStun=e.variant==='boss'?.5:2;
      }
    }else if(type==='sniper'){
      const target=g.enemies.filter(e=>e.hp>0).reduce((a,e)=>!a||dist(pet.x,pet.y,e.x,e.y)<dist(pet.x,pet.y,a.x,a.y)?e:a,null);
      squadShot(pet,target,p.damage*g.squadStats.damage*g.squadStats.count*(8+pet.rank),6);
    }
    burst(pet.x,pet.y,type==='tank'?'#94cfff':'#8affbd',12);
    notify(type.toUpperCase()+' · '+specialNames[type],2);
    playSfx(type==='shooter'?'volley':type==='healer'?'heal':'guard');
    updateSupport(0);updateHud();
  }
  for(const type of roleNames)$('ability-'+type).onclick=()=>companionSpecialAbilityActivate(type);
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
      if(ally.type==='healer')b.healing+=.10+.025*strength;
      if(ally.type==='tank')b.mitigation+=.2+.04*strength;
      if(ally.type==='shooter')b.fire+=.05;
      if(ally.type==='bard'){b.fire+=.08;b.damage*=ally.specialDuration>0?1.35:1.08;b.speed*=ally.specialDuration>0?1.12:1;}
    }
    b.fire=Math.min(1.7,b.fire);b.magnet=Math.min(180,b.magnet);b.healing=Math.min(.3,b.healing);b.mitigation=Math.min(.4,b.mitigation);
    if(g.companionSquad.length){
      if(g.squadTactic==='defensive')b.mitigation=Math.min(.6,b.mitigation+.2);
      if(g.squadTactic==='supportive'){b.healing=Math.min(.45,b.healing*1.5+.08);b.magnet+=60;}
    }
    if(g.companionSquad.some(c=>c.type==='tank'&&c.specialDuration>0))b.mitigation=Math.min(.8,b.mitigation+.45);
    b.fire*=adrenaline?1.2:1;
    g.effectiveBuffs=b;
    p.hp=Math.min(p.maxHp,p.hp+b.healing*dt);
  }
  function damageTaken(){game.player.animation.hit=.35;game.player.animation.state='hit';game.director.recovery=5;game.lastDamage=game.t;game.survivalTimer=0;game.buffs.survivalInstinct=0;game.player.survivalTimer=0;game.player.survivalInstinctBuff=0;}
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
    if(!r.held){const i=r.items.findIndex(item=>dist(item.x,item.y,p.x,p.y)<45);if(i>=0){r.held=r.items.splice(i,1)[0].type;notify('RUNIC RELIC · Tap to activate',3,'relic-pickup');sound(460,.12,'triangle',.025);}}
  }
  function updateGhosts(dt) {
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player;
    p.silence=Math.max(0,p.silence-dt);p.phaseCooldown=Math.max(0,p.phaseCooldown-dt);
    if(p.phaseCooldown===0&&g.enemies.some(e=>e.variant==='ghost'&&dist(e.x,e.y,p.x,p.y)<220)){
      p.silence=2;p.phaseCooldown=8;notify('GHOST PHASE · Fire silenced 2s',2);sound(260,.18,'sine',.02);
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
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,h=g.hazards;
    if(g.t<UNLOCKS.gas)return;
    h.spawnTimer-=dt;
    if(h.spawnTimer<=0){
      const cloud=gasSpawn();
      if(cloud){h.toxicGasClouds.push(cloud);notify('TOXIC GAS · Clear the green ring',2.5);sound(340,.3,'triangle',.025);}
      h.spawnTimer=cloud?30:1;
    }
    let exposed=false;
    for(let i=h.toxicGasClouds.length-1;i>=0;i--){
      const c=h.toxicGasClouds[i];c.age+=dt;
      if(c.age>=7){h.toxicGasClouds.splice(i,1);continue;}
      if(c.age>=1&&dist(c.x,c.y,p.x,p.y)<gasRadius(c)+p.r)exposed=true;
    }
    // One exposure clock prevents overlapping clouds multiplying damage.
    h.exposure=exposed?(h.exposure||0)+dt:0;
    if(h.exposure>=1){h.exposure-=1;
      if(p.inv===0&&!(g.runicRelic.active==='shield'&&g.runicRelic.duration>0)){damageTaken();p.hp=Math.max(0,p.hp-(1-g.effectiveBuffs.mitigation));p.inv=.35;g.shake=.3;
        burst(p.x,p.y,'#b6ee75',10);notify('TOXIC GAS · Move out!');sound(170,.1);
        if(p.hp<=0){updateHud();end();}}
    }
  }
  let cosmeticState=0x9e3779b9;
  function cosmeticRand() { cosmeticState=(Math.imul(cosmeticState,1664525)+1013904223)>>>0;return cosmeticState/4294967296; }
  function burst(x,y,col,n=10) {
    if(reducedMotion||game.particles.length>=500)return;
    const count=Math.min(n,500-game.particles.length);
    for(let i=0;i<count;i++){const a=cosmeticRand()*TWO,s=50+cosmeticRand()*155;
      game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
        life:.18+cosmeticRand()*.37,ttl:.55,col,r:2+cosmeticRand()*3});
    }
  }
  function dropPower(x,y,kind) {
    // Exploration supplies always originate offscreen, including boss boost rewards.
    // Earned fish and labelled encounter caches remain visible at the legitimate source.
    if(!game||game.mode!=='running'||game.t-game.exploration.lastSpawn<EXPLORATION.intervalMin||game.powerups.filter(p=>p.kind!=='relay').length>=EXPLORATION.cap)return false;
    game.exploration.lastSpawn=game.t;game.exploration.spawned++;
    game.powerups.push({...safeSpawn(600,24),kind,expires:game.t+120});return true;
  }
  // The 100-night encounter director owns its event ledger; never infer credit from a despawn.
  function spawnMajorEncounter(kind,night,finalWave=false){
    const g=game,roster=kind==='boss'?MAJOR.catalog.bosses:kind==='elite'?MAJOR.catalog.elites:MAJOR.catalog.superElites;
    const event=MAJOR.getNight(Math.min(100,night));
    const index=kind==='boss'?event.bossIndex>=0?event.bossIndex:8:
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
  function startMajorNight(n){
    const g=game,entry=MAJOR.getNight(n),key='night-'+n;
    if(g.campaign.events.includes(key))return;
    g.campaign.events.push(key);g.campaign.night=n;
    if(entry.boss)spawnMajorEncounter('boss',n);
    if(entry.elite)spawnMajorEncounter(entry.eliteCategory,n);
    if(entry.final){
      g.majorFinalSpawned=true;
      spawnMajorEncounter('elite',100,true);
      spawnMajorEncounter('superElite',100,true);
      notify('NIGHT 100 · THE CATASTROPHE · FINAL CLEAR',5,'finale');
    }else if(n%3===1)notify('NIGHT '+n+' / 100 · THE CITY NEVER SLEEPS',1.4,'night-'+n);
  }
  function finalizeMajorVictory(){
    const g=game;
    if(!g||g.victory||g.mode!=='running'||!g.majorFinalSpawned)return;
    if(g.enemies.some(e=>e.finalWave&&!e.consumed&&e.hp>0))return;
    g.campaign.finaleCleared=true;
    if(!MAJOR.won(g.campaign,g.player.hp>0))return;
    g.victory=true;g.mode='won';g.campaign.won=true;
    clearInput();stopVoices('music');stopVoices('fx');
    try{const last=Number(localStorage.getItem('cataclysm-best')||0);
      localStorage.setItem('cataclysm-best',String(Math.max(last,MAJOR.VICTORY_SCORE)));
      localStorage.setItem('cataclysm-major-win',JSON.stringify({score:MAJOR.VICTORY_SCORE,night:100,credited:g.campaign.credited.length}));
    }catch(e){}
    $('overlay-title').textContent='THE CATASTROPHE · DEFEATED';
    $('overlay-copy').textContent='NIGHT 100 CLEAR! '+g.campaign.boss+' BOSSES · '+g.campaign.elite+' ELITES · '+g.campaign.superElite+
      ' SUPER-ELITES · 999,999,999 POINTS. THE CITY BELONGS TO THE SURVIVORS.';
    $('play').textContent='↻ NEW RUN';$('start-overlay').hidden=false;
    $('pause').hidden=true;$('stick').hidden=true;updateHud();
    playSfx('victory');
  }
  function fireMajorAttack(e,target){
    const g=game,kind=e.attackKind||'single',d=Math.max(1,dist(e.x,e.y,target.x,target.y));
    if(g.enemyShots.length>90)return;
    const theta=Math.atan2(verticalDelta(e.y,target.y),wrappedDelta(e.x,target.x));
    const patterns={single:[0],hex:[0],pierce:[0],charge:[-.15,0,.15],cleave:[-.45,-.2,0,.2,.45],
      spiral:[-.75,-.4,0,.4,.75],summon:[-.35,0,.35],plague:[-.3,0,.3],
      shockwave:[-1.5,-1,-.5,0,.5,1,1.5],chain:[-.4,-.2,0,.2,.4],
      nova:[-2.4,-1.8,-1.2,-.6,0,.6,1.2,1.8,2.4]} ;
    if(kind==='summon'&&g.enemies.length<liveCap()-3){
      for(let i=0;i<2;i++)spawnEnemy('shambler');
    }
    for(const a of patterns[kind]||[0]){
      if(g.enemyShots.length>=90)break;
      const angle=theta+a,speed=kind==='pierce'?405:kind==='shockwave'||kind==='nova'?265:310;
      g.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        life:kind==='plague'?2.5:2.1,r:kind==='shockwave'?12:kind==='nova'?10:8,kind,damage:e.damage*.58,trail:[]});
    }
    burst(e.x,e.y,kind==='plague'?'#bbee83':'#eeabd1',8);
    playSfx(kind==='plague'?'enemy-cast':'enemy-shot');
  }
  function updateMajorEnemyAttack(e,dt,target,d){
    const role=e.role || (MAJOR.catalog.normal.find(n=>n.id===e.variant)||{}).role;
    if(role!=='ranged'&&role!=='caster'&&!e.creditCategory)return;
    e.attackCooldown=(e.attackCooldown??(2+rand()))-dt;
    if(e.windup>0){
      e.windup-=dt;
      if(e.windup<=0){fireMajorAttack(e,target);e.windup=0;}
    }else if(e.attackCooldown<=0&&d<(role==='caster'?500:e.creditCategory?630:460)&&d>50){
      e.windup=role==='caster'?.75:e.creditCategory?1:.45;
      e.attackTarget={x:target.x,y:target.y};
      e.attackCooldown=e.creditCategory?4.2:role==='caster'?3.6:2.6;
      if(e.creditCategory)playSfx('boss-warn');
    }
  }
  function updateEnemyProjectiles(dt){
    const g=game,p=g.player;
    for(let i=g.enemyShots.length-1;i>=0;i--){
      const s=g.enemyShots[i];s.life-=dt;
      s.x=wrapCoord(s.x+s.vx*dt);s.y+=s.vy*dt;
      if(s.life<=0||!isTerrainClear(s.x,s.y,s.r)){g.enemyShots.splice(i,1);continue;}
      if(p.inv===0&&dist(s.x,s.y,p.x,p.y)<p.r+s.r){
        if(g.runicRelic.active!=='shield'){
          damageTaken();p.hp=Math.max(0,p.hp-s.damage*(1-g.effectiveBuffs.mitigation)*(1-Math.min(.65,p.armor)));
          p.inv=1.25;burst(p.x,p.y,'#ff8c9f',12);playSfx('danger');
        }
        g.enemyShots.splice(i,1);
        if(p.hp<=0){updateHud();end();return;}
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
    if(game.fishItems.length>=180){
      const f=game.fishItems.reduce((a,b)=>dist(a.x,a.y,x,y)<dist(b.x,b.y,x,y)?a:b);
      f.value+=value;return;
    }
    game.fishItems.push({...nearestSafeSpace(x,y,12),r:12,value,phase:inkHash(x,y)*TWO,attracted:false});
  }
  // Fishbone Encore: earned pickup rhythm, never a replacement for dodging.
  const ENCORE_RADIUS=230,ENCORE_WINDOW=8,ENCORE_COOLDOWN=10;
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
    const r=reducedMotion?ENCORE_RADIUS:ENCORE_RADIUS*Math.min(1,(3-w.life)/.5);
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
      if(p.hp<=0){updateHud();end();}
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
    if(e.consumed)return;
    e.consumed=true;
    if(e.cocoon){g.director.cocoonsDestroyed++;notify('COCOON BROKEN · Evolution stopped',2);}
    if(g.equipment.capacitor&&g.equipment.coil&&e.squadSlow>0){const refund=.3*g.equipment.capacitor;g.runicRelic.cooldown=Math.max(0,g.runicRelic.cooldown-refund);for(const ally of g.companionSquad)ally.specialCooldown=Math.max(0,ally.specialCooldown-refund);g.buildEffects.recharged++;}
    g.director.pendingKills++;g.kills+=e.weight;burst(e.x,e.y,'#93eaac',14);
    if(e.finalBoss){
      g.endgame.victories++;g.endgame.cooldown=8;g.director.recovery=Math.max(g.director.recovery,8);pardonShadow();
      game.player.hp=game.player.maxHp;game.player.inv=4;
      notify('CROWN '+g.endgame.victories+'/9 CLAIMED · Recovery 8s',4);
      if(g.endgame.victories===9){g.endgame.complete=true;g.endgame.reward='Ninefold Dawn';g.fish+=999;g.enemies.splice(i,1);end();
        $('overlay-title').textContent='NINEFOLD DAWN · VICTORY';$('overlay-copy').textContent='All nine Catastrophe crowns claimed. Reward: 999 fish and the Ninefold Dawn title. The city is free.';return;}
    }else if(e.variant==='boss'){
      addFish(e.x,e.y,12);g.player.hp=Math.min(g.player.maxHp,g.player.hp+1);g.director.recovery=Math.max(g.director.recovery,6);pardonShadow();
      notify('ALLEY KING DEFEATED · +20 KILLS',3);
    }else if(e.rewardValue)addFish(e.x,e.y,e.rewardValue);else if(rand()<cfg.fishDropChance)addFish(e.x,e.y);
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
    const distant=g.enemies.filter(e=>dist(e.x,e.y,p.x,p.y)>300).sort((a,b)=>dist(b.x,b.y,p.x,p.y)-dist(a.x,a.y,p.x,p.y));
    for(const e of distant){if(threat+cost<=g.director.budget)break;threat-=enemyThreat(e);g.enemies.splice(g.enemies.indexOf(e),1);}
    if(threat+cost>g.director.budget||g.enemies.length>=liveCap())return false;
    const {x,y}=nearestSafeSpace(p.x+80,p.y,60);
    m.active={kind,id:++m.serial,age:0,x,y,duration:kind==='elite'?21:11,warning:3,
      zones:kind==='street'?[-1,1].map(side=>({...nearestSafeSpace(x+side*100,y+side*55,52),r:52})):[],
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
      g.powerups.push({...nearestSafeSpace(g.player.x+65,g.player.y,24),kind:'relay',expires:g.t+45});
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
  function updateCityEncounter(dt){
    if(!game||game.mode!=='running')return;
    const g=game,m=g.cityEvents;
    if(m.active&&(g.enemies.some(e=>e.variant==='boss')||g.endgame.active||(g.risingShadow.active&&g.risingShadow.warning===0&&g.player.y-g.risingShadow.y<H*.65))){finishCityEncounter(false);return;}
    if(m.relay){m.relay.life-=dt;if(m.relay.life<=0)m.relay=null;}
    if(!m.active){
      if(g.t>=90&&(g.player.level>=3||g.t>=180)&&g.t>=m.recoveryUntil){
        const kind=m.nextCrane<=m.nextCity?'crane':m.cityIndex%2?'elite':'street';
        if(g.t>=Math.min(m.nextCrane,m.nextCity))spawnCityEncounter(kind);
      }
      return;
    }
    const e=m.active;e.age+=dt;
    if(e.kind==='elite'&&e.age>=e.warning&&!e.eliteSpawned){
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
      if(pulse>e.pulses){e.pulses=pulse;for(const z of e.zones){cityDamage(z.x,z.y,z.r,.45);if(g.mode!=='running')return;}}
    }
    if(e.age>=e.duration)finishCityEncounter(e.kind!=='elite');
  }
  function updateCityNotice(){
    const m=game.cityEvents,e=m.active,node=$('city-notice');node.hidden=!e;
    if(!e)return;
    const label={crane:'CRANE · Dodge orange targets',street:'LIVE STREET · Use the open gap',elite:'ELITE HUNT · Sidestep, then strike'}[e.kind];
    const text=(e.age<e.warning?'WARNING · ':'')+label+' · '+Math.ceil((e.age<e.warning?e.warning:e.duration)-e.age)+'s';
    // Update the live region once per displayed second, not every animation frame.
    if(node.textContent!==text)node.textContent=text;
  }
  function renderCityEncounter(){
    const m=game.cityEvents,e=m.active;
    if(m.relay){circle(m.relay.x,m.relay.y,m.relay.r,'#87ffdc22');outline(m.relay.x,m.relay.y,m.relay.r,'#87ffdc',3);}
    if(!e)return;
    ctx.save();ctx.textAlign='center';ctx.font='bold 15px system-ui';
    if(e.kind==='elite'&&e.age<3){outline(e.x,e.y,48,'#f1c3ff',4);ctx.fillStyle='#f1c3ff';ctx.fillText('HUNT IN '+Math.ceil(3-e.age),e.x,e.y-55);}
    if(e.kind==='street')for(const z of e.zones){
      circle(z.x,z.y,z.r,e.age<3?'#dca5ff18':'#dca5ff55');outline(z.x,z.y,z.r,'#dca5ff',3);
      ctx.fillStyle='#f1d2ff';ctx.fillText(e.age<3?'⚡ IN '+Math.ceil(3-e.age):'⚡ LIVE',z.x,z.y+5);
    }
    if(e.kind==='crane'){
      if(e.age<3){outline(e.x,e.y,140,'#ffbd78',3);ctx.fillStyle='#ffbd78';ctx.fillText('CRANE · MOVE OUT',e.x,e.y-100);}
      for(const d of e.debris){
        circle(d.x,d.y,d.r,d.hit?'#ff884466':'#ffbd7822');outline(d.x,d.y,d.r,'#ffbd78',3);
        if(!d.hit){ctx.fillStyle='#ffba75';ctx.fillText('×',d.x,d.y+6);}
        drawCraneCargo(d);
        if(d.hit){ctx.fillStyle='#ffd09a';ctx.fillText('IMPACT',d.x,d.y+d.r+16);}
      }
    }
    ctx.restore();
  }

  function tick(dt) {
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player;
    g.squadTacticDuration=Math.max(0,g.squadTacticDuration-dt);
    g.squadTacticCooldown=Math.max(0,g.squadTacticCooldown-dt);
    if(!g.squadTacticDuration)g.squadTactic='default';
    updateEncore(dt);
    g.t+=dt;g.shake=Math.max(0,g.shake-dt*5);
    const nextNight=MAJOR.nightAt(g.t),previousNight=g.campaign.night;
    g.wave=nextNight;g.nightCycle.waveCount=nextNight;
    if(nextNight>previousNight)for(let n=previousNight+1;n<=nextNight;n++)startMajorNight(n);
    if(g.t>1325&&!g.victory){$('overlay-title').textContent='THE CITY ENDURES';end();return;}
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
    if(g.spawn<=0){
      spawnEnemy();g.spawn=g.director.spawnDelay;
    }
    if(g.buffs.survivalInstinct===0){
      g.survivalTimer+=dt;
      if(g.survivalTimer>=10){g.survivalTimer=0;g.buffs.survivalInstinct=8;notify('ADRENALINE SURGE · 8s',2,'adrenaline');sound(1200,.18,'sine');}
    }
    p.survivalTimer=g.survivalTimer;p.survivalInstinctBuff=g.buffs.survivalInstinct;
    updateRelics(dt);
    edgeAid(dt);
    updateSupport(dt);
    updateGas(dt);if(g.mode!=='running')return;
    updateGhosts(dt);updateCompanions(dt);
    autoActivateMajorAbilities();
    const beforeX=p.x,beforeY=p.y;
    const input=moveInput(),speed=(cfg.speed+300*Math.log1p((p.speed-cfg.speed)/300))*g.effectiveBuffs.speed;
    const biomeSpeed=BIOMES[g.world.epoch%4].speed;
    moveWithCollision(p,input.x*speed*biomeSpeed*dt,(input.y*speed*biomeSpeed+18)*dt);
    g.world.cameraY=p.y-H/2;g.world.chunk=Math.floor(p.y/WORLD_SIZE);g.world.maxY=Math.max(g.world.maxY,p.y);
    p.shots-=dt;if(p.shots<=0){shotAtEnemy();p.shots=Math.max(MIN_SHOT_INTERVAL,p.shotInterval/g.effectiveBuffs.fire);}
    const anim=p.animation;
    anim.clock+=dt;anim.attack=Math.max(0,anim.attack-dt);anim.hit=Math.max(0,anim.hit-dt);
    if(g.shots.some(s=>s.kind==='normal'&&dist(s.x,s.y,p.x,p.y)<65))anim.attack=.14;
    anim.moving=Math.hypot(wrappedDelta(beforeX,p.x),p.y-beforeY-18*dt)>.1;
    anim.state=anim.hit>0?'hit':anim.attack>0?'attack':anim.moving?'run':'idle';
    anim.frame=Math.floor(anim.clock*12)%12;
    for(const enemy of g.enemies){
      if(enemy.cocoon)continue;
      const guard=g.companionSquad.find(c=>c.type==='tank'&&c.specialDuration>0&&dist(c.x,c.y,enemy.x,enemy.y)<260);
      const target=guard||p;
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
      // Extra speed is countered dynamically, including enemies already alive.
      // Far pursuers close the gap; nearby dashes remain telegraphed and dodgeable.
      const adaptation=Math.min(120,Math.max(0,p.speed-cfg.speed)*.25);
      const slow=(g.runicRelic.active==='slow'&&dist(enemy.x,enemy.y,p.x,p.y)<260)||relayProtects(enemy.x,enemy.y)?.45:1;
      const encoreSlow=enemy.encoreSlow>0?(enemy.variant==='boss'?.85:.45):1;
      const chase=(enemy.squadStun>0?0:enemy.squadSlow>0?.4:1)*Math.min(slow,encoreSlow)*(d>330?Math.max(enemy.speed+adaptation,Math.min(420,p.speed*1.08)):enemy.speed+adaptation);
      moveWithCollision(enemy,vx*chase*pace*dt,vy*chase*pace*dt);
      enemy.phase+=dt*3;enemy.hurt=Math.max(0,enemy.hurt-dt);
      updateMajorEnemyAttack(enemy,dt,target,d);
      if(canEnemyContact(enemy)&&g.mode==='running'&&!g.pendingUpgrade&&dist(p.x,p.y,enemy.x,enemy.y)<p.r+enemy.r+.5&&p.inv===0&&!(g.runicRelic.active==='shield'&&g.runicRelic.duration>0)){
        damageTaken();p.hp=Math.max(0,p.hp-enemy.damage*(1-g.effectiveBuffs.mitigation));p.inv=1.3;g.shake=.6;burst(p.x,p.y,'#fb7995',14);
        playSfx('danger');if(p.hp<=0){updateHud();end();return;}notify('OUCH! ♥ -'+(enemy.damage*(1-g.effectiveBuffs.mitigation)).toFixed(1));
      }
    }
    resolveActorCollisions();
    updateEnemyProjectiles(dt);if(g.mode!=='running')return;
    for(let i=g.shots.length-1;i>=0;i--){
      const s=g.shots[i];
      s.trail.push({x:s.x,y:s.y});if(s.trail.length>(reducedMotion?1:6))s.trail.shift();
      s.flash=Math.max(0,s.flash-dt);s.life-=dt;
      if(!moveProjectile(s,dt)){g.shots.splice(i,1);continue;}
      if(s.life<=0){g.shots.splice(i,1);continue;}
      const idx=g.enemies.findIndex(e=>!s.hit.includes(e)&&dist(e.x,e.y,s.x,s.y)<e.r+s.r);
      if(idx>=0){
        const e=g.enemies[idx],raw=s.calculateDamage?s.calculateDamage():s.damage;
        const hitDamage=raw*(e.squadSlow>0&&g.equipment.lens&&g.equipment.coil?1+.25*Math.sqrt(g.equipment.lens*g.equipment.coil):1)*(e.squadMark>0?1.2:1)*(e.elite&&e.huntAge%5<1.5?.35:e.mutation==='shield'&&e.mutationAge>=1?.5:1);
        g.director.pendingDamage+=Math.min(e.hp,hitDamage);e.hp-=hitDamage;e.hurt=.12;
        burst(s.x,s.y,s.critical?'#fff09a':'#a5f8ff',s.critical?7:4);playSfx(s.critical?'critical':'hit');
        if(g.equipment.coil){e.squadSlow=Math.max(e.squadSlow||0,1+Math.log1p(g.equipment.coil));g.buildEffects.slowed++;if(g.equipment.lens)g.buildEffects.conducted++;}
        s.hit.push(e);if(s.mark)e.squadMark=4;
        if(s.pierce>0){s.pierce--;}else if(s.bounces>0){
          s.bounces--;s.kind='bounce';s.flash=.16;burst(s.x,s.y,'#ffd568',9);
          const next=g.enemies.filter(n=>!s.hit.includes(n)).sort((a,b)=>dist(a.x,a.y,s.x,s.y)-dist(b.x,b.y,s.x,s.y))[0];
          if(next){const a=Math.atan2(verticalDelta(s.y,next.y),wrappedDelta(s.x,next.x));s.vx=Math.cos(a)*600;s.vy=Math.sin(a)*600;s.life=Math.max(.5,s.life);}
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
      const d=dist(f.x,f.y,p.x,p.y);
      if(d<135+p.magnet*65+(p.speed-cfg.speed)*2/3+g.effectiveBuffs.magnet||g.buffs.magnet>0)f.attracted=true;
      if(f.attracted){const route=navigationDelta(f,p.x,p.y),length=Math.max(1,Math.hypot(route.x,route.y)),step=Math.min(length,(p.speed+240)*dt);
        moveWithCollision(f,route.x/length*step,route.y/length*step);}
      if(d<28){
        g.fish+=f.value;g.xp+=f.value*p.xpGain;g.fishItems.splice(i,1);burst(f.x,f.y,'#f5cf75',7);
        g.pickupEffects.push({x:f.x,y:f.y,life:.9,value:f.value});
        if(g.pickupEffects.length>24)g.pickupEffects.shift();
        playSfx('fish');collectEncore(f.value);
        if(g.xp>=7+p.level*3){
          g.xp-=7+p.level*3;p.level++;offerUpgrade();return;
        }
      }
    }
    for(let i=g.powerups.length-1;i>=0;i--){
      const item=g.powerups[i];
      if(item.expires&&g.t>item.expires){g.powerups.splice(i,1);continue;}
      if(dist(item.x,item.y,p.x,p.y)<p.r+23){
        if(item.kind==='relay'){g.cityEvents.relayUnlocked=true;for(const pet of g.companionSquad)pet.specialCooldown=Math.max(0,pet.specialCooldown-4);}
        else if(item.kind==='heal')p.hp=Math.min(p.maxHp,p.hp+1);
        else g.buffs[item.kind]=item.kind==='magnet'?EXPLORATION.magnetDuration:12;
        g.powerups.splice(i,1);burst(item.x,item.y,'#c2a4ff',12);playSfx(item.kind==='heal'?'heal':'power');
        notify(item.kind==='relay'?'RALLY RELAY · Specials / runes leave a safe slowing field':item.kind==='heal'?'HEART · +1 HP':item.kind==='rage'?'RAGE · DOUBLE DAMAGE 12s':'MAGNET · ALL FISH 60s',2);
      }
    }
    // A merged fish cache can earn several levels; resolve one choice at a time.
    if(g.xp>=7+p.level*3){g.xp-=7+p.level*3;p.level++;offerUpgrade();return;}
    finalizeMajorVictory();if(g.mode!=='running')return;
    for(let i=g.pickupEffects.length-1;i>=0;i--){g.pickupEffects[i].life-=dt;if(g.pickupEffects[i].life<=0)g.pickupEffects.splice(i,1);}
    for(let i=g.particles.length-1;i>=0;i--){
      const s=g.particles[i];s.x=wrapCoord(s.x+s.vx*dt);s.y=(s.y+s.vy*dt);s.vx*=.96;s.vy*=.96;s.life-=dt;
      if(s.life<=0)g.particles.splice(i,1);
    }
    if(noticeTTL>0){noticeTTL-=dt;if(noticeTTL<=0){$('notice').hidden=true;if(noticeQueue.length){const n=noticeQueue.shift();notify(n.message,n.duration,n.id);}}}
    updateHud();
  }
  function updateHud(){
    if(!game)return;
    updateCityNotice();
    $('time').textContent=String(Math.floor(game.t/60)).padStart(2,'0')+':'+
      String(Math.floor(game.t%60)).padStart(2,'0');
    $('score').textContent=Math.floor(game.t*2+game.kills*7+game.fish*9);
    $('build-stats').textContent='Speed '+Math.round(game.player.speed)+' · Damage '+game.player.damage.toFixed(2)+
      ' · XP ×'+game.player.xpGain.toFixed(1)+' · Shots/s '+(1/game.player.shotInterval).toFixed(2)+' · Spread '+(1+game.player.multishot*2)+
      ' · Bounces '+game.player.ricochet+' · Pickup '+Math.round(135+game.player.magnet*65+(game.player.speed-cfg.speed)*2/3)+'px'+' · Lens '+game.equipment.lens+' / Coil '+game.equipment.coil+' / Rune '+game.equipment.capacitor;
    $('fish').textContent=game.fish;$('kills').textContent=game.kills;
    const encore=game.encore;
    const encoreText=encore.cooldown>0?'ENCORE '+Math.ceil(encore.cooldown)+'s':encore.charge?'FISH · '+encore.charge+'/3 · '+Math.ceil(encore.window)+'s':'FISH · 0/3';
    $('encore-label').textContent=encoreText;
    $('encore-meter').value=encore.cooldown>0?1-encore.cooldown/ENCORE_COOLDOWN:encore.charge/3;
    $('encore-meter').setAttribute('aria-label',encore.cooldown>0?'Fishbone Encore rearming: '+Math.ceil(encore.cooldown)+' seconds': 'Fishbone Encore: '+encore.charge+' of 3 fish in eight seconds');
    const p=game.player;
    const relic=game.runicRelic,button=$('runic-relic-activate');
    button.hidden=!relic.held&&!relic.active&&relic.cooldown===0;
    button.disabled=game.mode!=='running'||!relic.held||relic.cooldown>0;
    button.textContent=relic.active?'Rune '+relic.active+' · '+Math.ceil(relic.duration)+'s':relic.held?'Activate '+relic.held+(relic.cooldown>0?' · '+Math.ceil(relic.cooldown)+'s':''):'Rune cooldown · '+Math.ceil(relic.cooldown)+'s';
    button.setAttribute('aria-label',button.textContent);
    for(const type of roleNames){
      const ally=game.companionSquad.find(c=>c.type===type),btn=$('ability-'+type);
      btn.hidden=!ally;
      if(!ally)continue;
      btn.disabled=game.mode!=='running'||!ally.specialAbilityReady||(type==='shooter'&&game.shots.length>144);
      const name=specialNames[type];
      btn.textContent=name+(ally.specialDuration>0?' active '+Math.ceil(ally.specialDuration)+'s':ally.specialCooldown>0?' '+Math.ceil(ally.specialCooldown)+'s':' ready');
      btn.setAttribute('aria-label',type+' special: '+btn.textContent);
      btn.style.setProperty('--ready',((1-ally.specialCooldown/(type==='healer'?24:18))*100)+'%');
    }
    $('support-status').textContent='SQUAD '+game.companionSquad.length+'/'+MAX_COMPANIONS+' · '+(game.companionSquad.map(c=>c.type.slice(0,3).toUpperCase()+' R'+c.rank).join(' · ')||'—')+' · ×'+game.squadStats.count;
    $('xp-level').textContent=game.xp.toFixed(0)+' / '+(7+p.level*3)+' · L'+p.level;
    $('night-status').textContent=BIOMES[game.world.epoch%4].name+' · '+(game.endgame.active?'CROWNS '+game.endgame.victories+'/9':game.risingShadow.active?'↓ SHADOW '+(game.risingShadow.warning>0?Math.ceil(game.risingShadow.warning)+'s':Math.max(0,Math.floor(p.y-game.risingShadow.y))+'m'):'DOWN ↓');
    const boss=game.enemies.find(e=>e.variant==='boss');$('boss-status').hidden=!boss;
    if(boss){$('boss-status').setAttribute('aria-label',boss.finalBoss?'Catastrophe crown '+boss.round+'/9':'Alley King');$('boss-health').value=boss.hp/boss.max;$('boss-health').setAttribute('aria-label','Alley King '+Math.ceil(boss.hp)+' / '+Math.ceil(boss.max)+' HP');}
    $('buff-status').textContent=[game.buffs.survivalInstinct>0?'SURVIVAL '+Math.ceil(game.buffs.survivalInstinct)+'s':'',game.feralInstinct.active?'FERAL '+Math.ceil(game.feralInstinct.timer)+'s':'',game.buffs.rage>0?'RAGE '+Math.ceil(game.buffs.rage)+'s':'',game.feralInstinctOverdrive>0?'OVERDRIVE':'',game.cityEvents.relayUnlocked?'RELAY ◇':''].filter(Boolean).join(' · ');
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
    const left=Math.max(0,cx),top=Math.max(0,cy),right=Math.min(WORLD_SIZE,cx+W),bottom=Math.min(WORLD_SIZE,cy+H);
    if(right<=left||bottom<=top)return;
    ctx.fillStyle=BIOMES[renderBiome].floor;ctx.fillRect(left,top,right-left,bottom-top);
    // Flat paving, road paint and tiny rubble are explicitly decorative.
    for(let row=Math.max(0,Math.floor(top/300));row<Math.min(14,Math.ceil(bottom/300));row++)
      for(let col=Math.max(0,Math.floor(left/300));col<Math.min(14,Math.ceil(right/300));col++){
        const x=col*300,y=row*300;
        ctx.strokeStyle='#203339';ctx.lineWidth=1;ctx.strokeRect(x,y,300,300);
        ctx.fillStyle='#9d956255';ctx.fillRect(x+145,y+20,3,48);ctx.fillRect(x+20,y+145,48,3);
        for(let i=0;i<4;i++){const n=inkHash(col*17+i,row*11);
          ctx.fillStyle='#334648';ctx.fillRect(x+20+n*260,y+28+i*63,3,2);}
      }
    for(const c of city){
      if(c.x+c.w<cx-35||c.x>cx+W+35||c.y+c.h<cy-35||c.y>cy+H+35)continue;
      const n=inkHash(c.x,c.y);
      if(c.kind==='car'){
        ctx.fillStyle='#09111699';ctx.fillRect(c.x+8,c.y+8,c.w,c.h);
        inkBox(c.x+4,c.y+13,c.w-8,c.h-25,c.style%2?'#bd785d':'#648caa','#1a2831',3);
        inkBox(c.x+34,c.y+5,c.w-68,c.h-10,'#243c4c','#131e28',2);
        ctx.fillStyle='#a9deef';ctx.fillRect(c.x+40,c.y+10,22,c.h-19);
        ctx.fillRect(c.x+c.w-62,c.y+10,22,c.h-19);
        ctx.fillStyle='#fae1a3';ctx.fillRect(c.x+c.w-10,c.y+18,8,14);
        ctx.fillStyle='#f88f7a';ctx.fillRect(c.x+2,c.y+18,8,14);
        ctx.fillStyle='#172b32';ctx.fillRect(c.x+23,c.y+4,24,7);ctx.fillRect(c.x+c.w-49,c.y+c.h-11,24,7);
        continue;
      }
      if(c.kind==='dumpster'){
        ctx.fillStyle='#050e1599';ctx.fillRect(c.x+8,c.y+8,c.w,c.h);
        inkBox(c.x,c.y+8,c.w,c.h-12,'#48796d','#162f31',4);
        inkBox(c.x-7,c.y+2,c.w+14,16,'#77a998','#132d32',3);
        for(let i=12;i<c.w-5;i+=16){ctx.fillStyle='#244d48';ctx.fillRect(c.x+i,c.y+21,4,c.h-30);}
        for(const x of [12,c.w-12]){circle(c.x+x,c.y+c.h-2,8,'#152832');circle(c.x+x,c.y+c.h-2,3,'#b8b89b');}
        continue;
      }
      ctx.fillStyle='#060f16aa';ctx.fillRect(c.x+13,c.y+17,c.w,c.h);
      ctx.fillStyle=c.lit?'#33474a':'#293a42';ctx.fillRect(c.x,c.y,c.w,c.h);
      ctx.fillStyle='#111f29';ctx.fillRect(c.x+5,c.y+5,c.w-10,c.h-16);
      ctx.strokeStyle='#526160';ctx.lineWidth=2;ctx.strokeRect(c.x,c.y,c.w,c.h);
      ctx.fillStyle='#435558';ctx.fillRect(c.x,c.y+c.h-11,c.w,11);
      for(let yy=18;yy<c.h-22;yy+=29)for(let xx=14;xx<c.w-16;xx+=28){
        const lit=inkHash(c.x+xx,c.y+yy)>.68;
        ctx.fillStyle=lit?'#b99159':'#263f49';ctx.fillRect(c.x+xx,c.y+yy,11,14);
        ctx.fillStyle=lit?'#f1c782':'#3a535b';ctx.fillRect(c.x+xx,c.y+yy,4,12);
        ctx.fillStyle='#0c1a23';ctx.fillRect(c.x+xx-2,c.y+yy+14,15,3);
      }
      ctx.fillStyle='#34494d';ctx.fillRect(c.x+12,c.y+7,24,7);
      ctx.fillStyle='#0a171f';ctx.fillRect(c.x+c.w-31,c.y+c.h-29,17,24);
      if(n>.5){ctx.fillStyle='#70c4b3';ctx.fillRect(c.x+c.w-36,c.y+c.h-36,27,5);}
      // One bounded pool of lamplight per facade, under all actors.
      const lx=c.x+c.w+9,ly=c.y+c.h;
      const light=ctx.createRadialGradient(lx,ly,1,lx,ly,44);light.addColorStop(0,'#f3bb6430');light.addColorStop(1,'#f3bb6400');ctx.fillStyle=light;ctx.fillRect(lx-44,ly-44,88,88);
      ctx.fillStyle='#0b141a';ctx.fillRect(lx-2,ly-19,4,22);circle(lx,ly-19,3,'#ffe0a1');
    }
  }
  // Effects Pass 2: stateless illustrations. Never allocate simulation particles or use rand().
  function inkBox(x,y,w,h,fill,edge='#091822',line=3){
    ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle=edge;ctx.lineWidth=line;ctx.strokeRect(x,y,w,h);
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
    if(g.buffs.rage<=0)return;
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
  function drawCompanionEffect(pet){
    ctx.save();ctx.translate(pet.x,pet.y);
    if(pet.type==='tank'&&pet.specialDuration>0){
      polygon(0,0,[[-29,-24],[29,-24],[32,10],[19,33],[0,41],[-19,33],[-32,10]],'#89cfff18');
      ctx.strokeStyle='#94cfff';ctx.lineWidth=3;ctx.stroke();
      for(let i=-1;i<=1;i++)inkBox(i*17-5,-29,10,5,'#c5eeff','#294d69',1);
    }
    const elapsed=(pet.type==='healer'?24:18)-pet.specialCooldown;
    if(elapsed>=0&&elapsed<.65&&pet.type!=='tank'){
      const f=elapsed/.65,color=pet.type==='healer'?'#8affbd':'#ffce86';ctx.globalAlpha=1-f;
      outline(0,0,reducedMotion?36:24+f*45,color,3);
      for(let i=0;i<8;i++){
        const a=i*TWO/8,r=reducedMotion?32:24+f*36,x=Math.cos(a)*r,y=Math.sin(a)*r;
        ctx.save();ctx.translate(x,y);
        if(pet.type==='healer'){ctx.fillStyle=color;ctx.fillRect(-2,-6,4,12);ctx.fillRect(-6,-2,12,4);}
        else{ctx.rotate(a);polygon(0,0,[[0,-3],[11,0],[0,3]],color);}ctx.restore();
      }
    }
    ctx.restore();
  }
  function catSprite(type,r,time,hurt=false,aim=0){
    const hero=type==='hero',ally=roleNames.includes(type);
    const palette={hero:'#f4f3df',shooter:'#e0bd82',healer:'#a5dfc5',tank:'#a6bad4',brawler:'#ed9c7d',sniper:'#b8d17f',engineer:'#efca70',trapper:'#87c9d1',bard:'#c5a0e5',shambler:'#789b7b',weaver:'#ad91c7',dasher:'#d8a267',orbiter:'#65b8bf',stalker:'#b9b17c',ghost:'#c9bfe5',gas:'#a5bd68',boss:'#c36b87'};
    const fur=hurt?'#fff4d7':palette[type]||palette.shambler;
    const a=hero&&game?game.player.animation:null,pose=reducedMotion?0:Math.floor(time*12)/12;
    const stride=a&&a.state==='run'?Math.sin(pose*16)*4:0;
    const breathe=reducedMotion?0:Math.sin(pose*3)*.6;
    const recoil=a&&a.state==='attack'&&!reducedMotion?2:0;
    ctx.save();ctx.scale(r/22,r/22);ctx.lineCap='round';
    ctx.translate(-recoil,breathe+(a&&a.state==='hit'&&!reducedMotion?Math.sin(pose*40)*2:0));
    if(hero&&a&&a.state==='hit')outline(0,0,29,'#ffb9a5',2);
    ctx.fillStyle='#030e17aa';ctx.beginPath();ctx.ellipse(0,20,25,8,0,0,TWO);ctx.fill();
    ctx.strokeStyle='#091822';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-13,14);ctx.quadraticCurveTo(-36,20,-29,-5+(reducedMotion?0:Math.sin(pose*4)*3));ctx.stroke();
    ctx.strokeStyle=fur;ctx.lineWidth=5;ctx.stroke();
    ctx.fillStyle=hero?'#487d77':ally?'#304d60':'#314b48';ctx.beginPath();ctx.ellipse(0,13,16,13,0,0,TWO);ctx.fill();
    circle(-10,23+stride,6,fur);circle(10,23-stride,6,fur);
    polygon(0,0,[[-21,1],[-21,-27],[-7,-19],[7,-19],[21,-27],[22,2],[16,14],[-16,14]],'#091822');
    polygon(0,0,[[-18,0],[-18,-21],[-7,-14],[7,-14],[18,-21],[19,1],[13,11],[-13,11]],fur);
    polygon(0,0,[[-16,-17],[-9,-12],[-15,-8]],'#c58388');polygon(0,0,[[16,-17],[9,-12],[15,-8]],'#c58388');
    if(type==='stalker'){polygon(0,0,[[-23,-5],[0,-28],[23,-5],[12,-11],[-12,-11]],'#343c35');}
    if(hero&&Math.floor(time*12)%60===0){ctx.save();ctx.scale(1,.65);}
    ctx.fillStyle=hero||ally?'#102d36':'#ffb38d';ctx.fillRect(-12,-3,7,4);ctx.fillRect(5,-3,7,4);
    if(hero||ally){circle(-8,-3,1,'#fff');circle(9,-3,1,'#fff');}
    if(hero&&Math.floor(time*12)%60===0)ctx.restore();
    polygon(0,0,[[-3,3],[3,3],[0,6]],'#a15d6e');ctx.strokeStyle='#334149';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-5,8);ctx.lineTo(0,9);ctx.lineTo(5,8);ctx.stroke();
    if(hero){ctx.fillStyle='#76e2c1';ctx.fillRect(-16,10,32,4);polygon(0,0,[[-12,13],[-22,25],[-12,23]],'#76e2c1');}
    if(type==='healer'){ctx.fillStyle='#f4efdb';ctx.fillRect(-17,-13,34,6);ctx.fillStyle='#a83f59';ctx.fillRect(-2,-16,4,12);ctx.fillRect(-6,-12,12,4);ctx.fillStyle='#ecedce';ctx.fillRect(10,13,13,12);ctx.fillStyle='#327b69';ctx.fillRect(15,15,3,8);ctx.fillRect(12,18,9,3);}
    if(type==='tank'){polygon(0,0,[[-23,7],[-9,9],[-8,24],[-17,31],[-25,22]],'#7f9eb5');ctx.strokeStyle='#d9e9ec';ctx.lineWidth=2;ctx.strokeRect(-21,12,9,9);ctx.fillStyle='#526d88';ctx.fillRect(-21,-15,42,7);}
    if(type==='shooter'){ctx.fillStyle='#463e37';ctx.fillRect(-19,-13,38,7);ctx.fillStyle='#efbb6b';ctx.fillRect(-12,11,4,12);}
    if(type==='brawler'){for(const side of [-1,1]){inkBox(side*20-6,9,12,10,'#b85948');for(let i=0;i<3;i++)inkBox(side*20-5+i*4,18,2,10,'#fff2d5','#091822',1);}}
    if(type==='sniper'){inkBox(-20,-12,40,6,'#476647');circle(9,-8,6,'#a9efc4');inkBox(13,12,31,5,'#a6ba9b');inkBox(23,6,10,5,'#374f49');}
    if(type==='engineer'){inkBox(-22,-18,44,9,'#d3a34d');inkBox(-9,-24,18,9,'#efcd77');inkBox(13,9,9,23,'#778e9c');circle(17,9,7,'#c6d5cb');circle(17,8,3,'#30444b');}
    if(type==='trapper'){inkBox(-20,-14,40,5,'#3e757c');outline(18,18,11,'#b9e7df',3);inkBox(-24,10,12,14,'#588993');}
    if(type==='bard'){polygon(0,0,[[-22,-13],[0,-30],[22,-13]],'#765090');circle(19,18,10,'#e8bd78');inkBox(11,-2,5,26,'#b58960');ctx.fillStyle='#fff0ba';ctx.font='bold 17px system-ui';ctx.fillText('♪',-27,18);}
    if(hero||type==='shooter'){
      ctx.save();ctx.translate(13,13);ctx.rotate(aim);ctx.fillStyle='#0a1821';ctx.fillRect(0,-5,24,10);ctx.fillStyle='#8baba9';ctx.fillRect(4,-5,15,4);ctx.fillStyle='#e7d3a0';ctx.fillRect(20,-3,5,6);ctx.restore();
    }
    if(type==='dasher'){polygon(0,0,[[-21,4],[-34,13],[-21,12]],'#e0b66e');polygon(0,0,[[21,4],[32,13],[21,12]],'#e0b66e');}
    if(type==='weaver'){ctx.strokeStyle='#dac4e5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-16,13);ctx.lineTo(-25,22);ctx.lineTo(-16,21);ctx.lineTo(-24,30);ctx.stroke();}
    if(type==='orbiter'){outline(0,6,28,'#5fbbc3',2);circle(27,0,4,'#d3ffff');}
    if(type==='gas'){circle(-10,6,7,'#33462e');circle(10,6,7,'#33462e');ctx.fillStyle='#d6e790';ctx.fillRect(-4,2,8,11);}
    if(type==='ghost'){polygon(0,0,[[-17,12],[-22,30],[-10,24],[0,32],[10,24],[22,30],[17,12]],'#c9bfe5');}
    if(type==='boss'){polygon(0,0,[[-18,-17],[-23,-34],[-9,-26],[0,-39],[9,-26],[23,-34],[18,-17]],'#ebbf6d');circle(0,-25,3,'#e96e8b');ctx.fillStyle='#702e4b';ctx.fillRect(-17,12,34,6);}
    ctx.restore();
  }
  function renderWorld(){
    const source=game,p=source.player;
    const viewX=p.x-W/2,viewY=p.y-H/2;
    const shakeX=reducedMotion?0:Math.sin(source.t*71)*source.shake*5;
    const shakeY=reducedMotion?0:Math.cos(source.t*83)*source.shake*5;
    ctx.fillStyle='#0e1d2b';ctx.fillRect(0,0,W,H);
    const tiles=[];
    for(let ty=Math.floor((viewY-320)/WORLD_SIZE);ty<=Math.floor((viewY+H+320)/WORLD_SIZE);ty++)
      for(let tx=Math.floor((viewX-320)/WORLD_SIZE);tx<=Math.floor((viewX+W+320)/WORLD_SIZE);tx++)
        tiles.push({x:tx*WORLD_SIZE,y:ty*WORLD_SIZE});
    for(const tile of tiles){
      ctx.save();ctx.translate(tile.x-viewX+shakeX,tile.y-viewY+shakeY);
      const chunk=chunkAt(tile.y/WORLD_SIZE);renderBiome=chunk.biome;
      city=chunk.solids.map(c=>({...c,y:c.y-tile.y}));
      streetScene(viewX-tile.x,viewY-tile.y);ctx.restore();
    }
    const actorTiles=tiles.filter(t=>t.y===tiles[0].y).map(t=>({x:t.x,y:0}));
    for(const tile of actorTiles){
      const cameraX=viewX-tile.x,cameraY=viewY-tile.y;
      const visible=(a,pad=80)=>a.x+pad>=cameraX&&a.x-pad<=cameraX+W&&a.y+pad>=cameraY&&a.y-pad<=cameraY+H;
      const g={...source,
        fishItems:source.fishItems.filter(a=>visible(a)),pickupEffects:source.pickupEffects.filter(a=>visible(a)),
        powerups:source.powerups.filter(a=>visible(a)),companionSquad:source.companionSquad.filter(a=>visible(a,280)),
        shots:source.shots.filter(a=>visible(a,80)),enemies:source.enemies.filter(a=>visible(a,280)),
        particles:source.particles.filter(a=>visible(a,20)),
        runicRelic:{...source.runicRelic,items:source.runicRelic.items.filter(a=>visible(a))},
        hazards:{toxicGasClouds:source.hazards.toxicGasClouds.filter(a=>visible(a,120))}};
      ctx.save();ctx.translate(-cameraX+shakeX,-cameraY+shakeY);
    const shadow=source.risingShadow;
    if(shadow.active){ctx.fillStyle='#291331cc';ctx.fillRect(cameraX,cameraY,W,Math.max(0,Math.min(H,shadow.y-cameraY)));
      ctx.strokeStyle=shadow.warning>0?'#ffc979':'#cb83ff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(cameraX,shadow.y);ctx.lineTo(cameraX+W,shadow.y);ctx.stroke();}
    renderCityEncounter();
    renderEncore();
    for(const rune of g.runicRelic.items){outline(rune.x,rune.y,24,'#94cfff',3);ctx.fillStyle='#d6eaff';ctx.font='bold 26px system-ui';ctx.fillText(rune.type==='shield'?'◇':'❄',rune.x-12,rune.y+9);}
    for(const f of g.fishItems){
      circle(f.x,f.y,18,'#dfc26b33');ctx.save();ctx.translate(f.x,f.y+(reducedMotion?0:Math.sin(f.phase)*4));
      polygon(9,0,[[0,0],[11,-8],[11,8]],'#f6cb62');
      ctx.fillStyle='#ffdc7b';ctx.beginPath();ctx.ellipse(0,0,12,7,0,0,TWO);ctx.fill();
      circle(-6,-1,1.6,'#523322');ctx.restore();
    }
    for(const f of g.pickupEffects){
      ctx.save();ctx.globalAlpha=f.life/.9;
      outline(f.x,f.y,reducedMotion?23:20+(1-f.life/.9)*30,'#ffdc7b',3);
      ctx.fillStyle='#ffdc7b';ctx.font='bold 18px system-ui';ctx.textAlign='center';
      ctx.fillText('+'+f.value+' FISH',f.x,f.y-(reducedMotion?26:26+(1-f.life/.9)*24));ctx.restore();
    }
    for(const item of g.powerups)drawSupply(item,g.t);
    for(const c of g.hazards.toxicGasClouds){
      const warning=c.age<1,r=warning?110:gasRadius(c);
      circle(c.x,c.y,r,'#91d75730');
      outline(c.x,c.y,r,'#b6ee75',warning?3:2);
      if(!reducedMotion&&!warning)outline(c.x,c.y,r*.75+Math.sin(c.age*5)*3,'#95d66b66',2);
      if(warning){ctx.fillStyle='#d4ffac';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText('GAS!',c.x,c.y);ctx.textAlign='left';}
    }
    for(const pet of g.companionSquad){
      for(const t of pet.traps||[]){circle(t.x,t.y,t.r,'#87c9d122');outline(t.x,t.y,t.r,'#87c9d1',2);outline(t.x,t.y,12,'#d7f5e5',3);}
      if(pet.turret){const t=pet.turret;inkBox(t.x-13,t.y-10,26,20,'#d1ae64');inkBox(t.x-4,t.y-23,8,22,'#aec9c5');}
      drawCompanionEffect(pet);
      ctx.save();ctx.translate(pet.x,pet.y);
      catSprite(pet.type,18,g.t, false,Math.atan2(verticalDelta(pet.y,p.y),wrappedDelta(pet.x,p.x)));
      if(pet.flash>0)outline(0,0,19,'#ffe7ab',3);
      ctx.fillStyle='#ffddaa';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(pet.type[0].toUpperCase()+' R'+pet.rank,0,30);ctx.textAlign='left';ctx.restore();
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
    for(const e of [...g.enemies.filter(e=>e.variant!=='ghost'),...g.enemies.filter(e=>e.variant==='ghost')]){
      if(e.x+e.r+230<cameraX||e.x-e.r-230>cameraX+W||e.y+e.r+230<cameraY||e.y-e.r-230>cameraY+H)continue;
      ctx.save();if(e.variant==='ghost')ctx.globalAlpha=.62;ctx.translate(e.x,e.y);ctx.rotate(reducedMotion?0:Math.sin(e.phase)*.08);
      circle(0,9,e.r*1.04,'#070d15a0');
      if(e.encoreSlow>0){outline(0,0,e.r+6,'#ffcf80',2);ctx.fillStyle='#fff0c6';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(e.variant==='boss'?'RESIST':'SLOWED',0,e.r+24);ctx.textAlign='left';}
      if(e.elite){outline(0,0,e.r+12,'#f1c3ff',4);ctx.fillStyle='#f1c3ff';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText(e.huntAge%5<1.5?'HUNT · SIDESTEP':'HUNT · STRIKE',0,-e.r-22);ctx.textAlign='left';
        if(e.huntAge%5<1.5){ctx.strokeStyle='#f1c3ff';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(e.huntX*210,e.huntY*210);ctx.stroke();}}

      const color=e.variant==='ghost'?'#c7adff':e.variant==='orbiter'?'#65d6ef':e.variant==='stalker'?'#ffdb76':e.variant==='boss'?'#e56d9f':e.variant==='weaver'?'#b294ed':e.variant==='dasher'?'#f6af62':'#6faa8f';
      if((e.variant==='dasher'&&e.phase%9<2)||(e.variant==='boss'&&e.phase%7<2))outline(0,0,e.r+8,'#ffe6a1',3);
      if(e.variant==='ghost')outline(0,0,e.r+9,'#c7adff',3);
      if(e.mutation){
        const color=e.mutation==='burst'?'#ffb45f':e.mutation==='shield'?'#84dbff':'#eea4ff';
        outline(0,0,e.r+12,color,e.mutationAge<1?4:2);
        ctx.fillStyle=color;ctx.font='bold 15px system-ui';ctx.textAlign='center';
        ctx.fillText(e.mutation==='burst'?(e.mutationAge<1?'RUSH!':'»'):e.mutation==='shield'?'◇':'≈',0,-e.r-18);ctx.textAlign='left';
      }
      drawAnatomy(e);
      if(!e.cocoon)catSprite(e.variant,e.r,e.phase,e.hurt);
      if(e.hurt){
        outline(0,0,e.r+5,'#fff5db',2);
        // Existing hurt lifetime provides finite contact sparks even when the shot is removed.
        for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*TWO/4+.4);
          polygon(e.r+3,0,[[0,-2],[9,0],[0,2]],'#ffd48a');ctx.restore();}
      }
      if(e.hp<e.max){ctx.fillStyle='#fa7e85';ctx.fillRect(-e.r,-e.r-14,e.r*2*(e.hp/e.max),4);}
      ctx.restore();
    }
    if(visible(p,300)){
    ctx.save();ctx.translate(p.x,p.y);
    if(p.autoFireDisabled){outline(0,0,39,'#c7adff',3);ctx.fillStyle='#e1d4ff';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText('FIRE SEALED',0,-49);ctx.textAlign='left';}
    if(g.buffs.survivalInstinct>0)outline(0,0,48+(reducedMotion?0:Math.sin(g.t*4)*2),'#ffe79c',3);
    if(g.feralInstinctOverdrive>0)outline(0,0,53,'#ff7fad',4);
    if(g.runicRelic.active)outline(0,0,g.runicRelic.active==='slow'?260:38,'#94cfff',3);
    if(g.feralInstinct.active)outline(0,0,43,'#ff995e',4);
    if(g.escape>0)outline(0,0,36,'#7cf2d0',4);
    if(p.inv>0)outline(0,0,32,'#fff2cc',3);
    let aim=0,nearest=Infinity;
    for(const e of source.enemies){const d=(wrappedDelta(p.x,e.x))**2+(verticalDelta(p.y,e.y))**2;if(d<nearest){nearest=d;aim=Math.atan2(verticalDelta(p.y,e.y),wrappedDelta(p.x,e.x));}}
    drawRage(g,aim);
    catSprite('hero',27,g.t,p.animation.state==='hit',aim);
    drawRage(g,aim,true);
    const fresh=g.shots.find(s=>s.kind==='normal'&&dist(s.x,s.y,p.x,p.y)<65);
    if(fresh){ctx.save();ctx.translate(16,16);ctx.rotate(aim);
      polygon(26,0,[[0,-4],[8,-12],[12,-5],[24,0],[12,5],[8,12],[0,4]],'#ff9e45aa');
      polygon(26,0,[[0,-3],[12,-5],[18,0],[12,5],[0,3]],'#fff4c3');ctx.restore();}
    ctx.restore();
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
    if(source.world.transition>0){
      ctx.save();ctx.globalAlpha=(source.world.transition/2.5)*.12;
      ctx.fillStyle=BIOMES[source.world.epoch%4].floor;ctx.fillRect(0,0,W,H);ctx.restore();
    }
    ctx.fillStyle='#162d41';ctx.fillRect(20,H-21,160,8);
    ctx.fillStyle='#77f3c1';ctx.fillRect(20,H-21,160*(source.xp/(7+p.level*3)),8);
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
    if(game&&game.mode==='running')tick(dt);
    music();
    if(game)renderWorld();else staticScreen();
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
    if(ev.target.closest && ev.target.closest('input, textarea, select'))return;
    if((ev.key===' '||ev.key==='Enter')&&ev.target.closest&&ev.target.closest('button, a'))return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(ev.key))ev.preventDefault();
    if(game&&game.mode==='running')keys[ev.key]=true;if(!ev.repeat&&(ev.key==='Escape'||ev.key===' '))pause();
  });
  window.addEventListener('keyup',ev=>{keys[ev.key]=false;});
  window.addEventListener('blur',()=>{if(game&&game.mode==='running')pause();music();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&game.mode==='running')pause();music();});
  // Mobile Chrome requires a direct user gesture to remove browser chrome. Fullscreen
  // is independent of gameplay: denial or OS exit never prevents starting/resuming.
  function syncFullscreenButton() {
    const control=$('fullscreen');
    const active=!!document.fullscreenElement;
    control.textContent=active?'⛶ Exit':'⛶ Full';
    control.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
    control.setAttribute('aria-pressed',String(active));
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
    snapshot: () => ({world:{size:WORLD_SIZE,wrap:true,wrapY:false,topology:'horizontal-cylinder',...(game?JSON.parse(JSON.stringify(game.world)):{}),chunks:[...chunkCache.values()].map(c=>({index:c.index,biome:BIOMES[c.biome].id,solids:c.solids.map(s=>({...s}))})),solids:game?terrainNear(game.player.y).map(s=>({...s})):[]},progressionMilestones:game?[...game.progressionMilestones]:[],risingShadow:game?{...game.risingShadow}:null,endgame:game?{...game.endgame}:null,cityEvents:game?JSON.parse(JSON.stringify(game.cityEvents)):null,director:game?{...game.director,maxEnemies:liveCap(),minSpawnDelay:.75,maxSpawnDelay:2.8}:null,viewport:{width:W,height:H,pixels:[canvas.width,canvas.height]},squadTactic:game?game.squadTactic:'default',squadTacticDuration:game?game.squadTacticDuration:0,squadTacticCooldown:game?game.squadTacticCooldown:0,nightCycle:game?{...game.nightCycle}:{waveCount:1},build: BUILD,patch:PATCH_ID,threatUnlocks:{...UNLOCKS},availableThreats:game?availableThreats(game.t):[],
      companions:{limit:MAX_COMPANIONS,roles:[...roleNames],active:game?game.companionSquad.map(c=>c.type):[],ranks:game?{...game.companionRanks}:{},uniqueCount:roleNames.length},
      survivalTimer:game?game.survivalTimer:0,escapeOverdriveTimer:game?game.escapeOverdriveTimer:0,feralInstinctOverdrive:game?game.feralInstinctOverdrive:0,
      runicRelic:game?{...game.runicRelic,items:game.runicRelic.items.map(i=>({...i}))}:null,offered:game?[...(game.offered||[])]:[],lastNotice:game&&game.lastNotice?{...game.lastNotice}:null, mode: game ? game.mode : 'ready',
      time: game ? game.t : 0,
      equipment:game?{...game.equipment}:null,buildEffects:game?{...game.buildEffects}:null,exploration:game?{...game.exploration,nextPower:game.nextPower,rules:{...EXPLORATION}}:null,
      encore:game?{...game.encore,wave:game.encore.wave?{...game.encore.wave}:null,radius:ENCORE_RADIUS,windowDuration:ENCORE_WINDOW,cooldownDuration:ENCORE_COOLDOWN}:null,
      run:game?game.run:completedRuns+1,runScale:game?game.runScale:1,
      difficulty:game?difficulty():1,bossEncounters:game?game.bossEncounters:0,
      escapeArmed:!!(game&&game.escapeArmed),
      upgradeAvailability:game?Object.fromEntries(upgradeIds.map(k=>[k,upgradeAvailable(k)])):{},
      score:game?Math.floor(game.t*2+game.kills*7+game.fish*9):0,
      kills:game?game.kills:0,fish:game?game.fish:0,xp:game?game.xp:0,wave:game?game.wave:1,
      escape:game?game.escape:0,escapeCooldown:game?game.escapeCooldown:0,edgeWarning:!!(game&&game.edgeWarning),
      presentation:{reducedMotion,poseHz:12,animation:game?{...game.player.animation}:null,particles:game?game.particles.length:0},
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
      enemies:game?game.enemies.map(e=>({id:e.id,traits:e.traits?{...e.traits}:null,traitAge:e.traitAge||0,terrain:ignoresTerrain(e)?'bypass':'solid',contact:canEnemyContact(e),cocoon:!!e.cocoon,incubation:e.incubation||0,mutant:!!e.mutant,parentIds:e.parentIds?[...e.parentIds]:[],rewardValue:e.rewardValue||0,x:e.x,y:e.y,r:e.r,hp:e.hp,variant:e.variant,finalBoss:!!e.finalBoss,round:e.round||0,phase:e.phase,speed:e.speed,max:e.max,damage:e.damage,encoreSlow:e.encoreSlow||0,elite:!!e.elite,huntAge:e.huntAge||0,encounterId:e.encounterId||null,threat:enemyThreat(e),mutation:e.mutation||null,mutationTime:e.mutationTime||0,mutationAge:e.mutationAge||0})):[],
      shots:game?game.shots.map(s=>({x:s.x,y:s.y,life:s.life,kind:s.kind,bounces:s.bounces,damage:s.damage,critical:!!s.critical,hitDamage:s.calculateDamage?s.calculateDamage():s.damage})):[],
      input: pointer?{vx:pointer.vx,vy:pointer.vy}:null,
      player: game ? {x: game.player.x, y: game.player.y,r:game.player.r,survivalTimer:game.player.survivalTimer,survivalInstinctBuff:game.player.survivalInstinctBuff,hp:game.player.hp,maxHp:game.player.maxHp,
        autoFireDisabled:game.player.autoFireDisabled,silence:game.player.silence,phaseCooldown:game.player.phaseCooldown,petPicks:game.player.petPicks,
        xpGain:game.player.xpGain,level:game.player.level,damage:game.player.damage,speed:game.player.speed,
        shotInterval:game.player.shotInterval,multishot:game.player.multishot,ricochet:game.player.ricochet,magnet:game.player.magnet} : null})
  });
  window.spawnRelic=spawnRelic;
  last=performance.now();requestAnimationFrame(frame);
  window.CATACLYSM_BOOT.ready(BUILD);
})();
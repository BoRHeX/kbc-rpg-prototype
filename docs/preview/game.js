/* CATACLYSM: fully original mobile-first Canvas arcade by BoRHeZ Games. */
'use strict';
(function () {
  const BUILD = '0.9';
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), ctx = canvas.getContext('2d', {alpha:false});
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MIN_SHOT_INTERVAL = .04;
  const PATCH_ID = '42523008693-1-living-horde';
  const UNLOCKS = {shambler:0,weaver:120,dasher:240,orbiter:420,stalker:660,ghost:960,gas:1200};
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
  let musicBus = null, musicNext = 0, musicBeat = 0;
  let seeded = 424242, stars = [], city = [], noticeTTL = 0, noticeQueue = [];
  const rand = () => ((seeded = (Math.imul(1664525, seeded) + 1013904223) >>> 0) / 4294967296);
  const clamp = (v, lo, hi) => Math.min(hi,Math.max(lo,v));
  const dist = (x,y,x2,y2) => Math.hypot(x-x2,y-y2);
  const rnd = (a,b)=>a+(b-a)*rand();

  function initMap() {
    city = [];stars = [];
    for (let y=0;y<2400;y+=270) for(let x=0;x<2400;x+=280) {
      if(rand()>.20) city.push({x:x+42+rnd(-28,28),y:y+45+rnd(-22,22),
        w:105+rnd(0,75),h:105+rnd(0,85),lit:rand()>.5});
    }
    for(let i=0;i<260;i++) stars.push({x:rand()*2400,y:rand()*2400,r:rnd(.7,2.1)});
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
  const roleNames = ['shooter','healer','tank'];
  const commonIds = ['damage','fire-rate','speed','xp-gain'];
  const squadIds = ['squad-damage','squad-rate','squad-count','squad-spread','squad-bounce'];
  const upgradeIds = [...commonIds,'recover','multi-shot','ricochet','fish-magnet',...roleNames.map(r=>'companion-'+r),...squadIds];
  function upgradeAvailable(type) {
    if(squadIds.includes(type))return game.companionSquad.length>0;
    if(type==='recover')return game.player.hp<game.player.maxHp;
    return upgradeIds.includes(type);
  }
  function offerRand(){game.offerState=(Math.imul(1664525,game.offerState)+1013904223)>>>0;return game.offerState/4294967296;}
  function upgradeText(id){
    const p=game.player,q=game.squadStats,n=v=>Number(v.toFixed(2));
    const rows={damage:['Damage',p.damage,p.damage+.25], 'fire-rate':['Shots/s',1/p.shotInterval,1/(p.shotInterval*.85)],speed:['Move speed',p.speed,p.speed+18/Math.sqrt(1+(p.speed-cfg.speed)/180)],'xp-gain':['XP multiplier',p.xpGain,p.xpGain+.2],
      'squad-damage':['Follower damage % of player',q.damage*100,(q.damage+.15)*100],'squad-rate':['Follower fire multiplier',q.rate,q.rate*1.2], 'squad-count':['Squad strength (all roles)',q.count,q.count+1], 'squad-spread':['Follower spread rank',q.spread,q.spread+1], 'squad-bounce':['Follower bounce rank',q.bounce,q.bounce+1],
      'multi-shot':['Player spread rank',p.multishot,p.multishot+1],ricochet:['Player bounce rank',p.ricochet,p.ricochet+1],'fish-magnet':["Cat’s Catch range",135+p.magnet*65,200+p.magnet*65]};
    if(rows[id]){const [label,old,next]=rows[id];return label+' · '+n(old)+' → '+n(next);}
    if(id==='recover')return 'Patch up · +1 HP, +0.25 maximum HP';
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
    const score = Math.floor(game.t*2 + game.kills*7 + game.fish*9);
    readBest();
    if (score > personalBest) {
      personalBest = score;
      try { localStorage.setItem('cataclysm-best',String(personalBest)); }
      catch (err) { /* the visible session best still survives restart */ }
    }
    renderBest();
  }
  function sound(freq=480,len=.08,type='sine',volume=.035) {
    if(muted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if(!AudioContext)return;
      audio = audio || new AudioContext();
      if(audio.state==='suspended') audio.resume();
      const o = audio.createOscillator(), gain=audio.createGain();
      o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.72),audio.currentTime+len);
      gain.gain.setValueAtTime(volume,audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+len);
      o.connect(gain);gain.connect(audio.destination);o.start();o.stop(audio.currentTime+len);
      o.onended=()=>{o.disconnect();gain.disconnect();};
    }catch(e){/* optional audio */ }
  }
  // Two short synthesized voices; no assets, timers, or unbounded audio graph.
  function music() {
    if(!audio)return;
    if(!musicBus){musicBus=audio.createGain();musicBus.connect(audio.destination);}
    const active=!muted&&game&&game.mode==='running';
    musicBus.gain.setTargetAtTime(active?.45:0,audio.currentTime,.025);
    if(!active){musicNext=audio.currentTime;return;}
    if(musicNext<audio.currentTime)musicNext=audio.currentTime;
    const boss=game.enemies.some(e=>e.variant==='boss');
    while(musicNext<audio.currentTime+.12){
      const notes=boss?[110,130.81,146.83,103.83]:[130.81,155.56,174.61,116.54];
      const root=notes[Math.floor(musicBeat/8)%4];
      [root,root*[2,3,2.5,3][musicBeat%4]].forEach((hz,i)=>{
        const o=audio.createOscillator(),v=audio.createGain();
        o.type=i?'sine':'triangle';o.frequency.value=hz;
        v.gain.setValueAtTime(i?.018:.025,musicNext);
        v.gain.exponentialRampToValueAtTime(.0001,musicNext+.28);
        o.connect(v);v.connect(musicBus);o.start(musicNext);o.stop(musicNext+.3);
        o.onended=()=>{o.disconnect();v.disconnect();};
      });
      musicBeat++;musicNext+=boss?.22:.32;
    }
  }
  function safeSpawn(radius=600, margin=30) {
    const p=game.player;
    // Near a wall, spawn only on the inward side; never clamp a ring onto the cat.
    for(let i=0;i<32;i++){
      const a=rnd(0,TWO),x=p.x+Math.cos(a)*radius,y=p.y+Math.sin(a)*radius;
      if(x<margin||x>2400-margin||y<margin||y>2400-margin)continue;
      if((p.x<300&&x<p.x+180)||(p.x>2100&&x>p.x-180)||
         (p.y<300&&y<p.y+180)||(p.y>2100&&y>p.y-180))continue;
      return {x,y};
    }
    const a=Math.atan2(1200-p.y,1200-p.x);
    return {x:clamp(p.x+Math.cos(a)*radius,margin,2400-margin),
      y:clamp(p.y+Math.sin(a)*radius,margin,2400-margin)};
  }
  function edgeAid(dt) {
    const g=game,p=g.player;
    g.escapeCooldown=Math.max(0,g.escapeCooldown-dt);g.escape=Math.max(0,g.escape-dt);
    g.edgeWarning=Math.min(p.x,p.y,2400-p.x,2400-p.y)<220;
    if(!g.edgeWarning)g.escapeArmed=true;
    if(g.edgeWarning&&g.escapeArmed&&g.escapeCooldown===0&&g.enemies.some(e=>dist(e.x,e.y,p.x,p.y)<145)){
      g.escapeOrigin={x:p.x,y:p.y};g.escapeOverdriveTimer=4.5;g.escapeArmed=false;g.escape=2.5;g.escapeCooldown=10.5;p.inv=Math.max(p.inv,2.5);
      for(const e of g.enemies){const d=dist(e.x,e.y,p.x,p.y);
        if(d<210){const a=Math.atan2(e.y-p.y,e.x-p.x);
          e.x=clamp(p.x+Math.cos(a)*230,20,2380);e.y=clamp(p.y+Math.sin(a)*230,20,2380);}}
      notify('ESCAPE SHIELD · Follow the arrow inward',2.5);sound(740,.18);
    }
  }
  function notify(message,duration=1.5,id=message) {
    if(noticeTTL>0){if(noticeQueue.length<4&&!noticeQueue.some(n=>n.id===id))noticeQueue.push({message,duration,id});return;}
    if(game){game.lastNotice={id,message,time:game.t};}
    $('notice').textContent=message; $('notice').hidden=false; noticeTTL=duration;
  }
  function start() {
    recordRun();
    seeded=(Date.now()^0xD00DCA7)>>>0;
    initMap();
    const player={x:1200,y:1200,r:21,hp:3,maxHp:3,inv:0,speed:cfg.speed,
      survivalTimer:0,survivalInstinctBuff:0,xpGain:1,autoFireDisabled:false,silence:0,phaseCooldown:0,petPicks:0,shots:0,aim:0,level:1,damage:1,multishot:0,ricochet:0,magnet:0,shotInterval:Math.max(MIN_SHOT_INTERVAL,cfg.shotInterval)};
    game={mode:'running',t:0,run:completedRuns+1,runScale:1+Math.log2(1+completedRuns)*.18,runRecorded:false,bossEncounters:0,player,enemies:[],shots:[],fishItems:[],particles:[],pickupEffects:[],spawnCount:0,
      squadTactic:'default',squadTacticDuration:0,squadTacticCooldown:0,nextTactic:0,nightCycle:{waveCount:1},companionSquad:[],squadStats:{damage:.5,rate:1,count:1,spread:0,bounce:0},offerSeed:(new URLSearchParams(location.search).has('seed')?Number(new URLSearchParams(location.search).get('seed')):crypto.getRandomValues(new Uint32Array(1))[0])>>>0,offerState:0,companionRanks:{shooter:0,healer:0,tank:0},
      feralInstinct:{active:false,timer:0,duration:6,armed:true},effectiveBuffs:{speed:1,damage:1,fire:1,magnet:0,healing:0,mitigation:0},
      hazards:{toxicGasClouds:[],spawnTimer:0},powerups:[],buffs:{rage:0,magnet:0,survivalInstinct:0},survivalTimer:0,lastDamage:-10,escapeOverdriveTimer:0,feralInstinctOverdrive:0,escapeOrigin:null,runicRelic:{held:null,active:null,duration:0,cooldown:0,nextSpawn:35,items:[]},nextPower:18,powerCount:0,bossMilestone:0,
      escape:0,escapeCooldown:0,escapeArmed:true,edgeWarning:false,kills:0,fish:0,xp:0,upgrades:[],pendingUpgrade:false,wave:1,spawn:0,shake:0,now:0};
    game.director={budget:12,aliveThreat:0,nearby:0,kills:0,dps:0,pendingKills:0,pendingDamage:0,blocked:false,recovery:0,mutationCooldown:0,spawnDelay:1.65,spawns:0,suppressed:0,mutations:0,criticalShots:0,frameMs:16.7,framePressure:false};
    game.offerState=game.offerSeed;
    clearInput(); noticeTTL=0;noticeQueue=[];$('notice').hidden=true;$('upgrade-overlay').hidden=true;
    pointer=null; $('start-overlay').hidden=true; $('pause').hidden=false;
    $('pause').textContent='Ⅱ';$('stick').hidden=true;
    musicBeat=0;musicNext=audio?audio.currentTime:0;sound(700,.12);last=performance.now();updateHud();
  }
  function end() {
    if(!game || game.mode==='dead')return;
    game.mode='dead';recordRun();saveBest();$('overlay-title').textContent='NINE LIVES. ZERO LEFT.';
    $('overlay-copy').textContent='You survived '+Math.floor(game.t)+' seconds, defeated '+
      game.kills+' zombies, and rescued '+game.fish+' fish. Ready for another run?';
    $('play').textContent='↻ PLAY AGAIN'; $('start-overlay').hidden=false;
    $('pause').hidden=true;$('stick').hidden=true;pointer=null;sound(150,.4,'triangle');
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
  function offerUpgrade() {
    game.pendingUpgrade=true;game.mode='upgrade';clearInput();
    const milestone=game.player.level%3===0;
    if(milestone){
      game.player.maxHp=game.player.maxHp+1;
      game.player.hp=Math.min(game.player.maxHp,game.player.hp+1);
    }
    $('upgrade-title').textContent='LEVEL '+game.player.level+' · CHOOSE ONE';
    $('upgrade-copy').textContent=(milestone?'+1 maximum heart. ':'')+'Choose one investment. Combat frozen.';
    const buttons=[...document.querySelectorAll('[data-upgrade]')];
    let pool=buttons.filter(b=>upgradeAvailable(b.dataset.upgrade));
    const offered=[];
    // A usable player common is guaranteed; the other two use the full weighted pool.
    for(let i=0;i<3;i++){
      const eligible=i===0?pool.filter(b=>commonIds.includes(b.dataset.upgrade)):pool;
      const weight=b=>commonIds.includes(b.dataset.upgrade)?6:['squad-damage','squad-rate','squad-count'].includes(b.dataset.upgrade)?3:b.dataset.upgrade==='recover'?3:1;
      let roll=offerRand()*eligible.reduce((n,b)=>n+weight(b),0),chosen=eligible[eligible.length-1];
      for(const b of eligible){roll-=weight(b);if(roll<0){chosen=b;break;}}
      offered.push(chosen);pool=pool.filter(b=>b!==chosen);
    }
    game.offered=offered.map(b=>b.dataset.upgrade);
    buttons.forEach(b=>{b.hidden=!offered.includes(b);b.disabled=false;b.textContent=upgradeText(b.dataset.upgrade);});
    $('upgrade-overlay').hidden=false;$('pause').hidden=true;
    updateHud();sound(1050,.2);offered[0].focus({preventScroll:true});
  }

  function chooseUpgrade(type) {
    if(!game||game.mode!=='upgrade'||!game.pendingUpgrade||!upgradeAvailable(type)||!game.offered.includes(type))return;
    const p=game.player;
    if(type==='fire-rate')p.shotInterval*=.85;
    else if(type==='damage')p.damage+=.25;
    else if(type==='recover'){p.maxHp+=.25;p.hp=Math.min(p.maxHp,p.hp+1);}
    else if(type==='speed')p.speed+=18/Math.sqrt(1+(p.speed-cfg.speed)/180);
    else if(type==='xp-gain')p.xpGain+=.2;
    else if(type.startsWith('companion-'))summonCompanion(type.slice(10));
    else if(type==='squad-damage')game.squadStats.damage+=.15;
    else if(type==='squad-rate')game.squadStats.rate*=1.2;
    else if(type==='squad-count')game.squadStats.count++;
    else if(type==='squad-spread')game.squadStats.spread++;
    else if(type==='squad-bounce')game.squadStats.bounce++;
    else if(type==='multi-shot')p.multishot++;
    else if(type==='ricochet')p.ricochet++;
    else if(type==='fish-magnet')p.magnet++;
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
  const threatWeights={shambler:1,weaver:1.4,dasher:2,orbiter:2.2,stalker:2.6,ghost:3,boss:12};
  const liveCap=()=>Math.min(72,Math.max(1,Math.floor(cfg.maxEnemies)));
  const enemyThreat=e=>(threatWeights[e.variant]||1)*(e.weight===2?1.5:1)+(e.mutation?1:0);
  const ThreatDirector=Object.freeze({getThreatBudget:()=>game?game.director.budget:12});
  function updateDirector(dt){
    const g=game,d=g.director,p=g.player,a=1-Math.exp(-dt/12);
    d.kills+=(d.pendingKills/Math.max(dt,.001)-d.kills)*a;
    d.dps+=(d.pendingDamage/Math.max(dt,.001)-d.dps)*a;
    d.pendingKills=0;d.pendingDamage=0;
    d.aliveThreat=0;d.nearby=0;
    for(const e of g.enemies){d.aliveThreat+=enemyThreat(e);if(dist(e.x,e.y,p.x,p.y)<200)d.nearby++;}
    d.recovery=Math.max(0,d.recovery-dt);d.mutationCooldown=Math.max(0,d.mutationCooldown-dt);
    const effectiveness=clamp(d.kills*.9+d.dps*.025+Math.max(0,p.level-1)*.08,0,5);
    const target=clamp(12+Math.min(16,g.t/45)+effectiveness*2,12,38);
    // Slow upward response; health loss and nearby crowding open a recovery window.
    d.budget+=(target-d.budget)*(1-Math.exp(-dt/20));
    if(d.aliveThreat>=d.budget||d.nearby>=9||g.enemies.length>=liveCap())d.blocked=true;
    else if(d.aliveThreat<d.budget*.72&&d.nearby<5)d.blocked=false;
    d.spawnDelay=clamp(cfg.spawnInterval/(1+Math.min(1.5,g.t/240)+effectiveness*.16)*(d.recovery>0?1.8:1),.55,2.8);
  }
  function applyMutation(type,duration){
    if(!['burst','shield','weave'].includes(type))return;
    this.mutation=type;this.mutationTime=clamp(duration,1,10);this.mutationAge=0;
    this.mutationX=0;this.mutationY=0;
  }
  function updateEnemyBehavior(e,dt,vx,vy,pace){
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
    if(game.mode!=='running'||game.enemies.length>=liveCap()||d.blocked||d.recovery>0||d.framePressure)return null;
    const unlocked=availableThreats(game.t).filter(k=>k!=='gas');
    const variant=unlocked.includes(type)?type:unlocked[(game.spawnCount+1)%unlocked.length];
    const extra=(game.t>70&&rand()<.17&&variant==='shambler')?2:1;
    const cost=(threatWeights[variant]||1)*(extra===2?1.5:1);
    if(d.aliveThreat+cost>d.budget){d.blocked=true;d.suppressed++;return null;}
    const scale=difficulty(),hp=(cfg.enemyHp+(extra-1)*3)*scale;
    const e={...safeSpawn(rnd(560,730)),variant,dash:0,r:variant==='weaver'?15:extra===2?25:18,
      hp,max:hp,damage:1+Math.floor((scale-1)/1.5),speed:cfg.enemySpeed*(.85+rand()*.5)*(1+Math.min(.45,game.t/400)),
      phase:rnd(0,TWO),weight:extra,hurt:0,mutation:null,mutationTime:0,applyMutation};
    if(game.t>=360&&d.mutationCooldown===0&&d.aliveThreat+cost+1<=d.budget&&
      game.enemies.filter(n=>n.mutation).length<2&&rand()<.18){
      const requested=mutationFlags&&mutationFlags.type;
      e.applyMutation(['burst','shield','weave'].includes(requested)?requested:['burst','shield','weave'][Math.floor(rand()*3)],8);
      d.mutationCooldown=6;d.mutations++;
    }
    game.enemies.push(e);game.spawnCount++;d.spawns++;d.aliveThreat+=enemyThreat(e);
    return e;
  }
  const SpawnManager=Object.freeze({spawnEnemy});
  const Shot={calculateDamage(){return this.damage*(this.critical?1.75:1);},isCriticalHit(){return !!this.critical;}};
  function prepareShot(shot){
    const p=game.player;
    shot.critical=rand()<clamp(.06+(p.level-1)*.004+Math.max(0,p.damage-1)*.012,.06,.22);
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
    const dx=(enemy.x-p.x)/best,dy=(enemy.y-p.y)/best;
    p.aim=Math.atan2(dy,dx);
    const spread=Math.min(4,p.multishot);
    for(let i=-spread;i<=spread&&game.shots.length<160;i++){
      const a=p.aim+i*.18;
      game.shots.push(prepareShot({x:p.x+dx*18,y:p.y+dy*18,vx:Math.cos(a)*600,vy:Math.sin(a)*600,
        life:Math.min(2,.85+p.ricochet*.25),r:6,damage:p.damage*game.effectiveBuffs.damage*((1+2*p.multishot)/(1+2*spread))*(1+Math.max(0,p.ricochet-8)*.12)*Math.max(1,MIN_SHOT_INTERVAL*game.effectiveBuffs.fire/p.shotInterval),bounces:Math.min(8,p.ricochet),hit:[],
        kind:p.multishot>0?'spread':'normal',trail:[],flash:0}));
    }
    sound(420+rnd(0,140),.05,'square',.018);
  }
  // Content updates use simulation seconds, so pause and upgrades freeze every timer.
  // One visible representative per role; count investments multiply squad effectiveness.
  function summonCompanion(type='shooter') {
    if(!roleNames.includes(type))return;
    const p=game.player;
    let ally=game.companionSquad.find(c=>c.type===type);
    if(ally)ally.rank++;
    else {ally={type,rank:1,x:p.x+45,y:p.y,r:13,shotTimer:0,flash:0,specialAbilityReady:true,specialCooldown:0,specialDuration:0};game.companionSquad.push(ally);}
    game.companionRanks[type]=ally.rank;
  }
  function updateCompanions(dt) {
    const g=game,p=g.player,q=g.squadStats;
    for(const pet of g.companionSquad){
      const wasCooling=pet.specialCooldown>0;
      pet.specialCooldown=Math.max(0,pet.specialCooldown-dt);
      pet.specialDuration=Math.max(0,pet.specialDuration-dt);
      pet.specialAbilityReady=pet.specialCooldown===0;
      if(wasCooling&&pet.specialAbilityReady){notify(pet.type.toUpperCase()+' special ready',1.5);sound(520,.08,'triangle',.018);}
      pet.flash=Math.max(0,pet.flash-dt);
      let nearest=null,best=g.squadTactic==='aggressive'?650:460;
      for(const e of g.enemies){const d=dist(pet.x,pet.y,e.x,e.y);if(e.hp>0&&d<best){best=d;nearest=e;}}
      const a=nearest?Math.atan2(nearest.y-p.y,nearest.x-p.x):0;
      const formation=g.squadTactic==='defensive'?.45:g.squadTactic==='aggressive'?1.35:1;
      const tx=clamp(p.x+formation*(pet.type==='tank'?Math.cos(a)*65:pet.type==='healer'?-48:48),25,2375);
      const ty=clamp(p.y+formation*(pet.type==='tank'?Math.sin(a)*65:pet.type==='healer'?-45:35),25,2375);
      const d=Math.max(1,dist(pet.x,pet.y,tx,ty)),step=Math.min(d,(p.speed+90)*dt);
      pet.x+=(tx-pet.x)/d*step;pet.y+=(ty-pet.y)/d*step;
      pet.shotTimer-=dt;
      if(pet.shotTimer>0||!nearest)continue;
      const interval=(pet.type==='shooter'?.8:1.4)/(q.rate*(1+pet.rank*.1)*(g.squadTactic==='aggressive'?1.3:1));
      const spread=Math.min(3,q.spread),angle=Math.atan2(nearest.y-pet.y,nearest.x-pet.x);
      // Reserve projectile room for both cat and squad. Excess rate/spread/count becomes damage.
      if(g.shots.length>140)continue;
      for(let i=-spread;i<=spread;i++)g.shots.push({x:pet.x,y:pet.y,vx:Math.cos(angle+i*.18)*600,vy:Math.sin(angle+i*.18)*600,
        life:Math.min(2,.85+q.bounce*.25),r:5,damage:p.damage*g.effectiveBuffs.damage*q.damage*(pet.type==='shooter'?1:.5)*(1+pet.rank*.1)*q.count*((1+q.spread*2)/(1+spread*2))*Math.max(1,MIN_SHOT_INTERVAL/interval)*(1+Math.max(0,q.bounce-8)*.12),bounces:Math.min(8,q.bounce),hit:[],kind:'pet',trail:[],flash:0});
      pet.flash=.15;pet.shotTimer=Math.max(MIN_SHOT_INTERVAL,interval);
    }
  }
  // A shared cooldown per role prevents duplicate recruits from spamming abilities.
  function companionSpecialAbilityActivate(type){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,pet=g.companionSquad.find(c=>c.type===type);
    if(!pet||!pet.specialAbilityReady||pet.specialCooldown>0)return;
    if(type==='shooter'&&g.shots.length>144)return;
    pet.specialCooldown=type==='healer'?24:18;
    pet.specialAbilityReady=false;pet.flash=.4;
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
    burst(pet.x,pet.y,type==='tank'?'#94cfff':'#8affbd',12);
    notify(type.toUpperCase()+' · '+({shooter:'RADIAL BURST',healer:'HEALING PULSE',tank:'GUARD · 6s'})[type],2);
    sound(type==='shooter'?820:type==='healer'?660:280,.2,'triangle');
    updateSupport(0);updateHud();
  }
  for(const type of roleNames)$('ability-'+type).onclick=()=>companionSpecialAbilityActivate(type);
  function updateSupport(dt){
    const g=game,p=g.player,f=g.feralInstinct;
    let nearby=0;
    for(const e of g.enemies)if(e.hp>0&&(e.x-p.x)**2+(e.y-p.y)**2<=10000)nearby++;
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
  function damageTaken(){game.director.recovery=5;game.lastDamage=game.t;game.survivalTimer=0;game.buffs.survivalInstinct=0;game.player.survivalTimer=0;game.player.survivalInstinctBuff=0;}
  function activateRunicRelic(){
    if(!game||game.mode!=='running')return;
    const r=game.runicRelic;
    if(!r.held||r.cooldown>0||r.active)return;
    r.active=r.held;r.held=null;r.duration=6;r.cooldown=10;
    notify('RUNIC '+r.active.toUpperCase()+' · 6s',3,'relic');sound(640,.3,'triangle');updateHud();
  }
  $('runic-relic-activate').onclick=activateRunicRelic;
  function spawnRelic(){
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player,r=g.runicRelic;
    if(g.t<r.nextSpawn||r.items.length>=3)return;
    const a=rnd(0,TWO);
    r.items.push({x:clamp(p.x+Math.cos(a)*160,40,2360),y:clamp(p.y+Math.sin(a)*160,40,2360),type:rand()<.5?'shield':'slow'});
    r.nextSpawn=g.t+45;
    notify('RUNIC RELIC appeared nearby · ◇ shield / ❄ slow',2,'relic-spawn');sound(340,.3,'triangle',.025);
  }
  function updateRelics(dt){
    const g=game,p=g.player,r=g.runicRelic,wasActive=r.active,wasCooling=r.cooldown>0;
    r.duration=Math.max(0,r.duration-dt);r.cooldown=Math.max(0,r.cooldown-dt);
    if(r.duration===0&&wasActive){r.active=null;notify('RUNIC '+wasActive.toUpperCase()+' ended',1.5,'relic-end');sound(300,.12,'triangle',.018);}
    if(wasCooling&&r.cooldown===0&&r.held){notify('RUNIC RELIC ready',1.5);sound(520,.08,'triangle',.018);}
    spawnRelic();
    if(!r.held){const i=r.items.findIndex(item=>dist(item.x,item.y,p.x,p.y)<45);if(i>=0){r.held=r.items.splice(i,1)[0].type;notify('RUNIC RELIC · Tap to activate',3,'relic-pickup');sound(460,.12,'triangle',.025);}}
  }
  function updateGhosts(dt) {
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
  function burst(x,y,col,n=10) {
    if(reducedMotion||game.particles.length>=500)return;
    for(let i=0;i<n;i++){const a=rnd(0,TWO),s=rnd(50,205);
      game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
        life:rnd(.18,.55),ttl:.55,col,r:rnd(2,5)});
    }
  }
  function dropPower(x,y,kind) {
    game.powerups.push({x:clamp(x,35,2365),y:clamp(y,35,2365),kind});
  }
  function spawnBoss(night) {
    if(game.enemies.length>=liveCap()){const i=game.enemies.findIndex(e=>e.variant!=='boss');if(i<0)return;game.enemies.splice(i,1);}
    // The scheduled boss occupies the same budget, replacing distant ordinary threats.
    // No kill credit or drops for enemies withdrawn by the director.
    const budget=ThreatDirector.getThreatBudget();
    let threat=game.enemies.reduce((n,e)=>n+enemyThreat(e),0);
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
    game.fishItems.push({x,y,r:12,value,phase:rnd(0,TWO),attracted:false});
  }
  function tick(dt) {
    if(!game||game.mode!=='running')return;
    const g=game,p=g.player;
    g.squadTacticDuration=Math.max(0,g.squadTacticDuration-dt);
    g.squadTacticCooldown=Math.max(0,g.squadTacticCooldown-dt);
    if(!g.squadTacticDuration)g.squadTactic='default';
    g.t+=dt;g.nightCycle.waveCount=1+Math.floor(g.t/300);g.shake=Math.max(0,g.shake-dt*5);
    g.wave=1+Math.floor(g.t/90);
    const milestone=Math.floor(g.t/300)*10;
    if(milestone>g.bossMilestone){g.bossMilestone=milestone;spawnBoss(milestone);}
    for(const key of Object.keys(g.buffs))g.buffs[key]=Math.max(0,g.buffs[key]-dt);
    if(g.t>=g.nextPower){
      const angle=rnd(0,TWO);dropPower(p.x+Math.cos(angle)*170,p.y+Math.sin(angle)*170,
        ['rage','magnet','heal'][g.powerCount++%3]);g.nextPower+=24;
    }
    updateDirector(dt);
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
    const input=moveInput();p.x=clamp(p.x+input.x*(cfg.speed+300*Math.log1p((p.speed-cfg.speed)/300))*g.effectiveBuffs.speed*dt,25,2375);
    p.y=clamp(p.y+input.y*(cfg.speed+300*Math.log1p((p.speed-cfg.speed)/300))*g.effectiveBuffs.speed*dt,25,2375);
    p.shots-=dt;if(p.shots<=0){shotAtEnemy();p.shots=Math.max(MIN_SHOT_INTERVAL,p.shotInterval/g.effectiveBuffs.fire);}
    for(const enemy of g.enemies){
      const guard=g.companionSquad.find(c=>c.type==='tank'&&c.specialDuration>0&&dist(c.x,c.y,enemy.x,enemy.y)<260);
      const target=guard||p;
      const dx=target.x-enemy.x,dy=target.y-enemy.y, d=Math.max(1,Math.hypot(dx,dy));
      let vx=dx/d,vy=dy/d,pace=1;
      if(enemy.variant==='orbiter'){
        // Circle at close range, then periodically cut inward.
        const orbit=d<240&&enemy.phase%12<8;
        if(orbit){vx=-dy/d;vy=dx/d;pace=1.2;}
      }else if(enemy.variant==='stalker'){
        // Flank the direction of travel rather than following the same pursuit line.
        const side=Math.sin(enemy.phase*.35)>0?1:-1;
        const tx=p.x+input.x*160-dy/d*side*110,ty=p.y+input.y*160+dx/d*side*110;
        const length=Math.max(1,dist(enemy.x,enemy.y,tx,ty));
        vx=(tx-enemy.x)/length;vy=(ty-enemy.y)/length;pace=1.15;
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
      ({vx,vy,pace}=updateEnemyBehavior(enemy,dt,vx,vy,pace));
      // Extra speed is countered dynamically, including enemies already alive.
      // Far pursuers close the gap; nearby dashes remain telegraphed and dodgeable.
      const adaptation=Math.min(120,Math.max(0,p.speed-cfg.speed)*.25);
      const slow=g.runicRelic.active==='slow'&&dist(enemy.x,enemy.y,p.x,p.y)<260?.45:1;
      const chase=slow*(d>330?Math.max(enemy.speed+adaptation,Math.min(420,p.speed*1.08)):enemy.speed+adaptation);
      enemy.x=clamp(enemy.x+vx*chase*pace*dt,20,2380);
      enemy.y=clamp(enemy.y+vy*chase*pace*dt,20,2380);
      enemy.phase+=dt*3;enemy.hurt=Math.max(0,enemy.hurt-dt);
      if(g.mode==='running'&&!g.pendingUpgrade&&dist(p.x,p.y,enemy.x,enemy.y)<p.r+enemy.r-3&&p.inv===0&&!(g.runicRelic.active==='shield'&&g.runicRelic.duration>0)){
        damageTaken();p.hp=Math.max(0,p.hp-enemy.damage*(1-g.effectiveBuffs.mitigation));p.inv=1.3;g.shake=.6;burst(p.x,p.y,'#fb7995',14);
        sound(190,.21,'sawtooth');if(p.hp<=0){updateHud();end();return;}notify('OUCH! ♥ -'+(enemy.damage*(1-g.effectiveBuffs.mitigation)).toFixed(1));
      }
    }
    for(let i=g.shots.length-1;i>=0;i--){
      const s=g.shots[i];
      s.trail.push({x:s.x,y:s.y});if(s.trail.length>(reducedMotion?1:6))s.trail.shift();
      s.flash=Math.max(0,s.flash-dt);s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      if(s.life<=0){g.shots.splice(i,1);continue;}
      const idx=g.enemies.findIndex(e=>!s.hit.includes(e)&&dist(e.x,e.y,s.x,s.y)<e.r+s.r);
      if(idx>=0){
        const e=g.enemies[idx],raw=s.calculateDamage?s.calculateDamage():s.damage;
        const hitDamage=raw*(e.mutation==='shield'&&e.mutationAge>=1?.5:1);
        g.director.pendingDamage+=Math.min(e.hp,hitDamage);e.hp-=hitDamage;e.hurt=.12;
        burst(s.x,s.y,s.critical?'#fff09a':'#a5f8ff',s.critical?7:4);
        s.hit.push(e);
        if(s.bounces>0){
          s.bounces--;s.kind='bounce';s.flash=.16;burst(s.x,s.y,'#ffd568',9);
          const next=g.enemies.filter(n=>!s.hit.includes(n)).sort((a,b)=>dist(a.x,a.y,s.x,s.y)-dist(b.x,b.y,s.x,s.y))[0];
          if(next){const a=Math.atan2(next.y-s.y,next.x-s.x);s.vx=Math.cos(a)*600;s.vy=Math.sin(a)*600;s.life=Math.max(.5,s.life);}
          else {s.vx*=-1;s.vy*=-1;}
        }else g.shots.splice(i,1);
        if(e.hp<=0){
          g.director.pendingKills++;g.kills+=e.weight;burst(e.x,e.y,'#93eaac',14);
          if(e.variant==='boss'){
            addFish(e.x,e.y,12);
            ['rage','magnet','heal'].forEach((kind,i)=>dropPower(e.x+(i-1)*55,e.y+35,kind));
            notify('ALLEY KING DEFEATED · +20 KILLS',3);
          }else if(rand()<cfg.fishDropChance)addFish(e.x,e.y);
          g.enemies.splice(idx,1);sound(620,.06,'triangle',.02);
        }
      }
    }
    for(let i=g.fishItems.length-1;i>=0;i--){
      const f=g.fishItems[i];f.phase+=dt*4;
      const d=dist(f.x,f.y,p.x,p.y);
      if(d<135+p.magnet*65+(p.speed-cfg.speed)*2/3+g.effectiveBuffs.magnet||g.buffs.magnet>0)f.attracted=true;
      if(f.attracted){const step=Math.min(d,(p.speed+240)*dt);
        f.x+=(p.x-f.x)/Math.max(d,1)*step;f.y+=(p.y-f.y)/Math.max(d,1)*step;}
      if(d<28){
        g.fish+=f.value;g.xp+=f.value*p.xpGain;g.fishItems.splice(i,1);burst(f.x,f.y,'#f5cf75',7);
        g.pickupEffects.push({x:f.x,y:f.y,life:.9,value:f.value});
        if(g.pickupEffects.length>24)g.pickupEffects.shift();
        sound(880,.28,'sine',.035);
        if(g.xp>=7+p.level*3){
          g.xp-=7+p.level*3;p.level++;offerUpgrade();return;
        }
      }
    }
    for(let i=g.powerups.length-1;i>=0;i--){
      const item=g.powerups[i];
      if(dist(item.x,item.y,p.x,p.y)<p.r+23){
        if(item.kind==='heal')p.hp=Math.min(p.maxHp,p.hp+1);
        else g.buffs[item.kind]=12;
        g.powerups.splice(i,1);burst(item.x,item.y,'#c2a4ff',12);sound(1100,.2);
        notify(item.kind==='heal'?'HEART · +1 HP':item.kind==='rage'?'RAGE · DOUBLE DAMAGE 12s':'MAGNET · ALL FISH 12s',2);
      }
    }
    // A merged fish cache can earn several levels; resolve one choice at a time.
    if(g.xp>=7+p.level*3){g.xp-=7+p.level*3;p.level++;offerUpgrade();return;}
    for(let i=g.pickupEffects.length-1;i>=0;i--){g.pickupEffects[i].life-=dt;if(g.pickupEffects[i].life<=0)g.pickupEffects.splice(i,1);}
    for(let i=g.particles.length-1;i>=0;i--){
      const s=g.particles[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=.96;s.vy*=.96;s.life-=dt;
      if(s.life<=0)g.particles.splice(i,1);
    }
    if(noticeTTL>0){noticeTTL-=dt;if(noticeTTL<=0){$('notice').hidden=true;if(noticeQueue.length){const n=noticeQueue.shift();notify(n.message,n.duration,n.id);}}}
    updateHud();
  }
  function updateHud(){
    if(!game)return;
    $('time').textContent=String(Math.floor(game.t/60)).padStart(2,'0')+':'+
      String(Math.floor(game.t%60)).padStart(2,'0');
    $('score').textContent=Math.floor(game.t*2+game.kills*7+game.fish*9);
    $('build-stats').textContent='Speed '+Math.round(game.player.speed)+' · Damage '+game.player.damage.toFixed(2)+
      ' · XP ×'+game.player.xpGain.toFixed(1)+' · Shots/s '+(1/game.player.shotInterval).toFixed(2)+' · Spread '+(1+game.player.multishot*2)+
      ' · Bounces '+game.player.ricochet+' · Pickup '+Math.round(135+game.player.magnet*65+(game.player.speed-cfg.speed)*2/3)+'px';
    $('fish').textContent=game.fish;$('kills').textContent=game.kills;
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
      const name={shooter:'Burst',healer:'Heal',tank:'Guard'}[type];
      btn.textContent=name+(ally.specialDuration>0?' active '+Math.ceil(ally.specialDuration)+'s':ally.specialCooldown>0?' '+Math.ceil(ally.specialCooldown)+'s':' ready');
      btn.setAttribute('aria-label',type+' special: '+btn.textContent);
      btn.style.setProperty('--ready',((1-ally.specialCooldown/(type==='healer'?24:18))*100)+'%');
    }
    $('support-status').textContent='SQUAD '+(game.companionSquad.map(c=>c.type.slice(0,3).toUpperCase()+' R'+c.rank).join(' · ')||'—')+' · ×'+game.squadStats.count;
    $('xp-level').textContent=game.xp.toFixed(0)+' / '+(7+p.level*3)+' · L'+p.level;
    $('night-status').textContent='NIGHT '+game.nightCycle.waveCount;
    const boss=game.enemies.find(e=>e.variant==='boss');$('boss-status').hidden=!boss;
    if(boss){$('boss-health').value=boss.hp/boss.max;$('boss-health').setAttribute('aria-label','Alley King '+Math.ceil(boss.hp)+' / '+Math.ceil(boss.max)+' HP');}
    $('buff-status').textContent=[game.buffs.survivalInstinct>0?'SURVIVAL '+Math.ceil(game.buffs.survivalInstinct)+'s':'',game.feralInstinct.active?'FERAL '+Math.ceil(game.feralInstinct.timer)+'s':'',game.buffs.rage>0?'RAGE '+Math.ceil(game.buffs.rage)+'s':'',game.feralInstinctOverdrive>0?'OVERDRIVE':''].filter(Boolean).join(' · ');
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
  function renderWorld(){
    const g=game, p=g.player;
    const cameraX=clamp(p.x-W/2,0,2400-W),cameraY=clamp(p.y-H/2,0,2400-H);
    ctx.fillStyle='#0e1d2b';ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.translate(-cameraX+(reducedMotion?0:(rand()-.5)*g.shake*10),-cameraY+(reducedMotion?0:(rand()-.5)*g.shake*10));
    ctx.fillStyle='#162b3d';ctx.fillRect(0,0,2400,2400);
    ctx.strokeStyle='#274254';ctx.lineWidth=2;
    for(let x=0;x<2400;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,2400);ctx.stroke();}
    for(let y=0;y<2400;y+=90){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(2400,y);ctx.stroke();}
    ctx.fillStyle='#355262';
    for(let x=140;x<2400;x+=280){ctx.fillRect(x,0,8,2400);}
    for(let y=180;y<2400;y+=270){ctx.fillRect(0,y,2400,8);}
    for(const c of city){
      if(c.x+c.w<cameraX-40||c.x>cameraX+W+40||c.y+c.h<cameraY-40||c.y>cameraY+H+40)continue;
      ctx.fillStyle='#071520';ctx.fillRect(c.x+9,c.y+11,c.w,c.h);
      ctx.fillStyle=c.lit?'#234154':'#1b3447';ctx.fillRect(c.x,c.y,c.w,c.h);
      ctx.strokeStyle='#4b6472';ctx.lineWidth=2;ctx.strokeRect(c.x,c.y,c.w,c.h);
      for(let yy=c.y+20;yy<c.y+c.h-6;yy+=27)
        for(let xx=c.x+18;xx<c.x+c.w-8;xx+=30){
          ctx.fillStyle=((Math.floor(xx+yy)*0.17)%3>1)?'#5a837e':'#19374b';
          ctx.fillRect(xx,yy,12,10);
        }
    }
    for(const s of stars) circle(s.x,s.y,s.r,'#386378');
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
    for(const item of g.powerups){
      const color=item.kind==='rage'?'#ff94cd':item.kind==='magnet'?'#a6b7ff':'#86f1b7';
      circle(item.x,item.y,24,'#101c30');outline(item.x,item.y,24,color,3);
      ctx.fillStyle=color;ctx.font='bold 23px system-ui';ctx.textAlign='center';
      ctx.fillText(item.kind==='rage'?'R':item.kind==='magnet'?'M':'♥',item.x,item.y+8);ctx.textAlign='left';
    }
    for(const c of g.hazards.toxicGasClouds){
      const warning=c.age<1,r=warning?110:gasRadius(c);
      circle(c.x,c.y,r,'#91d75730');
      outline(c.x,c.y,r,'#b6ee75',warning?3:2);
      if(!reducedMotion&&!warning)outline(c.x,c.y,r*.75+Math.sin(c.age*5)*3,'#95d66b66',2);
      if(warning){ctx.fillStyle='#d4ffac';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText('GAS!',c.x,c.y);ctx.textAlign='left';}
    }
    for(const pet of g.companionSquad){
      if(pet.specialDuration>0)outline(pet.x,pet.y,34,'#94cfff',3);
      ctx.save();ctx.translate(pet.x,pet.y);
      circle(0,8,15,'#000a15aa');circle(0,0,13,pet.type==='healer'?'#7cf2d0':pet.type==='tank'?'#a6b7ff':'#ffce86');
      if(pet.type!=='shooter')outline(0,0,pet.type==='tank'?23:19,pet.type==='tank'?'#a6b7ff':'#7cf2d0',3);
      polygon(0,0,[[-11,-5],[-12,-21],[-2,-12]],'#ffce86');
      polygon(0,0,[[11,-5],[12,-21],[2,-12]],'#ffce86');
      circle(-5,0,2,'#173141');circle(5,0,2,'#173141');
      if(pet.flash>0)outline(0,0,19,'#ffe7ab',3);
      ctx.fillStyle='#ffddaa';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(pet.type[0].toUpperCase()+' R'+pet.rank,0,30);ctx.textAlign='left';ctx.restore();
    }
    for(const s of g.shots){
      const color=s.kind==='pet'?'#ffce86':s.kind==='bounce'?'#ffd568':s.kind==='spread'?'#ff94cd':'#71e5ff';
      if(s.trail.length){
        ctx.beginPath();ctx.moveTo(s.trail[0].x,s.trail[0].y);
        for(const point of s.trail)ctx.lineTo(point.x,point.y);
        ctx.lineTo(s.x,s.y);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();
      }
      circle(s.x,s.y,s.kind==='normal'?5:7,color);
      Renderer.drawCriticalHitEffect(s);
      if(s.flash>0)outline(s.x,s.y,15,'#fff1a6',3);
    }
    for(const e of [...g.enemies.filter(e=>e.variant!=='ghost'),...g.enemies.filter(e=>e.variant==='ghost')]){
      ctx.save();if(e.variant==='ghost')ctx.globalAlpha=.62;ctx.translate(e.x,e.y);ctx.rotate(reducedMotion?0:Math.sin(e.phase)*.08);
      circle(0,9,e.r*1.04,'#070d15a0');
      const color=e.variant==='ghost'?'#c7adff':e.variant==='orbiter'?'#65d6ef':e.variant==='stalker'?'#ffdb76':e.variant==='boss'?'#e56d9f':e.variant==='weaver'?'#b294ed':e.variant==='dasher'?'#f6af62':'#6faa8f';
      if((e.variant==='dasher'&&e.phase%9<2)||(e.variant==='boss'&&e.phase%7<2))outline(0,0,e.r+8,'#ffe6a1',3);
      if(e.variant==='ghost')outline(0,0,e.r+9,'#c7adff',3);
      if(e.mutation){
        const color=e.mutation==='burst'?'#ffb45f':e.mutation==='shield'?'#84dbff':'#eea4ff';
        outline(0,0,e.r+12,color,e.mutationAge<1?4:2);
        ctx.fillStyle=color;ctx.font='bold 15px system-ui';ctx.textAlign='center';
        ctx.fillText(e.mutation==='burst'?(e.mutationAge<1?'RUSH!':'»'):e.mutation==='shield'?'◇':'≈',0,-e.r-18);ctx.textAlign='left';
      }
      circle(0,0,e.r,e.hurt?'#d2fff0':color);
      if(e.variant==='orbiter')outline(0,0,e.r+7,color,3);
      if(e.variant==='stalker')polygon(0,-e.r,[[0,-12],[-8,0],[8,0]],color);
      if(e.hurt)outline(0,0,e.r+5,'#ffffff',3);
      if(e.variant==='weaver')outline(0,0,e.r+4,color);
      polygon(0,0,[[-e.r*.65,-e.r*.5],[-e.r*.9,-e.r*1.2],[-e.r*.12,-e.r*.8]],'#6faa8f');
      polygon(0,0,[[e.r*.65,-e.r*.5],[e.r*.9,-e.r*1.2],[e.r*.12,-e.r*.8]],'#6faa8f');
      circle(-e.r*.35,-2,3.4,'#fb8195');circle(e.r*.35,-2,3.4,'#fb8195');
      ctx.strokeStyle='#274d43';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,9);
      ctx.lineTo(0,12);ctx.lineTo(6,9);ctx.stroke();
      if(e.hp<e.max){ctx.fillStyle='#fa7e85';ctx.fillRect(-e.r,-e.r-14,e.r*2*(e.hp/e.max),4);}
      ctx.restore();
    }
    ctx.save();ctx.translate(p.x,p.y);
    if(p.autoFireDisabled){outline(0,0,39,'#c7adff',3);ctx.fillStyle='#e1d4ff';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText('FIRE SEALED',0,-49);ctx.textAlign='left';}
    if(g.buffs.survivalInstinct>0)outline(0,0,48+(reducedMotion?0:Math.sin(g.t*4)*2),'#ffe79c',3);
    if(g.feralInstinctOverdrive>0)outline(0,0,53,'#ff7fad',4);
    if(g.runicRelic.active)outline(0,0,g.runicRelic.active==='slow'?260:38,'#94cfff',3);
    if(g.feralInstinct.active)outline(0,0,43,'#ff995e',4);
    if(g.escape>0)outline(0,0,36,'#7cf2d0',4);
    circle(0,14,27,'#000a15aa');
    if(p.inv>0&&(reducedMotion||Math.floor(p.inv*12)%2===0))ctx.globalAlpha=.36;
    // tail
    ctx.strokeStyle='#ffc7dd';ctx.lineWidth=8;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-15,12);ctx.quadraticCurveTo(-37,9,-32,-14);ctx.stroke();
    circle(0,0,22,'#e5e0f3');
    polygon(0,0,[[-16,-10],[-20,-33],[-4,-21]],'#e5e0f3');
    polygon(0,0,[[16,-10],[20,-33],[4,-21]],'#e5e0f3');
    polygon(0,0,[[-15,-17],[-17,-26],[-8,-20]],'#f4a6b9');
    polygon(0,0,[[15,-17],[17,-26],[8,-20]],'#f4a6b9');
    circle(-8,0,3.4,'#132437');circle(8,0,3.4,'#132437');
    polygon(0,0,[[0,7],[-5,4],[5,4]],'#dc6f88');
    ctx.strokeStyle='#243142';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(-4,12);
    ctx.moveTo(0,8);ctx.lineTo(4,12);ctx.stroke();
    circle(15,15,7,'#75f7cb');circle(15,15,3,'#153b33');
    ctx.restore();
    for(const e of g.particles){ctx.globalAlpha=clamp(e.life/e.ttl,0,1);circle(e.x,e.y,e.r,e.col);}
    ctx.globalAlpha=1;
    if(g.edgeWarning){
      const angle=Math.atan2(1200-p.y,1200-p.x);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);
      polygon(65,0,[[20,0],[-4,-13],[-4,-5],[-27,-5],[-27,5],[-4,5],[-4,13]],'#7cf2d0');ctx.restore();
    }
    ctx.restore();
    const grad=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,650);
    grad.addColorStop(0,'#06132100');grad.addColorStop(1,'#030c1c99');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    if(g.edgeWarning){ctx.fillStyle='#7cf2d0';ctx.font='bold 19px system-ui';ctx.textAlign='center';ctx.fillText(g.escape>0?'SHIELD ACTIVE · MOVE INWARD':(g.escapeArmed?'EDGE · Follow the mint arrow':'SHIELD SPENT · Return inward to rearm'),W/2,H-55);ctx.textAlign='left';}
    ctx.fillStyle='#162d41';ctx.fillRect(20,H-21,160,8);
    ctx.fillStyle='#77f3c1';ctx.fillRect(20,H-21,160*(g.xp/(7+p.level*3)),8);
  }
  function staticScreen() {
    ctx.fillStyle='#0d2030';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#24485a';ctx.lineWidth=2;
    for(let x=0;x<W;x+=45)for(let y=0;y<H;y+=45)ctx.strokeRect(x,y,45,45);
    ctx.fillStyle='#11303a';ctx.fillRect(110,170,500,680);
    ctx.strokeStyle='#31586b';ctx.strokeRect(110,170,500,680);
    circle(360,440,185,'#294d5344');
    ctx.font='100px system-ui';ctx.textAlign='center';ctx.fillText('🐈‍⬛',360,530);
    ctx.textAlign='left';
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
  window.addEventListener('blur',()=>{if(game&&game.mode==='running')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&game.mode==='running')pause();});
  $('play').onclick=resumeOrStart;$('pause').onclick=pause;
  $('restart').onclick=()=>{start();};$('mute').onclick=()=>{
    muted=!muted;$('mute').textContent=muted?'♪ Sound off':'♪ Sound on';
    $('mute').setAttribute('aria-pressed',String(muted));
    $('mute').setAttribute('aria-label',muted?'Unmute sound':'Mute sound');
  };
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
    snapshot: () => ({director:game?{...game.director,maxEnemies:liveCap(),minSpawnDelay:.55,maxSpawnDelay:2.8}:null,viewport:{width:W,height:H,pixels:[canvas.width,canvas.height]},squadTactic:game?game.squadTactic:'default',squadTacticDuration:game?game.squadTacticDuration:0,squadTacticCooldown:game?game.squadTacticCooldown:0,nightCycle:game?{...game.nightCycle}:{waveCount:1},build: BUILD,patch:PATCH_ID,threatUnlocks:{...UNLOCKS},availableThreats:game?availableThreats(game.t):[],
      survivalTimer:game?game.survivalTimer:0,escapeOverdriveTimer:game?game.escapeOverdriveTimer:0,feralInstinctOverdrive:game?game.feralInstinctOverdrive:0,
      runicRelic:game?{...game.runicRelic,items:game.runicRelic.items.map(i=>({...i}))}:null,offered:game?[...(game.offered||[])]:[],lastNotice:game&&game.lastNotice?{...game.lastNotice}:null, mode: game ? game.mode : 'ready',
      time: game ? game.t : 0,
      run:game?game.run:completedRuns+1,runScale:game?game.runScale:1,
      difficulty:game?difficulty():1,bossEncounters:game?game.bossEncounters:0,
      escapeArmed:!!(game&&game.escapeArmed),
      upgradeAvailability:game?Object.fromEntries(upgradeIds.map(k=>[k,upgradeAvailable(k)])):{},
      score:game?Math.floor(game.t*2+game.kills*7+game.fish*9):0,
      kills:game?game.kills:0,fish:game?game.fish:0,xp:game?game.xp:0,wave:game?game.wave:1,
      escape:game?game.escape:0,escapeCooldown:game?game.escapeCooldown:0,edgeWarning:!!(game&&game.edgeWarning),
      music:{enabled:!muted,active:!!(audio&&musicBus&&!muted&&game&&game.mode==='running'),beat:musicBeat,boss:!!(game&&game.enemies.some(e=>e.variant==='boss'))},
      pendingUpgrade:!!(game&&game.pendingUpgrade),
      fishItems:game?game.fishItems.map(f=>({...f})):[],
      powerups:game?game.powerups.map(f=>({...f})):[],buffs:game?{...game.buffs}:{},
      bossMilestone:game?game.bossMilestone:0,
      beacons:[],beaconCharges:0,offerSeed:game?game.offerSeed:null,offerState:game?game.offerState:null,companionSquad:game?game.companionSquad.map(c=>({...c})):[],squadStats:game?{...game.squadStats}:{},
      activeCompanion:game&&game.companionSquad[0]?{...game.companionSquad[0]}:null,
      companionRanks:game?{...game.companionRanks}:{},feralInstinct:game?{...game.feralInstinct}:null,
      effectiveBuffs:game?{...game.effectiveBuffs}:{},
      petCompanion:game&&game.companionSquad[0]?{...game.companionSquad[0]}:null,
      toxicGasClouds:game?game.hazards.toxicGasClouds.map(c=>({...c,radius:gasRadius(c)})):[],
      gasSpawnTimer:game?game.hazards.spawnTimer:0,
      pickupEffects:game?game.pickupEffects.map(f=>({...f})):[],
      upgrades:game?game.upgrades.map(u=>({...u})):[],
      enemies:game?game.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp,variant:e.variant,phase:e.phase,speed:e.speed,max:e.max,damage:e.damage,threat:enemyThreat(e),mutation:e.mutation||null,mutationTime:e.mutationTime||0,mutationAge:e.mutationAge||0})):[],
      shots:game?game.shots.map(s=>({x:s.x,y:s.y,life:s.life,kind:s.kind,bounces:s.bounces,damage:s.damage,critical:!!s.critical,hitDamage:s.calculateDamage?s.calculateDamage():s.damage})):[],
      input: pointer?{vx:pointer.vx,vy:pointer.vy}:null,
      player: game ? {x: game.player.x, y: game.player.y,survivalTimer:game.player.survivalTimer,survivalInstinctBuff:game.player.survivalInstinctBuff,hp:game.player.hp,maxHp:game.player.maxHp,
        autoFireDisabled:game.player.autoFireDisabled,silence:game.player.silence,phaseCooldown:game.player.phaseCooldown,petPicks:game.player.petPicks,
        xpGain:game.player.xpGain,level:game.player.level,damage:game.player.damage,speed:game.player.speed,
        shotInterval:game.player.shotInterval,multishot:game.player.multishot,ricochet:game.player.ricochet,magnet:game.player.magnet} : null})
  });
  window.spawnRelic=spawnRelic;
  last=performance.now();requestAnimationFrame(frame);
  window.CATACLYSM_BOOT.ready(BUILD);
})();
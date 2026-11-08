/* CATACLYSM: fully original mobile-first Canvas arcade by BoRHeZ Games. */
'use strict';
(function () {
  const BUILD = '0.8';
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), ctx = canvas.getContext('2d', {alpha:false});
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MIN_SHOT_INTERVAL = .24;
  const W = 720, H = 1000, TWO = Math.PI * 2;
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
  let seeded = 424242, stars = [], city = [], noticeTTL = 0;
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
  function upgradeAvailable(type) {
    const p=game.player;
    if(type.startsWith('beacon-'))return p.level%3===0 && p.level>=({fire:3,heal:6,magnet:9}[type.slice(7)]||Infinity) && game.beacons.length<2 && game.beaconCharges<3;
    if(type.startsWith('companion-'))return p.level%3===0 && p.level>=({shooter:3,healer:6,tank:9}[type.slice(10)]||Infinity) && game.companionRanks[type.slice(10)]<3;
    const special = ['multi-shot','ricochet','fish-magnet','pet-companion'].includes(type);
    if (special && (p.level%3!==0 || p.multishot+p.ricochet+p.magnet+p.petPicks>=4)) return false;
    const tier=Math.min(2,1+Math.floor(p.level/9));
    return type==='damage'?p.damage<3 : type==='speed'?p.speed<cfg.speed+108 :
      type==='fire-rate'?p.shotInterval>MIN_SHOT_INTERVAL :
      type==='multi-shot'?p.multishot<Math.min(2,tier) :
      type==='ricochet'?p.ricochet<Math.min(2,tier) :
      type==='pet-companion'?p.petPicks<Math.min(2,tier)&&!game.entities.petCompanion :
      type==='fish-magnet'?p.magnet<Math.min(2,tier) : type==='recover';
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
      g.escapeArmed=false;g.escape=2.5;g.escapeCooldown=10.5;p.inv=Math.max(p.inv,2.5);
      for(const e of g.enemies){const d=dist(e.x,e.y,p.x,p.y);
        if(d<210){const a=Math.atan2(e.y-p.y,e.x-p.x);
          e.x=clamp(p.x+Math.cos(a)*230,20,2380);e.y=clamp(p.y+Math.sin(a)*230,20,2380);}}
      notify('ESCAPE SHIELD · Follow the arrow inward',2.5);sound(740,.18);
    }
  }
  function notify(message,duration=1.5) {
    $('notice').textContent=message; $('notice').hidden=false; noticeTTL=duration;
  }
  function start() {
    recordRun();
    seeded=(Date.now()^0xD00DCA7)>>>0;
    initMap();
    const player={x:1200,y:1200,r:21,hp:3,maxHp:3,inv:0,speed:cfg.speed,
      autoFireDisabled:false,silence:0,phaseCooldown:0,petPicks:0,shots:0,aim:0,level:1,damage:1,multishot:0,ricochet:0,magnet:0,shotInterval:Math.max(MIN_SHOT_INTERVAL,cfg.shotInterval)};
    game={mode:'running',t:0,run:completedRuns+1,runScale:1+Math.log2(1+completedRuns)*.18,runRecorded:false,bossEncounters:0,player,enemies:[],shots:[],fishItems:[],particles:[],pickupEffects:[],spawnCount:0,
      beacons:[],beaconCharges:0,beaconType:'fire',activeCompanion:null,companionRanks:{shooter:0,healer:0,tank:0},
      feralInstinct:{active:false,timer:0,duration:6,armed:true},effectiveBuffs:{speed:1,damage:1,fire:1,magnet:0,healing:0,mitigation:0},
      entities:{petCompanion:null},hazards:{toxicGasClouds:[],spawnTimer:0},powerups:[],buffs:{rage:0,magnet:0},nextPower:18,powerCount:0,bossMilestone:0,
      escape:0,escapeCooldown:0,escapeArmed:true,edgeWarning:false,kills:0,fish:0,xp:0,upgrades:[],pendingUpgrade:false,wave:1,spawn:0,shake:0,now:0};
    clearInput(); noticeTTL=0;$('notice').hidden=true;$('upgrade-overlay').hidden=true;
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
      game.player.maxHp=Math.min(6,game.player.maxHp+1);
      game.player.hp=Math.min(game.player.maxHp,game.player.hp+1);
    }
    $('upgrade-title').textContent='LEVEL '+game.player.level+(milestone?' · SPECIAL':' · CHOOSE ONE');
    $('upgrade-copy').textContent=milestone?'+1 heart, max HP cap 6. Specials: four total picks; tier 2 at level 9. Combat frozen.':'Combat paused. Choose one. Every third level: specials and +1 heart.';
    document.querySelectorAll('[data-special]').forEach(b=>{b.hidden=!milestone || (b.dataset.unlock && game.player.level<Number(b.dataset.unlock));});
    $('upgrade-overlay').hidden=false;$('pause').hidden=true;
    updateHud();sound(1050,.2);
    document.querySelectorAll('[data-upgrade]').forEach(b=>{
      b.disabled=!upgradeAvailable(b.dataset.upgrade);
      b.title=b.disabled?'Cap reached or special budget exhausted':'';
    });
    $('upgrade-overlay').querySelector('button:not([hidden]):not(:disabled)').focus({preventScroll:true});
  }
  function chooseUpgrade(type) {
    if(!game||game.mode!=='upgrade'||!game.pendingUpgrade||!upgradeAvailable(type))return;
    const p=game.player;
    if(type==='fire-rate')p.shotInterval=Math.max(MIN_SHOT_INTERVAL,p.shotInterval*.85);
    else if(type==='damage')p.damage=Math.min(3,p.damage+.25);
    else if(type==='recover')p.hp=Math.min(p.maxHp,p.hp+1);
    else if(type==='speed')p.speed=Math.min(cfg.speed+108,p.speed+18);
    else if(type==='pet-companion'){p.petPicks++;summonCompanion('shooter');}
    else if(type.startsWith('companion-')){const role=type.slice(10);game.companionRanks[role]++;summonCompanion(role);}
    else if(type.startsWith('beacon-')){game.beaconType=type.slice(7);game.beaconCharges=Math.min(3,game.beaconCharges+2);deployBeacon(true);}
    else if(p.level%3===0&&type==='multi-shot')p.multishot=Math.min(2,p.multishot+1);
    else if(p.level%3===0&&type==='ricochet')p.ricochet=Math.min(2,p.ricochet+1);
    else if(p.level%3===0&&type==='fish-magnet')p.magnet=Math.min(2,p.magnet+1);
    else return;
    game.upgrades.push({level:p.level,type});game.pendingUpgrade=false;
    $('upgrade-overlay').hidden=true;$('pause').hidden=false;
    clearInput();p.inv=Math.max(p.inv,1);game.mode='running';last=performance.now();notify('UPGRADE EQUIPPED');
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
  function spawnEnemy() {
    if(game.mode!=='running'||game.enemies.length>=cfg.maxEnemies)return;
    const p=game.player,position=safeSpawn(rnd(560,730));
    game.spawnCount++;
    let variant=(p.level>=3||p.speed>cfg.speed) ? (game.spawnCount%4===1?'weaver':game.spawnCount%4===3?'dasher':'shambler'):'shambler';
    if(game.wave>=5&&game.spawnCount%5===0)variant='stalker';
    else if(game.wave>=3&&game.spawnCount%3===0)variant='orbiter';
    if(game.wave>=6&&game.spawnCount%9===0)variant='ghost';
    const scale=difficulty();
    const extra=(game.t>70&&rand()<.17&&variant==='shambler')?2:1;
    game.enemies.push({...position,
      variant,dash:0,r:variant==='weaver'?15:extra===2?25:18, hp:(cfg.enemyHp+(extra-1)*3)*scale, max:(cfg.enemyHp+(extra-1)*3)*scale,
      damage:1+Math.floor((scale-1)/1.5),
      speed:cfg.enemySpeed*(.85+rand()*.5)*(1+Math.min(.45,game.t/400)),
      phase:rnd(0,TWO),weight:extra,hurt:0});
  }
  function shotAtEnemy() {
    if(game.player.autoFireDisabled||!game.enemies.length)return;
    const p=game.player;
    let enemy=null,best=460;
    for(const e of game.enemies){const d=dist(e.x,e.y,p.x,p.y);if(d<best){best=d;enemy=e;}}
    if(!enemy)return;
    const dx=(enemy.x-p.x)/best,dy=(enemy.y-p.y)/best;
    p.aim=Math.atan2(dy,dx);
    for(let i=-p.multishot;i<=p.multishot;i++){
      const a=p.aim+i*.18;
      game.shots.push({x:p.x+dx*18,y:p.y+dy*18,vx:Math.cos(a)*600,vy:Math.sin(a)*600,
        life:.85+p.ricochet*.25,r:6,damage:p.damage*game.effectiveBuffs.damage,bounces:p.ricochet,hit:[],
        kind:p.multishot>0?'spread':'normal',trail:[],flash:0});
    }
    sound(420+rnd(0,140),.05,'square',.018);
  }
  // Content updates use simulation seconds, so pause and upgrades freeze every timer.
  // All support lifetimes use simulation seconds. The legacy pet alias remains read-only in diagnostics.
  function summonCompanion(type='shooter') {
    const p=game.player,rank=game.companionRanks[type];
    const life=35+Math.min(20,(p.level-1)*2)+rank*5;
    game.activeCompanion={type,rank,x:clamp(p.x+45,25,2375),y:p.y,r:13,life,duration:life,shotTimer:0,flash:0};
    game.entities.petCompanion=game.activeCompanion;
  }
  function updateCompanion(dt) {
    const g=game,p=g.player,pet=g.activeCompanion;
    if(!pet)return;
    pet.life-=dt;pet.flash=Math.max(0,pet.flash-dt);
    if(pet.life<=0){g.activeCompanion=null;g.entities.petCompanion=null;notify('COMPANION · See you next time');return;}
    // Tank moves toward the nearest threat; other familiars follow behind the cat.
    let nearest=null,best=420;
    for(const e of g.enemies){const d=dist(pet.x,pet.y,e.x,e.y);if(d<best){best=d;nearest=e;}}
    const a=nearest?Math.atan2(nearest.y-p.y,nearest.x-p.x):0;
    const tx=clamp(p.x+(pet.type==='tank'?Math.cos(a)*65:48),25,2375);
    const ty=clamp(p.y+(pet.type==='tank'?Math.sin(a)*65:pet.type==='healer'?-45:35),25,2375);
    const d=Math.max(1,dist(pet.x,pet.y,tx,ty)),step=Math.min(d,(p.speed+90)*dt);
    pet.x+=(tx-pet.x)/d*step;pet.y+=(ty-pet.y)/d*step;
    pet.shotTimer-=dt;
    if(pet.shotTimer>0||!nearest)return;
    // Every role can fire through silence; shooter has the strongest independent weapon.
    const angle=Math.atan2(nearest.y-pet.y,nearest.x-pet.x);
    g.shots.push({x:pet.x,y:pet.y,vx:Math.cos(angle)*600,vy:Math.sin(angle)*600,
      life:.85,r:5,damage:p.damage*g.effectiveBuffs.damage*(pet.type==='shooter'?.5:.25)*(1+Math.min(.5,p.level*.02)+pet.rank*.1),bounces:0,
      hit:[],kind:'pet',trail:[],flash:0});
    pet.flash=.15;pet.shotTimer=(pet.type==='shooter'?.8:1.4)/(1+pet.rank*.1);
  }
  class Beacon {
    constructor(type,x,y){this.type=type;this.x=x;this.y=y;this.radius=150;this.duration=15;this.life=15;}
    update(dt){this.life-=dt;return this.life>0;}
  }
  function deployBeacon(fromUpgrade=false){
    if(!game || (!fromUpgrade&&game.mode!=='running') || game.beaconCharges<=0 || game.beacons.length>=2)return false;
    game.beacons.push(new Beacon(game.beaconType,game.player.x,game.player.y));game.beaconCharges--;
    notify('BEACON · '+game.beaconType.toUpperCase()+' · 15s');updateHud();return true;
  }
  $('deploy-beacon').onclick=()=>deployBeacon();
  $('beacon-type').onchange=()=>{if(game)game.beaconType=$('beacon-type').value;};
  function updateSupport(dt){
    const g=game,p=g.player,f=g.feralInstinct;
    g.beacons=g.beacons.filter(b=>b.update(dt));
    let nearby=0;
    for(const e of g.enemies)if(e.hp>0&&(e.x-p.x)**2+(e.y-p.y)**2<=10000)nearby++;
    if(f.active){
      f.timer=Math.max(0,f.timer-dt);
      if(f.timer===0){f.active=false;notify('FERAL INSTINCT · Ended. Escape the crowd to rearm',2);}
    }else if(nearby<3)f.armed=true;
    else if(f.armed){f.active=true;f.armed=false;f.timer=f.duration;notify('FERAL INSTINCT ACTIVE · 6s',2);}
    const b={speed:f.active?1.3:1,damage:Math.min(2.5,1+(g.buffs.rage>0?1:0)+(f.active?.25:0)),fire:1,magnet:0,healing:0,mitigation:0};
    for(const beacon of g.beacons)if((beacon.x-p.x)**2+(beacon.y-p.y)**2<=beacon.radius**2){
      if(beacon.type==='fire')b.fire+=.35;
      if(beacon.type==='heal')b.healing+=.12;
      if(beacon.type==='magnet')b.magnet+=100;
    }
    const ally=g.activeCompanion;
    if(ally&&ally.life>dt&&dist(ally.x,ally.y,p.x,p.y)<180){
      if(ally.type==='healer')b.healing+=.10+ally.rank*.025+Math.min(.05,p.level*.003);
      if(ally.type==='tank')b.mitigation=.2+ally.rank*.04+Math.min(.08,p.level*.005);
    }
    b.fire=Math.min(1.7,b.fire);b.magnet=Math.min(180,b.magnet);b.healing=Math.min(.3,b.healing);b.mitigation=Math.min(.4,b.mitigation);
    g.effectiveBuffs=b;
    p.hp=Math.min(p.maxHp,p.hp+b.healing*dt);
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
    const g=game,p=g.player,pet=g.entities.petCompanion;
    // Keep the full cloud inside the map, outside the cat, ally and ghost bodies.
    for(let i=0;i<32;i++){
      const spot=safeSpawn(rnd(270,380),130);
      if(dist(spot.x,spot.y,p.x,p.y)<250||
        (pet&&dist(spot.x,spot.y,pet.x,pet.y)<160)||
        g.enemies.some(e=>e.variant==='ghost'&&dist(spot.x,spot.y,e.x,e.y)<140))continue;
      return {...spot,age:0};
    }
    return null;
  }
  function updateGas(dt) {
    const g=game,p=g.player,h=g.hazards;
    if(g.wave<8)return;
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
      if(p.inv===0){p.hp=Math.max(0,p.hp-(1-g.effectiveBuffs.mitigation));p.inv=.35;g.shake=.3;
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
    if(game.enemies.length>=cfg.maxEnemies){const i=game.enemies.findIndex(e=>e.variant!=='boss');if(i<0)return;game.enemies.splice(i,1);}
    game.bossEncounters++;
    const hp=(65+night*4)*game.runScale*Math.pow(1.55,game.bossEncounters-1);
    game.enemies.push({...safeSpawn(650,60),
      variant:'boss',r:44,hp,max:hp,damage:2+Math.floor((game.bossEncounters-1)/2),speed:cfg.enemySpeed,phase:0,weight:20,hurt:0,night});
    notify('NIGHT '+night+' · THE ALLEY KING',3);sound(110,.5,'sawtooth');
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
    g.t+=dt;g.shake=Math.max(0,g.shake-dt*5);
    g.wave=1+Math.floor(g.t/24);
    const milestone=Math.floor(g.wave/10)*10;
    if(milestone>g.bossMilestone){g.bossMilestone=milestone;spawnBoss(milestone);}
    for(const key of Object.keys(g.buffs))g.buffs[key]=Math.max(0,g.buffs[key]-dt);
    if(g.t>=g.nextPower){
      const angle=rnd(0,TWO);dropPower(p.x+Math.cos(angle)*170,p.y+Math.sin(angle)*170,
        ['rage','magnet','heal'][g.powerCount++%3]);g.nextPower+=24;
    }
    g.spawn-=dt;p.inv=Math.max(0,p.inv-dt);
    if(g.spawn<=0){
      spawnEnemy();g.spawn=Math.max(.24,cfg.spawnInterval/(1+g.t*cfg.spawnRamping));
    }
    edgeAid(dt);
    updateSupport(dt);
    updateGas(dt);if(g.mode!=='running')return;
    updateGhosts(dt);updateCompanion(dt);
    const input=moveInput();p.x=clamp(p.x+input.x*p.speed*g.effectiveBuffs.speed*dt,25,2375);
    p.y=clamp(p.y+input.y*p.speed*g.effectiveBuffs.speed*dt,25,2375);
    p.shots-=dt;if(p.shots<=0){shotAtEnemy();p.shots=Math.max(MIN_SHOT_INTERVAL/1.7,p.shotInterval/g.effectiveBuffs.fire);}
    for(const enemy of g.enemies){
      const dx=p.x-enemy.x,dy=p.y-enemy.y, d=Math.max(1,Math.hypot(dx,dy));
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
      // Extra speed is countered dynamically, including enemies already alive.
      // Far pursuers close the gap; nearby dashes remain telegraphed and dodgeable.
      const adaptation=Math.max(0,p.speed-cfg.speed)*.85;
      const beaconPressure=g.beacons.some(b=>dist(b.x,b.y,enemy.x,enemy.y)<b.radius+100)?1.08:1;
      const chase=beaconPressure*(d>330?Math.max(enemy.speed+adaptation,p.speed*1.08):enemy.speed+adaptation);
      enemy.x=clamp(enemy.x+vx*chase*pace*dt,20,2380);
      enemy.y=clamp(enemy.y+vy*chase*pace*dt,20,2380);
      enemy.phase+=dt*3;enemy.hurt=Math.max(0,enemy.hurt-dt);
      if(g.mode==='running'&&!g.pendingUpgrade&&d<p.r+enemy.r-3&&p.inv===0){
        p.hp=Math.max(0,p.hp-enemy.damage*(1-g.effectiveBuffs.mitigation));p.inv=1.3;g.shake=.6;burst(p.x,p.y,'#fb7995',14);
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
        const e=g.enemies[idx];e.hp-=s.damage;e.hurt=.12;burst(s.x,s.y,'#a5f8ff',4);
        s.hit.push(e);
        if(s.bounces>0){
          s.bounces--;s.kind='bounce';s.flash=.16;burst(s.x,s.y,'#ffd568',9);
          const next=g.enemies.filter(n=>!s.hit.includes(n)).sort((a,b)=>dist(a.x,a.y,s.x,s.y)-dist(b.x,b.y,s.x,s.y))[0];
          if(next){const a=Math.atan2(next.y-s.y,next.x-s.x);s.vx=Math.cos(a)*600;s.vy=Math.sin(a)*600;s.life=Math.max(.5,s.life);}
          else {s.vx*=-1;s.vy*=-1;}
        }else g.shots.splice(i,1);
        if(e.hp<=0){
          g.kills+=e.weight;burst(e.x,e.y,'#93eaac',14);
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
        g.fish+=f.value;g.xp+=f.value;g.fishItems.splice(i,1);burst(f.x,f.y,'#f5cf75',7);
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
    if(noticeTTL>0){noticeTTL-=dt;if(noticeTTL<=0)$('notice').hidden=true;}
    updateHud();
  }
  function updateHud(){
    if(!game)return;
    $('time').textContent=String(Math.floor(game.t/60)).padStart(2,'0')+':'+
      String(Math.floor(game.t%60)).padStart(2,'0');
    $('score').textContent=Math.floor(game.t*2+game.kills*7+game.fish*9);
    $('build-stats').textContent='Speed '+Math.round(game.player.speed)+' · Damage '+game.player.damage.toFixed(2)+
      ' · Shots/s '+(1/game.player.shotInterval).toFixed(2)+' · Spread '+(1+game.player.multishot*2)+
      ' · Bounces '+game.player.ricochet+' · Pickup '+Math.round(135+game.player.magnet*65+(game.player.speed-cfg.speed)*2/3)+'px';
    $('fish').textContent=game.fish;$('kills').textContent=game.kills;
    const p=game.player;
    $('support-controls').hidden=p.level<3;
    $('deploy-beacon').disabled=game.mode!=='running'||game.beaconCharges===0||game.beacons.length>=2;
    $('deploy-beacon').textContent='Deploy beacon · '+game.beaconCharges;
    for(const option of $('beacon-type').options)option.disabled=p.level<Number(option.dataset.level);
    $('beacon-type').value=game.beaconType;
    $('support-status').textContent=[game.feralInstinct.active?'FERAL INSTINCT ACTIVE '+Math.ceil(game.feralInstinct.timer)+'s':'',
      game.activeCompanion?game.activeCompanion.type.toUpperCase()+' '+Math.ceil(game.activeCompanion.life)+'s':'',
      game.beacons.length?'BEACONS '+game.beacons.length+'/2':'',
      game.effectiveBuffs.fire>1?'FIRE +'+Math.round((game.effectiveBuffs.fire-1)*100)+'%':'',
      game.effectiveBuffs.healing>0?'REGEN':'',game.effectiveBuffs.mitigation>0?'GUARD':'',game.effectiveBuffs.magnet>0?'MAGNET +'+game.effectiveBuffs.magnet:''].filter(Boolean).join(' · ');
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
    for(const b of g.beacons){
      const color=b.type==='fire'?'#ffce86':b.type==='heal'?'#7cf2d0':'#b9a6ff';
      ctx.save();ctx.globalAlpha=.12;circle(b.x,b.y,b.radius,color);ctx.restore();
      outline(b.x,b.y,b.radius,color,2);circle(b.x,b.y,12,color);
      ctx.fillStyle=color;ctx.font='bold 16px system-ui';ctx.textAlign='center';
      ctx.fillText(b.type.toUpperCase()+' '+Math.ceil(b.life)+'s',b.x,b.y-22);ctx.textAlign='left';
    }
    const pet=g.entities.petCompanion;
    if(pet){
      ctx.save();ctx.translate(pet.x,pet.y);
      circle(0,8,15,'#000a15aa');circle(0,0,13,pet.type==='healer'?'#7cf2d0':pet.type==='tank'?'#a6b7ff':'#ffce86');
      if(pet.type!=='shooter')outline(0,0,pet.type==='tank'?23:19,pet.type==='tank'?'#a6b7ff':'#7cf2d0',3);
      polygon(0,0,[[-11,-5],[-12,-21],[-2,-12]],'#ffce86');
      polygon(0,0,[[11,-5],[12,-21],[2,-12]],'#ffce86');
      circle(-5,0,2,'#173141');circle(5,0,2,'#173141');
      if(pet.flash>0)outline(0,0,19,'#ffe7ab',3);
      ctx.fillStyle='#ffddaa';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(Math.ceil(pet.life)+'s',0,30);ctx.textAlign='left';ctx.restore();
    }
    for(const s of g.shots){
      const color=s.kind==='pet'?'#ffce86':s.kind==='bounce'?'#ffd568':s.kind==='spread'?'#ff94cd':'#71e5ff';
      if(s.trail.length){
        ctx.beginPath();ctx.moveTo(s.trail[0].x,s.trail[0].y);
        for(const point of s.trail)ctx.lineTo(point.x,point.y);
        ctx.lineTo(s.x,s.y);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();
      }
      circle(s.x,s.y,s.kind==='normal'?5:7,color);
      if(s.flash>0)outline(s.x,s.y,15,'#fff1a6',3);
    }
    for(const e of [...g.enemies.filter(e=>e.variant!=='ghost'),...g.enemies.filter(e=>e.variant==='ghost')]){
      ctx.save();if(e.variant==='ghost')ctx.globalAlpha=.62;ctx.translate(e.x,e.y);ctx.rotate(reducedMotion?0:Math.sin(e.phase)*.08);
      circle(0,9,e.r*1.04,'#070d15a0');
      const color=e.variant==='ghost'?'#c7adff':e.variant==='orbiter'?'#65d6ef':e.variant==='stalker'?'#ffdb76':e.variant==='boss'?'#e56d9f':e.variant==='weaver'?'#b294ed':e.variant==='dasher'?'#f6af62':'#6faa8f';
      if((e.variant==='dasher'&&e.phase%9<2)||(e.variant==='boss'&&e.phase%7<2))outline(0,0,e.r+8,'#ffe6a1',3);
      if(e.variant==='ghost')outline(0,0,e.r+9,'#c7adff',3);
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
    ctx.fillStyle='#0a172bee';ctx.fillRect(10,10,240,78);
    const boss=g.enemies.find(e=>e.variant==='boss');
    if(boss){ctx.fillStyle='#101b2f';ctx.fillRect(260,16,330,48);
      ctx.fillStyle='#ffd1e4';ctx.font='bold 15px system-ui';ctx.fillText('ALLEY KING · NIGHT '+boss.night,270,34);
      ctx.fillStyle='#48243c';ctx.fillRect(270,44,310,10);ctx.fillStyle='#f783b0';ctx.fillRect(270,44,310*boss.hp/boss.max,10);}
    ctx.fillStyle='#8bdac9';ctx.font='bold 15px system-ui';ctx.fillText('NIGHT '+g.wave,20,35);
    ctx.fillStyle='#9ab8c2';ctx.font='13px system-ui';ctx.fillText('CAT LVL '+p.level,20,56);
    ctx.fillStyle='#ffdda5';ctx.fillText(Object.entries(g.buffs).filter(([,v])=>v>0).map(([k,v])=>k.toUpperCase()+' '+Math.ceil(v)+'s').join(' · '),20,76);
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
    pointer.vx=dx/Math.max(55,d);pointer.vy=dy/Math.max(55,d);
    const scale=canvas.getBoundingClientRect().width/W;
    $('thumb').style.transform='translate('+pointer.vx*33*scale+'px,'+pointer.vy*33*scale+'px)';
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
      pointer.vx = dx / Math.max(55, d);
      pointer.vy = dy / Math.max(55, d);
      const scale = canvas.getBoundingClientRect().width / W;
      $('thumb').style.transform = 'translate(' + pointer.vx * 33 * scale + 'px,' + pointer.vy * 33 * scale + 'px)';
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
  renderBest();
  // Read-only snapshots let QA verify simulation progress without changing game state.
  window.CATACLYSM_DIAGNOSTICS = Object.freeze({
    snapshot: () => ({build: BUILD, mode: game ? game.mode : 'ready',
      time: game ? game.t : 0,
      run:game?game.run:completedRuns+1,runScale:game?game.runScale:1,
      difficulty:game?difficulty():1,bossEncounters:game?game.bossEncounters:0,
      escapeArmed:!!(game&&game.escapeArmed),
      upgradeAvailability:game?Object.fromEntries(['damage','speed','fire-rate','multi-shot','ricochet','fish-magnet','pet-companion','recover','beacon-fire','beacon-heal','beacon-magnet','companion-shooter','companion-healer','companion-tank'].map(k=>[k,upgradeAvailable(k)])):{},
      score:game?Math.floor(game.t*2+game.kills*7+game.fish*9):0,
      kills:game?game.kills:0,fish:game?game.fish:0,xp:game?game.xp:0,wave:game?game.wave:1,
      escape:game?game.escape:0,escapeCooldown:game?game.escapeCooldown:0,edgeWarning:!!(game&&game.edgeWarning),
      music:{enabled:!muted,active:!!(audio&&musicBus&&!muted&&game&&game.mode==='running'),beat:musicBeat,boss:!!(game&&game.enemies.some(e=>e.variant==='boss'))},
      pendingUpgrade:!!(game&&game.pendingUpgrade),
      fishItems:game?game.fishItems.map(f=>({...f})):[],
      powerups:game?game.powerups.map(f=>({...f})):[],buffs:game?{...game.buffs}:{},
      bossMilestone:game?game.bossMilestone:0,
      beacons:game?game.beacons.map(b=>({...b})):[],beaconCharges:game?game.beaconCharges:0,
      activeCompanion:game&&game.activeCompanion?{...game.activeCompanion}:null,
      companionRanks:game?{...game.companionRanks}:{},feralInstinct:game?{...game.feralInstinct}:null,
      effectiveBuffs:game?{...game.effectiveBuffs}:{},
      petCompanion:game&&game.entities.petCompanion?{...game.entities.petCompanion}:null,
      toxicGasClouds:game?game.hazards.toxicGasClouds.map(c=>({...c,radius:gasRadius(c)})):[],
      gasSpawnTimer:game?game.hazards.spawnTimer:0,
      pickupEffects:game?game.pickupEffects.map(f=>({...f})):[],
      upgrades:game?game.upgrades.map(u=>({...u})):[],
      enemies:game?game.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp,variant:e.variant,phase:e.phase,speed:e.speed,max:e.max,damage:e.damage})):[],
      shots:game?game.shots.map(s=>({x:s.x,y:s.y,life:s.life,kind:s.kind,bounces:s.bounces,damage:s.damage})):[],
      input: pointer?{vx:pointer.vx,vy:pointer.vy}:null,
      player: game ? {x: game.player.x, y: game.player.y,hp:game.player.hp,maxHp:game.player.maxHp,
        autoFireDisabled:game.player.autoFireDisabled,silence:game.player.silence,phaseCooldown:game.player.phaseCooldown,petPicks:game.player.petPicks,
        level:game.player.level,damage:game.player.damage,speed:game.player.speed,
        shotInterval:game.player.shotInterval,multishot:game.player.multishot,ricochet:game.player.ricochet,magnet:game.player.magnet} : null})
  });
  last=performance.now();requestAnimationFrame(frame);
  window.CATACLYSM_BOOT.ready(BUILD);
})();
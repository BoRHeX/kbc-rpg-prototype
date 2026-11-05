/* CATACLYSM: fully original mobile-first Canvas arcade by BoRHeZ Games. */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), ctx = canvas.getContext('2d', {alpha:false});
  const W = 720, H = 1000, TWO = Math.PI * 2;
  const cfg = {speed:235,enemySpeed:63,spawnInterval:1.65,shotInterval:.62,
    enemyHp:3,spawnRamping:.010,fishDropChance:.65,maxEnemies:95};
  fetch('/game-config.json').then(r => r.ok ? r.json() : null).then(data => {
    if (!data || typeof data !== 'object') return;
    for (const [key, value] of Object.entries(data)) {
      if (Object.hasOwn(cfg, key) && typeof value === 'number' &&
          Number.isFinite(value) && value > 0) cfg[key] = value;
    }
  }).catch(() => { /* defaults are a complete playable configuration */ });
  let game = null, last = 0, keys = {}, pointer = null, muted = false, audio = null;
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
  function saveBest() {
    if (!game) return;
    const score = Math.floor(game.t*2 + game.kills*7 + game.fish*9);
    const previous = Number(localStorage.getItem('cataclysm-best')||0);
    try { if(score > previous) localStorage.setItem('cataclysm-best',String(score)); }
    catch (err) { /* storage may be disabled */ }
    $('best').textContent = 'BEST SCORE: '+Math.max(score,previous).toLocaleString();
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
    }catch(e){/* optional audio */ }
  }
  function notify(message,duration=1.5) {
    $('notice').textContent=message; $('notice').hidden=false; noticeTTL=duration;
  }
  function start() {
    seeded=(Date.now()^0xD00DCA7)>>>0;
    initMap();
    const player={x:1200,y:1200,r:21,hp:3,maxHp:3,inv:0,speed:cfg.speed,
      shots:0,aim:0,level:1,damage:1};
    game={mode:'running',t:0,player,enemies:[],shots:[],fishItems:[],particles:[],
      kills:0,fish:0,xp:0,wave:1,spawn:0,shake:0,now:0};
    pointer=null; $('start-overlay').hidden=true; $('pause').hidden=false;
    $('pause').textContent='Ⅱ';$('stick').hidden=true;
    sound(700,.12);last=performance.now();updateHud();
  }
  function end() {
    if(!game || game.mode==='dead')return;
    game.mode='dead';saveBest();$('overlay-title').textContent='NINE LIVES. ZERO LEFT.';
    $('overlay-copy').textContent='You survived '+Math.floor(game.t)+' seconds, defeated '+
      game.kills+' zombies, and rescued '+game.fish+' fish. Ready for another run?';
    $('play').textContent='↻ PLAY AGAIN'; $('start-overlay').hidden=false;
    $('pause').hidden=true;$('stick').hidden=true;pointer=null;sound(150,.4,'triangle');
  }
  function pause() {
    if(!game || game.mode==='dead')return;
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
    if(game.enemies.length>=cfg.maxEnemies)return;
    const p=game.player,angle=rnd(0,TWO),r=rnd(520,730);
    const extra=(game.t>70&&rand()<.17)?2:1;
    game.enemies.push({x:clamp(p.x+Math.cos(angle)*r,30,2370),y:clamp(p.y+Math.sin(angle)*r,30,2370),
      r:extra===2?25:18, hp:cfg.enemyHp+(extra-1)*3, max:cfg.enemyHp+(extra-1)*3,
      speed:cfg.enemySpeed*(.85+rand()*.5)*(1+Math.min(.45,game.t/400)),
      phase:rnd(0,TWO),weight:extra,hurt:0});
  }
  function shotAtEnemy() {
    if(!game.enemies.length)return;
    const p=game.player;
    let enemy=null,best=460;
    for(const e of game.enemies){const d=dist(e.x,e.y,p.x,p.y);if(d<best){best=d;enemy=e;}}
    if(!enemy)return;
    const dx=(enemy.x-p.x)/best,dy=(enemy.y-p.y)/best;
    p.aim=Math.atan2(dy,dx);
    game.shots.push({x:p.x+dx*18,y:p.y+dy*18,vx:dx*600,vy:dy*600,
      life:.85,r:6,damage:p.damage});
    sound(420+rnd(0,140),.05,'square',.018);
  }
  function burst(x,y,col,n=10) {
    for(let i=0;i<n;i++){const a=rnd(0,TWO),s=rnd(50,205);
      game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
        life:rnd(.18,.55),ttl:.55,col,r:rnd(2,5)});
    }
  }
  function tick(dt) {
    const g=game,p=g.player;
    g.t+=dt;g.shake=Math.max(0,g.shake-dt*5);
    g.wave=1+Math.floor(g.t/24);g.spawn-=dt;p.inv=Math.max(0,p.inv-dt);
    if(g.spawn<=0){
      spawnEnemy();g.spawn=Math.max(.24,cfg.spawnInterval/(1+g.t*cfg.spawnRamping));
    }
    const input=moveInput();p.x=clamp(p.x+input.x*p.speed*dt,25,2375);
    p.y=clamp(p.y+input.y*p.speed*dt,25,2375);
    p.shots-=dt;if(p.shots<=0){shotAtEnemy();p.shots=cfg.shotInterval/(1+.1*(p.level-1));}
    for(const enemy of g.enemies){
      const dx=p.x-enemy.x,dy=p.y-enemy.y, d=Math.max(1,Math.hypot(dx,dy));
      enemy.x+=dx/d*enemy.speed*dt;enemy.y+=dy/d*enemy.speed*dt;
      enemy.phase+=dt*3;enemy.hurt=Math.max(0,enemy.hurt-dt);
      if(d<p.r+enemy.r-3&&p.inv===0){
        p.hp--;p.inv=1.3;g.shake=.6;burst(p.x,p.y,'#fb7995',14);
        sound(190,.21,'sawtooth');if(p.hp<=0){end();return;}notify('OUCH! ♥ -1');
      }
    }
    for(let i=g.shots.length-1;i>=0;i--){
      const s=g.shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      if(s.life<=0){g.shots.splice(i,1);continue;}
      const idx=g.enemies.findIndex(e=>dist(e.x,e.y,s.x,s.y)<e.r+s.r);
      if(idx>=0){
        const e=g.enemies[idx];e.hp-=s.damage;e.hurt=.12;burst(s.x,s.y,'#a5f8ff',4);
        g.shots.splice(i,1);
        if(e.hp<=0){
          g.kills+=e.weight;burst(e.x,e.y,'#93eaac',14);
          if(rand()<cfg.fishDropChance)g.fishItems.push({x:e.x,y:e.y,r:12,ttl:14,phase:rnd(0,TWO)});
          g.enemies.splice(idx,1);sound(620,.06,'triangle',.02);
        }
      }
    }
    for(let i=g.fishItems.length-1;i>=0;i--){
      const f=g.fishItems[i];f.ttl-=dt;f.phase+=dt*4;
      const d=dist(f.x,f.y,p.x,p.y);
      if(d<135){f.x+=(p.x-f.x)/Math.max(d,1)*320*dt;f.y+=(p.y-f.y)/Math.max(d,1)*320*dt;}
      if(d<28){
        g.fish++;g.xp++;g.fishItems.splice(i,1);burst(f.x,f.y,'#f5cf75',7);
        sound(740,.09,'sine');
        if(g.xp>=7+p.level*3){
          g.xp=0;p.level++;p.maxHp=Math.min(6,p.maxHp+1);p.hp=Math.min(p.maxHp,p.hp+1);
          p.speed+=8;p.damage+=.25;notify('LEVEL '+p.level+' · CAT POWER UP!',2.2);sound(1050,.2);
        }
      }else if(f.ttl<=0) g.fishItems.splice(i,1);
    }
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
    $('fish').textContent=game.fish;$('kills').textContent=game.kills;
    $('health').textContent='♥'.repeat(game.player.hp)+'♡'.repeat(Math.max(0,game.player.maxHp-game.player.hp));
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
    ctx.translate(-cameraX+(rand()-.5)*g.shake*10,-cameraY+(rand()-.5)*g.shake*10);
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
      circle(f.x,f.y,18,'#dfc26b33');ctx.save();ctx.translate(f.x,f.y+Math.sin(f.phase)*4);
      polygon(9,0,[[0,0],[11,-8],[11,8]],'#f6cb62');
      ctx.fillStyle='#ffdc7b';ctx.beginPath();ctx.ellipse(0,0,12,7,0,0,TWO);ctx.fill();
      circle(-6,-1,1.6,'#523322');ctx.restore();
    }
    for(const s of g.shots){circle(s.x,s.y,10,'#7bffdd44');circle(s.x,s.y,5,'#b9fff1');}
    for(const e of g.enemies){
      ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.sin(e.phase)*.08);
      circle(0,9,e.r*1.04,'#070d15a0');
      circle(0,0,e.r,e.hurt?'#d2fff0':'#6faa8f');
      polygon(0,0,[[-e.r*.65,-e.r*.5],[-e.r*.9,-e.r*1.2],[-e.r*.12,-e.r*.8]],'#6faa8f');
      polygon(0,0,[[e.r*.65,-e.r*.5],[e.r*.9,-e.r*1.2],[e.r*.12,-e.r*.8]],'#6faa8f');
      circle(-e.r*.35,-2,3.4,'#fb8195');circle(e.r*.35,-2,3.4,'#fb8195');
      ctx.strokeStyle='#274d43';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,9);
      ctx.lineTo(0,12);ctx.lineTo(6,9);ctx.stroke();
      if(e.hp<e.max){ctx.fillStyle='#fa7e85';ctx.fillRect(-e.r,-e.r-14,e.r*2*(e.hp/e.max),4);}
      ctx.restore();
    }
    ctx.save();ctx.translate(p.x,p.y);
    circle(0,14,27,'#000a15aa');
    if(p.inv>0&&Math.floor(p.inv*12)%2===0)ctx.globalAlpha=.36;
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
    ctx.restore();
    const grad=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,650);
    grad.addColorStop(0,'#06132100');grad.addColorStop(1,'#030c1c99');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#8bdac9';ctx.font='bold 15px system-ui';ctx.fillText('NIGHT '+g.wave,20,35);
    ctx.fillStyle='#9ab8c2';ctx.font='13px system-ui';ctx.fillText('CAT LVL '+p.level,20,56);
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
    if(!pointer||ev.pointerId!==pointer.id)return;
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
      if (!pointer) return;
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
      if (!pointer) return;
      ev.preventDefault();
      pointer = null;
      $('stick').hidden = true;
      $('thumb').style.transform = 'translate(0,0)';
    }
    canvas.addEventListener('touchend', touchEnd, { passive: false });
    canvas.addEventListener('touchcancel', touchEnd, { passive: false });
  }
  window.addEventListener('keydown',ev=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(ev.key))ev.preventDefault();
    keys[ev.key]=true;if(ev.key==='Escape'||ev.key===' ')pause();
  });
  window.addEventListener('keyup',ev=>{keys[ev.key]=false;});
  window.addEventListener('blur',()=>{if(game&&game.mode==='running')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&game.mode==='running')pause();});
  $('play').onclick=resumeOrStart;$('pause').onclick=pause;
  $('restart').onclick=()=>{start();};$('mute').onclick=()=>{
    muted=!muted;$('mute').textContent=muted?'♪ Sound off':'♪ Sound on';
  };
  document.querySelectorAll('[data-tab]').forEach(btn=>{
    btn.onclick=()=>{
      const target=btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e===btn));
      ['game','factory','notes'].forEach(name=>$(name+'-tab').hidden=name!==target);
      if(target!=='game'&&game&&game.mode==='running')pause();
      if(target==='factory')loadCouncil();
    };
  });
  function agentCard(role,ev){
    const icons={Design:'✦',Balance:'⚖',Engineering:'⚙',Quality:'✓',Publishing:'↑'};
    const title=String(role||'Unknown');
    const status=ev&&ev.vote?String(ev.vote).toUpperCase():'NOT RUN';
    return '<article class="factory-card"><div class="symbol">'+(icons[title]||'◈')+'</div>'+
      '<b>'+escapeHTML(title)+'</b><p>'+escapeHTML(ev ? ev.argument : 'No automated experiment evidence loaded.')+'</p>'+
      '<span class="tag">'+escapeHTML(status)+'</span></article>';
  }
  function escapeHTML(s) {
    return String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  let councilLoaded=false;
  async function loadCouncil(){
    if(councilLoaded)return;
    councilLoaded=true;
    const crew=['Design','Balance','Engineering','Quality','Publishing'];
    try{
      const resp=await fetch('/factory-report.json',{cache:'no-cache'});
      if(!resp.ok)throw Error('No experiment report available ('+resp.status+')');
      const report=await resp.json();
      $('factory-status').textContent='REAL TEST RUN · '+report.status+' · '+(report.experiments||[]).length+
        ' candidate configurations evaluated';
      const ballots=report.ballots||[];
      $('factory-cards').innerHTML=crew.map(role=>agentCard(role,ballots.find(v=>v.department===role))).join('');
      const winner=report.recommendation||{};
      const options=(report.experiments||[]).slice(0,8).map(x=>
        '<div class="line"><b>'+escapeHTML(x.name)+'</b> · score '+escapeHTML(x.score)+
        ' · success '+escapeHTML(x.survival_rate)+' · average duration '+escapeHTML(x.avg_duration)+
        's</div>').join('');
      $('factory-report').innerHTML='<b>Development council proposal</b>'+
        '<p>'+escapeHTML(report.decision||'No decision')+'</p>'+
        '<p>Preferred candidate: <b>'+escapeHTML(winner.name||'none')+'</b></p>'+
        '<p>'+escapeHTML(report.limitations||'')+'</p><h3>Experiment results</h3>'+options;
    }catch(err){
      $('factory-status').textContent='No council report loaded: '+err.message;
      $('factory-cards').innerHTML=crew.map(x=>agentCard(x,null)).join('');
      $('factory-report').textContent='Run python game_factory/council.py to generate and inspect experimental evidence.';
    }
  }
  try { $('best').textContent='BEST SCORE: '+Number(localStorage.getItem('cataclysm-best')||0).toLocaleString(); }
  catch (err) {$('best').textContent='LOCAL SCORE UNAVAILABLE';}
  last=performance.now();requestAnimationFrame(frame);
})();
(() => {
  'use strict';
  const canvas = document.getElementById('canvas'), ctx = canvas.getContext('2d');
  const el = id => document.getElementById(id);
  const W = 360, H = 480, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'ready', time = 0, score = 0, hull = 3, invincible = 0, flash = 0;
  let player = {x:180,y:310}, cores = [], debris = [], sparks = [], pointer = null, target = null;
  let last = performance.now();
  const keys = new Set(), random = (a,b) => a + Math.random()*(b-a);
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  function core() {
    let p;
    for(let n=0;n<40;n++) {
      p={x:random(22,W-22),y:random(26,H-26)};
      if(Math.hypot(p.x-player.x,p.y-player.y)>65 && cores.every(c=>Math.hypot(c.x-p.x,c.y-p.y)>32)) break;
    }
    return p;
  }
  function setup() {
    time=0; score=0; hull=3; invincible=0; flash=0; sparks=[]; pointer=null; target=null; keys.clear();
    player={x:180,y:310}; cores=[];
    for(let i=0;i<5;i++) cores.push(core());
    debris=Array.from({length:6},(_,i)=>{
      const angle=random(0,Math.PI*2), speed=random(34,55);
      return {x:35+(i%3)*145,y:i<3?65:420,r:random(12,17),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,angle:random(0,6)};
    });
  }
  function ui() {
    el('score').textContent=score; el('time').textContent=Math.ceil(60-time)+'s'; el('hull').textContent=hull+' / 3';
    el('pause').disabled=mode==='ready'||mode==='over'; el('pause').textContent=mode==='paused'?'Resume':'Pause';
    el('overlay').hidden=mode==='running';
  }
  function start() {setup();mode='running';last=performance.now();ui();}
  function finish() {
    mode='over';target=null;pointer=null;keys.clear();
    el('status').textContent=hull?'EXTRACTION COMPLETE':'SIGNAL LOST';
    el('heading').textContent=hull?'You made it home.':'Ship lost. Cargo logged.';
    el('message').textContent=`${score} points · ${Math.floor(time)} seconds survived · ${hull} hull remaining`;
    el('play').textContent='Play again';ui();
  }
  function pause() {
    if(mode!=='running'&&mode!=='paused') return;
    mode=mode==='running'?'paused':'running';target=null;pointer=null;keys.clear();last=performance.now();
    if(mode==='paused') {
      el('status').textContent='FLIGHT ON HOLD';el('heading').textContent='Take a breath.';
      el('message').textContent='Time and the arena are frozen. Tap Resume to continue.';
      el('play').textContent='Resume';
    }
    ui();
  }
  el('play').addEventListener('click',()=>mode==='paused'?pause():start());
  el('pause').addEventListener('click',pause);el('restart').addEventListener('click',start);
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)*W/r.width,12,W-12),y:clamp((e.clientY-r.top)*H/r.height,12,H-12)};};
  canvas.addEventListener('pointerdown',e=>{
    if(mode!=='running'||pointer!==null)return;
    e.preventDefault();pointer=e.pointerId;target=point(e);canvas.setPointerCapture(pointer);
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&mode==='running'){e.preventDefault();target=point(e);}});
  function release(e){if(e.pointerId===pointer){pointer=null;target=null;}}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
  const movement=['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'];
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(movement.includes(k)&&mode==='running'){e.preventDefault();keys.add(k);}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{if(mode==='running')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='running')pause();});
  function burst(x,y,color){if(!reduced.matches)for(let i=0;i<10;i++)sparks.push({x,y,vx:random(-65,65),vy:random(-65,65),life:.45,color});}
  function update(dt) {
    time=Math.min(60,time+dt);invincible=Math.max(0,invincible-dt);flash=Math.max(0,flash-dt);
    let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    let dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    if(dx||dy){const len=Math.hypot(dx,dy);player.x+=dx/len*220*dt;player.y+=dy/len*220*dt;}
    else if(target){const dist=Math.hypot(target.x-player.x,target.y-player.y),f=Math.min(1,460*dt/(dist||1));player.x+=(target.x-player.x)*f;player.y+=(target.y-player.y)*f;}
    player.x=clamp(player.x,12,W-12);player.y=clamp(player.y,12,H-12);
    cores.forEach((c,i)=>{if(Math.hypot(player.x-c.x,player.y-c.y)<21){score+=10;burst(c.x,c.y,'#73f4e9');cores[i]=core();}});
    for(const d of debris){
      const speed=1+time/110;d.x+=d.vx*dt*speed;d.y+=d.vy*dt*speed;d.angle+=dt*.65;
      if(d.x<d.r||d.x>W-d.r){d.vx*=-1;d.x=clamp(d.x,d.r,W-d.r);}
      if(d.y<d.r||d.y>H-d.r){d.vy*=-1;d.y=clamp(d.y,d.r,H-d.r);}
      if(invincible===0&&Math.hypot(player.x-d.x,player.y-d.y)<d.r+10){hull--;invincible=1.4;flash=.3;burst(player.x,player.y,'#ff647e');if(hull===0){finish();return;}}
    }
    sparks=sparks.filter(s=>{s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;return s.life>0;});
    if(time>=60)finish();ui();
  }
  function draw() {
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#080f20';ctx.fillRect(0,0,W,H);
    for(let i=0;i<65;i++){ctx.fillStyle=i%3?'#28415b':'#57738a';ctx.fillRect((i*97+19)%W,(i*173+29)%H,i%3?1:2,1.5);}
    ctx.strokeStyle='#12263a';ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(const c of cores){
      const r=8+(reduced.matches?0:Math.sin(time*3+c.x)*1.2);
      ctx.fillStyle='#73f4e91c';ctx.beginPath();ctx.arc(c.x,c.y,17,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#73f4e9';ctx.beginPath();ctx.moveTo(c.x,c.y-r);ctx.lineTo(c.x+r,c.y);ctx.lineTo(c.x,c.y+r);ctx.lineTo(c.x-r,c.y);ctx.closePath();ctx.fill();
      ctx.fillStyle='#edffff';ctx.fillRect(c.x-2,c.y-2,4,4);
    }
    for(const d of debris){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.angle);ctx.fillStyle='#532133';ctx.strokeStyle='#ff647e';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,r=d.r*(i%2?.8:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ff8b9e';ctx.fillRect(-3,-3,6,6);ctx.restore();}
    ctx.save();ctx.translate(player.x,player.y);
    if(invincible>0){ctx.strokeStyle='#ffb5c2';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle=flash>0?'#ff647e':'#effaff';ctx.strokeStyle='#78cfff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(11,11);ctx.lineTo(0,6);ctx.lineTo(-11,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#49d9ed';ctx.fillRect(-3,-3,6,6);ctx.restore();
    for(const s of sparks){ctx.globalAlpha=s.life/.45;ctx.fillStyle=s.color;ctx.fillRect(s.x,s.y,3,3);}ctx.globalAlpha=1;
    if(flash>0){ctx.strokeStyle='#ff647e';ctx.lineWidth=8;ctx.strokeRect(4,4,W-8,H-8);ctx.fillStyle='#ffafbe';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText('HULL HIT −1',W/2,32);}
  }
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw();}
  new ResizeObserver(resize).observe(canvas);
  function frame(now){const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;if(mode==='running'){let remaining=dt;while(remaining>0&&mode==='running'){const step=Math.min(remaining,1/120);update(step);remaining-=step;}}draw();requestAnimationFrame(frame);}
  window.BORHEZ_GAME=Object.freeze({snapshot:()=>({mode,time,score,player:{x:player.x,y:player.y},hull,invincible,cores:cores.map(c=>({...c})),debris:debris.map(d=>({...d}))})});
  setup();ui();resize();requestAnimationFrame(frame);
})();

(() => {
  'use strict';
  const canvas = document.getElementById('canvas'), ctx = canvas.getContext('2d');
  const play = document.getElementById('play'), pause = document.getElementById('pause');
  const scoreLabel = document.getElementById('score'), clock = document.getElementById('clock'), status = document.getElementById('status');
  const W = 360, H = 500, LIMIT = 75, R = 10, trayY = 445, trayHalf = 44;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'ready', time = 0, score = 0, player = {x:180,y:trayY}, peach, tiles, sparks = [], flash = 0;
  let pointer = null, keys = new Set(), last = null, accumulator = 0, outcome = '';
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  function serve() { peach = {x:player.x,y:trayY-23,vx:85,vy:-265}; }
  function reset(next) {
    mode = next; time = 0; score = 0; player = {x:180,y:trayY};
    tiles = Array.from({length:15},(_,i)=>({x:20+(i%5)*65,y:65+Math.floor(i/5)*35,w:60,h:25,hit:false}));
    sparks = []; flash = 0; outcome = ''; pointer = null; keys.clear(); accumulator = 0; last = null; serve(); ui();
  }
  function ui() {
    scoreLabel.textContent = `${score} / 15`; clock.textContent = `${Math.ceil(LIMIT-time)}s`;
    play.textContent = mode === 'over' ? 'Play again' : 'Play';
    play.disabled = mode === 'running' || mode === 'paused';
    pause.disabled = mode === 'ready' || mode === 'over'; pause.textContent = mode === 'paused' ? 'Resume' : 'Pause';
    status.textContent = mode === 'ready' ? 'Make a little jam. Clear the tiles in 75 seconds!' : mode === 'paused' ? 'Taking a breather. Tap Resume.' : mode === 'over' ? outcome : 'Bounce off the tray’s edges to aim!';
  }
  function end(won) { mode = 'over'; outcome = won ? 'Sweet! All 15 jars filled. Play again?' : `Time! ${score} of 15 tiles. One more bounce?`; pointer = null; keys.clear(); ui(); }
  function hit(tile) {
    if (tile.hit) return;
    tile.hit = true; score++;
    if (!reduced) for(let i=0;i<7;i++) sparks.push({x:tile.x+30,y:tile.y+12,vx:(i-3)*30,vy:-55-Math.random()*65,life:.45});
    if (score === 15) end(true);
  }
  function step(dt) {
    if(mode !== 'running') return;
    time = Math.min(LIMIT,time+dt);
    if(time >= LIMIT) { end(false); return; }
    const direction = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
    player.x = clamp(player.x+direction*330*dt,trayHalf,W-trayHalf);
    const oldX = peach.x, oldY = peach.y;
    peach.x += peach.vx*dt; peach.y += peach.vy*dt;
    if(peach.x < R || peach.x > W-R) { peach.x=clamp(peach.x,R,W-R); peach.vx *= -1; }
    if(peach.y < R) { peach.y=R; peach.vy=Math.abs(peach.vy); }
    for(const tile of tiles) {
      if(tile.hit || peach.x+R<tile.x || peach.x-R>tile.x+tile.w || peach.y+R<tile.y || peach.y-R>tile.y+tile.h) continue;
      hit(tile);
      if(oldY+R<=tile.y || oldY-R>=tile.y+tile.h) {peach.vy *= -1; peach.y=oldY;}
      else {peach.vx *= -1; peach.x=oldX;}
      break;
    }
    if(peach.vy>0 && oldY+R<=trayY && peach.y+R>=trayY && Math.abs(peach.x-player.x)<trayHalf+R) {
      peach.y=trayY-R;
      const angle = clamp((peach.x-player.x)/trayHalf,-1,1)*1.02;
      peach.vx = Math.sin(angle)*290; peach.vy = -Math.cos(angle)*290;
      // A slight angle keeps a perfectly centered bounce from repeating forever.
      if(Math.abs(peach.vx)<28) peach.vx=28;
    }
    if(peach.y>H+R) { serve(); flash=.65; }
    flash=Math.max(0,flash-dt);
    sparks=sparks.filter(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=200*dt;s.life-=dt;return s.life>0;});
  }
  function rounded(x,y,w,h,r,color) { ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(x,y,w,h,r);ctx.fill(); }
  function draw() {
    const box=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
    const cw=Math.round(box.width*dpr), ch=Math.round(box.height*dpr);
    if(canvas.width!==cw || canvas.height!==ch) {canvas.width=cw;canvas.height=ch;}
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#fff0da';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#f4dfc6';ctx.lineWidth=1;
    for(let y=25;y<H;y+=35){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(const t of tiles) {
      if(t.hit) {rounded(t.x+24,t.y+8,12,9,4,'#ebd7c0');continue;}
      rounded(t.x,t.y+3,t.w,t.h,8,'#db8590');rounded(t.x,t.y,t.w,t.h-3,7,['#ed8794','#f5a180','#e7a16c'][Math.floor((t.y-65)/35)]);
      rounded(t.x+9,t.y+5,18,4,2,'#ffe3cf');
    }
    ctx.fillStyle='#ba867955';ctx.beginPath();ctx.ellipse(player.x,trayY+20,42,5,0,0,Math.PI*2);ctx.fill();
    rounded(player.x-trayHalf,trayY,trayHalf*2,13,6,'#608e78');rounded(player.x-trayHalf,trayY,trayHalf*2,4,2,'#8cb99b');
    if(flash>0){ctx.fillStyle='#96546b';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText('Fresh peach!',180,395);}
    ctx.fillStyle='#f8a279';ctx.beginPath();ctx.arc(peach.x,peach.y,R,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#df776b';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(peach.x-4,peach.y,7,-1,1);ctx.stroke();
    ctx.fillStyle='#639777';ctx.beginPath();ctx.ellipse(peach.x+4,peach.y-11,5,2,-.6,0,Math.PI*2);ctx.fill();
    for(const s of sparks){ctx.globalAlpha=s.life/.45;rounded(s.x,s.y,4,4,2,'#d96583');}ctx.globalAlpha=1;
    if(mode!=='running') {
      rounded(32,211,296,92,18,'#fffaf1f2');ctx.textAlign='center';ctx.fillStyle='#713f58';ctx.font='bold 25px system-ui';
      ctx.fillText(mode==='ready'?'Ready to make jam?':mode==='paused'?'Peach on pause':score===15?'Sweet success!':'Nice jam session!',180,250);
      ctx.font='14px system-ui';ctx.fillText(mode==='ready'?'Tap Play below':mode==='paused'?'Tap Resume below':`${score} / 15 • Tap Play again`,180,278);
    }
  }
  function frame(now) {
    if(last===null) last=now;
    const dt=Math.min((now-last)/1000,.1);last=now;
    if(mode==='running'){accumulator+=dt;while(accumulator>=1/120){step(1/120);accumulator-=1/120;}ui();}
    draw();requestAnimationFrame(frame);
  }
  function togglePause(){if(mode!=='running' && mode!=='paused')return;mode=mode==='running'?'paused':'running';pointer=null;keys.clear();last=null;ui();}
  play.addEventListener('click',()=>{if(mode==='ready'||mode==='over')reset('running');});
  pause.addEventListener('click',togglePause);
  document.getElementById('restart').addEventListener('click',()=>reset('running'));
  function move(e){const b=canvas.getBoundingClientRect();player.x=clamp((e.clientX-b.left)/b.width*W,trayHalf,W-trayHalf);}
  canvas.addEventListener('pointerdown',e=>{if(mode!=='running'||pointer!==null||!e.isPrimary)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);move(e);e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(e.pointerId===pointer && mode==='running'){move(e);e.preventDefault();}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===pointer)pointer=null;});
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d'].includes(k) && mode==='running'){keys.add(k);e.preventDefault();}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{if(mode==='running')togglePause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden && mode==='running')togglePause();});
  window.BORHEZ_GAME=Object.freeze({snapshot:()=>({mode,time,score,player:{x:player.x,y:player.y},remaining:15-score,peach:{x:peach.x,y:peach.y},result:outcome})});
  reset('ready');requestAnimationFrame(frame);
})();

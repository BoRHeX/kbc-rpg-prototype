(() => {
  'use strict';
  const canvas = document.getElementById('canvas'), ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['score','timer','speed','status','play','pause','restart'].map(id => [id, document.getElementById(id)]));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2, duration = .68;
  let w = 360, h = 420, r = 130, mode = 'ready', time = 0, score = 0;
  let angle = -Math.PI / 2, speed = 1, desired = 1, jump = null, target, enemy, nextTarget = 0, pulse = 0;
  let pointer = null, keys = new Set(), last = 0, wasWindow = false;
  const delta = (a,b) => Math.atan2(Math.sin(a-b), Math.cos(a-b));
  const point = (a, radius) => ({x:w/2 + Math.cos(a)*radius,y:h/2 + Math.sin(a)*radius});
  const radius = () => r * (1 - (jump ? .38 * Math.sin(Math.PI * Math.min(1,jump.t/duration)) : 0));
  function buzz(ms) { if (!motion.matches && navigator.vibrate) navigator.vibrate(ms); }
  function spawn() { target = {angle:angle + 1.45, life:0}; }
  function clearInput() { pointer = null; keys.clear(); }
  function reset() {
    time=0; score=0; angle=-Math.PI/2; speed=desired=1; jump=null; pulse=0; nextTarget=0; wasWindow=false;
    enemy={angle:angle-2.6}; spawn(); clearInput(); mode='running';
    ui.status.textContent='Follow the gold light · wait for JUMP NOW'; ui.pause.textContent='Pause'; updateUI();
  }
  function end(message) { mode='over'; jump=null; clearInput(); ui.status.textContent=message; buzz([35,40,35]); }
  function timingWindow() { return target && !jump && Math.abs(delta(angle+speed*.34,target.angle+.28*.34)) < .22; }
  function leap() {
    if(mode!=='running' || jump) return;
    jump={t:0,hit:false}; ui.status.textContent='Jumping inward…'; buzz(12);
  }
  function pause() {
    if(mode==='running') {mode='paused';clearInput();ui.status.textContent='Paused · orbit held';ui.pause.textContent='Resume';}
    else if(mode==='paused') {mode='running';ui.status.textContent='Orbit resumed · watch the gold light';ui.pause.textContent='Pause';}
  }
  function update(dt) {
    time += dt;
    if(keys.has('ArrowLeft') || keys.has('a')) desired=Math.max(.72,desired-dt*.6);
    if(keys.has('ArrowRight') || keys.has('d')) desired=Math.min(1.28,desired+dt*.6);
    speed += (desired-speed)*Math.min(1,dt*12);
    angle=(angle+speed*dt)%TAU; enemy.angle=(enemy.angle+1.65*dt)%TAU;
    pulse=Math.max(0,pulse-dt);
    if(target) {target.angle=(target.angle+.28*dt)%TAU;target.life+=dt;if(target.life>9) return end('Light expired · Restart to try again');}
    else if(!jump && time>=nextTarget) spawn();
    if(jump) {
      jump.t += dt;
      if(target && !jump.hit && Math.abs(delta(angle,target.angle))<.24 && Math.abs(radius()-r*.62)<18) {
        jump.hit=true; target=null; score++; pulse=.5; nextTarget=time+.65;
        ui.status.textContent='+1 · Clean catch!'; buzz(22);
      }
      if(jump.t>=duration) {
        const hit=jump.hit; jump=null;
        if(!hit) return end('Jump missed · Tap when JUMP NOW appears');
        if(score>=8) return end('Orbit mastered! 8 lights collected · You win');
      }
    }
    if(time>5 && Math.abs(delta(angle,enemy.angle))<.14 && radius()>r-18) return end('Pink diamond collision · Restart to retry');
    if(time>=45) {time=45;return end('Time up · Collect 8 lights to win');}
    const windowOpen=timingWindow();
    if(windowOpen && !wasWindow) buzz(8);
    wasWindow=windowOpen;
  }
  function updateUI() {ui.score.textContent=`${score} / 8`;ui.timer.textContent=Math.max(0,45-time).toFixed(1);ui.speed.textContent=`${speed.toFixed(2)}×`;}
  function ring(x,y,rad,color,width=1) {ctx.beginPath();ctx.arc(x,y,Math.max(0,rad),0,TAU);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function dot(p,size,color) {ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=motion.matches?0:14;ctx.beginPath();ctx.arc(p.x,p.y,size,0,TAU);ctx.fill();ctx.shadowBlur=0;}
  function draw() {
    ctx.clearRect(0,0,w,h);
    ring(w/2,h/2,r,'#388f9f',2); ring(w/2,h/2,r*.62,'#24374c');
    for(let i=0;i<24;i++){const p=point(i*TAU/24,r);dot(p,1.5,'#4a7083');}
    if(target) {
      const p=point(target.angle,r*.62), outer=point(target.angle,r);
      ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(outer.x,outer.y);ctx.strokeStyle='#887549';ctx.stroke();ctx.setLineDash([]);
      dot(p,8,'#ffdc75');ring(p.x,p.y,14,'#c59a48');
      // A short gold sector marks the launch angle, accounting for travel during the inward jump.
      const launch=target.angle-(speed-.28)*.34;
      ctx.beginPath();ctx.arc(w/2,h/2,r,launch-.22,launch+.22);ctx.strokeStyle='#ffdc75';ctx.lineWidth=5;ctx.stroke();
    }
    const e=point(enemy.angle,r); ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.PI/4);ctx.fillStyle=time<5?'#72445f':'#ff629a';ctx.fillRect(-7,-7,14,14);ctx.restore();
    const p=point(angle,radius());
    if(jump && !motion.matches) ring(p.x,p.y,12+jump.t*22,'#498f9f');
    dot(p,9,'#8effe5');ring(p.x,p.y,13,'#c3fff0');
    if(pulse && !motion.matches) ring(w/2,h/2,r*(1.1-pulse*.4),'#79d0bc');
    ctx.textAlign='center';ctx.fillStyle=timingWindow()?'#ffdc75':'#d6eafa';ctx.font='bold 18px system-ui';
    const title=mode==='ready'?'READY TO ORBIT?':mode==='paused'?'PAUSED':mode==='over'?(score>=8?'YOU WIN':'ROUND OVER'):jump?'INWARD':timingWindow()?'JUMP NOW':'STAY IN ORBIT';
    ctx.fillText(title,w/2,h/2-5);ctx.font='12px system-ui';ctx.fillStyle='#98afc8';
    ctx.fillText(mode==='ready'?'Press Play below':mode==='over'?`${score} lights · Restart to replay`:mode==='paused'?'Press Resume below':target?`Light fades in ${Math.ceil(9-target.life)}s`:'Next light incoming',w/2,h/2+19);
    ctx.font='10px system-ui';ctx.fillText('● YOU     ● GOLD     ◆ DANGER',w/2,h-20);
  }
  function resize() {const b=canvas.getBoundingClientRect();w=b.width;h=b.height;r=Math.min(w*.37,h*.36);const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);draw();}
  canvas.addEventListener('pointerdown',e=>{if(mode!=='running'||pointer)return;canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,base:desired,moved:false};});
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x;if(Math.hypot(dx,e.clientY-pointer.y)>8)pointer.moved=true;if(pointer.moved){desired=Math.max(.72,Math.min(1.28,pointer.base+dx/240));ui.status.textContent=desired<1?'Slower orbit · time your jump':'Faster orbit · time your jump';}});
  canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const tap=!pointer.moved;pointer=null;if(tap)leap();});
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{pointer=null;});
  window.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s',' '].includes(e.key)||e.target.tagName==='BUTTON')return;e.preventDefault();keys.add(e.key);if(!e.repeat&&[' ','ArrowUp','ArrowDown','w','s'].includes(e.key))leap();});
  window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{if(mode==='running')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='running')pause();});
  ui.play.addEventListener('click',()=>{if(mode==='paused')pause();else if(mode!=='running')reset();});ui.pause.addEventListener('click',pause);ui.restart.addEventListener('click',reset);
  window.BORHEZ_GAME=Object.freeze({snapshot:()=>({mode,time,score,player:{...point(angle,radius())},angle,speed,jumping:!!jump,target:target?{angle:target.angle,remaining:9-target.life}:null,enemy:{angle:enemy.angle,active:time>5}})});
  enemy={angle:angle-2.6};spawn();new ResizeObserver(resize).observe(canvas);resize();
  function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(mode==='running'){let remaining=dt;while(remaining>0&&mode==='running'){const step=Math.min(remaining,1/120);update(step);remaining-=step;}}updateUI();draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();

(() => {
  'use strict';
  const canvas=document.getElementById('canvas'), ctx=canvas.getContext('2d');
  const $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W=360,H=500,DT=1/120,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const state={}, event={queue:[]}, keys=new Set();
  // Fixed-capacity history stores simulation samples, never predicted positions.
  const trailX=new Float32Array(32),trailY=new Float32Array(32),fruitRenderOrder=[];
  let trailHead=0,trailCount=0;
  let pointer=null,last=null,accumulator=0;
  const game={state,step,draw,hud:{update:ui}};
  function setupCollisionDetection(){state.hull=3;state.invulnerability=0;}
  function initializeWaves(){
    state.next=1;state.fruits=Array.from({length:3},(_,i)=>({id:i+1,lane:([0,-.62,.62][(i+state.wave-1)%3]),depth:1+i*.2,cleared:false,flash:0,contact:0}));
  }
  function deploy(){trailCount=0;state.probe={x:state.player.x,y:state.player.y-25,vx:0,vy:-350,active:true,age:0,catchZoneRadius:{inner:12,outer:62}};}
  function reset(mode){
    Object.assign(state,{mode,time:0,score:0,player:{x:180,y:440},wave:1,probes:5,breakTime:0,message:'Follow NEXT. Slide under the returning probe.',messageTime:0,result:'',catches:0,lastLaunchSpeed:350,lastCatchQuality:0,lastCatchOffset:0,catchPulse:0,shipVelocity:0,previousShipX:180});
    setupCollisionDetection();initializeWaves();deploy();event.queue.length=0;pointer=null;keys.clear();accumulator=0;last=null;ui();
  }
  function end(message){state.mode='over';state.result=message;pointer=null;keys.clear();}
  function loseProbe(reason){
    if(!state.probe.active)return;
    state.probe.active=false;trailCount=0;state.probes--;state.deployDelay=.65;
    event.queue.push({type:'probeLost',message:reason});
    if(state.probes<=0)end('Probe supply exhausted. Tap Play again.');
  }
  function project(f){const near=clamp(1-f.depth,0,1.1);return {x:180+f.lane*(35+near*112),y:65+near*370,r:7+near*15};}
  function updateFruit(dt){
    if(state.breakTime>0){state.breakTime-=dt;if(state.breakTime<=0)initializeWaves();return;}
    for(const f of state.fruits){if(f.cleared)continue;f.flash=Math.max(0,f.flash-dt);f.contact=Math.max(0,f.contact-dt);
      // Depth velocity decreases continuously toward the ship; no expired ordered targets.
      f.depth-=(.027+Math.max(0,f.depth)*(.13+state.wave*.012))*dt;
      if(f.depth<-.15){f.depth=1.05;f.contact=0;}
    }
  }
  function hitFruit(f){
    if(f.id!==state.next){f.flash=.5;event.queue.push({type:'wrongOrder',message:`Order locked: hit #${state.next} first`});return;}
    f.cleared=true;state.next++;state.score+=100;event.queue.push({type:'fruitHit',message:`#${f.id} collected · +100`});
    if(state.next>3){state.score+=150;event.queue.push({type:'waveCleared',message:'Wave cleared · +150'});if(state.wave===3)end('All three waves rescued! Tap Play again.');else{state.wave++;state.breakTime=2;}}
  }
  function gravitySlingSubsystem(dt){
    const p=state.probe,s=state.player;
    if(!p.active){state.deployDelay-=dt;if(state.deployDelay<=0&&state.mode==='running')deploy();return;}
    const oldX=p.x,oldY=p.y;p.age+=dt;
    // Softened inverse-square field: finite at the ship, weaker at range.
    // A small uniform return force closes the flight cycle without age-based flips.
    const dx=s.x-p.x,dy=s.y-p.y,d=Math.max(1,Math.hypot(dx,dy));
    const gravity=clamp(12000000/(d*d+40000),85,300);
    const proximity=1/(1+d/100);
    p.vx+=(gravity*dx/d*(1+.12*Math.abs(dx)/d)+state.shipVelocity*.16*proximity)*dt;
    p.vy+=(gravity*dy/d+70)*dt;
    const speed=Math.hypot(p.vx,p.vy);if(speed>430){p.vx*=430/speed;p.vy*=430/speed;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(!reduced){trailX[trailHead]=p.x;trailY[trailHead]=p.y;trailHead=(trailHead+1)%32;trailCount=Math.min(32,trailCount+1);}
    if(state.breakTime<=0)for(const f of state.fruits){
      if(f.cleared||f.depth>1||f.contact>0)continue;const q=project(f);
      // Segment collision avoids tunneling at high probe speeds.
      const sx=p.x-oldX,sy=p.y-oldY,t=clamp(((q.x-oldX)*sx+(q.y-oldY)*sy)/(sx*sx+sy*sy||1),0,1);
      if(Math.hypot(oldX+sx*t-q.x,oldY+sy*t-q.y)<q.r+6){f.contact=.5;hitFruit(f);p.vy=Math.max(60,Math.abs(p.vy)*.7);break;}
    }
    // A return crosses the upper half of the annulus. Offset defines catch quality.
    if(p.vy>0&&oldY<s.y-20&&p.y>=s.y-20&&Math.abs(p.x-s.x)<=p.catchZoneRadius.outer){
      const quality=1-clamp(Math.abs(p.x-s.x)/p.catchZoneRadius.outer,0,1),launch=315+quality*65;
      p.vy=-launch;p.vx=clamp(p.vx*.45+(p.x-s.x)*.65,-68,68);p.age=0;state.catches++;state.lastLaunchSpeed=launch;
      state.lastCatchQuality=quality;state.lastCatchOffset=p.x-s.x;state.catchPulse=.55;trailCount=0;
      event.queue.push({type:'probeCaught',message:`${quality>.7?'Center':'Edge'} catch · sling ${Math.round(launch)}`});
    }
    if(p.x<-35||p.x>W+35||p.y<-60||p.y>H+25)loseProbe('Probe escaped · replacement incoming');
  }
  function shipCollisions(){
    if(state.breakTime>0)return;
    for(const f of state.fruits){if(f.cleared||f.depth>1)continue;const q=project(f);
      if(Math.abs(q.x-state.player.x)<q.r+17&&Math.abs(q.y-state.player.y)<q.r+11&&state.invulnerability<=0){
        state.hull--;state.invulnerability=1.6;f.depth=1.05;f.contact=0;loseProbe('Hull hit · probe destroyed');
        event.queue.push({type:'hullDamaged',message:'Hull damaged! Brief shield active'});
        if(state.hull<=0)end('Hull lost. Tap Play again.');break;
      }
    }
  }
  function step(dt){
    if(state.mode!=='running')return;state.time+=dt;state.invulnerability=Math.max(0,state.invulnerability-dt);state.messageTime=Math.max(0,state.messageTime-dt);
    const direction=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a'));
    state.player.x=clamp(state.player.x+direction*280*dt,28,W-28);
    state.shipVelocity=clamp((state.player.x-state.previousShipX)/dt,-280,280);
    state.previousShipX=state.player.x;state.catchPulse=Math.max(0,state.catchPulse-dt);
    updateFruit(dt);gravitySlingSubsystem(dt);if(state.mode==='running')shipCollisions();
    for(const e of event.queue){state.message=e.message;state.messageTime=1.4;}event.queue.length=0;game.hud.update(state);
  }
  function ui(){
    $('score').textContent=state.score;$('wave').textContent=`${state.wave} / 3`;$('hull').textContent=state.hull;$('probes').textContent=state.probes;
    $('next').textContent=state.breakTime>0?'WAVE CLEAR · incoming…':state.next>3?'ALL FRUIT CLEARED':`NEXT: #${state.next} · collect 1 → 2 → 3`;
    $('play').disabled=['running','paused'].includes(state.mode);$('play').textContent=state.mode==='over'?'Play again':'Play';
    $('pause').disabled=['ready','over'].includes(state.mode);$('pause').textContent=state.mode==='paused'?'Resume':'Pause';
    const message=state.mode==='ready'?'Tap Play. Clear three waves to win.':state.mode==='paused'?'Paused · tap Resume':state.mode==='over'?state.result:state.messageTime>0?state.message:'Slide to line up fruit and catch the returning probe.';
    if($('status').textContent!==message)$('status').textContent=message;
  }
  function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function text(t,x,y,size,color='#eaf5ff'){ctx.fillStyle=color;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.fillText(t,x,y);}
  function renderFruitWaveAndPerspective(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#080f26');sky.addColorStop(.15,'#233651');sky.addColorStop(.45,'#101d36');sky.addColorStop(1,'#0b132c');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    for(let i=0;i<32;i++)circle(((i*73+19)%360)+(reduced?0:(state.player.x-180)*.015),(i*47)%220,1,'#6c83aa');
    ctx.strokeStyle='#294565';ctx.lineWidth=1;
    for(let x=-220;x<650;x+=90){ctx.beginPath();ctx.moveTo(180+(x-180)*.12,65);ctx.lineTo(x,500);ctx.stroke();}
    for(let i=0;i<10;i++){const n=i/9,y=65+n*n*435;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.strokeStyle='#67e5d4';ctx.beginPath();ctx.moveTo(0,65);ctx.lineTo(W,65);ctx.stroke();text('FRUIT ORBIT',180,42,11,'#819fbe');
    if(state.breakTime>0){text('WAVE CLEAR',180,210,22,'#67e5d4');return;}
    for(let i=0;i<state.fruits.length;i++)fruitRenderOrder[i]=state.fruits[i];
    fruitRenderOrder.sort((a,b)=>b.depth-a.depth);
    for(const f of fruitRenderOrder){
      if(f.cleared||f.depth>1)continue;const q=project(f);
      if(f.id===state.next){ctx.strokeStyle='#ffe08c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,q.r+5,0,Math.PI*2);ctx.stroke();}
      // Peach lobes, pear shoulders and plum oval share the real collision center.
      ctx.save();ctx.translate(q.x,q.y);const r=q.r;
      ctx.fillStyle=f.flash>0?'#fff':['#ffae8b','#b6e07b','#df9bff'][f.id-1];
      ctx.beginPath();
      if(f.id===1){ctx.moveTo(0,-r*.7);ctx.bezierCurveTo(-r*1.4,-r*1.3,-r*1.3,r*.6,0,r);ctx.bezierCurveTo(r*1.3,r*.6,r*1.4,-r*1.3,0,-r*.7);}
      else if(f.id===2){ctx.moveTo(0,-r);ctx.bezierCurveTo(-r*.5,-r,-r*.3,-r*.1,-r*.85,r*.25);ctx.bezierCurveTo(-r*1.3,r*1.3,r*1.3,r*1.3,r*.85,r*.25);ctx.bezierCurveTo(r*.3,-r*.1,r*.5,-r,0,-r);}
      else ctx.ellipse(0,0,r*.85,r, -.18,0,Math.PI*2);
      ctx.fill();ctx.strokeStyle='#19213f55';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#ffffff66';ctx.beginPath();ctx.ellipse(-r*.38,-r*.28,r*.16,r*.32,.45,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#d1ac79';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-r*.8);ctx.lineTo(2,-r-4);ctx.stroke();
      ctx.fillStyle='#69b893';ctx.beginPath();ctx.ellipse(5,-r-2,r*.36,r*.16,-.45,0,Math.PI*2);ctx.fill();ctx.restore();
      if(f.flash>0)text('ORDER!',q.x,q.y-q.r-12,10,'#fff');
      text(f.id,q.x,q.y+5,Math.max(13,q.r*.85),'#19213f');
    }
  }
  function renderProbeAndTether(){
    const s=state.player,p=state.probe;
    // Field distortion derives only from relative position and measured ship motion.
    if(!reduced&&p.active){const separation=Math.abs(p.x-s.x),near=1/(1+Math.hypot(p.x-s.x,p.y-s.y)/90);
      ctx.strokeStyle=`rgba(103,229,212,${.1+near*.16})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(s.x,s.y,70+Math.min(18,separation*.08)-Math.abs(state.shipVelocity)*.018,30+near*8,clamp((p.x-s.x)*.0004,-.12,.12),0,Math.PI*2);ctx.stroke();}
    if(!reduced&&state.catchPulse>0){const life=state.catchPulse/.55,q=state.lastCatchQuality;
      ctx.strokeStyle=`rgba(255,224,140,${life*(.35+q*.6)})`;ctx.lineWidth=1+q*3;
      ctx.beginPath();ctx.ellipse(s.x,s.y,62+(1-life)*(12+q*24),38+(1-life)*12,0,0,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle='#67e5d477';ctx.lineWidth=2;
    for(const r of [p.catchZoneRadius.inner,p.catchZoneRadius.outer]){ctx.beginPath();ctx.ellipse(s.x,s.y,r,r*.62,0,0,Math.PI*2);ctx.stroke();}
    // The highlighted mouth is exactly the return crossing used by collision logic.
    ctx.strokeStyle='#a0fff0';ctx.lineWidth=2;ctx.beginPath();
    ctx.moveTo(s.x-62,s.y-24);ctx.lineTo(s.x-62,s.y-20);ctx.lineTo(s.x+62,s.y-20);ctx.lineTo(s.x+62,s.y-24);ctx.stroke();
    text('CATCH / SLING',s.x,491,10,'#67e5d4');
    if(p.active&&!reduced){const intensity=clamp(Math.hypot(p.vx,p.vy)/430,0,1),count=Math.min(trailCount,8+Math.floor(intensity*24));
      for(let i=count-1;i>0;i--){const a=(trailHead-1-i+32)%32,b=(a+1)%32,fade=1-i/count;
        ctx.strokeStyle=`rgba(172,244,223,${fade*intensity*.5})`;ctx.lineWidth=1+fade*5;
        ctx.beginPath();ctx.moveTo(trailX[a],trailY[a]);ctx.lineTo(trailX[b],trailY[b]);ctx.stroke();}}
    if(p.active){ctx.strokeStyle='#67e5d44d';ctx.setLineDash(reduced?[]:[5,7]);ctx.lineDashOffset=reduced?0:-state.time*14;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);circle(p.x,p.y,7,'#f9f5bc');circle(p.x-2,p.y-2,2,'#fff');}
    ctx.fillStyle=state.invulnerability>0?'#ffae8b':'#67e5d4';ctx.beginPath();ctx.moveTo(s.x,s.y-17);ctx.lineTo(s.x+20,s.y+13);ctx.lineTo(s.x,s.y+6);ctx.lineTo(s.x-20,s.y+13);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#e3fff6';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(s.x,s.y-12);ctx.lineTo(s.x+6,s.y+7);ctx.lineTo(s.x-6,s.y+7);ctx.closePath();ctx.stroke();
    for(let i=0;i<state.probes;i++)circle(145+i*17,477,3,'#ffe08c');
  }
  function renderHullDamageEffects(){if(state.invulnerability>0){ctx.strokeStyle='#ffae8b';ctx.lineWidth=4;ctx.strokeRect(3,3,W-6,H-6);}}
  function draw(){
    const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(b.width*dpr),h=Math.round(b.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(w/W,0,0,h/H,0,0);
    renderFruitWaveAndPerspective();renderProbeAndTether();renderHullDamageEffects();
    if(state.mode!=='running'){ctx.fillStyle='#101b35ee';ctx.fillRect(25,190,310,105);text(state.mode==='ready'?'GRAVITY SLING':state.mode==='paused'?'PAUSED':state.hull>0&&state.probes>0?'ORBIT RESCUED!':'ROUND OVER',180,229,23);text(state.mode==='ready'?'Tap Play below · slide left and right':state.mode==='paused'?'Tap Resume below':`Score ${state.score} · Play again below`,180,265,13);}
  }
  function frame(now){if(last===null)last=now;const dt=Math.min((now-last)/1000,.1);last=now;if(state.mode==='running'){accumulator+=dt;while(accumulator>=DT){game.step(DT);accumulator-=DT;}}game.draw();requestAnimationFrame(frame);}
  function togglePause(){if(!['running','paused'].includes(state.mode))return;state.mode=state.mode==='running'?'paused':'running';pointer=null;keys.clear();last=null;ui();}
  $('play').addEventListener('click',()=>{if(['ready','over'].includes(state.mode))reset('running');});$('pause').addEventListener('click',togglePause);$('restart').addEventListener('click',()=>reset('running'));
  function move(e){const b=canvas.getBoundingClientRect();state.player.x=clamp((e.clientX-b.left)/b.width*W,28,W-28);}
  canvas.addEventListener('pointerdown',e=>{if(state.mode!=='running'||pointer!==null||!e.isPrimary)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);move(e);e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&state.mode==='running'){move(e);e.preventDefault();}});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(e.pointerId===pointer)pointer=null;});
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright','a','d'].includes(k)&&state.mode==='running'){keys.add(k);e.preventDefault();}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{if(state.mode==='running')togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='running')togglePause();});
  window.BORHEZ_GAME=Object.freeze({snapshot:()=>({mode:state.mode,time:state.time,score:state.score,player:{...state.player},hull:state.hull,probes:state.probes,wave:state.wave,next:state.next,invulnerability:state.invulnerability,breakTime:state.breakTime,catches:state.catches,lastLaunchSpeed:state.lastLaunchSpeed,lastCatchQuality:state.lastCatchQuality,lastCatchOffset:state.lastCatchOffset,catchPulse:state.catchPulse,shipVelocity:state.shipVelocity,trailSamples:trailCount,reducedMotion:reduced,probe:{...state.probe,catchZoneRadius:{...state.probe.catchZoneRadius}},fruits:state.fruits.map(f=>({...f,...project(f)})),result:state.result})});
  reset('ready');requestAnimationFrame(frame);
})();

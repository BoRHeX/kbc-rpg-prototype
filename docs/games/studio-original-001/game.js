/* Peach Bounce 0.3. Pure fixed-step model is also loadable in Node for physics checks. */
(function (root) {
  'use strict';
  const DT=1/120, W=360;
  const PHYSICS=Object.freeze({mu:5000000,soft:18,inner:20,depositInner:32,outer:76,maxHull:3,maxProbes:8,maxAge:24});
  const TAU=Math.PI*2, ORBIT_SECONDS=2.1;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function segmentDistance(ax,ay,bx,by,x,y){const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(ax+t*dx-x,ay+t*dy-y);}
  function createGame(height=600){
    const H=height,s={mode:'ready',time:0,score:0,player:{x:180,y:H-88},hull:3,probes:5,wave:1,fruits:[],probe:null,invulnerability:0,delay:0,message:'Tap Play to launch.',events:[],flight:0,bankings:0,crashes:0,escapes:0,shipVelocity:0};
    function say(message,type){s.message=message;s.events.push({type,time:s.time,message});if(s.events.length>30)s.events.shift();}
    function initial(){const rp=52,ra=Math.max(210,H*.66),v=Math.sqrt(2*PHYSICS.mu*(1/Math.hypot(rp,18)-1/Math.hypot(ra,18))/(1-rp*rp/(ra*ra)));return {x:s.player.x+52*Math.sin(.08),y:s.player.y+52*Math.cos(.08),vx:v*Math.cos(.08),vy:-v*Math.sin(.08)};}
    function acceleration(p,ship=s.player){const dx=ship.x-p.x,dy=ship.y-p.y,den=Math.pow(dx*dx+dy*dy+PHYSICS.soft**2,1.5);return {x:PHYSICS.mu*dx/den,y:PHYSICS.mu*dy/den};}
    function integrate(p,dt,ship=s.player){const a=acceleration(p,ship);p.vx+=a.x*dt;p.vy+=a.y*dt;const speed=Math.hypot(p.vx,p.vy);if(speed>650){p.vx*=650/speed;p.vy*=650/speed;}p.x+=p.vx*dt;p.y+=p.vy*dt;}
    // One geometry and one movement routine serve simulation and the read-only forecast.
    function rearOrbitTriggerZone(ship=s.player){return {x:ship.x,y:ship.y+52,r:17};}
    function releaseSpeed(ship){return 395+30*(ship.x-W/2)/(W/2);}
    function advanceProbe(p,ship,oldShip,dt){
      const a={x:p.x,y:p.y};p.age+=dt;
      if(p.state==='captured-orbit'){
        p.orbitElapsed=Math.min(ORBIT_SECONDS,p.orbitElapsed+dt);
        const angle=p.orbitStart+p.orbitDirection*TAU*3*p.orbitElapsed/ORBIT_SECONDS;
        p.orbitCount=3*p.orbitElapsed/ORBIT_SECONDS;
        p.x=ship.x+Math.cos(angle)*p.orbitRadius;p.y=ship.y+Math.sin(angle)*p.orbitRadius;
        const omega=p.orbitDirection*TAU*3/ORBIT_SECONDS;
        p.vx=-Math.sin(angle)*p.orbitRadius*omega;p.vy=Math.cos(angle)*p.orbitRadius*omega;
        if(p.orbitElapsed>=ORBIT_SECONDS){
          p.state='released';const v=releaseSpeed(ship);
          p.vx=-Math.sin(p.orbitStart)*p.orbitDirection*v;
          p.vy=Math.cos(p.orbitStart)*p.orbitDirection*v;
          p.near=false;p.armed=false;return 'release';
        }
        return 'orbit';
      }
      integrate(p,dt,ship);
      const d=Math.hypot(p.x-ship.x,p.y-ship.y);
      if(segmentDistance(a.x-oldShip.x,a.y-oldShip.y,p.x-ship.x,p.y-ship.y,0,0)<PHYSICS.inner+5)return 'crash';
      if(p.x<0||p.x>W||p.y<0||p.y>H||d>H*1.2||p.age>PHYSICS.maxAge)return 'escape';
      const zone=rearOrbitTriggerZone(ship),oldZone=rearOrbitTriggerZone(oldShip);
      // The probe itself must descend; dragging a ring over a stationary probe cannot catch it.
      if(!p.captureUsed&&p.armed&&p.vy>20&&p.y>a.y&&
        Math.hypot(a.x-oldZone.x,a.y-oldZone.y)>zone.r&&
        segmentDistance(a.x-oldZone.x,a.y-oldZone.y,p.x-zone.x,p.y-zone.y,0,0)<=zone.r&&
        d>=PHYSICS.depositInner+2&&d<=PHYSICS.outer-2&&
        ship.x>=d+6&&ship.x<=W-d-6){
        p.captureUsed=true;p.state='captured-orbit';p.orbitElapsed=0;p.orbitCount=0;
        p.orbitRadius=d;p.orbitStart=Math.atan2(p.y-ship.y,p.x-ship.x);
        // Choose the upward tangent. Entry side determines the horizontal launch direction.
        p.orbitDirection=Math.cos(p.orbitStart)>0?-1:1;
        return 'capture';
      }
      if(d>PHYSICS.outer+12)p.armed=true;
      if(p.armed&&d<=PHYSICS.outer&&d>=PHYSICS.depositInner)p.near=true;
      if(p.near&&d>PHYSICS.outer){p.near=false;p.armed=false;return 'bank';}
      return 'flight';
    }
    function predictFutureTrajectory(probeState,shipPosition,durationSec=3,dt=DT){
      if(!probeState?.active)return [];
      const p={...probeState},ship={...shipPosition},points=[{x:p.x,y:p.y,event:'flight',time:0}];
      // Bounded 360 integrations, sampled at 40 Hz. Fruit markers are passive, never mutate cargo.
      for(let i=1;i<=Math.min(600,Math.ceil(durationSec/dt));i++){
        const a={x:p.x,y:p.y},event=advanceProbe(p,ship,ship,dt);
        const fruit=s.fruits.some(f=>f.status==='available'&&segmentDistance(a.x,a.y,p.x,p.y,f.x,f.y)<f.r+5);
        if(i%3===0||event!=='flight')points.push({x:p.x,y:p.y,event:fruit&&event==='flight'?'fruit':event,time:i*dt});
        if(event==='crash'||event==='escape')break;
      }
      return points;
    }
    function deploy(){s.flight++;s.probe={...initial(),active:true,state:'active',orbitCount:0,captureUsed:false,age:0,cargo:[],trail:[],armed:false,near:false,minDistance:Infinity,flight:s.flight};say('Probe launched · guide its return through green ring','launch');}
    function wave(){
      // Sample the unassisted launch arc for a reachable teaching route. Later waves drift wider.
      const p=initial(),samples=[];for(let i=0;i<1800;i++){integrate(p,DT);if(p.y<H*.57&&p.y>40&&p.x>28&&p.x<W-28)samples.push({x:p.x,y:p.y});if(i>120&&p.vy>0&&p.y>H*.6)break;}
      const count=3+Math.min(3,Math.floor((s.wave-1)/3));
      s.fruits=Array.from({length:count},(_,i)=>{const q=samples[Math.floor((.12+i*.7/count)*Math.max(0,samples.length-1))]||{x:110+i*55,y:H*.3};return {id:i+1,baseX:clamp(q.x+Math.min(38,(s.wave-1)*12)*(i%2?1:-1),26,W-26),baseY:q.y,x:q.x,y:q.y,r:16,status:'available',flash:0};});
      s.waveStart=s.time;
    }
    function next(){return s.fruits.find(f=>f.status==='available');}
    function lose(reason){const p=s.probe;if(!p||!p.active)return;p.active=false;for(const id of p.cargo){const f=s.fruits.find(f=>f.id===id);if(f&&f.status==='carried')f.status='available';}p.cargo=[];s.probes--;s.delay=.9;
      if(reason==='crash'){s.hull--;s.crashes++;s.invulnerability=.8;say('CRASH · hull −1 · probe −1 · cargo requeued','crash');}else{s.escapes++;say('ESCAPE · probe −1 · hull safe · cargo requeued','escape');}
      if(s.hull<=0||s.probes<=0){s.mode='over';say(`${s.hull<=0?'Hull lost':'No probes left'} · ${s.score} fruit banked. Play again.`,'defeat');}
    }
    function bank(){const p=s.probe;if(!p.cargo.length)return;let repair=0,build=0,full=0;while(p.cargo.length){const id=p.cargo.shift(),f=s.fruits.find(f=>f.id===id);if(!f||f.status!=='carried')continue;f.status='banked';s.score++;if(s.hull<PHYSICS.maxHull){s.hull++;repair++;}else if(s.probes<PHYSICS.maxProbes){s.probes++;build++;}else full++;}s.bankings++;say(`BANKED · ${repair} repair · ${build} probe built${full?' · stores full':''}`,'bank');if(s.fruits.every(f=>f.status==='banked')){s.wave++;wave();}}
    function step(dt=DT,input=0){if(s.mode!=='running')return;s.time+=dt;s.invulnerability=Math.max(0,s.invulnerability-dt);
      const oldShip={...s.player};const margin=s.probe?.state==='captured-orbit'?s.probe.orbitRadius+6:26;s.player.x=clamp(s.player.x+clamp(input,-1,1)*270*dt,margin,W-margin);s.shipVelocity=(s.player.x-oldShip.x)/dt;
      for(const f of s.fruits){f.flash=Math.max(0,f.flash-dt);const t=s.time-s.waveStart,amp=Math.min(20,2+(s.wave-1)*2);f.x=clamp(f.baseX+Math.sin(t*.35+f.id)*amp,24,W-24);f.y=f.baseY+Math.max(0,Math.min(22,H*.56-f.baseY))*(1-Math.exp(-t/22));f.r=12+8*clamp(f.y/(H*.6),0,1);}
      const p=s.probe;if(!p||!p.active){s.delay-=dt;if(s.delay<=0)deploy();return;}
      const a={x:p.x,y:p.y},event=advanceProbe(p,s.player,oldShip,dt);
      const d=Math.hypot(p.x-s.player.x,p.y-s.player.y);p.minDistance=Math.min(p.minDistance,d);
      if(event==='crash'||event==='escape'){lose(event);return;}
      if(event==='capture')say('ORBIT / SLING · 3 turns · move ship to tune launch speed','capture');
      if(event==='release'){bank();say('SLING · tangent released · steer the next return','release');}
      for(const f of s.fruits){if(f.status!=='available')continue;if(segmentDistance(a.x,a.y,p.x,p.y,f.x,f.y)<f.r+5){if(f===next()){f.status='carried';p.cargo.push(f.id);say(`Fruit #${f.id} aboard · return safely to bank`,'pickup');}else if(f.flash<=0){f.flash=.6;say(`Wrong order · target #${next().id} first`,'wrong');}}}
      if(event==='bank')bank();
      p.trail.push({x:p.x,y:p.y});if(p.trail.length>180)p.trail.shift();
    }
    function reset(mode='running'){Object.assign(s,{mode,time:0,score:0,player:{x:180,y:H-88},hull:3,probes:5,wave:1,invulnerability:0,delay:0,events:[],flight:0,bankings:0,crashes:0,escapes:0,shipVelocity:0});wave();deploy();if(mode==='ready')s.message='Harvest in order. Green ring banks cargo; red hull destroys probes.';}
    function snapshot(){return {version:'0.3',mode:s.mode,time:s.time,score:s.score,player:{...s.player},hull:s.hull,probes:s.probes,maxHull:3,maxProbes:8,wave:s.wave,next:next()?.id||null,cargo:s.probe?.cargo.length||0,probe:s.probe?{...s.probe,cargo:[...s.probe.cargo],trail:s.probe.trail.map(q=>({...q}))}:null,fruits:s.fruits.map(f=>({...f})),invulnerability:s.invulnerability,bankings:s.bankings,crashes:s.crashes,escapes:s.escapes,message:s.message,events:s.events.map(e=>({...e})),arena:{width:W,height:H},radii:{...PHYSICS},rearOrbitTriggerZone:rearOrbitTriggerZone(),forecast:predictFutureTrajectory(s.probe,s.player)};}
    reset('ready');return {state:s,step,reset,snapshot,predictFutureTrajectory,rearOrbitTriggerZone,height:H};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={createGame,DT,PHYSICS,segmentDistance};return;}
  const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let game=createGame(Math.max(340,canvas.clientHeight/canvas.clientWidth*W)),keys=new Set(),pointer=null,target=null,last=null,acc=0;
  const s=()=>game.state;
  function ui(){const q=s(),next=q.fruits.find(f=>f.status==='available');$('score').textContent=q.score;$('wave').textContent=q.wave;$('hull').textContent=`${q.hull} / 3`;$('probes').textContent=`${q.probes} / 8`;$('next').textContent=`${next?'NEXT #'+next.id:'RETURN TO BANK'} · CARGO ${q.probe.cargo.length}`;const message=q.mode==='paused'?'Paused · Resume to continue':q.message;if($('status').textContent!==message)$('status').textContent=message;$('pause').textContent=q.mode==='paused'?'Resume':'Pause';$('pause').disabled=q.mode==='ready'||q.mode==='over';$('play').disabled=q.mode==='running'||q.mode==='paused';$('play').textContent=q.mode==='over'?'Play again':'Play';}
  function circle(x,y,r,c,stroke=false){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx[stroke?'strokeStyle':'fillStyle']=c;ctx[stroke?'stroke':'fill']();}
  function text(t,x,y,size=12,c='#d9e8f7'){ctx.fillStyle=c;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.fillText(t,x,y);}
  function fruit(f,next){const r=f.r;ctx.save();ctx.translate(f.x,f.y);if(next){ctx.lineWidth=2;circle(0,0,r+7,'#ffe199',true);text('NEXT',0,-r-13,9,'#ffe199');}ctx.fillStyle=f.flash>0?'#ffffff':['#ffab8c','#b9df78','#c6a0fa'][(f.id-1)%3];ctx.beginPath();if(f.id%3===1){ctx.moveTo(0,-r*.7);ctx.bezierCurveTo(-r*1.4,-r*1.4,-r*1.3,r*.7,0,r);ctx.bezierCurveTo(r*1.3,r*.7,r*1.4,-r*1.4,0,-r*.7);}else if(f.id%3===2){ctx.moveTo(0,-r);ctx.bezierCurveTo(-r*.6,-r,-r*.25,-r*.2,-r*.9,r*.3);ctx.bezierCurveTo(-r*1.3,r*1.3,r*1.3,r*1.3,r*.9,r*.3);ctx.bezierCurveTo(r*.25,-r*.2,r*.6,-r,0,-r);}else ctx.ellipse(0,0,r*.8,r,-.2,0,7);ctx.fill();ctx.fillStyle='#7ad8a2';ctx.fillRect(0,-r-5,3,7);text(f.id,0,5,14,'#18283c');ctx.restore();}
  function drawForecastPath(points){
    if(!points.length)return;
    const terminal=points.at(-1).event,base=terminal==='crash'?'#ff8385':terminal==='escape'?'#ffb461':'#8bccff';
    const colors={crash:'#ff8385',escape:'#ffb461',capture:'#78ebc7',orbit:'#78ebc7',release:'#78ebc7',bank:'#78ebc7',fruit:'#ffe199'};
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,game.height);ctx.clip();ctx.lineWidth=1.4;ctx.setLineDash([4,5]);
    // Stroke continuous color runs so dash spacing survives densely sampled curves.
    let color=null;
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],nextColor=colors[b.event]||base;
      if(nextColor!==color){if(color)ctx.stroke();color=nextColor;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(a.x,a.y);}ctx.lineTo(b.x,b.y);
    }ctx.stroke();ctx.setLineDash([]);
    for(let i=24;i<points.length;i+=24){const a=points[i-1],b=points[i],angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.strokeStyle=colors[b.event]||base;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-6,-3);ctx.lineTo(0,0);ctx.lineTo(-6,3);ctx.stroke();ctx.restore();}
    ctx.setLineDash([]);const end=points.at(-1);circle(end.x,end.y,3,colors[terminal]||base,true);ctx.restore();
  }
  function drawRearCatchZone(ship){const z=game.rearOrbitTriggerZone(ship);ctx.lineWidth=1.5;circle(z.x,z.y,z.r,'#78ebc71c');circle(z.x,z.y,z.r,'#78ebc7',true);text('↓',z.x,z.y+4,12,'#78ebc7');text('ORBIT / SLING',clamp(z.x,44,W-44),z.y+z.r+11,8,'#9df2d8');}
  function drawOrbitProgressIndicator(orbitCount){const p=s().probe,ship=s().player;if(p.state!=='captured-orbit')return;
    text('ORBIT '+Math.min(3,Math.floor(orbitCount)+1)+'/3',ship.x,ship.y-83,12,'#9df2d8');
    const angle=p.orbitStart,dir=p.orbitDirection,x=ship.x+Math.cos(angle)*p.orbitRadius,y=ship.y+Math.sin(angle)*p.orbitRadius;
    const dx=-Math.sin(angle)*dir,dy=Math.cos(angle)*dir;ctx.strokeStyle='#fff4c9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*35,y+dy*35);ctx.lineTo(x+dx*27-dy*5,y+dy*27+dx*5);ctx.moveTo(x+dx*35,y+dy*35);ctx.lineTo(x+dx*27+dy*5,y+dy*27-dx*5);ctx.stroke();
    text('RELEASE',clamp(x+dx*42,30,W-30),y+dy*42-6,8,'#fff4c9');
  }
  function draw(){const q=s(),H=game.height,b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const cw=Math.round(b.width*dpr),ch=Math.round(b.height*dpr);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}const scale=Math.min(cw/W,ch/H),ox=(cw-W*scale)/2,oy=(ch-H*scale)/2;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#080f23';ctx.fillRect(0,0,cw,ch);ctx.setTransform(scale,0,0,scale,ox,oy);
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#15243f');g.addColorStop(.57,'#233a50');g.addColorStop(1,'#0b142b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let i=0;i<36;i++)circle(i*73%W,i*83%(H*.58),.8,'#7195ab');ctx.strokeStyle='#74b5b422';ctx.lineWidth=1;for(let x=-300;x<700;x+=85){ctx.beginPath();ctx.moveTo(180+(x-180)*.1,30);ctx.lineTo(x,H*.6);ctx.stroke();}for(let i=1;i<7;i++){ctx.beginPath();const y=30+(H*.6-30)*(i/6)**2;ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    text('ORDERED FRUIT FIELD',180,22,10,'#a6c7d1');ctx.fillStyle='#07112355';ctx.fillRect(0,H*.6,W,H*.4);text('SHIP ZONE · SLIDE LEFT / RIGHT',180,H*.6+20,10,'#88aabe');
    if(q.probe.active)drawForecastPath(game.predictFutureTrajectory(q.probe,q.player));
    text('DASHED = FUTURE · SHIP HELD HERE',180,36,8,'#8bccff');
    const next=q.fruits.find(f=>f.status==='available');for(const f of [...q.fruits].sort((a,b)=>a.y-b.y))if(f.status==='available')fruit(f,f===next);
    const ship=q.player,p=q.probe;ctx.lineWidth=PHYSICS.outer-PHYSICS.depositInner;circle(ship.x,ship.y,(PHYSICS.outer+PHYSICS.depositInner)/2,'#78ebc711',true);ctx.lineWidth=1.5;circle(ship.x,ship.y,PHYSICS.outer,'#78ebc7',true);circle(ship.x,ship.y,PHYSICS.depositInner,'#78ebc755',true);circle(ship.x,ship.y,PHYSICS.inner,'#fa8c88',true);drawRearCatchZone(ship);drawOrbitProgressIndicator(p.orbitCount);
    if(p.active){if(!reduced&&p.trail.length){ctx.strokeStyle='#ffe5ac66';ctx.lineWidth=2;ctx.beginPath();p.trail.forEach((a,i)=>i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y));ctx.stroke();}ctx.setLineDash([3,7]);ctx.strokeStyle='#78ebc744';ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);circle(p.x,p.y,6,'#fff4c9');p.cargo.forEach((id,i)=>{const a=i*2.4;circle(p.x+Math.cos(a)*13,p.y+Math.sin(a)*13,4,['#ffab8c','#b9df78','#c6a0fa'][(id-1)%3]);});if(p.cargo.length)text('×'+p.cargo.length,p.x+19,p.y-12,10,'#ffe199');}
    ctx.fillStyle=q.invulnerability>0?'#ff8e87':'#78ebc7';ctx.beginPath();ctx.moveTo(ship.x,ship.y-15);ctx.lineTo(ship.x+16,ship.y+12);ctx.lineTo(ship.x,ship.y+6);ctx.lineTo(ship.x-16,ship.y+12);ctx.closePath();ctx.fill();if(q.invulnerability>0){ctx.strokeStyle='#ff8e87';ctx.lineWidth=3;ctx.strokeRect(2,2,W-4,H-4);}
    if(q.mode!=='running'){ctx.fillStyle='#0a132bea';ctx.fillRect(20,H*.35,320,100);text(q.mode==='ready'?'ORBITAL FRUIT RESCUE':q.mode==='paused'?'PAUSED':'ROUND OVER',180,H*.35+35,19);text(q.mode==='over'?`${q.score} banked · Play again below`:q.mode==='ready'?'Harvest → orbit → bank. Tap Play below.':'Tap Resume below',180,H*.35+68,12,'#78ebc7');}
  }
  function clearInput(){pointer=null;target=null;keys.clear();}
  function reset(){clearInput();game.reset();last=null;acc=0;ui();}
  function pause(){if(!['running','paused'].includes(s().mode))return;s().mode=s().mode==='running'?'paused':'running';clearInput();last=null;acc=0;ui();}
  $('play').onclick=reset;$('restart').onclick=reset;$('pause').onclick=pause;
  function move(e){const b=canvas.getBoundingClientRect(),H=game.height,scale=Math.min(b.width/W,b.height/H);target=clamp((e.clientX-b.left-(b.width-W*scale)/2)/scale,26,W-26);}
  canvas.addEventListener('pointerdown',e=>{if(s().mode!=='running'||pointer!==null||!e.isPrimary)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);move(e);e.preventDefault();});canvas.addEventListener('pointermove',e=>{if(pointer===e.pointerId){move(e);e.preventDefault();}});for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(pointer===e.pointerId){pointer=null;target=null;}});
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown'].includes(k)&&s().mode==='running'){keys.add(k);e.preventDefault();}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{if(s().mode==='running')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&s().mode==='running')pause();});
  function frame(now){if(last===null)last=now;acc+=s().mode==='running'?Math.min(.1,(now-last)/1000):0;last=now;while(acc>=DT){const dir=target!==null?clamp((target-s().player.x)/(270*DT),-1,1):Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));game.step(DT,dir);acc-=DT;}ui();draw();requestAnimationFrame(frame);}
  root.BORHEZ_GAME=Object.freeze({snapshot:()=>game.snapshot()});ui();requestAnimationFrame(frame);
})(typeof window!=='undefined'?window:globalThis);

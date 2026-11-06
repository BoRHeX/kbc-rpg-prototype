'use strict';
(() => {
  const canvas = document.getElementById('canvas'), ctx = canvas.getContext('2d');
  const el = id => document.getElementById(id);
  const W = 360, H = 430;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const patterns = [
    {name:'The lantern',points:[[90,320],[90,180],[180,85],[270,180],[270,320],[90,320]],pins:[[180,220]]},
    {name:'The wildflower',points:[[180,345],[75,250],[85,115],[180,170],[275,115],[285,250],[180,345]],pins:[[180,260],[180,100]]},
    {name:'The crown',points:[[65,325],[65,130],[125,215],[180,90],[235,215],[295,130],[295,325],[65,325]],pins:[[120,280],[240,280]]}
  ];
  let mode='ready', time=0, score=0, lives=5, stage=0, next=0, sewn=[], flash=0, immune=0, transition=0, pointer=null, sound=false, audio=null;
  let player={x:180,y:380}, last=performance.now();
  const keys=new Set();
  function message(s){el('status').textContent=s;}
  function tone(f){if(!sound)return;try{audio ||= new (window.AudioContext || window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;o.type='sine';g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.14);}catch{sound=false;el('sound').textContent='Sound: unavailable';el('sound').setAttribute('aria-pressed','false');}}
  function clearInput(){if(pointer!==null && canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;keys.clear();}
  function ui(){el('score').textContent=score;el('clock').textContent=Math.max(0,Math.ceil(45-time))+'s';el('lives').textContent=lives+' / 5';el('pause').disabled=mode==='ready'||mode==='over';el('pause').textContent=mode==='paused'?'Resume':'Pause';el('play').disabled=mode==='running'||mode==='paused';el('play').textContent=mode==='over'?'Play again':'Start';}
  function start(){clearInput();mode='running';time=0;score=0;lives=5;stage=0;next=0;sewn=[];flash=0;immune=0;transition=0;player={x:180,y:380};last=performance.now();message('Pattern 1 / 3 · The lantern · Find eye 1');ui();}
  function end(win){mode='over';clearInput();if(win)score+=Math.ceil(45-time)*5;message(win?'All three shine! '+score+' points. Play again?':'Threadlight faded. '+score+' points · Try again!');tone(win?880:160);ui();}
  function move(x,y){player.x=Math.max(20,Math.min(W-20,x));player.y=Math.max(42,Math.min(H-22,y));if(mode!=='running'||transition>0)return;
    const p=patterns[stage];
    if(immune<=0 && p.pins.some(([a,b])=>Math.hypot(player.x-a,player.y-b)<22)){lives--;immune=1;flash=.35;score=Math.max(0,score-15);message('Snag! −15 · Steer around the coral pins.');tone(140);if(lives===0){end(false);return;}}
    const [a,b]=p.points[next];
    if(Math.hypot(player.x-a,player.y-b)<25){sewn.push([a,b]);next++;score+=50;tone(400+next*65);message('Stitch '+next+' / '+p.points.length+' · '+p.name);if(next===p.points.length){score+=100;transition=.65;message('Pattern complete! +100');tone(900);}}ui();
  }
  el('play').addEventListener('click',start);el('restart').addEventListener('click',start);
  function pause(){if(mode==='running'){mode='paused';clearInput();message('Paused · Your needle can wait.');}else if(mode==='paused'){mode='running';last=performance.now();message('Follow the gold eye · Pattern '+(stage+1)+' / 3');}ui();}
  el('pause').addEventListener('click',pause);
  el('sound').addEventListener('click',()=>{sound=!sound;el('sound').textContent='Sound: '+(sound?'on':'off');el('sound').setAttribute('aria-pressed',String(sound));if(sound)tone(660);});
  function point(e){const r=canvas.getBoundingClientRect();move((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height);}
  canvas.addEventListener('pointerdown',e=>{if(mode!=='running'||pointer!==null)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);point(e);e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&mode==='running'){point(e);e.preventDefault();}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===pointer){pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}});
  const valid=['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'];
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(valid.includes(k)&&mode==='running'){keys.add(k);e.preventDefault();}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{if(mode==='running')pause();else clearInput();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='running')pause();});
  function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function text(t,x,y,size,color){ctx.font=`${size}px system-ui`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(t,x,y);}
  function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#193536';ctx.fillRect(0,0,W,H);
    for(let y=12;y<H;y+=18)for(let x=9;x<W;x+=18)circle(x,y,.65,'#82a59035');
    ctx.strokeStyle='#a3b48a55';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(24,43,312,350,100);ctx.stroke();
    const p=patterns[stage];text('0'+(stage+1)+' / '+p.name.toUpperCase(),180,26,12,'#b0c8b5');
    ctx.setLineDash([3,7]);ctx.strokeStyle='#8da28a60';ctx.lineWidth=1.5;ctx.beginPath();p.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);
    if(sewn.length){ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#f0cd85';ctx.beginPath();sewn.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();if(mode==='running'&&transition<=0){ctx.lineWidth=1.5;ctx.strokeStyle='#f0cd8580';ctx.beginPath();ctx.moveTo(...sewn[sewn.length-1]);ctx.lineTo(player.x,player.y);ctx.stroke();}}
    p.pins.forEach(([x,y])=>{circle(x,y,21,'#ee86751a');circle(x,y,10,'#f18a78');text('×',x,y+5,18,'#542f2b');});
    // Draw completed first eye only when it is not also the final closing eye.
    p.points.forEach(([x,y],i)=>{if(i<next){circle(x,y,5,'#f8d78e');return;}if(p.points.some(([a,b],j)=>j<i&&j>=next&&a===x&&b===y))return;
      const active=i===next;const pulse=reduced?0:Math.sin(time*5)*2;
      if(active)circle(x,y,27+pulse,'#ffd98522');circle(x,y,active?20:15,active?'#f3d28e':'#2a4a46');text(String(i+1),x,y+5,active?17:13,active?'#203b35':'#adc5b5');});
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(-.5);ctx.fillStyle=immune>0?'#f4a18d':'#fff9e7';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(6,12);ctx.quadraticCurveTo(0,22,-6,12);ctx.closePath();ctx.fill();circle(0,9,2.2,'#254b48');ctx.restore();
    if(flash>0){ctx.fillStyle='#ff8e7b22';ctx.fillRect(0,0,W,H);}
    if(mode!=='running'){ctx.fillStyle='#102728d9';ctx.fillRect(35,155,290,115);text(mode==='ready'?'Make a little light':mode==='paused'?'Take a breath':next===p.points.length?'Beautifully stitched!':'Try a fresh thread',180,200,23,'#f5d69b');text(mode==='ready'?'Tap Start, then drag to eye 1':mode==='paused'?'Tap Resume to continue':'Tap Play again or Restart',180,233,13,'#d2dfcf');}
  }
  function frame(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    if(mode==='running'){time+=dt;immune=Math.max(0,immune-dt);flash=Math.max(0,flash-dt);
      if(transition>0){transition-=dt;if(transition<=0){if(stage===2)end(true);else{stage++;next=0;sewn=[];message('Pattern '+(stage+1)+' / 3 · '+patterns[stage].name+' · Find eye 1');}}}
      if(mode==='running'&&time>=45){time=45;end(false);}
      if(mode==='running'&&keys.size){let dx=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),dy=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'));const len=Math.hypot(dx,dy)||1;move(player.x+dx/len*240*dt,player.y+dy/len*240*dt);}ui();}
    draw();requestAnimationFrame(frame);
  }
  // Logical coordinates stay stable as CSS resizes the portrait board.
  function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);}
  new ResizeObserver(resize).observe(canvas);resize();
  window.BORHEZ_GAME=Object.freeze({snapshot:()=>({mode,time,score,player:{x:player.x,y:player.y}})});
  ui();requestAnimationFrame(frame);
})();

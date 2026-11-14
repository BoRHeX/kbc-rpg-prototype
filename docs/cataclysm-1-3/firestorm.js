/* Late game firestorm presentation. Deterministic and entirely cosmetic. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const hash=(x,y)=>{let n=(Math.imul((x|0)+99,2654435761)^Math.imul((y|0)+81,1597334677))>>>0;n=Math.imul(n^(n>>>16),2246822519);return((n^(n>>>13))>>>0)/4294967295;};
function flame(ctx,x,y,r,h,t,seed,intensity,reduced){
 const wave=reduced?0:Math.sin(t*6+seed*7)*.21+Math.sin(t*3+seed*13)*.1;
 ctx.save();ctx.translate(x,y);ctx.globalAlpha=Math.min(.92,intensity);
 const flicker=1+wave;
 const gradient=ctx.createLinearGradient(0,-h*flicker,0,0);
 gradient.addColorStop(0,'#ffe2a200');gradient.addColorStop(.22,'#ffd178bf');gradient.addColorStop(.64,'#ff602fd8');gradient.addColorStop(1,'#bd1c13ee');
 ctx.fillStyle=gradient;
 ctx.beginPath();ctx.moveTo(-r,0);
 ctx.bezierCurveTo(-r*.7,-h*.6,-r*.22,-h*.48,-r*.1,-h*flicker);
 ctx.bezierCurveTo(r*.18,-h*.74,r*.66,-h*.54,r,0);
 ctx.closePath();ctx.fill();
 ctx.fillStyle='#ffe5ab99';
 ctx.beginPath();ctx.moveTo(-r*.33,0);ctx.quadraticCurveTo(0,-h*.53*flicker,r*.28,0);ctx.fill();
 ctx.restore();
}
function world(ctx,c,t,intensity,reduced=false){
 const seed=hash(c.x,c.y),x=c.x,y=c.y,w=c.w,h=c.h;
 ctx.save();
 // Cinematic illumination is anchored to actual city props as they stream into view.
 const amount=Math.min(1,intensity),count=c.kind==='building'?4:c.kind==='car'?2:3;
 for(let k=0;k<count;k++){
  const off=hash(c.x+k*179,c.y+k*31),px=x+12+(w-24)*off,py=y+(k%2?h-4:9);
  const size=(c.kind==='building'?23:13)*(0.7+hash(k,c.y)*.7);
  const light=ctx.createRadialGradient(px,py,3,px,py,size*4);
  light.addColorStop(0,'#ff9f5655');light.addColorStop(1,'#e85a1a00');
  ctx.globalAlpha=amount;ctx.fillStyle=light;ctx.fillRect(px-size*4,py-size*4,size*8,size*8);
  flame(ctx,px,py,size*.6,size*(1.5+off),t,off,amount,reduced);
 }
 ctx.restore();
}
function sky(ctx,W,H,t,intensity,reduced=false){
 ctx.save();const v=Math.min(1,intensity);
 // Stacked glow + thick ash smoke. Keeps the player and telegraphs legible.
 const horizon=ctx.createLinearGradient(0,H*.12,0,H);
 horizon.addColorStop(0,'#290d1a00');horizon.addColorStop(.55,'#4e151523');horizon.addColorStop(1,'#b33c1745');
 ctx.globalAlpha=v;ctx.fillStyle=horizon;ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(W*.5,H*1.05,30,W*.5,H*1.05,Math.max(W,H)*.8);
 glow.addColorStop(0,'#fb7b2d35');glow.addColorStop(1,'#c4212000');
 ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 if(!reduced){
  // Bounded foreground sparks; no object allocations or simulation RNG.
  for(let i=0;i<48;i++){
   const q=hash(i,74),rise=(t*(12+q*28)+hash(i,47)*H)%(H+85);
   const x=((hash(i,18)*W+Math.sin(t*.6+i)*13)%(W+30)),y=H+25-rise;
   ctx.globalAlpha=v*(.23+q*.5);ctx.fillStyle=i%3===0?'#fff2b0':'#f48c54';
   ctx.fillRect(x,y,1.5+q*2,2.5+q*4);
  }
 }
 ctx.restore();
}
// Cinematic effects are visual only: no enemy physics or damage changes.
function wave(ctx,W,H,intensity,night,reduced=false){
 const q=Math.max(0,Math.min(1,intensity));
 if(q<=0)return;
 ctx.save();
 const fade=q*q,storm=night>=99;
 ctx.fillStyle=storm?'rgba(33,6,16,'+(fade*.32)+')':'rgba(5,15,28,'+(fade*.29)+')';
 ctx.fillRect(0,0,W,H);
 // A single expanding, low-frequency shock front marks each 13-second release.
 const progress=1-q,base=Math.max(W,H),rad=base*(.11+progress*.88);
 ctx.beginPath();ctx.ellipse(W*.5,H*.52,rad,rad*.7,0,0,TAU);
 ctx.strokeStyle=storm?'rgba(255,162,105,'+(q*.52)+')':'rgba(124,226,233,'+(q*.38)+')';
 ctx.lineWidth=reduced?2:2+q*4;ctx.stroke();
 const edge=ctx.createRadialGradient(W*.5,H*.5,Math.min(W,H)*.23,W*.5,H*.5,Math.max(W,H)*.75);
 edge.addColorStop(0,'#050e1900');
 edge.addColorStop(1,storm?'rgba(102,26,20,'+(q*.25)+')':'rgba(13,37,58,'+(q*.22)+')');
 ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
 ctx.restore();
}
function bossAura(ctx,r,t,finalWave,reduced=false){
 ctx.save();const k=finalWave?1.4:1;
 const q=reduced?0:Math.sin(t*3.8+r)*.5+.5;
 const r0=r*(1.65+q*.12),glow=ctx.createRadialGradient(0,0,r*.7,0,0,r0*1.35);
 glow.addColorStop(0,'#ff9d3b00');glow.addColorStop(.55,finalWave?'#e8583b37':'#e7693b28');
 glow.addColorStop(1,'#c5253000');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r0*1.35,0,TAU);ctx.fill();
 ctx.lineWidth=2.5*k;ctx.strokeStyle='rgba(255,161,94,'+(.24+q*.17)+')';
 ctx.beginPath();ctx.arc(0,0,r0,0,TAU);ctx.stroke();
 if(!reduced)for(let i=0;i<8;i++){
  const a=i*TAU/8+t*(i%2?-.4:.35),len=r0*(.81+.12*Math.sin(t*4+i));
  ctx.fillStyle=i%3===0?'#ffcd85aa':'#ff613899';
  ctx.save();ctx.translate(Math.cos(a)*len,Math.sin(a)*len);ctx.rotate(a);
  ctx.fillRect(-1,-1,5+i%3,1.4);ctx.restore();
 }
 ctx.restore();
}
function finale(ctx,W,H,t,night,burst,reduced=false){
 if(night<99)return;
 const peak=night===100?1:.55,blink=Math.min(1,Math.max(0,burst||0));
 ctx.save();
 // Backlit frame, embers and smoke; all cues stay clear and collisions unchanged.
 const pulse=reduced?.4:.35+.65*Math.pow(Math.max(0,Math.sin(t*1.1)),4);
 const frame=ctx.createLinearGradient(0,0,W,H);
 frame.addColorStop(0,'rgba(249,79,49,'+(.08*peak+.11*blink)+')');
 frame.addColorStop(.5,'rgba(36,7,26,0)');
 frame.addColorStop(1,'rgba(255,152,69,'+(.1*peak+.08*blink)+')');
 ctx.strokeStyle=frame;ctx.lineWidth=6+peak*5;
 ctx.strokeRect(4,4,W-8,H-8);
 for(let i=0;i<12;i++){
  const seed=hash(i+71,night),r=9+seed*19;
  const x=hash(i,73)*W,y=(hash(i,83)*H-t*(13+seed*30)+H*300)%(H+30);
  ctx.globalAlpha=peak*(.24+seed*.35)*(.75+.25*pulse);
  ctx.fillStyle=i%3===0?'#ffe4aa':'#ff6a42';
  ctx.save();ctx.translate(x,y);ctx.rotate(-.4);
  ctx.fillRect(0,0,r*.18,r*.28);ctx.restore();
 }
 if(blink>0){
  ctx.globalAlpha=blink*.2;ctx.fillStyle='#ffac67';ctx.fillRect(0,0,W,H);
  const radius=Math.max(W,H)*(.15+(1-blink)*.6);
  ctx.globalAlpha=blink*.52;ctx.strokeStyle='#ffe0a4';ctx.lineWidth=2+blink*6;
  ctx.beginPath();ctx.ellipse(W/2,H/2,radius,radius*.6,0,0,TAU);ctx.stroke();
 }
 ctx.restore();
}

const API=Object.freeze({world,sky,wave,bossAura,finale,pass:'night100-firestorm-01'});
root.CATA_LAB_FIRE=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);

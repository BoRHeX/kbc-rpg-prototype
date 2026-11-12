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
const API=Object.freeze({world,sky,pass:'night100-firestorm-01'});
root.CATA_LAB_FIRE=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);

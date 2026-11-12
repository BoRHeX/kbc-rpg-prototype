/* The Catastrophe hazard presentation pass. Visual-only; hitboxes owned by game.js. */
(function(root){
'use strict';
const TAU=2*Math.PI;
const ring=(ctx,x,y,r,color,width=2)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();};
const line=(ctx,a,b,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
function crane(ctx,e,time,reduced){
 ctx.save();
 const t=reduced?0:time,armY=e.y-175;
 ctx.lineCap='round';
 // Travelling crane gantry, cable, hook and safety lamps.
 ctx.strokeStyle='#3f6072';ctx.lineWidth=10;
 ctx.beginPath();ctx.moveTo(e.x-135,armY);ctx.lineTo(e.x+135,armY);ctx.stroke();
 ctx.strokeStyle='#93adba';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(e.x-135,armY-6);ctx.lineTo(e.x+135,armY-6);ctx.stroke();
 for(const side of [-1,1]){
  const x=e.x+side*112;ctx.fillStyle='#45617b';ctx.fillRect(x-7,armY,14,42);
  const on=reduced?1:(Math.sin(t*9+side*2)>0?1:.23);
  ctx.fillStyle='rgba(255,170,67,'+on+')';ctx.beginPath();ctx.arc(x,armY+10,7,0,TAU);ctx.fill();
 }
 const drop=e.debris.find(d=>!d.hit);
 const hookX=drop?drop.x:e.x;
 const hookY=drop?drop.y-125+Math.min(1,drop.age/1.6)*115:e.y-40;
 line(ctx,{x:hookX,y:armY},{x:hookX,y:hookY},'#a9c3d1',3);
 ring(ctx,hookX,hookY,9,'#d7dbdc',3);
 const pulse=reduced?0:Math.sin(t*7)*.5+.5;
 ring(ctx,e.x,e.y,140,'rgba(255,146,55,'+(.35+.4*pulse)+')',4);
 ctx.setLineDash([14,11]);ring(ctx,e.x,e.y,140,'#ffe6b5aa',1);ctx.setLineDash([]);
 for(const d of e.debris){
  const progress=Math.min(1,d.age/1.6),height=d.hit?0:(1-progress)*135;
  ring(ctx,d.x,d.y,d.r,d.hit?'#ffbf7877':'#ffc166',d.hit?2:4);
  ctx.fillStyle=d.hit?'#ffd9a51d':'#e0693844';
  ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,TAU);ctx.fill();
  if(!d.hit){
   ctx.save();ctx.translate(d.x,d.y-height);
   const gradient=ctx.createLinearGradient(-22,-28,24,22);
   gradient.addColorStop(0,'#f4a05b');gradient.addColorStop(.55,'#925c4b');gradient.addColorStop(1,'#4c4e5d');
   ctx.fillStyle=gradient;ctx.fillRect(-24,-25,48,42);ctx.strokeStyle='#ffe0a0';ctx.lineWidth=2;ctx.strokeRect(-24,-25,48,42);
   ctx.fillStyle='#272c40';ctx.fillRect(-15,-21,6,35);ctx.fillRect(9,-21,6,35);
   ctx.fillStyle='#ffd678';ctx.fillRect(-20,11,40,5);
   ctx.restore();
  }else{
   for(let i=0;i<8;i++){const a=i*TAU/8+t;line(ctx,{x:d.x,y:d.y},{x:d.x+Math.cos(a)*d.r*.85,y:d.y+Math.sin(a)*d.r*.85},'#ffd29888',2);}
  }
 }
 ctx.fillStyle='#ffe6c8';ctx.font='bold 15px system-ui';ctx.textAlign='center';
 ctx.fillText('CRANE STRIKE · CLEAR THE MARKERS',e.x,e.y-151);
 ctx.restore();
}
function gas(ctx,c,t,r,warning,reduced){
 ctx.save();const age=c.age,alpha=warning?.25:.6,pulse=reduced?0:Math.sin(t*3+c.x)*.5+.5;
 const glow=ctx.createRadialGradient(c.x,c.y,6,c.x,c.y,r*1.3);
 glow.addColorStop(0,warning?'#b4fd6733':'#b4f96a82');
 glow.addColorStop(.55,warning?'#d5f78314':'#8bcf4780');
 glow.addColorStop(1,'#86ac3700');
 ctx.fillStyle=glow;ctx.fillRect(c.x-r*1.3,c.y-r*1.3,r*2.6,r*2.6);
 ctx.setLineDash(warning?[7,7]:[]);
 ring(ctx,c.x,c.y,r,'rgba(188,255,118,'+(alpha+pulse*.15)+')',warning?4:2);
 ctx.setLineDash([]);
 for(let i=0;i<9;i++){
  const a=i*TAU/9+t*.18*(i%2?1:-1),orbit=r*(.22+(i%3)*.23);
  const x=c.x+Math.cos(a)*orbit,y=c.y+Math.sin(a)*orbit-(reduced?0:Math.sin(t*2+i)*12);
  const rr=13+(i%3)*9;
  const cloud=ctx.createRadialGradient(x,y,1,x,y,rr);
  cloud.addColorStop(0,'rgba(194,255,153,'+(.18+pulse*.09)+')');
  cloud.addColorStop(1,'rgba(89,156,43,0)');
  ctx.fillStyle=cloud;ctx.fillRect(x-rr,y-rr,rr*2,rr*2);
 }
 ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillStyle='#e3ffa9';
 ctx.fillText(warning?'☣ GAS VENT · EVACUATE':'☣ TOXIC · LEAVE THE ZONE',c.x,c.y-7);
 ctx.restore();
}
function electric(ctx,e,t,reduced){
 if(!e.zones||e.zones.length<2)return;
 const a=e.zones[0],b=e.zones[1],active=e.age>=e.warning,phase=reduced?0:t*13;
 ctx.save();ctx.lineCap='round';
 for(const post of [a,b]){
  ctx.fillStyle='#233c60';ctx.fillRect(post.x-11,post.y-22,22,44);
  ctx.fillStyle=active?'#b9fbff':'#efca75';ctx.fillRect(post.x-6,post.y-18,12,10);
  ring(ctx,post.x,post.y,24,active?'#87eeff99':'#f8cf8a88',2);
 }
 ctx.lineWidth=active?8:3;ctx.strokeStyle=active?'#5ceeff4d':'#ffbf7566';
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 if(active){
  for(let layer=0;layer<3;layer++){
   ctx.beginPath();const count=reduced?5:18;
   for(let i=0;i<=count;i++){
    const u=i/count,x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;
    const off=(reduced?0:Math.sin(u*53+phase+layer*4)*8+Math.sin(u*103-phase*.4)*5)*(1-Math.abs(2*u-1)*.3);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y+off);
   }
   ctx.strokeStyle=layer===0?'#ddffff':layer===1?'#71eeff':'#96baff99';
   ctx.lineWidth=layer===0?3:layer===1?2:1;ctx.stroke();
  }
 }else{
  ctx.setLineDash([9,8]);line(ctx,a,b,'#ffe4af',3);ctx.setLineDash([]);
 }
 ctx.textAlign='center';ctx.font='bold 15px system-ui';ctx.fillStyle=active?'#c4faff':'#ffda9c';
 ctx.fillText(active?'⚡ LIVE GATE · AVOID THE BEAM':'⚡ GATE CHARGING · '+Math.ceil(e.warning-e.age)+'s',(a.x+b.x)/2,(a.y+b.y)/2-36);
 ctx.restore();
}
const api=Object.freeze({crane,gas,electric,pass:'catastrophe-hazards-03'});
root.CATA_HAZARDS=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

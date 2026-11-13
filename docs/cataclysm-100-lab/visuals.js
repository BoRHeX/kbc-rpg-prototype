/* CATACLYSM 1.0: lightweight neon-noir art direction. Stateless visuals, no gameplay RNG. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const artBase=typeof document!=='undefined'&&document.currentScript
 ?new URL('art/',document.currentScript.src).href:'./art/';
const assetRelease='cataclysm-10-cleanpack-43455224866';
const paintings=Object.create(null);
for(const name of ['ground-0','ground-1','ground-2','ground-3','prop-building','prop-car','prop-dumpster']){
 const asset={image:null,ready:false};paintings[name]=asset;
 if(typeof root.Image!=='function')continue;
 const image=new root.Image();asset.image=image;
 image.onerror=()=>{asset.ready=false;};
 image.onload=()=>{
  if(typeof image.decode==='function')image.decode().then(()=>{asset.ready=true;},()=>{asset.ready=false;});
  else asset.ready=true;
 };
 image.src=artBase+name+'.png?art='+assetRelease;
}
const COLORS=[
 {road:'#202d39',glow:'#45dccc',accent:'#f9bd76',wet:'#74e8eb'},
 {road:'#1d3738',glow:'#6be4b6',accent:'#f3d68c',wet:'#93e2c9'},
 {road:'#382d34',glow:'#fa9062',accent:'#f9c66c',wet:'#ffa985'},
 {road:'#2b2845',glow:'#b19aff',accent:'#eec2fa',wet:'#a5c4ff'}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(x,y){let v=(Math.imul((x|0)+173,374761393)^Math.imul((y|0)+479,668265263))>>>0;v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;}
function line(ctx,x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();}
function ellipse(ctx,x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);ctx.fillStyle=color;ctx.fill();}
// One world-space projection: 670px street blocks, vertical traffic, square roofs.
function ground(ctx,bounds,biome=0){
 const size=670,{left,top,right,bottom}=bounds;
 const tile=paintings['ground-'+(((biome%4)+4)%4)];
 if(!tile.ready)return;
 ctx.save();
 for(let row=Math.floor(top/size);row<=Math.floor(bottom/size);row++)
  for(let col=Math.floor(left/size);col<=Math.floor(right/size);col++){
   // Reverse along the street only; curbs and lanes always join on the same axis.
   ctx.save();ctx.translate(col*size,row*size);
   if(hash(col,row)>.5){ctx.translate(0,size);ctx.scale(1,-1);}
   ctx.drawImage(tile.image,0,0,size,size);ctx.restore();
  }
 ctx.restore();
}
function prop(ctx,c){
 const painting=paintings['prop-'+c.kind];
 if(!painting||!painting.ready)return;
 ctx.save();
 // Shadow follows the physical contact rectangle; transparent margins are excluded.
 ctx.shadowColor='#02081099';ctx.shadowBlur=8;ctx.shadowOffsetX=3;ctx.shadowOffsetY=5;
 ctx.drawImage(painting.image,c.x-c.w*.12,c.y-c.h*.08,c.w*1.24,c.h*1.16);
 ctx.restore();
}
function aura(ctx,id,r,time=0,state='run',reduced=false){
 ctx.save();
 const hero=id==='hero',ally=['shooter','healer','tank','brawler','sniper','engineer','trapper','bard'].includes(id);
 const c=hero?'#83e9ff':ally?'#93ead0':'#f0a1a6';
 ellipse(ctx,0,r*.88,r*1.15,r*.4,'#020d16ae');
 ctx.restore();
}
function shot(ctx,s,t=0,reduced=false){
 if(reduced)return;
 ctx.save();ctx.translate(s.x,s.y);
 const color=s.critical?'#ffe3a8':s.kind==='pet'?'#ffcb84':'#7ceafb';
 ctx.shadowColor=color;ctx.shadowBlur=3;
 ellipse(ctx,0,0,s.critical?5:3,s.critical?5:3,color+'8c');
 ctx.shadowBlur=0;
 if(s.trail&&s.trail.length){
   const tail=s.trail[0],dx=tail.x-s.x,dy=tail.y-s.y;
   const length=Math.max(.001,Math.hypot(dx,dy));
   ctx.rotate(Math.atan2(dy,dx));ctx.fillStyle=color+'8b';
   ctx.beginPath();ctx.moveTo(-3,-3);ctx.lineTo(Math.min(36,length),0);ctx.lineTo(-3,3);ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
function impact(ctx,r,time=0,critical=false,reduced=false){
 ctx.save();const col=critical?'#ffedb0':'#f6f4d6',count=reduced?3:7;
 ctx.lineWidth=critical?3:2;ctx.strokeStyle=col;
 for(let i=0;i<count;i++){
   const a=(i/count)*TAU+time*3,dist=r+3+hash(i,r)*8;
   line(ctx,Math.cos(a)*dist,Math.sin(a)*dist,Math.cos(a)*(dist+10),Math.sin(a)*(dist+10),col,2.2);
 }
 ctx.restore();
}
function atmosphere(ctx,W,H,time=0,night=1,reduced=false){
 ctx.save();
 const bg=ctx.createLinearGradient(0,0,W,H);
 bg.addColorStop(0,'#1a2e3b14');bg.addColorStop(.5,'#04142300');bg.addColorStop(1,'#120b252a');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 if(!reduced){
   // Screen-space drizzle: capped 24 strokes, no allocations in game state.
   ctx.strokeStyle='#b3ebef24';ctx.lineWidth=1;
   for(let i=0;i<24;i++){
     const seed=hash(i,33),x=((seed*W+time*(120+seed*80))%(W+80))-40;
     const y=((hash(i,59)*H+time*200)%(H+80))-40;
     line(ctx,x,y,x-7,y+18,'#b3ebef20',1);
   }
   const pulse=.5+.5*Math.sin(time*.8);
   ctx.globalAlpha=.025+pulse*.02;ctx.fillStyle='#86f8ed';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
 }
 const vignette=ctx.createRadialGradient(W*.5,H*.48,Math.min(W,H)*.16,W*.5,H*.48,Math.max(W,H)*.75);
 vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#01061277');
 ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
 ctx.restore();
}
const API=Object.freeze({ground,prop,aura,shot,impact,atmosphere,palette:COLORS,pass:'catastrophe-neon-noir-02',worldRevision:4,artVersion:assetRelease,hash});
root.CATA_VISUALS=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);

/* CATACLYSM 1.0: lightweight neon-noir art direction. Stateless visuals, no gameplay RNG. */
(function(root){
'use strict';
const TAU=Math.PI*2;
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
function ground(ctx,bounds,biome=0,t=0,reduced=false){
 const {left,top,right,bottom}=bounds,p=COLORS[((biome%4)+4)%4],size=300;
 ctx.save();
 for(let row=Math.floor(top/size);row<=Math.ceil(bottom/size);row++)
  for(let col=Math.floor(left/size);col<=Math.ceil(right/size);col++){
   const x=col*size,y=row*size,n=hash(col,row),x2=x+size,y2=y+size;
   ctx.fillStyle=p.road;ctx.globalAlpha=.23;ctx.fillRect(x+7,y+7,286,286);ctx.globalAlpha=1;
   // Pavement seams, raised curbs and narrow road channels.
   line(ctx,x+7,y+7,x2-7,y+7,'#73818c3a',2);
   line(ctx,x+7,y2-9,x2-7,y2-9,'#040e16aa',7);
   line(ctx,x+8,y+8,x+8,y2-9,'#63747c32',2);
   line(ctx,x+150,y+8,x+150,y2-8,'#07131b7e',2);
   ctx.fillStyle='#9a9f88aa';
   for(let z=0;z<3;z++)ctx.fillRect(x+145,y+42+z*95,3,34);
   if(n>.48){ // Wet-road reflections are fixed in world space: no texture swimming.
     const px=x+32+n*160,py=y+175+(n-.5)*75;
     const wet=ctx.createRadialGradient(px,py,1,px,py,110);
     wet.addColorStop(0,p.wet+'38');wet.addColorStop(.5,p.wet+'12');wet.addColorStop(1,p.wet+'00');
     ctx.fillStyle=wet;ctx.fillRect(px-110,py-110,220,220);
     ellipse(ctx,px,py,66,11,'#b0e9f310');
   }
   // Drains, asphalt cracks, scattered trash, road markings.
   for(let k=0;k<4;k++){
     const sx=x+22+hash(col*31+k,row)*255,sy=y+35+hash(col,row*29+k)*223;
     line(ctx,sx,sy,sx+7+k*3,sy-5,'#0e1a25a0',1.6);
     if(k===2)ellipse(ctx,sx+5,sy-5,2,1.2,p.accent+'80');
   }
   ctx.fillStyle='#061622c9';ctx.fillRect(x+245,y+230,33,12);
   for(let k=0;k<4;k++)line(ctx,x+249+k*7,y+232,x+249+k*7,y+240,'#65778295',1);
   if((col+row)%4===0){ // Crosswalk stripes on isolated intersections.
    ctx.fillStyle='#d8ded56a';
    for(let k=0;k<5;k++)ctx.fillRect(x+18+k*24,y+272,14,6);
   }
   if(biome===1){
     ellipse(ctx,x+48,y+52,28,9,'#2c6d54');
     for(let k=0;k<4;k++)line(ctx,x+38+k*7,y+50,x+35+k*9,y+30,'#56b98890',2);
   }else if(biome===2){
     ctx.fillStyle='#e67f5355';ctx.fillRect(x+248,y+26,3,48);
     ellipse(ctx,x+248,y+70,19,6,'#fa88552b');
   }else if(biome===3){
     ctx.fillStyle='#ada4fc30';ctx.fillRect(x+46,y+240,38,2);
     line(ctx,x+55,y+242,x+70,y+256,p.wet+'aa',1.2);
   }
  }
 ctx.restore();
}
function prop(ctx,c,biome=0,t=0,reduced=false){
 const p=COLORS[((biome%4)+4)%4],{x,y,w,h}=c,n=hash(x,y);
 ctx.save();
 if(c.kind==='building'){
   // Layered roof edge, architectural shadow, HVAC and illuminated entrances.
   ctx.fillStyle='#070f1aa8';ctx.fillRect(x+16,y+18,w,h);
   ctx.fillStyle='#5f778399';ctx.fillRect(x+4,y+3,w-8,8);
   ctx.fillStyle='#0e1e29';ctx.fillRect(x+15,y+14,w-30,8);
   const roof=ctx.createLinearGradient(x,y,x+w,y+h);
   roof.addColorStop(0,'#93a8a11a');roof.addColorStop(.6,'#121b2700');roof.addColorStop(1,'#07111d70');
   ctx.fillStyle=roof;ctx.fillRect(x+12,y+23,w-24,h-40);
   ctx.strokeStyle=p.glow+'66';ctx.lineWidth=2;
   ctx.strokeRect(x+8,y+8,w-16,h-20);
   for(let k=0;k<3;k++){
     const vx=x+43+k*53,vy=y+36+(k%2)*32;
     if(vx+41>x+w-24)continue;
     ctx.fillStyle='#111c27';ctx.fillRect(vx,vy,37,24);
     ctx.fillStyle='#647b7f';ctx.fillRect(vx+3,vy+3,31,18);
     for(let d=0;d<5;d++)line(ctx,vx+7+d*5,vy+4,vx+7+d*5,vy+20,'#213540',1.5);
   }
   const sx=x+w-80,sy=y+h-54;
   ctx.fillStyle='#061219';ctx.fillRect(sx,sy,51,42);
   ctx.fillStyle=p.glow+'55';ctx.fillRect(sx+4,sy+6,43,4);
   ctx.fillStyle=p.accent;ctx.fillRect(sx+6,sy+17,9,2);
   if(n>.38){
     ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=reduced?0:10;
     ctx.fillStyle=p.glow+'cc';ctx.fillRect(x+32,y+h-43,62,5);ctx.restore();
     ctx.fillStyle='#daeaea';ctx.font='bold 10px system-ui';ctx.fillText(n>.7?'OPEN 24H':'NEON',x+36,y+h-30);
   }
 }else if(c.kind==='car'){
   // Windshield sheen, paintwork, mirrors, grille and animated signal lights.
   const glass=ctx.createLinearGradient(x+38,y,x+w-36,y+h);
   glass.addColorStop(0,'#8cdae0bb');glass.addColorStop(.48,'#375b6d77');glass.addColorStop(1,'#071826d0');
   ctx.fillStyle=glass;ctx.fillRect(x+43,y+13,w-86,h-26);
   ctx.fillStyle='#dceaf7a8';ctx.fillRect(x+47,y+18,w-94,3);
   ctx.fillStyle='#13202a';ctx.fillRect(x+20,y+8,10,17);ctx.fillRect(x+w-30,y+h-25,10,17);
   line(ctx,x+7,y+h/2,x+w-8,y+h/2,'#f7f4e042',2);
   const signal=!reduced&&(Math.floor(t*1.7+n*5)%2===0);
   ctx.fillStyle=signal?'#ffce77':'#947451';ctx.fillRect(x+w-8,y+13,5,12);
   ctx.fillStyle='#e2f4f3';ctx.fillRect(x+w-8,y+h-23,5,10);
   ctx.strokeStyle='#09131f';ctx.lineWidth=2;ctx.strokeRect(x+7,y+14,w-14,h-28);
 }else if(c.kind==='dumpster'){
   ctx.fillStyle='#091c22';ctx.fillRect(x+8,y+18,w-16,h-25);
   for(let i=0;i<3;i++){
     line(ctx,x+16+i*22,y+23,x+14+i*22,y+h-17,'#568479',2);
   }
   ctx.fillStyle=p.glow+'aa';ctx.fillRect(x+20,y+28,28,4);
   ctx.fillStyle='#c7e0d7';ctx.font='bold 10px system-ui';ctx.fillText('RECYCLE',x+12,y+h-17);
   ctx.fillStyle='#ddc76a';ctx.fillRect(x+w-22,y+23,11,4);
 }
 ctx.restore();
}
function aura(ctx,id,r,time=0,state='run',reduced=false){
 ctx.save();
 const hero=id==='hero',ally=['shooter','healer','tank','brawler','sniper','engineer','trapper','bard'].includes(id);
 const c=hero?'#83e9ff':ally?'#93ead0':'#f0a1a6';
 ellipse(ctx,0,r*.88,r*1.15,r*.4,'#020d16ae');
 ellipse(ctx,0,r*.89,r*.72,r*.2,c+'19');
 if(hero||ally){
   ctx.strokeStyle=c+'50';ctx.lineWidth=1.6;
   ctx.beginPath();ctx.ellipse(0,r*.85,r*1.33,r*.49,0,-.3,2.2);ctx.stroke();
 }
 if(!reduced&&(state==='feral'||state==='adrenaline')){
   ctx.strokeStyle=state==='feral'?'#ff956d':'#88e6ff';ctx.lineWidth=2.5;ctx.globalAlpha=.55;
   for(let i=0;i<3;i++){
     const a=i*TAU/3+time*2;
     line(ctx,Math.cos(a)*r*.8,Math.sin(a)*r*.7,Math.cos(a)*r*1.8,Math.sin(a)*r*1.4,ctx.strokeStyle,2.5);
   }
 }
 ctx.restore();
}
function shot(ctx,s,t=0,reduced=false){
 if(reduced)return;
 ctx.save();ctx.translate(s.x,s.y);
 const color=s.critical?'#ffe3a8':s.kind==='pet'?'#ffcb84':'#7ceafb';
 ctx.shadowColor=color;ctx.shadowBlur=11;
 ellipse(ctx,0,0,s.critical?9:6,s.critical?9:6,color+'8c');
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
const API=Object.freeze({ground,prop,aura,shot,impact,atmosphere,palette:COLORS,pass:'catastrophe-neon-noir-02',hash});
root.CATA_VISUALS=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);

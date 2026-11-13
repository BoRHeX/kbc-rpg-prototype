/* Original ink-and-gouache quadruped. Fixed illustrated facing; independent tail aim. */
(function(root){
'use strict';
const TAU=Math.PI*2;
function muzzle(angle,r=27){return {x:(-19+Math.cos(angle)*48)*r/23,y:(-26+Math.sin(angle)*48)*r/23};}
function draw(ctx,rig,pose,aim=0,r=23,time=0,opt={}){
 const moving=opt.moving,feral=pose?.feral||opt.feral,adrenaline=pose?.adrenaline||opt.adrenaline,hurt=opt.hit||pose?.damaged;
 const t=opt.reduced?0:time,step=t*(adrenaline?19:13),bob=moving?Math.sin(step*2)*1.4:Math.sin(t*2.5)*.9;
 ctx.save();ctx.scale(r/23,r/23);
 function oval(x,y,rx,ry,fill,stroke='#4b4a60',width=1.4){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 function line(points,color,width){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
 // Tail stays attached at the rump and bends toward a world-space aim point.
 const tip={x:-19+Math.cos(aim)*37,y:-26+Math.sin(aim)*37};
 ctx.beginPath();ctx.moveTo(-22,-8);ctx.bezierCurveTo(-49+Math.sin(t*3)*3,-22,-35+Math.cos(aim)*18,-48+Math.sin(aim)*17+Math.cos(t*4)*2,tip.x,tip.y);
 ctx.lineCap='round';ctx.strokeStyle='#424256';ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle='#e2e1e7';ctx.lineWidth=7;ctx.stroke();
 // All four paws have separate shoulder/hip positions and diagonal gait phases.
 function leg(x,far,phase){const swing=moving?Math.sin(step+phase):0,lift=moving?Math.max(0,Math.cos(step+phase))*5:0;
 line([[x,-2+bob],[x+swing*3,8],[x+swing*6,19-lift]],far?'#8f99ad':'#4b4a60',8);
 line([[x,-3+bob],[x+swing*3,8],[x+swing*6,18-lift]],far?'#b5c2d2':'#f0eee8',5);
 oval(x+2+swing*6,19-lift,6,3.7,far?'#bac8d8':'#fff7e9');
 line([[x+swing*6+3,18-lift],[x+swing*6+3,20-lift]],'#a6a1ad',.7);}
 leg(-17,true,Math.PI);leg(13,true,0);
 ctx.save();ctx.translate(hurt?Math.sin(t*65)*3:0,bob);if(hurt)ctx.rotate(-.13);
 const fur=ctx.createLinearGradient(-20,-28,12,13);fur.addColorStop(0,'#fffcef');fur.addColorStop(.5,'#f4eee2');fur.addColorStop(1,'#a9bdce');
 oval(-4,-6,29,17,fur);
 // Drawn fur strokes follow the back rather than a flat mechanical body.
 for(let i=0;i<21;i++){const x=-27+i*2.1,y=-13+Math.sin(i*1.7)*3;line([[x,y],[x+2,y+2.5]],i%3?'#d5d6d5':'#fffdf2',.7);}
 if(feral){for(let i=0;i<7;i++)line([[-23+i*6,-17],[-25+i*6,-24],[-18+i*6,-18]],'#fff3db',2);}
 // Scarf and long ribbon react to running and adrenaline.
 ctx.fillStyle=feral?'#ff647e':'#d94a65';ctx.beginPath();ctx.moveTo(12,-13);ctx.lineTo(-18,-9);ctx.lineTo(-29,-15+Math.sin(t*9)*4);ctx.lineTo(-22,-3);ctx.lineTo(15,-4);ctx.fill();
 oval(19,-23,18,17,fur);
 function ear(x,tilt){ctx.beginPath();ctx.moveTo(x-7,-33);ctx.lineTo(x-5+tilt,-49);ctx.quadraticCurveTo(x+3,-43,x+7,-32);ctx.fillStyle='#f9f2e5';ctx.fill();ctx.strokeStyle='#4b4a60';ctx.lineWidth=1.5;ctx.stroke();line([[x-3,-36],[x-3+tilt,-43],[x+2,-35]],'#e9a2ae',3);}
 ear(9,hurt?-5:0);ear(29,feral?4:0);
 oval(28,-17,11,7,'#fff8eb',null);oval(12,-16,9,6,'#fff8eb',null);
 const blink=Math.sin(t*1.9)>.993;
 for(const x of [14,29]){if(blink||hurt)line([[x-3,-25],[x+3,-24]],'#394454',2);else{oval(x,-26,3.8,5,feral?'#ff758b':adrenaline?'#ffd46e':'#81cbbf');oval(x+1,-26,1.3,3.8,'#25364c',null);oval(x+1,-28,1,1,'#fff',null);}}
 oval(24,-18,2.5,1.8,'#c7778f',null);line([[24,-16],[23,-13],[20,-14]],'#705365',1);
 for(const side of [-1,1])for(let j=0;j<3;j++)line([[24+side*8,-16+j*2],[24+side*19,-19+j*4]],'#737c8f',.65);
 ctx.restore();leg(-21,false,0);leg(15,false,Math.PI);
 // A single small brass tail pistol; no hand weapons or body aim rotations.
 ctx.save();ctx.translate(tip.x,tip.y);ctx.rotate(aim);ctx.fillStyle='#3b4057';ctx.strokeStyle='#171c30';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-5,-4,16,8,2);ctx.fill();ctx.stroke();ctx.fillStyle='#e8bf73';ctx.fillRect(-3,-3,10,2);ctx.fillStyle='#91e6e3';ctx.fillRect(7,-2,4,4);ctx.fillStyle='#845c63';ctx.fillRect(-3,3,5,7);ctx.restore();
 if(pose?.shielded||opt.shielded){ctx.strokeStyle='#a1f4f8';ctx.lineWidth=1.5;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(0,-8,43,39,Math.sin(t)*.1,0,TAU);ctx.stroke();ctx.setLineDash([]);}
 ctx.restore();return {bearing:0,frame:Math.floor(t*12)%12};
}
root.CATA_HERO_RIG_RENDER=Object.freeze({draw,muzzle,version:'everything-drawn-quadruped-1.1'});
})(globalThis);

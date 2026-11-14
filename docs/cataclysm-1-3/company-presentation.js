/* Authored code-native costume/prop graphics over inherited illustrated cutouts.
   These are NOT new hand-painted characters. Simulation owns every timer. */
(function(root){
'use strict';
const colors={angler:'#7edbc5',scout:'#e6cf80',alchemist:'#bfef86',salvager:'#d8a274',saboteur:'#ec9baf',stormcaller:'#92dbff',courier:'#ffca71',hexcat:'#d5b1ff'};
const lines={feed:'Mine. Finally.',catch:'Fresh catch!',mark:'Weak spot!',brew:'Do not sniff.',recycle:'Scrap has potential.',blackout:'Lights out.',arc:'Static problem.',delivery:'Lunch delivery!',curse:'Nine bad omens.',evolve:'New whiskers. New rules.',build:'Assembly required.',board:'Scoot over!',fire:'Crew ready.',breakdown:'Too spicy!',repaired:'Wrench, then lunch.'};
function line(c,points,color,width=3){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();}
function disk(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function prop(c,role,t){
 const col=colors[role];if(!col)return;
 // Broad scarf and oversized silhouette props remain legible at ~40px.
 c.fillStyle=col;c.fillRect(-13,-8,24,5);line(c,[[-9,-4],[-22,4],[-13,6]],col,5);
 switch(role){
 case 'angler':line(c,[[9,2],[22,-29],[32,-22],[32,0]],'#e8c896',2);line(c,[[29,0],[32,4],[35,0]],col,2);break;
 case 'scout':c.fillStyle='#263943';c.fillRect(-12,-20,22,8);disk(c,-6,-16,4,col);disk(c,5,-16,4,col);break;
 case 'alchemist':line(c,[[15,-16],[15,-7],[10,3],[12,8],[25,8],[27,3],[22,-7],[22,-16]],col,3);disk(c,19,1,5,'#a5eb78');disk(c,25,-19+Math.sin(t*3)*2,2,col);break;
 case 'salvager':c.fillStyle='#674b38';c.fillRect(-25,-9,16,20);line(c,[[-23,-4],[-13,-4]],col);line(c,[[18,8],[28,-10],[23,-16],[19,-11],[22,-8]],'#d2e0dd',4);break;
 case 'saboteur':c.fillStyle='#26313c';c.fillRect(-15,-19,28,8);line(c,[[-12,-15],[-7,-15]],col,2);line(c,[[2,-15],[7,-15]],col,2);line(c,[[13,1],[23,5],[25,-4],[18,-8],[13,1]],col);break;
 case 'stormcaller':line(c,[[15,-29],[8,-15],[19,-15],[10,-1]],col,4);line(c,[[-22,-23],[-17,-12],[-25,-12],[-19,-2]],col,2);break;
 case 'courier':c.fillStyle='#985c36';c.fillRect(-25,-8,17,18);line(c,[[-24,-6],[-17,0],[-9,-6]],'#ffe1ad',2);line(c,[[10,-2],[21,-8],[25,-4]],col,4);break;
 case 'hexcat':line(c,[[-17,-18],[0,-37],[14,-16],[-17,-18]],col,3);disk(c,20,-16,7,col);disk(c,23,-19,6,'#142935');break;
 }
}
function draw(c,p,t,drawCat,reduced){
 c.save();c.translate(p.x,p.y);
 if(p.type==='mecha'){
  const repair=p.mechaStage==='repair',build=p.mechaStage==='build',board=p.mechaStage==='board';
  const bob=reduced?0:Math.sin(t*7)*1.5;
  c.translate(0,bob);c.fillStyle='#253c48';c.strokeStyle='#d0b789';c.lineWidth=3;
  c.beginPath();c.moveTo(-28,15);c.lineTo(-31,-13);c.lineTo(-16,-27);c.lineTo(19,-27);c.lineTo(31,-10);c.lineTo(28,15);c.closePath();c.fill();c.stroke();
  for(const x of [-23,22]){c.fillStyle='#627e83';c.fillRect(x-7,13,14,10);line(c,[[x-8,24],[x+10,24]],'#dbbc83',4);}
  c.save();c.translate(repair?-35:-7,repair?2:-16);drawCat('engineer',11,t);c.restore();
  c.save();c.translate(board?-35+Math.min(1,1-p.mechaClock)*42:7,board?4:-21);drawCat('shooter',11,t);c.restore();
  c.fillStyle='#bb9467';c.fillRect(13,-11,35,9);line(c,[[17,-8],[45,-8]],'#eddfba',2);
  if(repair||build){const swing=reduced?0:Math.sin(t*12)*5;line(c,[[-35,0],[-20,-12+swing],[-16,-18+swing]],'#ffe0a1',4);disk(c,-14,-19+swing,3,'#e9edc7');}
  if(repair){line(c,[[15,-29],[20,-39],[17,-46]],'#8796a4',4);}
  c.fillStyle='#111d2b';c.fillRect(-28,29,56,5);c.fillStyle=repair?'#ff9b88':'#8ce5ce';c.fillRect(-28,29,56*Math.min(1,p.heat/110),5);
 }else{
  prop(c,p.type,reduced?0:t);
  if(p.level===3){line(c,[[-14,-29],[-9,-34],[-4,-29],[1,-34],[6,-29]],'#ffdf82',2);}
 }
 if(p.forage?.eating>0||p.companyEvent==='feed'&&p.eventUntil>t){const y=reduced?1:Math.sin(t*16)*2;line(c,[[13,y],[24,y]],'#f4cf8c',4);line(c,[[24,y],[29,y-4],[29,y+4],[24,y]],'#f4cf8c',2);}
 if(p.eventUntil>t&&lines[p.companyEvent]){
  c.font='bold 11px system-ui';const txt=lines[p.companyEvent],w=c.measureText(txt).width+12;
  c.fillStyle='#10232ef2';c.fillRect(-w/2,-66,w,20);c.fillStyle=colors[p.type]||'#ffe3aa';c.textAlign='center';c.fillText(txt,0,-52);
 }
 if(p.companyEvent==='evolve'&&p.eventUntil>t){c.strokeStyle='#ffe294';c.lineWidth=3;c.beginPath();c.arc(0,-4,28+(reduced?0:(1-p.eventUntil+t)*18),0,Math.PI*2);c.stroke();}
 c.restore();
}
root.CATA_COMPANY_PRESENTATION=Object.freeze({draw,colors,lines});
})(globalThis);

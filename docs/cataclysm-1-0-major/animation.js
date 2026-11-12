/* Original painted atlases with procedural articulated loading/failure fallback.
   Five independent body groups, deterministic frame selection and readable states. */
(function(root){
'use strict';
const major=root.CATA_MAJOR;
const allyIds=['shooter','healer','tank','brawler','sniper','engineer','trapper','bard'];
const allyColors=['#e5c38a','#92e6bf','#9fc6ee','#ed9b7d','#bde282','#ebc36e','#8bdfeb','#d1a1ec'];
const PALETTES={hero:'#f4eee1'};
for(let i=0;i<allyIds.length;i++)PALETTES[allyIds[i]]=allyColors[i];
const shape={hero:'scarf',shooter:'visor',healer:'healer',tank:'armor',brawler:'fangs',sniper:'scope',engineer:'helmet',trapper:'antenna',bard:'hood'};
for(const row of Object.values(major.catalog))for(const item of row){PALETTES[item.id]=item.color;shape[item.id]=item.shape||({melee:'fangs',ranged:'scope',caster:'hood'})[item.role];}
const enemyIds=Object.values(major.catalog).flat().map(e=>e.id);
const characters=Object.freeze({
 enemies:Object.freeze(Object.fromEntries(enemyIds.map(id=>[id,6]))),
 allies:Object.freeze(Object.fromEntries(allyIds.map(id=>[id,12]))),
 hero:Object.freeze({idle:24,run:24,hit:24,feral:24,adrenaline:24})
});
// Resolve against this script so both document links and nested routes use local art.
const assetBase=typeof document!=='undefined'&&document.currentScript
 ?new URL('art/',document.currentScript.src).href:'./art/';
const atlases=Object.create(null);
let loaded=0,failed=0,total=0;
function loadAtlas(key,count){
 total++;
 const entry={image:null,ready:false,count};atlases[key]=entry;
 if(typeof root.Image!=='function')return;
 const img=new root.Image();entry.image=img;
 let settled=false;
 const fail=()=>{if(!settled){settled=true;failed++;}};
 img.onerror=fail;
 img.onload=()=>{
  if(img.naturalWidth!==count*96||img.naturalHeight!==96){fail();return;}
  const ready=()=>{if(!settled){settled=true;entry.ready=true;loaded++;}};
  if(typeof img.decode==='function')img.decode().then(ready,fail);else ready();
 };
 img.src=assetBase+key+'.png';
}
for(const state of ['idle','run','hit','feral','adrenaline','attack'])loadAtlas('hero-'+state,24);
for(const id of allyIds)loadAtlas(id+'-run',12);
for(const id of enemyIds)loadAtlas(id+'-run',6);
function assetStatus(){return {loaded,failed,total};}
// Optional, data-only animations produced from an artist's visual reference.
// New characters/states load without further game-source edits.
const overrides=Object.create(null);
const overrideMetrics={loaded:0,failed:0,total:0,manifestReady:false};
function overrideStatus(){
 return {...overrideMetrics,characters:Object.keys(overrides).filter(k=>overrides[k].ready)};
}
function hasReferenceAnimation(id,state){return !!overrides[id+'-'+state]?.ready;}
function loadReferenceAnimations(){
 if(typeof root.fetch!=='function'||typeof root.Image!=='function')return;
 root.fetch(assetBase+'character-animations.json',{cache:'no-cache'}).then(response=>{
  if(!response.ok)throw Error('Character manifest HTTP '+response.status);
  return response.json();
 }).then(data=>{
  if(data.version!==1||!data.characters||typeof data.characters!=='object')
   throw Error('Invalid character animation manifest');
  for(const [id,states] of Object.entries(data.characters)){
   if(!Object.prototype.hasOwnProperty.call(PALETTES,id)||!states||typeof states!=='object')continue;
   for(const [state,info] of Object.entries(states)){
    if(!/^(idle|walk|run|attack|aim|hit|feral|adrenaline|special)$/.test(state))continue;
    if(!info||!Number.isInteger(info.frames)||info.frames<2||info.frames>16||
      !Number.isFinite(info.fps)||info.fps<2||info.fps>30)continue;
    const key=id+'-'+state,entry={image:null,ready:false,count:info.frames,fps:info.fps,
      embeddedWeapon:info.embedded_weapon!==false,scale:Math.min(1.35,Math.max(.75,Number(info.scale)||1))};
    overrides[key]=entry;overrideMetrics.total++;
    const img=new root.Image();entry.image=img;
    let settled=false;
    const fail=()=>{if(!settled){settled=true;overrideMetrics.failed++;}};
    img.onerror=fail;
    img.onload=()=>{
     if(img.naturalWidth!==entry.count*96||img.naturalHeight!==96){fail();return;}
     const ready=()=>{if(!settled){settled=true;entry.ready=true;overrideMetrics.loaded++;}};
     if(typeof img.decode==='function')img.decode().then(ready,fail);else ready();
    };
    img.src=assetBase+'characters/'+encodeURIComponent(id)+'/'+encodeURIComponent(state)+'.png';
   }
  }
  overrideMetrics.manifestReady=true;
 }).catch(err=>{overrideMetrics.failed++;overrideMetrics.manifestReady=false;
  if(root.console&&root.console.warn)root.console.warn('Reference animation manifest unavailable',err.message);
 });
}
loadReferenceAnimations();

// A separate metal gun layer pivots at the hands, keeping aim continuous between atlas frames.
function paintedGun(ctx,id,aim,recoil){
 const long=id==='sniper'||id==='echo-reaper'||id==='ghost';
 ctx.save();ctx.translate(8-recoil*3,3-recoil);ctx.rotate(Number.isFinite(aim)?aim:0);
 if(Math.cos(Number.isFinite(aim)?aim:0)<0)ctx.scale(1,-1);
 poly(ctx,[[-5,-4],[12,-4],[17,-2],[long?40:29,-2],[long?40:29,2],[16,2],[11,5],[-5,5]],'#172737','#071421',1.2);
 rect(ctx,-3,-3,16,2,'#90a9ad');rect(ctx,4,5,7,7,'#435865');
 rect(ctx,18,-1,long?21:10,1,'#d5c9a0');
 for(let k=0;k<4;k++)rect(ctx,13+k*3,-3,1,2,'#6e878b');
 if(long){rect(ctx,3,-7,13,3,'#283f50');rect(ctx,13,-7,3,3,'#83e8de');}
 oval(ctx,-5,5,3.5,3,id==='hero'?'#f0e9d7':PALETTES[id]);
 ctx.restore();
}
const TWO=Math.PI*2;
function frameCount(id,state){
  if(id==='hero')return 24;
  if(allyIds.includes(id))return 12;
  return 6;
}
function pose(id,state,frame){
  const count=frameCount(id,state),f=((Math.floor(frame)%count)+count)%count;
  const t=f/count*TWO,run=state==='run'||state==='feral'||state==='adrenaline';
  const feral=state==='feral',adrenaline=state==='adrenaline',hit=state==='hit',attack=state==='attack';
  const intensity=run?1.3:state==='idle'?.32:attack?.72:.68;
  const stride=Math.sin(t),lift=Math.max(0,stride),recoil=attack?Math.max(0,Math.sin(t*2))*.8:0;
  const weight=feral?1.3:adrenaline?1.18:1;
  return Object.freeze({
    frame:f,
    head:{x:stride*1.8*weight,y:Math.cos(t*2)*1.45*intensity+(hit?Math.sin(t*3)*3:0)-recoil*1.8,rotation:stride*.06+(hit?.17:0)-recoil*.08},
    torso:{y:Math.cos(t*2)*2.4*intensity-recoil*2,scale:1+Math.cos(t*2)*.055*intensity,tilt:stride*.055+(feral?.07:0)},
    legs:{left:(stride*9-lift*4)*intensity,right:(-stride*9-Math.max(0,-stride)*4)*intensity,front:stride*4*intensity},
    arms:{left:-stride*11*intensity+recoil*4,right:stride*11*intensity-recoil*7},
    tail:{x:Math.sin(t+.6)*14*weight,rotation:Math.sin(t+.7)*.36*weight},
    eyes:{open:hit?.5:feral?1.35:adrenaline?1.2:1,offset:Math.sin(t)*.7},
    whiskers:Math.sin(t*3)*1.8,
    recoil,effort:weight*intensity,
    glow:feral?'#ff853a':adrenaline?'#80f4ff':hit?'#ff5c73':null,
    speedStreak:feral?1.8:adrenaline?2:0
  });
}
function rect(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function poly(ctx,pts,fill,stroke='#091c27',sw=2){
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}
}
function oval(ctx,x,y,rx,ry,color){
  ctx.beginPath();ctx.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,TWO);ctx.fillStyle=color;ctx.fill();
}
function draw(ctx,id,r,time,state='run',aim=0,damaged=false,reduced=false){
  if(!PALETTES[id])id='shambler';
  const override=overrides[id+'-'+state]?.ready?overrides[id+'-'+state]:
    (state!=='run'&&overrides[id+'-run']?.ready?overrides[id+'-run']:null);
  const count=override?override.count:frameCount(id,state);
  const fps=override?override.fps:(id==='hero'?24:allyIds.includes(id)?12:6);
  const frame=reduced?0:Math.floor(Math.max(0,time)*fps)%count;
  const sheet=override||atlases[id+'-'+(id==='hero'?state:'run')]||atlases[id+'-run'];
  if(sheet&&sheet.ready){
    // Atlas feet sit at y=82; entity origin at (48,58), matching the fallback footprint.
    const unit=r/23*(override?override.scale:1),recoil=state==='attack'&&!reduced?Math.max(0,Math.sin(frame/count*TWO*2))*.8:0;
    ctx.save();ctx.scale(unit,unit);
    ctx.drawImage(sheet.image,frame*96,0,96,96,-48,-58,96,96);
    if(damaged){
      // Repaint only the sprite silhouette with a bright exposure; transparency remains intact.
      ctx.save();ctx.globalAlpha=.7;ctx.filter='brightness(2.6) saturate(.35)';
      ctx.drawImage(sheet.image,frame*96,0,96,96,-48,-58,96,96);ctx.restore();
    }
    if((!override||!override.embeddedWeapon)&&(id==='hero'||id==='shooter'||id==='sniper'||id==='watcher'||id==='echo-reaper'||id==='ghost'))paintedGun(ctx,id,aim,recoil);
    if(state==='feral'||state==='adrenaline'){
      ctx.strokeStyle=state==='feral'?'#ffb464':'#86f4fa';ctx.lineWidth=1.5;ctx.globalAlpha=.65;
      ctx.beginPath();ctx.ellipse(0,24,26,6,0,0,TWO);ctx.stroke();
      if(!reduced)for(let k=0;k<3;k++)rect(ctx,-34-k*4,-8+k*12,7+Math.sin(time*9+k)*3,1,ctx.strokeStyle);
    }
    if(state==='attack'&&!reduced&&recoil>.15){
      ctx.save();ctx.translate(8-recoil*3,3-recoil);ctx.rotate(Number.isFinite(aim)?aim:0);
      poly(ctx,[[29,0],[35,-5],[34,-1],[43,0],[34,2],[36,5]],'#ffe8a2',null);ctx.restore();
    }
    ctx.restore();return frame;
  }
  const p=pose(id,state,frame),color=PALETTES[id],detail=shape[id]||'fangs';
  const hero=id==='hero',ally=allyIds.includes(id),elite=major.catalog.elites.some(e=>e.id===id),superElite=major.catalog.superElites.some(e=>e.id===id);
  const boss=major.catalog.bosses.some(e=>e.id===id);
  ctx.save();ctx.scale(r/23,r/23);ctx.lineJoin='round';ctx.lineCap='round';
  oval(ctx,2,24,27,8,'#060d18a0');
  // TAIL: independent animated chain, readable even behind big boss armor.
  ctx.beginPath();ctx.moveTo(-13,12);ctx.bezierCurveTo(-36,14,-38+p.tail.x,29,-35+p.tail.x,-1+p.tail.rotation*10);
  ctx.strokeStyle='#0a1924';ctx.lineWidth=11;ctx.stroke();
  ctx.strokeStyle=color;ctx.lineWidth=6;ctx.stroke();
  ctx.beginPath();ctx.moveTo(-35+p.tail.x,-1+p.tail.rotation*10);ctx.lineTo(-35+p.tail.x,-7+p.tail.rotation*10);
  ctx.strokeStyle=hero?'#e5d7c2':color;ctx.lineWidth=5;ctx.stroke();
  // LEGS: visible left/right stepping, separate foot positions.
  for(const [side,motion] of [[-1,p.legs.left],[1,p.legs.right]]){
    const sx=side*9;
    poly(ctx,[[sx-6,9],[sx+7,9],[sx+7+motion*.25,21+motion],[sx-7+motion*.3,24+motion]],
      hero?'#d9d9d2':color);
    oval(ctx,sx+motion*.5,22+motion,8,6,hero?'#fbf5e8':color);
    rect(ctx,sx-4+motion*.5,24+motion,8,2,'#2b3b45');
  }
  // TORSO and armored garment.
  ctx.save();ctx.translate(0,p.torso.y);ctx.rotate(p.torso.tilt);ctx.scale(p.torso.scale,1);
  oval(ctx,0,5,boss?22:19,boss?18:17,'#091923');
  oval(ctx,0,4,boss?19:16,boss?15:14,hero?'#57867d':ally?'#2c5357':'#43575a');
  poly(ctx,[[-10,-7],[-3,-12],[10,-9],[8,-5],[-6,-3]],hero?'#b2e4cb':ally?'#8db9b4':'#6d8389',null);
  poly(ctx,[[-7,8],[1,9],[12,6],[9,11],[-9,13]],hero?'#2d5c62':ally?'#1f4049':'#273f4c',null);
  if(detail==='armor'||boss)poly(ctx,[[-18,-5],[-9,-19],[9,-19],[18,-5],[12,16],[-12,16]],'#34454d','#a2b4b4',2);
  if(hero)poly(ctx,[[-15,10],[16,11],[13,14],[-10,14]],'#78efce',null);
  ctx.restore();
  // ARMS: animated independently of torso/legs.
  for(const side of [-1,1]){
    const move=side<0?p.arms.left:p.arms.right;
    ctx.save();ctx.translate(side*16,0);ctx.rotate(move*.033);
    poly(ctx,[[0,-4],[side*7,-3],[side*10,12],[side*5,18],[side*-2,14]],color);
    oval(ctx,side*7,17,6,5,hero?'#fff1e2':color);
    if(detail==='blades'||detail==='fangs')for(let j=0;j<3;j++)poly(ctx,[[side*(j*3+2),18],[side*(j*3+3),28],[side*(j*3+6),18]],'#efdfc9',null);
    ctx.restore();
  }
  // HEAD: independent hinge, triangular ears and contour.
  ctx.save();ctx.translate(p.head.x,-10+p.head.y);ctx.rotate(p.head.rotation);
  poly(ctx,[[-18,-6],[-18,-29],[-7,-20],[7,-20],[18,-29],[19,-6],[14,8],[-13,8]],'#061723');
  poly(ctx,[[-15,-5],[-15,-24],[-6,-15],[6,-15],[15,-24],[16,-6],[11,5],[-10,5]],color);
  poly(ctx,[[-14,-15],[-7,-17],[-2,-12],[11,-14],[9,-10],[-10,-9]],hero?'#ffffff77':ally?'#d0fff077':'#ffe5d555',null);
  poly(ctx,[[-13,-21],[-8,-16],[-13,-12]],'#e8a1a6',null);
  poly(ctx,[[13,-21],[8,-16],[13,-12]],'#e8a1a6',null);
  // Archetype-specific gear and silhouettes.
  if(detail==='crown')poly(ctx,[[-17,-24],[-13,-37],[-5,-30],[0,-40],[5,-30],[13,-37],[17,-24]],'#f6c36d');
  if(detail==='armor'||detail==='helmet')poly(ctx,[[-20,-11],[-17,-28],[0,-33],[17,-28],[20,-11],[11,-15],[-11,-15]],detail==='helmet'?'#e7ba61':'#839cab');
  if(detail==='antenna')for(const side of [-1,1]){ctx.strokeStyle='#7ee0f6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(side*12,-23);ctx.lineTo(side*23,-39);ctx.stroke();oval(ctx,side*23,-39,4,4,'#ffcf81');}
  if(detail==='wings')for(const side of [-1,1])poly(ctx,[[side*17,-13],[side*35,-32],[side*29,6],[side*17,0]],color);
  if(detail==='horns')for(const side of [-1,1])poly(ctx,[[side*10,-22],[side*20,-37],[side*18,-19]],'#f9dcb4');
  if(detail==='hood')poly(ctx,[[-21,-8],[-18,-28],[0,-39],[19,-28],[21,-8],[12,-20],[-13,-20]],'#563e75');
  if(detail==='scope'||detail==='visor')rect(ctx,-18,-13,36,6,detail==='scope'?'#72f3ff':'#1f343a');
  if(detail==='healer'){rect(ctx,-19,-25,38,6,'#fff8e4');rect(ctx,-3,-29,6,15,'#dc647d');rect(ctx,-8,-23,16,4,'#dc647d');}
  if(detail==='mask')rect(ctx,-17,-11,34,10,'#23344c');
  // Eyes and nose move independently from helmet.
  if(detail!=='visor'){
    const iris=hero?'#164d59':ally?'#253e54':'#fa9688';
    oval(ctx,-9+p.eyes.offset,-6,4,2.8*p.eyes.open,iris);oval(ctx,9+p.eyes.offset,-6,4,2.8*p.eyes.open,iris);
    if(hero||ally){oval(ctx,-8.5+p.eyes.offset,-7,1.2,1.2,'#edffff');oval(ctx,9.5+p.eyes.offset,-7,1.2,1.2,'#edffff');}
  }
  poly(ctx,[[-3,1],[3,1],[0,5]],'#bf7a88',null);
  ctx.strokeStyle='#e8d5c2';ctx.lineWidth=1;
  for(const side of [-1,1])for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(side*8,3+i*2);ctx.lineTo(side*(20+p.whiskers),0+i*6);ctx.stroke();}
  ctx.restore();
  // Weapons/role silhouettes attached to upper body, distinct states.
  if(hero||id==='shooter'||id==='sniper'||id==='watcher'||id==='echo-reaper'){
    ctx.save();ctx.translate(13-p.recoil*4,11+p.recoil*2);ctx.rotate(Number.isFinite(aim)?aim:0);
    rect(ctx,1,-4,id==='sniper'||id==='echo-reaper'?34:23,8,'#152a38');rect(ctx,8,-4,14,3,'#93afaf');rect(ctx,22,-2,7,4,'#e2ba74');ctx.restore();
  }
  if(detail==='healer'){rect(ctx,19,11,12,15,'#e9e8df');rect(ctx,24,13,3,11,'#52b5a1');rect(ctx,21,17,10,3,'#52b5a1');}
  if(detail==='scarf'){poly(ctx,[[-15,13],[15,13],[10,17],[-12,17]],'#7ae9d1');poly(ctx,[[-10,15],[-27,29],[-10,25]],'#7ae9d1');}
  if(detail==='crown'||boss){ctx.strokeStyle='#efb96e';ctx.lineWidth=2;ctx.strokeRect(-25,-29,50,53);}
  if(elite||superElite){ctx.strokeStyle=superElite?'#ff9eec':'#ffe5b7';ctx.lineWidth=3;ctx.strokeRect(-26,-28,52,55);}
  if(p.glow){
    ctx.globalAlpha=.48+Math.sin(time*10)*.14;ctx.strokeStyle=p.glow;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,33+2*Math.sin(time*8),0,TWO);ctx.stroke();
    if(p.speedStreak)for(let i=0;i<5;i++){
      const offset=(i*12+time*75*p.speedStreak)%70;
      rect(ctx,-40-offset*.16,-21+i*9,15,2,p.glow);
    }
  }
  if(damaged){ctx.globalAlpha=.55;ctx.strokeStyle='#fff0c2';ctx.lineWidth=3;ctx.strokeRect(-25,-28,50,55);}
  if(state==='attack'&&!reduced){ctx.globalAlpha=.55;ctx.strokeStyle='#e5f7de';ctx.lineWidth=2;ctx.beginPath();ctx.arc(16,12,8+p.recoil*7,-.6,.7);ctx.stroke();}
  ctx.restore();
  return frame;
}
const API=Object.freeze({characters,enemyIds,allyIds,frameCount,pose,draw,assetStatus,overrideStatus,hasReferenceAnimation,frameTotal:162+96+120});
root.CATA_ART=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);

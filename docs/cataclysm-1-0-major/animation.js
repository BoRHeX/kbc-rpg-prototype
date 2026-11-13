/* One immutable visual-family authority per actor. Complete textured frames only.
   Hero frames are baked from an articulated painted rig, never whole-body blends. */
(function(root){
'use strict';
const allyIds=Object.freeze(['shooter','healer','tank','brawler','sniper','engineer','trapper','bard']);
const enemyIds=Object.freeze(Object.values(root.CATA_MAJOR.catalog).flat().map(e=>e.id));
const assetBase=typeof document!=='undefined'&&document.currentScript?new URL('art/',document.currentScript.src).href:'./art/';
const assetRelease='cataclysm-10-herorig-43483184752';
const packs=Object.create(null),metrics={loaded:0,failed:0,total:0,manifestReady:false};
const TWO=Math.PI*2;
const PALETTES={shooter:'#e5c38a',sniper:'#bde282',watcher:'#8fa4ad','echo-reaper':'#c7b5a2',ghost:'#c9bfe5'};
function rect(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function poly(ctx,pts,fill,stroke='#091c27',sw=2){ctx.beginPath();ctx.moveTo(...pts[0]);for(const p of pts.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}}
function oval(ctx,x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TWO);ctx.fillStyle=color;ctx.fill();}
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
function aimFrame(angle){return ((Math.round((Number.isFinite(angle)?angle:0)/(Math.PI/4))%8)+8)%8;}
function packInfo(id){const p=packs[id];return Object.freeze({id,family:p?.family||null,ready:!!p?.ready});}
function loadTexture(info){
 metrics.total++;
 const entry={...info,ready:false,image:new root.Image()};
 return new Promise((resolve,reject)=>{
  const fail=()=>{metrics.failed++;reject(Error('Invalid or missing '+info.url));};
  entry.image.onerror=fail;
  entry.image.onload=async()=>{
   if(entry.image.naturalWidth!==info.frames*96||entry.image.naturalHeight!==(info.bearings||1)*96){fail();return;}
   try{if(entry.image.decode)await entry.image.decode();entry.ready=true;metrics.loaded++;resolve(entry);}catch(e){fail();}
  };
  entry.image.src=assetBase+info.url+'?art='+assetRelease;
 });
}
const ready=root.fetch(assetBase+'actor-packs.json?art='+assetRelease).then(r=>{if(!r.ok)throw Error('Actor manifest HTTP '+r.status);return r.json();}).then(async data=>{
 if(data.version!==1)throw Error('Invalid actor pack version');
 const ids=['hero',...allyIds,...enemyIds];
 // Selection is assigned ONCE, before any image resolves. No load-order switching.
 for(const id of ids){
  const spec=data.characters[id];if(!spec?.family||!spec.states)throw Error('No visual family for '+id);
  packs[id]={family:spec.family,states:Object.create(null),ready:false};
 }
 metrics.manifestReady=true;
 await Promise.all(ids.map(async id=>{
  const p=packs[id],states=data.characters[id].states;
  const rigSpec=data.characters[id].rig;
  if(id==='hero'&&rigSpec?.parts){
   for(const key of ['torso','thigh','calf','paw'])if(!rigSpec.parts[key])throw Error('Incomplete articulated hero rig: '+key);
   const entries=await Promise.all(Object.entries(rigSpec.parts).map(async([name,info])=>{
     if(!/^[-a-z0-9/]+\.png$/.test(info.url))throw Error('Invalid rig texture '+name);
     return [name,await loadRigPart({...info,part:name})];
   }));
   p.rig=Object.freeze(Object.fromEntries(entries));p.states=Object.freeze({});
   p.ready=true;Object.freeze(p);return;
  }
  const textures=await Promise.all(Object.entries(states).map(async([state,info])=>{
   if(!Number.isInteger(info.frames)||info.frames<1||!Number.isFinite(info.fps)||!/^[-a-z0-9/]+\.png$/.test(info.url))throw Error('Invalid texture '+id+'/'+state);
   return [state,await loadTexture(info)];
  }));
  p.states=Object.freeze(Object.fromEntries(textures));p.ready=true;Object.freeze(p);
 }));
});
// Keep failures observable via ready, without an unhandled rejection before boot attaches.
ready.catch(()=>{});
// New rig packs contain one painted, leg-free upper body and independent
// original-texture thigh, calf and paw pieces. Load before selecting the pack;
// no old full-body sheet is drawn underneath the IK rig.
function loadRigPart(info){
 metrics.total++;
 const entry={...info,ready:false,image:new root.Image()};
 return new Promise((resolve,reject)=>{
  const fail=()=>{metrics.failed++;reject(Error('Missing articulated body part '+info.url));};
  entry.image.onerror=fail;
  entry.image.onload=async()=>{
   const w=info.part==='torso'?(info.frames||1)*96:info.width;
   const h=info.part==='torso'?(info.bearings||8)*96:info.height;
   if(!w||!h||entry.image.naturalWidth!==w||entry.image.naturalHeight!==h){fail();return;}
   try{if(entry.image.decode)await entry.image.decode();entry.ready=true;metrics.loaded++;resolve(entry);}catch(e){fail();}
  };
  entry.image.src=assetBase+info.url+'?art='+assetRelease;
 });
}
function assetStatus(){return {loaded:metrics.loaded,failed:metrics.failed,total:metrics.total};}
function overrideStatus(){return {...metrics,characters:Object.entries(packs).flatMap(([id,p])=>p.ready?Object.keys(p.states).map(s=>id+'-'+s):[])};}
function directionalStatus(){const p=packs.hero;return {loaded:p?.ready?Object.keys(p.states).length:0,failed:metrics.failed,total:10,states:Object.fromEntries(Object.entries(p?.states||{}).map(([s,v])=>[s,v.ready]))};}
function hasReferenceAnimation(id,state){return !!(packs[id]?.ready&&packs[id].states[state]);}
function actionDuration(id,state){const s=packs[id]?.states[state];return s?s.frames/s.fps:8/12;}
function frameCount(id,state){return packs[id]?.rig?(packs[id].rig.torso.frames||12):(packs[id]?.states[state]?.frames||(id==='hero'?12:allyIds.includes(id)?12:6));}
function heroBarrels(angle,r=27){
 const barrels=[[[56,43],[85,34]],[[58,53],[80,57]],[[44,72],[66,63]],[[18,60],[47,70]],[[5,40],[41,44]],[[11,29],[41,42]],[[35,6],[67,6]],[[21,19],[69,7]]];
 return barrels[aimFrame(angle)].map(([x,y])=>({x:(x-48)*r/23,y:(y-58)*r/23}));
}
function draw(ctx,id,r,time,state='run',aim=0,damaged=false,reduced=false,moving=false,effect=null,firing=false,profile=null){
 const pack=packs[id];if(!pack?.ready)return -1;
 if(id==='hero'&&pack.rig){
   const pose=profile?.kinematics;
   const result=root.CATA_HERO_RIG_RENDER?.draw(ctx,pack.rig,pose,aim,r,time,{hit:damaged,reduced});
   return result?result.bearing*100+result.frame:-1;
 }
 let selected=state;
 if(id==='hero'){
  if(state==='hit'||damaged)selected='hit';
  else if(state==='recover')selected='recover';
  else if(moving||['run','walk','feral','adrenaline'].includes(state))selected=effect==='feral'||state==='feral'?'feral':effect==='adrenaline'||state==='adrenaline'?'adrenaline':firing?'run-fire':'run';
  else selected=firing||state==='attack'?'attack':'idle';
 }
 // Aliases remain INSIDE the selected family; unavailable actions never swap packs.
 if(id==='hero'&&firing&&['feral','adrenaline'].includes(selected))selected+='-fire';
 const sheet=pack.states[selected]||pack.states.run;
 const phase=reduced&&!['hit','recover','attack','special'].includes(selected)?0:Math.floor(Math.max(0,time)*sheet.fps)%sheet.frames;
 const bearing=sheet.bearings?aimFrame(aim):0;
 ctx.save();ctx.scale(r/23,r/23);
 // Exposure applies to the ONE draw, including damage; no repaint of silhouette.
 if(damaged&&id!=='hero')ctx.filter='brightness(1.35)';
 ctx.drawImage(sheet.image,phase*96,bearing*96,96,96,-48,-58,96,96);
 if(id!=='hero'&&sheet.embedded_weapon===false&&['shooter','sniper','watcher','echo-reaper','ghost'].includes(id))paintedGun(ctx,id,aim,state==='attack'?.4:0);
 ctx.restore();return bearing*sheet.frames+phase;
}
const characters=Object.freeze({hero:Object.freeze({idle:12,run:12,hit:8,feral:12,adrenaline:12}),allies:Object.freeze(Object.fromEntries(allyIds.map(id=>[id,12]))),enemies:Object.freeze(Object.fromEntries(enemyIds.map(id=>[id,6])))});
root.CATA_ART=Object.freeze({characters,enemyIds,allyIds,draw,ready,packInfo,assetStatus,overrideStatus,directionalStatus,hasReferenceAnimation,actionDuration,frameCount,aimFrame,heroBarrels,assetVersion:assetRelease,frameTotal:8*(12*7+8*3)+allyIds.length*36+enemyIds.length*6});
if(typeof module!=='undefined'&&module.exports)module.exports=root.CATA_ART;
})(typeof globalThis!=='undefined'?globalThis:this);

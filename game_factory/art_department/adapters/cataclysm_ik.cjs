/* Independent real Chrome review of the articulated hero rig. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../../..');
module.exports.prove=async(page,job,out)=>{
 await page.route(/\/cataclysm-(?:1-0-major|100-lab)\/game\.js\?build=/,async route=>{
  const dir=route.request().url().includes('/cataclysm-100-lab/')?'cataclysm-100-lab':'cataclysm-1-0-major';
  const src=fs.readFileSync(path.join(ROOT,'docs',dir,'game.js'),'utf8');
  const offset=src.lastIndexOf('})();');
  assert.ok(offset>0,'Cannot inspect actual gameplay closure');
  const hook=[
   'window.__ACTUAL_HERO_IK=()=>({family:ART.packInfo("hero").family,',
   ' pose:game?.player?.animation?.gaitPose,moving:game?.player?.animation?.moving,',
   ' level:game?.player?.level,night:game?.campaign?.night});'
  ].join('\n');
  await route.fulfill({status:200,contentType:'application/javascript',body:src.slice(0,offset)+hook+'\n'+src.slice(offset)});
 });
 async function open(dir){
  const resp=await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(resp.status(),200);
  await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:22000});
  await page.waitForFunction(()=>window.CATA_ART?.packInfo?.('hero')?.ready===true,{timeout:30000});
  assert.equal(await page.evaluate(()=>CATA_ART.packInfo('hero').family),job.family,'Actual game must use NEW rig');
  await page.locator('#play').click({force:true});
  await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:10000});
 }
 await open(job.play_url_path);
 await page.screenshot({path:path.join(out,'actual-game.png')});
 await page.keyboard.down('w');
 await page.waitForTimeout(220);
 const first=await page.evaluate(()=>__ACTUAL_HERO_IK());
 await page.waitForTimeout(380);
 const second=await page.evaluate(()=>__ACTUAL_HERO_IK());
 await page.keyboard.up('w');
 assert.ok(first.pose&&second.pose&&second.pose.moving,'Actual player WASD motion MUST advance rig');
 for(const joint of ['ankle','knee']){
  assert.ok(first.pose.legs.some((leg,i)=>
    Math.hypot(leg[joint].x-second.pose.legs[i][joint].x,leg[joint].y-second.pose.legs[i][joint].y)>1),
    'Frozen '+joint+' positions in real game WASD');
 }
 const pictures=await page.evaluate(job=>{
  const ART=CATA_ART,K=CATA_HERO_KINEMATICS;
  const output={};
  const rigState=()=>K.create();
  function makeFilm(state,speed,count=24,small=false){
   const cell=small?70:112,can=document.createElement('canvas');
   can.width=count*cell;can.height=cell;
   const ctx=can.getContext('2d');ctx.fillStyle='#162737';ctx.fillRect(0,0,can.width,can.height);
   const rig=rigState(),dt=1/60;let x=0,time=0,p;
   for(let i=0;i<count;i++){
    for(let j=0;j<4;j++){x+=speed*dt;time+=dt;p=K.advance(rig,{x,y:0,vx:speed,vy:0,dt,baseSpeed:180,state});}
    ctx.save();ctx.translate((i+.5)*cell,cell*.52);
    if(small)ctx.scale(.64,.64);
    ART.draw(ctx,'hero',23,time,state,0,false,false,speed>0,null,false,
      {kinematics:p,speedRatio:p.speedRatio});
    ctx.restore();
   }
   return can.toDataURL('image/png').split(',')[1];
  }
  for(const state of ['run','attack','walk','sprint','overdrive','idle'])
   output[state]=makeFilm(state,state==='idle'||state==='attack'?0:state==='walk'?80:state==='run'?210:state==='sprint'?350:520);
  const contact=document.createElement('canvas');
  contact.width=1100;contact.height=job.states.length*82;
  const cc=contact.getContext('2d');cc.fillStyle='#172a39';cc.fillRect(0,0,contact.width,contact.height);
  for(let row=0;row<job.states.length;row++){
   const state=job.states[row],speed=state==='idle'||state==='shield-idle'||state==='hit'||state==='attack'?0:
    state==='walk'?80:state==='sprint'?350:state==='overdrive'?520:210;
   const rig=rigState(),dt=1/60;let x=0,time=0,p;
   cc.fillStyle='#fff';cc.font='13px sans-serif';cc.fillText(state,8,row*82+20);
   for(let frame=0;frame<12;frame++){
    for(let t=0;t<4;t++){x+=speed*dt;time+=dt;p=K.advance(rig,{x,y:0,vx:speed,vy:0,dt,baseSpeed:180,state});}
    cc.save();cc.translate(145+frame*79,row*82+36);cc.scale(.72,.72);
    ART.draw(cc,'hero',23,time,state,0,false,false,speed>0,null,false,{kinematics:p,speedRatio:p.speedRatio});
    cc.restore();
   }
  }
  output.contact=contact.toDataURL('image/png').split(',')[1];
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d'),original=ctx.drawImage.bind(ctx),calls=[];
  cv.width=150;cv.height=150;
  ctx.drawImage=function(...args){calls.push(String(args[0]?.src||''));return original(...args)};
  const rig=rigState(),pose=K.advance(rig,{x:1,y:0,vx:210,vy:0,dt:1/60,baseSpeed:180});
  ctx.save();ctx.translate(75,75);
  ART.draw(ctx,'hero',23,.2,'run',0,false,false,true,null,false,{kinematics:pose});
  ctx.restore();
  output.calls=calls;return output;
 },job);
 assert.equal(pictures.calls.length,7,'One upper torso and exactly SIX painted leg components, no legacy body duplication');
 for(const name of ['torso','thigh','calf','paw']){
  const n=pictures.calls.filter(x=>x.includes('/characters/hero/'+job.family+'/'+name+'.png')).length;
  assert.equal(n,name==='torso'?1:2,'Actual actor rendering lacks '+name+' or duplicates complete bodies');
 }
 for(const name of ['run','attack']){
  fs.writeFileSync(path.join(out,name+'-cycle.png'),Buffer.from(pictures[name],'base64'));
 }
 fs.writeFileSync(path.join(out,'animation-contact.png'),Buffer.from(pictures.contact,'base64'));
 fs.writeFileSync(path.join(out,'motion-render.png'),Buffer.from(pictures.contact,'base64'));
 fs.writeFileSync(path.join(out,'runtime-parts.json'),JSON.stringify({first,second,calls:pictures.calls},null,2));
 await open('cataclysm-100-lab');
 const lab=await page.evaluate(()=>__ACTUAL_HERO_IK());
 assert.equal(lab.family,job.family);
 assert.equal(lab.level,100,'Night 99 laboratory must remain distinct');
 console.log('PASS actual game feet and knees move with WASD, one painted torso + textured IK legs, 24-frame filmstrip, lab parity');
};

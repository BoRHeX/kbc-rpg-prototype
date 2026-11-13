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
 const samples=[];
 for(let frame=0;frame<9;frame++){
   await page.waitForTimeout(73);
   samples.push(await page.evaluate(()=>__ACTUAL_HERO_IK()));
 }
 await page.keyboard.up('w');
 assert.ok(samples.some(x=>x.pose?.moving),'Actual player WASD motion MUST drive rig');
 // Sampling only twice can accidentally compare the same phase one gait
 // period later. Cover a whole stride and inspect BOTH knees and ankles.
 for(const joint of ['ankle','knee']){
   for(let foot=0;foot<2;foot++){
     const positions=samples.filter(x=>x.pose?.legs?.[foot]).map(x=>x.pose.legs[foot][joint]);
     const distance=Math.max(...positions.flatMap(a=>positions.map(b=>Math.hypot(a.x-b.x,a.y-b.y))));
     assert.ok(distance>2.5,'Real '+joint+' '+foot+' remains effectively frozen across nine WASD samples: '+distance);
   }
 }
 const pictures=await page.evaluate(job=>{
  const ART=CATA_ART,K=CATA_HERO_KINEMATICS;
  const output={};
  const rigState=()=>K.create();
  function makeFilm(state,speed,count=24,small=false){
   // FOUR COLUMNS, SIX ROWS. The previous 2688x112 horizontal filmstrip
   // made leg movement effectively invisible to the independent image
   // reviewer after thumbnail downscaling, despite real IK joints moving.
   // Display every original animation instant at 1.45x, ordered row-major.
   // Art/frame data is NOT changed; this corrects review evidence only.
   const columns=4,cellW=165,cellH=148;
   const can=document.createElement('canvas');
   can.width=columns*cellW;can.height=Math.ceil(count/columns)*cellH;
   const ctx=can.getContext('2d');
   ctx.fillStyle='#162737';ctx.fillRect(0,0,can.width,can.height);
   const rig=rigState(),dt=1/60;let x=0,time=0,p;
   for(let i=0;i<count;i++){
    for(let j=0;j<4;j++){x+=speed*dt;time+=dt;p=K.advance(rig,{x,y:0,vx:speed,vy:0,dt,baseSpeed:180,state});}
    const bx=(i%columns)*cellW,by=Math.floor(i/columns)*cellH;
    ctx.save();ctx.translate(bx+cellW*.50,by+cellH*.55);
    ctx.scale(1.45,1.45);
    ART.draw(ctx,'hero',23,time,state,0,false,false,speed>0,null,false,
      {kinematics:p,speedRatio:p.speedRatio});
    ctx.restore();
    ctx.fillStyle='#bdcbd3';ctx.font='12px monospace';
    ctx.fillText(state+' '+String(i+1).padStart(2,'0')+'/'+count,bx+6,by+cellH-8);
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
 fs.writeFileSync(path.join(out,'runtime-parts.json'),JSON.stringify({samples,calls:pictures.calls},null,2));
 await open('cataclysm-100-lab');
 const lab=await page.evaluate(()=>__ACTUAL_HERO_IK());
 assert.equal(lab.family,job.family);
 assert.equal(lab.level,100,'Night 99 laboratory must remain distinct');
 console.log('PASS actual game feet and knees move with WASD, one painted torso + textured IK legs, 24-frame filmstrip, lab parity');
};

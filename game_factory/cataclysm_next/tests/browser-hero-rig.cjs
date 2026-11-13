'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const j=require('../../art_department/jobs/active.json');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [dir,width,height] of [['cataclysm-1-0-major',390,844],['cataclysm-100-lab',844,390]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_BOOT&&window.CATACLYSM_READY===true,{timeout:20000});
   await page.waitForFunction(()=>window.CATA_ART?.packInfo?.('hero')?.ready===true,{timeout:30000});
   const test=await page.evaluate(()=>{
    const K=CATA_HERO_KINEMATICS,A=CATA_ART,rig=K.create(),ctx=document.createElement('canvas').getContext('2d');
    const original=ctx.drawImage.bind(ctx),samples=[],selected=[];
    ctx.drawImage=function(...args){selected.push(String(args[0]?.src||''));return original(...args)};
    let x=0;const dt=1/60;
    for(let i=0;i<180;i++){
     const speed=i<60?65:i<120?200:450;x+=speed*dt;
     const pose=K.advance(rig,{x,y:0,vx:speed,vy:0,dt,baseSpeed:180});
     if(i%15===0){
      selected.length=0;
      ctx.save();
      A.draw(ctx,'hero',23,i*dt,'run',0,false,false,true,null,false,{kinematics:pose});
      ctx.restore();
      const files=selected.slice();
      samples.push({s:speed,legs:pose.legs.map(l=>({hip:l.hip,knee:l.knee,ankle:l.ankle,stance:l.stance,air:l.air})),files});
     }
    }
    return {family:A.packInfo('hero').family,rig:rig.pose,failed:A.assetStatus().failed,samples};
   });
   assert.equal(test.family,j.family,'artist must select the new single active rig family');
   assert.equal(test.failed,0,'no missing painted body parts');
   for(const sample of test.samples){
    assert.equal(sample.files.length,7,'draw two thigh, calf and paw parts and ONE torso, no old full-body overlay');
    for(const part of ['torso','thigh','calf','paw']){
     const count=sample.files.filter(x=>x.includes('/characters/hero/'+j.family+'/'+part+'.png')).length;
     assert.equal(count,part==='torso'?1:2,'unexpected '+part+' rendered');
    }
   }
   for(let foot=0;foot<2;foot++){
    const uniqueAnkle=new Set(test.samples.map(x=>Math.round(x.legs[foot].ankle.x*10)+':'+Math.round(x.legs[foot].ankle.y*10)));
    const uniqueKnee=new Set(test.samples.map(x=>Math.round(x.legs[foot].knee.x*10)+':'+Math.round(x.legs[foot].knee.y*10)));
    assert.ok(uniqueAnkle.size>=7&&uniqueKnee.size>=7,'actual IK legs articulate through multiple gait phases');
   }
   assert.deepEqual(errors,[],'no game rendering errors');
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:8000});
   const snapshot=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
   assert.equal(snapshot.player.level,dir==='cataclysm-100-lab'?100:1);
   await page.close();
   console.log('PASS genuine textured IK rig animated in',dir,'at',width,height);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

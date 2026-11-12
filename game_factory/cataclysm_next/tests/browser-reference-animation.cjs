'use strict';
// Real browser evidence: an actual reference-derived image must decode and animate
// in BOTH game builds, not merely exist on the repository filesystem.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const actor=process.env.ART_ACTOR;
const states=(process.env.ART_STATES||'').split(',').filter(Boolean);
assert.match(actor||'',/^[a-z][a-z0-9-]+$/);
assert.ok(states.length>0 && states.length<=6);
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const dir of ['cataclysm-1-0-major','cataclysm-100-lab']){
   const page=await browser.newPage({viewport:{width:844,height:390},
    isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const errors=[],network=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{
    if(r.status()>=400 && !r.url().includes('favicon')) network.push(r.status()+' '+r.url());
   });
   const url='http://127.0.0.1:8765/'+dir+'/';
   const resp=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(resp.status(),200);
   await page.waitForFunction(()=>globalThis.CATACLYSM_READY===true,{timeout:20000});
   await page.waitForFunction(({actor,states})=>{
    const art=globalThis.CATA_ART;
    const status=art?.overrideStatus?.();
    return status?.manifestReady && states.every(state=>art.hasReferenceAnimation(actor,state));
   },{actor,states},{timeout:30000});
   const result=await page.evaluate(({actor,states})=>{
    const art=globalThis.CATA_ART,status=art.overrideStatus();
    const motion={};
    for(const state of states){
     const hashes=[];
     for(const t of [0,.083,.166,.249,.332,.415]){
      const canvas=document.createElement('canvas');
      canvas.width=144;canvas.height=144;
      const ctx=canvas.getContext('2d');
      ctx.translate(72,76);
      art.draw(ctx,actor,25,t,state,0,false,false);
      const raw=ctx.getImageData(-0,-0,0,0); // Browser API availability
      hashes.push(canvas.toDataURL('image/png').slice(-2300));
     }
     motion[state]=new Set(hashes).size;
    }
    return {status,motion};
   },{actor,states});
   assert.equal(result.status.failed,0,'Reference images failed to decode: '+JSON.stringify(result));
   assert.ok(states.every(s=>result.status.characters.includes(actor+'-'+s)),'Missing real loaded state '+dir);
   for(const state of states)
    assert.ok(result.motion[state]>=3,'Reference sprite visually static in '+dir+': '+state);
   assert.deepEqual(errors,[],'JavaScript failures in '+dir);
   assert.deepEqual(network,[],'Missing assets in '+dir);
   await page.locator('#play').click({force:true});
   await page.waitForTimeout(700);
   const snap=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
   assert.equal(snap.mode,'running','New animation must not break game initialization');
   assert.equal(snap.major.campaign.night,dir==='cataclysm-100-lab'?99:1);
   const out='artifacts/cataclysm-major';
   fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'reference-animation-'+dir+'.png')});
   console.log('PASS reference animation:',dir,actor,states,'motion frames',result.motion);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

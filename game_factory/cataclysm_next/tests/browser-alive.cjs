'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [dir,width,height] of [['cataclysm-1-0-major',390,844],['cataclysm-100-lab',844,390]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const errors=[],bad=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&r.url().includes('/art/'))bad.push(r.url())});
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.waitForFunction(()=>window.CATA_ART?.directionalStatus()?.loaded===3,{timeout:30000});
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:6000});
   const observation=await page.evaluate(()=>{
     const art=CATA_ART,ctx=document.createElement('canvas').getContext('2d'),original=ctx.drawImage.bind(ctx);
     let calls=[];
     ctx.drawImage=function(...args){calls.push({url:String(args[0]?.src||''),sx:args[1]});return original(...args)};
     const draw=(state,dir,time)=>{
       calls=[];art.draw(ctx,'hero',27,time,state,dir,false,false,true);return calls.slice();
     };
     const modes={};
     for(const state of ['run','feral','adrenaline']){
       modes[state]=[0,Math.PI/2,Math.PI,-Math.PI/2].map(dir=>[draw(state,dir,.14),draw(state,dir,.47)]);
     }
     const hero=CATA_CATS.voices.hero;
     const lines=[...new Set(Object.values(hero).flat().map(x=>String(x).trim()).filter(Boolean))];
     return {modes,voice:{categories:Object.keys(hero),uniqueLines:lines.length},
       snapshot:CATACLYSM_DIAGNOSTICS.snapshot()};
   });
   assert.ok(observation.voice.uniqueLines>=70,'hero dialogue must expand significantly beyond the prior library');
   assert.ok(observation.voice.categories.length>=12,'contextual dialogue categories must remain diverse');
   for(const [state,directions] of Object.entries(observation.modes)){
     const bearings=[];
     for(const [earlier,later] of directions){
       const find=images=>images.find(v=>v.url.includes('/characters/hero/'));
       const a=find(earlier),b=find(later);
       assert.ok(a&&b,'hero '+state+' needs actual newest authored textures in both movement frames');
       assert.ok(!earlier.some(v=>/\/art\/hero-[\w-]+\.png/.test(v.url)),
         'hero '+state+' must not switch to old painted character artwork');
       assert.ok(a.url!==b.url||a.sx!==b.sx,
         'hero '+state+' moving must advance a real sprite frame rather than freeze');
       bearings.push(a.url+'#'+a.sx);
     }
     assert.ok(new Set(bearings).size>=4,
       'hero '+state+' must preserve at least four target-facing directions while moving');
   }
   assert.equal(observation.snapshot.player.level,dir==='cataclysm-100-lab'?100:1);
   assert.deepEqual(errors,[],'no JavaScript exceptions');
   assert.deepEqual(bad,[],'no missing art');
   fs.mkdirSync('artifacts/cataclysm-alive',{recursive:true});
   await page.screenshot({path:'artifacts/cataclysm-alive/'+dir+'.png'});
   console.log('PASS hero living buff animation, four facing directions, dialogue variety and playable viewport:',dir);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

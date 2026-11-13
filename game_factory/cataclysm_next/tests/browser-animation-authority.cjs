'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  for(const dir of ['cataclysm-1-0-major','cataclysm-100-lab']){
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const errors=[],failedAssets=[];
   page.on('pageerror',e=>errors.push(e.stack||e.message));
   page.on('response',r=>{if(r.status()>=400&&/\/art\//.test(r.url()))failedAssets.push(r.status()+' '+r.url());});
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.waitForFunction(()=>{
     const a=window.CATA_ART;if(!a)return false;
     const o=a.overrideStatus();
     return o.manifestReady&&o.total>=31&&o.loaded===o.total&&o.failed===0;
   },{timeout:30000});
   const result=await page.evaluate(()=>{
     const a=CATA_ART,ctx=document.createElement('canvas').getContext('2d');
     const original=ctx.drawImage.bind(ctx);
     const records=[],frames={};
     ctx.drawImage=function(...args){records.push({url:String(args[0]?.src||''),x:args[1]});return original(...args);};
     const sample=(id,state,time,aim=0)=>{
       records.length=0;
       a.draw(ctx,id,23,time,state,aim,false,false,true);
       return records.map(r=>({...r}));
     };
     const heroStates=['idle','run','attack','hit','feral','adrenaline','aim'];
     for(const state of heroStates){
       frames['hero-'+state]=sample('hero',state,.16);
       frames['hero-'+state+'-late']=sample('hero',state,.57);
     }
     for(const role of a.allyIds)for(const state of ['attack','hit','special'])
       frames[role+'-'+state]=sample(role,state,.25);
     frames['enemy-early']=sample('shambler','run',.12);
     frames['enemy-late']=sample('shambler','run',.42);
     return {overrides:a.overrideStatus(),old:a.assetStatus(),frames,version:a.assetVersion};
   });
   assert.ok(result.overrides.total>=31,'all 7 hero and 24 companion action references must be present');
   assert.equal(result.overrides.failed,0,'latest authored references cannot silently fail');
   const states=['idle','run','attack','hit','feral','adrenaline','aim'];
   for(const state of states){
     const rendered=result.frames['hero-'+state],expected='/characters/hero/'+state+'.png';
     assert.ok(rendered.some(item=>item.url.includes(expected)),
       'hero '+state+' must render latest authored reference '+expected+': '+JSON.stringify(rendered));
     assert.ok(!rendered.some(item=>/\/art\/hero-[\w-]+\.png/.test(item.url)),
       'hero '+state+' must not mix an older original atlas with newer character artwork');
     if(state!=='aim'){
       const now=rendered.find(item=>item.url.includes(expected));
       const later=result.frames['hero-'+state+'-late'].find(item=>item.url.includes(expected));
       assert.ok(later,'late frame must remain in latest '+state+' asset');
       assert.notEqual(now.x,later.x,'hero '+state+' must advance through source frames instead of freezing');
     }
   }
   for(const role of ['shooter','healer','tank','brawler','sniper','engineer','trapper','bard']){
     for(const state of ['attack','hit','special']){
       const images=result.frames[role+'-'+state],expected='/characters/'+role+'/'+state+'.png';
       assert.ok(images.some(item=>item.url.includes(expected)),
        role+' '+state+' must use the latest reference atlas: '+JSON.stringify(images));
     }
   }
   assert.ok(result.frames['enemy-early'].some(x=>x.url.includes('shambler-run.png')),
      'retain existing animated enemy art until a replacement is authored');
   assert.notEqual(result.frames['enemy-early'][0].x,result.frames['enemy-late'][0].x,
      'unreplaced enemy sprites must remain actually animated');
   assert.deepEqual(errors,[],'browser runtime errors');
   assert.deepEqual(failedAssets,[],'missing animation references');
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:6000});
   const out='artifacts/cataclysm-animation-authority';fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,dir+'-latest-sprites.png')});
   console.log('PASS latest reference animation authority, all hero states and eight companion action sets, actual frame advances, old enemy art retained:',dir);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

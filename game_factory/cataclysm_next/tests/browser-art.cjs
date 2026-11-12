'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const dirs=['cataclysm-1-0-major','cataclysm-100-lab'];
  for(const dir of dirs){
   const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const errors=[],badResources=[];
   page.on('pageerror',e=>errors.push(e.stack||e.message));
   page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))badResources.push(r.status()+' '+r.url());});
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.waitForFunction(()=>window.CATA_ART&&typeof CATA_ART.assetStatus==='function'&&CATA_ART.assetStatus().loaded>=40,{timeout:30000});
   await page.locator('#play').click({force:true});
   await page.waitForTimeout(500);
   const result=await page.evaluate(()=>({
     art:CATA_ART.assetStatus(),
     snap:CATACLYSM_DIAGNOSTICS.snapshot(),
   }));
   assert.ok(result.art.loaded>=40,'At least forty sprite sheet PNGs actually decoded and loaded: '+JSON.stringify(result.art));
   assert.equal(result.art.failed,0,'No missing/failed image assets: '+dir);
   assert.equal(errors.length,0,errors.join('\n'));
   assert.equal(badResources.length,0,badResources.join('\n'));
   assert.equal(result.snap.mode,'running','Art pass must keep real game playable');
   assert.equal(result.snap.major.campaign.night,dir==='cataclysm-100-lab'?99:1);
   assert.equal(result.snap.player.level,dir==='cataclysm-100-lab'?100:0);
   const out='artifacts/cataclysm-major';fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'art-'+dir+'.png')});
   console.log('PASS loaded and applied',result.art.loaded,'art sheets, in',dir,'running with',result.snap.enemies.length,'enemies');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

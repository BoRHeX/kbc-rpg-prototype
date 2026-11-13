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
   await page.waitForFunction(()=>window.CATA_ART&&typeof CATA_ART.assetStatus==='function'&&(CATA_ART.packInfo?.('hero')?.ready ? CATA_ART.assetStatus().loaded>=32 : CATA_ART.assetStatus().loaded>=40),{timeout:30000});
   await page.locator('#play').click({force:true});
   await page.waitForTimeout(500);
   const result=await page.evaluate(()=>{
     const canvas=document.createElement('canvas');
     canvas.width=160;canvas.height=160;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});
     const sample=(time)=>{
       ctx.clearRect(0,0,160,160);
       ctx.save();ctx.translate(80,75);
       const index=CATA_ART.draw(ctx,'tank',23,time,'run',0,false,false);
       ctx.restore();
       return {index,rgba:ctx.getImageData(0,0,160,160).data.slice()};
     };
     const a=sample(0),b=sample(.34);
     let different=0;
     for(let p=0;p<a.rgba.length;p+=4){
       if(Math.abs(a.rgba[p]-b.rgba[p])+Math.abs(a.rgba[p+1]-b.rgba[p+1])
         +Math.abs(a.rgba[p+2]-b.rgba[p+2])+Math.abs(a.rgba[p+3]-b.rgba[p+3])>32)different++;
     }
     const urls=performance.getEntriesByType('resource').map(x=>x.name);
     return {
       art:CATA_ART.assetStatus(),heroPack:CATA_ART.packInfo?.('hero')||null,
       version:CATA_ART.assetVersion,
       visualVersion:CATA_VISUALS.artVersion,
       spriteResources:urls.filter(u=>u.includes('/art/')&&u.endsWith('?art='+CATA_ART.assetVersion)).length,
       staleSprites:urls.filter(u=>u.includes('/art/')&&u.endsWith('.png')).length,
       motion:{first:a.index,next:b.index,changedPixels:different},
       snap:CATACLYSM_DIAGNOSTICS.snapshot(),
     };
   });
   assert.ok(result.art.loaded>=(result.heroPack?.ready?32:40),'Active character atlases must decode successfully; the clean hero pack replaces six obsolete hero loads: '+JSON.stringify(result.art));
   assert.equal(result.art.failed,0,'No missing/failed image assets: '+dir);
   assert.match(result.version,/^cataclysm-10-[a-z0-9-]+$/,'Runtime must expose a specific painted art release ID');
   assert.equal(result.visualVersion,result.version,'World and character art must use the same release');
   assert.ok(result.spriteResources>=(result.heroPack?.ready?34:40),'Every active texture pack must be versioned instead of keeping obsolete hero loads: '+JSON.stringify(result));
   assert.equal(result.staleSprites,0,'Unversioned art URLs would preserve stale cached sprites');
   assert.notEqual(result.motion.first,result.motion.next,'Tank must advance actual atlas frames');
   assert.ok(result.motion.changedPixels>25,'Tank frames must differ in actual rendered pixels: '+JSON.stringify(result.motion));
   assert.equal(errors.length,0,errors.join('\n'));
   assert.equal(badResources.length,0,badResources.join('\n'));
   assert.equal(result.snap.mode,'running','Art pass must keep real game playable');
   assert.equal(result.snap.major.campaign.night,dir==='cataclysm-100-lab'?99:1);
   assert.equal(result.snap.player.level,dir==='cataclysm-100-lab'?100:1);
   const out='artifacts/cataclysm-major';fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'art-'+dir+'.png')});
   console.log('PASS loaded and applied',result.art.loaded,'art sheets, in',dir,'running with',result.snap.enemies.length,'enemies');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const dir of ['cataclysm-1-0-major','cataclysm-100-lab']){
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const file=path.resolve(__dirname,'../../../docs',dir,'game.js');
   await page.route(new RegExp('/'+dir+'/game\\.js\\?build='),async route=>{
     let src=fs.readFileSync(file,'utf8');
     const marker=src.lastIndexOf('})();');
     assert.ok(marker>=0,'retain normal boot handshake');
     const probe=[
       'window.__CAT_TURRET_SKIN_TEST=()=>{',
       'const c=document.createElement("canvas");c.width=150;c.height=150;',
       'const x=c.getContext("2d",{willReadFrequently:true});',
       'return ["brass","porcelain"].map(skin=>{',
       'x.clearRect(0,0,150,150);',
       'drawEngineerTurret(x,{x:75,y:75,timer:.15,aim:.3,skin,skinVariant:skin,life:7},1.4);',
       'const data=x.getImageData(0,0,150,150).data;',
       'let hash=2166136261,opaque=0;',
       'for(let i=0;i<data.length;i++){hash=Math.imul(hash^data[i],16777619)>>>0;if(i%4===3&&data[i]>20)opaque++;}',
       'return {skin,hash,opaque};',
       '});',
       '};'
     ].join('\n');
     await route.fulfill({status:200,contentType:'application/javascript',body:src.slice(0,marker)+probe+'\n'+src.slice(marker)});
   });
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   const skins=await page.evaluate(()=>window.__CAT_TURRET_SKIN_TEST());
   assert.ok(skins.every(s=>s.opaque>300),'cosmetic turret skins must be visibly substantial');
   assert.ok(new Set(skins.map(s=>s.hash)).size>=2,'at least two truly different turret skins must render, not the same placeholder');
   assert.deepEqual(errors,[],'no script failures drawing turret variants');
   console.log('PASS visually distinct turret skin pack renders in',dir,skins);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

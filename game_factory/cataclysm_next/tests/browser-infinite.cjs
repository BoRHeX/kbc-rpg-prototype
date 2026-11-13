'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const dir of ['cataclysm-1-0-major','cataclysm-100-lab']){
   const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
   const filename=path.resolve(__dirname,'../../../docs',dir,'game.js');
   await page.route(new RegExp('/'+dir+'/game\\.js\\?build='),async route=>{
    let src=fs.readFileSync(filename,'utf8');
    const marker='  window.CATACLYSM_BOOT.ready(BUILD);';
    assert.ok(src.includes(marker),'game QA entrypoint missing');
    src=src.replace(marker,`
      // Intercepted in the browser test only; never shipped to the game.
      window.__WORLD_QA=Object.freeze({
        setPosition(x,y){game.player.x=x;game.player.y=y;return {x:game.player.x,y:game.player.y};}
      });
`+marker);
    await route.fulfill({status:200,contentType:'application/javascript',body:src});
   });
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>window.__WORLD_QA&&CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:8000});
   let snap=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
   assert.equal(snap.world.wrap,false);
   assert.equal(snap.world.scrollDirection,'static');
   assert.equal(snap.presentation.worldScrollY,0);
   const initial={x:snap.player.x,y:snap.player.y};
   await page.waitForTimeout(450);
   snap=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
   assert.ok(Math.abs(snap.player.x-initial.x)<.3&&Math.abs(snap.player.y-initial.y)<.3,'world position must not drift with zero input');
   // The old horizontally wrapped arena was 4200 units. Verify huge positive/negative
   // coordinates and both axes, without normalizing to a finite map or teleporting.
   for(const [x,y] of [[9800,-8200],[-9700,-9200],[15400,16400],[-15500,15900],[9800,-8200]]){
    await page.evaluate(([xx,yy])=>window.__WORLD_QA.setPosition(xx,yy),[x,y]);
    await page.waitForTimeout(220);
    snap=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
    assert.ok(Math.abs(snap.player.x-x)<12,'unbounded X coordinate warped or blocked at '+x);
    assert.ok(Math.abs(snap.player.y-y)<12,'unbounded Y coordinate warped or blocked at '+y);
    assert.equal(snap.world.wrap,false);
   }
   assert.deepEqual(errors,[],'no runtime errors during far-chunk traversal');
   const out=path.resolve('artifacts/cataclysm-major');fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'infinite-world-'+dir+'.png')});
   await page.close();
  }
  console.log('PASS static infinite XY map, non-wrapping far-coordinate traversal, zero idle drift in both Cataclysm modes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

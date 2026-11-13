'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/cataclysm-100-lab/?qaNight100=1',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
  await page.locator('#play').click({force:true});
  await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().lab?.finalSpawned>=1,{timeout:12000});
  const s=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(s.major.campaign.night,100);
  assert.equal(s.lab.finalTotal,1,'test scenario contains just one boss');
  assert.equal(s.lab.finalSpawned,1);
  assert.equal(s.enemies.filter(e=>e.finalWave&&e.creditCategory==='boss').length,1);
  assert.equal(s.lab.pending,0,'no more final encounters are queued');
  assert.ok(s.player.inv<17,'no artificial finale invulnerability');
  assert.deepEqual(errors,[]);
  console.log('PASS isolated one-boss Night100 smoke test; full campaign starts separately at Night1');
 }finally{await browser.close();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});

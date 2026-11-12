'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[];
 try{
  const dir='artifacts/cataclysm-major';fs.mkdirSync(dir,{recursive:true});
  const begin=async(url)=>{
   const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(e.stack||e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.locator('#play').click({force:true});return page;
  };
  const base='http://127.0.0.1:8765/cataclysm-100-lab/';
  const night99=await begin(base);
  await night99.waitForTimeout(550);
  let snap=await night99.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(snap.player.level,100,'isolated test is level 100');
  assert.equal(snap.major.campaign.night,99,'isolated test starts on night 99');
  assert.equal(snap.lab.wave.night,99);
  assert.ok(snap.lab.wave.queue.some(x=>x.id==='boss'),'night 99 features the prelude boss');
  await night99.screenshot({path:path.join(dir,'night99-lvl100.png')});
  await night99.close();
  const finale=await begin(base+'?qaNight100=1');
  await finale.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().lab.finalSpawned>=1,{timeout:10000});
  snap=await finale.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(snap.major.campaign.night,100);
  assert.equal(snap.lab.finalTotal,18);
  assert.equal(snap.lab.wave.scripted,true);
  assert.equal(snap.lab.wave.spent,0,'director no longer spends credits in finale');
  assert.equal(snap.lab.wave.interval,.9);
  assert.equal(snap.enemies[0].bossKind,'the-catastrophe','strongest boss enters first');
  await finale.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().lab.finalSpawned===18,{timeout:25000});
  snap=await finale.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(snap.lab.finalSpawned,18);
  assert.equal(snap.enemies.filter(x=>x.finalWave).length,18,'full horde is present simultaneously');
  assert.equal(snap.enemies.filter(x=>x.creditCategory==='boss').length,9);
  assert.equal(snap.enemies.filter(x=>x.creditCategory==='superElite').length,3);
  assert.equal(snap.enemies.filter(x=>x.creditCategory==='elite').length,6);
  assert.equal(snap.presentation.firestorm,true);
  assert.equal(snap.presentation.hazardPass,'catastrophe-hazards-03');
  assert.equal(errors.length,0,errors.join('\n'));
  await finale.screenshot({path:path.join(dir,'night100-all-18.png')});
  await finale.close();
  console.log('PASS Cataclysm night99 stress and simultaneous 18-major Night100 finale in real Chrome');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

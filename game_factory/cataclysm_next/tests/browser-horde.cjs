'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[],dir='artifacts/cataclysm-major';fs.mkdirSync(dir,{recursive:true});
 const begin=async(url)=>{
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
  await page.locator('#play').click({force:true});return page;
 };
 const base='http://127.0.0.1:8765/cataclysm-100-lab/';
 try{
  const prelude=await begin(base);
  await prelude.waitForTimeout(500);
  let snap=await prelude.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(snap.player.level,100);
  assert.equal(snap.major.campaign.night,99);
  assert.equal(snap.lab.wave.night,99);
  await prelude.screenshot({path:path.join(dir,'night99-lvl100.png')});
  await prelude.close();

  // Verify real-time production pacing; no invulnerability and no simultaneous horde.
  const paced=await begin(base+'?qaNight100=1');
  await paced.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().lab.finalSpawned>=1,{timeout:10000});
  snap=await paced.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(snap.major.campaign.night,100);
  assert.equal(snap.lab.finalTotal,18);
  assert.equal(snap.lab.wave.scripted,true);
  assert.equal(snap.lab.wave.interval,9,'major enemy arrivals must be separated by nine gameplay seconds');
  assert.ok(snap.player.inv<17,'no artificial cinematic player immunity');
  assert.equal(snap.lab.finalSpawned,1,'no instant horde flood');
  await paced.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().lab.finalSpawned>=2,{timeout:18000});
  snap=await paced.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(snap.lab.finalSpawned,2);
  const firstTwo=snap.lab.finalArrivals;
  assert.ok(Array.isArray(firstTwo)&&firstTwo.length>=2,'record real arrival times, not current survivor count');
  assert.ok(firstTwo[1].time-firstTwo[0].time>=8.5,'second encounter cannot arrive early');
  await paced.screenshot({path:path.join(dir,'night100-nine-second-cadence.png')});
  await paced.close();

  // Accelerate ONLY time between arrivals for end-to-end browser QA.
  // Real gameplay remains 9 seconds per encounter, with no fake lives or immune enemies.
  const finale=await begin(base+'?qaNight100=1&qaSpawnScale=30');
  await finale.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().lab.finalSpawned===18,{timeout:30000});
  snap=await finale.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(snap.lab.finalTotal,18);
  assert.equal(snap.lab.finalSpawned,18,'all scripted major enemies must actually arrive');
  assert.equal(snap.lab.wave.interval,9,'QA acceleration must not change production encounter interval');
  const arrivals=snap.lab.finalArrivals;
  assert.equal(arrivals.length,18,'persistent arrival history is independent of kills');
  assert.deepEqual(arrivals.map(x=>x.kind),[...Array(9).fill('boss'),...Array(3).fill('superElite'),...Array(6).fill('elite')]);
  assert.equal(new Set(arrivals.map(x=>x.majorId)).size,18,'major spawn IDs must be unique');
  assert.ok(arrivals.every(x=>Number.isFinite(x.time)),'each encounter is timestamped');
  assert.ok(arrivals.every((x,i)=>!i||x.time>=arrivals[i-1].time),'arrivals are ordered');
  assert.ok(snap.enemies.filter(x=>x.finalWave).length<=18,'kills during spawn sequence are legitimate');
  assert.equal(snap.presentation.firestorm,true);
  assert.equal(snap.presentation.hazardPass,'catastrophe-hazards-03');
  assert.equal(errors.length,0,errors.join('\n'));
  await finale.screenshot({path:path.join(dir,'night100-pacing-combat.png')});
  await finale.close();
  console.log('PASS real Night100 9-second encounter cadence, vulnerable combat and full 18-arrival roster');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

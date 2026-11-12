'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const dir='artifacts/night100-lab';fs.mkdirSync(dir,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))missing.push(r.status()+' '+r.url());});
  const response=await page.goto('http://127.0.0.1:8765/cataclysm-100-lab/?directorSeed=990100',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.waitForTimeout(2000);
  const boot=await page.evaluate(()=>({ready:window.CATACLYSM_READY===true,
    runtime:document.querySelector('#runtime-status')?.textContent,
    overlay:document.querySelector('#overlay-copy')?.textContent,
    scripts:[...document.scripts].map(x=>x.src).filter(Boolean)}));
  console.log('BOOT DIAGNOSTIC',JSON.stringify({boot,errors,missing}));
  assert.equal(boot.ready,true,'Night100 lab never booted');
  assert.equal(await page.locator('#play').textContent(),'▶ TEST NIGHT 99');
  await page.locator('#play').click({force:true});
  await page.waitForTimeout(1200);
  const initial=await page.evaluate(()=>window.CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(initial.mode,'running');
  assert.equal(initial.lab.enabled,true);
  assert.equal(initial.major.campaign.night,99);
  assert.equal(initial.player.level,100);
  assert.equal(initial.companions.active.length,4);
  assert.equal(initial.lab.wave.night,99);
  assert.ok(initial.lab.finalBossId,'final boss must actually spawn before Night100');
  assert.equal(initial.score,Math.floor(initial.time*2+initial.kills*7+initial.fish*9));
  assert.ok(initial.score<999999999,'score must not be rewarded early');
  await page.screenshot({path:dir+'/night99-level100.png'});
  await page.waitForTimeout(12500);
  const next=await page.evaluate(()=>window.CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(next.major.campaign.night,100,'director advances to Night 100');
  assert.equal(next.lab.wave.night,100);
  assert.equal(next.lab.wave.interval,1);
  assert.equal(next.presentation.firestorm,true);
  assert.ok(next.lab.finalTotal>=11);
  assert.ok(next.lab.finalSpawned>=1,'first bought horde unit appears');
  assert.ok(next.score<999999999,'no early victory while queue remains');
  assert.equal(await page.locator('#arena').evaluate(el=>el.classList.contains('lab-inferno')),true);
  const pending=next.lab.pending;
  await page.screenshot({path:dir+'/night100-firestorm.png'});
  await page.waitForTimeout(2400);
  const later=await page.evaluate(()=>window.CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(later.mode,'running','player survives first ~16 seconds of test');
  assert.ok(later.lab.finalSpawned>next.lab.finalSpawned,'time-based wave emits next monsters');
  assert.ok(later.lab.finalSpawned-next.lab.finalSpawned<=3,'no spawn burst: 1-second spacing');
  assert.ok(later.lab.pending<pending,'queued purchases are delivered');
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(missing.length,0,missing.join('\n'));
  await page.close();
  console.log('PASS Night100 Chrome: Level 100 Night99 boss, staged one-per-second final wave, firestorm, no early reward or JS errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

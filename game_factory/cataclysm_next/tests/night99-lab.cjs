'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const page=await browser.newPage({viewport:{width:844,height:390}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/cataclysm-1-0-major/?lab=night99');
    await page.waitForFunction(()=>window.CATACLYSM_READY===true);
    await page.locator('#play').click();
    const snap=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
    assert.equal(snap.player.level,100);assert.equal(snap.major.campaign.night,99);
    assert.equal(snap.balanceLab.enabled,true);
    assert.ok(snap.enemies.some(e=>e.variant==='boss'),'night 99 boss present');
    await page.waitForTimeout(14000);
    const final=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
    assert.equal(final.major.campaign.night,100);
    assert.equal(final.balanceLab.finalScheduled,true);
    assert.ok(final.balanceLab.queued.length>0);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS isolated level-100/night-99 final-wave test');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const SIZES=[[390,844],[360,780],[640,320],[667,375],[780,360],[844,390],[915,412],[1280,720]];
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const dir='artifacts/cataclysm-major';
  fs.mkdirSync(dir,{recursive:true});
  let count=0;
  try{
    for(const [width,height] of SIZES){
      const page=await browser.newPage({viewport:{width,height},isMobile:width<1000,hasTouch:true,deviceScaleFactor:1});
      const errors=[],badResources=[];
      page.on('pageerror',error=>errors.push(error.stack||error.message));
      page.on('response',response=>{if(response.status()>=400)badResources.push(response.status()+' '+response.url());});
      page.on('console',msg=>{if(msg.type()==='error'&&!msg.text().startsWith('Failed to load resource'))errors.push(msg.text());});
      const url='http://127.0.0.1:8765/cataclysm-1-0-major/';
      const result=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(result.status(),200,'server returns candidate at '+width+'x'+height);
      await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
      const start=page.locator('#play');
      await start.click({force:true});
      await page.waitForTimeout(width===844?2200:700);
      let snapshot=await page.evaluate(()=>window.CATACLYSM_DIAGNOSTICS.snapshot());
      assert.equal(snapshot.mode,'running','game should start '+width+'x'+height);
      assert.equal(snapshot.build,'1.0');
      assert.equal(snapshot.major.roster.normal,9);
      assert.equal(snapshot.major.roster.boss,9);
      assert.equal(snapshot.major.roster.elite,6);
      assert.equal(snapshot.major.roster.superElite,3);
      assert.equal(snapshot.major.nightDuration,13);
      assert.equal(snapshot.major.animationFrames,378);
      assert.deepEqual(snapshot.major.songs,['ironmarch','afterlight']);
      assert.equal(snapshot.world.size,4200);
      assert.equal(snapshot.world.scrollDirection,'north');
      assert.equal(snapshot.presentation.worldScrollY,-28);
      assert.equal(snapshot.presentation.visualPass,'catastrophe-neon-noir-02');
      assert.equal(snapshot.major.campaign.night,1);
      assert.equal(snapshot.major.victory,false);
      assert.equal(snapshot.major.rerollTokens,0);
      assert.ok(snapshot.time>=0);
      assert.ok(snapshot.player.hp>0);
      const realFailures=badResources.filter(x=>!x.endsWith('/favicon.ico'));
      assert.equal(realFailures.length,0,'Missing resources: '+realFailures.join(' | '));
      assert.equal(errors.length,0,errors.join('\n'));
      const frame=page.locator('#canvas');
      const box=await frame.boundingBox();
      assert.ok(box&&box.width>100&&box.height>100,'canvas fills mobile view');
      if(width===844){
        await page.waitForTimeout(550);
        const drift=await page.evaluate(()=>window.CATACLYSM_DIAGNOSTICS.snapshot());
        assert.ok(drift.player.y<snapshot.player.y-4,'idle player drifts north, environment scrolls down');
        await page.mouse.move(box.x+box.width*.4,box.y+box.height*.65);
        await page.mouse.down();
        await page.mouse.move(box.x+box.width*.54,box.y+box.height*.8,{steps:6});
        await page.waitForTimeout(350);
        await page.mouse.up();
        const newSnap=await page.evaluate(()=>window.CATACLYSM_DIAGNOSTICS.snapshot());
        assert.ok(newSnap.time>snapshot.time,'real simulation advances');
        assert.equal(newSnap.major.campaign.night,1);
      }
      await page.screenshot({path:path.join(dir,'cataclysm-'+width+'x'+height+'.png')});
      await page.close();
      count++;
    }
    console.log('PASS Cataclysm major: eight mobile/desktop browser viewports; running live gameplay, 27 archetypes, 378 frames, new audio registry, 4200 world, no JS exceptions');
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

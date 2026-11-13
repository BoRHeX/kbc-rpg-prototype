'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require('playwright');

(async()=>{
 const gameRoot=path.resolve(__dirname,'../../../docs');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const build of ['cataclysm-1-0-major','cataclysm-100-lab']){
   const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route(new RegExp('/'+build+'/game\\.js\\?build='),async route=>{
    let src=fs.readFileSync(path.join(gameRoot,build,'game.js'),'utf8');
    const marker='  window.CATACLYSM_BOOT.ready(BUILD);';
    assert.ok(src.includes(marker),'test injection point not found');
    src=src.replace(marker,`
      // TEST-ONLY local-browser interception. Never committed to the production game.
      window.__POLISH_QA=Object.freeze({
        prepareMagnet(){
          const p=game.player;
          p.maxHp=100;p.hp=100;p.inv=35;
          game.enemies=[];
          game.fishItems=Array.from({length:4},(_,i)=>({
            x:p.x+420+i*115,y:p.y+100+i*35,r:12,phase:0,value:1,attracted:false
          }));
          game.powerups=[{x:p.x,y:p.y,kind:'magnet',expires:game.t+20}];
          return game.fishItems.length;
        },
        spawnFishAfterSweep(){
          const p=game.player;
          const f={x:p.x+1300,y:p.y+240,r:12,phase:0,value:1,attracted:false};
          game.fishItems.push(f);return f.x;
        },
        lateNightOne(){game.t=12.98;},
        lateNightTwo(){game.t=25.98;}
      });
`+marker);
    await route.fulfill({status:200,contentType:'application/javascript',body:src});
   });
   const response=await page.goto('http://127.0.0.1:8765/'+build+'/',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>window.__POLISH_QA&&CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:5000});
   let s=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
   assert.equal(s.presentation.worldScrollY,0,'world must never auto-scroll');
   assert.equal(s.major.campaign.night,build==='cataclysm-100-lab'?99:1);
   const ui=await page.evaluate(()=>({
     hidden:['city-notice','encounter-status','support-status','buff-status'].every(id=>getComputedStyle(document.getElementById(id)).display==='none'),
     minorHpText:document.querySelector('#encounter-status').textContent
   }));
   assert.equal(ui.hidden,true,'Redundant HUD and hazard announcements must be absent');
   assert.equal(ui.minorHpText,'');
   assert.equal(await page.evaluate(()=>__POLISH_QA.prepareMagnet()),4);
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().presentation.magnetSweepCount===1,{timeout:5000});
   s=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
   assert.equal(s.presentation.magnetSweepFish,4);
   assert.equal(s.buffs.magnet,0,'magnet never starts a timed buff');
   assert.ok(s.fishItems.every(f=>f.swept),'all remaining existing fish were tagged for single sweep');
   await page.evaluate(()=>__POLISH_QA.spawnFishAfterSweep());
   await page.waitForTimeout(220);
   s=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
   assert.ok(s.fishItems.some(f=>!f.swept&&!f.attracted),'later fish must stay outside persistent magnet range');
   assert.equal(s.presentation.magnetSweepCount,1,'one pickup triggers exactly one sweep');
   if(build==='cataclysm-1-0-major'){
     await page.evaluate(()=>__POLISH_QA.lateNightOne());
     await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().major.campaign.night===2,{timeout:4000});
     s=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
     assert.ok(s.presentation.wavePulse>.45,'night 2 must trigger wave-release dim pulse');
     await page.evaluate(()=>__POLISH_QA.lateNightTwo());
     await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().major.campaign.night===3,{timeout:4000});
     s=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
     assert.ok(s.presentation.wavePulse>.45,'night 3 must trigger independent new pulse');
   }
   assert.deepEqual(errors,[],'No JavaScript errors on game '+build);
   const out=path.resolve('artifacts/cataclysm-major');fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'polish-'+build+'.png')});
   await page.close();
   console.log('PASS polish in',build,': one-shot magnet, clean HUD, stationary world',build==='cataclysm-1-0-major'?', 13s wave pulse':'');
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});

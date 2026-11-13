'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[390,844],[844,390]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:true});
   const errors=[],resources=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))resources.push(r.status()+' '+r.url())});
   const dir='cataclysm-1-0-major';
   const game=path.resolve(__dirname,'../../../docs',dir,'game.js');
   await page.route(new RegExp('/'+dir+'/game\\.js\\?build='),async route=>{
    let src=fs.readFileSync(game,'utf8');
    const marker=src.lastIndexOf('})();');
    assert.ok(marker>=0,'preserve the game boot contract');
    src=src.slice(0,marker)+`
      // This test-only hook is never committed to a production game.
      window.__POLISH_CARD_QA=()=>{game.player.level=Math.max(game.player.level,2);offerUpgrade();};
`+src.slice(marker);
    await route.fulfill({status:200,contentType:'application/javascript',body:src});
   });
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:5000});
   const start=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
   assert.equal(start.player.level,1,'real play starts at level one');
   for(const id of ['squad-tactic','runic-relic-activate','companionAbilityButtons']){
    const visible=await page.evaluate(id=>{
      const e=document.getElementById(id);if(!e)return false;
      const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&e.getClientRects().length>0;
    },id);
    assert.equal(visible,false,'manual combat control still visible: '+id);
   }
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().catSpeech?.history?.length>0,null,{timeout:9000});
   const heroLine=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot().catSpeech.history[0].text);
   assert.ok(heroLine.trim().length>2,'a real speech bubble appears on the live game');
   const pause=page.locator('#pause');
   await pause.click({force:true});
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='paused',{timeout:5000});
   const guide=page.locator('#pause-guide');
   assert.equal(await guide.count(),1,'guide must be accessible inside the pause menu');
   assert.ok((await guide.textContent()).trim().length>80,'guide explains actual gameplay');
   assert.ok(await page.locator('#volume').count(),'volume belongs to pause menu');
   assert.ok(await page.locator('#fullscreen').count(),'fullscreen remains possible');
   // The redesigned pause panel owns Resume. The behind-the-modal Pause
   // button must not be force-clicked to dismiss a visible dialog.
   await page.locator('#resume').click();
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',null,{timeout:5000});

   await page.evaluate(()=>window.__POLISH_CARD_QA());
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().pendingUpgrade,{timeout:5000});
   const cards=await page.locator('#upgrade-overlay .upgrade:visible').all();
   assert.equal(cards.length,4,'four valid selectable investments remain');
   for(const card of cards){
    const info=await card.evaluate(e=>({rect:e.getBoundingClientRect().toJSON(),text:e.textContent.trim(),art:!!e.querySelector('.upgrade-art')}));
    assert.ok(info.art,'each card needs a visual illustration treatment');
    assert.ok(info.text.length>20,'each card has a useful description');
    assert.ok(info.rect.top>=0&&info.rect.bottom<=height+2,'card must fit viewport');
   }
   assert.deepEqual(resources,[],'resource failures during actual game');
   assert.deepEqual(errors,[],'JavaScript errors during speaking, pause and upgrades');
   const out=path.resolve('artifacts/cataclysm-major');fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'personality-cards-'+width+'x'+height+'.png')});
   await page.close();
  }
  console.log('PASS Cataclysm living speech, move-only combat, in-pause guide and volume, 4 illustrated choice cards in portrait and landscape');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

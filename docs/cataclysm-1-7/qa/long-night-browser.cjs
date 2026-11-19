// Requires Playwright and a locally installed Chrome. Serves the version from disk.
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json',
  '.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'};
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
    args:['--no-sandbox','--disable-dev-shm-usage','--disable-crashpad-for-testing']});
  try{
    for(const [width,height] of [[390,844],[844,390]]){
      const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('dialog',dialog=>dialog.accept());
      await page.route('http://localhost/**',route=>{
        const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
        const file=path.resolve(base,name);
        if(!file.startsWith(base+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
        return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      const pixels=()=>page.evaluate(()=>{
        const canvas=document.querySelector('#canvas');
        const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        const colors=new Set();
        for(let i=0;i<data.length;i+=404)colors.add(data.slice(i,i+3).join(','));
        return colors.size;
      });
      await page.goto('http://localhost/?seed=26');
      await page.waitForFunction(()=>window.CATACLYSM_READY);
      await page.waitForFunction(()=>document.querySelector('#canvas').getContext('2d').getImageData(7,7,1,1).data[3]===255);
      assert(await pixels()>20,'Nonblank title');
      await page.locator('#play').click();
      const state=()=>page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
      const initial=(await state()).player;
      await page.keyboard.down('d');
      await page.waitForTimeout(500);
      await page.keyboard.up('d');
      const moved=(await state()).player;
      assert(moved.x>initial.x+25,'Keyboard movement');
      assert(await pixels()>20,'Nonblank combat');
      await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
      await page.reload();
      await page.waitForFunction(()=>window.CATACLYSM_READY);
      await page.locator('#continue-run').click();
      assert((await state()).player.x>initial.x+25,'Player position restored');
      assert.deepEqual(errors,[]);
      console.log('PASS Chrome '+width+'×'+height+' startup, movement and checkpoint resume');
      await context.close();
    }
  } finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

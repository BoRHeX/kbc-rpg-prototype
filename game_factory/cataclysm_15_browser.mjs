// Cataclysm 1.5 multi-pass nonblocking browser evidence.
// Run with: node game_factory/cataclysm_14_browser.mjs
// Never marks success without actually opening and drawing the game.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve('docs/cataclysm-1-5/STUDIO');
fs.mkdirSync(root, {recursive:true});
const data = {checks:[], both_orientations_passed:false,
    created_utc:new Date().toISOString(), browser:'Google Chrome via Playwright',
    evidence_kind:'automated browser screenshot, NOT actual Samsung hardware'};
let browser;
try {
  browser = await chromium.launch({channel:'chrome',headless:true,
       args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu-sandbox']});
  for (const dim of [{width:390,height:844},{width:844,height:390}]) {
    const record={viewport:dim,passed:false,errors:[],pixels:0,canvas:null};
    try {
      const page=await browser.newPage({viewport:dim,isMobile:true,hasTouch:true});
      page.on('pageerror',e=>record.errors.push(String(e)));
      const response=await page.goto('http://127.0.0.1:8765/cataclysm-1-5/',
                              {timeout:35000,waitUntil:'domcontentloaded'});
      record.http_status=response?.status();
      if(!response?.ok()) throw new Error('HTTP did not return 2xx');
      await page.waitForTimeout(1200);
      let play=page.locator('#play');
      if(await play.count()) {
        await play.waitFor({state:'visible',timeout:12000});
        await play.click({timeout:11000});
      } else {
        record.errors.push('Start button #play missing; checking if game auto-started');
      }
      await page.waitForTimeout(1500);
      const pixels=await page.evaluate(()=>{
        const canvas=document.querySelector('#canvas') || document.querySelector('canvas');
        if(!canvas) return {ok:false,reason:'canvas missing'};
        const w=canvas.width,h=canvas.height;
        if(w<50||h<50) return {ok:false,reason:'canvas size too small',w,h};
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        if(!ctx)return {ok:false,reason:'no 2D canvas',w,h};
        const colors=new Set();
        for(let j=1;j<=6;j++)for(let i=1;i<=8;i++) {
          const rgba=[...ctx.getImageData(Math.floor(w*i/9),Math.floor(h*j/7),1,1).data];
          colors.add(rgba.join(','));
        }
        return {ok:colors.size>=3,colors:colors.size,w,h,
          startOverlayHidden:document.getElementById('start-overlay')?.hidden ?? null};
      });
      record.canvas=pixels;
      record.pixels=pixels.colors||0;
      record.passed=!!pixels.ok && pixels.startOverlayHidden!==false && record.errors.length===0;
      await page.screenshot({path:path.join(root,'CHROME_'+dim.width+'x'+dim.height+'.png'),fullPage:false});
      await page.close();
    }catch(e) {
      record.errors.push(String(e));
    }
    data.checks.push(record);
  }
  data.both_orientations_passed=data.checks.length===2&&data.checks.every(c=>c.passed);
}catch(e) {
  data.browser_start_error=String(e);
}finally {
  if(browser) await browser.close().catch(()=>{});
  fs.writeFileSync(path.join(root,'BROWSER_QA.json'),JSON.stringify(data,null,2)+'\n');
  console.log('1.5 CHROME QA',JSON.stringify(data).slice(0,2500));
}
// Always return 0. Broken build is a preserved candidate, not a false green QA.
// Its actual status is recorded by studio_multipass_14.py.

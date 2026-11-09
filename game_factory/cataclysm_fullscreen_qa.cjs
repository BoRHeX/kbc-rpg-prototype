// Independent Chrome regression: real fullscreen user gesture, exit and re-entry.
// This script does not mock fullscreen or edit the game source.
'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const base=process.env.NEW_URL||'http://127.0.0.1:8765/preview/';
const dir=process.env.GRAPHICS_OUTPUT||'artifacts/cataclysm-fullscreen';
fs.mkdirSync(dir,{recursive:true});
const report={title:'Cataclysm 0.9 Chrome fullscreen, game and control regression',passed:false,platforms:[],real_device_tested:false};
(async()=>{
 const browser=await chromium.launch({channel:process.env.BORHEZ_BROWSER_CHANNEL||'chrome',headless:true});
 try{
  for(const v of [{width:844,height:390},{width:640,height:320},{width:390,height:844}]){
   const context=await browser.newContext({viewport:v,hasTouch:true,isMobile:true});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   try{
    const resp=await page.goto(base,{waitUntil:'domcontentloaded',timeout:20000});
    if(!resp?.ok())throw Error('Game not served');
    await page.waitForFunction(()=>window.CATACLYSM_READY===true,null,{timeout:12000});
    const initial=await page.evaluate(()=>({
       supported:document.fullscreenEnabled && typeof document.getElementById('arena').requestFullscreen==='function',
       already:!!document.fullscreenElement,
       visible:!document.getElementById('fullscreen').hidden,
       gameVersion:document.getElementById('game-version').textContent
    }));
    if(initial.gameVersion!=='0.9')throw Error('Version changed');
    if(initial.already)throw Error('Unexpected fullscreen before a gesture');
    if(initial.supported&&!initial.visible)throw Error('Fullscreen available but control hidden');
    await page.locator('#play').click();
    await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS?.snapshot()?.mode==='running',null,{timeout:10000});
    if(initial.supported){
       await page.waitForFunction(()=>document.fullscreenElement===document.getElementById('arena'),null,{timeout:6500});
       await page.waitForFunction(()=>document.getElementById('fullscreen').getAttribute('aria-pressed')==='true',null,{timeout:4000});
       await page.locator('#fullscreen').click();
       await page.waitForFunction(()=>!document.fullscreenElement,null,{timeout:5000});
       await page.locator('#fullscreen').click();
       await page.waitForFunction(()=>document.fullscreenElement===document.getElementById('arena'),null,{timeout:5000});
    }
    const result=await page.evaluate(()=>({
       mode:window.CATACLYSM_DIAGNOSTICS.snapshot().mode,
       cssHeight:Math.round(document.getElementById('arena').getBoundingClientRect().height),
       viewportHeight:window.innerHeight,
       fullscreen:!!document.fullscreenElement,
       controlled:document.getElementById('fullscreen').getAttribute('aria-pressed')==='true',
       canvasPixels:window.CATACLYSM_DIAGNOSTICS.snapshot().viewport.pixels
    }));
    if(result.mode!=='running')throw Error('Fullscreen should not interrupt the game');
    if(initial.supported && (!result.fullscreen || !result.controlled))throw Error('Fullscreen not sustained after reentry');
    if(Math.abs(result.cssHeight-result.viewportHeight)>16)throw Error('Fullscreen arena does not fill viewport');
    if(errors.length)throw Error('Uncaught script errors: '+errors.join(';'));
    await page.screenshot({path:path.join(dir,'fullscreen-'+v.width+'x'+v.height+'.png')});
    report.platforms.push({viewport:v,ok:true,initial,result});
   }finally{await context.close();}
  }
  report.passed=true;
 }catch(e){report.error=String(e?.stack||e);}
 finally{
  fs.writeFileSync(path.join(dir,'fullscreen-qa.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  await browser.close();
 }
 if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});

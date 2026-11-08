// Trusted independent Cataclysm Graphics Lab Web Audio gate.
// Instruments normal Web Audio source scheduling without replacing actual sound engine.
// Adds TEST-ONLY access to existing game internals; no production debug controls.
'use strict';
const { chromium }=require('playwright');
const fs=require('fs'),path=require('path');
const source=fs.readFileSync('docs/preview/game.js','utf8');
const marker='  window.CATACLYSM_BOOT.ready(BUILD);';
if(source.split(marker).length!==2)throw Error('Cannot safely instrument Cataclysm game.js');
const bridge=`  window.__SOUND_QA = Object.freeze({getGame:()=>game,pump:()=>music(),getAudio:()=>audio});\n`;
const injected=source.replace(marker,bridge+marker)
 .replace('catch(e){/* Audio is optional on unsupported devices. */}',
          'catch(e){(window.__SOUND_QA_ERRORS ||= []).push("unlockAudio: "+String(e));}')
 .replace('catch(e){silenceAudio();/* optional score; gameplay remains independent */}',
          'catch(e){(window.__SOUND_QA_ERRORS ||= []).push("music: "+String(e));silenceAudio();}');
const base=process.env.NEW_URL||'http://127.0.0.1:8765/preview/';
const out=process.env.GRAPHICS_OUTPUT||'artifacts/graphics-09';
fs.mkdirSync(out,{recursive:true});
const report={title:'Cataclysm original survival/boss soundtrack test',passed:false,platform:'Chromium Web Audio',hardware:'not tested',checks:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BORHEZ_BROWSER_CHANNEL||'chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
 await context.addInitScript(()=>{
  const rec={osc:0,buffers:0,filters:0,shapers:0,compressors:0,sourcesStarted:0,audioContexts:0};
  window.__audioTrace=rec;
  const B=window.BaseAudioContext?.prototype;
  if(B){
    for(const [fn,key] of [['createOscillator','osc'],['createBufferSource','buffers'],['createBiquadFilter','filters'],['createWaveShaper','shapers'],['createDynamicsCompressor','compressors']]){
      const original=B[fn];
      if(typeof original==='function')B[fn]=function(...args){rec[key]++;return original.apply(this,args);};
    }
  }
  const S=window.AudioScheduledSourceNode?.prototype;
  if(S&&typeof S.start==='function'){
    const begin=S.start;
    S.start=function(...args){rec.sourcesStarted++;return begin.apply(this,args);};
  }
  const C=window.AudioContext;
  if(C){
    window.AudioContext=class extends C{constructor(...args){super(...args);rec.audioContexts++;}};
  }
 });
 const page=await context.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 const check=async(name,fn)=>{
   const data=await page.evaluate(fn);
   if(!data||!data.ok)throw Error(name+' failed: '+JSON.stringify(data));
   report.checks.push({name,...data});
 };
 try{
   const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:20000});
   if(!response?.ok())throw Error('Game page not loaded');
   await page.locator('#play').waitFor({state:'visible',timeout:12000});
   await page.waitForFunction(()=>!document.getElementById('play').disabled,{timeout:12000});
   await check('no audio playback before first user gesture',()=>{
     const n=window.__audioTrace;
     return {ok:n.audioContexts===0&&n.sourcesStarted===0,contexts:n.audioContexts,sources:n.sourcesStarted};
   });
   await page.locator('#play').click();
   await page.waitForFunction(()=>window.__SOUND_QA?.getGame()?.mode==='running',null,{timeout:10000});
   try{
     await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS?.snapshot()?.music?.mode==='survival',null,{timeout:10000});
   }catch(e){
     const evidence=await page.evaluate(()=>({
       music:window.CATACLYSM_DIAGNOSTICS?.snapshot()?.music,
       gameMode:window.__SOUND_QA?.getGame()?.mode,
       audioState:window.__SOUND_QA?.getAudio()?.state,
       trace:window.__audioTrace,
       caughtAudioErrors:window.__SOUND_QA_ERRORS||[],
       hidden:document.hidden,
       hasBridge:!!window.__SOUND_QA,
       voiceEngineLoaded:!!window.CATACLYSM_BOOT
     }));
     throw Error('Survival audio did not initialize: '+JSON.stringify(evidence)+'; browserErrors='+errors.join('; '));
   }
   await page.waitForTimeout(1600);
   await check('survival score schedules layered real Web Audio',()=>{
     const n=window.__audioTrace, d=window.CATACLYSM_DIAGNOSTICS.snapshot().music;
     return {ok:d.mode==='survival'&&d.active&&d.beat>=4&&n.sourcesStarted>=10&&n.audioContexts===1,
             mode:d.mode,beat:d.beat,...n};
   });
   await page.evaluate(()=>{
      const g=window.__SOUND_QA.getGame(),p=g.player;
      g.enemies.push({x:p.x+400,y:p.y+330,r:44,variant:'boss',hp:9000,max:9000,damage:2,speed:0,
        phase:0,weight:20,hurt:0,night:1,dashX:0,dashY:0});
   });
   await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS.snapshot().music.mode==='boss',null,{timeout:3500});
   await page.waitForTimeout(850);
   await check('boss triggers dubstep mode immediately with real audio sources',()=>{
     const d=window.CATACLYSM_DIAGNOSTICS.snapshot().music, n=window.__audioTrace;
     return {ok:d.mode==='boss'&&d.active&&n.sourcesStarted>=16,mode:d.mode,beat:d.beat,...n};
   });
   await page.evaluate(()=>{const g=window.__SOUND_QA.getGame();g.enemies=g.enemies.filter(e=>e.variant!=='boss');});
   await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS.snapshot().music.mode==='survival',null,{timeout:3500});
   await check('boss defeat restores normal hard rock rhythm',()=>{
     const d=window.CATACLYSM_DIAGNOSTICS.snapshot().music;
     return {ok:d.mode==='survival',mode:d.mode,beat:d.beat};
   });
   await page.locator('#pause').click();
   await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS.snapshot().music.mode==='silent',null,{timeout:3500});
   await check('pausing silences score',()=>{
     const d=window.CATACLYSM_DIAGNOSTICS.snapshot().music;
     return {ok:!d.active&&d.mode==='silent',mode:d.mode,active:d.active};
   });
   await page.locator('#play').click();
   await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS.snapshot().music.mode==='survival',null,{timeout:3500});
   await page.locator('#mute').click();
   await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS.snapshot().music.mode==='silent',null,{timeout:3500});
   await page.evaluate(()=>{window.__SOUND_QA_SOURCES_BEFORE=window.__audioTrace.sourcesStarted;});
   await page.waitForTimeout(370);
   await check('mute silences background AND suppresses new sound voices',()=>{
     const d=window.CATACLYSM_DIAGNOSTICS.snapshot().music,n=window.__audioTrace;
     return {ok:d.mode==='silent'&&!d.enabled&&n.sourcesStarted===window.__SOUND_QA_SOURCES_BEFORE,
       mode:d.mode,enabled:d.enabled,sources:n.sourcesStarted,expected:window.__SOUND_QA_SOURCES_BEFORE};
   });
   await page.locator('#mute').click();
   await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS.snapshot().music.mode==='survival',null,{timeout:3500});
   await check('unmute recovers existing soundtrack without new AudioContext',()=>{
     const d=window.CATACLYSM_DIAGNOSTICS.snapshot().music,n=window.__audioTrace;
     return {ok:d.active&&d.mode==='survival'&&n.audioContexts===1,mode:d.mode,contexts:n.audioContexts};
   });
   if(errors.length)throw Error('Browser JS errors: '+errors.join('; '));
   report.passed=true;
 }catch(e){report.error=String(e?.stack||e);}
 finally{
   fs.writeFileSync(path.join(out,'audio-qa.json'),JSON.stringify(report,null,2)+'\n');
   console.log(JSON.stringify(report,null,2));
   await context.close();await browser.close();
 }
 if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});

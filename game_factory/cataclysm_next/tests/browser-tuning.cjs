'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[390,844],[844,390]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
   const dir='cataclysm-1-0-major';
   const game=path.resolve(__dirname,'../../../docs',dir,'game.js');
   await page.route(new RegExp('/'+dir+'/game\\.js\\?build='),async route=>{
    let src=fs.readFileSync(game,'utf8');
    const marker='  window.CATACLYSM_BOOT.ready(BUILD);';
    assert.ok(src.includes(marker),'retain boot handshake');
    src=src.replace(marker,`
      // TEST-ONLY: expose actual local gameplay formulas; never shipped to production.
      window.__TUNE_QA=Object.freeze({
        xp:()=>Array.from({length:15},(_,i)=>xpRequired(i+1)),
        cost:(variant)=>enemyThreat({variant,weight:1}),
        forceSpeech(){
          const s=game.catSpeech;s.cooldowns={};s.nextSpeechAt=0;s.active=[];s.queue=[];
          CATS.emit(s,'hero','hurt',{gap:0});
          CATS.dispatch(s,['hero'],game.campaign.night);
        }
      });
`+marker);
    await route.fulfill({status:200,contentType:'application/javascript',body:src});
   });
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:5000});
   const result=await page.evaluate(()=>({
     levels:__TUNE_QA.xp(),
     melee:__TUNE_QA.cost('shambler'),
     ranged:__TUNE_QA.cost('weaver'),
     ghost:__TUNE_QA.cost('ghost'),
     caster:__TUNE_QA.cost('hexer'),
     ghostPrice:CATA_LAB_DIRECTOR.priceFor('ghost',15),
     weaverPrice:CATA_LAB_DIRECTOR.priceFor('weaver',15),
     player:CATACLYSM_DIAGNOSTICS.snapshot().player
   }));
   assert.deepEqual(result.levels.slice(0,3),[6,8,10],'early XP costs should be 6, 8, 10 instead of 10, 13, 16');
   assert.ok(result.levels.every((n,i)=>Number.isFinite(n)&&n>0&&(!i||n>=result.levels[i-1])),'XP growth smooth and monotone');
   assert.ok(result.ranged>=result.melee*2,'ranged units cost materially more threat than basic melee');
   assert.ok(result.ghost>=result.ranged*1.4,'silencing ghost is a premium enemy');
   assert.ok(result.caster>=result.melee*2,'caster pressure has meaningful cost');
   assert.ok(result.ghostPrice>result.weaverPrice,'director also prices silencing enemies above generic shooters');

   // Capture *actual painted sprite source rectangles*, not decorative frame counters.
   await page.waitForFunction(()=>window.CATA_ART&&CATA_ART.assetStatus().loaded>=40,{timeout:15000});
   const frames=await page.evaluate(()=>{
    const c=document.createElement('canvas').getContext('2d'),original=c.drawImage.bind(c),frames={};
    c.drawImage=function(...args){(frames.call||(frames.call=[])).push({name:String(args[0]?.src||''),sourceX:args[1]});return original(...args);};
    const record=(id,state,t)=>{frames.call=[];CATA_ART.draw(c,id,18,t,state,0,false,false,true);return [...frames.call];};
    return {enemyA:record('shambler','run',.13),enemyB:record('shambler','run',.38),
      attackA:record('shambler','attack',.13),attackB:record('shambler','attack',.38),
      heroRun:record('hero','run',.14),heroRunLater:record('hero','run',.57),heroFeral:record('hero','feral',.4),
      heroHit:record('hero','hit',.4)};
   });
   const paintedX=a=>a.find(x=>x.name.includes('shambler-run.png'))?.sourceX;
   assert.notEqual(paintedX(frames.enemyA),paintedX(frames.enemyB),'enemy run must advance actual painted source frame');
   assert.notEqual(paintedX(frames.attackA),paintedX(frames.attackB),'enemy without special attack atlas must not freeze on a static fallback frame');
   assert.ok(frames.heroFeral.some(x=>x.name.includes('hero-feral.png')),'hero feral must show painted feral pose, not just an effect ring');
   assert.ok(frames.heroHit.some(x=>x.name.includes('hero-hit.png')),'hero hit must use painted hit pose');
   const heroRunSheet=x=>x.find(a=>a.name.includes('hero-run.png')||a.name.includes('characters/hero/run.png'));
   assert.ok(heroRunSheet(frames.heroRun),'hero running pose must use an actual painted run atlas');
   assert.ok(heroRunSheet(frames.heroRunLater),'hero running pose must retain the painted run atlas later');
   assert.notEqual(heroRunSheet(frames.heroRun).sourceX,heroRunSheet(frames.heroRunLater).sourceX,'hero run must advance actual painted frames, not a static image');

   await page.evaluate(()=>__TUNE_QA.forceSpeech());
   await page.waitForFunction(()=>document.querySelector('.cat-speech[data-cat-speech]:not([hidden])'),null,{timeout:5000});
   const bubble=await page.evaluate(()=>{
      const el=document.querySelector('.cat-speech[data-cat-speech]:not([hidden])'),cs=getComputedStyle(el);
      return {bg:cs.backgroundColor,text:cs.color,border:cs.borderColor,full:el.getAttribute('aria-label')||el.textContent};
   });
   const channels=bubble.bg.match(/[\d.]+/g)?.map(Number)||[];
   assert.ok(channels.length===4&&channels[3]>0&&channels[3]<.9,'speech bubble must be translucent, not opaque: '+JSON.stringify({bubble,channels}));
   const foreground=bubble.text.match(/[\d.]+/g)?.map(Number)||[];
   assert.ok(foreground.length>=3&&foreground.slice(0,3).every(v=>v>185),'speech text must be white/high-contrast');
   const atStart=await page.locator('.cat-speech[data-cat-speech]:visible').first().textContent();
   await page.waitForTimeout(320);
   const after=await page.locator('.cat-speech[data-cat-speech]:visible').first().textContent();
   assert.ok(after.length>=atStart.length,'typing reveal must not reverse');
   assert.ok(atStart.length<after.length||after.length>=8,'the bubble is readable, not permanently blank');
   assert.deepEqual(errors,[],'no runtime exceptions');
   const out=path.resolve('artifacts/cataclysm-major');fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'tuning-'+width+'x'+height+'.png')});
   await page.close();
  }
  console.log('PASS XP curve, expensive ranged/silence cost, actual enemy/hero painted frame advance, translucent white-on-dark speaking UI');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

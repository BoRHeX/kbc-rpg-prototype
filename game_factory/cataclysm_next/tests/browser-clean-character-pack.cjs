'use strict';
// Independent acceptance: what is actually DRAWN, not how many animation files exist.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [dir,width,height] of [['cataclysm-1-0-major',390,844],['cataclysm-100-lab',844,390]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const errors=[],badArt=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&r.url().includes('/art/'))badArt.push(r.status()+': '+r.url())});
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.waitForFunction(()=>!!window.CATA_ART?.packInfo?.('hero')?.ready,{timeout:20000});
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:8000});
   const result=await page.evaluate(()=>{
     const a=CATA_ART,pack=a.packInfo('hero'),canvas=document.createElement('canvas');
     canvas.width=128;canvas.height=128;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});
     const original=ctx.drawImage.bind(ctx),records=[];
     ctx.drawImage=function(...args){records.push({url:String(args[0]?.src||''),sx:args[1],sy:args[2]});return original(...args);};
     const sample=(id,state,bearing,time,moving,damaged=false)=>{
       records.length=0;
       ctx.clearRect(0,0,128,128);ctx.save();ctx.translate(64,64);
       a.draw(ctx,id,23,time,state,bearing,damaged,false,moving,
         state==='feral'||state==='adrenaline'?state:null,false);
       ctx.restore();
       const pixels=ctx.getImageData(0,0,128,128).data;
       let hash=2166136261;
       for(let i=0;i<pixels.length;i+=4){hash=Math.imul(hash^pixels[i],16777619)>>>0;
          hash=Math.imul(hash^pixels[i+1],16777619)>>>0;
          hash=Math.imul(hash^pixels[i+2],16777619)>>>0;
          hash=Math.imul(hash^pixels[i+3],16777619)>>>0;
       }
       return {records:[...records],hash};
     };
     const frames=[];
     for(const state of ['idle','run','attack','feral','adrenaline','hit']){
       for(const bearing of [0,Math.PI/2,Math.PI,-Math.PI/2]){
         frames.push({state,bearing,early:sample('hero',state,bearing,.12,state!=='idle'&&state!=='hit',state==='hit'),
           later:sample('hero',state,bearing,.46,state!=='idle'&&state!=='hit',state==='hit')});
       }
     }
     const companions={};
     for(const id of a.allyIds)companions[id]=['run','special','attack'].map(state=>sample(id,state,0,.2,false,false));
     return {pack,frames,companions,mode:CATACLYSM_DIAGNOSTICS.snapshot().major.campaign.night,
       resources:performance.getEntriesByType('resource').filter(x=>/\/art\/hero-(idle|run|feral|adrenaline|hit|attack)\.png/.test(x.name)).map(x=>x.name)};
   });
   assert.equal(result.mode,dir==='cataclysm-100-lab'?99:1,'preserve normal campaign and Night99 lab');
   assert.ok(result.pack.id&&result.pack.ready,'one explicit live hero pack identity');
   assert.ok(result.pack.family&&result.pack.family.includes('characters/hero'),'hero visuals live in one canonical character family');
   assert.equal(result.resources.length,0,'modern hero must not download unneeded legacy 24-frame art families');
   for(const f of result.frames){
     const names=[f.early,f.later].map(x=>x.records);
     for(const records of names){
       assert.equal(records.length,1,'exactly one whole-body image draw for hero '+f.state);
       assert.ok(records[0].url.includes('/art/characters/hero/'),
        'hero '+f.state+' uses only its canonical textured art, not an obsolete/procedural hero');
       assert.ok(!records[0].url.includes('directed-'),
        'crossfaded directed-* sheets are retired; no blended two-pose ghost textures');
     }
     assert.notEqual(f.early.hash,f.later.hash,'hero must visibly animate at 390x844 scale in '+f.state);
     const a=f.early.records[0],b=f.later.records[0];
     assert.ok(a.sx!==b.sx||a.sy!==b.sy||a.url!==b.url,
       'hero '+f.state+' must select actual distinct authored texture frames, not just translate a still image or emit particles');
   }
   for(const state of ['run','feral','adrenaline']){
     const arr=result.frames.filter(f=>f.state===state);
     assert.equal(new Set(arr.map(f=>f.early.hash)).size,4,'hero must respond to all 4 tested aim bearings during '+state);
   }
   for(const [id,states] of Object.entries(result.companions)){
     for(const sampleResult of states){
       const calls=sampleResult.records.filter(x=>x.url.includes('/art/'));
       assert.ok(calls.length<=1,'no multiple whole-body image sheets for '+id);
     }
   }
   assert.deepEqual(errors,[],'uncaught browser errors');
   assert.deepEqual(badArt,[],'missing/corrupt art');
   const out='artifacts/cataclysm-cleanpack';fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,dir+'.png')});
   console.log('PASS single source character pack and clean moving hero silhouette, 6 states × 4 directions:',dir);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});

'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [dir,width,height] of [['cataclysm-1-0-major',390,844],['cataclysm-100-lab',844,390]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const errors=[],assets=[];
   page.on('pageerror',e=>errors.push(e.stack||e.message));
   page.on('response',r=>{if(r.status()>=400&&r.url().includes('/art/'))assets.push(r.status()+' '+r.url())});
   const game=path.resolve(__dirname,'../../../docs',dir,'game.js');
   await page.route(new RegExp('/'+dir+'/game\\.js\\?build='),async route=>{
    let src=fs.readFileSync(game,'utf8'),marker='  window.CATACLYSM_BOOT.ready(BUILD);';
    assert.ok(src.includes(marker),'preserve boot contract');
    src=src.replace(marker,"window.__TURRET_PAINT_QA=(angle)=>{const canvas=document.createElement('canvas');canvas.width=110;canvas.height=110;const context=canvas.getContext('2d',{willReadFrequently:true});drawEngineerTurret(context,{x:55,y:55,timer:.32,aim:angle},0);return [...context.getImageData(0,0,110,110).data];};\n"+marker);
    await route.fulfill({status:200,contentType:'application/javascript',body:src});
   });
   await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
   await page.waitForFunction(()=>window.CATA_ART?.directionalStatus()?.loaded===3,{timeout:30000});
   const result=await page.evaluate(()=>{
    const art=CATA_ART,canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
    const c=canvas.getContext('2d',{willReadFrequently:true}),original=c.drawImage.bind(c);
    let sources=[];
    c.drawImage=function(...args){sources.push({url:String(args[0]?.src||''),sx:args[1]});return original(...args);};
    const sample=(state,angle,time)=>{
      sources=[];c.clearRect(0,0,96,96);c.save();c.translate(48,58);
      art.draw(c,'hero',23,time,state,angle,false,false,state==='run');c.restore();
      const bytes=c.getImageData(0,0,96,96).data;
      let signature=0;for(let i=0;i<bytes.length;i+=4)signature+=bytes[i]+bytes[i+1]*3+bytes[i+2]*5+bytes[i+3]*7;
      return {sources:[...sources],signature};
    };
    const states={};
    for(const state of ['run','idle','attack']){
      const arr=[];for(let direction=0;direction<8;direction++){
        const angle=direction*Math.PI/4;
        arr.push([sample(state,angle,0),sample(state,angle,.29)]);
      }states[state]=arr;
    }
    return {status:art.directionalStatus(),states,engineerAt0:__TURRET_PAINT_QA(0),engineerAt90:__TURRET_PAINT_QA(Math.PI/2)};
   });
   assert.ok(result.status.loaded>=3&&result.status.failed===0&&['run','idle','attack'].every(k=>result.status.states[k]),'base directional sheets must remain loaded; creative buff sheets may add states');
   for(const [state,frames] of [['run',8],['idle',6],['attack',8]]){
    const firstFrames=[];
    for(let direction=0;direction<8;direction++){
      const [first,second]=result.states[state][direction],expected='characters/hero/directed-'+state+'.png';
      assert.equal(first.sources.length,1,'one complete sprite frame, not runtime stitching');
      assert.equal(second.sources.length,1);
      assert.ok(first.sources[0].url.includes(expected),'latest state sprite required');
      assert.ok(second.sources[0].url.includes(expected));
      const f0=first.sources[0].sx,f1=second.sources[0].sx;
      assert.equal(f0,direction*frames*96,'compass offset '+direction);
      assert.ok(f1>=direction*frames*96&&f1<(direction+1)*frames*96,'no facing switch while animating');
      assert.notEqual(f0,f1,'frames advance inside a fixed facing');
      assert.notEqual(first.signature,second.signature,'rendered sprite pixels change, not just a frame counter');
      firstFrames.push(f0);
    }
    assert.equal(new Set(firstFrames).size,8,'eight distinct aim directions');
   }
   const diff=result.engineerAt0.reduce((n,v,i)=>n+(v!==result.engineerAt90[i]?1:0),0);
   assert.ok(diff>90,'turret visually rotates to track targets');
   await page.locator('#play').click({force:true});
   await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:6000});
   await page.addStyleTag({content:':root{--cat-top-inset:32px !important}'});
   const rects=await page.evaluate(()=>{
     const r=id=>document.querySelector(id).getBoundingClientRect().toJSON();
     return {header:r('.identity'),hud:r('.hud'),full:r('#fullscreen'),pause:r('#pause'),title:r('.identity>span')};
   });
   assert.ok(rects.header.bottom+3<=rects.hud.top,'top Android safe area must not cause HUD/header overlap: '+JSON.stringify(rects));
   assert.ok(rects.full.right+3<=rects.pause.left,'fullscreen must not overlap a visible Pause control: '+JSON.stringify(rects));
   assert.ok(rects.title.right<=rects.full.left+1,'game title must not draw beneath fullscreen');
   assert.deepEqual(errors,[],'runtime JS errors');
   assert.deepEqual(assets,[],'missing painted assets');
   const out='artifacts/cataclysm-hero-directional';fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,dir+'.png')});
   await page.close();
   console.log('PASS 8 compass directions × 8/6/8 movement phases, HUD safe area, rotating turret:',dir);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

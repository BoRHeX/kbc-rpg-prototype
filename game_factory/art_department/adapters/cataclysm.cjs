/* Cataclysm-specific game contract, decoupled from general art pipeline. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
module.exports.prove=async(page,job,out)=>{
  await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
  await page.waitForFunction(()=>window.CATA_ART && window.CATA_ART.assetStatus().loaded>=41,{timeout:30000});
  const art=await page.evaluate(()=>CATA_ART.assetStatus());
  assert.equal(art.failed,0,'All game assets must decode');
  await page.locator('#play').click({force:true});
  await page.waitForTimeout(1200);
  const state=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
  assert.equal(state.mode,'running','Art must be visible in playable simulation');
  assert.equal(state.build,'1.0');
  await page.screenshot({path:path.join(out,'actual-game.png')});
  // Real renderer, real decoded atlas: extract the animation directly from
  // the running browser context, not from the generated image files.
  const png=await page.evaluate((states)=>{
    const canvas=document.createElement('canvas');
    canvas.width=840;canvas.height=states.length*170;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#1d2736';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font='bold 20px sans-serif';ctx.fillStyle='#fff';ctx.textBaseline='middle';
    states.forEach((state,row)=>{
      ctx.fillStyle='#fff';ctx.fillText(state,8,row*170+80);
      for(let col=0;col<4;col++){
        ctx.save();ctx.translate(160+col*169,row*170+92);
        window.CATA_ART.draw(ctx,'hero',58,col/24*6,state,0,false,false);
        ctx.restore();
      }
    });
    return canvas.toDataURL('image/png').split(',')[1];
  },job.states);
  const buf=Buffer.from(png,'base64');
  assert.ok(buf.length>12000,'Real runtime character sprite render unexpectedly empty');
  fs.writeFileSync(path.join(out,'motion-render.png'),buf);
  // Inspect every actual runtime frame: a four-image montage can hide a two-pose loop.
  for(const state of ['run','attack']){
    const cycle=await page.evaluate((motion)=>{
      const sheet=document.createElement('canvas');
      sheet.width=6*144;sheet.height=4*148;
      const c=sheet.getContext('2d');
      c.fillStyle='#1d2736';c.fillRect(0,0,sheet.width,sheet.height);
      c.font='bold 14px sans-serif';c.textBaseline='top';
      for(let k=0;k<24;k++){
        const col=k%6,row=Math.floor(k/6),x=col*144,y=row*148;
        c.save();c.translate(x+72,y+82);
        CATA_ART.draw(c,'hero',30,k/24,motion,0,false,false);
        c.restore();
        c.fillStyle='#f8fafc';c.fillText(motion+' '+String(k).padStart(2,'0'),x+7,y+3);
      }
      return sheet.toDataURL('image/png').split(',')[1];
    },state);
    fs.writeFileSync(path.join(out,state+'-cycle.png'),Buffer.from(cycle,'base64'));
  }
  // Also exercise the 99-night stress scene after loading the new art mirror.
  const stress=await page.goto('http://127.0.0.1:8765/cataclysm-100-lab/',{waitUntil:'domcontentloaded'});
  assert.equal(stress.status(),200);
  await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
  await page.waitForFunction(()=>window.CATA_ART && window.CATA_ART.assetStatus().loaded>=41,{timeout:30000});
  assert.equal(await page.evaluate(()=>CATA_ART.assetStatus().failed),0,'Stress mirror hero assets must decode');
  console.log('CATACLYSM art adapter:',art.loaded,'atlases, main campaign and stress lab loaded');
};

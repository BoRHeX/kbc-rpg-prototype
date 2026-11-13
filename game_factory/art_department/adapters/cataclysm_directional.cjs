/* Character animation QA in a real running game. The artist cannot edit this. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../..');
module.exports.prove=async(page,job,out)=>{
 const injection=[
 'window.__CAT_HERO_PROFILE=(ratio,shield,effect,hit)=>{',
 ' const p=game.player,a=p.animation;',
 ' const saved={visualMoving:a.visualMoving,moving:a.moving,moveSpeed:a.moveSpeed,hit:a.hit,recovery:a.recovery,attack:a.attack,aim:p.aim,inv:p.inv,rage:game.buffs.rage,adrenaline:game.buffs.survivalInstinct,feral:game.feralInstinct.active,overdrive:game.feralInstinctOverdrive};',
 ' const drawn=[],fn=ctx.drawImage;',
 ' try{',
 ' a.visualMoving=ratio>0;a.moving=ratio>0;a.moveSpeed=cfg.speed*Math.max(0,ratio);',
 ' a.hit=hit?0.2:0;a.recovery=0;a.attack=0;p.aim=Math.PI/4;p.inv=shield?1.4:0;',
 ' game.buffs.rage=effect==="feral"?2:0;game.buffs.survivalInstinct=effect==="adrenaline"?2:0;',
 ' game.feralInstinct.active=effect==="feral";game.feralInstinctOverdrive=effect==="overdrive"?3:0;',
 ' ctx.drawImage=function(...args){drawn.push({url:String(args[0]?.src||""),sx:args[1],sy:args[2]});return fn.apply(this,args);};',
 ' ctx.save();catSprite("hero",27,game.t,!!hit,p.aim);ctx.restore();',
 ' }finally{ctx.drawImage=fn;',
 ' Object.assign(a,{visualMoving:saved.visualMoving,moving:saved.moving,moveSpeed:saved.moveSpeed,hit:saved.hit,recovery:saved.recovery,attack:saved.attack});',
 ' p.aim=saved.aim;p.inv=saved.inv;game.buffs.rage=saved.rage;game.buffs.survivalInstinct=saved.adrenaline;',
 ' game.feralInstinct.active=saved.feral;game.feralInstinctOverdrive=saved.overdrive;}',
 ' return drawn.filter(x=>x.url.includes("/characters/hero/"));',
 '};'
 ].join('\n');
 await page.route(/\/cataclysm-(?:1-0-major|100-lab)\/game\.js\?build=/,async route=>{
  const url=route.request().url();
  const dir=url.includes('/cataclysm-100-lab/')?'cataclysm-100-lab':'cataclysm-1-0-major';
  const source=fs.readFileSync(path.join(ROOT,'docs',dir,'game.js'),'utf8');
  const insertion=source.lastIndexOf('})();');
  assert.ok(insertion>0,'Source no longer uses a game closure; update the trusted QA adapter');
  await route.fulfill({status:200,contentType:'application/javascript',
   body:source.slice(0,insertion)+injection+'\n'+source.slice(insertion)});
 });
 const open=async dir=>{
  const response=await page.goto('http://127.0.0.1:8765/'+dir+'/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.CATACLYSM_READY===true,{timeout:20000});
  await page.waitForFunction(()=>window.CATA_ART?.packInfo?.('hero')?.ready===true,{timeout:30000});
  assert.equal(await page.evaluate(()=>CATA_ART.packInfo('hero').family),job.family,
    'New sprite pack must be SELECTED by the real Canvas renderer, not merely present on disk');
  await page.locator('#play').click({force:true});
  await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='running',{timeout:8000});
 };
 await open(job.play_url_path);
 await page.screenshot({path:path.join(out,'actual-game.png')});
 const cases=[
  ['idle',0,false,null,false],['walk',.43,false,null,false],
  ['run',1,false,null,false],['sprint',1.48,false,null,false],
  ['overdrive',2.2,false,'overdrive',false],['shield-idle',0,true,null,false],
  ['shield-run',1,true,null,false],['feral',1.1,false,'feral',false],
  ['adrenaline',1.1,false,'adrenaline',false],['hit',1,false,null,true]
 ];
 const selected=await page.evaluate(entries=>entries.map(([label,ratio,shield,effect,hit])=>({
  label,drawn:__CAT_HERO_PROFILE(ratio,shield,effect,hit)
 })),cases);
 for(const entry of selected){
  assert.equal(entry.drawn.length,1,'Real game must draw one full hero in '+entry.label);
  const asset=entry.drawn[0].url;
  assert.ok(asset.includes('/characters/hero/'+job.family+'/'),
   'Game still uses old hero pack during '+entry.label+': '+asset);
  assert.ok(asset.includes('/'+entry.label+'.png'),
   'Game motion profile '+entry.label+' did not select its actual sprite state: '+asset);
 }
 fs.writeFileSync(path.join(out,'runtime-selection.json'),JSON.stringify(selected,null,2));
 const preview=await page.evaluate(j=>{
  const cv=document.createElement('canvas');cv.width=960;cv.height=j.states.length*145;
  const c=cv.getContext('2d');c.fillStyle='#172434';c.fillRect(0,0,cv.width,cv.height);
  j.states.forEach((state,row)=>{
   c.fillStyle='#fff';c.font='bold 16px sans-serif';c.fillText(state,4,row*145+25);
   const count=j.state_frames[state],motion=/walk|run|sprint|overdrive|feral|adrenaline/.test(state);
   for(let k=0;k<8;k++){
    c.save();c.translate(152+k*99,row*145+65);
    CATA_ART.draw(c,'hero',23,(Math.floor(count*k/8))/(j.fps[state]||14),state,0,
      false,false,motion,null,state==='attack',{previewState:state});
    c.restore();
   }
  });
  return cv.toDataURL('image/png').split(',')[1];
 },job);
 fs.writeFileSync(path.join(out,'motion-render.png'),Buffer.from(preview,'base64'));
 for(const name of ['run','attack']){
  const image=await page.evaluate(([state,j])=>{
   const n=j.state_frames[state],cv=document.createElement('canvas');
   cv.width=6*140;cv.height=Math.ceil(n/6)*146;
   const c=cv.getContext('2d');c.fillStyle='#1b2736';c.fillRect(0,0,cv.width,cv.height);
   for(let i=0;i<n;i++){
    const x=i%6*140,y=Math.floor(i/6)*146;c.save();c.translate(x+70,y+74);
    CATA_ART.draw(c,'hero',28,i/(j.fps[state]||14),state,0,false,false,state==='run',
      null,state==='attack',{previewState:state});c.restore();
    c.fillStyle='#fff';c.font='13px sans-serif';c.fillText(state+' '+i,x+8,y+12);
   }
   return cv.toDataURL('image/png').split(',')[1];
  },[name,job]);
  fs.writeFileSync(path.join(out,name+'-cycle.png'),Buffer.from(image,'base64'));
 }
 await open('cataclysm-100-lab');
 const snap=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());
 assert.equal(snap.lab.source,'night99-stress-test');
 assert.equal(snap.player.level,100);
 assert.equal(await page.evaluate(()=>CATA_ART.assetStatus().failed),0);
 console.log('PASS all real game character states use canonical painted hero atlas with visible cycles and separate laboratory');
};

// Trusted independent toroidal-world QA. Never editable by graphics studio Codex.
// Tests actual branch game.js in Chromium with a TEST-ONLY injected bridge; production source is unchanged.
// The graphical screenshot test separately exercises real animation/input at 3 mobile viewports.
const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
const assert=require('node:assert/strict');
const source=fs.readFileSync('docs/preview/game.js','utf8');
const needle='  window.CATACLYSM_BOOT.ready(BUILD);';
if(source.split(needle).length!==2)throw Error('Cannot instrument real game source safely');
for(const id of ['const WORLD_SIZE','function wrapCoord(','function wrappedDelta(','function isTerrainClear(','function moveWithCollision(','function resolveActorCollisions(']){
  if(!source.includes(id))throw Error('Required world physics contract missing: '+id);
}
const bridge=`  window.__WORLD_QA = Object.freeze({
    getGame:()=>game,
    getCity:()=>city,
    getSize:()=>WORLD_SIZE,
    wrapCoord,wrappedDelta,dist,isTerrainClear,moveWithCollision,resolveActorCollisions,
    start,tick,spawnEnemy,summonCompanion,updateCompanions,dropPower,addFish,renderWorld
  });
`;
const injected=source.replace(needle,bridge+needle)
                     .replace('  last=performance.now();requestAnimationFrame(frame);',
                              '  last=performance.now(); // QA controls simulation time deterministically');
const output=process.env.GRAPHICS_OUTPUT||'artifacts/graphics-09';
fs.mkdirSync(output,{recursive:true});
const url=process.env.NEW_URL||'http://127.0.0.1:8765/preview/';
const browser=Promise.resolve().then(()=>chromium.launch({headless:true,channel:process.env.BORHEZ_BROWSER_CHANNEL||'chrome'}));

(async()=>{
 const b=await browser;
 const report={title:'Cataclysm Graphics Lab toroidal physics',passed:false,tests:[],physical_device:'not tested',source_instrumentation:'test only'};
 const ctx=await b.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
 const page=await ctx.newPage();const errs=[];
 page.on('pageerror',e=>errs.push(e.message));
 await page.route(/\\/preview\\/game\\.js(?:\\?.*)?$/,route=>route.fulfill({status:200,contentType:'text/javascript',body:injected}));
 const run=async(name,fn)=>{
   const result=await page.evaluate(fn);
   assert(result&&result.ok,name+': '+JSON.stringify(result));
   report.tests.push({name,...result});
 };
 try {
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
   await page.waitForFunction(()=>!document.getElementById('play').disabled,{timeout:12000});
   await page.locator('#play').click();
   await page.waitForFunction(()=>!!window.__WORLD_QA?.getGame(),{timeout:5000});
   await run('toroidal math and shortest path',()=>{
     const q=window.__WORLD_QA,s=q.getSize(),p=q.wrapCoord(-5),r=q.wrapCoord(s+5),d=q.wrappedDelta(s-15,15);
     return {ok:s===2400&&p===s-5&&r===5&&Math.abs(d-30)<.01&&Math.abs(q.dist(s-15,1200,15,1200)-30)<.01,size:s,p,r,d};
   });
   await run('terrain is mostly open and map geometry is present',()=>{
     const q=window.__WORLD_QA,buildings=q.getCity(),s=q.getSize();
     let free=0,total=0;
     for(let y=30;y<s;y+=75)for(let x=30;x<s;x+=75){total++;if(q.isTerrainClear(x,y,22))free++;}
     const fraction=free/total;
     return {ok:buildings.length>=1&&fraction>=.65&&fraction<=.99,solids:buildings.length,freeFraction:+fraction.toFixed(3)};
   });
   await run('east and west seam traversal is real movement',()=>{
     const q=window.__WORLD_QA,g=q.getGame(),s=q.getSize(),p=g.player;
     g.enemies.length=0;g.companionSquad.length=0;g.spawn=999;
     let y=0;
     for(let t=120;t<s;t+=65){
       if([s-65,s-10,5,45,75].every(x=>q.isTerrainClear(q.wrapCoord(x),t,p.r+2))){y=t;break;}
     }
     if(!y)return {ok:false,reason:'No open seam lane'};
     p.x=s-15;p.y=y;
     q.moveWithCollision(p,40,0);
     const east=p.x;
     p.x=14;p.y=y;q.moveWithCollision(p,-40,0);
     const west=p.x;
     return {ok:east>=0&&east<80&&west>s-80&&west<s,y,east,west};
   });
   await run('buildings block sprint and permit sliding',()=>{
     const q=window.__WORLD_QA,p=q.getGame().player,buildings=q.getCity();
     const b=buildings.find(b=>{
       let x=b.x-p.r-4,y=b.y+b.h/2;
       return q.isTerrainClear(q.wrapCoord(x),q.wrapCoord(y),p.r+1)&&b.w>80&&b.h>80;
     });
     if(!b)return {ok:false,reason:'No accessible building approach'};
     p.x=q.wrapCoord(b.x-p.r-4);p.y=q.wrapCoord(b.y+b.h/2);
     q.moveWithCollision(p,b.w+50,0);
     const stopped=q.isTerrainClear(p.x,p.y,p.r);
     const x=p.x,y=p.y;
     const didn'tCross=q.wrappedDelta(b.x,x)<=0;
     q.moveWithCollision(p,20,65);
     const slide=q.dist(x,y,p.x,p.y)>4&&q.isTerrainClear(p.x,p.y,p.r);
     return {ok:stopped&&didn'tCross&&slide,building:{x:b.x,y:b.y,w:b.w,h:b.h},stoppedX:x,slide};
   });
   await run('player enemies companions separate including across seam',()=>{
     const q=window.__WORLD_QA,g=q.getGame(),p=g.player,s=q.getSize();
     let y=0;for(let t=160;t<s;t+=50){if([0,12,s-12,s-35,35].every(x=>q.isTerrainClear(q.wrapCoord(x),t,50))){y=t;break;}}
     if(!y)return {ok:false,reason:'No seam separation lane'};
     p.x=12;p.y=y;
     const e={x:s-7,y,r:18,variant:'shambler',hp:3,max:3,damage:1,speed:80,phase:0,weight:1,hurt:0,mutation:null};
     const pet={x:14,y:y+2,r:13,type:'shooter',rank:1,shotTimer:50,flash:0,specialAbilityReady:true,specialCooldown:0,specialDuration:0};
     g.enemies=[e];g.companionSquad=[pet];
     for(let i=0;i<5;i++)q.resolveActorCollisions();
     const pairs=[[p,e],[p,pet],[e,pet]].map(([a,b])=>({gap:+(q.dist(a.x,a.y,b.x,b.y)-a.r-b.r).toFixed(2)}));
     const terrain=[p,e,pet].every(a=>q.isTerrainClear(a.x,a.y,a.r));
     return {ok:pairs.every(v=>v.gap>=-1.5)&&terrain,pairs,terrain};
   });
   await run('enemy and follower chase across seam',()=>{
     const q=window.__WORLD_QA,g=q.getGame(),p=g.player,s=q.getSize();
     let y=0;for(let t=180;t<s;t+=70){if([40,85,s-80,s-150].every(x=>q.isTerrainClear(q.wrapCoord(x),t,45))){y=t;break;}}
     if(!y)return {ok:false,reason:'No open chase lane'};
     p.x=40;p.y=y;p.inv=99;
     const e={x:s-80,y,r:18,variant:'shambler',hp:500,max:500,damage:1,speed:95,phase:0,weight:1,hurt:0,mutation:null};
     const pet={x:s-80,y:y+45,r:13,type:'shooter',rank:1,shotTimer:50,flash:0,specialAbilityReady:true,specialCooldown:0,specialDuration:0};
     g.enemies=[e];g.companionSquad=[pet];g.spawn=999;g.director.recovery=50;
     const beforeE=q.dist(e.x,e.y,p.x,p.y),beforeP=q.dist(pet.x,pet.y,p.x,p.y);
     for(let i=0;i<7;i++)q.tick(.04);
     const afterE=q.dist(e.x,e.y,p.x,p.y),afterP=q.dist(pet.x,pet.y,p.x,p.y);
     return {ok:afterE<beforeE-2&&afterP<beforeP-2,beforeE,afterE,beforeP,afterP};
   });
   await run('solid terrain also blocks fast projectiles',()=>{
     const q=window.__WORLD_QA,g=q.getGame(),b=q.getCity().find(b=>b.w>95&&b.h>90);
     if(!b)return {ok:false,reason:'No building'};
     g.enemies=[];g.companionSquad=[];g.spawn=999;g.player.inv=99;
     g.player.x=q.wrapCoord(b.x-180);g.player.y=q.wrapCoord(b.y+b.h/2);
     g.shots=[{x:q.wrapCoord(b.x-45),y:q.wrapCoord(b.y+b.h/2),vx:740,vy:0,life:1.5,r:4,
       damage:1,bounces:0,hit:[],kind:'normal',trail:[],flash:0,critical:false}];
     for(let i=0;i<4;i++)q.tick(.04);
     const remains=g.shots.length;
     return {ok:remains===0,remains};
   });
   await run('buried powerups/fish are relocated to reachable space',()=>{
     const q=window.__WORLD_QA,g=q.getGame(),b=q.getCity()[0];
     g.powerups=[];g.fishItems=[];
     q.dropPower(b.x+b.w/2,b.y+b.h/2,'rage');
     q.addFish(b.x+b.w/2,b.y+b.h/2);
     const a=g.powerups[0],f=g.fishItems[0];
     return {ok:!!a&&!!f&&q.isTerrainClear(a.x,a.y,20)&&q.isTerrainClear(f.x,f.y,12),
       power:[a?.x,a?.y],fish:[f?.x,f?.y]};
   });
   assert(errs.length===0,'Browser errors: '+errs.join(' | '));
   report.passed=true;
 }catch(e){report.error=String(e?.stack||e);}finally{
    fs.writeFileSync(path.join(output,'physics-qa.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    await ctx.close();await b.close();
 }
 if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});

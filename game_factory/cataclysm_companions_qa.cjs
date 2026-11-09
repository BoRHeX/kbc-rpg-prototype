// Trusted Cataclysm 0.9 eight-companion / four-active roster browser gate.
// Creator's rule: recruit 4 unique cats from 8 upgrade offers; unchosen roles disappear. No swapping.
// Uses test-only injected access to the actual running game's internal functions.
// No source changes, no gameplay fake flags; test-only initial setup is explicit.
'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const source=fs.readFileSync('docs/preview/game.js','utf8');
for(const marker of ['const MAX_COMPANIONS = 4','const roleNames =','function summonCompanion(','function companionSpecialAbilityActivate(']){
 if(!source.includes(marker))throw Error('Companion implementation contract missing: '+marker);
}
const endMarker='  window.CATACLYSM_BOOT.ready(BUILD);';
if(source.split(endMarker).length!==2)throw Error('No safe test injection point');
const bridge=`  window.__COMPANION_QA = Object.freeze({
    getGame:()=>game, getRoles:()=>roleNames.slice(), getLimit:()=>MAX_COMPANIONS,
    start,summonCompanion,companionSpecialAbilityActivate,updateCompanions,resolveActorCollisions,
    chooseUpgrade,offerUpgrade,upgradeAvailable,isTerrainClear,dist,updateHud
  });\n`;
const injected=source.replace(endMarker,bridge+endMarker);
const out=process.env.GRAPHICS_OUTPUT||'artifacts/cataclysm-companions';
fs.mkdirSync(out,{recursive:true});
const report={title:'Cataclysm 0.9 eight unique companions, four active at once',passed:false,tests:[],hardware:'not tested'};
const checks=async(page,name,fn)=>{
 const r=await page.evaluate(fn);
 if(!r?.ok)throw Error(name+': '+JSON.stringify(r));
 report.tests.push({name,...r});
};
(async()=>{
 const browser=await chromium.launch({channel:process.env.BORHEZ_BROWSER_CHANNEL||'chrome',headless:true});
 try{
   const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
   const page=await context.newPage(),errors=[];let injections=0;
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/game.js*',route=>{injections++;return route.fulfill({status:200,contentType:'text/javascript',body:injected});});
   try {
     await page.goto(process.env.NEW_URL||'http://127.0.0.1:8765/preview/',{waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>window.CATACLYSM_READY===true,null,{timeout:12000});
     await page.locator('#play').click();
     await page.waitForFunction(()=>window.__COMPANION_QA?.getGame()?.mode==='running',null,{timeout:8000});
     await checks(page,'exactly eight unique types and eight selectable upgrade choices',()=>{
       const q=window.__COMPANION_QA,d=window.CATACLYSM_DIAGNOSTICS.snapshot(),roles=q.getRoles();
       const old=['shooter','healer','tank'];
       const fields=roles.every(t=>!!document.querySelector('[data-upgrade="companion-'+t+'"]')&&!!document.getElementById('ability-'+t));
       return {ok:q.getLimit()===4&&roles.length===8&&new Set(roles).size===8&&old.every(t=>roles.includes(t))&&fields&&d.companions?.limit===4&&d.companions?.uniqueCount===8,
         roles,limit:q.getLimit(),fields,exposed:d.companions};
     });
     await checks(page,'four companions recruit; fifth never exceeds cap',()=>{
       const q=window.__COMPANION_QA,g=q.getGame(),roles=q.getRoles();
       g.enemies.length=0;g.spawn=1000;
       for(const r of roles.slice(0,4))q.summonCompanion(r);
       const first=g.companionSquad.map(p=>p.type);
       g.squadStats.count=9; // Strength upgrade may never spawn more followers.
       q.summonCompanion(roles[4]);
       const after=g.companionSquad.map(p=>p.type);
       return {ok:first.length===4&&new Set(first).size===4&&after.length===4&&first.every(t=>after.includes(t)),first,after,strengthUpgrade:g.squadStats.count};
     });
     await checks(page,'at four active, other four roles vanish from roguelite offers',()=>{
       const q=window.__COMPANION_QA,g=q.getGame(),roles=q.getRoles();
       const active=roles.slice(0,4),unowned=roles.slice(4);
       const eligibleActive=active.every(r=>q.upgradeAvailable('companion-'+r));
       const barred=unowned.every(r=>!q.upgradeAvailable('companion-'+r));
       let excludedFromOffers=true,commonGuaranteed=true,count=0;
       for(let i=0;i<45;i++){
         g.mode='running';g.pendingUpgrade=false;
         q.offerUpgrade();count++;
         if(g.offered.some(id=>unowned.some(r=>id==='companion-'+r)))excludedFromOffers=false;
         if(g.offered.length!==3||!['damage','fire-rate','speed','xp-gain'].includes(g.offered[0]))commonGuaranteed=false;
       }
       g.mode='running';g.pendingUpgrade=false;
       document.getElementById('upgrade-overlay').hidden=true;
       return {ok:barred&&eligibleActive&&excludedFromOffers&&commonGuaranteed&&g.companionSquad.length===4,
           active,unowned,barred,eligibleActive,excludedFromOffers,commonGuaranteed,count};
     });
     await checks(page,'active companion upgrade trains existing rank, no fifth recruit or swap',()=>{
       const q=window.__COMPANION_QA,g=q.getGame(),roles=q.getRoles(),r=roles[0],unowned=roles[4];
       const oldRank=g.companionSquad.find(c=>c.type===r).rank,oldCount=g.companionSquad.length;
       const before=g.upgrades.length;
       g.mode='upgrade';g.pendingUpgrade=true;g.offered=['companion-'+r,'damage','speed'];
       document.getElementById('upgrade-overlay').hidden=false;
       q.chooseUpgrade('companion-'+r);
       const upgraded=g.companionSquad.find(c=>c.type===r);
       const trained=upgraded.rank===oldRank+1&&g.upgrades.length===before+1&&g.mode==='running';
       q.summonCompanion(unowned);
       const stillBarred=!g.companionSquad.some(c=>c.type===unowned)&&g.companionSquad.length===4;
       const noSwapUi=!document.getElementById('companion-swap-overlay');
       return {ok:trained&&stillBarred&&oldCount===4&&noSwapUi,oldRank,newRank:upgraded.rank,
         active:g.companionSquad.map(c=>c.type),stillBarred,noSwapUi};
     });
     await checks(page,'all eight roles spawn, activate special, and begin cooldown',()=>{
       const q=window.__COMPANION_QA,roles=q.getRoles(),entries=[];
       for(const role of roles){
         q.start();const g=q.getGame();g.enemies.length=0;g.spawn=999;
         q.summonCompanion(role);
         // Give targeted specials a real hostile target; non-targeted ones remain usable.
         g.enemies.push({x:g.player.x+110,y:g.player.y+34,r:17,variant:'shambler',
           hp:999,max:999,damage:1,speed:0,phase:0,weight:1,hurt:0,mutation:null});
         const ally=g.companionSquad.find(p=>p.type===role);
         if(!ally){entries.push({role,error:'not recruited'});continue;}
         q.companionSpecialAbilityActivate(role);
         entries.push({role,cooldown:ally.specialCooldown,active:g.companionSquad.length,rank:ally.rank});
       }
       return {ok:entries.length===8&&entries.every(e=>e.cooldown>0&&e.active===1&&e.rank>=1),entries};
     });
     await checks(page,'all four active ability controls are on-screen in small landscape',()=>{
       const q=window.__COMPANION_QA,g=q.getGame();q.start();
       const roles=q.getRoles();for(const r of roles.slice(0,4))q.summonCompanion(r);
       q.updateHud();
       return {ok:g.companionSquad.length===4,roles:roles.slice(0,4)};
     });
     await page.setViewportSize({width:640,height:320});
     await page.waitForTimeout(180);
     await checks(page,'four unique companion ability buttons fit landscape 640x320',()=>{
       const q=window.__COMPANION_QA, g=q.getGame();
       const buttons=g.companionSquad.map(c=>document.getElementById('ability-'+c.type)).filter(Boolean);
       const boxes=buttons.map(b=>{const r=b.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,hidden:b.hidden};});
       const fit=boxes.every(b=>!b.hidden&&b.x>=-1&&b.y>=-1&&b.x+b.w<=innerWidth+1&&b.y+b.h<=innerHeight+1&&b.w>=38&&b.h>=34);
       const overlap=boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.x<b.x+b.w-5&&a.x+a.w>b.x+5&&a.y<b.y+b.h-5&&a.y+a.h>b.y+5));
       return {ok:buttons.length===4&&fit&&!overlap,boxes,viewport:[innerWidth,innerHeight],fit,overlap};
     });
     await checks(page,'physical companions remain solid and simulation keeps the cap',()=>{
       const q=window.__COMPANION_QA,g=q.getGame(),p=g.player;
       g.enemies.length=0;g.spawn=999;
       for(const pet of g.companionSquad){pet.x=p.x+12;pet.y=p.y+4;}
       for(let k=0;k<9;k++)q.resolveActorCollisions();
       const terrain=g.companionSquad.every(c=>q.isTerrainClear(c.x,c.y,c.r));
       const pairs=g.companionSquad.flatMap((a,i)=>g.companionSquad.slice(i+1).map(b=>+(q.dist(a.x,a.y,b.x,b.y)-a.r-b.r).toFixed(2)));
       const hero=g.companionSquad.map(c=>+(q.dist(c.x,c.y,p.x,p.y)-c.r-p.r).toFixed(2));
       return {ok:g.companionSquad.length===4&&terrain&&pairs.every(gap=>gap>=-1.5)&&hero.every(gap=>gap>=-1.5),terrain,pairs,hero};
     });
     await checks(page,'pause freezes all special cooldowns',()=>{
       const q=window.__COMPANION_QA,g=q.getGame();
       g.mode='paused';
       const before=g.companionSquad.map(c=>c.specialCooldown);
       window.__COMPANION_QA_FREEZE=before;
       return {ok:g.companionSquad.length===4, before};
     });
     await page.waitForTimeout(320);
     await checks(page,'no cooldown changes in paused gameplay',()=>{
       const q=window.__COMPANION_QA,after=q.getGame().companionSquad.map(c=>c.specialCooldown);
       const before=window.__COMPANION_QA_FREEZE;
       return {ok:after.length===before.length&&after.every((x,i)=>Math.abs(x-before[i])<.0001),before,after};
     });
     if(errors.length)throw Error('Browser errors: '+errors.join('|'));
     if(injections!==1)throw Error('Test-only source not injected exactly once: '+injections);
     report.passed=true;
   }finally{await context.close();}
 }catch(e){report.error=String(e?.stack||e);}
 finally{fs.writeFileSync(path.join(out,'companions-qa.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();}
 if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});

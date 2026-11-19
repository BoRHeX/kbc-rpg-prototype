'use strict';
// Executes the complete shipped scripts against a small DOM/canvas test double.
// This verifies game integration, not browser pixels or hardware performance.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const nodes=[],ids=new Map(),events={},storage=new Map();let clock=1000,draws=0,raf,storageFull=false;const chapterDraws=new Set(),advancementDraws=new Set();
const context=new Proxy({measureText:t=>({width:String(t).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage:(...args)=>{draws++;if(args[0]?.src?.includes('art/advancement/'))advancementDraws.add(args[0].src);if(args[0]?.src?.includes("long-night-"))chapterDraws.add(args[0].src);}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={setProperty(){}};this.hidden=false;this.disabled=false;this.className='';this.attrs={};this.listeners={};this.offsetWidth=160;this.offsetHeight=44;this.width=844;this.height=390;this.textContent='';this.classList={toggle(){},remove(){},add(){}};nodes.push(this);}
 append(...kids){for(const k of kids){k.parentElement=this;this.children.push(k);}} appendChild(k){this.append(k);return k;} replaceChildren(...kids){this.children=[];this.append(...kids);}
 setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k];} removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,f){this.listeners[k]=f;} removeEventListener(){} focus(){document.activeElement=this;} remove(){} closest(){return null;} getContext(){return context;} getBoundingClientRect(){return {left:0,top:0,width:844,height:390,right:844,bottom:390};} getClientRects(){return [this.getBoundingClientRect()];} querySelectorAll(q){return document.querySelectorAll(q);} querySelector(){return null;}
}
const document={hidden:false,activeElement:null,createElement:t=>new Element(t),getElementById:id=>ids.get(id)||null,querySelectorAll(q){if(q==='[data-upgrade]')return nodes.filter(n=>n.dataset.upgrade);if(q.includes('.upgrade'))return nodes.filter(n=>n.dataset.upgrade&&!n.hidden);return [];},addEventListener(k,f){events[k]=f;},currentScript:{src:''},documentElement:new Element(),body:new Element()};
for(const match of html.matchAll(/<([\w-]+)\b([^>]*)>/g)){const attrs=match[2],id=attrs.match(/\bid="([^"]+)"/),upgrade=attrs.match(/data-upgrade="([^"]+)"/);if(!id&&!upgrade)continue;const n=new Element(match[1]);if(id)ids.set(id[1],n);if(upgrade)n.dataset.upgrade=upgrade[1];n.hidden=/\bhidden\b/.test(attrs);n.disabled=/\bdisabled\b/.test(attrs);n.parentElement=new Element();}
ids.get('festival-status').firstElementChild=new Element('span');
ids.get('boss-status').querySelector=q=>q==='span'?ids.get('boss-status').firstElementChild:null;
ids.get('boss-status').firstElementChild=new Element('span');
class Image{
 constructor(){this.complete=false;}
 set src(url){this._src=String(url);const file=path.join(base,new URL(url,'http://cata.local/').pathname.replace('/cataclysm-1-69/',''));assert(fs.existsSync(file),'Missing image '+file);const b=fs.readFileSync(file);this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.complete=true;queueMicrotask(()=>this.onload?.());}
 get src(){return this._src;} decode(){return Promise.resolve();}
}
const sandbox={navigator:{userAgent:"QA",maxTouchPoints:1},console,URL,URLSearchParams,TextEncoder,Image,confirm:()=>true,document,performance:{now:()=>clock},crypto:require('crypto').webcrypto,location:{search:'?seed=26',href:'http://cata.local/cataclysm-1-69/'},innerWidth:844,innerHeight:390,devicePixelRatio:1,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(storageFull)throw Error('Simulated quota');storage.set(k,String(v));}},matchMedia:()=>({matches:false}),addEventListener(k,f){events[k]=f;},requestAnimationFrame:f=>{raf=f;},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},fetch:async url=>({ok:true,arrayBuffer:async()=>{const bytes=fs.readFileSync(path.join(base,url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);},json:async()=>JSON.parse(fs.readFileSync(path.join(base,new URL(url,'http://cata.local/cataclysm-1-69/').pathname.replace('/cataclysm-1-69/','')),'utf8'))})};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.CATACLYSM_BOOT={ready:v=>assert.equal(v,'1.8'),fail:m=>{throw Error(m);}};
vm.createContext(sandbox);
(async()=>{
 for(const m of html.matchAll(/<script src="\.\/([^?"]+)/g)){const file=m[1];document.currentScript.src='http://cata.local/cataclysm-1-69/'+file;let source=fs.readFileSync(path.join(base,file),'utf8');if(file==='game.js')source=source.replace('  window.spawnRelic=spawnRelic;', '  window.__test={get game(){return game;},updateSupport,updateGas,updateCrew,tickAdvancement,fusionMenu,pause,prepareShot,updateEnemyProjectiles,summonCompanion,updateCompanions,updateForaging,addFish,updateMecha,updateCompanyRole,updateForaging,squadHit,cityRoute,cityTick,cityDefeat,citySolids,isTerrainClear,createCity,updateDirector,beginFusion,cityMap,fishingDraw,fishingInit,fishingTick,fishingOdds,fishingResolve,fishingAward,fishingHazard,safeSpawn,moveWithCollision,updateMajorEnemyAttack,mutationAPI,wildcardAPI,defeatEnemy,spawnEnemy,updateEvolution,renderWorld,renderChapterBanner,openLongNight,advanceLongNight,chapterEncounterTick,tick,reviveTick,start,offerUpgrade,resumeCheckpoint,saveCheckpoint,markDirty:()=>{dirty=true;},loseLife,capture:()=>CHECKPOINT.capture(game,seeded),reset:()=>{game=null;readCheckpoint();}};window.spawnRelic=spawnRelic;');vm.runInContext(source,sandbox,{filename:file});}
 await new Promise(resolve=>setImmediate(resolve));
 const a=sandbox.__test,LN=sandbox.CATA_LONG_NIGHT;
 const step=()=>{clock+=1000/60;raf(clock);};
 step();
 assert(draws>0,'Title renders before starting');
 storage.set('cataclysm-major-win','{"night":100}');
 storage.set('cataclysm-14-discovery-26','[true,false,true,false]');
 storage.set('cataclysm-14-life-26','earned');
 a.start();
 assert.equal(a.game.unseen.rewardUsed,true);
 assert.deepEqual([...a.game.unseen.discovered],[true,false,true,false]);
 const save=()=>JSON.parse(JSON.stringify(a.capture()));
 const reload=()=>{a.reset();a.resumeCheckpoint();};
 assert.equal(JSON.parse(storage.get(LN.slots[0])).run.night,1);
 const startingRun=a.game;
 a.start('endless');
 assert.equal(a.game,startingRun,'A legacy Night 100 win cannot enter Endless');
 assert(ids.get('endless-run').hidden);
 a.game.player.inv=120;a.game.player.autoFireDisabled=true;
 for(let i=0;i<629;i++)a.tick(LN.DT);
 assert.equal(a.game.longNight.night,1);
 a.tick(LN.DT);
 assert.equal(a.game.longNight.night,2);

 // Pause and reload with a committed cast, an active gate link, a Mecha and an upgrade.
 a.start();
 let g=a.game;
 a.summonCompanion('engineer');a.summonCompanion('shooter');
 for(const cat of g.companionSquad)sandbox.CATA_COMPANY.earn(cat,75);
 const mecha=sandbox.CATA_COMPANY.fuse(g);mecha.mechaClock=1;
 const spot=g.fishing.spots[0];spot.used=1;g.fishing.ordinal=1;
 Object.assign(g.player,{x:spot.x,y:spot.y});
 g.fishing.active={spot,x:spot.x,y:spot.y,hp:g.player.hp,age:3.99,committed:true,id:1,bait:'worm',outcome:2,until:4,bite:true};
 const enemy=a.spawnEnemy('shambler',{labPurchase:true});
 enemy.cityGate=g.unseen.gates[0];
 const dead=a.spawnEnemy('shambler',{labPurchase:true});
 dead.hp=0;a.defeatEnemy(dead);
 enemy.mTarget=g.mutationEcology.corpses[0];
 a.offerUpgrade();
 const offers=[...g.offered];
 document.hidden=true;events.visibilitychange();clock+=7200000;raf(clock);document.hidden=false;
 reload();g=a.game;
 assert.equal(g.mode,'upgrade');
 assert.deepEqual([...g.offered],offers);
 assert.equal(g.companionSquad[0].mechaClock,1);
 assert.equal(g.companionSquad[0].components.length,2);
 assert.equal(g.fishing.active.spot,g.fishing.spots[0]);
 assert.equal(g.enemies[0].cityGate,g.unseen.gates[0]);
 assert(g.mutationEcology.corpses.length);
 assert.equal(g.enemies[0].mTarget,g.mutationEcology.corpses[0]);
 const fish=g.companyFish.spawned,tokens=g.rerollTokens;
 a.fishingTick(LN.DT,{x:0,y:0});
 assert.equal(g.companyFish.spawned,fish+2);
 assert.equal(g.rerollTokens,tokens+1);
 a.fishingTick(LN.DT,{x:0,y:0});
 assert.equal(g.companyFish.spawned,fish+2);

 a.start();
 g=a.game;g.player.hp=0;a.loseLife();
 for(let i=0;i<27;i++)a.reviveTick(LN.DT);
 document.hidden=true;events.visibilitychange();document.hidden=false;reload();
 assert.equal(a.game.mode,'reviving');assert.equal(a.game.lives,8);
 for(let i=0;i<27;i++)a.reviveTick(LN.DT);
 assert.equal(a.game.mode,'running');

 // A browser can background just after a leader disappears but before the next
 // member tick. Restore enough of the removed leader to replay the scatter.
 a.start();
 g=a.game;
 a.tick(LN.DT);
 const leader=a.spawnEnemy('shambler',{labPurchase:true});
 const follower=a.spawnEnemy('shambler',{labPurchase:true});
 follower.pack=leader;
 leader.hp=0;a.defeatEnemy(leader);
 assert(!g.enemies.includes(leader));
 events.pagehide();
 const restoredPack=()=>JSON.parse(JSON.stringify(sandbox.CATA_MUTATIONS.pack(a.game,a.game.enemies[0])));
 const scatter=restoredPack();
 assert(scatter);
 reload();
 assert.deepEqual(restoredPack(),scatter,'Detached pack leader preserves scatter on restore');

 // Compare a production continuation before and after hydrating an active save.
 a.start();
 g=a.game;g.player.inv=30;g.player.autoFireDisabled=true;
 g.fishing.spots[0].cooldown=100;
 const tick=()=>a.tick(LN.DT);
 for(let i=0;i<482;i++)tick();
 assert.equal(g.wildcard.phase,'listening');
 const [first,second]=g.wildcard.posts;
 Object.assign(g.player,first);
 for(let i=0;i<46;i++)tick();
 assert.equal(g.wildcard.stamps,1);
 Object.assign(g.player,second);
 for(let i=0;i<30;i++)tick();
 const t=g.t;
 document.hidden=true;events.visibilitychange();clock+=7200000;raf(clock);document.hidden=false;
 assert.equal(g.t,t);
 reload();assert.equal(a.game.wildcard.stamps,1);
 const snapshot=save();
 for(let i=0;i<120;i++)tick();
 assert.equal(a.game.wildcard.result,'success');
 const expected=save();
 reload();
 assert.deepEqual(save(),snapshot);
 for(let i=0;i<120;i++)tick();
 assert.deepEqual(save(),expected,'restored production ticks replay the same gameplay');
 assert.equal(sandbox.CATA_COMPANY.diagnostics(a.game).fish.balance,0);

 // Accelerate the production boundary reducer, while spawning and defeating real story actors.
 // Early fixed-step evidence above covers the normal night clock.
 a.start();
 const openings=new Set();
 for(let n=1;n<=1000;n++){
   g=a.game;const r=g.longNight;
   assert.equal(r.night,n);
   assert.equal(r.chapter,LN.chapter(n));
   assert(ids.get('endless-run').hidden);
   if(LN.local(n)===1){
     a.renderChapterBanner();
     assert.equal(ids.get('chapter-title').textContent,LN.chapters[r.chapter-1][0]);
     assert(!ids.get('chapter-banner').hidden);
   }
   r.clocks.nightTick=LN.STEPS;
   if(n%100===0){
     a.advanceLongNight();assert.equal(r.night,n,'milestone holds until encounter is defeated');
     if(n===1000){
       a.renderWorld();
       a.renderChapterBanner();
       for(let i=0;i<2;i++){
         Object.assign(g.player,r.encounters[i].state.point);
         for(let j=0;j<60;j++)a.chapterEncounterTick();
       }
       assert.equal(r.finale.lights,2);
       a.renderChapterBanner();
       a.advanceLongNight();assert.equal(r.night,1000);
       for(let i=0;i<3;i++){
         const escort=g.enemies.find(e=>e.storyId==='c10:escort:'+(i+1));
         assert(escort);escort.hp=0;a.defeatEnemy(escort);a.chapterEncounterTick();
       }
       a.renderChapterBanner();
     }else a.chapterEncounterTick();
     const boss=g.enemies.find(e=>e.storyId&&(e.storyId.endsWith(':boss')||e.storyId==='c10:finalBoss'));
     assert(boss);
     openings.add(boss.attackKind);
     const bossId=boss.id;
     boss.hp*=.75;
     if(n===100) {
       Object.assign(g.player,{hp:2,damage:2.5});
       g.equipment.lens=2;
       g.unseen.kills[0]=12;
       a.cityTick();
       assert(g.enemies.some(e=>e.cityGuardian===0));
     }
     const beforeBossReload=save();
     events.pagehide();
     reload();
     g=a.game;
     assert.deepEqual(save(),beforeBossReload,'Active milestone checkpoint at night '+n);
     const restoredBoss=g.enemies.find(e=>e.id===bossId);
     assert(restoredBoss&&restoredBoss.hp===boss.hp);
     restoredBoss.hp=0;a.defeatEnemy(restoredBoss);
     if(n===1000){
       g.player.hp=0;g.grace=0;g.lives=2;
       a.advanceLongNight();assert(ids.get('endless-run').hidden);
       a.loseLife();a.advanceLongNight();assert.equal(g.mode,'reviving');
       assert(ids.get('endless-run').hidden);
       for(let j=0;j<54;j++)a.reviveTick(LN.DT);
       assert.equal(g.lives,1);
     }
   }
   if(n===1000)storageFull=true;
   a.advanceLongNight();
 }
 assert.equal(openings.size,9,'Ten bosses use nine opening attack patterns');
 assert(!ids.get('endless-run').hidden,'A fully completed campaign unlocks Endless in memory when quota denies the win write');
 assert.match(ids.get('checkpoint-status').textContent,/Unsaved/);
 assert(!LN.slots.some(key=>JSON.parse(storage.get(key)).profile.completion));
 storageFull=false;
 events.pagehide();
 const media=sandbox.CATA_CHAPTER_MEDIA;
 for(const frame of Object.values(media.manifest.frames))assert(chapterDraws.has('./'+frame.path),frame.path);
 a.renderChapterBanner();
 assert(ids.get('chapter-banner').hidden);
 assert.equal(a.game.mode,'won');
 assert(!ids.get('endless-run').hidden);
 assert.equal(a.game.scoreLedger.milestonePoints,10000);
 a.reset();
 assert(!ids.get('endless-run').hidden);
 a.start('endless');
 assert.equal(a.game.longNight.mode,'endless');
 assert.equal(a.game.longNight.night,1);
 assert.equal(a.game.lives,9);

 console.log('PASS active chapter boss checkpoint and restore at all ten milestones, including city guardian, equipment, and final boss');
 console.log('PASS detached pack leader restore, direct Endless denial with legacy win');

 const validate=sandbox.CATA_CHECKPOINT.validate;
 const slotData=new Map(storage);
 const journal=LN.journal({getItem:k=>slotData.get(k)??null,setItem(){throw Error('Simulated quota');}},validate);
 const before=journal.read();
 assert(before.best);
 slotData.set(LN.slots[before.index],'{"damaged":true}');
 const fallback=journal.read();
 assert(fallback.damaged&&fallback.best.revision<before.best.revision);
 assert.throws(()=>journal.write(fallback.best.profile,fallback.best.run,fallback.best.revision),/quota/);
 assert.equal(journal.read().best.revision,fallback.best.revision);
 slotData.set(LN.slots[before.index],'{"schemaVersion":3}');
 assert.throws(()=>journal.write(fallback.best.profile,fallback.best.run,fallback.best.revision),/newer/);
 // Import a checksum-valid schema-1 record with active Mecha and an exact fish balance.
 const ADV=sandbox.CATA_ADVANCEMENT,COMPANY=sandbox.CATA_COMPANY;
 a.start();g=a.game;g.fish=31;
 for(const role of ['engineer','shooter']){a.summonCompanion(role);COMPANY.earn(g.companionSquad.at(-1),75);}
 COMPANY.fuse(g);
 const legacyRun=save();delete legacyRun.systems.advancement;
 const legacy={schemaVersion:1,gameVersion:'1.7',revision:12,profile:LN.profile(),run:legacyRun};
 const original=JSON.stringify({...legacy,digest:LN.digest(legacy)});
 for(const key of LN.slots)storage.delete(key);
 storage.set('cataclysm-17-save-a',original);
 reload();g=a.game;
 assert.equal(g.fish,31);
 assert.equal(g.companionSquad[0].type,'mecha');
 assert.equal(g.advancement.weather,'clear');
 assert.equal(storage.get('cataclysm-17-save-a'),original);
 assert.equal(JSON.parse(storage.get(LN.slots[0])).schemaVersion,2);

 // Exercise actual paused controls, the four-slot limit and per-parent work.
 g.companionSquad=[];
 for(const role of ['angler','trapper','scout','sniper'])a.summonCompanion(role);
 for(const cat of g.companionSquad.slice(0,3))COMPANY.earn(cat,75);
 assert(!ADV.merge(g,'spotter'));
 COMPANY.earn(g.companionSquad[3],75);
 a.pause();
 ids.get('fusion-options').children[0].onclick();
 assert.equal(g.companionSquad.length,3);
 assert(!a.summonCompanion('angler'));
 ids.get('fusion-options').children[1].onclick();
 assert.equal(g.companionSquad.length,2);
 a.pause();
 const trawl=g.companionSquad[0],spotter=g.companionSquad[1];
 const [x,y]=[g.player.x,g.player.y];
 for(const c of g.companionSquad){c.x=x;c.y=y;c.abilityAt=g.t;}
 const enemies=[a.spawnEnemy('shambler',{labPurchase:true}),a.spawnEnemy('shambler',{labPurchase:true})];
 enemies.forEach((e,i)=>Object.assign(e,{x:x+95+i*24,y:y+8}));
 a.renderWorld();
 a.updateCrew(trawl,LN.DT,1,()=>true,false);
 assert(enemies.every(e=>e.squadStun>=1.4));
 assert.equal(trawl.abilityAt,g.t+9);
 a.renderWorld();
 spotter.y=y+100;
 a.updateCrew(spotter,LN.DT,1,()=>true,false);
 assert(spotter.windup);
 g.t+=.46;
 spotter.y=y+100;
 a.updateCrew(spotter,LN.DT,1,()=>true,false);
 const shot=g.shots.find(shot=>shot.speaker==='spotter');
 assert(shot&&shot.pierce>=2);
 assert(enemies.every(e=>!e.spotterMark),'Firing alone cannot mark an enemy');
 // Place a durable enemy in the real projectile's next step.
 const marked=enemies[0];
 spotter.y=y+180;
 Object.assign(marked,{x:shot.x+shot.vx*LN.DT,y:shot.y+shot.vy*LN.DT,hp:100,max:100});
 a.renderWorld();
 a.tick(LN.DT);
 assert(marked.spotterMark>g.t,'A surviving projectile hit applies the mark');
 assert.equal(ADV.mark(g,marked,10,'spotter'),10);
 assert.equal(ADV.mark(g,marked,10,'hero'),12);
 assert.equal(ADV.mark(g,marked,10,'hero'),10);
 a.renderWorld();
 for(const key of ['trawl-ready','trawl-cast','spotter-ready','spotter-fire'])
   assert([...advancementDraws].some(src=>src.endsWith(key+'.png')),key);
 assert.equal(trawl.components[0].work,76);
 // Real foraging spends one pickup and feeds only the lower-energy parent.
 const fishBefore=g.fish, xpBefore=g.xp;
 const [angler,trapper]=trawl.components;
 const foodBefore=angler.food, otherFood=trapper.food;
 angler.energy=10;trapper.energy=80;
 g.enemies=[];g.fishItems=[];trawl.forageCooldown=0;
 a.addFish(trawl.x,trawl.y,2);
 assert(a.updateForaging(trawl,LN.DT));
 a.updateForaging(trawl,1);
 assert.equal(g.fishItems.length,0);
 assert.equal(angler.food,foodBefore+2);
 assert.equal(trapper.food,otherFood);
 assert.equal(g.xp,xpBefore);
 assert.equal(g.fish,fishBefore);
 const anglerWork=angler.work;
 for(const kind of ['cache','rescue']){
   g.advancement.mission={kind,id:'1:'+kind,chapter:1,x,y,hold:0,status:'offered'};
   for(let i=0;i<(kind==='cache'?120:180);i++)a.tickAdvancement(LN.DT);
   const m=g.advancement.mission;
   assert.equal(m.status,'done');
   assert(!ADV.missionTick(g,1,0));
 }
 assert.equal(g.fish,fishBefore);
 assert(g.advancement.rushUntil>g.t&&g.advancement.wardUntil>g.t);
 g.advancement.strike={x,y,district:0,until:g.t+.75};
 a.markDirty();a.saveCheckpoint();reload();g=a.game;
 assert.equal(g.advancement.mission.status,'done');
 assert(g.advancement.strike&&g.advancement.wardUntil>g.t);
 assert.equal(g.companionSquad[0].components[0].work,anglerWork);
 assert.equal(g.companionSquad[0].components[0].food,foodBefore+2);
 const crewsBeforeRevive=g.companionSquad;
 g.grace=0;g.player.hp=0;a.loseLife();
 for(let i=0;i<54;i++)a.reviveTick(LN.DT);
 assert.equal(g.mode,'running');
 assert.equal(g.lives,8);
 assert.equal(g.companionSquad,crewsBeforeRevive);
 assert.equal(g.fish,fishBefore);
 assert(ADV.split(g,'trawl',{x:x+58,y}));
 a.summonCompanion('tank');
 assert(!ADV.split(g,'spotter',{x:x-58,y}));
 assert(!ADV.merge(g,'trawl'));
 assert(ADV.ward(g)&&!ADV.ward(g));
 const sample={longNight:{...g.longNight}};
 const fogNight=Array.from({length:90},(_,i)=>i+4).find(n=>{
   sample.longNight.night=n;return ADV.weather(sample,0)==='fog';
 });
 assert(fogNight);
 const target={x:200,y:200},caster={role:'caster',variant:'caster',x:100,y:100,attackCooldown:0};
 g.longNight.night=fogNight;
 a.updateMajorEnemyAttack(caster,LN.DT,target,390);
 assert(!caster.windup,'Fog suppresses a fresh ordinary ranged windup at 390');
 g.longNight.night=1;
 a.updateMajorEnemyAttack(caster,LN.DT,target,390);
 assert(caster.windup,'Matched clear-weather enemy starts the windup');
 assert.equal(ADV.rainPace('rain',true),.85);
 assert.equal(ADV.range('fog',850,true),360);
 const cat=g.companionSquad.find(c=>c.type==='angler');
 cat.moodCheck=0;assert.equal(ADV.mood(cat,g,20,false,false),'worried');
 g.t+=2;assert.equal(ADV.mood(cat,g,40,false,true),null);
 g.t+=2;assert.equal(ADV.mood(cat,g,40,false,true),'determined');
 // Generate a mission using the production offer path, then leave and return.
 a.start();g=a.game;
 assert.equal(g.companionSquad.length,0);
 assert.equal(g.fish,0);
 assert.equal(g.lives,9);
 g.longNight.clocks.simTick=60;
 a.tickAdvancement(LN.DT);
 const offered=g.advancement.mission;
 assert(offered&&offered.status==='offered');
 a.renderWorld();
 assert([...advancementDraws].some(src=>src.endsWith('/beacon.png')));
 const spawn={x:g.player.x,y:g.player.y};
 Object.assign(g.player,{x:offered.x,y:offered.y});
 a.tickAdvancement(1);
 a.renderWorld();
 assert([...advancementDraws].some(src=>src.endsWith('/'+offered.kind+'.png')));
 g.unseen.gates[0].active=true;
 a.tickAdvancement(LN.DT);
 assert.equal(offered.hold,0,'A gate interruption breaks the dwell');
 g.unseen.gates[0].active=false;
 a.tickAdvancement(1);
 Object.assign(g.player,spawn);
 a.tickAdvancement(LN.DT);
 assert.equal(offered.hold,0);
 Object.assign(g.player,{x:offered.x,y:offered.y});
 for(let i=0;i<180;i++)a.tickAdvancement(LN.DT);
 assert.equal(offered.status,'done');
 reload();g=a.game;
 assert.equal(g.advancement.mission.status,'done');
 const reward=[g.advancement.rushUntil,g.advancement.wardUntil];
 g.t+=20;
 a.tickAdvancement(3);
 assert.deepEqual([g.advancement.rushUntil,g.advancement.wardUntil],reward);
 console.log('PASS new crews consume one pickup, survive revival and clear on restart; seeded mission offer, painted beacon, dwell reset and no renewed reward after reload');
 // Exercise a real storm warning and resolve it against an ordinary cat and a major.
 const stormNight=Array.from({length:97},(_,i)=>i+4).find(n=>{
   g.longNight.night=n;return ADV.weather(g,0)==='storm';
 });
 assert(stormNight);
 g.longNight.night=stormNight;
 Object.assign(g.player,spawn);
 g.advancement.nextStrike=0;
 for(let attempt=0;attempt<20&&!g.advancement.strike;attempt++){
   a.tickAdvancement(LN.DT);
   if(!g.advancement.strike)g.t+=8;
 }
 const strike=g.advancement.strike;
 assert(strike&&strike.until>g.t);
 const ordinary=a.spawnEnemy('shambler',{labPurchase:true});
 const major=a.spawnEnemy('shambler',{labPurchase:true});
 for(const enemy of [ordinary,major])Object.assign(enemy,{x:strike.x,y:strike.y});
 major.creditCategory='boss';
 const playerHp=g.player.hp;
 a.tickAdvancement(LN.DT);
 assert(!(ordinary.squadStun>0));
 g.t=strike.until;
 a.tickAdvancement(LN.DT);
 assert(ordinary.squadStun>=.85);
 assert(!(major.squadStun>0));
 assert.equal(g.player.hp,playerHp);
 assert.equal(g.advancement.strike,null);
 console.log('PASS storm schedules a warning then stuns ordinary cats only');
 const advancementMedia=JSON.parse(fs.readFileSync(path.join(base,'STUDIO/ADVANCEMENT_MEDIA.json'),'utf8'));
 const originals=JSON.parse(fs.readFileSync(path.join(base,'STUDIO/IMAGE_MANIFEST.json'),'utf8')).images;
 assert.equal(originals.length,3);
 for(const entry of [...originals,...Object.values(advancementMedia.frames),...Object.values(advancementMedia.cues)]){
   const bytes=fs.readFileSync(path.join(base,entry.path));
   assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),entry.sha256);
   assert.equal(bytes.subarray(0,4).toString('hex'),entry.path.endsWith('.wav')?'52494646':'89504e47');
 }
 console.log('PASS Pass 05 PNG/WAV byte signatures and manifest hashes');
 console.log('PASS schema-1 Mecha import, paused fusion, slot checks, crew combat and raster calls, mood, weather, missions and reward restore');
 // Play the actual WAV bytes through a Web Audio test double. Stop pending playback
 // before decoding settles, then verify one loop and one stinger in a fresh sync.
 const started=[],gainParam={setValueAtTime(){},linearRampToValueAtTime(){}};
 const context={
   currentTime:0,
   decodeAudioData:async bytes=>{
     assert.equal(Buffer.from(bytes).subarray(0,4).toString(),'RIFF');
     return {bytes};
   },
   createGain:()=>({gain:gainParam,connect(){},disconnect(){}}),
   createBufferSource:()=>({
     connect(){},disconnect(){},start(){started.push(this);},
     stop(){assert(!this.stopped);this.stopped=true;this.onended();}
   })
 };
 const idle=()=>new Promise(resolve=>setImmediate(resolve));
 const arrival={name:'arrival'};
 media.sync(context,{},1,arrival);
 media.sync(context,{},0,null);
 await idle();
 assert.equal(started.length,0,'Paused decode cannot start a voice');
 media.sync(context,{},1,arrival);
 await idle();
 assert.deepEqual(started.map(source=>source.loop),[true,false]);
 media.sync(context,{},2,{name:'gauntlet'});
 await idle();
 assert.deepEqual(started.map(source=>source.loop),[true,false,true,false]);
 assert(started.slice(0,2).every(source=>source.stopped),'Old chapter voices retired');
 media.sync(context,{},0,null);
 assert(started.every(source=>source.stopped),'Inactive score stops both channels');
 console.log('PASS 17 chapter raster draw calls, chapter titles, terminal banner hide, WAV scheduling and stale decode cancellation (test doubles)');
 console.log('Largest surviving fixture slot: '+Math.max(...LN.slots.map(key=>storage.get(key)?.length||0))+' characters');
 console.log('PASS legacy metadata migration, festival dwell and 120-tick replay, title, 630-tick boundary, cast and Mecha restore, upgrade offers, revival, 1000-night segmented progression, finale, Endless, recovery, quota, future schema');
})().catch(error=>{console.error(error);process.exitCode=1;});

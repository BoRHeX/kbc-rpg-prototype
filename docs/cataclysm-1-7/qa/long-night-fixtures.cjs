'use strict';
// Executes the complete shipped scripts against a small DOM/canvas test double.
// This verifies game integration, not browser pixels or hardware performance.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const nodes=[],ids=new Map(),events={},storage=new Map();let clock=1000,draws=0,raf,storageFull=false;const chapterDraws=new Set();
const context=new Proxy({measureText:t=>({width:String(t).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage:(...args)=>{draws++;if(args[0]?.src?.includes("long-night-"))chapterDraws.add(args[0].src);}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
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
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.CATACLYSM_BOOT={ready:v=>assert.equal(v,'1.7'),fail:m=>{throw Error(m);}};
vm.createContext(sandbox);
(async()=>{
 for(const m of html.matchAll(/<script src="\.\/([^?"]+)/g)){const file=m[1];document.currentScript.src='http://cata.local/cataclysm-1-69/'+file;let source=fs.readFileSync(path.join(base,file),'utf8');if(file==='game.js')source=source.replace('  window.spawnRelic=spawnRelic;', '  window.__test={get game(){return game;},updateSupport,updateGas,prepareShot,updateEnemyProjectiles,summonCompanion,updateCompanions,addFish,updateMecha,updateCompanyRole,updateForaging,squadHit,cityRoute,cityTick,cityDefeat,citySolids,isTerrainClear,createCity,updateDirector,beginFusion,cityMap,fishingDraw,fishingInit,fishingTick,fishingOdds,fishingResolve,fishingAward,fishingHazard,safeSpawn,moveWithCollision,updateMajorEnemyAttack,mutationAPI,wildcardAPI,defeatEnemy,spawnEnemy,updateEvolution,renderWorld,renderChapterBanner,openLongNight,advanceLongNight,chapterEncounterTick,tick,reviveTick,start,offerUpgrade,resumeCheckpoint,saveCheckpoint,loseLife,capture:()=>CHECKPOINT.capture(game,seeded),reset:()=>{game=null;readCheckpoint();}};window.spawnRelic=spawnRelic;');vm.runInContext(source,sandbox,{filename:file});}
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
 slotData.set(LN.slots[before.index],'{"schemaVersion":2}');
 assert.throws(()=>journal.write(fallback.best.profile,fallback.best.run,fallback.best.revision),/newer/);
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

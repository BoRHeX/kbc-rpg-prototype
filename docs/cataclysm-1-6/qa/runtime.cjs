'use strict';
// Executes the complete shipped scripts against a small DOM/canvas test double.
// This verifies game integration, not browser pixels or hardware performance.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const nodes=[],ids=new Map(),events={},storage=new Map();let clock=1000,draws=0,raf;const imageDraws=[];
const context=new Proxy({measureText:t=>({width:String(t).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage:(...args)=>{draws++;if(args[0]?.src?.includes("mutation-")&&imageDraws.length<256)imageDraws.push(args);}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={setProperty(){}};this.hidden=false;this.disabled=false;this.className='';this.attrs={};this.listeners={};this.offsetWidth=160;this.offsetHeight=44;this.width=844;this.height=390;this.textContent='';this.classList={toggle(){},remove(){},add(){}};nodes.push(this);}
 append(...kids){for(const k of kids){k.parentElement=this;this.children.push(k);}} appendChild(k){this.append(k);return k;} replaceChildren(...kids){this.children=[];this.append(...kids);}
 setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k];} removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,f){this.listeners[k]=f;} removeEventListener(){} focus(){document.activeElement=this;} remove(){} closest(){return null;} getContext(){return context;} getBoundingClientRect(){return {left:0,top:0,width:844,height:390,right:844,bottom:390};} getClientRects(){return [this.getBoundingClientRect()];} querySelectorAll(q){return document.querySelectorAll(q);} querySelector(){return null;}
}
const document={hidden:false,activeElement:null,createElement:t=>new Element(t),getElementById:id=>ids.get(id)||null,querySelectorAll(q){if(q==='[data-upgrade]')return nodes.filter(n=>n.dataset.upgrade);if(q.includes('.upgrade'))return nodes.filter(n=>n.dataset.upgrade&&!n.hidden);return [];},addEventListener(k,f){events[k]=f;},currentScript:{src:''},documentElement:new Element(),body:new Element()};
for(const match of html.matchAll(/<([\w-]+)\b([^>]*)>/g)){const attrs=match[2],id=attrs.match(/\bid="([^"]+)"/),upgrade=attrs.match(/data-upgrade="([^"]+)"/);if(!id&&!upgrade)continue;const n=new Element(match[1]);if(id)ids.set(id[1],n);if(upgrade)n.dataset.upgrade=upgrade[1];n.hidden=/\bhidden\b/.test(attrs);n.disabled=/\bdisabled\b/.test(attrs);n.parentElement=new Element();}
class Image{
 constructor(){this.complete=false;}
 set src(url){this._src=String(url);const file=path.join(base,new URL(url,'http://cata.local/').pathname.replace('/cataclysm-1-6/',''));assert(fs.existsSync(file),'Missing image '+file);const b=fs.readFileSync(file);this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.complete=true;queueMicrotask(()=>this.onload?.());}
 get src(){return this._src;} decode(){return Promise.resolve();}
}
const sandbox={navigator:{userAgent:"QA",maxTouchPoints:1},console,URL,URLSearchParams,Image,document,performance:{now:()=>clock},crypto:require('crypto').webcrypto,location:{search:'?qa=nine-lives&seed=123',href:'http://cata.local/cataclysm-1-6/'},innerWidth:844,innerHeight:390,devicePixelRatio:1,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},matchMedia:()=>({matches:false}),addEventListener(k,f){events[k]=f;},requestAnimationFrame:f=>{raf=f;},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},fetch:async url=>({ok:true,arrayBuffer:async()=>{const bytes=fs.readFileSync(path.join(base,url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);},json:async()=>JSON.parse(fs.readFileSync(path.join(base,new URL(url,'http://cata.local/cataclysm-1-6/').pathname.replace('/cataclysm-1-6/','')),'utf8'))})};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.CATACLYSM_BOOT={ready:v=>assert.equal(v,'1.6'),fail:m=>{throw Error(m);}};
vm.createContext(sandbox);
(async()=>{
 for(const m of html.matchAll(/<script src="\.\/([^?"]+)/g)){const file=m[1];document.currentScript.src='http://cata.local/cataclysm-1-6/'+file;let source=fs.readFileSync(path.join(base,file),'utf8');if(file==='game.js')source=source.replace('  window.spawnRelic=spawnRelic;', '  window.__test={get game(){return game;},updateSupport,updateGas,prepareShot,updateEnemyProjectiles,summonCompanion,updateCompanions,addFish,updateMecha,updateCompanyRole,updateForaging,squadHit,cityRoute,cityTick,cityDefeat,citySolids,isTerrainClear,createCity,updateDirector,beginFusion,cityMap,fishingDraw,fishingInit,fishingTick,fishingOdds,fishingResolve,fishingAward,fishingHazard,safeSpawn,moveWithCollision,updateMajorEnemyAttack,mutationAPI,defeatEnemy,spawnEnemy,updateEvolution,renderWorld};window.spawnRelic=spawnRelic;');vm.runInContext(source,sandbox,{filename:file});}
 await new Promise(resolve=>setImmediate(resolve));
 const qa=sandbox.CATA_12_QA,snap=()=>JSON.parse(JSON.stringify(sandbox.CATACLYSM_DIAGNOSTICS.snapshot())),step=(seconds)=>{for(let t=0;t<seconds;t+=.05){clock+=50;raf(clock);}};
 qa.start();assert.equal(snap().nineLives.lives,9);assert.equal(snap().player.level,1);assert.equal(snap().major.campaign.night,1);step(.1);assert(draws>0);
 const pos=snap().player;events.keydown({key:'d',target:{closest:()=>null},preventDefault(){}});step(.4);events.keyup({key:'d'});assert(snap().player.x>pos.x,'Keyboard movement');
 qa.seedProgress();qa.offer();assert.equal(snap().offered.length,3);const offers=snap().offered.join('|'),tokens=snap().major.rerollTokens;ids.get('reroll-upgrades').onclick();assert.notEqual(snap().offered.join('|'),offers);assert.equal(snap().major.rerollTokens,tokens-1);assert.equal(snap().mode,'upgrade');const frozen=snap().time;step(.3);assert.equal(snap().time,frozen);
 qa.choose('curiosity');qa.offer();assert.equal(snap().offered.length,4);assert(!snap().upgradeAvailability.curiosity);qa.choose('omniscience');qa.offer();assert.equal(snap().offered.length,5);assert(!snap().upgradeAvailability.omniscience);qa.choose('second-wind');
 const before=snap();qa.lethal();qa.lethal();assert.equal(snap().mode,'reviving');assert.equal(snap().nineLives.lives,8);assert.equal(snap().player.hp,0);
 qa.pause();const clockBefore=snap().nineLives.reviveClock;step(.5);assert.equal(snap().mode,'paused');assert.equal(snap().nineLives.reviveClock,clockBefore);qa.pause();step(1);const after=snap();assert.equal(after.mode,'running');assert.equal(after.nineLives.lives,8);assert(after.nineLives.grace>3);assert(after.player.hp>0&&after.player.hp<after.player.maxHp);assert.equal(after.player.hp,after.player.maxHp*.8);assert.equal(after.player.level,before.player.level);assert.equal(after.fish,before.fish);assert.equal(after.xp,before.xp);assert.deepEqual(after.upgrades,before.upgrades);assert.deepEqual(after.companionRanks,before.companionRanks);assert.equal(after.wave,before.wave);assert.equal(after.major.campaign.night,before.major.campaign.night);assert.deepEqual(after.fishItems.map(({phase,...f})=>f),before.fishItems.map(({phase,...f})=>f));qa.lethal();assert.equal(snap().nineLives.lives,8);
 assert(qa.reward());assert.equal(snap().nineLives.lives,9);assert(!qa.reward());assert.equal(snap().nineLives.lives,9);
 // Remove automatic simulation from death-chain checks: tick grace down in bounded steps.
 for(let target=8;target>=0;target--){for(let i=0;i<90;i++){if(snap().mode==='upgrade')qa.choose('damage');step(.05);}qa.lethal();assert.equal(snap().nineLives.lives,target);if(target){assert.equal(snap().mode,'reviving');qa.tick(1);assert.equal(snap().mode,'running');}}
 assert.equal(snap().mode,'dead');qa.lethal();assert.equal(snap().nineLives.lives,0);qa.start();assert.equal(snap().nineLives.lives,9);assert.equal(snap().fish,0);assert.equal(snap().upgrades.length,0);assert.equal(snap().nineLives.offerCount,3);assert.equal(snap().major.rerollTokens,2);assert(qa.reward());assert.equal(snap().nineLives.lives,9);assert.equal(snap().player.maxHp,3.5);
 for(const perk of ['quiet-repair','clock-shield','glass-cat','fleet-return','solo-contract','last-laugh','revenant-tail']){qa.offer();assert(snap().upgradeAvailability[perk]);qa.choose(perk);assert.equal(snap().mode,'running');}
 qa.offer();qa.choose('loaded-dice');qa.offer();qa.choose('loaded-dice');assert(!snap().upgradeAvailability['loaded-dice']);
 qa.offer();qa.choose('companion-shooter');qa.offer();qa.choose('squad-care');for(const role of ['healer','tank','sniper']){qa.offer();qa.choose('companion-'+role);}assert.equal(snap().companions.active.length,4);assert(!snap().upgradeAvailability['companion-engineer']);assert(!snap().upgradeAvailability['squad-count']);qa.offer();assert(snap().offered.length===3&&snap().offered.every(id=>snap().upgradeAvailability[id]));
 qa.start();const test=sandbox.__test,g=test.game,p=g.player;
 const bullet=damage=>({x:p.x,y:p.y,vx:0,vy:0,r:4,life:1,damage});
 g.enemyShots=[bullet(.5)];test.updateEnemyProjectiles(0);assert.equal(p.hp,2.5);assert.equal(g.lives,9,'ordinary HP damage must not consume life');
 p.inv=0;g.enemyShots=[bullet(100),bullet(100)];test.updateEnemyProjectiles(0);assert.equal(g.lives,8,'real projectile death consumes once');assert.equal(g.mode,'reviving');qa.tick(1);g.enemyShots=[bullet(100)];test.updateEnemyProjectiles(0);assert.equal(g.lives,8,'grace blocks hostile projectiles');
 qa.start();const gp=test.game,pp=gp.player;gp.t=30;gp.lastDamage=0;pp.hp=1;pp.quietRepair=true;test.updateSupport(1);assert(Math.abs(pp.hp-1.12)<1e-8,'solo repair rate');
 pp.soloContract=true;test.updateSupport(0);assert.equal(gp.effectiveBuffs.damage,1.3);assert.equal(gp.effectiveBuffs.mitigation,.15);
 gp.lives=1;pp.lastLaugh=true;test.updateSupport(0);assert(Math.abs(gp.effectiveBuffs.damage-2.08)<1e-8,'last life damage');
 pp.revenantTail=true;pp.revenantUntil=gp.t+8;let shot=test.prepareShot({damage:1});assert.equal(shot.pierce,2);gp.t+=9;shot=test.prepareShot({damage:1});assert.equal(shot.pierce,0,'haunted piercing expires');
 pp.clockShield=true;pp.nextShield=gp.t;pp.inv=0;qa.tick(.05);assert(pp.inv>1&&pp.inv<=1.1,'shield has finite duration');const due=pp.nextShield;qa.tick(.05);assert.equal(pp.nextShield,due,'shield not regranted each frame');
 for(const facing of [-1,1])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){const tip=sandbox.CATA_HERO_RIG_RENDER.drawTail(context,angle,27,1,facing),barrel=sandbox.CATA_ART.heroBarrels(angle,27,facing)[0];assert.deepEqual(JSON.parse(JSON.stringify(tip)),JSON.parse(JSON.stringify(barrel)));assert(Math.abs(tip.x-(-19*facing+Math.cos(angle)*48)*27/23)<1e-8);}
 gp.t=180;gp.lifeReward.checked=false;qa.tick(.05);assert(!gp.lifeReward.checked,'old timed life lottery removed');
 qa.start();qa.offer();ids.get('reroll-upgrades').onclick();ids.get('reroll-upgrades').onclick();assert.equal(snap().major.rerollTokens,0);const exhausted=snap().offered.slice().sort().join('|');ids.get('reroll-upgrades').onclick();assert.equal(snap().offered.slice().sort().join('|'),exhausted);assert.equal(snap().major.rerollTokens,0);assert.equal(new Set(snap().offered).size,snap().offered.length);

 // 1.3 tests run the real game functions, including new roles and fusion lifecycle.
 const company=sandbox.CATA_COMPANY,api=sandbox.__test;
 assert.equal(nodes.filter(n=>n.dataset.upgrade?.startsWith('companion-')).length,16,'all sixteen have real offer buttons');
 for(const role of Object.keys(company.identities)){
   qa.start();const g=api.game;assert(api.summonCompanion(role),role+' recruits');
   const cat=g.companionSquad[0];assert.equal(cat.level,1);api.updateCompanions(.1);
   company.earn(cat,24);assert.equal(cat.level,2);company.earn(cat,51);assert.equal(cat.level,3);assert(cat.evolved);
   api.addFish(cat.x,cat.y,3);const fish=g.fishItems.at(-1),playerFish=g.fish,xp=g.xp;
   assert(company.eat(g,cat,fish));assert(!company.eat(g,cat,fish),'food cannot be eaten twice');assert.equal(g.fish,playerFish);assert.equal(g.xp,xp);assert.equal(cat.food,3);assert.equal(company.diagnostics(g).fish.balance,0);
   if(company.newRoles.includes(role)){
     const enemy={x:cat.x+70,y:cat.y,hp:100,max:100,r:18,shootTimer:0};g.enemies=[enemy];cat.nextWork=0;cat.energy=80;g.kills=10;
     if(role==='courier')api.addFish(cat.x+60,cat.y,1);
     api.updateCompanyRole(cat,role==='angler'?null:enemy,1,2);
     assert(cat.nextWork>0,role+' performs distinct work');
   }
 }

 qa.start();const fg=api.game;api.summonCompanion('courier');const eater=fg.companionSquad[0];eater.energy=0;eater.forageCooldown=0;api.addFish(eater.x,eater.y,2);
 api.updateForaging(eater,.1);assert(eater.forage,'AI independently chooses food');
 for(let i=0;i<5;i++)api.updateForaging(eater,.25);
 assert.equal(eater.food,2);assert.equal(fg.fish,0);assert.equal(company.diagnostics(fg).fish.balance,0,'natural feeding conserves fish');
 qa.start();const solo=api.game;const victim={x:solo.player.x+200,y:solo.player.y,hp:1,max:1,r:18,weight:1,variant:'normal'};solo.enemies.push(victim);const soloXP=solo.xp;api.squadHit(victim,5);assert.equal(solo.xp,soloXP+.55*solo.player.xpGain,'solo kill XP independent of drop');api.squadHit(victim,5);assert.equal(solo.xp,soloXP+.55*solo.player.xpGain,'no repeated kill XP');
 api.addFish(solo.player.x,solo.player.y,2);qa.tick(.05);assert(solo.fish>=2,'actual player pickup path');assert.equal(company.diagnostics(solo).fish.balance,0);
 qa.start();let cg=api.game;
 for(const role of ['engineer','shooter','healer','tank'])assert(api.summonCompanion(role));
 assert(!api.summonCompanion('scout'),'four slots enforced');
 for(const c of cg.companionSquad)company.earn(c,75);
 const mech=company.fuse(cg);assert(mech);assert.equal(cg.companionSquad.length,3);assert(!api.summonCompanion('engineer'));assert(!api.summonCompanion('shooter'));assert(api.summonCompanion('scout'));assert(!company.fuse(cg));assert(company.diagnostics(cg).unique);
 const retainedSquad=cg.companionSquad;qa.lethal();qa.tick(1);assert.equal(cg.companionSquad,retainedSquad,'revival retains fused ownership');assert.equal(cg.companionSquad.filter(c=>c.type==='mecha').length,1);
 api.updateMecha(mech,null,2.1,2);assert.equal(mech.mechaStage,'board');api.updateMecha(mech,null,1.1,2);assert.equal(mech.mechaStage,'fire');
 const target={x:mech.x+100,y:mech.y,hp:100,r:20};
 for(let i=0;i<12;i++)api.updateMecha(mech,target,.2,2);
 assert.equal(mech.mechaStage,'repair');const shots=cg.shots.length;api.updateMecha(mech,target,2,2);assert.equal(cg.shots.length,shots,'repair cannot shoot');api.updateMecha(mech,target,4.1,2);assert.equal(mech.mechaStage,'board');
 qa.start();assert.equal(api.game.companionSquad.length,0);assert.equal(company.diagnostics(api.game).fish.balance,0);
 // Presentation must not create actors, consume food or advance simulation clocks.
 const presentation=sandbox.CATA_COMPANY_PRESENTATION;assert(presentation);
 let crewDraws=0;
 for(const role of [...Object.keys(company.identities),'mecha']){
   for(const stage of ['build','board','fire','repair'])for(const reduced of [false,true]){
     const pet={type:role,x:20,y:30,level:3,food:2,work:75,heat:80,mechaStage:stage,mechaClock:.5,companyEvent:'evolve',eventUntil:2,forage:{eating:.4}};
     const before=JSON.stringify(pet);presentation.draw(context,pet,1,()=>crewDraws++,reduced);assert.equal(JSON.stringify(pet),before);
   }
 }
 assert.equal(crewDraws,16,'two illustrated crew cutouts per Mecha render, no extra simulated actor');
 let illustratedCrew=0;
 for(const stage of ['build','board','fire','repair'])for(const reduced of [false,true]){
 const pet={type:'mecha',x:20,y:30,level:3,heat:80,mechaStage:stage,mechaClock:.5,eventUntil:0};
 const before=JSON.stringify(pet);presentation.draw(context,pet,1,()=>illustratedCrew++,reduced,true);assert.equal(JSON.stringify(pet),before);
 }
 assert.equal(illustratedCrew,8,'illustrated Mecha preserves two crew cutouts during build/board only');

 assert(fs.readFileSync(path.join(base,'game.css'),'utf8').includes('#support-status{display:block!important;'),'crew HUD overrides inherited hidden rule');
 { // 1.4 runtime mechanics: use production hooks, not a parallel simulation.
 qa.start();const cg=api.game,cc=cg.unseen;
 assert(api.isTerrainClear(cg.player.x,cg.player.y,29),'safe city spawn');
 assert.equal(JSON.stringify(api.createCity(123).solids),JSON.stringify(api.createCity(123).solids),'repeatable seed');
 assert.notEqual(JSON.stringify(api.createCity(123).solids),JSON.stringify(api.createCity(124).solids),'seed changes prop sockets');
 assert(!api.isTerrainClear(-10,1340,21),'finite city perimeter');
 assert(!api.isTerrainClear(2680,1340,21),'gate initially blocks frontier');
 const gate=cc.gates[0];cg.player.x=2380;cg.player.y=1340;
 api.cityTick(.01);assert(gate.active,'movement proximity starts horde gate');
 gate.damage=gate.required;api.cityTick(.01);assert(gate.done&&cc.open[1],'horde damage opens district');
 assert(api.isTerrainClear(2680,1340,21),'opened throat walkable');
 cg.player.x=1340;cg.player.y=2380;const relief=cc.gates[1];relief.attempts=2;api.cityTick(.01);assert(relief.active);cg.t=relief.until;api.cityTick(.01);assert(relief.done,'third survival attempt prevents weak-deck softlock');
 cg.powerups=[{x:1500,y:2380,kind:'magnet',expires:cg.t+90},{x:1500,y:2380,kind:'heal',expires:cg.t+90}];const route=api.cityRoute();assert(route&&route.target.kind==='magnet','route excludes heal');assert(route.distance>=160,'route distance respects geometry');
 cg.player.x=1340;cg.player.y=1340;cc.kills[0]=12;api.cityTick(.01);assert(cg.enemies.some(e=>e.cityGuardian===0),'local kills plus plaza provoke guardian');
 const boss=cg.enemies.find(e=>e.cityGuardian===0);api.cityDefeat(boss);assert(cc.defeated[0]);
 qa.start();assert(!api.game.unseen.defeated[0],'restart resets encounter state');
 const rewardGame=api.game;rewardGame.unseen=api.createCity(124);rewardGame.lives=8;api.cityDefeat({x:4020,y:4020,cityGuardian:3});assert.equal(rewardGame.lives,9,'eligible guardian recovers one life');rewardGame.lives=8;api.cityDefeat({x:4020,y:4020,cityGuardian:3});assert.equal(rewardGame.lives,8,'same guardian reward cannot repeat');rewardGame.unseen=api.createCity(124);api.cityDefeat({x:4020,y:4020,cityGuardian:3});assert.equal(rewardGame.lives,8,'same seed restart cannot farm reward');
 }
 // Pass 05 independent regression fixtures for defects found in integration.
 {
 qa.start();let g=api.game;g.player.x=2380;g.player.y=1340;let gate=g.unseen.gates[0];api.cityTick(.01);
 const first=g.enemies.find(e=>e.cityGate===gate);assert(first);const hp=first.max;
 assert(gate.required/hp>=12,'fresh baseline gate requires a horde, not two kills');
 g.t=gate.until;api.cityTick(.01);assert(!gate.active&&!gate.done,'first timeout fails');
 const expiredCredit=gate.damage;api.cityDefeat(first);assert.equal(gate.damage,expiredCredit,'inactive gate grants no damage credit');
 g.t=gate.cooldown;api.cityTick(.01);assert(gate.active&&gate.attempts===2);
 api.cityDefeat(first);assert.equal(gate.damage,0,'failed-attempt survivors cannot credit a retry');
 const current=g.enemies.find(e=>e.cityGate===gate&&e.cityGateAttempt===2);assert(current);api.cityDefeat(current);assert.equal(gate.damage,current.max,'current attempt kill counts');
 qa.start();g=api.game;g.player.level=85;g.player.x=2380;g.player.y=1340;api.cityTick(.01);gate=g.unseen.gates[0];
 assert.equal(gate.required/gate.mobHp,24,'level 85 requires 24 weak bodies');assert.equal(gate.mobHp,4.5,'late gates avoid 12-HP ordinary sponges');
 const late={level:85,hordeKills:gate.required/gate.mobHp,mobHp:gate.mobHp,quota:gate.required};
 qa.start();g=api.game;g.unseen.kills[0]=12;api.cityTick(.01);const guardian=g.enemies.find(e=>e.cityGuardian===0);assert(guardian);
 g.player.x=4800;g.player.y=4800;api.updateDirector(.05);assert(g.enemies.includes(guardian),'retreat must not erase provoked guardian');
 const ordinary={...guardian,cityGuardian:undefined,id:999,x:guardian.x+20};g.enemies.push(ordinary);assert.equal(api.beginFusion(guardian,ordinary),null,'guardian cannot be consumed by normal fusion');
 qa.start();g=api.game;g.player.x=2380;g.player.y=1340;api.cityTick(.01);const marked=g.enemies.find(e=>e.cityGate);g.enemies.push({...marked,cityGate:undefined,id:999,x:marked.x+20});assert.equal(api.beginFusion(marked,g.enemies.at(-1)),null,'gate credit actor cannot disappear into fusion');
 qa.start();g=api.game;g.powerups=[{x:2800,y:1340,kind:'magnet',expires:90},{x:1340,y:1700,kind:'rage',expires:90}];
 let route=api.cityRoute();assert.equal(route.target.kind,'rage','nearer but locked-away magnet is excluded');
 g.powerups[1].expires=.01;route=api.cityRoute();assert(route.target.kind==='beacon','unreachable-before-expiry pickup is excluded');
 const panel=ids.get('city-map-panel');panel.hidden=true;api.cityMap();assert(panel.hidden,'map cannot open in gameplay');qa.pause();api.cityMap();assert(!panel.hidden,'map opens while paused');qa.pause();assert(ids.get('pause-overlay').hidden,'map parent hides on resume');
 fs.writeFileSync(path.join(base,'STUDIO/qa-balance-pass05.json'),JSON.stringify({status:'PASS',kind:'deterministic fixtures, not a natural endgame completion',baselineGateKills:12,lateBuild:late,fixes:['attempt-scoped gate credit','guardian survives retreat','city actors excluded from enemy fusion','unreachable and expired arrow targets excluded','map restricted to pause']},null,2));
 }
 // Repair 06: guardians cannot appear on the hero; early guardian gas has a real lifetime/damage.
 qa.start();{
 const api=sandbox.__test,g=api.game;g.unseen.kills[0]=12;api.cityTick(.01);
 const boss=g.enemies.find(e=>e.cityGuardian===0);assert(boss);
 assert(Math.hypot(boss.x-g.player.x,boss.y-g.player.y)>260,'guardian spawn gives reaction space');
 assert(api.isTerrainClear(boss.x,boss.y,52),'guardian entry clears its collision radius');
 g.t=20;g.player.inv=0;const hp=g.player.hp;
 g.hazards.toxicGasClouds=[{x:g.player.x,y:g.player.y,age:0,life:5,r:95}];
 api.updateGas(.5);assert.equal(g.player.hp,hp,'early gas telegraphs before damage');
 api.updateGas(.5);api.updateGas(.5);assert(g.player.hp<hp,'guardian gas damages before ambient gas unlock');
 assert.equal(g.hazards.toxicGasClouds.length,1,'ambient gas remains locked');
 api.updateGas(3.5);assert.equal(g.hazards.toxicGasClouds.length,0,'guardian cloud expires at declared lifetime');
 }

 // 1.5 production functions: probability, transactions, movement cancellation and hazard attack.
 qa.start();{
 const g=api.game,f=g.fishing;
 for(const bait of ['plain','worm','fishbone','catnip'])for(let tier=0;tier<4;tier++)for(let line=0;line<3;line++){
 const w=api.fishingOdds(bait,tier,line,false);assert.equal(w.reduce((a,b)=>a+b,0),100);assert(w.every(n=>n>=0));}
 assert(api.fishingOdds('catnip')[3]>api.fishingOdds('plain')[3]);assert(api.fishingOdds('worm')[1]>api.fishingOdds('plain')[1]);assert.equal(api.fishingOdds('catnip',0,0,true)[3],0);
 for(const spot of f.spots){assert(api.isTerrainClear(spot.x,spot.y,52),'dry apron is clear');assert(!api.isTerrainClear(spot.x,spot.y-125,12),'water collides');}
 for(let d=0;d<4;d++){const origin={x:d%2*2680+1340,y:Math.floor(d/2)*2680+1340};for(const spot of f.spots.filter(s=>s.d===d))for(let n=0;n<=40;n++)assert(api.isTerrainClear(origin.x+(spot.x-origin.x)*n/40,origin.y,29),'plaza to apron clear');}
 const spot=f.spots[0];Object.assign(g.player,{x:spot.x,y:spot.y});
 api.fishingTick(.6,{x:0,y:0});assert(f.active&&!f.active.committed);api.fishingTick(.01,{x:1,y:0});assert.equal(f.active,null);assert.equal(spot.used,0);
 api.fishingTick(1.1,{x:0,y:0});assert(f.active.committed);
 const oldMoveTo=context.moveTo, tips=[];context.moveTo=(x,y)=>tips.push([x,y]);
 for(const [committed,bite,tip] of [[false,false,[.85,.13]],[true,false,[.96,.09]],[true,true,[.88,.05]]]){
  Object.assign(f.active,{committed,bite});api.fishingDraw();
  const actual=tips.at(-1);assert(Math.abs(actual[0]-(g.player.x+35+(tip[0]-.5)*64))<1e-6);
  assert(Math.abs(actual[1]-(g.player.y-25+(tip[1]-.5)*64))<1e-6,'line begins at painted rod tip');
 }
 context.moveTo=oldMoveTo;Object.assign(f.active,{committed:true,bite:false});const ordinal=f.ordinal;api.fishingTick(.01,{x:1,y:0});assert.equal(f.active,null);assert.equal(f.ordinal,ordinal);assert.equal(spot.used,1);
 // Pause preserves the exact committed outcome and frozen timer.
 api.fishingTick(1.1,{x:0,y:0});const reserved=f.active;reserved.outcome=5;
 qa.pause();step(.3);assert.equal(f.active,reserved);assert.equal(g.mode,'paused');qa.pause();
 const hazardsBefore=g.enemies.filter(e=>e.fishingHazard).length;
 api.fishingTick(.01,{x:1,y:0});assert.equal(f.active,null);assert(g.enemies.filter(e=>e.fishingHazard).length>hazardsBefore,'cancel after pause still releases ambush');
 const before=sandbox.CATA_COMPANY.diagnostics(g).fish;const caught=f.caught;
 const a={id:999,spot,outcome:1};api.fishingResolve(a);api.fishingResolve(a);api.fishingResolve({id:999,spot,outcome:1});assert.equal(f.caught,caught+3);assert.equal(sandbox.CATA_COMPANY.diagnostics(g).fish.balance,0);
 api.fishingAward('test',99999);api.fishingAward('test',99999);assert.equal(f.jackpot,10000);
 g.enemies=[];api.fishingHazard({spot,outcome:4});const mutant=g.enemies.find(e=>e.fishingMutant);assert(mutant);assert(api.isTerrainClear(mutant.x,mutant.y,32));assert(mutant.arrivalUntil>g.t);
 api.updateMajorEnemyAttack(mutant,.9,g.player,100);const x=mutant.x,y=mutant.y;api.updateMajorEnemyAttack(mutant,.2,g.player,100);assert(Math.hypot(mutant.x-x,mutant.y-y)>0,'mutant performs actual lunge');
 // Five existing hazards leave exactly one ambush socket, never three.
 g.enemies=Array.from({length:5},()=>({fishingHazard:true,hp:1,x:1340,y:1340}));
 api.fishingHazard({spot,outcome:5});assert.equal(g.enemies.filter(e=>e.fishingHazard).length,6);
 for(const legs of ['wings','phase'])for(const x of [49,5311])for(const y of [49,5311]){
 const e={x,y,r:18,traits:{legs},traitAge:2};g.unseen.open=[true,true,true,true];
 api.moveWithCollision(e,x<100?-500:500,y<100?-500:500);
 assert(e.x>=49&&e.x<=5311&&e.y>=49&&e.y<=5311,'bypass actors stay inside physical wall');}
 for(const x of [30,1340,5300])for(const y of [30,1340,5300]){g.player.x=x;g.player.y=y;g.unseen.open=[true,true,true,true];for(let n=0;n<8;n++){const q=api.safeSpawn();assert(q.x>=30&&q.x<=5330&&q.y>=30&&q.y<=5330);assert(api.isTerrainClear(q.x,q.y,30));}}
 }
 // Let the production auto-cast/reel path resolve, then leave the spot mid-cast.
 qa.start();{
 const g=api.game,f=g.fishing,s=f.spots[0];Object.assign(g.player,{x:s.x,y:s.y});
 f.bait='worm';f.charges=1;
 api.fishingTick(1.1,{x:0,y:0});assert.equal(f.charges,0);assert.equal(f.bait,'plain');
 const id=f.active.id;api.fishingTick(6,{x:0,y:0});assert.equal(f.active,null);assert(f.resolved.includes(id),'automatic reel resolves reserved ordinal');
 g.t+=5;api.fishingTick(1.1,{x:0,y:0});g.player.x+=60;api.fishingTick(.01,{x:0,y:0});assert.equal(f.active,null,'leaving apron cancels without another control');
 }
 // Sample collision seeds, including unsigned extremes; not an all-seed proof.
 qa.start();{
 const g=api.game;
 for(const seed of [0,1,2,3,31,123,424242,2147483647,4294967295]){
 g.unseen=api.createCity(seed);api.fishingInit();
 for(const s of g.fishing.spots){assert(api.isTerrainClear(s.x,s.y,52));
 const x=s.d%2*2680+1340;
 for(let n=0;n<=40;n++)assert(api.isTerrainClear(x+(s.x-x)*n/40,s.y,29),'seeded plaza approach');}
 }
 }
 const mutationChecks=await require('./mutation-fixtures.cjs')(qa,api,sandbox.CATA_MUTATIONS,sandbox.CATA_MUTATION_MEDIA,sandbox.CATA_COMPANY,imageDraws,step);
 const result={status:'PASS',checks:[...mutationChecks,'pause preserves committed danger; cancel on resume releases it','ambush cap holds from five to six','flying and phasing actors stay within physical perimeter','nine sampled city seeds have clear aprons and plaza approaches','1.5 bait weights, collision water and reachable aprons, cast cancellation, atomic catch, jackpot cap, mutant warned lunge, bounded spawns','guardian spawns clear and away from player','early guardian gas telegraphs damages and expires','seeded finite city safe spawn and seed variance','locked/open gates share collision geometry','horde gate success and third-attempt relief','reachable magnet route excludes ordinary pickups','local kill provocation and guardian defeat','rare eligible guardian life reward cannot repeat across seed restart','full runtime and local assets load','render draw calls','responsive keyboard movement','three/four/five unique eligible offers','reroll spends token and changes offers','upgrade pause','nine distinct deaths and terminal game over','transition pauses','revive retains run progression and pickups','partial HP and bounded safe grace','one-shot capped recovery and full-cap fallback','restart reset','all new perks equip','ordinary and lethal projectile integration','regen rates and solo/last-life multipliers','haunted pierce expires','shield periodic cooldown','four unique companions and eligibility','visible tail muzzle matches simulation in both facings','inherited timed life lottery removed','zero-token reroll is inert and offers remain selectable','16 actual recruits and level thresholds','eight distinct new role work paths','fish consumed once without player currency or XP duplication','four-slot fusion and component recruitment lock','Mecha build boarding fire heat repair and restart','presentation all roles and Mecha stages in both motion modes without state mutation','crew HUD visibility override'],drawCalls:draws,browserPixels:'NOT TESTED by this DOM/canvas-double harness; see STUDIO browser attempt logs',snapshot:snap()};
 fs.writeFileSync(path.join(__dirname,'runtime-results.json'),JSON.stringify(result,null,2));console.log('PASS:',result.checks.join('; '));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

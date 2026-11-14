'use strict';
// Executes the complete shipped scripts against a small DOM/canvas test double.
// This verifies game integration, not browser pixels or hardware performance.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const nodes=[],ids=new Map(),events={},storage=new Map();let clock=1000,draws=0,raf;
const context=new Proxy({measureText:t=>({width:String(t).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage:()=>draws++},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
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
 set src(url){this._src=String(url);const file=path.join(base,new URL(url,'http://cata.local/').pathname.replace('/cataclysm-1-3/',''));assert(fs.existsSync(file),'Missing image '+file);const b=fs.readFileSync(file);this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.complete=true;queueMicrotask(()=>this.onload?.());}
 get src(){return this._src;} decode(){return Promise.resolve();}
}
const sandbox={navigator:{userAgent:"QA",maxTouchPoints:1},console,URL,URLSearchParams,Image,document,performance:{now:()=>clock},crypto:require('crypto').webcrypto,location:{search:'?qa=nine-lives&seed=123',href:'http://cata.local/cataclysm-1-3/'},innerWidth:844,innerHeight:390,devicePixelRatio:1,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},matchMedia:()=>({matches:false}),addEventListener(k,f){events[k]=f;},requestAnimationFrame:f=>{raf=f;},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(base,new URL(url,'http://cata.local/cataclysm-1-3/').pathname.replace('/cataclysm-1-3/','')),'utf8'))})};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.CATACLYSM_BOOT={ready:v=>assert.equal(v,'1.3'),fail:m=>{throw Error(m);}};
vm.createContext(sandbox);
(async()=>{
 for(const m of html.matchAll(/<script src="\.\/([^?"]+)/g)){const file=m[1];document.currentScript.src='http://cata.local/cataclysm-1-3/'+file;let source=fs.readFileSync(path.join(base,file),'utf8');if(file==='game.js')source=source.replace('  window.spawnRelic=spawnRelic;', '  window.__test={get game(){return game;},updateSupport,prepareShot,updateEnemyProjectiles,summonCompanion,updateCompanions,addFish,updateMecha,updateCompanyRole,updateForaging,squadHit};window.spawnRelic=spawnRelic;');vm.runInContext(source,sandbox,{filename:file});}
 await new Promise(resolve=>setImmediate(resolve));
 const qa=sandbox.CATA_12_QA,snap=()=>JSON.parse(JSON.stringify(sandbox.CATACLYSM_DIAGNOSTICS.snapshot())),step=(seconds)=>{for(let t=0;t<seconds;t+=.05){clock+=50;raf(clock);}};
 qa.start();assert.equal(snap().nineLives.lives,9);assert.equal(snap().player.level,1);assert.equal(snap().major.campaign.night,1);step(.1);assert(draws>0);
 const pos=snap().player;events.keydown({key:'d',target:{closest:()=>null},preventDefault(){}});step(.4);events.keyup({key:'d'});assert(snap().player.x>pos.x,'Keyboard movement');
 qa.seedProgress();qa.offer();assert.equal(snap().offered.length,3);const offers=snap().offered.join('|'),tokens=snap().major.rerollTokens;ids.get('reroll-upgrades').onclick();assert.notEqual(snap().offered.join('|'),offers);assert.equal(snap().major.rerollTokens,tokens-1);assert.equal(snap().mode,'upgrade');const frozen=snap().time;step(.3);assert.equal(snap().time,frozen);
 qa.choose('curiosity');qa.offer();assert.equal(snap().offered.length,4);assert(!snap().upgradeAvailability.curiosity);qa.choose('omniscience');qa.offer();assert.equal(snap().offered.length,5);assert(!snap().upgradeAvailability.omniscience);qa.choose('second-wind');
 const before=snap();qa.lethal();qa.lethal();assert.equal(snap().mode,'reviving');assert.equal(snap().nineLives.lives,8);assert.equal(snap().player.hp,0);
 qa.pause();const clockBefore=snap().nineLives.reviveClock;step(.5);assert.equal(snap().mode,'paused');assert.equal(snap().nineLives.reviveClock,clockBefore);qa.pause();step(1);const after=snap();assert.equal(after.mode,'running');assert.equal(after.nineLives.lives,8);assert(after.nineLives.grace>3);assert(after.player.hp>0&&after.player.hp<after.player.maxHp);assert.equal(after.player.hp,after.player.maxHp*.8);assert.equal(after.player.level,before.player.level);assert.equal(after.fish,before.fish);assert.equal(after.xp,before.xp);assert.deepEqual(after.upgrades,before.upgrades);assert.deepEqual(after.companionRanks,before.companionRanks);assert.equal(after.wave,before.wave);assert.equal(after.major.campaign.night,before.major.campaign.night);assert.deepEqual(after.fishItems,before.fishItems);qa.lethal();assert.equal(snap().nineLives.lives,8);
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
 gp.t=180;gp.lifeReward.checked=false;gp.lifeReward.claimed=false;gp.lifeReward.won=false;qa.tick(.05);assert(gp.lifeReward.checked);assert.equal(gp.lifeReward.claimed,gp.lifeReward.won);const livesAtLottery=gp.lives;gp.t=220;qa.tick(.05);assert.equal(gp.lives,livesAtLottery,'timed lottery cannot repeat');
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
 assert(fs.readFileSync(path.join(base,'game.css'),'utf8').includes('#support-status{display:block!important;'),'crew HUD overrides inherited hidden rule');
 const result={status:'PASS',checks:['full runtime and local assets load','render draw calls','responsive keyboard movement','three/four/five unique eligible offers','reroll spends token and changes offers','upgrade pause','nine distinct deaths and terminal game over','transition pauses','revive retains run progression and pickups','partial HP and bounded safe grace','one-shot capped recovery and full-cap fallback','restart reset','all new perks equip','ordinary and lethal projectile integration','regen rates and solo/last-life multipliers','haunted pierce expires','shield periodic cooldown','four unique companions and eligibility','visible tail muzzle matches simulation in both facings','one timed lottery cannot repeat','zero-token reroll is inert and offers remain selectable','16 actual recruits and level thresholds','eight distinct new role work paths','fish consumed once without player currency or XP duplication','four-slot fusion and component recruitment lock','Mecha build boarding fire heat repair and restart','presentation all roles and Mecha stages in both motion modes without state mutation','crew HUD visibility override'],drawCalls:draws,browserPixels:'NOT TESTED: sandbox denies Chromium crashpad socket',snapshot:snap()};
 fs.writeFileSync(path.join(__dirname,'runtime-results.json'),JSON.stringify(result,null,2));console.log('PASS:',result.checks.join('; '));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

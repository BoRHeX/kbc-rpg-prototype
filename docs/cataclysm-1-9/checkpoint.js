/* Adapters between the inherited engine and STUDIO/SAVE_SCHEMA.json. */
'use strict';
(function(root){
  const LN=root.CATA_LONG_NIGHT;
  const caps={enemies:140,shots:2048,enemyShots:512,fishItems:1024,powerups:128,devices:128,corpses:140};
  const systemKeys=('advancement t offerSeed run runScale runRecorded bossEncounters spawnCount squadTactic squadTacticDuration squadTacticCooldown nextTactic nightCycle squadStats offerSeed companionRanks feralInstinct effectiveBuffs hazards buffs survivalTimer lastDamage escapeOverdriveTimer feralInstinctOverdrive escapeOrigin runicRelic nextPower powerCount bossMilestone escape escapeCooldown escapeArmed edgeWarning kills survivalPoints pendingUpgrade wave spawn grace lifeReward offerCount rerollDrops majorEncounterSerial buildEffects exploration encore director cityEvents world progressionMilestones risingShadow endgame catSpeech formationPlan labQueue labWave labNextSpawn labSpawned mutationData mutantSpeech mutationSpeechTimes wildcardMedia phaseCaster phaseWindup shoot shot nextShot shotClock lastShotAt victory defeatedBoss config totalOvertimeTicks decisionSeconds').split(' ');
  const pick=(object,keys)=>Object.fromEntries(keys.filter(k=>object[k]!==undefined).map(k=>[k,object[k]]));
  const entityId=e=>String(e.id);
  const actors=(array,prefix,transform=e=>e)=>array.map((e,i)=>({id:e.id===undefined?prefix+':'+i:entityId(e),state:transform(e)}));
  function member(c,fish){
    const {components,type,level,work,food,energy,forage,castTarget,...runtime}=c;
    if(forage)runtime.forage={...forage,target:fish.indexOf(forage.target)};
    if(castTarget)runtime.castTarget=castTarget.id;
    return {id:type,role:type,level,work:Math.floor(work),food,energy,components:(components||[]).map(m=>member(m,fish)),runtime:{...runtime,workExact:work}};
  }
  function capture(g,combat){
    const r=g.longNight,f=g.fishing,c=g.unseen,p=g.player,a=f.active;
    const phase=g.mode==='paused'?g.pausedFrom:g.mode;
    const systems=pick(g,systemKeys);
    systems.advancement=g.advancement||root.CATA_ADVANCEMENT.initial();
    systems.campaign=g.campaign;
    if(g.mutationEcology){
      const {corpses,...state}=g.mutationEcology;
      systems.mutationEcology=state;
    }
    systems.economy=g.labEconomy.snapshot();
    return JSON.parse(JSON.stringify({
      ...r,phase,lives:g.lives,lifeLosses:g.lifeLosses,
      clocks:{...r.clocks,reviveTicks:Math.ceil(Math.max(0,g.reviveClock*60-1e-8))},
      rng:{...r.rng,combat,offers:g.offerState,director:systems.economy.state,dialogue:g.catSpeech.seed,fishingNonce:f.nonce},
      player:{hp:p.hp,maxHp:p.maxHp,x:p.x,y:p.y,equipment:g.equipment,upgrades:g.upgrades,runtime:p},
      squad:g.companionSquad.map(m=>member(m,g.fishItems)),
      inventory:{fish:g.fish,xp:g.xp,rerolls:g.rerollTokens,score:g.scoreLedger,upgradesPending:g.offered||[],companyFish:g.companyFish},
      fishing:{...pick(f,['rod','line','bait','charges','ordinal','caught','jackpot','cache','spots']),
        awardIds:f.awards,resolvedOrdinals:f.resolved,active:a?{spotId:a.spot.id,originX:a.x,originY:a.y,originHp:a.hp,
          age:a.age,committed:a.committed,ordinal:a.id??null,bait:a.bait??null,outcome:a.outcome??null,until:a.until??null,bite:!!a.bite}:null},
      city:pick(c,['seed','discovered','open','kills','guardians','defeated','gates','rewardUsed']),
      wildcard:g.wildcard,
      actors:{
        enemies:actors(g.enemies,'enemy',e=>{const {cityGate,pack,mRetreat,mTarget,...state}=e;return {...state,
          mTarget:mTarget&&g.mutationEcology?.corpses.includes(mTarget)?{corpse:g.mutationEcology.corpses.indexOf(mTarget)}:
            mTarget&&g.fishItems.includes(mTarget)?{fish:g.fishItems.indexOf(mTarget)}:mTarget?{x:mTarget.x,y:mTarget.y}:mTarget,
          cityGate:cityGate?c.gates.indexOf(cityGate):undefined,pack:g.enemies.includes(pack)?pack.id:undefined,
          retiredPack:pack&&!g.enemies.includes(pack)?{x:pack.x,y:pack.y}:undefined,
          mRetreat:Number.isFinite(mRetreat)?mRetreat:mRetreat===Infinity?-1:undefined};}),
        shots:actors(g.shots,'shot',s=>({...s,hit:s.hit.map(e=>e.id),criticalMethod:!!s.calculateDamage,trail:[]})),
        enemyShots:actors(g.enemyShots,'hazard',s=>({...s,trail:[]})),
        fishItems:actors(g.fishItems,'fish'),powerups:actors(g.powerups,'power'),devices:[],
        corpses:actors(g.mutationEcology?.corpses||[],'corpse')
      },systems
    },(key,value)=>{
      if(typeof value==='number'&&!Number.isFinite(value))throw Error('Nonfinite gameplay state at '+key);
      return value;
    }));
  }
  const integer=(n,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const fail=()=>{throw Error('Invalid gameplay checkpoint');};
  const roles=()=>Object.keys(root.CATA_COMPANY.identities);
  function validate({profile,run:r,schemaVersion}){
    if(!object(profile)||!integer(profile.runs,0)||!integer(profile.campaignBest,0)||!integer(profile.endlessBest,0)||
      (profile.completion!==null&&!LN.receipt(profile.completion))||!object(profile.cityBySeed))fail();
    for(const [seed,city] of Object.entries(profile.cityBySeed)){
      if(!/^\d{1,10}$/.test(seed)||!flags(city.discovery)||typeof city.warrantySpent!=='boolean')fail();
    }
    if(schemaVersion>=3){
      const records=profile.records;
      if(!object(records)||!object(records.enemies)||!object(records.company)||
        Object.entries(records.enemies).length>128||Object.entries(records.company).length>19||
        !Object.entries(records.enemies).every(([id,status])=>/^[a-z0-9-]{1,64}$/.test(id)&&integer(status,1,2))||
        !Object.entries(records.company).every(([id,level])=>[...roles(),'mecha','trawl','spotter'].includes(id)&&integer(level,1,3))||
        !Array.isArray(records.catches)||records.catches.length>64||
        !Array.isArray(records.awards)||records.awards.length>64||
        !records.catches.every(row=>object(row)&&integer(row.night,1)&&integer(row.id,0)&&
          ['plain','worm','fishbone','catnip'].includes(row.bait)&&integer(row.outcome,0,5))||
        !records.awards.every(row=>object(row)&&integer(row.night,1)&&typeof row.id==='string'&&
          /^[\w-]{1,64}$/.test(row.id)&&integer(row.points,1,10000)))fail();
    }
    if(r===null)return;
    if(!/^[\w:-]{1,96}$/.test(r.id)||!['campaign','endless'].includes(r.mode)||
      !integer(r.night,1,r.mode==='campaign'?1000:Number.MAX_SAFE_INTEGER)||r.chapter!==LN.chapter(r.night)||
      !['running','upgrade','reviving','dead','won'].includes(r.phase)||!integer(r.lives,0,9)||!integer(r.lifeLosses,0)||
      !Array.isArray(r.clears)||r.clears.length!==(r.mode==='endless'?0:r.phase==='won'?10:r.chapter-1)||
      !r.clears.every((c,i)=>c===i+1)||r.mode==='endless'&&!LN.receipt(profile.completion))fail();
    const p=r.player;
    if(!p||![p.hp,p.maxHp,p.x,p.y].every(Number.isFinite)||p.hp<0||p.hp>p.maxHp||p.maxHp<=0||
      !object(p.runtime)||!object(p.equipment)||!Array.isArray(p.upgrades)||p.upgrades.length>8192||
      (r.phase==='dead')!==(r.lives===0)||(['dead','reviving'].includes(r.phase))!==(p.hp===0)||
      (r.phase==='won'&&(!LN.receipt(profile.completion)||r.night!==1000||r.finale?.stage!=='cleared')))fail();
    if(!integer(r.clocks?.simTick,0)||!integer(r.clocks?.nightTick,0,630)||!integer(r.clocks?.overtimeTick,0)||
      !integer(r.clocks?.reviveTicks,0,54)||(r.phase==='reviving')!==(r.clocks.reviveTicks>0))fail();
    if(!['root','combat','city','director','chapter','offers','dialogue','fishingNonce'].every(k=>integer(r.rng?.[k],0,0xffffffff)))fail();
    if(!object(r.systems?.director)||!object(r.systems?.economy)||!object(r.systems?.campaign)||
      !object(r.systems?.hazards)||!object(r.systems?.catSpeech)||!object(r.wildcard)||!Number.isFinite(r.systems.t)||
      !object(r.inventory?.companyFish)||!object(r.inventory?.score)||!integer(r.inventory.fish,0)||
      !integer(r.inventory.rerolls,0)||!Number.isFinite(r.inventory.xp)||!Array.isArray(r.inventory.upgradesPending)||
      r.inventory.upgradesPending.length>5||(r.phase==='upgrade'&&!r.inventory.upgradesPending.length))fail();
    if(!r.fishing||r.fishing.spots?.length!==8||!r.fishing.spots.every((s,i)=>s.id===i)||
      !Array.isArray(r.fishing.resolvedOrdinals)||r.fishing.resolvedOrdinals.length>24||
      !Array.isArray(r.fishing.awardIds)||r.fishing.awardIds.length>256||
      (r.fishing.active&&!integer(r.fishing.active.spotId,0,7)))fail();
    if(!r.fishing.spots.every(s=>object(s.water)&&[s.x,s.y,s.time].every(Number.isFinite)&&integer(s.used,0,3))||
      !['plain','worm','fishbone','catnip'].includes(r.fishing.bait)||!integer(r.fishing.jackpot,0,10000))fail();
    if(p.hp!==p.runtime.hp||p.maxHp!==p.runtime.maxHp||p.x!==p.runtime.x||p.y!==p.runtime.y||
      r.systems.campaign.night!==r.night||r.systems.economy.state!==r.rng.director||
      r.systems.catSpeech.seed!==r.rng.dialogue||!object(r.systems.config))fail();
    if(!r.city||r.city.seed!==r.rng.city||!flags(r.city.discovered)||!flags(r.city.open)||r.city.gates?.length!==4)fail();
    if(!Array.isArray(r.squad)||r.squad.length>4)fail();
    const adv=root.CATA_ADVANCEMENT;
    const recipes=schemaVersion===1?{mecha:['engineer','shooter']}:{mecha:['engineer','shooter'],...adv.recipes};
    const committed=new Set();
    for(const m of r.squad){
      const pair=Object.hasOwn(recipes,m.role)?recipes[m.role]:null;
      if(!Array.isArray(m.components)||m.components.length!==(pair?2:0))fail();
      if(pair&&(m.level!==3||!pair.every(role=>m.components.some(c=>c?.role===role))||
        !m.components.every(c=>c.level===3&&Array.isArray(c.components)&&!c.components.length)))fail();
      for(const cat of [m,...m.components]){
        if(![...roles(),...Object.keys(recipes)].includes(cat.role)||!integer(cat.level,1,3)||!object(cat.runtime)||
          committed.has(cat.role)||!integer(cat.food,0)||!Number.isFinite(cat.runtime.workExact)||
          cat.runtime.workExact<0||!Number.isFinite(cat.energy)||cat.energy<0||cat.energy>100)fail();
        if(cat.runtime.mood!==undefined&&!adv.moods.includes(cat.runtime.mood))fail();
        committed.add(cat.role);
      }
      if(pair&&m.role!=='mecha'){
        const c=m.runtime,w=c.windup;
        if(![c.abilityAt,c.actionUntil].every(Number.isFinite)||!integer(c.workTurn,0,1)||
          w!==null&&(!integer(w?.id,1)||!Number.isFinite(w?.until)))fail();
      }
    }
    if(schemaVersion!==1){
      const s=r.systems.advancement,m=s?.mission,k=s?.strike;
      if(!object(s)||!adv.skies.includes(s.weather)||!integer(s.district,-1,3)||
        ![s.nextStrike,s.rushUntil,s.wardUntil].every(v=>Number.isFinite(v)&&v>=0)||
        k!==null&&(![k?.x,k?.y,k?.until].every(Number.isFinite)||!integer(k?.district,0,3))||
        m!==null&&(!integer(m?.chapter,1,10)||!['cache','rescue'].includes(m.kind)||
          !['offered','active','done'].includes(m.status)||m.id!==m.chapter+':'+m.kind||
          ![m.x,m.y,m.hold].every(Number.isFinite)||m.hold<0||m.hold>3))fail();
    }
    for(const [key,cap] of Object.entries(caps)){
      const records=r.actors?.[key];
      if(!Array.isArray(records)||records.length>cap||records.some(e=>!object(e.state)||typeof e.id!=='string')||
        new Set(records.map(e=>e.id)).size!==records.length)fail();
    }
    const ids=new Set(r.actors.enemies.map(e=>e.state.id));
    if(ids.size!==r.actors.enemies.length||r.actors.enemies.some(e=>!integer(e.state.id,1)||e.id!==String(e.state.id)))fail();
    for(const {state:s} of r.actors.shots){
      if(![s.x,s.y,s.vx,s.vy,s.life,s.damage].every(Number.isFinite)||!Array.isArray(s.hit)||s.hit.some(id=>!integer(id,1)))fail();
    }
    for(const {state:e} of r.actors.enemies){
      if(![e.x,e.y,e.hp,e.r].every(Number.isFinite)||
        (e.mTarget?.corpse!==undefined&&!integer(e.mTarget.corpse,0,r.actors.corpses.length-1))||
        (e.mTarget?.fish!==undefined&&!integer(e.mTarget.fish,0,r.actors.fishItems.length-1))||
        (e.cityGate!==undefined&&!integer(e.cityGate,0,3))||(e.pack!==undefined&&!ids.has(e.pack))||
        (e.retiredPack&&(![e.retiredPack.x,e.retiredPack.y].every(Number.isFinite)||e.pack!==undefined)))fail();
    }
    if(!Array.isArray(r.encounters)||r.encounters.length>32||r.encounters.some(e=>!object(e.state)||
      !['queued','active','defeated','retired'].includes(e.phase)||
      (e.phase==='active'&&e.kind!=='chapterPressure'&&!ids.has(Number(e.enemyId)))))fail();
    if(r.mode==='campaign'&&r.night===1000){
      if(!['lights','escorts','boss','cleared'].includes(r.finale?.stage)||!integer(r.finale.lights,0,2)||
        !integer(r.finale.escorts,0,3)||!integer(r.finale.lightHoldTick,0,60))fail();
    }else if(r.finale!==null)fail();
  }
  function flags(v){return Array.isArray(v)&&v.length===4&&v.every(t=>typeof t==='boolean');}
  function hydrate(r,{createCity,restoreEconomy,applyMutation,Shot}){
    const {economy,...systems}=r.systems;
    const g={...systems,mode:r.phase,player:r.player.runtime,equipment:r.player.equipment,upgrades:r.player.upgrades,
      lives:r.lives,lifeLosses:r.lifeLosses,reviveClock:r.clocks.reviveTicks/60,offerState:r.rng.offers,
      fish:r.inventory.fish,xp:r.inventory.xp,rerollTokens:r.inventory.rerolls,scoreLedger:r.inventory.score,
      offered:r.inventory.upgradesPending,companyFish:r.inventory.companyFish,wildcard:r.wildcard,
      particles:[],damagePopups:[],pickupEffects:[],shake:0,wavePulse:0,bossFlash:0,magnetFlash:0,magnetSweepCount:0,magnetSweepFish:0,
      labEconomy:restoreEconomy(economy),victoryAge:3};
    g.longNight=pick(r,['id','mode','night','chapter','clocks','clears','encounters','finale','rng']);
    g.unseen=Object.assign(createCity(r.rng.city),r.city);
    const f=g.fishing={...r.fishing,nonce:r.rng.fishingNonce,awards:r.fishing.awardIds,resolved:r.fishing.resolvedOrdinals};
    g.unseen.solids.push(...f.spots.map(s=>s.water));
    const a=f.active;
    if(a)f.active={spot:f.spots[a.spotId],x:a.originX,y:a.originY,hp:a.originHp,age:a.age,committed:a.committed,
      id:a.ordinal,bait:a.bait,outcome:a.outcome,until:a.until,bite:a.bite};
    for(const key of ['enemies','shots','enemyShots','fishItems','powerups'])g[key]=r.actors[key].map(e=>e.state);
    if(g.mutationEcology)g.mutationEcology.corpses=r.actors.corpses.map(e=>e.state);
    const byId=new Map(g.enemies.map(e=>[e.id,e]));
    for(const e of g.enemies){
      if(e.mTarget?.corpse!==undefined)e.mTarget=g.mutationEcology.corpses[e.mTarget.corpse];
      if(e.mTarget?.fish!==undefined)e.mTarget=g.fishItems[e.mTarget.fish];
      e.applyMutation=applyMutation;
      if(e.mRetreat===-1)e.mRetreat=Infinity;
      if(e.cityGate!==undefined)e.cityGate=g.unseen.gates[e.cityGate];
      if(e.pack!==undefined)e.pack=byId.get(e.pack);
      if(e.retiredPack){e.pack=e.retiredPack;delete e.retiredPack;}
    }
    for(const s of g.shots){
      s.hit=s.hit.map(id=>byId.get(id)||{id});
      if(s.criticalMethod)Object.assign(s,Shot);
      delete s.criticalMethod;
    }
    const cat=m=>{
      const {workExact,...runtime}=m.runtime;
      const c={...runtime,type:m.role,level:m.level,work:workExact,food:m.food,energy:m.energy};
      if(m.components.length)c.components=m.components.map(cat);
      if(c.forage){const target=g.fishItems[c.forage.target];c.forage=target?{...c.forage,target}:null;}
      if(c.castTarget!==undefined)c.castTarget=byId.get(c.castTarget)||null;
      return c;
    };
    g.companionSquad=r.squad.map(cat);
    if(g.wildcard.rewardPost)g.wildcard.rewardPost=g.wildcard.posts?.find(p=>p.x===g.wildcard.rewardPost.x&&p.y===g.wildcard.rewardPost.y);
    return g;
  }
  root.CATA_CHECKPOINT={capture,validate,hydrate};
})(globalThis);

'use strict';
const assert=require('node:assert/strict');

module.exports=async function mutationFixtures(qa,api,mutants,media,company,imageDraws,step){
  const place=()=>{
    qa.start();
    const g=api.game;
    Object.assign(g.player,{x:1340,y:1340,inv:100,shots:100});
    g.enemies=[];g.director.budget=100;
    return g;
  };
  const keepStill={x:0,y:0};
  const spawn=(g,kind,x=1460,y=1340)=>{
    const e=api.mutationAPI.spawn({x,y},false);
    assert(e,'Fixture requires clear plaza space');
    if(kind)mutants.attach(g,e,kind);
    return e;
  };
  const behavior=(g,e)=>mutants.behavior(g,e,keepStill,api.mutationAPI);
  const advance=(g,e,time)=>{g.t+=time;return behavior(g,e);};
  {
    const g=place();
    g.t=26.1;g.campaign.night=3;
    step(.1);
    const e=g.enemies.find(e=>e.family);
    assert.equal(e.family,'mimic-stray','Normal LAB-mode loop admits the new ecology');
    assert(api.isTerrainClear(e.x,e.y,29));
    g.player.x=e.x-90;g.player.y=e.y;
    assert.equal(behavior(g,e).pace,0);
    assert.equal(e.mState,'reveal');assert(!mutants.contact(e));
    assert(advance(g,e,1).pace>3);assert(mutants.contact(e));
    advance(g,e,.27);
    const before=g.fishItems.reduce((n,f)=>n+f.value,0);
    e.hp=0;api.defeatEnemy(e);
    assert.equal(g.fishItems.reduce((n,f)=>n+f.value,0),before+2);
  }
  {
    const g=place(),e=spawn(g,'bell-ringer');
    advance(g,e,1.1);assert.equal(e.mState,'countdown');
    e.hp--;advance(g,e,1.31);assert.equal(e.mState,'interrupted');
    assert.equal(g.enemies.length,1);assert.equal(e.mUses,2);
    advance(g,e,.5);advance(g,e,4);advance(g,e,1.31);
    assert.equal(g.enemies.filter(n=>n.mRaised).length,2);assert.equal(e.mUses,1);
    // Use spaced points so overlap rejection cannot masquerade as the minion cap.
    for(const y of [1230,1290,1350,1410,1470])api.mutationAPI.spawn({x:1340,y},true);
    for(const x of [1100,1160,1220])api.mutationAPI.spawn({x,y:1340},true);
    assert.equal(g.enemies.filter(n=>n.mRaised).length,5);
  }
  {
    const g=place(),entry=api.mutationAPI.entry(true);
    assert(entry&&api.isTerrainClear(entry.x,entry.y,29));
    assert(Math.abs(entry.x-g.player.x)>844/2||Math.abs(entry.y-g.player.y)>390/2);
    assert.equal(api.mutationAPI.spawn({x:-5,y:-5},false),null);
    const e=spawn(g,'roof-pouncer');
    advance(g,e,1.1);assert.equal(e.mState,'landing-warning');
    assert(!mutants.contact(e));const landing=e.mTarget;
    g.player.y+=75;
    advance(g,e,.91);assert.equal(e.mState,'leap');assert(!mutants.contact(e));
    advance(g,e,.33);
    assert.equal(e.mState,'land');assert.deepEqual([e.x,e.y],[landing.x,landing.y]);
    assert(api.isTerrainClear(e.x,e.y,e.r));
  }
  {
    const g=place(),e=spawn(g,'necro-groomer'),victim=spawn(g,null,1460,1395);
    victim.hp=0;api.defeatEnemy(victim);
    advance(g,e,1.1);assert.equal(e.mState,'ritual');
    e.hp--;advance(g,e,1.21);assert.equal(g.mutationEcology.corpses.length,1);
    assert.equal(e.mState,'interrupted');
    advance(g,e,.5);advance(g,e,4);advance(g,e,1.21);
    assert.equal(g.mutationEcology.corpses.length,0);
    const revived=g.enemies.find(n=>n.mRaised);
    assert(revived);revived.hp=0;api.defeatEnemy(revived);
    assert.equal(g.mutationEcology.corpses.length,0);
  }
  {
    const g=place(),e=spawn(g,'pack-leader'),wing=spawn(g,null,1460,1395);
    wing.variant='orbiter';wing.traits={legs:'wings'};wing.traitAge=4.8;
    advance(g,e,1.1);assert.equal(e.mState,'rally');
    assert.equal(wing.pack,e);assert.equal(mutants.pack(g,wing).pace,0);
    advance(g,e,.71);assert(mutants.pack(g,wing).pace>2);
    e.hp=0;api.defeatEnemy(e);
    assert(mutants.pack(g,wing).pace<1);assert(!wing.pack);assert(wing.packScatter>g.t);
  }
  {
    const g=place(),e=spawn(g,'feral-fish-thief',1500);
    for(const existing of g.fishItems)existing.attracted=true;
    api.addFish(e.x,e.y,3);const fish=g.fishItems.at(-1);
    fish.reservedRole='angler';fish.reservedUntil=5;
    advance(g,e,1.1);assert.equal(e.mState,'prowl');assert(!company.steal(g,fish));
    fish.companionCollected=true;assert(!company.steal(g,fish));
    fish.companionCollected=false;fish.reservedUntil=0;
    advance(g,e,.3);assert.equal(e.mState,'snatch');
    g.fishing.active={committed:true,bait:'worm',spot:{x:e.x,y:e.y}};
    advance(g,e,.4);assert.equal(e.mState,'prowl');assert.equal(fish.value,3);
    g.fishing.active=null;advance(g,e,.3);advance(g,e,.4);
    assert.equal(e.mState,'escape');assert.equal(fish.value,1);
    assert.equal(g.fish,0);assert.equal(g.xp,0);
    assert.equal(company.diagnostics(g).fish.stolen,2);
    assert.equal(company.diagnostics(g).fish.balance,0);
    assert.equal(g.fishing.jackpot,0);
    e.hp=0;api.defeatEnemy(e);api.defeatEnemy(e);
    assert.equal(company.diagnostics(g).fish.stolen,1);
    assert.equal(company.diagnostics(g).fish.balance,0);
  }
  {
    const g=place(),a=spawn(g,'bell-ringer'),b=spawn(g,'necro-groomer',1460,1400);
    g.campaign.night=80;mutants.tick(g,api.mutationAPI);
    assert(a.mHybrid);assert(!g.enemies.includes(b));
    assert.equal(a.mState,'transition');
    advance(g,a,1.21);advance(g,a,1.1);advance(g,a,1.21);
    assert.equal(g.enemyShots.length,5);
    for(const guard of [false,true]){
      const bossGame=place(),boss=spawn(bossGame,null);
      boss.creditCategory='boss';boss.variant='boss';boss.max=100;boss.hp=50;
      bossGame.unseen.guardians[0]=guard;bossGame.campaign.night=80;
      mutants.tick(bossGame,api.mutationAPI);
      assert.equal(boss.family,guard?'patchwork-broodmother':'mourning-bell-sovereign');
      advance(bossGame,boss,1.21);advance(bossGame,boss,1.1);advance(bossGame,boss,1.21);
      assert.equal(bossGame.enemyShots.length,guard?0:8);
      if(guard)assert.equal(boss.mState,'charge');
      assert.equal(media.bedName(bossGame),'boss-bed');
    }
  }
  {
    const g=place();
    const a=api.spawnEnemy('orbiter',{labPurchase:true}),b=spawn(g,null);
    a.variant='orbiter';a.traits.legs='wings';Object.assign(a,{x:1460,y:1370});
    b.traits={legs:'feet',torso:'lean',arms:'claws',head:'single'};
    const cocoon=api.beginFusion(a,b);
    assert(cocoon);api.updateEvolution(4.1);
    assert(g.enemies.some(e=>e.mutant&&e.traits.legs==='wings'));
    const bell=spawn(g,'bell-ringer',1530,1310);
    advance(g,bell,1.1);advance(g,bell,.8);
    api.renderWorld();
    assert(imageDraws.some(args=>args[0]?.src?.includes('mutation-bell-ringer-swing.png')&&
      args.slice(1).every(Number.isFinite)),'Runtime draws indexed PNG at numeric world coordinates');
    assert.equal(media.bedName(g),'mutant-bed');
    g.fishing.active={committed:true};assert.equal(media.bedName(g),'fishing-bed');
    g.lives=1;g.player.hp=1;assert.equal(media.bedName(g),'last-life-bed');
  }
  {
    const g=place(),bell=spawn(g,'bell-ringer'),sources=[];
    const wait=()=>new Promise(resolve=>setImmediate(resolve));
    const ramp=()=>({value:1,setTargetAtTime(value){this.value=value;},cancelScheduledValues(){}});
    const fakeAudio={
      currentTime:0,
      createGain:()=>({gain:ramp(),connect(){},disconnect(){}}),
      createBufferSource(){
        const s={connect(){},disconnect(){},start(){sources.push(s);},stop(){this.stopped=true;this.onended();}};
        return s;
      },
      async decodeAudioData(data){
        assert.equal(Buffer.from(data).toString('ascii',0,4),'RIFF');
        return {duration:1};
      }
    };
    const score=fakeAudio.createGain();
    const sync=active=>media.sync(g,active,fakeAudio,{},score,{},()=>12);
    sync(true);advance(g,bell,1.1);sync(true);await wait();
    assert(sources.some(s=>s.loop));assert(sources.some(s=>!s.loop));
    bell.hp--;advance(g,bell,.1);sync(true);
    assert(sources.find(s=>!s.loop).stopped,'Interrupted warning releases cue');
    g.mode='paused';sync(false);
    assert(sources.every(s=>s.stopped),'Pause releases music and cues');
    g.mode='running';sync(true);await wait();
    assert.equal(sources.length,2,'Resume never replays an old warning');
    media.reset();
  }
  return [
    'live lab director admits collision-checked disguise, reveal, lunge and reward',
    'bell and ritual interrupt on damage; five-minion cap; revived corpse cannot recurse',
    'offscreen roof spawn, locked safe landing point and harmless warning/leap',
    'flying pack member rallies, charges and scatters',
    'fish reservation and courier flags, final charged bait distraction, atomic theft and refund',
    'Bell + Necro hybrid and two distinct district/guardian-dependent late evolutions',
    'inherited flying anatomy survives fusion; indexed mutant PNG canvas draw; music precedence',
    'WAV file buffers enter one audio context; interruption and pause stop voices; resume drops stale cue'
  ];
};

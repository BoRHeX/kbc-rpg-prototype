'use strict';
const assert=require('node:assert/strict');

module.exports=async function(qa,api,wildcard,media,company,step,sandbox,imageDraws){
  const originalSearch=sandbox.location.search;
  sandbox.location.search='?qa=nine-lives&seed=26';
  qa.start();
  const g=api.game,p=g.player,f=g.wildcard,wa=api.wildcardAPI;
  assert.equal(f.phase,'dormant','featured seed fits inherited terrain');
  for(const point of [...f.posts,f.archive,f.draft]){
    assert(api.isTerrainClear(point.x,point.y,33));
    assert(wa.line(p,point));
  }
  const advance=(t,dt=.05)=>{g.t=t;wildcard.tick(g,wa,dt);};
  advance(4);assert.equal(f.phase,'lighting');
  assert.equal(media.bedName(g),'festival-bed');
  api.renderWorld();
  for(const atlas of ['court','archivist','props']){
    assert(imageDraws.some(args=>args[0]?.src?.includes('wildcard-'+atlas+'-atlas.png')&&args.length===9));
  }
  const sources=[],decoded=[];
  const audio={
    currentTime:0,
    createGain:()=>({gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}}),
    createBufferSource(){
      return {connect(){},disconnect(){},start(){sources.push(this);},stop(){this.stopped=true;this.onended();}};
    },
    async decodeAudioData(data){
      const wav=Buffer.from(data);
      assert.equal(wav.toString('ascii',0,4),'RIFF');
      decoded.push(wav.length);
      return {duration:(wav.length-44)/48000};
    }
  };
  const sync=active=>media.sync(g,active,audio,{},{gain:{cancelScheduledValues(){},setTargetAtTime(){}}},{},()=>12);
  const wait=()=>new Promise(resolve=>setImmediate(resolve));
  sync(true);advance(4.8);sync(true);await wait();
  assert(sources.some(s=>s.loop&&s.buffer.duration===10));
  advance(8);
  Object.assign(p,f.archive);advance(8.1);assert(f.read);
  assert.equal(g.wildcardMedia.cue.name,'archivist-lore');
  sync(true);await wait();
  assert(sources.some(s=>!s.loop&&s.buffer.duration===.76));
  const loreVoice=sources.find(s=>s.buffer.duration===.76);
  g.wildcardMedia.cue={name:'event-reward',started:g.t};
  sync(true);await wait();
  assert(loreVoice.stopped,'fanfare preempts the existing event cue');
  assert.equal(sources.filter(s=>!s.loop&&!s.stopped).length,1);
  assert(sources.some(s=>!s.stopped&&s.buffer.duration===.91));
  g.wildcardMedia.cue={name:'fusion-pulse',started:g.t};
  sync(true);await wait();
  assert.equal(sources.filter(s=>!s.loop&&!s.stopped).length,1);
  sync(false);assert(sources.every(s=>s.stopped));
  sync(true);await wait();assert(sources.every(s=>s.stopped),'unmute drops the stale pulse');
  g.wildcardMedia.cue={name:'stage-shift',started:g.t};
  sync(true);sync(false);await wait();assert(sources.every(s=>s.stopped),'mute invalidates pending audio');
  assert(decoded.length>=2);
  const enemy=(point,props={})=>({x:point.x,y:point.y,hp:3,r:18,variant:'shambler',...props});
  g.enemies=Array.from({length:4},()=>enemy(f.draft));
  advance(9.05);assert.equal(g.enemies.filter(e=>e.wildcardDraft>g.t).length,2);
  Object.assign(p,f.posts[0]);advance(10,.45);
  Object.assign(p,f.archive);advance(10.1);
  Object.assign(p,f.posts[0]);advance(11,.45);assert.equal(f.stamps,0);
  advance(11.4,.4);assert.equal(f.stamps,1);
  advance(12);assert.equal(g.enemies.filter(e=>e.family==='mimic-stray').length,1);
  const mimic=g.enemies.find(e=>e.family==='mimic-stray');
  assert(wa.clear(mimic,23)&&wa.line(p,mimic));
  assert.equal(mimic.mRetreat,24);
  advance(13);assert.equal(g.enemies.filter(e=>e.family==='mimic-stray').length,1);
  const before=company.ledger(g).spawned;
  Object.assign(p,f.posts[1]);advance(13.8,.8);
  assert.equal(f.result,'success');assert.equal(company.ledger(g).spawned,before+2);
  const rewardScout={type:'scout',x:p.x,y:p.y};
  const rewardCourier={type:'courier',x:p.x,y:p.y};
  g.companionSquad=[rewardScout,rewardCourier];
  g.enemies=[enemy({x:p.x,y:p.y})];
  wildcard.pulse(g,wa,rewardCourier,rewardScout);
  assert.equal(f.pulses,1);
  assert.equal(g.wildcardMedia.cue.name,'event-reward','same-frame pulse preserves fanfare');
  advance(14,.8);assert.equal(company.ledger(g).spawned,before+2);
  advance(17);assert.equal(f.phase,'retired');

  qa.start();
  const link=api.game, hero=link.player;
  link.t=5;
  const scout={type:'scout',level:1,work:0,food:0,energy:20,nextWork:0,x:hero.x+10,y:hero.y};
  const courier={...scout,type:'courier',energy:70,x:hero.x-10};
  const mecha={...courier,type:'mecha',level:3,mechaStage:'fire',mechaClock:0,heat:0,shotTimer:0};
  link.companionSquad=[scout,courier,mecha];
  link.enemies=Array.from({length:5},(_,i)=>enemy({x:hero.x+45+i*10,y:hero.y},i===0?{cityGuardian:0}:{}));
  const marked=link.enemies[1];
  api.updateCompanyRole(scout,marked,0,1);
  api.updateMecha(mecha,marked,0,1);
  const slowed=()=>link.enemies.filter(e=>e.wildcardSlow>link.t);
  assert.equal(slowed().length,3);
  assert.equal(slowed()[0].wildcardSlow,6.25);
  assert(!link.enemies[0].wildcardSlow);
  assert.equal(link.wildcard.nextPulse,15);
  assert.equal(link.wildcardMedia.cue.name,'fusion-pulse');
  const delivered=units=>{
    courier.nextWork=0;
    api.addFish(hero.x,hero.y,units);
    api.updateCompanyRole(courier,null,0,1);
  };
  link.t=7;delivered(1);
  assert.equal(scout.food,1);assert.equal(slowed().length,0);
  link.t=15;delivered(1);
  assert.equal(scout.food,2);assert.equal(slowed().length,3);
  assert.equal(link.wildcard.pulses,2);
  link.t=25;delivered(1);
  assert.equal(link.wildcard.pulses,2);
  assert.equal(slowed().length,0,'night cap survives cooldown expiry');
  link.campaign.night++;
  for(const e of link.enemies)e.x+=200;
  wildcard.pulse(link,wa,mecha,scout);
  assert.equal(link.wildcard.nextPulse,25,'empty pulse spends no cooldown');
  for(const e of link.enemies)e.x-=200;
  wildcard.pulse(link,wa,mecha,scout);
  assert.equal(link.wildcard.pulses,1);
  assert.equal(slowed().length,3);
  wildcard.lifeLost(link);
  assert.equal(slowed().length,0);assert.equal(link.wildcard.nextPulse,35);

  qa.start();
  const expired=api.game;
  expired.player.inv=50;
  for(let i=0;i<400&&expired.t<8.1;i++)step(.05);
  assert.equal(expired.wildcard.phase,'listening','normal animation loop reaches the festival');
  const activeTime=expired.t;
  qa.pause();step(.3);assert.equal(expired.t,activeTime);
  qa.pause();
  Object.assign(expired.player,expired.wildcard.posts[0]);
  expired.t=44;wildcard.tick(expired,wa,.9);
  assert.equal(expired.wildcard.result,'timeout');
  assert.equal(expired.wildcard.stamps,0);
  qa.start();
  const departure=api.game;
  departure.t=4;wildcard.tick(departure,wa,.05);
  wildcard.tick(departure,{...wa,district:()=>1},.05);
  assert.equal(departure.wildcard.result,'left');
  qa.start();
  wildcard.lifeLost(api.game);
  assert.equal(api.game.wildcard.result,'lost');
  assert(api.game.wildcard.phase==='fading');
  qa.start();
  wildcard.init(api.game,{...wa,clear:()=>false},false);
  assert.equal(api.game.wildcard.phase,'blocked');
  wildcard.init(api.game,wa,true);
  assert.equal(api.game.wildcard.phase,'ineligible');
  let dormant=0,ineligible=0,blocked=0;
  for(let seed=0;seed<32;seed++){
    sandbox.location.search='?qa=nine-lives&seed='+seed;
    qa.start();
    const run=api.game,event=run.wildcard,hero=run.player;
    if(event.phase==='dormant'){
      dormant++;
      for(const point of [...event.posts,event.archive,event.draft]){
        assert.equal(wa.district(point),0);
        assert(wa.clear(point,33)&&wa.line(hero,point));
        assert(run.fishing.spots.every(spot=>Math.hypot(point.x-spot.x,point.y-spot.y)>100));
      }
    }else if(event.phase==='blocked')blocked++;
    else {
      assert.equal(event.phase,'ineligible');
      ineligible++;
    }
  }
  assert(dormant>0&&ineligible>dormant);
  sandbox.location.search=originalSearch;
  return [`32 seed placements (${dormant} dormant, ${blocked} blocked, ${ineligible} ineligible), timed lanterns, lore, capped gust and mimic, one two-fish award, timeout, departure and life-loss retirement`,
    'indexed festival PNG atlas draws, original audio bed, lore WAV, fanfare priority, cue cap and mute invalidation through shared media',
    'actual marked Mecha volley and committed Courier fish delivery, three-target cap, empty targets, expiry, cooldown, night cap and life cleanup'];
};

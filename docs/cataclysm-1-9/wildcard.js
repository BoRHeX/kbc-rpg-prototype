(() => {
  'use strict';
  const hash = n => {
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return (n ^ (n >>> 16)) >>> 0;
  };
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const eligible = (e,t) => e.hp>0 && ['shambler','weaver','stalker'].includes(e.variant) &&
    !e.family && !e.elite && !e.majorId && !e.cityGate && e.cityGuardian===undefined &&
    !e.mRaised && !e.pack && !(e.packScatter>t) && !e.mutant && !e.cocoon && !e.mutation && !e.fishingMutant;
  function cue(g,name){
    const previous=g.wildcardMedia.cue;
    // Companion work runs after the festival tick and can emit a pulse in the same frame.
    if(previous?.name==='event-reward'&&previous.started===g.t)return;
    g.wildcardMedia.cue={name,started:g.t};
  }
  const say = (g,text) => {g.wildcard.caption={text,until:g.t+4};};
  function init(g,api,stress){
    g.wildcardMedia={festivalActive:false,cue:null};
    const f=g.wildcard={phase:'ineligible',nextPulse:0,pulseNight:0,pulses:0};
    if(stress || hash(g.unseen.seed ^ 0x169c1de)%8!==0)return;
    const start=g.player, side=hash(g.unseen.seed ^ 0xc17de2)&1;
    for(const [dx,dy] of [[112,-64],[112,64],[138,-40],[138,40]]){
      const point=(x,y)=>({x:start.x+x,y:start.y+y});
      const posts=[point(dx,dy),point(-dx,dy)];
      const archive=point(0,dy*1.65), draft=point(side?-dx-60:dx+60,dy);
      if(![...posts,archive,draft].every(p=>api.district(p)===0 && api.clear(p,33) &&
        api.line(start,p) && g.fishing.spots.every(s=>distance(p,s)>100)))continue;
      Object.assign(f,{phase:'dormant',posts,archive,draft,draftSide:side,stamps:0,gust:-1});
      return;
    }
    f.phase='blocked';
  }
  function fade(g,result){
    const f=g.wildcard;
    f.phase='fading';f.result=result;f.fadeUntil=g.t+3;f.caption=null;
    g.wildcardMedia.festivalActive=false;g.wildcardMedia.cue=null;
    for(const e of g.enemies)e.wildcardDraft=0;
  }
  function clearLink(g){
    g.wildcard.pulse=null;
    for(const e of g.enemies)e.wildcardSlow=0;
  }
  function lifeLost(g){
    clearLink(g);
    const f=g.wildcard;
    if(['dormant','lighting','listening'].includes(f.phase))fade(g,'lost');
  }
  function tick(g,api,dt){
    const f=g.wildcard,t=g.t,p=g.player,d=api.district(p);
    if(d!==f.lastDistrict){clearLink(g);f.lastDistrict=d;}
    if(f.phase==='fading' && t>=f.fadeUntil)f.phase='retired';
    if(f.phase==='dormant' && t>=44){f.phase='retired';return;}
    if(f.phase==='dormant' && t>=4 && d===0){
      f.phase='lighting';g.wildcardMedia.festivalActive=true;
      cue(g,'stage-shift');
    }
    if(!['lighting','listening'].includes(f.phase))return;
    if(t>=44 || d!==0){fade(g,t>=44?'timeout':'left');return;}
    if(t<8)return;
    if(f.phase==='lighting'){
      f.phase='listening';cue(g,'stage-shift');
    }
    if(!f.pressureAttempted && t>=12){
      f.pressureAttempted=true;
      api.admit();
    }
    // The mural reading is optional and takes no input beyond approaching the cat.
    if(!f.read && distance(p,f.archive)<44){
      f.read=true;f.readAt=t;
      say(g,'Archivist · They took the chairs. I kept the places.');
      cue(g,'archivist-lore');
    }
    for(const post of f.posts){
      if(post.done)continue;
      post.hold=distance(p,post)<36?(post.hold||0)+dt:0;
      if(post.hold<.75)continue;
      post.done=true;f.stamps++;
      if(f.stamps===2){
        fade(g,'success');
        f.rewardPost=post;api.reward(post.x,post.y,2);cue(g,'event-reward');
        if(f.read)say(g,'Archivist · Leave her place lit. She likes to arrive late.');
        return;
      }
      cue(g,'stage-shift');
      if(g.companionSquad.some(c=>c.type==='scout'))
        say(g,'Scout · One lantern left. The striped ring quickens the dead.');
    }
    const cycle=(t-8)%6, gust=Math.floor((t-8)/6);
    if(cycle>=1 && f.gust!==gust){
      f.gust=gust;
      for(const e of g.enemies.filter(e=>eligible(e,t)&&!api.bypass(e)&&!(e.wildcardSlow>t) &&
        distance(e,f.draft)<52&&api.line(e,f.draft)).slice(0,2))e.wildcardDraft=t+1.25;
    }
  }
  function pulse(g,api,source,scout){
    const f=g.wildcard,t=g.t,night=g.campaign.night,d=api.district(source);
    if(!scout||source===scout||!g.companionSquad.includes(source)||!g.companionSquad.includes(scout)||
      t<f.nextPulse||(night===f.pulseNight&&f.pulses>=2)||!api.clear(source,0)||
      api.district(scout)!==d||api.district(g.player)!==d||distance(source,scout)>140||
      distance(source,g.player)>180||!api.line(source,scout)||!api.line(source,g.player))return;
    const targets=g.enemies.filter(e=>eligible(e,t)&&!api.bypass(e)&&!(e.wildcardDraft>t)&&
      distance(e,source)<=120&&api.district(e)===d&&api.line(source,e))
      .sort((a,b)=>distance(a,source)-distance(b,source)).slice(0,3);
    if(!targets.length)return;
    for(const e of targets)e.wildcardSlow=t+1.25;
    f.pulses=night===f.pulseNight?f.pulses+1:1;
    f.pulseNight=night;f.nextPulse=t+10;
    f.pulse={x:source.x,y:source.y,at:t};cue(g,'fusion-pulse');
  }
  window.CATA_WILDCARD={init,tick,pulse,lifeLost};
})();

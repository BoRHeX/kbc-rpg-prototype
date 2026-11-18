(() => {
  'use strict';
  const families = ['mimic-stray','bell-ringer','roof-pouncer','necro-groomer','pack-leader','feral-fish-thief'];
  const [mimic,bell,roof,necro,leader,thief] = families;
  const sovereign='mourning-bell-sovereign', brood='patchwork-broodmother';
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const direction=(a,b,pace)=>{
    const d=Math.max(1,distance(a,b));
    return {vx:(b.x-a.x)/d,vy:(b.y-a.y)/d,pace};
  };
  const stopped={vx:0,vy:0,pace:0};
  const lines={
    'mimic-reveal':'That fish has teeth!',
    'bell-countdown':'Hit the bell before it rings!',
    'roof-pounce':'Move out of the shadow!',
    'necro-ritual':'Break the ritual!',
    'pack-charge':'Break the pack. Hit the leader!',
    'fish-theft':'Get that fish back!',
    'boss-phase-escalation':'Keep moving. It changed its attack!'
  };
  function say(g,text,key=text){
    if(!text || (g.mutantSpeech?.until||0)>g.t || (g.mutationSpeechTimes?.[key]||0)>g.t)return;
    (g.mutationSpeechTimes ||= {})[key]=g.t+12;
    g.mutantSpeech={text:(g.companionSquad.length?'Crew: ':'Cat: ')+text,until:g.t+2.4};
  }
  function enter(g,e,state,seconds=0,cue=null){
    e.mState=state;e.mStart=g.t;e.mUntil=g.t+seconds;e.mHP=e.hp;
    if(cue){say(g,lines[cue]);g.mutationCue={cue,actor:e,started:g.t};}
  }
  function data(g){
    return g.mutationEcology ||= {corpses:[],next:0,serial:0,night:0,used:0,merged:false,boss:false};
  }
  function attach(g,e,kind){
    e.family=kind;e.mNext=g.t+1;e.mUses=kind===bell||kind===necro?2:0;
    enter(g,e,kind===mimic?'disguise':kind===roof?'perch':kind===thief?'prowl':'idle');
    return e;
  }
  function tick(g,api){
    const s=data(g),night=g.campaign.night;
    if(s.corpses.length)s.corpses=s.corpses.filter(c=>c.until>g.t);
    if(s.night!==night){s.night=night;s.used=0;s.merged=false;s.boss=false;}
    if(night<3||g.director.recovery>0||g.t<s.next)return;
    s.next=g.t+3;
    const actors=g.enemies.filter(e=>e.family);
    if(night>=18&&!s.boss&&!actors.some(e=>e.creditCategory==='boss')){
      const boss=g.enemies.find(e=>e.creditCategory==='boss'&&!e.finalWave&&!e.family);
      if(boss && boss.hp>0 && boss.hp<=boss.max*.65 && distance(boss,g.player)<290){
        const district=api.district(g.player);
        const kind=(district+Number(g.unseen.guardians[district]))%2?brood:sovereign;
        attach(g,boss,kind);boss.mUses=kind===brood?3:0;
        enter(g,boss,'transition',1.2,'boss-phase-escalation');s.boss=true;
      }
    }
    if(night>=15&&!s.merged&&!actors.some(e=>e.mHybrid)){
      const a=actors.find(e=>e.family===bell&&e.hp>0&&e.mState==='idle'&&e.mUses>0);
      const b=actors.find(e=>e.family===necro&&e.hp>0&&e.mState==='idle'&&e.mUses>0);
      if(a&&b&&distance(a,b)<150&&api.line(a,b)){
        g.enemies.splice(g.enemies.indexOf(b),1);
        a.threatCost+=b.threatCost;
        attach(g,a,sovereign);a.mHybrid=true;a.mUses=2;
        enter(g,a,'transition',1.2,'boss-phase-escalation');s.merged=true;
      }
    }
    if(s.used>=3||actors.length>=5)return;
    let offset=0;
    while(offset<families.length&&actors.some(e=>e.family===families[(s.serial+offset)%families.length]))offset++;
    if(offset===families.length)return;
    const kind=families[(s.serial+offset)%families.length];
    const spot=api.entry(kind===roof);
    if(!spot)return;
    const e=api.spawn(spot,false);
    if(!e)return;
    attach(g,e,kind);e.hp=e.max=kind===mimic?5:kind===thief?7:9;
    e.speed=kind===thief?145:100;e.damage=.8;
    s.serial+=offset+1;s.used++;
  }
  function death(g,e,api){
    if(e.mHeld)api.refund(e,Math.ceil(e.mHeld/2));
    if(e.family||e.mRaised||e.cityGate||e.cityGuardian!==undefined||
       e.majorId||e.cocoon||e.mutant||e.fishingMutant||e.elite||e.variant==='boss')return;
    const corpses=data(g).corpses;
    corpses.push({x:e.x,y:e.y,until:g.t+16});
    if(corpses.length>10)corpses.shift();
  }
  function corpse(g,e,api){
    return data(g).corpses.find(c=>distance(e,c)<220&&api.line(e,c));
  }
  function raise(g,e,api){
    const corpses=data(g).corpses,c=e.mTarget;
    if(!c||c.until<=g.t||!corpses.includes(c)||!api.spawn(c,true))return false;
    corpses.splice(corpses.indexOf(c),1);return true;
  }
  function contact(e){
    return !e.family || ['lunge','charge','land','phase-two','idle'].includes(e.mState);
  }
  function behavior(g,e,input,api){
    const p=g.player,d=distance(e,p),s=e.mState,k=e.family,done=g.t>=e.mUntil;
    const approach=(target,pace=1)=>direction(e,api.route(e,target),pace);
    if(k===mimic){
      if(s==='disguise'&&(d<110||e.hp<e.max)) {
        e.mTarget={x:p.x,y:p.y};enter(g,e,'reveal',.95,'mimic-reveal');
      }else if(s==='reveal'&&done){
        e.mDash=direction(e,e.mTarget,3.1);enter(g,e,'lunge',.26);
      }else if(s==='lunge'&&done)enter(g,e,'idle');
      if(e.mState==='lunge')return e.mDash;
      return e.mState==='idle'?approach(p,.85):stopped;
    }
    if(k===roof){
      if(s==='perch' && g.t>=e.mNext && d<api.roofRange){
        const target={x:p.x+input.x*84,y:p.y+input.y*84};
        e.mTarget=api.clear(target,e.r)&&api.line(p,target)?target:{x:p.x,y:p.y};
        enter(g,e,'landing-warning',.9,'roof-pounce');
      }else if(s==='landing-warning'&&done){
        e.mOrigin={x:e.x,y:e.y};enter(g,e,'leap',.32);
      }else if(s==='leap'){
        const a=Math.min(1,(g.t-e.mStart)/.32),o=e.mOrigin,t=e.mTarget;
        const pos={x:o.x+(t.x-o.x)*a,y:o.y+(t.y-o.y)*a};
        // The sprite may cross roofs while airborne. Its collision body stays in safe space.
        e.mAir=pos;
        if(done){
          e.mAir=null;
          if(api.clear(t,e.r)&&api.line(p,t)){e.x=t.x;e.y=t.y;enter(g,e,'land',.4);}
          else enter(g,e,'perch');
          e.mNext=g.t+7;
        }
      }else if(s==='land'&&done)enter(g,e,'perch');
      return s==='perch'&&d>api.roofRange?approach(p,.9):stopped;
    }
    if(k===thief){
      const cast=g.fishing?.active;
      const lure=cast?.committed&&cast.bait&&cast.bait!=='plain'&&distance(e,cast.spot)<200;
      if(s==='escape'){
        // Carry at most two units per encounter; retreat stays inside playable streets.
        if(done)return stopped;
        return approach(e.mTarget,1.45);
      }
      if(s==='snatch'){
        if(e.hp<e.mHP||lure)enter(g,e,'prowl');
        else if(done){
          const f=e.mTarget;
          const stolen=distance(e,f)<38?api.steal(g,f):0;
          if(stolen){
            e.mHeld=stolen;
            const retreat={x:e.x+(e.x-p.x)*2,y:e.y+(e.y-p.y)*2};
            e.mTarget=api.clear(retreat,e.r)&&api.line(e,retreat)?retreat:api.entry(false)||e;
            enter(g,e,'escape',3,'fish-theft');
          }else enter(g,e,'prowl');
        }
        return stopped;
      }
      if(lure)return approach(cast.spot,.55);
      if(g.t>=e.mNext){
        e.mNext=g.t+.25;e.mTarget=null;
        let best=260;
        for(const f of g.fishItems){
          const range=distance(e,f);
          if(range<best&&!f.attracted&&!f.companionCollected&&!(f.reservedRole&&f.reservedUntil>g.t)&&api.line(e,f)){
            best=range;e.mTarget=f;
          }
        }
      }
      if(e.mTarget&&g.fishItems.includes(e.mTarget)){
        if(distance(e,e.mTarget)<27){enter(g,e,'snatch',.38);return stopped;}
        return approach(e.mTarget,1.15);
      }
      return approach(p,.7);
    }
    if(k===leader){
      if(s==='idle'&&d<240&&g.t>=e.mNext){
        e.mTarget={x:p.x,y:p.y};e.mNext=g.t+5;
        for(const member of g.enemies.filter(n=>!n.family&&!n.majorId&&!n.cityGate&&n.cityGuardian===undefined&&
          !n.cocoon&&!n.mutant&&!n.fishingMutant&&!n.elite&&!n.mRaised&&!n.pack&&!n.consumed&&
          ['shambler','stalker','orbiter'].includes(n.variant)&&distance(n,e)<200).slice(0,3)){
          member.pack=e;member.packDash=direction(member,e.mTarget,2.3);
        }
        enter(g,e,'rally',.7,'pack-charge');
      }else if(s==='rally'&&done){e.mDash=direction(e,e.mTarget,2.6);enter(g,e,'charge',.42);}
      else if(s==='charge'&&done)enter(g,e,'dispersal',.55);
      else if(s==='dispersal'&&done)enter(g,e,'idle');
      return e.mState==='charge'?e.mDash:e.mState==='idle'?approach(p):stopped;
    }
    if(k===bell||k===necro){
      const toll=k===bell;
      if(s==='countdown'||s==='ritual'){
        if(e.hp<e.mHP||e.squadStun>0)enter(g,e,'interrupted',.45);
        else if(done){
          e.mUses--;
          if(toll){for(let i=0;i<2;i++)api.spawn({x:e.x+(i?42:-42),y:e.y+35},true);}
          else raise(g,e,api);
          enter(g,e,toll?'strike':'reanimate',toll?.28:.38,toll?'bell-strike':null);
        }
      }else if(s!=='idle'&&done)enter(g,e,'idle');
      else if(s==='idle'&&e.mUses>0&&g.t>=e.mNext&&d<290){
        e.mNext=g.t+4;
        e.mTarget=toll?null:corpse(g,e,api);
        if(toll||e.mTarget)enter(g,e,toll?'countdown':'ritual',toll?1.3:1.2,toll?'bell-countdown':'necro-ritual');
      }
      return e.mState==='idle'?approach(p,k===bell?.7:.85):stopped;
    }
    if(s==='transition'&&done){enter(g,e,'phase-two');e.mNext=g.t+1;}
    if(s==='phase-two'&&d<315&&g.t>=e.mNext){
      e.mNext=g.t+4.5;
      e.mTarget=(k===brood||e.mHybrid)&&e.mUses>0?corpse(g,e,api):null;
      if(k!==brood || e.mTarget){
        enter(g,e,'boss-warning',1.2,e.mTarget?'necro-ritual':'bell-countdown');
      }else{
        // Broodmother sweeps with a committed straight rush when there are no corpses.
        e.mDash=direction(e,p,2.4);enter(g,e,'boss-warning',1.2,'pack-charge');
      }
    }
    if(s==='boss-warning'){
      if(e.mTarget&&(e.hp<e.mHP||e.squadStun>0))enter(g,e,'phase-two');
      else if(done){
        if(e.mTarget){e.mUses--;raise(g,e,api);enter(g,e,'phase-two');}
        else if(k===brood)enter(g,e,'charge',.55);
        else{api.volley(e,e.mHybrid?5:8);enter(g,e,'phase-two',0,'bell-strike');}
      }
    }
    if(s==='charge'&&done)enter(g,e,'phase-two');
    return e.mState==='charge'?e.mDash:e.mState==='phase-two'?approach(p,.65):stopped;
  }

  function pack(g,e){
    const owner=e.pack;
    if(!owner)return null;
    if(owner.hp<=0||owner.consumed||!g.enemies.includes(owner)){
      e.pack=null;e.packScatter=g.t+.8;
      e.packDash=direction(owner,e,.75);
      return e.packDash;
    }
    if(owner.mState==='rally'||owner.mState==='idle'&&g.t-owner.mStart<.06)return stopped;
    if(owner.mState==='charge')return e.packDash;
    e.pack=null;return null;
  }
  window.CATA_MUTATIONS={tick,death,behavior,contact,pack,say,attach};
})();

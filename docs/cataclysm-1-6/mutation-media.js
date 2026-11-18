(() => {
  'use strict';
  let frames=null;
  const images=new Map(), decodes=new Map();
  fetch('./art/animated/mutation-frame-index.json').then(r=>r.json()).then(index=>{
    for(const [key,frame] of Object.entries(index.frames)){
      const image=new Image();image.src='./'+frame.path;images.set(key,image);
    }
    frames=index;
  }).catch(()=>{});
  function draw(ctx,g,e,reduced){
    const actor=frames?.actors[e.family];
    const state=e.mState==='boss-warning'||e.mState==='charge'&&!actor?.states.charge?'phase-two':e.mState;
    const sequence=actor?.states[state]||actor?.states[e.family==='mimic-stray'?'reveal':'idle'];
    if(!sequence)return;
    let elapsed=(g.t-e.mStart)*1000,key;
    for(const pose of sequence){
      key=pose.frame;
      if(pose.durationMs===null||elapsed<pose.durationMs)break;
      elapsed-=pose.durationMs;
    }
    const image=images.get(key);
    if(!image?.complete||!image.naturalWidth)return;
    const {pivotPx:[px,py],sizePx:[w,h]}=frames.frames[key],scale=actor.worldUnitsPerSpritePixel;
    const leap=e.mAir&&!reduced?Math.sin(Math.PI*Math.min(1,(g.t-e.mStart)/.32))*65:0;
    ctx.drawImage(image,e.x-px*scale+(e.mAir?e.mAir.x-e.x:0),
      (e.mAir?.y??e.y)+8-py*scale-leap,w*scale,h*scale);
  }

  const cues=new Map();
  let run=null, scoreOutput=null, generation=0, lastCue=null, pendingBed=null, requestedAt=0, bed=null;
  let lastShot=-10;
  const lastByName=new Map();
  const playing=new Set();
  function release(v,fade=0){
    if(!v||v.stopping)return;
    v.stopping=true;
    const now=v.ctx.currentTime;
    if(fade){v.gain.gain.setTargetAtTime(0,now,fade/4);}
    v.source.stop(now+fade);
  }
  function reset(){
    generation++;run=null;pendingBed=null;bed=null;lastCue=null;lastShot=-10;lastByName.clear();
    if(scoreOutput){
      const {gain,ctx}=scoreOutput,now=ctx.currentTime;
      gain.cancelScheduledValues(now);gain.setTargetAtTime(1,now,.04);
      scoreOutput=null;
    }
    for(const v of playing)release(v);
    cues.clear();
  }
  function buffer(ctx,name){
    if(!decodes.has(name))decodes.set(name,fetch('./audio/generated/mutation-'+name+'.wav').then(r=>{
      if(!r.ok)throw Error('Missing mutation audio');
      return r.arrayBuffer();
    }).then(b=>ctx.decodeAudioData(b)).catch(()=>null));
    return decodes.get(name);
  }
  function play(ctx,bus,b,level,loop){
    const source=ctx.createBufferSource(),gain=ctx.createGain(),v={source,gain,ctx,loop};
    source.buffer=b;source.loop=loop;source.connect(gain);gain.connect(bus);
    gain.gain.value=loop?0:level;
    if(loop)gain.gain.setTargetAtTime(level,ctx.currentTime,.11);
    playing.add(v);
    source.onended=()=>{playing.delete(v);cues.delete(v);source.disconnect();gain.disconnect();};
    source.start();return v;
  }
  function bedName(g){
    if(g.lives===1&&g.player.hp<=1.5)return 'last-life-bed';
    if(g.enemies.some(e=>e.variant==='boss'||e.mHybrid))return 'boss-bed';
    if(g.fishing?.active?.committed)return 'fishing-bed';
    if(g.enemies.some(e=>e.family||e.mutant||e.fishingMutant))return 'mutant-bed';
    if(g.director.budget>0&&g.director.aliveThreat/g.director.budget>.65)return 'pressure-bed';
    return null;
  }
  function sync(g,active,ctx,music,score,fx,fxSlots){
    if(!active){if(run)reset();return;}
    if(run!==g){reset();run=g;lastCue=g.mutationCue;scoreOutput=score?{gain:score.gain,ctx}:null;}
    const current=g.mutationCue,token=generation;
    const valid=()=>generation===token&&run===g&&g.mode==='running'&&!document.hidden;
    for(const [voice,cue] of cues){
      if((cue.cue==='bell-countdown'||cue.cue==='necro-ritual')&&
        (!g.enemies.includes(cue.actor)||cue.actor.mState==='interrupted'||
         cue.actor.mStart!==cue.started))release(voice,.08);
    }
    if(current&&current!==lastCue){
      lastCue=current;
      const name=current.cue;
      if(g.t-lastShot>=.09&&g.t-(lastByName.get(name)??-10)>=.75){
        lastShot=g.t;lastByName.set(name,g.t);
        buffer(ctx,name).then(b=>{
          if(!b||!valid()||g.t-current.started>.45||!g.enemies.includes(current.actor)||
            current.actor.mStart!==current.started)return;
          const urgent=!['necro-ritual','pack-charge','fish-theft'].includes(name);
          if(urgent&&cues.size>=3){
            const lower=[...cues].find(([,c])=>['necro-ritual','pack-charge','fish-theft'].includes(c.cue));
            if(lower){release(lower[0]);cues.delete(lower[0]);}
          }
          const limit=urgent?3:2;
          if(cues.size>=limit||cues.size>=fxSlots())return;
          cues.set(play(ctx,fx,b,.55,false),current);
          if(urgent&&score){
            const now=ctx.currentTime;
            score.gain.cancelScheduledValues(now);
            score.gain.setTargetAtTime(.67,now,.035);
            score.gain.setTargetAtTime(1,now+.45,.12);
          }
        });
      }
    }
    const want=bedName(g);
    if(pendingBed!==want){pendingBed=want;requestedAt=g.t;}
    if(g.t-requestedAt<.75||(bed?.name??null)===want)return;
    if(bed){release(bed,.45);bed=null;}
    if(!want||[...playing].filter(v=>v.loop).length>=2)return;
    const requested=requestedAt;
    if(sync.loading?.token===token&&sync.loading?.requested===requested)return;
    const loading={token,requested};sync.loading=loading;
    buffer(ctx,want).then(b=>{
      if(sync.loading===loading)sync.loading=null;
      if(!b||!valid()||requestedAt!==requested||pendingBed!==want||bed)return;
      bed=play(ctx,music,b,.46,true);bed.name=want;
    });
  }
  window.CATA_MUTATION_MEDIA={draw,sync,reset,bedName,fxCount:()=>cues.size};
})();

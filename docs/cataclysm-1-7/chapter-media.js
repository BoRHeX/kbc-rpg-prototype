/* Chapter artwork and two bounded Web Audio channels. */
'use strict';
(function(root){
  const manifest=root.CATA_CHAPTER_FRAMES;
  const images=new Map();
  const cache=new Map();
  let loopKey=null, loopVoice=null, cueKey=null, cueVoice=null, playedCue=null;
  let loopRevision=0, cueRevision=0;

  function image(key){
    const frame=manifest?.frames[key];
    if(!frame)return null;
    if(!images.has(key)){
      const asset=new Image();
      asset.src='./'+frame.path;
      images.set(key,asset);
    }
    const asset=images.get(key);
    return asset.complete&&asset.naturalWidth ? asset : null;
  }

  function draw(ctx,key,x,y,w,h,fit='contain'){
    const asset=image(key);
    if(!asset)return false;
    const scale=(fit==='cover'?Math.max:Math.min)(w/asset.naturalWidth,h/asset.naturalHeight);
    const width=asset.naturalWidth*scale,height=asset.naturalHeight*scale;
    ctx.drawImage(asset,x+(w-width)/2,y+(h-height)/2,width,height);
    return true;
  }

  function buffer(context,key){
    if(!cache.has(key)){
      const pending=fetch('./'+manifest.audio[key].path).then(response=>{
        if(!response.ok)throw Error('Chapter audio '+response.status);
        return response.arrayBuffer();
      }).then(bytes=>context.decodeAudioData(bytes));
      cache.set(key,pending);
    }
    return cache.get(key);
  }

  function play(context,bus,clip,loop,level){
    const source=context.createBufferSource(),gain=context.createGain(),now=context.currentTime;
    source.buffer=clip;
    source.loop=loop;
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(level,now+.09);
    source.connect(gain);
    gain.connect(bus);
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.start();
    return source;
  }

  function sync(context,bus,chapter,cue){
    const next=manifest?.chapters[chapter-1]?.loop||null;
    if(next!==loopKey){
      loopVoice?.stop();
      loopVoice=null;
      loopKey=next;
      const revision=++loopRevision;
      if(next){
        for(const key of cache.keys())if(key.startsWith('chapter-')&&key!==next)cache.delete(key);
        buffer(context,next).then(clip=>{
          if(revision===loopRevision)loopVoice=play(context,bus,clip,true,.22);
        }).catch(()=>{});
      }
    }
    if(!next||cue!==cueKey){
      cueVoice?.stop();
      cueVoice=null;
      cueKey=next?cue:null;
      const revision=++cueRevision;
      if(next&&cue&&cue!==playedCue){
        buffer(context,cue.name).then(clip=>{
          if(revision!==cueRevision)return;
          cueVoice=play(context,bus,clip,false,.35);
          playedCue=cue;
          const source=cueVoice;
          const cleanup=source.onended;
          source.onended=()=>{
            cleanup();
            if(cueVoice===source)cueVoice=null;
          };
        }).catch(()=>{});
      }
    }
  }

  root.CATA_CHAPTER_MEDIA={manifest,draw,image,sync};
})(globalThis);

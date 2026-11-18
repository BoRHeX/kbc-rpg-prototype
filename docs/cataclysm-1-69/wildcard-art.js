(() => {
  'use strict';

  let index;
  const images = new Map();

  fetch('./art/animated/wildcard-frame-index.json').then(response => {
    if (!response.ok) throw Error('Missing Wild Card frame index');
    return response.json();
  }).then(data => {
    for (const [name, atlas] of Object.entries(data.atlases)) {
      const image = new Image();
      image.src = './' + atlas.path;
      images.set(name, image);
    }
    index = data;
  }).catch(() => {});

  function draw(ctx, frame, x, y, scale = 1) {
    const entry = index?.frames[frame];
    if (!entry) return false;
    const image = images.get(entry.atlas);
    if (!image?.complete || !image.naturalWidth) return false;
    const [sx, sy, sw, sh] = entry.atlasRectPx;
    const [px, py] = entry.pivotPx;
    const [width, height] = entry.sizePx;
    const factor = entry.worldUnitsPerSpritePixel * scale;
    ctx.drawImage(image, sx, sy, sw, sh, x - px * factor, y - py * factor,
      width * factor, height * factor);
    return true;
  }

  function drawArchivist(ctx, state, elapsedMs, x, y, scale = 1) {
    const states = index?.actors.archivist;
    if (!states) return false;
    const { mode, sequence } = states[state] || states.idle;
    let elapsed = Math.max(0, elapsedMs);
    if (mode === 'loop') {
      elapsed %= sequence.reduce((duration, pose) => duration + pose.durationMs, 0);
    }
    for (const pose of sequence) {
      if (pose.durationMs === null || elapsed < pose.durationMs) {
        return draw(ctx, pose.frame, x, y, scale);
      }
      elapsed -= pose.durationMs;
    }
    return false;
  }

  function ring(ctx,p,r,color,width){
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }

  function drawWorld(ctx,g,reduced){
    const f=g.wildcard,t=g.t;
    if(['lighting','listening','fading'].includes(f.phase)){
      const a=f.archive, wave=reduced?0:Math.sin(t*3);
      ctx.save();
      ctx.globalAlpha=f.phase==='fading'?Math.max(0,(f.fadeUntil-t)/3):Math.min(1,(t-4)*2);
      draw(ctx,'plaza',a.x,a.y+135,.9);
      draw(ctx,'court-mural',a.x,a.y-29,.75);
      draw(ctx,'mural',a.x-62,a.y-13,.68);
      draw(ctx,'stall',a.x+75,a.y-15,.58);
      for(const side of [-1,1]){
        const x=a.x+side*55,y=a.y-30+side*wave*6;
        const light=ctx.createRadialGradient(x,y,6,x,y,92);
        light.addColorStop(0,side<0?'#66ffe568':'#e591ff65');
        light.addColorStop(1,'#a389ff00');
        ctx.fillStyle=light;ctx.fillRect(x-92,y-92,184,184);
      }
      draw(ctx,'lanterns',a.x-55,a.y-32+wave*4,1.25);
      draw(ctx,'lanterns',a.x+55,a.y-32-wave*4,1.25);
      const near=f.posts.some(p=>!p.done&&p.hold>0);
      const reading=f.readAt!==undefined&&t-f.readAt<4;
      drawArchivist(ctx,near?'ward':reading||f.phase==='lighting'?'read':'idle',
        reading?(t-f.readAt)*1000:(t-4)*1000,a.x,a.y,1.15);
      for(const p of f.posts){
        draw(ctx,'rune',p.x,p.y,1.1);
        ring(ctx,p,36,p.done?'#fff2a6':'#8bfff4',2);
        if(!p.done&&p.hold>0){
          ctx.beginPath();ctx.arc(p.x,p.y,36,-Math.PI/2,-Math.PI/2+Math.PI*2*p.hold/.75);
          ctx.strokeStyle='#fff2a6';ctx.lineWidth=5;ctx.stroke();
        }
        if(p===f.rewardPost)draw(ctx,'reward',p.x,p.y-24,.85);
      }
      if(f.phase==='listening'){
        ctx.setLineDash([5,6]);
        ring(ctx,f.draft,52,(t-8)%6<1?'#ffab7b':'#b078ae',3);
        ctx.setLineDash([]);
        draw(ctx,'street-rune',f.draft.x,f.draft.y,.46);
      }
      ctx.restore();
    }
    if(g.mode==='running'&&f.pulse&&t-f.pulse.at<.45){
      const progress=(t-f.pulse.at)/.45;
      ctx.save();ctx.globalAlpha=1-progress;
      draw(ctx,'resonance',f.pulse.x,f.pulse.y,1.2);
      ring(ctx,f.pulse,reduced?120:25+95*progress,'#8bfff4',4);
      ctx.restore();
    }
  }

  window.CATA_WILDCARD_ART = {draw,drawArchivist,drawWorld};
})();

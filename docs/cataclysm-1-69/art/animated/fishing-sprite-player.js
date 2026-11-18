/* Pass03 reference adapter. Does not install gameplay hooks or a second hero. */
(function(root){
  'use strict';
  class FishingSpritePlayer {
    constructor(index,images){this.index=index;this.images=images;}
    static async load(base='./',mobile=true){
      const response=await fetch(base+'art/animated/fishing-frame-index.json');
      if(!response.ok)throw Error('Fishing frame index unavailable');
      const index=await response.json(),images={};
      await Promise.all(Object.entries(index.sheets).map(async([id,sheet])=>{
        const image=new Image(); image.src=base+(mobile?sheet.mobile.path:sheet.path);
        await image.decode();images[id]={image,scale:mobile?.5:1};
      }));
      return new FishingSpritePlayer(index,images);
    }
    draw(ctx,state,seconds,x,y,width=64,reducedMotion=false){
      const anim=this.index.animations[state];if(!anim)return false;
      const sheet=this.index.sheets[anim.sheet],loaded=this.images[anim.sheet];if(!loaded)return false;
      const total=anim.durations_ms.reduce((a,b)=>a+b,0);
      let t=Math.max(0,seconds*1000);t=anim.loop?t%total:Math.min(t,total-.001);
      let at=0;while(at<anim.frames.length-1 && t>=anim.durations_ms[at])t-=anim.durations_ms[at++];
      const frameId=reducedMotion?anim.reduced_motion_frame:anim.frames[at];
      const frame=sheet.frames.find(f=>f.id===frameId);const r=frame.rect.map(n=>n*loaded.scale);
      const transform=!reducedMotion&&anim.derived_transform?anim.derived_transform[at]:{scale:1,alpha:1};
      const w=width*(transform.scale||1),h=w*frame.rect[3]/frame.rect[2];
      ctx.save();ctx.globalAlpha*=transform.alpha??1;
      ctx.drawImage(loaded.image,...r,x-w*frame.pivot[0],y-h*frame.pivot[1],w,h);ctx.restore();return true;
    }
    // Physics/VFX primitive, explicitly NOT an illustrated character or painted line.
    static drawLine(ctx,tip,target,slack=5){
      ctx.save();ctx.lineWidth=1;ctx.strokeStyle='rgba(233,244,239,.8)';
      ctx.beginPath();ctx.moveTo(tip.x,tip.y);
      ctx.quadraticCurveTo((tip.x+target.x)/2,(tip.y+target.y)/2+slack,target.x,target.y);
      ctx.stroke();ctx.restore();
    }
  }
  root.FishingSpritePlayer=FishingSpritePlayer;
})(typeof window==='undefined'?globalThis:window);

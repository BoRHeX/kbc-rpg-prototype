/* Complete cats extracted from the creator-approved illustration. No body rig. */
(function(root){
  'use strict';
  const base = new URL('./art/illustrated/', document.currentScript.src);
  const names = ['idle','joy','walk','sprint','crouch','pounce','startled','hurt','feral','adrenaline','sleep'];
  const images = Object.create(null);
  const ready = Promise.all(names.map(name => new Promise((resolve,reject) => {
    const image = images[name] = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(Error('Illustrated cat failed to load: '+name));
    image.src = new URL(name+'.png', base).href;
  })));
  ready.catch(()=>{});
  function select(state,time,moving,effect,speedRatio,reduced){
    if(state==='hit')return 'hurt';
    if(state==='recover')return 'crouch';
    if(effect==='feral')return 'feral';
    if(effect==='adrenaline')return moving?'pounce':'adrenaline';
    if(moving){
      if(reduced)return 'walk';
      const frames=speedRatio>1.2?['walk','sprint','walk','pounce']:['walk','idle','walk','sprint'];
      return frames[Math.floor(time*9)%frames.length];
    }
    return 'idle';
  }
  function draw(ctx,r,time,state,moving,effect,pose,reduced,aim){
    const name=select(state,time,moving,effect,pose?.speedRatio||0,reduced);
    const image=images[name];
    if(!image.complete||!image.naturalWidth)return -1;
    const facing=pose?.headingX??Math.cos(aim);
    const scale=r/80;
    ctx.save();
    ctx.scale(facing<-.1?-scale:scale,scale);
    // All feet share the same anchor; never rotate the quadruped toward targets.
    ctx.drawImage(image,-144,-211+24/scale,288,224);
    ctx.restore();
    return names.indexOf(name);
  }
  root.CATA_HERO_ILLUSTRATED=Object.freeze({ready,draw,select});
})(globalThis);

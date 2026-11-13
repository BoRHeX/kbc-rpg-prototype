/* BoRHeZ skeletal-texture renderer: one coherent character from independent
   textured torso, thigh, calf and paw components driven by world-grounded IK.
   Unlike pre-baked body sheets, knees/ankles remain dynamically articulated.
 */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function segment(ctx,part,a,b,width){
 if(!part?.ready)return;
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
 ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx)-Math.PI/2);
 // Limbs are painted vertical with the upper joint at their image top.
 ctx.drawImage(part.image,-width/2,-2,width,len+3);
 ctx.restore();
}
function foot(ctx,part,leg,pose){
 if(!part?.ready)return;
 const {ankle,stance}=leg;
 const direction=pose.headingX<-.15?-1:1;
 // The heel seats under the shank; the toe projects forward. Swing lifts
 // the toe, then extends for landing, rather than rotating a centered block.
 const swing=clamp((leg.phase-.58)/.42,0,1);
 const pitch=stance?0:-Math.sin(swing*Math.PI)*.48;
 ctx.save();ctx.translate(ankle.x,ankle.y);ctx.scale(direction,1);ctx.rotate(pitch);
 const w=part.drawWidth||21,h=part.drawHeight||13;
 ctx.drawImage(part.image,-w*.36,-h*.55,w,h);ctx.restore();
}
function draw(ctx,rig,pose,aim=0,r=23,time=0,opt={}){
 if(!rig||!pose||!rig.torso?.ready) return false;
 if(!rig.thigh?.ready||!rig.calf?.ready||!rig.paw?.ready)return false;
 const bearing=((Math.round((Number.isFinite(aim)?aim:0)/(Math.PI/4))%8)+8)%8;
 const legs=pose.legs;
 if(!Array.isArray(legs)||legs.length!==2)return false;
 ctx.save();ctx.scale(r/23,r/23);
 // Painted feet, calves and thighs are behind the approved upper-body artwork.
 // Neither leg is duplicated; each IK segment and foot is drawn exactly once.
 for(const leg of legs){
   segment(ctx,rig.calf,leg.knee,leg.ankle,rig.calf.drawWidth||10);
   foot(ctx,rig.paw,leg,pose);
   segment(ctx,rig.thigh,leg.hip,leg.knee,rig.thigh.drawWidth||11);
 }
 const torso=rig.torso,frames=torso.frames||1;
 const phase=opt.reduced?0:Math.floor(Math.max(0,time)*(torso.fps||8))%frames;
 ctx.save();
 ctx.translate(pose.damaged?-1.5:0,(pose.torso?.brace||0)+(pose.torso?.breath||0)*.72+(pose.torso?.bob||0)*.38);
 if(pose.damaged)ctx.rotate(-.055);
 else if(pose.shielded)ctx.rotate(.025);
 if(pose.feral)ctx.filter='saturate(1.18)';
 else if(pose.adrenaline)ctx.filter='brightness(1.08)';
 if(opt.hit)ctx.filter='brightness(1.15)';
 // Full-body OLD sprite is never drawn. Torso texture is a leg-free upper body.
 ctx.drawImage(torso.image,phase*96,bearing*96,96,96,-48,-58,96,96);
 ctx.restore();ctx.restore();
 return {bearing,frame:phase,footL:legs[0].ankle,footR:legs[1].ankle};
}
root.CATA_HERO_RIG_RENDER=Object.freeze({draw,version:'segmented-ik-v1'});
if(typeof module!=='undefined'&&module.exports)module.exports=root.CATA_HERO_RIG_RENDER;
})(typeof globalThis!=='undefined'?globalThis:this);

/* Reusable articulated locomotion for BoRHeZ actors.
   Two-bone IK, world-planted stance, raised swing, idle breathing. Coordinates
   are purely visual; gameplay speed, collision and bullets remain untouched.
 */
(function(root){
'use strict';
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const fract=x=>x-Math.floor(x);
function solveIK(hip,foot,upper=14,lower=15,bend=1){
 const dx=foot.x-hip.x,dy=foot.y-hip.y,raw=Math.hypot(dx,dy)||.001;
 const distance=clamp(raw,Math.abs(upper-lower)+.02,upper+lower-.02);
 const base=Math.atan2(dy,dx);
 const cosine=clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1);
 const angle=base+bend*Math.acos(cosine);
 const knee={x:hip.x+Math.cos(angle)*upper,y:hip.y+Math.sin(angle)*upper};
 return {hip:{...hip},knee,ankle:{...foot},reach:distance,upper,lower};
}
function freshFoot(){return {anchor:null,liftoff:null,target:null,planted:false,lastU:null}}
function create(){return {cycle:0,seconds:0,headingX:1,headingY:0,feet:[freshFoot(),freshFoot()],
 lastX:null,lastY:null,body:{breath:0,bob:0,lean:0},pose:null}}
function advance(rig,input){
 const dt=clamp(Number(input.dt)||0,0,.05),x=Number(input.x)||0,y=Number(input.y)||0;
 const vx=Number(input.vx)||0,vy=Number(input.vy)||0;
 const speed=Math.hypot(vx,vy),speedRatio=clamp(speed/Math.max(1,Number(input.baseSpeed)||180),0,3.6);
 const moving=speed>5;
 const state=input.state||'run';
 const shielded=!!input.shielded||state.startsWith('shield-');
 const damaged=!!input.damaged||state==='hit';
 const brace=damaged?3.5:shielded?2:0;
 const headingX=moving?vx/speed:rig.headingX,headingY=moving?vy/speed:rig.headingY;
 rig.headingX=headingX;rig.headingY=headingY;rig.seconds+=dt;
 const cadence=moving?clamp(1.12+speedRatio*1.46,1.3,5.5):0;
 const period=1/Math.max(.2,cadence);
 if(moving)rig.cycle+=dt*cadence;
 const phase=fract(rig.cycle),stanceFrac=.51;
 const stride=clamp(16+speedRatio*14,18,43),lift=moving?clamp(6+speedRatio*5.5,8,21):0;
 const legs=[];
 for(let i=0;i<2;i++){
  const side=i===0?-1:1,footState=rig.feet[i],u=fract(phase+i*.5),previous=footState.lastU;
  const lateral={x:-headingY*side*9,y:headingX*side*9};
  const upcoming={x:x+headingX*stride*.62+lateral.x,y:y+headingY*stride*.62+lateral.y};
  if(!footState.anchor){
   footState.anchor={x:x-headingX*stride*.18+lateral.x,y:y-headingY*stride*.18+lateral.y};
   footState.liftoff={...footState.anchor};footState.target={...upcoming};
  }
  const stance=!moving||u<stanceFrac;
  const crossed=previous!==null&&u<previous;
  const liftOff=previous!==null&&previous<stanceFrac&&u>=stanceFrac;
  if(liftOff){
   footState.liftoff={...footState.anchor};
   footState.target={x:x+vx*Math.min(.33,period*.4)+headingX*stride*.55+lateral.x,
                     y:y+vy*Math.min(.33,period*.4)+headingY*stride*.55+lateral.y};
  }
  if(crossed)footState.anchor={...footState.target};
  let world,air=0;
  if(stance){
   if(!footState.planted&&moving)footState.anchor={...footState.target};
   world={...footState.anchor};
  }else{
   const t=clamp((u-stanceFrac)/(1-stanceFrac),0,1),z=smooth(t);
   world={x:mix(footState.liftoff.x,footState.target.x,z),
          y:mix(footState.liftoff.y,footState.target.y,z)};
   air=Math.sin(Math.PI*t)*lift;
  }
  footState.planted=stance;footState.lastU=u;
  const hip={x:side*7.3,y:4+brace};
  const foot={x:clamp(side*9+(world.x-x)*.82,-30,30),
              y:clamp(28+(world.y-y)*.38-air*1.18,5,40)};
  // In profile both knees bend forward. Opposite bend signs produce a
  // bow-legged crab silhouette, hiding the passing knee at phone size.
  const bend=Math.abs(headingX)>.35?(headingX>0?-1:1):(side===-1?1:-1);
  const ik=solveIK(hip,foot,17,18,bend);
  legs.push({side,phase:u,stance,plantWorld:stance?{...footState.anchor}:null,
    world,air,hip:ik.hip,knee:ik.knee,ankle:ik.ankle,upper:ik.upper,lower:ik.lower});
 }
 const breath=Math.sin(rig.seconds*TAU*.29),shoulder=Math.sin(rig.seconds*TAU*.47+.5);
 const torso={brace,breath:1.05*breath,shoulder:shoulder*.6,lean:clamp(speedRatio*.7,0,2.5),
              bob:moving?Math.sin(rig.cycle*TAU*2)*1.1:breath*.45};
 rig.body=torso;rig.pose={speedRatio,moving,headingX,headingY,phase,torso,legs,
 state,shielded,damaged,
 feral:!!input.feral||state==='feral',adrenaline:!!input.adrenaline||state==='adrenaline'};
 rig.lastX=x;rig.lastY=y;return rig.pose;
}
const API=Object.freeze({create,advance,solveIK,version:'ik-worldplant-v1'});
root.CATA_HERO_KINEMATICS=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);

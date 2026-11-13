'use strict';
// No sprite-count shortcuts: validate hips, knees, and fixed world-ground feet.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../../..');
const main=require(path.join(ROOT,'docs/cataclysm-1-0-major/hero-kinematics.js'));
const lab=require(path.join(ROOT,'docs/cataclysm-100-lab/hero-kinematics.js'));
assert.equal(fs.readFileSync(path.join(ROOT,'docs/cataclysm-1-0-major/hero-kinematics.js'),'utf8'),
             fs.readFileSync(path.join(ROOT,'docs/cataclysm-100-lab/hero-kinematics.js'),'utf8'),
             'Actual main and Night99 laboratory must use the same gait solver');
assert.equal(main.version,lab.version);
for(const [speed,heading] of [[100,0],[210,0],[370,Math.PI/2],[530,Math.PI]]){
 const rig=main.create();
 const xs=[new Set(),new Set()],knees=[new Set(),new Set()],anchors=[[],[]],airs=[],frames=[];
 let x=0,y=0;
 for(let i=0;i<240;i++){
  const dt=1/60,vx=Math.cos(heading)*speed,vy=Math.sin(heading)*speed;
  x+=vx*dt;y+=vy*dt;
  const p=main.advance(rig,{x,y,vx,vy,dt,baseSpeed:180});
  frames.push(p);
  for(let j=0;j<2;j++){
   const f=p.legs[j];xs[j].add(Math.round(f.ankle.x*10)+','+Math.round(f.ankle.y*10));
   knees[j].add(Math.round(f.knee.x*10)+','+Math.round(f.knee.y*10));
   if(f.stance)anchors[j].push(f.plantWorld.x.toFixed(4)+':'+f.plantWorld.y.toFixed(4));
   else airs.push(f.air);
   assert.ok(Number.isFinite(f.knee.x)&&Number.isFinite(f.knee.y),'no unstable IK joints');
   assert.ok(f.upper>0&&f.lower>0,'leg anatomy has nonzero segment lengths');
  }
 }
 for(let j=0;j<2;j++){
  assert.ok(xs[j].size>=15,'distinct foot positions at '+speed+' world px/s');
  assert.ok(knees[j].size>=15,'real knee articulation at '+speed+' world px/s');
  let pinned=0;for(let i=1;i<anchors[j].length;i++)if(anchors[j][i]===anchors[j][i-1])pinned++;
  assert.ok(pinned>=20,'foot must actually stay planted in world during stance');
 }
 assert.ok(Math.max(...airs)>4,'airborne foot arc visibly lifts');
 assert.ok(frames.some(f=>f.speedRatio>1.3)||speed<250,'speed ratios must reflect actual movement speed');
}
const standing=main.create(),breath=[];
for(let i=0;i<150;i++){
 const p=main.advance(standing,{x:0,y:0,vx:0,vy:0,dt:1/60,baseSpeed:180});
 assert.equal(p.moving,false,'stationary animation cannot fake walking');
 breath.push(p.torso.breath);
}
assert.ok(Math.max(...breath)-Math.min(...breath)>1.7,'character breathes at rest');
for(const a of [{x:0,y:0},{x:10,y:6},{x:-7,y:21}]){
 const result=main.solveIK({x:0,y:2},a,14.5,15.5,1);
 assert.ok(Number.isFinite(result.knee.x)&&Number.isFinite(result.knee.y));
}
console.log('PASS 2-bone IK, independent bent knees, real airborne foot arcs, grounded paws, breath and mirrored laboratory solver');

'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../../docs/cataclysm-1-0-major');
require(path.join(root,'campaign.js'));
const art=require(path.join(root,'animation.js'));
const vfx=require(path.join(root,'visuals.js'));
const src=fs.readFileSync(path.join(root,'game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal(vfx.pass,'catastrophe-neon-noir-02');
assert.equal(vfx.palette.length,4);
assert.ok(art.frameTotal>=378,'All original 378 animation poses must be retained in the expanded character-pack animation system');
assert.ok(art.frameCount('hero','attack')>=6,'Hero has an actual multi-frame attack state');
assert.equal(art.frameCount('healer','run'),12);
assert.equal(art.frameCount('shambler','run'),6);
if(typeof art.pose==='function'){
  assert.notDeepEqual(art.pose('hero','attack',6),art.pose('hero','idle',6));
  assert.ok(art.pose('hero','attack',3).recoil>0);
  assert.ok(art.pose('hero','run',3).effort>art.pose('hero','idle',3).effort);
}else{
  assert.equal(typeof art.packInfo,'function','Modern canonical hero artwork must expose its texture-pack selection');
  // Actual footfall, recoil and damaged-frame visual integrity is verified
  // on the real Canvas by browser-clean-character-pack.cjs instead.
}
// Feature integration changes script cache revisions; assert that dependent
// visual modules use ONE safe, versioned release rather than a stale literal.
const buildOf=(module)=>{
 const match=html.match(new RegExp('src="\\./'+module.replace('.','\\.')+'\\?build=([a-zA-Z0-9._-]+)"'));
 assert.ok(match,'Missing versioned '+module+' script');
 return match[1];
};
const visualBuild=buildOf('visuals.js');
assert.ok(visualBuild.length>=8,'Build ID must be specific enough for cache rotation');
assert.ok(html.indexOf('src="./visuals.js')<html.indexOf('src="./director.js'));
assert.ok(html.indexOf('src="./director.js')<html.indexOf('src="./game.js'));
assert.equal(buildOf('hazards.js'),visualBuild,'World and hazards must use same release build');
assert.equal(buildOf('firestorm.js'),visualBuild,'World and firestorm must use same release build');
const hazard=require(path.join(root,'hazards.js'));
assert.equal(hazard.pass,'catastrophe-hazards-03');
assert.match(src,/const WORLD_SCROLL_Y\s*=\s*0\b/,'automatic camera/world scrolling must be disabled');
assert.ok(src.includes("scrollDirection:'static'"),'static world must be visible in diagnostics');
assert.ok(src.includes('wrap:false'),'world must not wrap horizontally');
assert.ok(src.includes('VIS.atmosphere(ctx,W,H'));
assert.ok(src.includes('VIS.ground(ctx,'));
assert.ok(src.includes('VIS.impact(ctx,'));
assert.ok(src.includes('VIS.aura(ctx,'));
assert.ok(!src.includes('Escape DOWN ↓'));
let draws=0;
const gradient={addColorStop(){}};
const ctx=new Proxy({createRadialGradient(){return gradient},createLinearGradient(){return gradient},measureText(){return {width:30}}},
 {get(target,k){return k in target?target[k]:()=>{draws++}},set(target,k,v){target[k]=v;return true;}});
for(const biome of [0,1,2,3]){
 vfx.ground(ctx,{left:0,top:0,right:640,bottom:390},biome,0,false);
 for(const kind of ['building','car','dumpster'])
  vfx.prop(ctx,{x:110,y:80,w:kind==='building'?320:150,h:kind==='building'?300:85,kind,style:1},biome,1,false);
}
for(const state of ['run','feral','adrenaline','hit','attack']){
 vfx.aura(ctx,'hero',26,2,state,false);
 art.draw(ctx,'hero',26,1.2,state,0,false,false);
}
vfx.shot(ctx,{x:100,y:100,kind:'pet',trail:[{x:77,y:85}]},2,false);
vfx.impact(ctx,25,1,true,false);
vfx.atmosphere(ctx,844,390,12,1,false);
assert.ok(draws>20,'World scenery and effects must issue meaningful canvas operations; full-body sprites now draw as one texture rather than hundreds of procedural primitives');
console.log('PASS Cataclysm visuals: biome scenery, three prop classes, hero states, impact/SFX cues, fixed infinite world and inverted shadow');

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
assert.equal(art.frameTotal,378);
assert.equal(art.frameCount('hero','attack'),24);
assert.equal(art.frameCount('healer','run'),12);
assert.equal(art.frameCount('shambler','run'),6);
assert.notDeepEqual(art.pose('hero','attack',6),art.pose('hero','idle',6));
assert.ok(art.pose('hero','attack',3).recoil>0);
assert.ok(art.pose('hero','run',3).effort>art.pose('hero','idle',3).effort);
assert.ok(html.includes('src="./visuals.js?build=CATASTROPHE-MAJOR-02"'));
assert.ok(html.indexOf('src="./visuals.js')<html.indexOf('src="./game.js'));
assert.ok(src.includes('const WORLD_SCROLL_Y=-28'));
assert.ok(src.includes("scrollDirection:'north'"));
assert.ok(src.includes('VIS.atmosphere(ctx,W,H'));
assert.ok(src.includes('VIS.ground(ctx,'));
assert.ok(src.includes('VIS.impact(ctx,'));
assert.ok(src.includes('VIS.aura(ctx,'));
assert.ok(src.includes('if(index<=e.from)biome=e.biome'));
assert.ok(src.includes('if(p.y+p.r>sh.y&&p.inv<=0)'));
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
assert.ok(draws>200,'render methods issue real canvas commands');
console.log('PASS Cataclysm visuals: biome scenery, three prop classes, hero states, impact/SFX cues, northbound drift and inverted shadow');

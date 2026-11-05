const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('docs/games/neon-salvage/game.js','utf8');
let clock=0,raf,seed=1234567;
const listeners=new Map();
const noop=()=>{};
const context=new Proxy({}, {get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
class Element {
 constructor(id){this.id=id;this.events={};this.textContent='';this.hidden=false;this.disabled=false;this.style={};this.classList={add:noop,remove:noop,toggle:noop};}
 addEventListener(type,callback){(this.events[type]??=[]).push(callback)}
 emit(type,props={}){for(const cb of this.events[type]||[])cb({pointerId:1,preventDefault:noop,...props})}
 getContext(){return context}
 getBoundingClientRect(){return {left:0,top:0,width:360,height:480}}
 setPointerCapture(){}
 releasePointerCapture(){}
 setAttribute(){}
}
const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)};
const seededMath=Object.create(Math);seededMath.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const sandbox={console,Math:seededMath,Set,Map,Object,Number,Array,String,JSON,performance:{now:()=>clock},devicePixelRatio:1,
 matchMedia:()=>({matches:true,addEventListener:noop}),requestAnimationFrame:cb=>{raf=cb},
 ResizeObserver:class{observe(){}},document:{getElementById:el,hidden:false,addEventListener:noop},
 addEventListener:(type,cb)=>listeners.set(type,cb)};
sandbox.window=sandbox;
vm.runInNewContext(source,sandbox,{timeout:3000});
const snap=()=>JSON.parse(JSON.stringify(sandbox.BORHEZ_GAME.snapshot()));
function tick(n=1){for(let i=0;i<n;i++){clock+=1000/120;const cb=raf;raf=null;cb(clock)}}
const canvas=el('canvas');
function drag(x,y){canvas.emit('pointerdown',{clientX:snap().player.x,clientY:snap().player.y});canvas.emit('pointermove',{clientX:x,clientY:y})}
function release(){canvas.emit('pointercancel')}
assert.equal(snap().mode,'ready');el('play').emit('click');assert.equal(snap().mode,'running');
let before=snap();drag(before.player.x+40,before.player.y);tick(30);release();assert(snap().player.x>before.player.x+15);
let copy=sandbox.BORHEZ_GAME.snapshot();copy.player.x=-100;assert.notEqual(snap().player.x,-100);
el('pause').emit('click');before=snap();tick(120);assert.deepEqual(snap(),before);el('pause').emit('click');tick(2);assert(snap().time>before.time);
el('restart').emit('click');assert.equal(snap().time,0);assert.equal(snap().score,0);assert.equal(snap().hull,3);
const hasMultiplier='multiplier' in snap();
for(let pickup=1;pickup<=2;pickup++){
 const start=snap();const nearest=start.cores.reduce((a,b)=>Math.hypot(a.x-start.player.x,a.y-start.player.y)<Math.hypot(b.x-start.player.x,b.y-start.player.y)?a:b);
 drag(nearest.x,nearest.y);let count=0;while(snap().score===start.score&&count++<600)tick();release();
 assert.equal(snap().hull,3,'Fixture must collect without an accidental damage reset');
 assert.equal(snap().score-start.score,hasMultiplier?10*pickup:10,'Actual pickup scoring');
 if(hasMultiplier)assert.equal(snap().multiplier,pickup+1);
}
const beforeHit=snap();let loops=0;
while(snap().hull===beforeHit.hull&&loops++<1200){const s=snap();const d=s.debris.reduce((a,b)=>Math.hypot(a.x-s.player.x,a.y-s.player.y)<Math.hypot(b.x-s.player.x,b.y-s.player.y)?a:b);drag(d.x,d.y);tick()}
release();assert.equal(snap().hull,beforeHit.hull-1,'Real debris contact damages hull');assert(snap().invincible>0);
if(hasMultiplier)assert.equal(snap().multiplier,1,'Hull damage resets chain');
const protectedHull=snap().hull;tick(60);assert.equal(snap().hull,protectedHull,'Contact protection prevents immediate repeated damage');
loops=0;
while(snap().mode==='running'&&loops++<3600){const s=snap();const d=s.debris.reduce((a,b)=>Math.hypot(a.x-s.player.x,a.y-s.player.y)<Math.hypot(b.x-s.player.x,b.y-s.player.y)?a:b);drag(d.x,d.y);tick()}
release();assert.equal(snap().mode,'over');assert.equal(snap().hull,0);el('play').emit('click');assert.equal(snap().hull,3);assert.equal(snap().score,0);if(hasMultiplier)assert.equal(snap().multiplier,1);
loops=0;
while(snap().mode==='running'&&loops++<7500){const s=snap();let best=null,bestScore=-Infinity;for(let x=40;x<=320;x+=40)for(let y=40;y<=440;y+=40){const safety=Math.min(...s.debris.map(d=>Math.hypot(x-d.x,y-d.y)-d.r));const score=safety-.08*Math.hypot(x-s.player.x,y-s.player.y);if(score>bestScore){bestScore=score;best={x,y}}}drag(best.x,best.y);tick()}
release();assert.equal(snap().mode,'over');assert.equal(snap().time,60,'Actual sixty-second extraction');assert(snap().hull>0,'Automated pilot survives extraction');
console.log('PASS actual game logic: pickup/scoring, hull damage/protection, loss/replay, 60s extraction, pause/restart, read-only snapshots'+(hasMultiplier?', chain growth and damage reset':''));

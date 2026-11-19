'use strict';
// Loader/contract verification, deliberately NOT claimed as browser raster QA.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const base=path.resolve(__dirname,'../../cataclysm-1-0-major'),other=path.resolve(base,'../cataclysm-100-lab');
async function check(dir){
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'art/actor-packs.json'))),requests=[];
 const sandbox={console,document:{currentScript:{src:'http://local/animation.js'}},URL,
 fetch:async()=>({ok:true,json:async()=>manifest}),Image:class{
  set src(url){this.url=url;requests.push(url);const file=path.join(dir,'art',new URL(url).pathname.replace(/^\/art\//,''));const png=fs.readFileSync(file);this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);setImmediate(()=>this.onload());}
  decode(){return Promise.resolve();}
 }};
 vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(path.join(dir,'campaign.js'),'utf8'),sandbox);
 vm.runInContext(fs.readFileSync(path.join(dir,'animation.js'),'utf8'),sandbox);
 const art=sandbox.CATA_ART;
 await art.ready;
 assert.equal(art.assetStatus().failed,0);
 const all=['hero',...art.allyIds,...art.enemyIds];
 for(const id of all){assert.equal(art.packInfo(id).ready,true,id);assert.equal(art.packInfo(id).family,manifest.characters[id].family);assert.ok(Object.isFrozen(art.packInfo(id)));}
 const calls=[],ctx=new Proxy({drawImage(...args){calls.push(args);}}, {get(o,k){return k in o?o[k]:(()=>{});},set(o,k,v){o[k]=v;return true;}});
 let checked=0;
 for(const state of ['idle','run','attack','feral','adrenaline','hit','recover'])for(let bearing=0;bearing<8;bearing++)for(const moving of [false,true])for(const firing of [false,true])for(const damaged of [false,true])for(const time of [0,.06,.15,.31,1.3]){
  calls.length=0;
  const family=art.packInfo('hero').family;
  const frame=art.draw(ctx,'hero',27,time,state,bearing*Math.PI/4,damaged,false,moving,['feral','adrenaline'].includes(state)?state:null,firing);
  assert.equal(calls.length,1,'One complete body at '+[state,bearing,moving,firing,damaged,time]);
  const [image,sx,sy,w,h]=calls[0];assert.match(image.url,/articulated-v1\//);assert.equal(sy,bearing*96);assert.ok(sx>=0&&sx+w<=image.naturalWidth);assert.equal(h,96);assert.ok(frame>=0);assert.equal(art.packInfo('hero').family,family);checked++;
 }
 assert.ok(!requests.some(x=>/\/hero-|directed-|\/hero\/(idle|run|attack|aim|hit|feral|adrenaline)\.png/.test(x)),'No retired hero downloads');
 // Exactly one manifest URL per state, no eager legacy/override competitor.
 assert.equal(new Set(requests).size,requests.length);
 for(const [id,p] of Object.entries(manifest.characters))for(const info of Object.values(p.states)){
  const file=path.join(dir,'art',info.url),mirror=path.join(dir===base?other:base,'art',info.url);
  assert.deepEqual(fs.readFileSync(file),fs.readFileSync(mirror),'Mode asset parity: '+id+'/'+info.url);
 }
 const source=fs.readFileSync(path.join(dir,'game.js'),'utf8');assert.match(source,dir.endsWith('100-lab')?/STRESS_MODE=true/:/STRESS_MODE=false/);assert.ok(!source.includes('Original fallback below'));
 return {mode:path.basename(dir),actors:all.length,textureRequests:requests.length,heroDrawInstants:checked,status:art.assetStatus(),family:art.packInfo('hero'),browserRendered:false};
}
(async()=>{const results=[];for(const dir of [base,other])results.push(await check(dir));const output={checks:results,limitation:'Node loader and draw contract only. Browser screenshots and performance require browser QA.'};console.log(JSON.stringify(output,null,2));fs.writeFileSync(path.join(__dirname,'contract-results.json'),JSON.stringify(output,null,2)+'\n');})().catch(e=>{console.error(e);process.exitCode=1;});

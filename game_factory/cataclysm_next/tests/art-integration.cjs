'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../docs/cataclysm-1-0-major');
const catalogue=require(path.join(root,'campaign.js')).catalog;
const animation=require(path.join(root,'animation.js'));
const art=path.join(root,'art');
const hero=['idle','run','hit','feral','adrenaline','attack'].map(state=>['hero-'+state,24]);
const allies=animation.allyIds.map(id=>[id+'-run',12]);
const enemies=animation.enemyIds.map(id=>[id+'-run',6]);
const required=[...hero,...allies,...enemies];
assert.equal(required.length,41,'six hero poses plus eight allies and 27 enemy archetypes');
assert.ok(fs.existsSync(art),'New genuine sprite art directory must exist');
const names=fs.readdirSync(art).filter(x=>x.endsWith('.png'));
assert.ok(names.length>=41,'Need rendered sprite sheets, not only concepts or source-code vectors');
const hashes=new Set();
let bytes=0,alpha=0;
for(const [name,frames] of required){
 const file=path.join(art,name+'.png');
 assert.ok(fs.existsSync(file),'Missing '+name);
 const buf=fs.readFileSync(file);
 assert.ok(buf.length>800,'Art sheet too small to hold original detail: '+name);
 assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature '+name);
 const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);
 assert.ok(w>=64*frames&&h>=64,'Too little resolution for '+name+': '+w+'×'+h);
 const color=buf.readUInt8(25);assert.ok([2,6].includes(color),'RGB/RGBA needed '+name);
 if(color===6)alpha++;
 hashes.add(crypto.createHash('sha256').update(buf).digest('hex'));
 bytes+=buf.length;
}
assert.ok(hashes.size>=37,'Multiple characters or states are byte-for-byte identical');
assert.ok(alpha>=38,'Production sprites require transparency for layered game rendering');
const source=fs.readFileSync(path.join(root,'animation.js'),'utf8');
assert.ok(source.includes('drawImage('),'Sprite frames must be integrated into Canvas art drawing');
assert.ok(source.includes('assetStatus'),'Renderer must expose loaded/failed/total sprite diagnostics');
assert.ok(Number.isInteger(animation.frameTotal)&&animation.frameTotal>=378,'Retain the 378-frame original baseline while permitting new complete hero packs');
assert.equal(catalogue.bosses.length,9);
for(const instance of ['cataclysm-100-lab']){
 const mirror=path.resolve(root,'../',instance,'art');
 for(const [name] of required){
  const local=fs.readFileSync(path.join(mirror,name+'.png'));
  assert.equal(crypto.createHash('sha256').update(local).digest('hex'),crypto.createHash('sha256').update(fs.readFileSync(path.join(art,name+'.png'))).digest('hex'),'Stress-test art must mirror normal game: '+name);
 }
}
console.log('PASS integrated Cataclysm art:',required.length,'frame atlases,',hashes.size,'unique,',bytes,'bytes and equivalent stress-test assets');

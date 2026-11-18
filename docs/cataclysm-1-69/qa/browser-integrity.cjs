'use strict';
// Run in a browser-enabled environment: node docs/cataclysm-1-0-major/qa/browser-integrity.cjs
// Local route fulfillment avoids an HTTP server and any production deployment.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const docs=path.resolve(__dirname,'../..'),out=path.join(__dirname,'browser-evidence');
const viewports=[[390,844],[844,390],[360,800],[800,360],[768,1024],[1024,768],[1280,720],[1920,1080]];
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});fs.mkdirSync(out,{recursive:true});
 const results=[];
 try{for(const mode of ['cataclysm-1-0-major','cataclysm-100-lab'])for(const [width,height] of viewports){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:width<900,hasTouch:width<900});
  const errors=[],requested=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requested.push(r.url()));
  await page.route('**/*',async route=>{const u=new URL(route.request().url());let name=decodeURIComponent(u.pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(docs,'.'+name);if(!file.startsWith(docs+path.sep)||!fs.existsSync(file)){await route.fulfill({status:404,body:'Missing'});return;}await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
  await page.addInitScript(()=>{
   const original=CanvasRenderingContext2D.prototype.drawImage;
   const raf=window.requestAnimationFrame;window.__heroBodyFrames=[];let current=[];
   CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(im?.src?.includes('/hero/articulated-v1/'))current.push({url:im.src,source:args.slice(0,4)});return original.call(this,im,...args);};
   window.requestAnimationFrame=function(callback){return raf.call(window,time=>{current=[];callback(time);if(current.length){window.__heroBodyFrames.push({time,draws:current.slice()});if(window.__heroBodyFrames.length>600)window.__heroBodyFrames.shift();}});};
  });
  await page.goto('http://cata.local/'+mode+'/');await page.waitForFunction(()=>globalThis.CATACLYSM_READY===true);
  const session=await page.context().newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:width<900?4:1});
  const evidence=await page.evaluate(()=>{
   const art=CATA_ART,canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;const ctx=canvas.getContext('2d');ctx.translate(195,422);ctx.scale(390/720,390/720);const records=[],real=ctx.drawImage.bind(ctx);let trace=[];
   ctx.drawImage=(im,...args)=>{trace.push({url:im.src,source:args.slice(0,4)});real(im,...args);};
   for(const state of ['idle','run','attack','feral','adrenaline','hit','recover'])for(const bearing of [0,2,4,6])for(const t of [0,.17,.34,.51])for(const fire of [false,true]){
    trace=[];ctx.clearRect(-360,-780,720,1560);const frame=art.draw(ctx,'hero',27,t,state,bearing*Math.PI/4,state==='hit',false,['run','feral','adrenaline'].includes(state),['feral','adrenaline'].includes(state)?state:null,fire);
    records.push({state,bearing,t,fire,frame,pack:art.packInfo('hero'),draws:trace.slice(),raster:canvas.toDataURL()});
   }
   const start=performance.now();for(let i=0;i<600;i++)art.draw(ctx,'hero',27,i/60,'run',i*Math.PI/4,false,false,true,'adrenaline',true);const paintMs=performance.now()-start;
   return {records,paintMs,pack:art.packInfo('hero'),assets:art.assetStatus()};
  });
  for(const record of evidence.records){assert.equal(record.draws.length,1);assert.match(record.draws[0].url,/articulated-v1/);assert.equal(record.pack.family,'hero-articulated-v1');}
  for(const state of ['idle','run','attack','feral','adrenaline'])for(const bearing of [0,2,4,6])assert.ok(new Set(evidence.records.filter(r=>r.state===state&&r.bearing===bearing&&!r.fire).map(r=>r.raster)).size>=3,'Static mobile pixels '+state+'/'+bearing);
  assert.ok(!requested.some(x=>/\/hero-|directed-/.test(x)));assert.equal(evidence.assets.failed,0);assert.ok(evidence.paintMs<400,'4x throttled sprite CPU budget');
  // Record exact texture, source rectangle, frame, and full isolated mobile rasters.
  fs.writeFileSync(path.join(out,mode+'-'+width+'x'+height+'-trace.json'),JSON.stringify(evidence,null,2));
  await page.locator('#play').click({force:true});await page.waitForTimeout(500);await page.keyboard.down('d');await page.waitForTimeout(1200);await page.keyboard.up('d');
  const snap=await page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());assert.equal(snap.build,'1.0');assert.equal(snap.major.campaign.night,mode.endsWith('100-lab')?99:1);if(mode.endsWith('1-0-major')){assert.equal(snap.player.level,1);assert.equal(snap.player.xpRequired,6);}else assert.equal(snap.player.level,100);
  const liveTrace=await page.evaluate(()=>window.__heroBodyFrames);assert.ok(liveTrace.length>5);assert.ok(liveTrace.every(f=>f.draws.length===1),'One hero body per actual gameplay frame');fs.writeFileSync(path.join(out,mode+'-'+width+'x'+height+'-gameplay-trace.json'),JSON.stringify(liveTrace,null,2));
  await page.screenshot({path:path.join(out,mode+'-'+width+'x'+height+'.png')});assert.deepEqual(errors,[]);results.push({mode,width,height,paintMs:evidence.paintMs,snapshot:snap});await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log('PASS',results.length,'mode/viewport regressions. Manual visual approval still required.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

'use strict';
// node docs/cataclysm-1-6/qa/chrome-smoke.cjs
// RECORD=1 enables a ~20 second portrait WebM (requires Playwright ffmpeg).
// All requests are fulfilled from disk: no server, deployment or external APIs.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),out=path.join(__dirname,'chrome-evidence-16');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',timeout:15000,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try{for(const [width,height] of [[390,844],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1,...(process.env.RECORD==='1'&&width===390?{recordVideo:{dir:out,size:{width,height}}}:{})});
  const page=await context.newPage(),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{let relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/cataclysm-1-6\//,'');if(!relative||relative.endsWith('/'))relative+='index.html';const file=path.resolve(base,relative);if(!file.startsWith(base+path.sep)||!fs.existsSync(file)){missing.push(relative);return route.fulfill({status:404,body:'Missing'});}return route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:path.basename(file)==='game.js'?fs.readFileSync(file,'utf8').replace('  window.spawnRelic=spawnRelic;','  window.__cityQA={get game(){return game;},cityTick,cityDefeat,cityRoute,fishingTick,mutationAPI};window.spawnRelic=spawnRelic;'):fs.readFileSync(file)});});
  await page.addInitScript(()=>{window.__drawnImages={};const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(im?.src)window.__drawnImages[im.src]=(window.__drawnImages[im.src]||0)+1;return draw.call(this,im,...args);};});
  await page.goto('http://cata.local/cataclysm-1-6/?qa=nine-lives&seed=123');await page.waitForFunction(()=>window.CATACLYSM_READY===true);await page.screenshot({path:path.join(out,width+'-start.png')});await page.locator('#play').click();
  const snapshot=()=>page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());let s=await snapshot();assert.equal(s.build,'1.6');assert.equal(s.nineLives.lives,9);assert.equal(s.major.campaign.night,1);
  const initial=s.player,cdp=await context.newCDPSession(page),x=width*.4,y=height*.72;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+80,y:y-20}]});await page.waitForTimeout(800);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});s=await snapshot();assert(Math.hypot(s.player.x-initial.x,s.player.y-initial.y)>30,'Touch movement');
  const pixels=await page.evaluate(()=>{const c=document.getElementById('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const colors=new Set();for(let i=0;i<d.length;i+=400)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return colors.size;});assert(pixels>20,'Nonblank rendered canvas');
  await page.screenshot({path:path.join(out,width+'-playing.png')});await page.waitForTimeout(1500);
  // Fixture places the real player at a real spot; simulation owns the cast.
  await page.evaluate(()=>{const g=__cityQA.game,s=g.fishing.spots[0];g.enemies=[];g.player.x=s.x;g.player.y=s.y;g.player.inv=20;});
  await page.waitForFunction(()=>__cityQA.game.fishing.active?.committed===true);
  await page.screenshot({path:path.join(out,width+'-fishing-cast.png')});
  await page.evaluate(()=>{const g=__cityQA.game,a=g.fishing.active;if(!a?.committed)throw Error('No committed cast');__cityQA.fishingTick(.01,{x:1,y:0});if(g.fishing.active)throw Error('Movement did not cancel');});
  const fishingDrawn=await page.evaluate(()=>window.__drawnImages);
  for(const name of ['fishing-locations-strip','fishing-cat-strip'])assert(Object.keys(fishingDrawn).some(u=>u.includes(name)),name+' actual draw');

  await page.evaluate(()=>{
    const {game:g,mutationAPI:api}=__cityQA;
    g.enemies=[];g.player.x=1340;g.player.y=1340;g.player.shots=10;g.player.inv=20;
    g.director.budget=80;
    const e=api.spawn({x:1460,y:1340},false);
    if(!e)throw Error('Mutation fixture spawn failed');
    CATA_MUTATIONS.attach(g,e,'bell-ringer');
    e.mNext=g.t;
  });
  await page.waitForFunction(()=>Object.keys(window.__drawnImages).some(u=>u.includes('mutation-bell-ringer-swing.png')));
  await page.screenshot({path:path.join(out,width+'-bell-telegraph.png')});
  const wavs=await page.evaluate(async()=>{
    const files=await fetch('./audio/generated/mutation-audio-index.json').then(r=>r.json());
    const audio=new OfflineAudioContext(1,24000,24000);
    return await Promise.all(Object.values(files.assets).map(async asset=>{
      const buffer=await audio.decodeAudioData(await fetch('./'+asset.path).then(r=>r.arrayBuffer()));
      return {path:asset.path,seconds:buffer.duration};
    }));
  });
  assert.equal(wavs.length,13);assert(wavs.every(w=>w.seconds>0));
  await page.evaluate(()=>CATA_12_QA.lethal());await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='reviving');await page.screenshot({path:path.join(out,width+'-reviving.png')});await page.waitForTimeout(1100);s=await snapshot();assert.equal(s.nineLives.lives,8);assert(s.nineLives.grace>0);assert(s.player.hp>0);
  await page.screenshot({path:path.join(out,width+'-returned.png')});await page.waitForTimeout(1500);await page.evaluate(()=>CATA_12_QA.offer());
  const time=(await snapshot()).time;await page.waitForTimeout(300);assert.equal((await snapshot()).time,time);assert.equal(await page.locator('.upgrade:visible').count(),3);
  const offers=(await snapshot()).offered.sort().join('|');await page.locator('#reroll-upgrades').click();assert.notEqual((await snapshot()).offered.sort().join('|'),offers);
  await page.evaluate(()=>{CATA_12_QA.choose('curiosity');CATA_12_QA.offer();CATA_12_QA.choose('omniscience');CATA_12_QA.offer();});assert.equal(await page.locator('.upgrade:visible').count(),5);await page.screenshot({path:path.join(out,width+'-five-cards.png')});
  await page.locator('.upgrade:visible').last().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,width+'-last-card-reachable.png')});
  const lifeBox=await page.locator('#lives-hud').boundingBox();assert(lifeBox.width>150&&lifeBox.x>=0&&lifeBox.x+lifeBox.width<=width,'Lives fit phone');
  // Real 1.3 fixtures, separate from inherited survival fixtures above.
  await page.goto('http://cata.local/cataclysm-1-6/?qa=company&seed=123');await page.waitForFunction(()=>window.CATACLYSM_READY===true);await page.locator('#play').click();
  await page.evaluate(()=>{CATA_13_QA.recruit('engineer');CATA_13_QA.recruit('shooter');CATA_13_QA.work('engineer',75);CATA_13_QA.work('shooter',75);});
  await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().company.roster.some(c=>c.role==='mecha'));
  await page.evaluate(()=>{CATA_13_QA.recruit('angler');CATA_13_QA.recruit('courier');CATA_13_QA.recruit('hexcat');});
  await page.waitForTimeout(3200);s=await snapshot();assert.equal(s.company.slots,4);assert(s.company.unique);assert.equal(s.company.fish.balance,0);assert(await page.locator('#support-status').isVisible());
  await page.screenshot({path:path.join(out,width+'-company-mecha.png')});
  const cityEvidence=await page.evaluate(()=>{
   const qa=window.__cityQA,g=qa.game;g.player.x=2380;g.player.y=1340;qa.cityTick(.01);const gate=g.unseen.gates[0];if(!gate.active)throw Error('Gate did not start');
   gate.damage=gate.required;qa.cityTick(.01);if(!gate.done)throw Error('Gate did not open');
   g.player.x=1340;g.player.y=1340;g.unseen.kills[0]=12;qa.cityTick(.01);
   const guardian=g.enemies.find(e=>e.cityGuardian===0);if(!guardian)throw Error('Guardian did not provoke');
   if(Math.hypot(guardian.x-g.player.x,guardian.y-g.player.y)<=260)throw Error('Unsafe guardian spawn');
   // Bring the safe perimeter spawn into view for the actual image draw audit.
   g.player.x=(g.player.x+guardian.x)/2;g.player.y=(g.player.y+guardian.y)/2;
   return {gate:gate.done,guardian:true};
  });
  await page.waitForTimeout(500);await page.screenshot({path:path.join(out,width+'-guardian.png')});
  await page.locator('#pause').click();await page.locator('#city-map').click();assert(await page.locator('#city-map-panel').isVisible());await page.screenshot({path:path.join(out,width+'-map-paused.png')});await page.locator('#resume').click();assert(!(await page.locator('#city-map-panel').isVisible()));
  const drawn=await page.evaluate(()=>window.__drawnImages);for(const name of ['city-wet-street','guardian-frames','mecha-frames'])assert(Object.keys(drawn).some(url=>url.includes(name)),name+' used by actual canvas drawImage');
  await page.evaluate(()=>CATA_13_QA.start());assert.equal((await snapshot()).company.slots,0);assert.equal((await snapshot()).nineLives.lives,9);
  if(process.env.RECORD==='1'&&width===390)await page.waitForTimeout(15000);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.push({viewport:{width,height},status:'PASS',colors:pixels,errors,missing,cityEvidence,drawn,snapshot:await snapshot()});await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log('PASS: Chrome portrait / landscape start, touch, pixels, revive, pause, reroll and five cards.');
})().catch(e=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure.txt'),String(e.stack));console.error(e.message);process.exitCode=1;});

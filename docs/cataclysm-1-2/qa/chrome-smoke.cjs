'use strict';
// node docs/cataclysm-1-2/qa/chrome-smoke.cjs
// RECORD=1 enables a ~20 second portrait WebM (requires Playwright ffmpeg).
// All requests are fulfilled from disk: no server, deployment or external APIs.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),out=path.join(__dirname,'chrome-evidence');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',timeout:15000,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try{for(const [width,height] of [[390,844],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1,...(process.env.RECORD==='1'&&width===390?{recordVideo:{dir:out,size:{width,height}}}:{})});
  const page=await context.newPage(),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{let relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/cataclysm-1-2\//,'');if(!relative||relative.endsWith('/'))relative+='index.html';const file=path.resolve(base,relative);if(!file.startsWith(base+path.sep)||!fs.existsSync(file)){missing.push(relative);return route.fulfill({status:404,body:'Missing'});}return route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
  await page.goto('http://cata.local/cataclysm-1-2/?qa=nine-lives&seed=123');await page.waitForFunction(()=>window.CATACLYSM_READY===true);await page.locator('#play').click();
  const snapshot=()=>page.evaluate(()=>CATACLYSM_DIAGNOSTICS.snapshot());let s=await snapshot();assert.equal(s.build,'1.2');assert.equal(s.nineLives.lives,9);assert.equal(s.major.campaign.night,1);
  const initial=s.player,cdp=await context.newCDPSession(page),x=width*.4,y=height*.72;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+80,y:y-20}]});await page.waitForTimeout(800);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});s=await snapshot();assert(Math.hypot(s.player.x-initial.x,s.player.y-initial.y)>30,'Touch movement');
  const pixels=await page.evaluate(()=>{const c=document.getElementById('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const colors=new Set();for(let i=0;i<d.length;i+=400)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return colors.size;});assert(pixels>20,'Nonblank rendered canvas');
  await page.screenshot({path:path.join(out,width+'-playing.png')});await page.waitForTimeout(1500);
  await page.evaluate(()=>CATA_12_QA.lethal());await page.waitForFunction(()=>CATACLYSM_DIAGNOSTICS.snapshot().mode==='reviving');await page.screenshot({path:path.join(out,width+'-reviving.png')});await page.waitForTimeout(1100);s=await snapshot();assert.equal(s.nineLives.lives,8);assert(s.nineLives.grace>0);assert(s.player.hp>0);
  await page.screenshot({path:path.join(out,width+'-returned.png')});await page.waitForTimeout(1500);await page.evaluate(()=>CATA_12_QA.offer());
  const time=(await snapshot()).time;await page.waitForTimeout(300);assert.equal((await snapshot()).time,time);assert.equal(await page.locator('.upgrade:visible').count(),3);
  const offers=(await snapshot()).offered.sort().join('|');await page.locator('#reroll-upgrades').click();assert.notEqual((await snapshot()).offered.sort().join('|'),offers);
  await page.evaluate(()=>{CATA_12_QA.choose('curiosity');CATA_12_QA.offer();CATA_12_QA.choose('omniscience');CATA_12_QA.offer();});assert.equal(await page.locator('.upgrade:visible').count(),5);await page.screenshot({path:path.join(out,width+'-five-cards.png')});
  await page.locator('.upgrade:visible').last().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,width+'-last-card-reachable.png')});
  const lifeBox=await page.locator('#lives-hud').boundingBox();assert(lifeBox.width>150&&lifeBox.x>=0&&lifeBox.x+lifeBox.width<=width,'Lives fit phone');
  if(process.env.RECORD==='1'&&width===390)await page.waitForTimeout(15000);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.push({viewport:{width,height},status:'PASS',colors:pixels,errors,missing,snapshot:await snapshot()});await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log('PASS: Chrome portrait / landscape start, touch, pixels, revive, pause, reroll and five cards.');
})().catch(e=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure.txt'),String(e.stack));console.error(e.message);process.exitCode=1;});

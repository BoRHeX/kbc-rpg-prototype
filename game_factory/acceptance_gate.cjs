// Independent acceptance gate. Coding agents are not allowed to edit this file.
// Run against a locally served preview, verifying real touch events and game progression.
const {chromium}=require('playwright');
const base=process.env.CATACLYSM_TEST_URL||'http://127.0.0.1:8765/preview/';
const samsungUA='Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
async function testPlatform(browser,label,userAgent) {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', m=>{if(m.type()==='error') errors.push(m.text())});
  try {
    const response=await page.goto(base,{waitUntil:'load',timeout:15000});
    if(!response || !response.ok()) throw Error('Preview HTTP not OK');
    await page.waitForTimeout(600);
    const btn=page.locator('#play');
    if(!await btn.isVisible()) throw Error('Start Run button missing');
    await btn.tap();
    await page.waitForTimeout(400);
    if(!await page.locator('#start-overlay').isHidden()) throw Error('Touch START RUN did not dismiss overlay');
    await page.waitForTimeout(1400);
    const time=(await page.locator('#time').innerText()).trim();
    if(time==='00:00' || !/^\d\d:\d\d$/.test(time)) throw Error('Timer did not advance after touch start: '+time);
    const canvas=page.locator('#canvas'), rect=await canvas.boundingBox();
    if(!rect) throw Error('Canvas not visible');
    const x=rect.x+rect.width*.45, y=rect.y+rect.height*.55;
    const snapshot=()=>page.evaluate(()=>window.CATACLYSM_DIAGNOSTICS.snapshot());
    const before=await snapshot();
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    await page.waitForTimeout(90);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+75,y:y+35,id:1}]});
    await page.waitForTimeout(350);
    const after=await snapshot();
    if(!after.player || Math.hypot(after.player.x-before.player.x,after.player.y-before.player.y)<2) throw Error('Touch drag did not move the actual player');
    const stickVisible=await page.locator('#stick').isVisible();
    const thumb=await page.locator('#thumb').evaluate(el=>el.style.transform);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(!stickVisible) throw Error('Touch drag did not activate joystick');
    if(!thumb || thumb==='translate(0,0)' || thumb==='translate(0px, 0px)') throw Error('Touch drag did not move joystick: '+thumb);
    await page.locator('#pause').tap();
    if(!await page.locator('#start-overlay').isVisible()) throw Error('Pause button did not display overlay');
    const paused=await snapshot();
    await page.waitForTimeout(300);
    if((await snapshot()).time!==paused.time) throw Error('Simulation continues while paused');
    await page.locator('#play').tap();
    if(!await page.locator('#start-overlay').isHidden()) throw Error('Resume button did not work');
    await page.locator('#restart').tap();
    if(!await page.locator('#start-overlay').isHidden()) throw Error('Restart button did not work');
    const restarted=await snapshot();
    if(restarted.time>0.5) throw Error('Restart did not reset simulation time');
    const label=await page.locator('#build-version').innerText();
    if(!label.includes(restarted.build)) throw Error('Displayed code build differs from runtime');
    if(errors.length) throw Error('Browser errors: '+errors.slice(0,4).join('; '));
    console.log('PASS '+label+': touch start, timer '+time+', player displacement, frozen pause, resume/restart, build identity; no page errors');
  } finally {await context.close()}
}
(async()=>{const b=await chromium.launch({headless:true,channel:process.env.BORHEZ_BROWSER_CHANNEL || undefined});try{
  await testPlatform(b,'Samsung Android',samsungUA);
  await testPlatform(b,'Chrome Android','Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36');
} finally {await b.close()}})().catch(e=>{console.error('FAIL mobile acceptance:',e.stack||e);process.exit(1)});

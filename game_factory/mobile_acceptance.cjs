// Trusted shared gameplay gate. The game Coder cannot change this file.
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const job = JSON.parse(fs.readFileSync('artifacts/mobile/job.json', 'utf8'));
const base = process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8765/' + job.target.replace(/^docs\//, '') + '/';
const legacy = job.request.game === 'cataclysm';
const evidence = {run_id: job.run_id, request_id: job.request.id, physical_device: 'not tested', platforms: []};

async function test(browser, width, height) {
  const context = await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {if(r.status() >= 400 && !r.url().includes('favicon')) errors.push('HTTP '+r.status()+' '+r.url())});
  page.on('requestfailed', r => errors.push(r.failure()?.errorText+' '+r.url()));
  const snap = () => page.evaluate(() => {
    const api = window.BORHEZ_GAME || window.CATACLYSM_DIAGNOSTICS;
    if(!api || typeof api.snapshot !== 'function') throw Error('Missing game diagnostics');
    return api.snapshot();
  });
  try {
    const response = await page.goto(base, {waitUntil:'networkidle',timeout:20000});
    if(!response?.ok()) throw Error('Game page is unavailable');
    if(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)) throw Error('Horizontal viewport overflow');
    const label = await page.locator('#build-version').innerText();
    if(!label.includes(job.run_id)) throw Error('Page does not show the tested run ID');
    await page.locator('#play').tap();
    await page.waitForTimeout(1100);
    const started = await snap();
    if(started.mode !== 'running' || !Number.isFinite(started.time) || !(started.time > 0.5)) throw Error('Real touch start did not advance running game state');
    const canvas = page.locator('#canvas');
    await canvas.scrollIntoViewIfNeeded();
    let rect = await canvas.boundingBox();
    if(!rect || rect.width < 200 || rect.height < 150) throw Error('Playable canvas is missing or too small');
    const before = await snap();
    const beforePixels = await canvas.screenshot();
    rect = await canvas.boundingBox();
    const x = rect.x + rect.width * 0.45, y = Math.min(rect.y + rect.height * .55, height-90);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+65,y:y+20,id:1}]});
    await page.waitForTimeout(450);
    const moved = await snap();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    if(!moved.player || !before.player || ![moved.player.x,moved.player.y,before.player.x,before.player.y].every(Number.isFinite) || Math.hypot(moved.player.x-before.player.x,moved.player.y-before.player.y) < 2) throw Error('Touch did not move the playable actor');
    const afterPixels = await canvas.screenshot();
    if(beforePixels.equals(afterPixels)) throw Error('Canvas did not visually change during gameplay');
    await page.locator('#pause').tap();
    const paused = await snap();
    await page.waitForTimeout(350);
    const still = await snap();
    if(paused.mode !== 'paused' || still.time !== paused.time) throw Error('Pause does not freeze simulation time');
    await page.locator(legacy ? '#play' : '#pause').tap();
    await page.waitForTimeout(250);
    if((await snap()).mode !== 'running' || (await snap()).time <= paused.time) throw Error('Resume failed');
    await page.locator('#restart').tap();
    const restarted = await snap();
    if(restarted.mode !== 'running' || restarted.time > .5) throw Error('Restart did not create a clean run');
    if(!legacy && restarted.score !== 0) throw Error('Restart did not reset score');
    await page.screenshot({path:path.join('artifacts/mobile',`phone-${width}.png`),fullPage:true});
    if(errors.length) throw Error(errors.slice(0,5).join('; '));
    const result = {viewport:[width,height],engine:'desktop Chromium with touch/mobile emulation',
      start_time:started.time,player_displacement:Math.hypot(moved.player.x-before.player.x,moved.player.y-before.player.y),
      checks:['touch start','advancing game time','actual actor movement','changing canvas','touch cancel','frozen pause','resume','restart','visible run identity','no failed resources'],passed:true};
    evidence.platforms.push(result);
    console.log('PASS mobile '+width+'x'+height+': real gameplay, pause, resume, restart, run identity');
  } finally {await context.close()}
}

(async () => {
  const browser = await chromium.launch({headless:true,channel:process.env.BORHEZ_BROWSER_CHANNEL || undefined});
  try {await test(browser,390,844);await test(browser,360,780)} finally {await browser.close()}
  fs.writeFileSync('artifacts/mobile/acceptance.json',JSON.stringify(evidence,null,2)+'\n');
})().catch(error => {
  evidence.error = error.stack || String(error);
  fs.writeFileSync('artifacts/mobile/acceptance.json',JSON.stringify(evidence,null,2)+'\n');
  console.error('FAIL mobile acceptance:',evidence.error);process.exitCode=1;
});

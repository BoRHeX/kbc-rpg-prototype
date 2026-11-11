// Trusted shared gameplay gate. The game Coder cannot change this file.
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const job = JSON.parse(fs.readFileSync('artifacts/mobile/job.json', 'utf8'));
const base = process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8765/' + job.target.replace(/^docs\//, '') + '/';
const legacy = job.request.game === 'cataclysm';
const landscapeJob = legacy && (job.request.id === 'cataclysm-08-landscape-ui-001' || Number((job.request.release_version || '0.0').split('.')[0]) >= 1);
const evidence = {run_id: job.run_id, request_id: job.request.id, physical_device: 'not tested', platforms: []};


/* Independent landscape geometry evidence. Only test-time DOM visibility is
   changed for a three-card screenshot; no game state or source is modified. */
async function testLandscapeLayout(page, width, height) {
  const layout = await page.evaluate(() => {
    const viewport = document.querySelector('#arena');
    if (!viewport) throw Error('No unified game viewport');
    if ([...document.querySelectorAll('button')].some(b=>!viewport.contains(b)))
      throw Error('Action button outside game root');
    const rect = el => {
      const r=el.getBoundingClientRect();
      return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
        visible:r.width>0&&r.height>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};
    };
    const root={width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight};
    if(root.width>innerWidth+1||root.height>innerHeight+1) throw Error('Document scrolls while playing');
    const measured={viewport:[innerWidth,innerHeight],document:root,arena:rect(viewport),
      hud:rect(document.querySelector('.hud')),canvas:rect(document.querySelector('#canvas')),controls:{}};
    for(const selector of ['#pause','#mute','#restart','#squad-tactic','#runic-relic-activate']){
      const el=document.querySelector(selector);
      if(!el) throw Error('Missing game button '+selector);
      const wasHidden=el.hidden;
      el.hidden=false;
      const box=rect(el),r=el.getBoundingClientRect();
      const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      if(!box.visible||box.h<43) throw Error('Clipped or small control '+selector);
      if(!hit || (hit!==el && !el.contains(hit))) throw Error('Untappable control '+selector);
      measured.controls[selector]=box;
      el.hidden=wasHidden;
    }
    const cv=document.querySelector('#canvas');
    if(Math.abs(cv.width/cv.height-cv.clientWidth/cv.clientHeight)>.035)
      throw Error('Canvas backing ratio differs from rendered ratio');
    return measured;
  });
  const choices=await page.evaluate(() => {
    const overlay=document.querySelector('#upgrade-overlay');
    if(!overlay) throw Error('Missing upgrade dialog');
    const previous={hidden:overlay.hidden,states:[]};
    const selected=new Set(['damage','fire-rate','speed']);
    const cards=[...overlay.querySelectorAll('[data-upgrade]')];
    for(const card of cards){
      previous.states.push([card,card.hidden,card.disabled]);
      card.hidden=!selected.has(card.dataset.upgrade);
      card.disabled=false;
    }
    overlay.hidden=false;
    const visible=cards.filter(b=>!b.hidden);
    if(visible.length!==3) throw Error('Upgrade layout has not exactly three test cards');
    const boxes=visible.map(card=>{
      const r=card.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {id:card.dataset.upgrade,x:+r.x.toFixed(1),y:+r.y.toFixed(1),
        w:+r.width.toFixed(1),h:+r.height.toFixed(1),
        visible:r.width>=44&&r.height>=44&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
        tappable:hit===card||card.contains(hit)};
    });
    window.__landscapeLayoutRestore=()=>{
      for(const [el,hidden,disabled] of previous.states){el.hidden=hidden;el.disabled=disabled;}
      overlay.hidden=previous.hidden;delete window.__landscapeLayoutRestore;
    };
    if(boxes.some(b=>!b.visible||!b.tappable)) throw Error('Upgrade cards clipped or untappable');
    if(innerWidth>innerHeight && !(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x))
      throw Error('Upgrade cards not side by side');
    return boxes;
  });
  await page.screenshot({path:path.join('artifacts/mobile','landscape-upgrade-'+width+'.png'),fullPage:false});
  await page.evaluate(() => window.__landscapeLayoutRestore());
  return {...layout,upgrade_cards:choices,method:'Chromium bounds and elementFromPoint hit test; 3 existing upgrade cards made visible for layout only'};
}

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
    const layoutEvidence = landscapeJob ? await testLandscapeLayout(page,width,height) : null;
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
      checks:['touch start','advancing game time','actual actor movement','changing canvas','touch cancel','frozen pause','resume','restart','visible run identity','no failed resources'],landscape_layout:layoutEvidence,passed:true};
    evidence.platforms.push(result);
    console.log('PASS mobile '+width+'x'+height+': real gameplay, pause, resume, restart, run identity');
  } finally {await context.close()}
}

(async () => {
  const browser = await chromium.launch({headless:true,channel:process.env.BORHEZ_BROWSER_CHANNEL || undefined});
  try {await test(browser,390,844);await test(browser,360,780);if(landscapeJob)for(const [w,h] of [[640,320],[667,375],[780,360],[844,390],[915,412],[1280,720]])await test(browser,w,h)} finally {await browser.close()}
  fs.writeFileSync('artifacts/mobile/acceptance.json',JSON.stringify(evidence,null,2)+'\n');
})().catch(error => {
  evidence.error = error.stack || String(error);
  fs.writeFileSync('artifacts/mobile/acceptance.json',JSON.stringify(evidence,null,2)+'\n');
  console.error('FAIL mobile acceptance:',evidence.error);process.exitCode=1;
});

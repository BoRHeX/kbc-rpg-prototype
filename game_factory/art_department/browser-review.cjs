/* Universal browser entrypoint. Each game supplies an adapter; gates are not Cataclysm-only. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../..');
const job = JSON.parse(fs.readFileSync(path.join(root, process.env.ART_JOB || 'game_factory/art_department/jobs/active.json')));
const out = path.join(root, 'artifacts/art-department');
(async()=>{
  assert.ok(job.browser_adapter && !job.browser_adapter.includes('..'));
  const adapter = require(path.join(root, job.browser_adapter));
  const browser = await chromium.launch({
    headless: true, executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox','--disable-dev-shm-usage']
  });
  try {
    fs.mkdirSync(out,{recursive:true});
    const page = await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    const errors=[],failed=[];
    page.on('pageerror', e=>errors.push(e.stack||e.message));
    page.on('response', r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))failed.push(r.status()+' '+r.url());});
    const url='http://127.0.0.1:8765/'+job.play_url_path+'/';
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(response.status(),200);
    await adapter.prove(page,job,out);
    assert.deepEqual(failed,[],'Broken HTTP assets in playable game');
    assert.deepEqual(errors,[],'Browser runtime errors');
    await page.close();
    console.log('PASS real game, real animation and mobile Chrome:',url);
  } finally {await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

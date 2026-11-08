// Trusted visual experiment gate. This file is NOT editable by the graphics coding agent.
// It launches Chrome against an independently served preserved baseline and the branch candidate.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const out = process.env.GRAPHICS_OUTPUT || 'artifacts/graphics-09';
fs.mkdirSync(out, {recursive:true});
const scenarios = [
  {name:'landscape',width:844,height:390},
  {name:'small-landscape',width:640,height:320},
  {name:'portrait',width:390,height:844}
];
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8766/preview/';
const candidateUrl = process.env.NEW_URL || 'http://127.0.0.1:8765/preview/';

function assert(condition,message){if(!condition)throw Error(message);}

(async function main(){
  const browser=await chromium.launch({headless:true,channel:process.env.BORHEZ_BROWSER_CHANNEL||'chrome',args:['--disable-dev-shm-usage']});
  const report={baseline:baseUrl,candidate:candidateUrl,physical_device:'not tested',platforms:[],visual_approval:'human review required'};
  try{
    for(const s of scenarios){
      const entry={name:s.name,viewport:[s.width,s.height],screenshots:[],errors:[]};
      for(const [label,url] of [['before',baseUrl],['after',candidateUrl]]){
        const context=await browser.newContext({viewport:{width:s.width,height:s.height},deviceScaleFactor:1,hasTouch:true,isMobile:true});
        const page=await context.newPage();
        const errors=[];
        page.on('pageerror',e=>errors.push('js '+String(e.message)));
        page.on('response',r=>{if(new URL(r.url()).origin===new URL(url).origin && r.status()>=400)errors.push('http '+r.status()+' '+r.url());});
        try{
          const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
          assert(response?.ok(),label+' '+s.name+' page not available');
          await page.locator('#play').waitFor({state:'visible',timeout:15000});
          await page.waitForFunction(()=>!document.getElementById('play').disabled,{timeout:15000});
          await page.locator('#play').click({timeout:10000});
          await page.waitForFunction(()=>window.CATACLYSM_DIAGNOSTICS?.snapshot()?.time>0.5,{timeout:12000});
          const status=await page.evaluate(()=>{
            const d=window.CATACLYSM_DIAGNOSTICS.snapshot();
            const arena=document.querySelector('#arena'),canvas=document.querySelector('#canvas');
            const a=arena.getBoundingClientRect(),c=canvas.getBoundingClientRect();
            return {build:d.build,time:d.time,mode:d.mode,player:d.player,arena:[a.x,a.y,a.width,a.height],canvas:[c.x,c.y,c.width,c.height],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],inner:[innerWidth,innerHeight]};
          });
          assert(status.build==='0.9',label+' '+s.name+' changed version to '+status.build);
          assert(status.mode==='running'&&status.time>0.5,label+' '+s.name+' game not running');
          assert(status.canvas[2]>300 && status.canvas[3]>250,label+' '+s.name+' canvas clipped');
          assert(status.scroll[0]<=s.width+2&&status.scroll[1]<=s.height+2,label+' '+s.name+' unexpected document scrolling');
          const canvas=page.locator('#canvas');
          const rect=await canvas.boundingBox();assert(rect,label+' '+s.name+' missing canvas rect');
          const origin=status.player;
          const cx=rect.x+Math.min(rect.width*.45,300),cy=rect.y+rect.height*.58;
          await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+55,cy+25,{steps:5});
          await page.waitForTimeout(650);
          await page.mouse.up();
          const movement=await page.evaluate(()=>{
            const s=window.CATACLYSM_DIAGNOSTICS.snapshot();return {x:s.player.x,y:s.player.y,time:s.time};
          });
          const dx=Math.hypot(movement.x-origin.x,movement.y-origin.y);
          assert(dx>12,label+' '+s.name+' movement failed '+dx);
          await page.screenshot({path:path.join(out,label+'-'+s.name+'.png'),animations:'disabled'});
          entry.screenshots.push(label+'-'+s.name+'.png');
          entry[label]={time:movement.time,moved:+dx.toFixed(1),build:status.build};
          assert(errors.length===0,label+' '+s.name+' browser errors: '+errors.join('; '));
        }finally{
          await context.close();
        }
      }
      report.platforms.push(entry);
    }
    report.passed=true;
  }catch(e){report.passed=false;report.error=String(e?.stack||e);}
  finally{await browser.close();}
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});

'use strict';
// Node and installed Chromium. Serve the version directly over Chrome DevTools Protocol.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn){
  for(let i=0;i<200;i++){
    const result=await fn();
    if(result)return result;
    await delay(100);
  }
  throw Error('Timed out waiting for Chromium or game');
}
async function dimensions(width,height){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'cata18-chromium-'));
  const browser=spawn(process.env.CHROME_PATH||'/usr/bin/chromium',[
    '--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-crashpad-for-testing','--remote-debugging-pipe',
    '--user-data-dir='+profile,'about:blank'
  ],{stdio:['ignore','ignore','inherit','pipe','pipe']});
  let sessionId;
  for(const pipe of browser.stdio.slice(3))pipe.on('error',()=>{});
  const pending=new Map(),errors=[];
  let nextId=0,buffer='';
  const command=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++nextId;pending.set(id,{resolve,reject});
    browser.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');
  });
  async function serve({requestId,request}){
    const file=new URL(request.url).pathname.slice(1)||'index.html';
    const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json',
      '.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'};
    try{
      const body=await fs.readFile(path.join(__dirname,'..',file));
      await command('Fetch.fulfillRequest',{requestId,responseCode:200,body:body.toString('base64'),
        responseHeaders:[{name:'Content-Type',value:mime[path.extname(file)]||'application/octet-stream'}]});
    }catch{
      await command('Fetch.fulfillRequest',{requestId,responseCode:404});
    }
  }
  browser.stdio[4].setEncoding('utf8').on('data',chunk=>{
    buffer+=chunk;
    let separator;
    while((separator=buffer.indexOf('\0'))>=0){
      const msg=JSON.parse(buffer.slice(0,separator));buffer=buffer.slice(separator+1);
      if(msg.method==='Fetch.requestPaused')serve(msg.params).catch(error=>errors.push(error.message));
      if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);
      if(msg.id){
        const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);
        if(msg.error)reject(Error(msg.error.message));else resolve(msg.result);
      }
    }
  });
  const exited=new Promise(resolve=>browser.once('close',(code)=>{resolve(code);for(const p of pending.values())p.reject(Error('Chromium exited '+code));}));
  const evaluate=async expression=> (await command('Runtime.evaluate',{expression,returnByValue:true,userGesture:true})).result.value;
  try{
    const {targetInfos}=await command('Target.getTargets');
    ({sessionId}=await command('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true}));
    await command('Fetch.enable',{patterns:[{urlPattern:'http://cataclysm.local/*'}]});
    await command('Runtime.enable');
    await command('Page.enable');
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    await command('Page.navigate',{url:'http://cataclysm.local/?seed=26'});
    await until(()=>evaluate("document.getElementById('play')?.disabled===false"));
    await evaluate("document.getElementById('play').click()");
    await until(()=>evaluate("CATACLYSM_DIAGNOSTICS.snapshot().time>.35"));
    const before=await evaluate("CATACLYSM_DIAGNOSTICS.snapshot().player");
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    await delay(500);
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    const current=await evaluate(`(()=>{
      const d=CATACLYSM_DIAGNOSTICS.snapshot(),canvas=document.querySelector('canvas'),hud=document.querySelector('#advancement-hud');
      const ctx=canvas.getContext('2d'),rect=hud.getBoundingClientRect(),colors=new Set();
      for(let x=20;x<canvas.width;x+=25)for(let y=20;y<canvas.height;y+=25)colors.add(ctx.getImageData(x,y,1,1).data.join(','));
      return {build:d.build,player:d.player,colors:colors.size,weather:d.advancement.weather,
        weatherImage:hud.querySelector('img')?.naturalWidth,hud:[rect.left,rect.right],width:innerWidth};
    })()`);
    assert.equal(current.build,'1.8');
    assert.notEqual(current.player.x,before.x);
    assert(current.colors>12&&current.weatherImage>0);
    assert(current.hud[0]>=0&&current.hud[1]<=current.width);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,height,colors:current.colors,weather:current.weather,weatherImage:current.weatherImage,moved:true,pageErrors:errors}));
  }finally{
    browser.kill();
    await exited;
    await fs.rm(profile,{recursive:true,force:true});
  }
}
(async()=>{
  for(const size of [[390,844],[844,390]]){
    try{
      await dimensions(...size);
    }catch(error){
      console.error(size.join('x')+' Chromium smoke failed:',error);
      process.exitCode=1;
    }
  }
})().catch(error=>{console.error(error);process.exitCode=1;});

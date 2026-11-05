// Independent regression check: actual source, read-only snapshots and normal inputs only.
const fs=require('fs'), vm=require('vm'), assert=require('assert/strict');
const source=fs.readFileSync('docs/games/studio-original-001/game.js','utf8');
function game(reduced){
  const elements=new Map(); let callback, now=0;
  const context=new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  function element(id){
    if(!elements.has(id)) elements.set(id,{events:{},textContent:'',width:360,height:500,
      addEventListener(name,fn){this.events[name]=fn},getContext:()=>context,
      getBoundingClientRect:()=>({left:0,top:0,width:360,height:500}),setPointerCapture(){}});
    return elements.get(id);
  }
  const sandbox={document:{getElementById:element,addEventListener(){}},
    window:{addEventListener(){}},devicePixelRatio:1,Math,
    matchMedia:()=>({matches:reduced}),requestAnimationFrame(fn){callback=fn}};
  vm.runInNewContext(source,sandbox);
  const snap=()=>sandbox.window.BORHEZ_GAME.snapshot();
  const tap=id=>element(id).events.click();
  const pointer=(name,x,id=1)=>element('canvas').events[name]({pointerId:id,isPrimary:true,clientX:x,clientY:445,preventDefault(){}});
  const frame=()=>{now+=1000/60;callback(now)};
  return {snap,tap,pointer,frame,element};
}
for(const reduced of [false,true]){
  const g=game(reduced);
  assert.equal(g.snap().mode,'ready'); g.tap('play');
  for(let i=0;i<90;i++)g.frame();
  assert(g.snap().time>1);g.pointer('pointerdown',100);
  assert.equal(g.snap().player.x,100);g.pointer('pointercancel',100);
  g.pointer('pointermove',250);assert.equal(g.snap().player.x,100);
  const copy=g.snap();copy.player.x=999;copy.peach.x=999;
  assert.equal(g.snap().player.x,100);assert.notEqual(g.snap().peach.x,999);
  g.tap('pause');const frozen=JSON.stringify(g.snap());
  for(let i=0;i<90;i++)g.frame();assert.equal(JSON.stringify(g.snap()),frozen);
  g.tap('pause');for(let i=0;i<30;i++)g.frame();assert(g.snap().time>copy.time);
  g.tap('restart');assert.equal(g.snap().score,0);assert.equal(g.snap().time,0);
  let best=0,wins=[];
  for(let strategy=0;strategy<5;strategy++){
    g.tap('restart');g.pointer('pointerdown',180);
    for(let i=0;i<4700&&g.snap().mode==='running';i++){
      const s=g.snap();
      // Steer only through the real pointer handler, using copied observations.
      const offset=30*Math.sin(s.time*(1.3+strategy*.17)+strategy);
      g.pointer('pointermove',s.peach.x-offset);g.frame();
    }
    const s=g.snap();best=Math.max(best,s.score);
    assert.equal(s.mode,'over');assert.equal(s.remaining,15-s.score);
    if(s.score===15)wins.push(Number(s.time.toFixed(2)));
    else {assert.equal(s.time,75);assert.match(s.result,/Time!/)}
    g.tap('play');assert.equal(g.snap().mode,'running');assert.equal(g.snap().score,0);assert.equal(g.snap().time,0);
  }
  assert(wins.length>0,'No input-only policy cleared the board; inspect playability');
  console.log(JSON.stringify({reduced_motion:reduced,best_score:best,input_only_win_times:wins,
    checks:['real pointer ownership and cancel','snapshot copies','frozen pause','resume','clean restart','normal-input scoring and full-board completion','real end and replay']}));
}

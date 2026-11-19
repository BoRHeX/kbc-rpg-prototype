/* Campaign rules and durable two-slot journal. No rendering or wall-clock simulation. */
'use strict';
(function(root){
  const chapters=[
    ['Cinder Lantern Alleys','Bell Captain','bell-ringer','summon','#e5a45d'],
    ['Sluice Towpath','Dredge Runner','feral-fish-thief','charge','#59bddf'],
    ['Ember Yard','Crane Marshal','dasher','shockwave','#f17542'],
    ['Glass Concourse','Roof Regent','roof-pouncer','cleave','#b19bea'],
    ['Cinder Shutter Row','Groomer Prime','necro-groomer','plague','#bbd181'],
    ['Sluice Spillway','Spillway Alpha','pack-leader','charge','#56d6b1'],
    ['Ember Switching Yard','Switchyard Hybrid','fusion','chain','#fa596a'],
    ['Glass Rooftop Arcade','Arcade Sentinel','superElite','spiral','#88b0fa'],
    ['Cinder Blackout Streets','Blackout Warden','hexer','pierce','#f292c3'],
    ['Glass Emergency Avenue','The Catastrophe','roof-pouncer','nova','#fff2cb']
  ];
  const STEPS=630, DT=1/60;
  const chapter=night=>1+Math.floor((night-1)/100)%10;
  const local=night=>1+(night-1)%100;
  const fullClears=clears=>Array.isArray(clears)&&clears.length===10&&clears.every((c,i)=>c===i+1);
  const id=value=>typeof value==='string'&&/^[\w:-]{1,96}$/.test(value);
  const receipt=c=>id(c?.runId)&&c.night===1000&&c.finaleId==='c10:finalBoss'&&fullClears(c.clears);
  function manifest(night,mode){
    const c=chapter(night), n=local(night), prefix='n'+night+':';
    const entry=(id,kind,state)=>({id,kind,state,phase:'queued',enemyId:null});
    if(n===100){
      if(c===10&&mode==='campaign')return [];
      return [entry(prefix+'boss','chapterBoss',{chapter:c})];
    }
    if(n>=20&&n<=94&&n%5===0){
      const kinds=[chapters[c-1][2]];
      if(n>=70&&c>1)kinds.push(chapters[c-2][2]);
      if(c===1||c===4||c===10&&n>=90)kinds.push(chapters[c-1][2]);
      const wave=kinds.map((variant,i)=>entry(prefix+'pressure:'+i,'chapterPressure',{
        variant:c===2&&n%10===5?'mimic-stray':c===8&&n%10===5?'elite':variant,delay:2+i*3}));
      if(c===3||c===9||c===10&&n>=71)wave.push(entry(prefix+'lane','chapterPressure',{hazard:true,delay:4}));
      return wave;
    }
    if(c===10&&n>=71)return [entry(prefix+'pressure:late','chapterPressure',{variant:'hexer',delay:4,hazard:true})];
    return [];
  }
  function ready(run){
    if(run.clocks.nightTick<STEPS||local(run.night)!==100)return run.clocks.nightTick>=STEPS;
    if(run.night===1000&&run.mode==='campaign')return run.finale?.stage==='cleared';
    return run.encounters.some(e=>e.kind==='chapterBoss'&&e.phase==='defeated');
  }
  const hash=n=>{
    n=Math.imul(n^(n>>>16),0x7feb352d);
    n=Math.imul(n^(n>>>15),0x846ca68b);
    return (n^(n>>>16))>>>0;
  };
  const legacy=['cataclysm-17-save-a','cataclysm-17-save-b'];
  const previous=['cataclysm-18-save-a','cataclysm-18-save-b'];
  const slots=['cataclysm-19-save-a','cataclysm-19-save-b'];
  const LIMIT=524288;
  const profile=()=>({completion:null,runs:0,campaignBest:0,endlessBest:0,cityBySeed:{},records:{catches:[],awards:[],enemies:{},company:{}}});
  function canonical(value){
    if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
    return JSON.stringify(value);
  }
  const crcTable=Array.from({length:256},(_,i)=>{
    for(let bit=0;bit<8;bit++)i=(i>>>1)^((i&1)?0xedb88320:0);
    return i>>>0;
  });
  function digest(value){
    let crc=0xffffffff;
    for(const byte of new TextEncoder().encode(canonical(value)))crc=(crc>>>8)^crcTable[(crc^byte)&255];
    return ((crc^0xffffffff)>>>0).toString(16).padStart(8,'0');
  }
  function journal(storage, validate){
    function scan(keys, schemaVersion, gameVersion){
      let newer=false, damaged=false, best=null, index=-1;
      for(const [i,key] of keys.entries()){
        const raw=storage.getItem(key);
        if(raw===null)continue;
        try{
          if(raw.length>LIMIT)throw Error('Oversize checkpoint');
          const {digest:checksum,...body}=JSON.parse(raw);
          if(body.schemaVersion>schemaVersion){newer=true;continue;}
          if(body.schemaVersion!==schemaVersion||body.gameVersion!==gameVersion||
            digest(body)!==checksum||!Number.isSafeInteger(body.revision)||body.revision<1)throw Error('Invalid checkpoint');
          validate(body);
          if(!best||body.revision>best.revision){best=body;index=i;}
        }catch(error){damaged=true;}
      }
      return {best,index,newer,damaged};
    }
    function read(){
      const current=scan(slots,3,'1.9');
      if(current.best||current.newer||current.damaged)return current;
      const prior=scan(previous,2,'1.8');
      if(prior.newer)return {...current,newer:true};
      const old=prior.best?prior:scan(legacy,1,'1.7');
      if(old.newer)return {...current,newer:true};
      if(!old.best)return {...current,damaged:prior.damaged||old.damaged};
      const best={...old.best,schemaVersion:3,gameVersion:'1.9'};
      best.profile={...best.profile,records:profile().records};
      if(best.run&&old.best.schemaVersion===1)best.run.systems.advancement=root.CATA_ADVANCEMENT.initial();
      return {...current,best,imported:true,damaged:prior.damaged||old.damaged};
    }
    function write(profile,run,revision){
      const before=read();
      if(before.newer)throw Error('Checkpoint from a newer game version');
      if((before.best?.revision||0)!==revision)throw Error('Checkpoint changed in another tab');
      const body={schemaVersion:3,gameVersion:'1.9',revision:revision+1,profile,run};
      validate(body);
      const raw=JSON.stringify({...body,digest:digest(body)});
      if(raw.length>LIMIT)throw Error('Checkpoint exceeds storage budget');
      const key=slots[before.index===0?1:0];
      storage.setItem(key,raw);
      if(storage.getItem(key)!==raw)throw Error('Checkpoint write could not be verified');
      return JSON.parse(raw);
    }
    return {read,write};
  }
  const api={chapters,STEPS,DT,chapter,local,manifest,ready,receipt,hash,profile,journal,digest,slots,LIMIT};
  root.CATA_LONG_NIGHT=api;
  if(typeof module==='object')module.exports=api;
})(globalThis);

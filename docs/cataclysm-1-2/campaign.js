/* Cataclysm The Catastrophe — deterministic campaign and entity catalog.
   Zero browser dependencies: can be exercised by independent Node tests. */
(function(root) {
  'use strict';
  const NIGHT_SECONDS=13, MAX_NIGHTS=100, VICTORY_SCORE=999999999;
  const normal=[
    {id:'shambler',name:'Shambler',role:'melee',color:'#77b59c',speed:0.8,hp:1.2,range:32,attack:'lunge'},
    {id:'dasher',name:'Razor Runner',role:'melee',color:'#ffae6d',speed:1.5,hp:0.7,range:34,attack:'charge'},
    {id:'stalker',name:'Backstreet Stalker',role:'melee',color:'#c7c16f',speed:1.15,hp:0.9,range:36,attack:'flank'},
    {id:'weaver',name:'Bolt Weaver',role:'ranged',color:'#b294ed',speed:0.83,hp:0.7,range:270,attack:'single'},
    {id:'orbiter',name:'Needlewing',role:'ranged',color:'#65d6ef',speed:1.05,hp:0.75,range:315,attack:'spiral'},
    {id:'ghost',name:'Wraith Sniper',role:'ranged',color:'#c7adff',speed:0.92,hp:0.55,range:405,attack:'pierce'},
    {id:'hexer',name:'Hex Whisperer',role:'caster',color:'#f38ecb',speed:0.83,hp:0.65,range:340,attack:'hex'},
    {id:'summoner',name:'Swarm Caller',role:'caster',color:'#c4a6ff',speed:0.7,hp:0.85,range:350,attack:'summon'},
    {id:'blight',name:'Blight Oracle',role:'caster',color:'#b5df6a',speed:0.85,hp:0.75,range:360,attack:'plague'}
  ];
  const bosses=[
    {id:'alley-king',name:'The Alley King',attack:'charge',color:'#ef829f',shape:'crown'},
    {id:'iron-titan',name:'Iron Titan',attack:'shockwave',color:'#9dbfd8',shape:'armor'},
    {id:'neon-siren',name:'Neon Siren',attack:'spiral',color:'#ff8dd9',shape:'antenna'},
    {id:'moth-queen',name:'The Moth Queen',attack:'summon',color:'#bad6ff',shape:'wings'},
    {id:'rust-butcher',name:'Rust Butcher',attack:'cleave',color:'#f7ac68',shape:'blades'},
    {id:'venom-oracle',name:'Venom Oracle',attack:'plague',color:'#b9e77e',shape:'hood'},
    {id:'echo-reaper',name:'Echo Reaper',attack:'pierce',color:'#c39dff',shape:'mask'},
    {id:'volt-hydra',name:'Volt Hydra',attack:'chain',color:'#8de6e5',shape:'horns'},
    {id:'the-catastrophe',name:'THE CATASTROPHE',attack:'nova',color:'#ff7caa',shape:'crown'}
  ];
  const elites=[
    {id:'jawbreaker',name:'Jawbreaker',attack:'charge',color:'#ffba9b',shape:'fangs'},
    {id:'scrapper',name:'Scrapper',attack:'cleave',color:'#edaa73',shape:'armor'},
    {id:'watcher',name:'Watcher',attack:'pierce',color:'#b2e8fa',shape:'mask'},
    {id:'pulse-drone',name:'Pulse Drone',attack:'spiral',color:'#b3d4ef',shape:'antenna'},
    {id:'grave-herald',name:'Grave Herald',attack:'summon',color:'#c1abf2',shape:'hood'},
    {id:'storm-magus',name:'Storm Magus',attack:'hex',color:'#e6b9e8',shape:'horns'}
  ];
  const superElites=[
    {id:'dreadnought',name:'Dreadnought',attack:'shockwave',color:'#ff9b8c',shape:'armor'},
    {id:'plague-empress',name:'Plague Empress',attack:'plague',color:'#b7ec88',shape:'wings'},
    {id:'void-harbinger',name:'Void Harbinger',attack:'nova',color:'#d9a9ff',shape:'crown'}
  ];
  const catalog=Object.freeze({normal,bosses,elites,superElites});
  function nightAt(t) {return Math.min(MAX_NIGHTS,Math.max(1,1+Math.floor(Math.max(0,t)/NIGHT_SECONDS)));}
  function getNight(n) {
    if(!Number.isInteger(n)||n<1||n>100)throw Error('Night out of range');
    const boss=n%9===0&&n<100,elite=n%6===0&&n<100;
    const eliteCategory=elite?((n/6)%2===1?'elite':'superElite'):null;
    return Object.freeze({number:n,start:(n-1)*NIGHT_SECONDS,end:n*NIGHT_SECONDS,
      boss,bossIndex:boss?(n===99?8:(n/9-1)%bosses.length):-1,
      elite,eliteCategory,eliteIndex:elite?Math.floor(n/12)%((eliteCategory==='elite'?elites:superElites).length):-1,
      final:n===100,
      events:Object.freeze([...(boss?['boss']:[]),...(elite?[eliteCategory]:[]),...(n===100?['finale']:[])])
    });
  }
  const schedule=Object.freeze(Array.from({length:100},(_,i)=>getNight(i+1)));
  function newLedger(){return {night:1,events:[],credited:[],boss:0,elite:0,superElite:0,finaleCleared:false,won:false};}
  function kill(ledger,id,kind) {
    if(!id||ledger.credited.includes(id))return false;
    if(!['boss','elite','superElite'].includes(kind))return false;
    ledger.credited.push(id);ledger[kind]++;return true;
  }
  function won(ledger,alive) {
    return !!(alive&&ledger.night===100&&ledger.finaleCleared);
  }
  const songs={
    ironmarch:{id:'ironmarch',name:'Iron March',bpm:156,roots:[82.41,73.42,65.41,61.74],mode:'minor',
      lead:[0,null,7,null,10,7,null,5,3,null,5,7,10,null,7,3],
      bass:[0,0,null,7,0,null,5,7,0,null,12,7,5,null,3,0]},
    afterlight:{id:'afterlight',name:'Afterlight',bpm:124,roots:[110.00,130.81,146.83,98.00],mode:'dorian',
      lead:[12,10,7,5,null,7,10,12,14,null,12,10,7,5,3,null],
      bass:[0,null,7,null,12,null,7,5,0,7,null,12,7,null,5,3]}
  };
  const publicApi=Object.freeze({NIGHT_SECONDS,MAX_NIGHTS,VICTORY_SCORE,catalog,nightAt,getNight,schedule,newLedger,kill,won,songs});
  root.CATA_MAJOR=publicApi;
  if(typeof module!=='undefined'&&module.exports)module.exports=publicApi;
})(typeof globalThis!=='undefined'?globalThis:this);

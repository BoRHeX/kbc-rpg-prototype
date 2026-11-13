/* Local studio voices. No network, wall-clock timers, or combat RNG. */
(function(root){
'use strict';
const split=s=>s.split('|');
const voices={
hero:{
 start:split('Right. Whiskers forward.|This city owes me a sunbeam.|Nine lives. One very long evening.|Paws quiet. Eyes open.'),
 hurt:split('Ow. That one had ambition.|Still here. Slightly rearranged.|My ribs object.|That coat was freshly licked.'),
 healRequest:split('Medic? My dignity is leaking.|Holding still. Mostly.|A little patchwork, please.'),
 healed:split('That feels like tomorrow.|Excellent. More cat per cat.|Stitches before speeches.'),
 feral:split('The polite cat has clocked out.|Whiskers: maximum voltage.|Oh. The claws have opinions.'),
 adrenaline:split('Still breathing. Faster now.|Second wind. First warning.|My paws found another gear.'),
 miss:split('A warning shot for the pavement.|The air looked suspicious.|That brick had it coming.|Adjusting my extremely deliberate aim.'),
 fish:split('Pocket fish. Future happiness.|Salvage with fins.|Paid in delicious currency.|Another tiny reason to survive.'),
 idle:split('I can hear my own whiskers.|Quiet has terrible timing.|Is that rain, or a very small drummer?|I miss windowsills.'),
 guide:split('My survival notes? Tucked under Pause. Pawwritten.|Pause has a Guide. Even cats read maps.|Guide in the pause menu. My secret tutor.|Stuck? Pause. Guide. Pretend it was instinct.'),
 death:split('Keep my patch of sunlight warm.|One paw short of morning.|Tell the city I scratched back.'),
 victory:split('Morning. I remember this colour.|We made room for the sun.|Someone find a windowsill. A big one.')},
shooter:{
 recruit:split('Six rounds. Seven opinions.|Right flank reporting. Mostly sober.|I brought spare confidence.'),
 special:split('Short bursts. Long receipts.|Everyone gets a warning. Rapidly.|Clearing our breathing room.'),
 seek:split('Securing edible ammunition.|One fish. Cover my snack.|Supply run. Very small supply.'),
 fed:split('Reloaded the stomach.|That was a tactical crunch.|Snack secured. Flank restored.'),
 idle:split('Counting rounds counts as meditation.|My reload has a dramatic pause.|No, bard, the gun is not percussion.|I named the last cartridge Dennis.'),
 reply:split('Dennis approves.|Copy that. With whiskers.|Putting that in the report.')},
healer:{
 recruit:split('Paws clean. Expectations modest.|I mend cats, not decisions.|Please queue your catastrophes.'),
 special:split('Stay still. I brought tomorrow.|Breathe in. Stop collecting injuries.|Gentle paws. Firm instructions.'),
 seek:split('A snack is preventive medicine.|Checking the fish for morale.|One small nutritional intervention.'),
 fed:split('Recommended dose: one fish.|Chew before charging.|Morale has a pulse again.'),
 idle:split('No licking the bandages.|My medical bag is mostly stern looks.|Tank, resting is also a skill.|I prescribe one uninterrupted minute.'),
 reply:split('That is not a medical diagnosis.|I heard that. Drink some rain.|Alive is a good starting point.')},
tank:{
 recruit:split('Stand behind the large cat.|I carry the door. Metaphorically.|Soft friends. Hard perimeter.'),
 special:split('Here is where the trouble stops.|I am the inconvenient wall.|Small cats, behind me.'),
 seek:split('Wall taking a lunch break.|Checking perimeter fish.|One bite. Still on watch.'),
 fed:split('Wall reinforced.|Load-bearing snack installed.|Back to being architecture.'),
 idle:split('I could hold a roof. A small roof.|Nobody steps on our small cats.|My shield doubles as a soup dish.|I miss doors that stayed shut.'),
 reply:split('The wall heard you.|Safe behind me. Always.|I can carry that too.')},
brawler:{
 recruit:split('Point me at the rude shapes.|I have negotiated with my claws.|Tiny cat. Large disagreement.'),
 special:split('Personal space, enforced!|Claws have entered the discussion.|I brought the punctuation!'),
 seek:split('Chasing lunch. Professionally.|Fish cannot outrun enthusiasm.|Claws off. Snack paws on.'),
 fed:split('Tasted like victory. Smaller bones.|I fought the fish. Politely.|Ready for more bad decisions.'),
 idle:split('Can we punch the weather?|My left hook needs a hobby.|I could outrun that lamp.|Sniper says patience. I say pounce.'),
 reply:split('Was that a dare?|I can make it louder.|Fine. Only a little pounce.')},
sniper:{
 recruit:split('Rear left. Clear sight.|One breath. One answer.|I prefer distant disagreements.'),
 special:split('Wind checked. Ending selected.|Hold the lane.|That one. Exactly that one.'),
 seek:split('Fish acquired in my sights.|Briefly adjusting my lunch angle.|A measured detour.'),
 fed:split('One bite. No collateral.|A clean catch.|Returning to the long view.'),
 idle:split('Silence is excellent camouflage.|Brawler, patience has range.|I counted the raindrops. Lost at nine.|Dennis is a poor cartridge name.'),
 reply:split('Observed.|Your volume has range too.|I will consider that. Quietly.')},
engineer:{
 recruit:split('I brought parts. Some match.|Everything is repairable. Allegedly.|Stand clear of my good idea.'),
 special:split('Deploying a mechanical opinion.|Bolts tight. Ethics provisional.|Please admire from behind cover.'),
 seek:split('Fuel for the design department.|Testing organic power cells.|Fish-shaped maintenance break.'),
 fed:split('System purring normally.|Calories converted to questionable ideas.|No spare screws in this one.'),
 idle:split('What if the turret had slippers?|That lamp owes me a spring.|I built a clock. It says run.|No, tank, you cannot be upgraded with hinges.'),
 reply:split('I can build that. Probably.|That voids the warranty.|Writing that on a spare bolt.')},
trapper:{
 recruit:split('Mind the string. Always the string.|I plan several paws ahead.|The floor and I have an agreement.'),
 special:split('Their next step is spoken for.|Patience, tied in a knot.|Laying out a bad surprise.'),
 seek:split('A fish outside my trap. Novel.|Checking a very edible lead.|Quick detour. No strings attached.'),
 fed:split('Caught lunch without paperwork.|Bait successfully eaten by employee.|Back to the careful business.'),
 idle:split('Nobody trip over my optimism.|I tie knots when nervous. Many knots.|The pavement tells on everyone.|Bard, please stop rhyming snare with chair.'),
 reply:split('I see the catch.|That needs a better knot.|Leaving myself an escape route.')},
bard:{
 recruit:split('I brought the soundtrack to poor choices.|A quartet? I count five egos.|Please survive until the chorus.'),
 special:split('For everyone still standing!|Louder hearts. Steadier paws.|This chorus has teeth!'),
 seek:split('A brief intermission for fish.|Seeking inspiration. It has fins.|Solo in sea minor.'),
 fed:split('An exquisite crunchy bridge.|The fish declined an encore.|Lunch deserves a standing ovation.'),
 idle:split('Snare. Chair. Glorious despair.|Tank, you have excellent acoustics.|Dennis deserves a ballad.|I only know three chords. All brave.'),
 reply:split('That goes in verse two.|A duet! Against our better judgement.|I shall rhyme that responsibly.')}
};
const shared={
 arrival:split('Big silhouette. Keep the lanes clear.|That is trouble with a title.|Eyes up. Something important arrived.|Make space. Watch its first move.'),
 defeated:split('One less shadow on the street.|That one will not follow us.|Good work. Keep moving.|A little more room to breathe.'),
 encounter:split('Something nearby changed. Watch your paws.|Keep a way out of this street.|City has a new surprise for us.'),
 late:split('Last nights. Stay close now.|No jokes over the next footsteps.|We carry each other through this.|Listen for the gaps. Save your strength.|Morning is close. We still have work.'),
 hunger:split('There is fish nearby. Tempting.|Lunch can wait for a safe street.|I smell supplies. Also rain.'),
 callback:split('Save a bite for the architect.|Dennis says thank you.|No songs with your mouth full.|A snack and straight back. Good cat.')
};
voices.hero.tutorial=split('Move to make room. The city will not.|Paws first. Keep an escape lane.|Standing still is a choice. Pick your moment.');
const misses={shooter:'Dennis missed his appointment.|Adjusting the right flank.',sniper:'A fraction wide. Correcting.|The pavement moved. Unhelpful.',brawler:'',healer:'',tank:'',engineer:'Turret, try the other direction.|Recalibrating the enthusiasm.',trapper:'',bard:''};
for(const [role,lines] of Object.entries(misses))if(lines)voices[role].miss=split(lines);
const exchanges={
 'I named the last cartridge Dennis.':{role:'sniper',text:'Dennis is a poor cartridge name.'},
 'Dennis is a poor cartridge name.':{role:'shooter',text:'He prefers Dennis the Menace.'},
 'Tank, you have excellent acoustics.':{role:'tank',text:'The wall does not take requests.'},
 'No, tank, you cannot be upgraded with hinges.':{role:'tank',text:'I was asking for a friend. A door.'},
 'Snare. Chair. Glorious despair.':{role:'trapper',text:'I am tying the next knot in that rhyme.'},
 'Brawler, patience has range.':{role:'brawler',text:'So does a running jump.'},
 'I prescribe one uninterrupted minute.':{role:'bard',text:'An entire minute without a solo? Brave.'}
};
const priorities={tutorial:35,death:100,victory:100,arrival:85,hurt:80,healRequest:75,healed:75,feral:70,adrenaline:65,late:65,defeated:60,recruit:55,special:45,encounter:45,seek:30,fed:35,fish:25,guide:24,hunger:18,miss:15,idle:10,reply:10,callback:10,start:50};
function create(seed=1){return {seed:seed>>>0,clock:0,active:[],queue:[],history:[],cooldowns:{},eventTimes:{},used:{},serial:0,nextIdle:14,started:false,seen:[],night:0,lastHp:null,lastFish:0,feral:false,adrenaline:false,encounter:null,reply:null,guideAt:18};}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function emit(s,role,event,options={}){
 if(s?.serious&&['idle','reply','callback','miss','fish','hunger','seek','fed','guide','tutorial'].includes(event))return false;
 if(!s||!(voices[role]||role==='hero'))return false;
 const key=role+':'+event, gap=options.gap??(event==='miss'?24:event==='special'?18:8);
 if(s.clock<(s.eventTimes[key]??-100)+gap)return false;
 s.eventTimes[key]=s.clock;
 const bank=(s.serious&&event==='special'?shared.late:voices[role][event]||shared[event]);if(!bank)return false;
 const unused=bank.map((line,i)=>i).filter(i=>!(s.used[key]||[]).includes(i));
 if(!unused.length)s.used[key]=[];
 const previous=s.lastLine?.[key];
 const eligible=unused.length?unused:bank.map((_,i)=>i).filter(i=>bank.length===1||i!==previous);
 const fresh=eligible.filter(i=>!(s.recentTexts||[]).includes(bank[i]));
 const pool=fresh.length?fresh:eligible,index=pool[Math.floor(random(s)*pool.length)];
 (s.recentTexts||(s.recentTexts=[])).push(options.text||bank[index]);if(s.recentTexts.length>14)s.recentTexts.shift();
 (s.lastLine||(s.lastLine={}))[key]=index;
 (s.used[key]||(s.used[key]=[])).push(index);
 const item={id:++s.serial,role,event,text:bank[index],priority:s.serious&&event==='special'?65:priorities[event]||20,created:s.clock,expires:s.clock+(options.ttl||7),...options};
 s.queue.push(item);s.queue.sort((a,b)=>b.priority-a.priority||a.id-b.id);s.queue.length=Math.min(10,s.queue.length);return true;
}
function tick(s,g,dt,guideAvailable=false){
 if(g.mode!=='running')return;
 s.serious=g.campaign.night>=98;
 if(s.serious){s.reply=null;s.queue=s.queue.filter(b=>b.priority>=60);s.active=s.active.filter(b=>b.priority>=60);}
 s.clock+=dt;s.active=s.active.filter(b=>b.until>s.clock);
 const roles=['hero',...g.companionSquad.map(c=>c.type)],p=g.player;
 if(!s.started){s.started=true;emit(s,'hero','start');}
 if(!s.tutorial&&s.clock>=6&&g.campaign.night<98){s.tutorial=true;emit(s,'hero','tutorial');}
 if(s.lastHp!==null&&p.hp>s.lastHp+.015)emit(s,'hero','healed',{gap:22});
 s.lastHp=p.hp;
 if(p.hp<p.maxHp-.4&&g.companionSquad.some(c=>c.type==='healer'))emit(s,'hero','healRequest',{gap:35});
 if(g.feralInstinct.active&&!s.feral)emit(s,'hero','feral');s.feral=g.feralInstinct.active;
 if(g.buffs.survivalInstinct>0&&!s.adrenaline)emit(s,'hero','adrenaline');s.adrenaline=g.buffs.survivalInstinct>0;
 for(const e of g.enemies)if(e.hp>0&&e.creditCategory&&!s.seen.includes(e.id)){s.seen.push(e.id);if(s.seen.length>100)s.seen.shift();emit(s,roles[(s.serial+1)%roles.length],'arrival');}
 if(g.campaign.night!==s.night){s.night=g.campaign.night;if(s.night>=98)emit(s,roles[s.serial%roles.length],'late',{gap:0});}
 for(const e of g.enemies)if(e.hp>0&&(e.cocoon||e.mutant||e.mutation||e.variant==='ghost')&&Math.hypot(e.x-p.x,e.y-p.y)<300&&!(s.unusualSeen||[]).includes(e.id)){
  (s.unusualSeen||(s.unusualSeen=[])).push(e.id);if(s.unusualSeen.length>40)s.unusualSeen.shift();emit(s,roles[s.serial%roles.length],'encounter',{gap:30});
 }
 const encounter=g.cityEvents.active;
 if(encounter&&encounter.id!==s.encounter){s.encounter=encounter.id;emit(s,roles[s.serial%roles.length],'encounter');}
 if(guideAvailable&&s.clock>=s.guideAt&&g.campaign.night<98){emit(s,'hero','guide',{gap:120});s.guideAt=s.clock+150;}
 if(s.reply&&s.clock>=s.reply.at){if(roles.includes(s.reply.role))emit(s,s.reply.role,s.reply.event,{ttl:4,...(s.reply.text?{text:s.reply.text}:{})});s.reply=null;}
 if(s.clock>=s.nextIdle){
  s.nextIdle=s.clock+18+random(s)*15;
  const nearby=g.enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<300);
  if(!nearby&&g.campaign.night<98){const role=roles[Math.floor(random(s)*roles.length)];emit(s,role,g.fishItems.some(f=>Math.hypot(f.x-p.x,f.y-p.y)<280)?'hunger':'idle');}
 }
 s.queue=s.queue.filter(b=>b.expires>s.clock&&roles.includes(b.role));
 dispatch(s,roles,g.campaign.night);
}
function dispatch(s,roles,night=1){
 for(let i=0;i<s.queue.length;i++){
  const b=s.queue[i];if((s.nextSpeechAt||0)>s.clock&&b.priority<75)continue;if((s.cooldowns[b.role]||0)>s.clock&&b.priority<75)continue;
  if(s.active.some(a=>a.role===b.role)){if(b.priority<75||s.active.some(a=>a.role===b.role&&a.priority>=b.priority))continue;s.active=s.active.filter(a=>a.role!==b.role);}
  if(s.active.length>=2){const low=s.active.reduce((a,c)=>a.priority<c.priority?a:c);if(low.priority>=b.priority)continue;s.active=s.active.filter(a=>a!==low);}
  s.queue.splice(i,1);s.nextSpeechAt=s.clock+1.1;b.until=s.clock+Math.max(2.8,Math.min(4.8,1.3+b.text.length*.055));s.active.push(b);s.cooldowns[b.role]=b.until+5;
  s.history.push({role:b.role,event:b.event,text:b.text,at:s.clock});if(s.history.length>40)s.history.shift();
  const exchange=exchanges[b.text];
  if(night<98&&exchange&&roles.includes(exchange.role)){s.reply={role:exchange.role,event:'reply',text:exchange.text,at:b.until+.5};}
  if(night<98&&roles.length>1&&['idle','fed'].includes(b.event)&&!s.reply){const others=roles.filter(r=>r!=='hero'&&r!==b.role);if(others.length)s.reply={role:others[Math.floor(random(s)*others.length)],event:b.event==='fed'?'callback':'reply',at:b.until+.5};}
  break;
 }
}
// Stage 2 owns the Guide UI; it registers availability, never a duplicate panel.
let guide=null;
function registerGuide(provider){guide=provider&&typeof provider.available==='function'?provider:null;}
function guideAvailable(){try{return !!(guide&&guide.available());}catch(_){return false;}}
let layer=null,nodes=new Map(),hudNodes=[],blockers=[],geometryAt=-1,geometrySize='';
function render(s,g,canvas,W,H,shakeX=0,shakeY=0){
 if(typeof document==='undefined')return;
 if(!layer){layer=document.createElement('div');layer.className='cat-speech-layer';canvas.parentElement.appendChild(layer);hudNodes=[...document.querySelectorAll('.identity,.hud,.quick-controls,.companion-abilities,#boss-status,#night-status,.secondary-controls,#support-status,#buff-status,#notice,.overlay')];}
 const show=!!s&&!!g&&!['paused','upgrade','upgrading'].includes(g.mode);
 const pointing=show&&s.active.some(b=>b.event==='guide');
 const pauseButton=document.getElementById('pause');if(pauseButton)pauseButton.classList.toggle('cat-guide-point',pointing);
 const bubbles=show?s.active:[],ids=new Set(bubbles.map(b=>b.id));
 for(const [id,node] of nodes)if(!ids.has(id)){node.remove();nodes.delete(id);}
 const rect=canvas.getBoundingClientRect(),scaleX=rect.width/W,scaleY=rect.height/H;
 // Cache the small HUD set once per render, not once per bubble.
 const size=[rect.left,rect.top,rect.width,rect.height,g?.mode].join(':');
 if(!s||s.clock>=geometryAt||size!==geometrySize){blockers=hudNodes.filter(n=>!n.hidden&&n.getClientRects().length).map(n=>n.getBoundingClientRect());geometryAt=(s?.clock||0)+.08;geometrySize=size;}
 const placed=[];
 for(const b of bubbles){
  const actor=b.role==='hero'?g.player:g.companionSquad.find(c=>c.type===b.role);if(!actor)continue;
  let node=nodes.get(b.id);if(!node){node=document.createElement('div');node.className='cat-speech';node.dataset.catSpeech=b.role;node.dataset.speechEvent=b.event;node.textContent=b.text;layer.appendChild(node);nodes.set(b.id,node);}
  const ax=rect.left+(actor.x-g.player.x+W/2+shakeX)*scaleX,ay=rect.top+(actor.y-g.player.y+H/2+shakeY)*scaleY-(actor.r+12)*scaleY;
  node.hidden=false;if(!node.speechSize)node.speechSize={width:node.offsetWidth,height:node.offsetHeight,viewport:rect.width};
  if(node.speechSize.viewport!==rect.width)node.speechSize={width:node.offsetWidth,height:node.offsetHeight,viewport:rect.width};
  const {width,height}=node.speechSize;
  let x=Math.max(rect.left+6,Math.min(rect.right-width-6,ax-width/2)),y=ay-height-9;
  const overlaps=(x,y,r)=>x<r.right+4&&x+width>r.left-4&&y<r.bottom+4&&y+height>r.top-4;
  let fits=false;
  for(const shift of [0, -height-12, height+48]){const cy=y+shift;if(cy<rect.top+4||cy+height>rect.bottom-4)continue;if([...blockers,...placed].some(r=>overlaps(x,cy,r)))continue;y=cy;fits=true;break;}
  // Suppress off-camera actors or a bubble that cannot fit; never detach a distant caption.
  node.hidden=!fits||ax<rect.left||ax>rect.right||ay<rect.top||ay>rect.bottom||Math.abs(x+width/2-ax)>90;
  node.style.left=x+'px';node.style.top=y+'px';node.style.setProperty('--tail-x',Math.max(10,Math.min(width-10,ax-x))+'px');node.classList.toggle('tail-up',y>ay);
  if(!node.hidden)placed.push({left:x,right:x+width,top:y,bottom:y+height});
  if(b.event==='guide'){node.dataset.guideTarget='pause-menu';if(guide&&typeof guide.cue==='function'){try{guide.cue({actor:'hero',target:'pause',until:b.until,clock:s.clock});}catch(_){/* The Guide may mount after the game. */}}}
 }
}
function presentation(){return [...nodes.values()].map(n=>({role:n.dataset.catSpeech,event:n.dataset.speechEvent,visible:!n.hidden,text:n.textContent,left:parseFloat(n.style.left),top:parseFloat(n.style.top)}));}
const api={pass:'cats-alive-01',presentation,voices,shared,create,emit,tick,dispatch,render,registerGuide,guideAvailable,contractVersion:1};root.CATA_CATS=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);

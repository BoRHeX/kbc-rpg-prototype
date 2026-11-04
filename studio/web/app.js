/* BoRHeZ Games mobile production control room. No secrets stored in the browser. */
'use strict';
var $ = function (id) { return document.getElementById(id); };
var state = null, tab = 'overview', selectedJob = null, noticeTimer = null;
var roles = [
  {name:'Intake', icon:'⇩', desc:'Monitors authorized Drive folders and inventories recordings.'},
  {name:'Producer', icon:'▦', desc:'Creates jobs, validates recording packages and coordinates stages.'},
  {name:'Editor', icon:'✂', desc:'Uses FFmpeg to combine gameplay, mic and optional camera.'},
  {name:'Quality', icon:'✓', desc:'Checks render completion; never claims human creative approval.'},
  {name:'Packaging', icon:'✦', desc:'Drafts metadata using your game and session notes.'},
  {name:'Publisher', icon:'↑', desc:'Waits for your explicit consent; can upload privately with OAuth.'},
  {name:'Analytics', icon:'◫', desc:'Reserved for genuine authorized YouTube analytics, not fake traffic.'}
];
function esc(x) {
  return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function shortTime(t) { return t ? esc(t.replace('T',' ').slice(0,16)) : '—'; }
function toast(msg, bad) {
  var el = $('toast'); el.textContent = msg; el.className = 'toast' + (bad ? ' error' : '');
  el.hidden = false; clearTimeout(noticeTimer);
  noticeTimer = setTimeout(function () { el.hidden = true; }, 5200);
}
async function call(url, method, payload) {
  var opts = {method:method || 'GET', credentials:'same-origin', headers:{}};
  if (payload !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(payload);
  }
  var response = await fetch(url, opts);
  var data = await response.json();
  if (!response.ok) {
    if (response.status === 401) showLogin();
    throw new Error(data.error || 'Request failed');
  }
  return data;
}
function showLogin() { $('login').hidden = false; $('workspace').hidden = true; }
async function refresh(quiet) {
  try {
    state = await call('/api/state');
    $('login').hidden = true; $('workspace').hidden = false;
    if (!selectedJob && state.jobs.length) selectedJob = state.jobs[0].id;
    if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    render();
  } catch (err) {
    if (!quiet) toast(err.message, true);
  }
}
function switchTab(name) {
  tab = name;
  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-tab') === name);
  });
  render(); window.scrollTo({top:0,behavior:'smooth'});
}
function head(kicker,title,subtitle,buttons) {
  return '<section class="intro"><div><p class="eyebrow">'+esc(kicker)+'</p><h1>'+esc(title)+'</h1><p>'+
    esc(subtitle)+'</p></div><div class="actions">'+(buttons||'')+'</div></section>';
}
function badge(status) {
  return '<span class="pill '+esc(status)+'">'+esc(status.replaceAll('_',' '))+'</span>';
}
function jobCard(j, withActions) {
  var buttons = '';
  if (withActions) buttons =
    '<button class="secondary" data-open="'+esc(j.id)+'">View production</button>';
  return '<article class="job"><div class="job-top"><div><h3>'+esc(j.title)+'</h3>'+
    '<p>'+esc(j.session_id.slice(0,48))+'</p></div>'+badge(j.status)+'</div>'+
    '<div class="job-meta"><span>'+shortTime(j.created_at)+'</span>'+
    '<span>·</span><span>'+esc(Object.keys(j.assets).length)+' media files</span>'+
    (j.demo ? '<span>· DEMONSTRATION</span>' : '')+'</div>'+
    (buttons ? '<div class="actions" style="margin-top:13px">'+buttons+'</div>':'')+'</article>';
}
function eventLine(e) {
  return '<div class="event"><div class="event-icon">'+
    (e.action === 'failed' ? '!' : e.action === 'vote' ? '✓' : '●')+
    '</div><div><b>'+esc(e.agent)+' · '+esc(e.action)+'</b><p>'+
    esc(e.note)+'</p><time>'+shortTime(e.created_at)+'</time></div></div>';
}
function overview() {
  var jobs = state.jobs, pending = jobs.filter(function(x){return x.status === 'REVIEW';}).length;
  var active = jobs.filter(function(x){return ['RECEIVED','PROCESSING','UPLOADING'].includes(x.status);}).length;
  var uploaded = jobs.filter(function(x){return x.status === 'PRIVATE_ON_YOUTUBE';}).length;
  var buttons = '<button class="primary" data-action="scan">↻ Scan Drive</button>'+
    '<button class="secondary" data-action="demo">Run demo</button>';
  var counts = [
    {num:jobs.length,name:'Recording jobs',hint:'Imported sessions and demonstrations'},
    {num:active,name:'In production',hint:'Active, queued or uploading'},
    {num:pending,name:'Needs your review',hint:'Rendered real videos only'},
    {num:uploaded,name:'Private uploads',hint:'Never made public automatically'}
  ];
  var cards = counts.map(function(c) {return '<div class="stat"><span class="tiny">'+esc(c.name)+'</span>'+
    '<div class="num">'+c.num+'</div><span class="hint">'+esc(c.hint)+'</span></div>';}).join('');
  return head('YOUR CREATIVE HEADQUARTERS','Play. Record. Delegate.',
      'One place to inspect what your production software is actually doing.',buttons)+
    '<div class="stats">'+cards+'</div><div class="grid-two"><section class="panel">'+
    '<div class="section-heading"><h2>Production queue</h2>'+
    '<button class="ghost" data-tab="pipeline">All jobs →</button></div>'+
    (jobs.length ? jobs.slice(0,4).map(function(j){return jobCard(j,true);}).join('') : empty())+
    '</section><section class="panel"><div class="section-heading"><h2>Agent activity</h2>'+
    '<button class="ghost" data-tab="activity">Full log →</button></div>'+
    (state.events.length ? state.events.slice(0,7).map(eventLine).join('') :
    '<p class="note">Agents are idle. Scan a configured Drive folder or run a labeled demonstration.</p>')+
    '</section></div><section class="panel"><h2>Operating rules</h2><p class="note">'+
    'Your gameplay stays under your control. Real processing uses your files. No synthetic viewers, no automated likes, and no public YouTube upload without a separate decision. '+
    'The current crew executes explicit production rules; model-led editorial reasoning is a later adapter.</p></section>';
}
function empty() {
  return '<div class="empty"><span class="emoji">◈</span>No jobs yet.<br>'+
    'When Drive is connected, add a recording folder and tap Scan Drive.</div>';
}
function workflow() {
  var completed = {Intake:true,Producer:true,Editor:true,Quality:true,Packaging:true};
  var job = state.jobs.find(function(x){return x.id === selectedJob;}) || state.jobs[0];
  var done = job && ['REVIEW','APPROVED','PRIVATE_ON_YOUTUBE'].includes(job.status);
  var steps = roles.map(function(r,i){
    var stepDone = done && i <= 4 || job && job.status === 'PRIVATE_ON_YOUTUBE' && i === 5;
    var waiting = job && job.status === 'REVIEW' && i === 5;
    return '<div class="pipe-step'+(stepDone?' done':waiting?' wait':'')+'"><i>'+r.icon+'</i><b>'+r.name+
      '</b><small>'+(stepDone?'Completed':waiting?'Awaiting review':'Defined stage')+'</small></div>';
  }).join('');
  var detail = '<section class="panel"><h2>Production details</h2>';
  if (!job) detail += empty();
  else {
    detail += jobCard(job,false)+'<div class="pipeline">'+steps+'</div>'+
      '<p class="note" style="margin-top:15px">Agent activity records actual events. Completed stages in a demo do not represent edited footage.</p>';
    if (job.status === 'RECEIVED')
      detail += '<button class="primary" data-run="'+esc(job.id)+'">Start processing</button>';
    if (job.status === 'ERROR')
      detail += '<p class="review note">Processing failed. Read the activity log to diagnose the issue.</p>';
    if (job.demo)
      detail += '<p class="review note">DEMONSTRATION ONLY. No footage was processed; no YouTube action is available.</p>';
    if (job.has_preview)
      detail += '<h3 style="margin-top:20px">Episode preview</h3><video controls playsinline preload="metadata" src="/api/video/'+
        esc(job.id)+'"></video>';
    if (job.shorts && job.shorts.length)
      detail += '<p class="note">Generated marked Shorts: '+job.shorts.map(esc).join(', ')+'</p>';
    if (job.status === 'REVIEW')
      detail += reviewForm(job);
    if (job.status === 'APPROVED')
      detail += '<div class="review"><b>Approved — private upload available</b><p class="note">'+
        'The next action sends this specific finished video to your authorized YouTube channel as PRIVATE. '+
        'It does not publish it publicly.</p>'+
        '<button class="primary" data-upload="'+esc(job.id)+'">Upload private to YouTube</button></div>';
    if (job.youtube_id)
      detail += '<p class="note">YouTube video: <a target="_blank" rel="noreferrer" href="https://www.youtube.com/watch?v='+
         esc(job.youtube_id)+'">'+esc(job.youtube_id)+'</a> (uploaded privately)</p>';
  }
  return head('PRODUCTION BOARD','From recording to episode.',
    'Each stage is auditable and visible on your phone.',
    '<button class="primary" data-action="scan">Scan Drive</button>')+
    '<div class="grid-two"><div>'+detail+'</section></div><section class="panel"><h2>Sessions</h2>'+
    (state.jobs.length ? state.jobs.map(function(j){
      return '<button class="navlink" style="width:100%;border-bottom:1px solid var(--line);border-radius:0" data-open="'+
        esc(j.id)+'"><span>'+esc(j.title)+' · '+esc(j.status)+'</span></button>';
    }).join('') : empty())+'</section></div>';
}
function reviewForm(job) {
  return '<form id="approval" data-id="'+esc(job.id)+'" class="review">'+
    '<h3>Creator approval</h3><p class="note">Review the actual edit and metadata before allowing YouTube upload.</p>'+
    '<label for="video-title">Title (up to 100 characters)</label>'+
    '<input required maxlength="100" id="video-title" name="title" value="'+esc(job.title)+'">'+
    '<label for="video-description">Description</label>'+
    '<textarea id="video-description" name="description" maxlength="4900" required>'+
      esc(job.description)+'</textarea>'+
    '<label for="made-for-kids">Is this video made for kids?</label>'+
    '<select id="made-for-kids" name="made_for_kids" required><option value="">Choose explicitly</option>'+
    '<option value="yes">Yes</option><option value="no">No</option></select>'+
    '<label><input type="checkbox" name="rights" style="width:auto;margin-right:8px" required>'+
    'I confirm this is my authorized footage and I have reviewed the content.</label>'+
    '<button type="submit" class="primary wide">Approve metadata and finished video</button></form>';
}
function team() {
  var latestByAgent = {};
  state.events.forEach(function(e){if(!latestByAgent[e.agent]) latestByAgent[e.agent] = e;});
  var cards = roles.map(function(role){
    var event = latestByAgent[role.name];
    return '<div class="agent"><div class="agent-avatar">'+role.icon+'</div>'+
      '<h3>'+role.name+'</h3><p>'+esc(role.desc)+'</p>'+
      '<span class="pill">'+(event ? esc(event.action) : 'IDLE')+'</span>'+
      (event ? '<p style="margin-top:10px">'+esc(event.note)+'</p>' : '')+'</div>';
  }).join('');
  return head('OPERATIONS','Your production crew.',
    'Rule-driven modules are observable now. They do not impersonate autonomous human employees.')+
    '<section class="panel"><h2>Department roster</h2><div class="agent-grid">'+cards+'</div></section>'+
    '<section class="panel"><h2>Decisions & review</h2><p class="note">'+
    'Engineering checks can pass automatically, but subjective editorial quality and publication remain your call. '+
    'No majority vote can override rights, account restrictions or your explicit consent.</p></section>';
}
function activity() {
  return head('AUDIT TRAIL','Everything the team did.',
    'Real events, stage decisions, and errors — never generated engagement numbers.')+
    '<section class="panel"><h2>Latest activity</h2>'+
    (state.events.length ? state.events.map(eventLine).join('') : empty())+'</section>';
}
function connection(name,good,detail) {
  return '<div class="integration"><div><b>'+esc(name)+'</b><small>'+esc(detail)+'</small></div>'+
  '<span class="pill '+(good?'PRIVATE_ON_YOUTUBE':'')+'">'+(good?'CONFIGURED':'NOT CONFIGURED')+'</span></div>';
}
function settings() {
  var i = state.integrations;
  return head('DEPLOYMENT','Connect the tools.',
    'Connections used by ChatGPT are separate from credentials used by your own running app.')+
    '<section class="panel"><h2>Server connections</h2>'+
    connection('Google Drive',i.drive,'Read-only service account + shared recordings folder')+
    connection('Automatic scan',i.auto_scan,'Server must remain online to monitor new sessions')+
    connection('YouTube OAuth',i.youtube,'Private video upload only, after explicit approval')+
    '<p class="note">Descript and vidIQ are connected to ChatGPT separately. They are not yet wired into this standalone server. '+
    'No credentials are embedded in this page.</p></section>'+
    '<section class="panel"><h2>Google Drive input layout</h2><pre class="code">Recordings/\n  session-001/\n    gameplay.mp4\n    mic.wav\n    gopro.mp4       # optional\n    session.json    # optional</pre>'+
    '<h3>Optional session.json</h3><pre class="code">{\n  "game": "GTA",\n  "notes": "First session commentary",\n  "mic_offset_ms": 0,\n  "shorts": [\n    {"start": 60, "duration": 35}\n  ]\n}</pre>'+
    '<p class="note">Timestamp offsets matter: separate cameras and audio do not automatically synchronize unless they share a sync reference. '+
    'This first version supports explicit microphone offsets and marked Shorts.</p></section>';
}
function render() {
  if (!state) return;
  $('view').innerHTML = ({overview:overview,pipeline:workflow,crew:team,
    activity:activity,settings:settings}[tab] || overview)();
}
async function execute(action) {
  try {
    if (action === 'scan') {
      var discovered = await call('/api/scan','POST',{});
      toast('Drive scan complete: '+discovered.discovered+' new session(s).');
    } else if (action === 'demo') {
      await call('/api/demo','POST',{});
      toast('Labeled demonstration created. No actual footage processed.');
    }
    await refresh(true);
  } catch (e) { toast(e.message,true); }
}
document.addEventListener('click',async function(ev){
  var btn = ev.target.closest('button');
  if (!btn || btn.disabled) return;
  if (btn.dataset.tab) { switchTab(btn.dataset.tab); return; }
  if (btn.dataset.open) {selectedJob=btn.dataset.open;switchTab('pipeline');return;}
  if (btn.dataset.action) {await execute(btn.dataset.action);return;}
  if (btn.dataset.run) {
    try {await call('/api/jobs/'+btn.dataset.run+'/run','POST',{});await refresh(true);}
    catch(err){toast(err.message,true);}
  }
  if (btn.dataset.upload) {
    if (!confirm('Upload the approved video to YouTube as PRIVATE? It will not become public.')) return;
    try {
      await call('/api/jobs/'+btn.dataset.upload+'/upload','POST',{confirm_private_upload:true});
      toast('Private upload started. Track progress in the activity log.');await refresh(true);
    } catch(err){toast(err.message,true);}
  }
});
document.addEventListener('submit',async function(ev){
  if (ev.target.id !== 'approval') return;
  ev.preventDefault();
  var f = ev.target, values = new FormData(f);
  try {
    await call('/api/jobs/'+f.dataset.id+'/approve','POST',{
      title:values.get('title'),description:values.get('description'),
      made_for_kids:values.get('made_for_kids')==='yes'
    });
    toast('Approved. Private upload is now available.');await refresh(true);
  } catch(err){toast(err.message,true);}
});
$('login-form').addEventListener('submit',async function(ev){
  ev.preventDefault();
  var field = $('token');
  try {
    await call('/api/login','POST',{token:field.value});
    field.value = ''; await refresh();
  } catch(err){toast(err.message,true);}
});
$('reload').addEventListener('click',function(){refresh(false);});
refresh(true).then(function(){if(!state)showLogin();});
setInterval(function(){if(state)refresh(true);},8000);

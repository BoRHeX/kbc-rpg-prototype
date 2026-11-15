"""Original deterministic additive/noise synthesis. No samples, voices, or external music."""
import math,random,wave,struct,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'audio/generated'; SR=44100
TAU=math.tau
cues={
 'beacon-hold':(.8,[440,554.37,659.25]),'gate-begin':(1.0,[146.83,220,293.66]),
 'gate-pass':(1.3,[293.66,369.99,440,587.33]),'gate-fail':(1.2,[220,207.65,146.83]),
 'gate-relief':(2.,[220,293.66,329.63,440]),'guardian-warning':(1.5,[98,103.83,98]),
 'guardian-hit':(.18,[130.81,98]),'guardian-defeat':(1.5,[196,293.66,392,587.33]),
 'life-recovery':(1.5,[440,554.37,659.25,880]),'route-found':(.5,[587.33,880]),
 'guardian-intro':(6.,[98,146.83,155.56,130.81,98,196,146.83,98])}
index={'schema_version':1,'status':'PRODUCED_NOT_LISTENING_ACCEPTED','sample_rate':SR,'format':'PCM signed 16-bit little endian WAV','provenance':'Original deterministic additive/FM and filtered-noise synthesis authored in STUDIO/tools/compose_audio.py; no stock samples or recorded performers.','mix_policy':{'new_voice_limit':8,'ambience_gain':0.22,'sfx_gain':0.6,'warning_duck_db':-6,'use_existing_context':True,'pause_suspend':True,'unlock':'existing user gesture','music':'Preserve inherited main soundtrack; use at most one new ambience loop.'},'assets':{}}
def write(name,seconds,channels,fn,loop=False,events=None):
 rng=random.Random(name); samples=[]; peak=0; energy=0
 for i in range(round(seconds*SR)):
  values=fn(i/SR,rng)
  if channels==1: values=(values,)
  for v in values:
   peak=max(peak,abs(v)); energy+=v*v; samples.append(max(-32767,min(32767,round(v*32767))))
 p=OUT/(name+'.wav')
 with wave.open(str(p),'wb') as f:
  f.setnchannels(channels); f.setsampwidth(2); f.setframerate(SR); f.writeframes(struct.pack('<'+'h'*len(samples),*samples))
 index['assets'][name]={'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'seconds':seconds,'channels':channels,'loop':loop,'loop_start_sample':0 if loop else None,'loop_end_sample':round(seconds*SR) if loop else None,'peak_dbfs':round(20*math.log10(max(peak,1e-9)),2),'rms_dbfs':round(10*math.log10(max(energy/len(samples),1e-12)),2),'events':events,'listening_status':'NOT_AUDITIONED','verification':'PCM header, peak/RMS and boundary checks only'}
for name,(duration,notes) in cues.items():
 def cue(t,rng,notes=notes,duration=duration):
  step=duration/len(notes); j=min(len(notes)-1,int(t/step)); u=t-j*step; env=min(1,u/.008)*math.exp(-u/(step*.36))*min(1,(duration-t)/.02)
  freq=notes[j]; tone=math.sin(TAU*freq*t+0.6*math.sin(TAU*freq*2*t))*.18+math.sin(TAU*freq*2*t)*.035
  return env*tone
 write(name,duration,1,cue,events=[{'time':round(i*duration/len(notes),4),'frequency_hz':f} for i,f in enumerate(notes)])
for district,notes in [('cinder',[293.66,329.63,440,329.63]),('sluice',[440,392,329.63,293.66]),('ember',[146.83,220,196,164.81]),('terminus',[440,369.99,329.63,293.66])]:
 # 24 s = 8 bars of 4/4 at 80 BPM. Integer-cycle carriers and boundary taper.
 events=[{'time':1.5+j*6,'frequency_hz':f,'duration':2.5} for j,f in enumerate(notes)]
 def ambience(t,rng,events=events,district=district):
  edge=min(1,t/.04,(24-t)/.04); bed=.012*math.sin(TAU*55*t)+.008*math.sin(TAU*110*t)
  # Periodic broad-band pseudo-water/air from many quiet harmonic partials; no random seam.
  air=sum(math.sin(TAU*(163+k*47)*t+k)*.0009 for k in range(12))*(.65+.35*math.sin(TAU*t/6))
  left=right=0
  for j,e in enumerate(events):
   u=t-e['time']
   if 0<=u<2.5:
    env=min(1,u/.018)*math.exp(-u/0.48)*min(1,(2.5-u)/.1); f=e['frequency_hz']; note=env*(math.sin(TAU*f*u)+.22*math.sin(TAU*f*2.003*u))*.045
    left+=note*(.8 if j%2 else 1); right+=note*(1 if j%2 else .8)
  return ((bed+air+left)*edge,(bed-air*.8+right)*edge)
 write('district-'+district,24.,2,ambience,True,events)
index['budget']={'download_bytes':sum(a['bytes'] for a in index['assets'].values()),'max_active_ambience_pcm_bytes':24*SR*2*4,'load_policy':'Lazy-load one district buffer; short cues can preload after audio unlock. WAV masters retained; no compressed codec dependency.'}
(OUT/'audio-index.json').write_text(json.dumps(index,indent=2)+'\n')
print(index['budget'])

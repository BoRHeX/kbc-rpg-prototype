"""Validate real output bytes and indices; does not imply listening or gameplay QA."""
from prepare_assets import ROOT,png_read,sha
import json,wave,struct,math
frames=json.loads((ROOT/'art/animated/frame-index.json').read_text()); audio=json.loads((ROOT/'audio/generated/audio-index.json').read_text()); checks=[]
for s in frames['sources']: assert sha(ROOT/s['path'])==s['sha256']
for t in frames['textures'].values():
 p=ROOT/t['path']; assert sha(p)==t['sha256']; r=png_read(p); assert [len(r[0]),len(r)]==t['size']
for name,f in frames['frames'].items():
 assert sha(ROOT/f['reference'])==f['reference_sha256']; rows=png_read(ROOT/f['reference']); alpha=[p[3] for r in rows for p in r]; assert min(alpha)==0 and max(alpha)>200
 t=frames['textures'][f['texture']]; x,y,w,h=f['rect']; assert x+w<=t['size'][0] and y+h<=t['size'][1]
for a in frames['animations'].values():
 assert len(a['frames'])==len(a['durations_ms']) and all(t>0 for t in a['durations_ms']); assert all(f in frames['frames'] for f in a['frames'])
for name,a in audio['assets'].items():
 p=ROOT/a['path']; assert sha(p)==a['sha256']
 with wave.open(str(p),'rb') as f:
  assert f.getframerate()==44100 and f.getnchannels()==a['channels']; assert f.getnframes()==round(a['seconds']*44100)
  samples=struct.unpack('<'+'h'*(f.getnframes()*f.getnchannels()),f.readframes(f.getnframes()))
  assert 0<max(abs(s) for s in samples)<32767
  if a['loop']: assert max(abs(s) for s in samples[:2]+samples[-2:])<10
result={'status':'PASS','checks':['Original source hashes match pass 02 manifest','All texture PNGs decode with declared dimensions and hash','16 individual sprite references have real alpha','Frame rectangles and timed animation references valid','15 WAV files decode as non-silent unclipped PCM with declared durations','Four loop endpoint amplitudes below 10/32768'],'frame_count':len(frames['frames']),'texture_count':len(frames['textures']),'audio_count':len(audio['assets']),'texture_budget':frames['budget'],'audio_budget':audio['budget'],'not_verified':['Human listening','Chrome animation playback (sandbox prevented server/browser)','Gameplay integration','Physical mobile device']}
(ROOT/'STUDIO/qa-pass03/asset-validation.json').write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))

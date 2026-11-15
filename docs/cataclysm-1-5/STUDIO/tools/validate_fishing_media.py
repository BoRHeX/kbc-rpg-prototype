#!/usr/bin/env python3
"""Verify actual saved assets independently of generator's return values."""
import array, json, math, wave
from prepare_fishing_media import ROOT,readpng,sha,writejson

def main():
 idx=json.loads((ROOT/'art/animated/fishing-frame-index.json').read_text()); aud=json.loads((ROOT/'audio/generated/fishing-audio-index.json').read_text()); checks=[]
 for source in idx['sources']:
  p=ROOT/source['path']; assert sha(p)==source['sha256']; w,h,rows=readpng(p);assert [w,h]==source['size'];checks.append({'path':source['path'],'sha256':sha(p),'result':'PASS'})
 for sheet in idx['sheets'].values():
  p=ROOT/sheet['path'];w,h,rows=readpng(p);assert sha(p)==sheet['sha256'] and [w,h]==sheet['size']
  sw,sh,_=readpng(ROOT/sheet['source'])
  for f in sheet['frames']:
   x,y,fw,fh=f['rect'];assert x>=0 and y>=0 and fw>0 and fh>0 and x+fw<=w and y+fh<=h
   x,y,fw,fh=f['source_rect'];assert x>=0 and y>=0 and x+fw<=sw and y+fh<=sh
   x,y,fw,fh=f['rect']; assert any(any(row[x*4+3:(x+fw)*4:4]) for row in rows[y:y+fh]),f['id']
  m=sheet['mobile'];mw,mh,_=readpng(ROOT/m['path']);assert [mw,mh]==m['size'] and sha(ROOT/m['path'])==m['sha256']
  checks.append({'path':sheet['path'],'sha256':sha(p),'result':'PASS','frames':len(sheet['frames'])})
 for name,a in idx['animations'].items():
  ids=[f['id'] for f in idx['sheets'][a['sheet']]['frames']]; assert all(f in ids for f in a['frames']),name
  assert len(a['frames'])==len(a['durations_ms']) and all(t>0 for t in a['durations_ms']) and a['reduced_motion_frame'] in ids
 for cue in aud['cues']:
  p=ROOT/cue['path']; assert sha(p)==cue['sha256']
  with wave.open(str(p),'rb') as w:
   assert w.getnchannels()==1 and w.getsampwidth()==2 and w.getframerate()==cue['sample_rate'];assert abs(w.getnframes()/w.getframerate()-cue['duration_seconds'])<1e-6
   pcm=array.array('h');pcm.frombytes(w.readframes(w.getnframes()))
  peak=max(abs(x) for x in pcm);rms=math.sqrt(sum(x*x for x in pcm)/len(pcm));assert 0<peak<32767 and rms>10
  if cue['loop']:assert abs(pcm[0])<100 and abs(pcm[-1])<100
  checks.append({'path':cue['path'],'sha256':sha(p),'result':'PASS','peak_pcm':peak,'rms_pcm':rms,'end_samples':[pcm[0],pcm[-1]]})
 result={'status':'PASS','scope':'file integrity, source/frame bounds, nonempty frames, animation references, PCM format/non-silence/no clipping/loop endpoints','not_verified':['browser decode/drawing','audio listening','mobile performance','clean alpha edge composition','runtime gameplay integration'],'checks':checks}
 writejson(ROOT/'STUDIO/FISHING_MEDIA_VALIDATION.json',result);print(json.dumps({'status':'PASS','files_checked':len(checks),'animation_mappings':len(idx['animations'])}))
if __name__=='__main__':main()

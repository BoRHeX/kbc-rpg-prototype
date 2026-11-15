#!/usr/bin/env python3
"""Reproducible Pass03. Python stdlib only; genuine source crops, no painted substitutes."""
import array, hashlib, json, math, random, struct, wave, zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
ART=ROOT/'art/animated'; AUDIO=ROOT/'audio/generated'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def writejson(p,x): p.write_text(json.dumps(x,indent=2)+'\n')
def readpng(p):
 b=p.read_bytes(); assert b[:8]==b'\x89PNG\r\n\x1a\n'; i=8; data=b''
 while i<len(b):
  n=struct.unpack('>I',b[i:i+4])[0]; typ=b[i+4:i+8]; v=b[i+8:i+8+n]; i+=n+12
  if typ==b'IHDR': w,h,depth,color,co,fi,inter=struct.unpack('>IIBBBBB',v)
  if typ==b'IDAT': data+=v
 assert depth==8 and color in (2,6) and inter==0,(depth,color,inter)
 channels=3 if color==2 else 4; stride=w*channels; raw=zlib.decompress(data); prev=bytearray(stride); rows=[]; pos=0
 for y in range(h):
  f=raw[pos]; row=bytearray(raw[pos+1:pos+1+stride]); pos+=stride+1
  for x in range(stride):
   a=row[x-channels] if x>=channels else 0; c=prev[x-channels] if x>=channels else 0; up=prev[x]
   if f==1: row[x]=(row[x]+a)&255
   elif f==2: row[x]=(row[x]+up)&255
   elif f==3: row[x]=(row[x]+((a+up)//2))&255
   elif f==4:
    q=a+up-c; ds=[abs(q-a),abs(q-up),abs(q-c)]; row[x]=(row[x]+[a,up,c][ds.index(min(ds))])&255
   else: assert f==0
  if channels==3: row=bytearray(v for x in range(w) for v in (*row[x*3:x*3+3],255))
  rows.append(bytes(row)); prev=row if channels==4 else bytearray(v for x in range(w) for v in row[x*4:x*4+3])
 return w,h,rows

def savepng(p,w,h,rows):
 def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
 p.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\0'+r for r in rows),9))+chunk(b'IEND',b''))

def cropfit(src,rect,size):
 _,_,rows=src; x,y,w,h=rect; ow,oh=size; scale=min((ow-8)/w,(oh-8)/h); nw,nh=max(1,round(w*scale)),max(1,round(h*scale)); dx,dy=(ow-nw)//2,(oh-nh)//2; out=[bytearray(ow*4) for _ in range(oh)]
 for yy in range(nh):
  sy=y+min(h-1,int(yy/scale))
  for xx in range(nw):
   sx=x+min(w-1,int(xx/scale)); out[dy+yy][(dx+xx)*4:(dx+xx+1)*4]=rows[sy][sx*4:sx*4+4]
 return [bytes(r) for r in out]

def clean_cutout(src,rect):
 """Remove low-alpha source haze and detached neighboring atlas fragments.
 RGB is untouched; only existing alpha is remapped. Keep the largest 8-connected
 painted component, with a two-pixel fringe for antialiasing and thin line ends.
 """
 from collections import deque
 _,_,rows=src; x,y,w,h=rect
 alpha=[rows[y+j][(x+i)*4+3] for j in range(h) for i in range(w)]
 remaining={i for i,a in enumerate(alpha) if a>=80}; largest=set()
 while remaining:
  seed=remaining.pop(); part={seed}; queue=deque([seed])
  while queue:
   at=queue.popleft(); ax,ay=at%w,at//w
   for yy in range(max(0,ay-1),min(h,ay+2)):
    for xx in range(max(0,ax-1),min(w,ax+2)):
     n=yy*w+xx
     if n in remaining: remaining.remove(n);part.add(n);queue.append(n)
  if len(part)>len(largest): largest=part
 keep=set(largest)
 for at in largest:
  ax,ay=at%w,at//w
  for yy in range(max(0,ay-2),min(h,ay+3)):
   for xx in range(max(0,ax-2),min(w,ax+3)): keep.add(yy*w+xx)
 out=[]
 for j in range(h):
  row=bytearray(rows[y+j][x*4:(x+w)*4])
  for i in range(w):
   a=alpha[j*w+i];row[i*4+3]=round(max(0,a-24)*255/230) if j*w+i in keep else 0
  out.append(bytes(row))
 return w,h,out

def main():
 manifest=json.loads((ROOT/'STUDIO/IMAGE_MANIFEST.json').read_text()); sources={}; evidence=[]
 for a in manifest['images']:
  p=ROOT/a['path']; assert p.exists() and sha(p)==a['sha256'],p
  im=readpng(p); sources[a['name']]=im
  alpha=[v for row in im[2] for v in row[3::4]]
  evidence.append({'path':a['path'],'sha256':sha(p),'size':list(im[:2]),'alpha_range':[min(alpha),max(alpha)],'alpha_zero_fraction':alpha.count(0)/len(alpha),'alpha_below_128_fraction':sum(x<128 for x in alpha)/len(alpha)})
 idx={'schema_version':1,'version':'1.5','pass':'06','status':'PARTIAL_DERIVED_CLEANUP_RUNTIME_REFERENCED','sources':evidence,'coordinate_system':'source rectangles x,y,width,height; frame rects in strip pixels; pivots normalized bottom center','provenance':'Crops and nearest-neighbor downscales of Pass02 PNGs. Transforms/holds are derived motion, not new illustrations. Pass06 cat/mutant alpha: remove alpha below 24, remap remaining coverage, retain largest connected painted component plus two-pixel fringe. Location/gear backgrounds retained.','sheets':{},'animations':{}}
 # Curated against actual generated composition, not the requested layout.
 sheets={
 'fishing-cat':('fishing_cat_gear_atlas',(256,256),[
 ('idle',(0,70,185,265)),('wait',(185,72,275,263)),('cast',(0,650,265,340)),('bite',(225,650,275,340)),('caught',(838,98,186,240)),('windup',(0,650,265,340)),('reel',(225,650,275,340))]),
 'fishing-gear':('fishing_cat_gear_atlas',(192,192),[
 ('rod',(12,342,310,302)),('fishbone',(328,365,171,283)),('worm',(510,440,200,155)),('catnip',(750,372,255,252)),('fish-net',(495,668,231,333)),('jackpot',(735,674,289,332))]),
 'fishing-mutant':('abyssal_catch_mutant_atlas',(256,256),[
 ('lurking',(0,37,580,449)),('hooked',(602,0,405,560)),('lunge',(0,502,535,522)),('stunned',(540,672,484,352))]),
 'fishing-locations':('fishing_pond_world_atlas',(256,256),[
 ('canal',(0,0,466,462)),('pond',(470,0,334,462)),('sewer',(0,728,272,296)),('dock',(514,466,253,256)),('ripple-bobber',(265,466,244,256))])}
 for name,(source,size,cells) in sheets.items():
  frames=[]; tiles=[]
  for n,rect in cells:
   clean=name in ('fishing-cat','fishing-mutant')
   cut=clean_cutout(sources[source],rect) if clean else sources[source]
   tile=cropfit(cut,(0,0,rect[2],rect[3]) if clean else rect,size); tiles.append(tile)
   frames.append({'id':n,'rect':[len(frames)*size[0],0,*size],'source_rect':list(rect),'pivot':[.5,.9],'background':'alpha cleaned; largest painted component retained' if clean else 'source matte retained; reference patch, not clean alpha cutout'})
  rows=[b''.join(tile[y] for tile in tiles) for y in range(size[1])]; path=ART/(name+'-strip.png'); savepng(path,size[0]*len(cells),size[1],rows)
  idx['sheets'][name]={'path':str(path.relative_to(ROOT)),'sha256':sha(path),'size':[size[0]*len(cells),size[1]],'frame_size':list(size),'source':next(a['path'] for a in manifest['images'] if a['name']==source),'frames':frames}
  # Mobile reference: the exact same whole sheet at half resolution, avoiding a large source decode.
  mini=[b''.join(rows[y][x*4:x*4+4] for x in range(0,size[0]*len(cells),2)) for y in range(0,size[1],2)]; mp=ART/(name+'-mobile.png'); savepng(mp,size[0]*len(cells)//2,size[1]//2,mini)
  idx['sheets'][name]['mobile']={'path':str(mp.relative_to(ROOT)),'sha256':sha(mp),'scale':.5,'size':[size[0]*len(cells)//2,size[1]//2]}
 def anim(name,sheet,ids,ms,loop=False,extra=None):
  idx['animations'][name]={'sheet':sheet,'frames':ids,'durations_ms':ms,'loop':loop,'reduced_motion_frame':ids[-1],**(extra or {})}
 anim('idle','fishing-cat',['idle'],[250],True)
 anim('windup','fishing-cat',['wait','windup'],[200,250])
 anim('cast','fishing-cat',['windup','cast','wait'],[80,120,120],extra={'line_tip_anchors':[[.85,.13],[.85,.13],[.96,.09]],'bobber_motion':'quadratic arc from rod tip to world target; code VFX'})
 anim('wait','fishing-cat',['wait'],[500],True)
 anim('bite','fishing-cat',['bite','wait'],[100,100],True)
 anim('reel','fishing-cat',['reel','bite','reel'],[110,110,110],True)
 anim('cancel','fishing-cat',['reel','idle'],[100,100],extra={'movement_unrestricted':True,'stop_pending_catch':True})
 anim('caught-fish','fishing-gear',['fish-net'],[450],extra={'limitation':'basket of fish reference; independent single normal/rare fish sprite missing'})
 anim('caught-treasure','fishing-gear',['jackpot'],[450],extra={'limitation':'same painted chest for treasure and jackpot; no distinct closed treasure painting'})
 anim('jackpot','fishing-gear',['jackpot'],[650])
 anim('celebrate','fishing-cat',['caught'],[450])
 for n,ids,ms in [('mutant-warn',['lurking','hooked'],[500,500]),('mutant-lunge',['hooked','lunge'],[900,450]),('mutant-recover',['stunned','lurking'],[750,750]),('mutant-hit',['stunned'],[160])]: anim(n,'fishing-mutant',ids,ms)
 anim('water-ripple','fishing-locations',['ripple-bobber']*4,[160]*4,True,{'derived_transform':[{'scale':s,'alpha':a} for s,a in [(0.94,.8),(1,.95),(1.04,.8),(1,.9)]],'limitation':'one painted water/bobber patch with transformed holds, not four painted ripples; water rectangle includes baked bobber/line'})
 idx['mechanics_vfx']={'line':{'renderer':'CanvasRenderingContext2D quadraticCurveTo','width_css_px':1,'origin':'code-native mechanics, never original character art'},'bobber':{'renderer':'source ripple-bobber patch or code-native VFX bobber','limitation':'no isolated painted bobber in source'},'hero_contract':'Retain inherited quadruped hero and independently aimed tail gun; pose references include upright cats and must not replace active hero wholesale. Gear rod crop includes baked line.','spot_geometry':'Source scenes are perspective paintings, not collision maps; integrate localized decals at clear reachable sockets. Do not infer dry apron from alpha.'}
 idx['missing_illustrations_or_cleanup']=['complete quadruped cast/reel action set','isolated painted bobber','isolated normal and rare fish','distinct ordinary treasure','clean rod-only overlay without baked line']
 idx['cleanup_limitations']=['Cast reuses the intact windup illustration; bite reuses reel. These are not new painted poses.', 'Largest-component cleanup may remove detached decorative droplets/glints and fine line sections.', 'The inherited moving quadruped/tail remains; fishing pose is still a separate stationary reference beside it.']
 writejson(ART/'fishing-frame-index.json',idx)
 audio=makeaudio()
 writejson(AUDIO/'fishing-audio-index.json',audio)
 return idx,audio

def makeaudio():
 rate=22050; rng=random.Random(1503); entries=[]
 specs=[('water-ambience',8,True,'ambience',.24),('cast-splash',.7,False,'fx',.55),('bite-warning',.55,False,'fx',.58),('reel',1,True,'fx',.33),('rare-catch',1.5,False,'fx',.48),('jackpot',2.4,False,'fx',.48),('ambush-tension',3.2,False,'fx',.50)]
 for name,duration,loop,bus,gain in specs:
  count=round(rate*duration); samples=[]; low=0
  for i in range(count):
   t=i/rate; noise=rng.uniform(-1,1); low=.94*low+.06*noise; v=0
   if name=='water-ambience':
    # Integer-cycle oscillators and periodic bubbles: seamless phase closure.
    v=.28*math.sin(2*math.pi*43*t)*(1+.3*math.sin(2*math.pi*t/duration))+.12*math.sin(2*math.pi*71*t)
    for start in [0.5,1.6,2.8,4.1,5.4,6.6]:
     dt=t-start
     if 0<=dt<.65: v+=.35*math.exp(-dt*9)*math.sin(2*math.pi*(620*dt-170*dt*dt))
    # Blend ends to silence; loop seam is zero, not a recorded water claim.
    v*=min(1,t/.15,(duration-t)/.15)
   elif name=='cast-splash': v=.65*noise*math.exp(-t*10)+.7*low*math.exp(-max(0,t-.12)*7)+.18*math.sin(2*math.pi*(430*t-210*t*t))*math.exp(-t*8)
   elif name=='bite-warning':
    for start,freq in [(0,880),(.17,1174.66),(.34,880)]:
     dt=t-start
     if 0<=dt<.14: v+=.6*math.sin(2*math.pi*freq*dt)*math.sin(math.pi*dt/.14)**2
   elif name=='reel': v=.25*math.sin(2*math.pi*110*t)+.5*noise*max(0,math.sin(2*math.pi*18*t))**16; v*=min(1,t/.02,(duration-t)/.02)
   elif name in ('rare-catch','jackpot'):
    notes=[523.25,659.25,783.99,1046.5] if name=='rare-catch' else [392,523.25,659.25,783.99,1046.5,1318.51]
    for k,freq in enumerate(notes):
     dt=t-k*(.18 if name=='rare-catch' else .22)
     if dt>=0: v+=(math.sin(2*math.pi*freq*dt)+.24*math.sin(2*math.pi*freq*2*dt))*.33*math.exp(-dt*3)*(1-math.exp(-dt*90))
   else:
    env=math.sin(math.pi*t/duration)**2; v=env*(.35*math.sin(2*math.pi*55*t)+.27*math.sin(2*math.pi*58.3*t)+low*.8+.15*math.sin(2*math.pi*(180*t+20*t*t)))
   if not loop: v*=min(1,t/.005,(duration-t)/.03)
   samples.append(v)
  peak=max(abs(v) for v in samples); samples=[v*.78/max(peak,.001) for v in samples]; pcm=array.array('h',(round(v*32767) for v in samples))
  import sys
  if sys.byteorder!='little': pcm.byteswap()
  path=AUDIO/('fishing-'+name+'.wav')
  with wave.open(str(path),'wb') as w: w.setparams((1,2,rate,0,'NONE','not compressed')); w.writeframes(pcm.tobytes())
  entries.append({'id':name,'path':str(path.relative_to(ROOT)),'sha256':sha(path),'bytes':path.stat().st_size,'duration_seconds':count/rate,'sample_rate':rate,'channels':1,'bits':16,'loop':loop,'bus':bus,'suggested_gain':gain,'peak':max(abs(v) for v in samples),'rms':math.sqrt(sum(v*v for v in samples)/count),'end_samples':[pcm[0],pcm[-1]],'provenance':'Original deterministic offline oscillator/noise composition; not API audio, field recording or inherited soundtrack'})
 return {'schema_version':1,'version':'1.5','status':'FILES_PREPARED_NOT_RUNTIME_ROUTED','generator':'STUDIO/tools/prepare_fishing_media.py','seed':1503,'listening_acceptance':False,'routing_contract':{'context':'reuse existing audio','fx_bus':'existing fxBus','ambience_bus':'existing master bus at low gain, alongside inherited music','controls':'existing volume/mute; no new UI or AudioContext','voice_cap':8,'lifecycle':'stop/fade ambience and reel on pause/cancel/death/restart/end; invalidate pending async decode on reset; do not autoplay before user gesture','warning':'bite/ambush take priority; duck ambience; never encode gameplay-only warning exclusively in audio'},'cues':entries}
if __name__=='__main__':
 a,b=main(); print(json.dumps({'source_pngs_verified':len(a['sources']),'sheets':len(a['sheets']),'animations':len(a['animations']),'audio_files':len(b['cues']),'sources':a['sources']},indent=2))

"""Pass 03 reproducible raster preparation, standard library only. No painted substitutes."""
import struct,zlib,json,hashlib,math,wave,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def png_read(p):
 b=p.read_bytes(); pos=8; data=b''
 while pos<len(b):
  n=struct.unpack('>I',b[pos:pos+4])[0]; t=b[pos+4:pos+8]; v=b[pos+8:pos+8+n]; pos+=12+n
  if t==b'IHDR': w,h,depth,kind,_,_,inter=struct.unpack('>IIBBBBB',v)
  if t==b'IDAT': data+=v
 assert depth==8 and kind in (2,6) and inter==0
 c=4 if kind==6 else 3; raw=zlib.decompress(data); rows=[]; prev=bytearray(w*c)
 for y in range(h):
  f=raw[y*(w*c+1)]; row=bytearray(raw[y*(w*c+1)+1:(y+1)*(w*c+1)])
  for x in range(len(row)):
   a=row[x-c] if x>=c else 0; u=prev[x]; d=prev[x-c] if x>=c else 0; q=a+u-d
   pa,pb,pc=abs(q-a),abs(q-u),abs(q-d); pred=a if pa<=pb and pa<=pc else u if pb<=pc else d
   row[x]=(row[x]+(0,a,u,(a+u)//2,pred)[f])&255
  rows.append([tuple(row[x:x+c]) if c==4 else tuple(row[x:x+c])+(255,) for x in range(0,len(row),c)]); prev=row
 return rows
def png_write(p,rows):
 h=len(rows); w=len(rows[0]); raw=b''.join(b'\0'+bytes(v for px in r for v in px) for r in rows)
 def chunk(t,v):return struct.pack('>I',len(v))+t+v+struct.pack('>I',zlib.crc32(t+v)&0xffffffff)
 p.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))
if __name__=='__main__':
 for name in ['guardian_boss_atlas','mecha_and_companion_atlas']:
  rows=png_read(ROOT/'art/generated'/f'{name}.png')
  print(name, 'samples', [rows[y][x] for x,y in [(0,0),(500,0),(0,500),(500,500),(1023,1023),(256,256)]])
  from collections import Counter
  print('alpha',Counter(p[3] for r in rows for p in r).most_common(12))

def resize(rows,w,h):
 sw,sh=len(rows[0]),len(rows)
 # Area average in premultiplied alpha: preserves fine outlines without dark fringe.
 out=[]
 for y in range(h):
  line=[]
  for x in range(w):
   pixels=[rows[j][i] for j in range(y*sh//h,max(y*sh//h+1,(y+1)*sh//h)) for i in range(x*sw//w,max(x*sw//w+1,(x+1)*sw//w))]
   a=sum(p[3] for p in pixels); line.append(tuple(round(sum(p[k]*p[3] for p in pixels)/a) if a else 0 for k in range(3))+(round(a/len(pixels)),))
  out.append(line)
 return out

def prepare():
 manifest={'schema_version':1,'status':'PARTIAL','base_url':'../../','sources':[], 'textures':{},'frames':{},'animations':{},'limitations':['One guardian identity, not four district guardians.','No separate crew, build or boarding paintings.','City crops are opaque, not seamless certified tiles or transparent props.','Derived motion is limited pose/transform animation, not painted directional gait.']}
 imf=json.loads((ROOT/'STUDIO/IMAGE_MANIFEST.json').read_text())
 for rec in imf['images']:
  p=ROOT/rec['path']; assert sha(p)==rec['sha256']; manifest['sources'].append({'path':rec['path'],'sha256':sha(p),'size':rec['size'],'producer':imf['producer'],'model':rec['model']})
 for actor,source,rects,states,world in [
  ('guardian','guardian_boss_atlas',[(0,0,465,505),(470,100,554,405),(0,510,600,514),(600,510,424,514)],['idle','stalk','attack','hit'],80),
  ('mecha','mecha_and_companion_atlas',[(0,0,512,495),(512,0,512,495),(0,495,512,529),(512,495,512,529)],['walk','shoot','overheat','repair'],96)]:
  src=png_read(ROOT/'art/generated'/f'{source}.png'); sheet=[[(0,0,0,0)]*(256*8) for _ in range(256)]
  for i,(rect,state) in enumerate(zip(rects,states)):
   x,y,w,h=rect; crop=[r[x:x+w] for r in src[y:y+h]]
   # Discard alpha <=3 invisible source dust only; no chroma-key or new character drawing.
   crop=[[p if p[3]>3 else (0,0,0,0) for p in r] for r in crop]
   scale=min(232/w,232/h); rw,rh=round(w*scale),round(h*scale); cut=resize(crop,rw,rh)
   for phase in range(2):
    idx=i*2+phase; dx=(256-rw)//2+(2 if phase and state in ('attack','shoot') else 0); dy=248-rh-(2 if phase else 0)
    canvas=[[(0,0,0,0)]*256 for _ in range(256)]
    for j,r in enumerate(cut): canvas[dy+j][dx:dx+rw]=r
    p=ROOT/'art/animated'/f'{actor}-{state}-{phase}.png'; png_write(p,canvas)
    for j,r in enumerate(canvas): sheet[j][idx*256:(idx+1)*256]=r
    bounds=[(xx,yy) for yy,r in enumerate(canvas) for xx,pixel in enumerate(r) if pixel[3]>3]
    key=f'{actor}.{state}.{phase}'; manifest['frames'][key]={'texture':actor,'rect':[idx*256,0,256,256],'reference':str(p.relative_to(ROOT)),'reference_sha256':sha(p),'source':f'art/generated/{source}.png','source_rect':list(rect),'output_size':[256,256],'alpha_bounds':[min(a for a,b in bounds),min(b for a,b in bounds),max(a for a,b in bounds)+1,max(b for a,b in bounds)+1],'pivot':[128,248],'world_width':world,'derivation':'cropped_generated_pose' if phase==0 else 'derived_transform','transform':{'translation_px':[dx-(256-rw)//2, -2 if phase else 0]}}
   manifest['animations'][f'{actor}.{state}']={'frames':[f'{actor}.{state}.0',f'{actor}.{state}.1',f'{actor}.{state}.0'],'durations_ms':[240,120,240] if state in ('attack','shoot','hit') else [350,350,350],'loop':state not in ('attack','hit','shoot'),'reduced_motion_frame':f'{actor}.{state}.0','note':'Single illustrated pose with baked 2px translation; event state selects distinct paintings.'}
  p=ROOT/'art/animated'/f'{actor}-frames.png'; png_write(p,sheet); manifest['textures'][actor]={'path':str(p.relative_to(ROOT)),'size':[2048,256],'sha256':sha(p),'bytes':p.stat().st_size,'decoded_bytes':2048*256*4}
 # Explicit multi-pose examples: real different paintings, not just an atlas displayed as animation.
 for actor,states in [('guardian',['idle','stalk','attack','hit','idle']),('mecha',['walk','shoot','overheat','repair','walk'])]:
  manifest['animations'][actor+'.demonstration']={'frames':[f'{actor}.{s}.0' for s in states],'durations_ms':[650,500,220,650,500],'loop':True,'reduced_motion_frame':f'{actor}.{states[0]}.0','note':'Inspection montage; runtime must select states from simulation, not play this loop in combat.'}
 city=png_read(ROOT/'art/generated/city_district_atlas.png')
 regions={'wet-street':(469,8,185,385),'crossing':(669,165,90,95),'waterfront':(775,0,249,463),'shop-warm':(8,7,174,181),'shop-neon':(199,7,143,178),'alley-moss':(140,505,91,315),'archway':(239,635,130,190),'paving-blue':(8,833,90,86),'asphalt':(108,833,90,86),'paving-grey':(211,833,92,86),'moss-ground':(316,833,89,86),'water':(833,833,86,86)}
 for name,rect in regions.items():
  x,y,w,h=rect; rows=[r[x:x+w] for r in city[y:y+h]]; scale=min(1,256/max(w,h)); rows=resize(rows,round(w*scale),round(h*scale)); p=ROOT/'art/animated'/f'city-{name}.png'; png_write(p,rows)
  manifest['textures']['city.'+name]={'path':str(p.relative_to(ROOT)),'size':[len(rows[0]),len(rows)],'sha256':sha(p),'bytes':p.stat().st_size,'decoded_bytes':len(rows[0])*len(rows)*4,'source':'art/generated/city_district_atlas.png','source_rect':list(rect),'opaque':True,'seamless':False,'kind':'static_illustrated_crop'}
 manifest['budget']={'runtime_texture_decoded_bytes':sum(t['decoded_bytes'] for t in manifest['textures'].values()),'runtime_texture_download_bytes':sum(t['bytes'] for t in manifest['textures'].values()),'policy':'Load texture sheets and city crops only; individual references and source atlases are authoring assets, not additional runtime loads.'}
 (ROOT/'art/animated/frame-index.json').write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__': prepare()

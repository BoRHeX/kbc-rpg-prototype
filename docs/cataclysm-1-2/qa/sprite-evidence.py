"""Offline mobile-size sprite rasters, not browser/gameplay screenshots."""
from PIL import Image, ImageDraw, ImageChops
from pathlib import Path
import json,math
base=Path(__file__).resolve().parents[1];out=base/'qa'
rig=base/'art/characters/hero/articulated-v1';m=json.loads((rig/'rig.json').read_text())
states=['idle','run','attack','feral-fire','adrenaline-fire','hit','recover']
sheets={s:Image.open(rig/(s+'.png')).convert('RGBA') for s in states}
# Exact nominal sprite rectangle from resizeViewport: 96 * (27/23) * (390/720).
size=round(96*27/23*390/720)
frames=[];records=[];rasters={}
for tick in range(100):
 t=tick/10;im=Image.new('RGB',(390,844),'#1b2c39');d=ImageDraw.Draw(im)
 d.text((12,12),'OFFLINE SPRITE RASTER / 390 x 844',fill='white')
 d.text((12,29),'Not a browser or gameplay capture',fill='#94b7c5')
 d.text((12,46),'E             S             W             N',fill='white')
 for row,s in enumerate(states):
  spec=m['states'][s];f=int(t*spec['fps'])%spec['frames'];y=78+row*105
  d.text((10,y),s+' / frame '+str(f),fill='#a9cad3')
  for col,bearing in enumerate([0,2,4,6]):
   sprite=sheets[s].crop((f*96,bearing*96,f*96+96,bearing*96+96)).resize((size,size),Image.Resampling.LANCZOS)
   im.paste(sprite,(14+col*96,y+18),sprite)
   if tick in [0,1,2,3,6,9]:records.append({'time':t,'state':s,'bearing':bearing,'frame':bearing*spec['frames']+f,'texture':'art/'+spec['url'],'source':[f*96,bearing*96,96,96]})
   if tick in (0,1,2,3) and col==0:rasters[(s,tick)]=sprite
 d.text((12,824),'hero-articulated-v1 / t = %.1fs'%t,fill='white');frames.append(im)
frames[3].save(out/'mobile-sprites.png')
frames[0].save(out/'mobile-sprites-10s.gif',save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=True)
changes={}
for s in states:
 samples=[]
 for tick in (1,2,3):
  a=rasters[(s,0)].convert('RGB');b=rasters[(s,tick)].convert('RGB');diff=ImageChops.difference(a,b)
  low=diff.crop((0,round(size*58/96),size,size))
  samples.append({'toTime':tick/10,'changedPixels':sum(max(p)>15 for p in diff.getdata()),'lowerBodyChangedPixels':sum(max(p)>15 for p in low.getdata())})
 changes[s]=samples
report={'evidenceType':'Offline PIL resampling only; NOT browser-rendered gameplay','viewport':[390,844],'nominalSpritePixels':size,'sourceIdentity':'read-only art/characters/hero/aim.png articulated painted texture parts','samples':records,'pixelChangesFromT0':changes,'heroCompressedBytes':sum(p.stat().st_size for p in rig.glob('*.png')),'heroDecodedBytes':sum(Image.open(p).width*Image.open(p).height*4 for p in rig.glob('*.png'))}
(out/'sprite-evidence.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='samples'},indent=2))

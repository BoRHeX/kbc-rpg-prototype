"""Bake an articulated painted-texture rig. No whole-pose crossfades.
Source aim.png is read-only. Every part has an exclusive hard polygon matte;
only joint overlap from the SAME limb is permitted. All poses assembled offline.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import math, json, shutil
BASE=Path(__file__).resolve().parents[1]
OUT=BASE/'art/characters/hero/articulated-v1'
OUT.mkdir(exist_ok=True)
S=3
source=Image.open(BASE/'art/characters/hero/aim.png').convert('RGBA')
# Remove stray chroma-key flecks in original outer antialias, never alter source.
def part(bearing,points):
    im=source.crop((bearing*96,0,bearing*96+96,96)).resize((96*S,96*S),Image.Resampling.LANCZOS)
    mask=Image.new('L',im.size); ImageDraw.Draw(mask).polygon([(round(x*S),round(y*S)) for x,y in points],fill=255)
    im.putalpha(ImageChops.multiply(im.getchannel('A'),mask))
    pix=im.load()
    for y in range(im.height):
      for x in range(im.width):
        r,g,b,a=pix[x,y]
        if g>r*1.18 and g>b*1.15 and g>90: pix[x,y]=(r,g,b,0)
    return im
head=part(0,[(26,3),(65,3),(65,27),(61,38),(45,41),(29,36),(25,26)])
body=part(6,[(40,43),(49,44),(60,43),(63,56),(68,63),(53,66),(36,62),(38,50)]).transform((288,288),Image.Transform.AFFINE,(1,0,24,0,1,0))
# Red collar belongs to torso, never duplicated on the head or arms.
scarf=part(6,[(41,37),(49,38),(60,37),(59,42),(51,46),(45,44)]).transform((288,288),Image.Transform.AFFINE,(1,0,24,0,1,0))
tail=part(0,[(31,55),(26,56),(20,56),(19,47),(16,44),(11,44),(9,49),(11,58),(17,63),(24,65),(31,62)])
legs=[part(0,[(32,60),(46,62),(43,70),(40,78),(37,82),(24,82),(24,77),(29,72)]),part(0,[(48,62),(57,59),(61,65),(62,72),(68,77),(68,82),(54,82),(51,74)])]
# Arms include hands and pistols, separated from head/torso; all same painted identity.
arm_polys=[
 [[(32,39),(38,40),(40,43),(54,42),(56,46),(49,51),(37,49),(30,46)],[(53,39),(61,36),(64,32),(86,31),(86,38),(72,40),(69,47),(62,49),(54,47)]],
 [[(34,40),(40,41),(47,46),(53,46),(58,50),(54,54),(47,53),(39,50),(33,46)],[(52,40),(59,43),(68,45),(78,50),(81,54),(79,58),(67,52),(61,54),(55,50)]],
 [[(34,41),(42,42),(45,49),(45,54),(46,58),(45,71),(40,72),(39,62),(37,58),(34,51)],[(51,41),(57,42),(59,48),(65,53),(68,60),(65,64),(59,56),(55,54),(51,49)]],
 [[(33,40),(38,42),(35,49),(29,53),(24,58),(21,61),(18,59),(22,52),(29,45)],[(53,41),(60,42),(60,49),(56,57),(54,65),(49,70),(46,68),(48,60),(49,52)]],
 [[(31,39),(36,41),(35,47),(26,48),(16,44),(5,43),(4,38),(21,38)],[(52,41),(59,39),(62,43),(60,48),(53,51),(45,50),(40,45),(42,42)]],
 [[(32,40),(38,41),(39,46),(33,49),(26,46),(22,41),(12,33),(11,29),(14,28),(26,37)],[(51,40),(58,39),(62,42),(60,47),(52,49),(43,47),(39,43),(42,40)]],
 [[(37,45),(31,39),(29,30),(30,18),(32,6),(38,6),(40,16),(39,26),(41,34),(43,42)],[(59,43),(57,35),(61,26),(61,15),(63,6),(69,6),(71,16),(73,25),(70,35),(66,42)]],
 [[(32,42),(27,36),(25,28),(20,23),(20,19),(24,18),(30,25),(34,33),(39,40)],[(53,41),(51,34),(56,27),(64,16),(66,7),(70,7),(71,12),(67,23),(64,33),(61,40)]]
]
arms=[[part(k,p) for p in pair] for k,pair in enumerate(arm_polys)]
# Texture pivots in original 96px space. Affine transforms preserve paint detail.
def put(canvas,im,pivot,angle=0,dx=0,dy=0,sx=1,sy=1):
    a=math.radians(angle);c=math.cos(a);s=math.sin(a);px,py=[v*S for v in pivot]
    # Pillow uses inverse output->source transform.
    aa=c/sx;bb=s/sx;dd=-s/sy;ee=c/sy
    tx=px+dx*S;ty=py+dy*S
    warped=im.transform(im.size,Image.Transform.AFFINE,(aa,bb,px-aa*tx-bb*ty,dd,ee,py-dd*tx-ee*ty),Image.Resampling.BICUBIC)
    canvas.alpha_composite(warped)
states={'idle':(12,6),'run':(12,16),'attack':(8,20),'run-fire':(12,16),'feral':(12,20),'adrenaline':(12,23),'feral-fire':(12,20),'adrenaline-fire':(12,23),'hit':(8,23),'recover':(8,23)}
for state,(count,fps) in states.items():
 sheet=Image.new('RGBA',(count*96,8*96))
 for bearing in range(8):
  angle=bearing*math.pi/4
  for f in range(count):
   phase=f/count*math.tau;wave=math.sin(phase);motion=state in ('run','run-fire','feral','adrenaline','feral-fire','adrenaline-fire')
   effort=1.25 if state.startswith('feral') else 1.12 if state.startswith('adrenaline') else 1
   stride=wave*effort if motion else 0
   bob=-abs(math.sin(phase))*2.4*effort if motion else math.sin(phase)*.65
   lean=(3.5 if motion else 0)*math.cos(angle)
   firing=state in ('attack','run-fire','feral-fire','adrenaline-fire');kick=(max(0,1-f%4/2) if firing else 0)
   hurt=math.sin(f/(count-1)*math.pi) if state=='hit' else 0
   recover=(1-f/(count-1)) if state=='recover' else 0
   lean+=hurt*-12+recover*-4;bob+=hurt*2+recover
   frame=Image.new('RGBA',(288,288))
   put(frame,tail,(30,59),wave*(13 if motion else 8),dy=bob)
   for i,leg in enumerate(legs):
    step=stride*(1 if i==0 else -1)
    # Alternating planted extension / lifted flexion, anchored at hips.
    put(frame,leg,(39 if i==0 else 53,62),step*24,dx=step*3,dy=-max(0,-step)*4,sy=1-max(0,-step)*.13)
   put(frame,body,(44,61),lean,dy=bob,sx=1+math.sin(phase)*.015)
   put(frame,scarf,(43,41),lean+wave*(6 if motion else 2),dy=bob)
   # Face tracks bearing, ears/head settle a little later than the chest.
   face=head
   if bearing in (3,4,5):
    face=head.transpose(Image.Transpose.FLIP_LEFT_RIGHT).transform((288,288),Image.Transform.AFFINE,(1,0,-6,0,1,0))
   if f==count-2 and state=='idle':
    # Blink by compressing the existing eye paint, no replacement face.
    face=face.copy()
    for box in [(38,25,48,34),(53,25,60,33)]:
     if bearing in (3,4,5): continue
     x1,y1,x2,y2=[v*S for v in box]
     eye=face.crop((x1,y1,x2,y2));lid=face.crop((x1,21*S,x2,24*S)).resize(eye.size)
     face.paste(lid,(x1,y1))
     slit=eye.resize((eye.width,2*S));face.paste(slit,(x1,(y1+y2)//2))
   put(frame,face,(45,38),lean*.4+math.sin(phase+.5)*1.5-hurt*7,dx=math.cos(angle)*.8,dy=bob-kick*.5,sy=1+math.cos(phase)*.009)
   # Hands kick independently at shoulder pivots; no second weapon/body overlay.
   for i,arm in enumerate(arms[bearing]):
    pulse=kick if i==f%2 else kick*.4
    put(frame,arm,(35 if i==0 else 55,43),lean+(-5 if i==0 else 5)*pulse,dx=-math.cos(angle)*pulse*2,dy=bob-math.sin(angle)*pulse*2)
   frame=frame.resize((96,96),Image.Resampling.LANCZOS)
   sheet.paste(frame,(f*96,bearing*96))
 sheet.save(OUT/(state+'.png'),optimize=True)
manifest={'family':'hero-articulated-v1','identity':'Original white cat, red scarf, charcoal suit, cyan eyes; painted aim.png texture rig','cell':96,'directions':['E','SE','S','SW','W','NW','N','NE'],'pivot':[48,58],'states':{s:{'url':f'characters/hero/articulated-v1/{s}.png','frames':n,'fps':fps,'bearings':8} for s,(n,fps) in states.items()}}
(OUT/'rig.json').write_text(json.dumps(manifest,indent=2)+'\n')
lab=BASE.parent/('cataclysm-100-lab' if BASE.name=='cataclysm-1-0-major' else 'cataclysm-1-0-major')
shutil.copytree(OUT,lab/'art/characters/hero/articulated-v1',dirs_exist_ok=True)
shutil.copy2(__file__,lab/'qa/bake-hero.py')
print('Baked',OUT)

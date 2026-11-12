"""Original Catastrophe ink-and-light atlas workshop. Run with Python + Pillow.
All geometry, costume designs and textures are authored here; no imported assets.
96px frames, drawn at 3x for ink contours and layered painted highlights.
"""
from PIL import Image, ImageDraw, ImageFilter
import math, random, json, subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=OUT.parent
catalog=json.loads(subprocess.check_output(['node','-e',f'console.log(JSON.stringify(require("{ROOT}/campaign.js").catalog))']))
S=3
INK='#101a2c'
def rgb(c): return tuple(bytes.fromhex(c.lstrip('#')[:6]))
def tint(c,v): return tuple(max(0,min(255,int(x*v))) for x in rgb(c))
class Brush:
 def __init__(self,im): self.d=ImageDraw.Draw(im)
 def poly(self,p,c,edge=INK,w=1):
  p=[(round(x*S),round(y*S)) for x,y in p];self.d.polygon(p,fill=c)
  if edge:self.d.line(p+[p[0]],fill=edge,width=max(1,round(w*S)),joint='curve')
 def ell(self,x,y,rx,ry,c,edge=None,w=1): self.d.ellipse(((x-rx)*S,(y-ry)*S,(x+rx)*S,(y+ry)*S),fill=c,outline=edge,width=round(w*S))
 def line(self,p,c,w=1): self.d.line([(round(x*S),round(y*S)) for x,y in p],fill=c,width=max(1,round(w*S)),joint='curve')
 def box(self,x,y,w,h,c,edge=None): self.d.rectangle((x*S,y*S,(x+w)*S,(y+h)*S),fill=c,outline=edge,width=S)
def sprite(id,state,f,n,color,shape='',group='ally',index=0):
 im=Image.new('RGBA',(96*S,96*S));b=Brush(im)
 t=f/n*math.tau;step=math.sin(t);other=math.cos(t)
 hero=id=='hero';dead=group not in ('ally','hero');boss=group=='bosses';sup=group=='superElites';elite=group=='elites'
 active=state in ('run','feral','adrenaline');stride=step*(7 if active else 2)
 recoil=max(0,math.sin(t*2))*3 if state=='attack' else 0
 bob=math.cos(t*2)*(1.6 if active else .7)
 cx=47+(step*.8);cy=46+bob-recoil
 fur=color;light=tint(fur,1.22);shade=tint(fur,.64)
 accent='#5ef6db' if not dead else '#ef6a8d';coat='#294b5a' if not dead else '#383341'
 wide=17 if boss or sup else 13 if id!='dasher' else 10
 if id in ('iron-titan','dreadnought','scrapper','tank'): wide+=5
 # Ground contact shadow, then a curled, articulated tail with lit upper edge.
 b.ell(47,82,25,5,(3,9,20,95))
 tail=[(cx-9,64),(cx-25,69),(cx-31,61+step*5),(cx-30,48+other*6)]
 b.line(tail,INK,8);b.line(tail,shade,5);b.line([(x-1,y-1) for x,y in tail],light,1)
 # Large authored back silhouettes, never a rectangular tier badge.
 if shape=='wings' or id=='orbiter':
  for s in [-1,1]:
   b.poly([(cx+s*9,46),(cx+s*35,23+step*4),(cx+s*39,43),(cx+s*32,64),(cx+s*17,62)],shade)
   b.poly([(cx+s*14,45),(cx+s*32,31+step*4),(cx+s*28,51)],light)
   for k in range(3): b.line([(cx+s*14,48),(cx+s*(29+k*3),39+k*7)],coat,1)
 if boss or sup:
  b.poly([(cx-wide,46),(cx-wide-8,55),(cx-26,79),(cx-10,75),(cx,83),(cx+22,77),(cx+wide+7,56),(cx+wide,45)],'#472c44' if not sup else '#33264f')
  for s in [-1,1]: b.line([(cx+s*(wide+4),54),(cx+s*21,74)],accent,1)
 # Feet and bent legs alternate independently.
 for s in [-1,1]:
  v=stride*s;hip=cx+s*7;knee=hip+s*2+v*.45;ankle=hip+v*.7;y=78+v*.35-max(0,other*s)*2.5
  b.poly([(hip-5,61),(hip+5,61),(knee+4,70-v*.3),(ankle+5,y),(ankle-5,y),(knee-4,70-v*.3)],shade)
  b.poly([(hip-3,62),(hip+1,63),(knee+1,70-v*.3),(ankle+2,y-2),(ankle-3,y-2)],fur,None)
  b.ell(ankle+s*2,y,7,4,light,INK)
  for k in range(2):b.line([(ankle-2+k*3,y),(ankle-2+k*3,y+2)],shade,.6)
 # Vest: graded painted planes, seams, utility belt and metal clasps.
 b.poly([(cx-wide+2,43),(cx+wide-2,43),(cx+wide,62),(cx+wide-4,69),(cx-wide+3,67),(cx-wide-1,56)],coat)
 b.poly([(cx-wide+2,45),(cx-1,44),(cx-2,62),(cx-wide+3,61)],'#456d73' if not dead else '#57515b',None)
 b.poly([(cx+2,46),(cx+wide-2,46),(cx+wide-1,62),(cx+2,65)],'#1d303e',None)
 b.line([(cx-1,46),(cx-1,64)],'#86a5a1',.7)
 b.box(cx-wide+2,63,wide*2-4,4,'#171c2b');b.box(cx-2,63,5,4,'#b9a47a',INK)
 for s in [-1,1]:b.box(cx+s*7-2,54,4,6,'#76664f',INK);b.line([(cx+s*7-1,55),(cx+s*7+1,55)],'#c7b28d',.6)
 if shape=='armor' or id=='tank':
  for s in [-1,1]:
   b.poly([(cx+s*8,44),(cx+s*(wide+7),43),(cx+s*(wide+8),53),(cx+s*9,51)],'#617689')
   b.line([(cx+s*10,45),(cx+s*(wide+5),45)],'#c4e5e7',1)
  b.poly([(cx-9,48),(cx+9,48),(cx+7,60),(cx,64),(cx-7,60)],'#758c9b');b.poly([(cx-6,50),(cx,49),(cx,60),(cx-5,58)],'#a9c5c8',None)
 # Arms: articulated shoulder / elbow / paws.
 for s in [-1,1]:
  ay=55+step*s*4;ax=cx+s*(wide+4);handx=ax+s*2+stride*s*.3
  b.poly([(cx+s*(wide-3),46),(ax,47),(ax+s*3,ay),(handx+s*2,ay+9),(handx-s*5,ay+9),(ax-s*4,ay)],shade)
  b.line([(cx+s*wide,48),(ax,ay),(handx,ay+5)],fur,3)
  b.ell(handx,ay+8,4.5,4.5,light,INK)
  if dead:
   for k in range(3):b.poly([(handx-3+k*3,ay+10),(handx-2+k*3,ay+16),(handx+k*3,ay+10)],'#e3d8b4',None)
 # Head proportions: jagged bitten ears for undead, round-cheeked expressive cats for allies.
 hx=cx+step*(1.2 if active else .5);hy=cy-15
 if id in ('ghost','hexer','summoner','venom-oracle','grave-herald','bard'):
  b.poly([(hx-21,hy+12),(hx-19,hy-10),(hx,hy-24),(hx+18,hy-10),(hx+21,hy+15),(hx,hy+8)],'#453c65')
 ears=[(hx-18,hy+1),(hx-18,hy-20),(hx-8,hy-13),(hx+7,hy-13),(hx+18,hy-21),(hx+19,hy+2),(hx+13,hy+14),(hx,hy+17),(hx-13,hy+13)]
 if dead: ears[1:2]=[(hx-19,hy-20),(hx-15,hy-14),(hx-15,hy-18)]
 b.poly(ears,shade,w=1.3)
 b.poly([(hx-16,hy),(hx-15,hy-16),(hx-7,hy-10),(hx+7,hy-10),(hx+15,hy-17),(hx+15,hy+3),(hx+9,hy+12),(hx-7,hy+12)],fur,None)
 b.poly([(hx-13,hy-3),(hx-13,hy-13),(hx-7,hy-8),(hx+3,hy-8),(hx-1,hy+2),(hx-8,hy+5)],light,None)
 b.poly([(hx+7,hy+2),(hx+15,hy-1),(hx+12,hy+9),(hx+5,hy+12)],shade,None)
 for s in [-1,1]: b.poly([(hx+s*15,hy-14),(hx+s*9,hy-8),(hx+s*14,hy-7)],'#b87389',None)
 # Fur tufts, tiny warm rim / cool edge brush marks.
 for s in [-1,1]:
  b.poly([(hx+s*14,hy+3),(hx+s*21,hy+5),(hx+s*15,hy+7),(hx+s*19,hy+10),(hx+s*11,hy+11)],fur,None)
  b.line([(hx+s*15,hy-12),(hx+s*16,hy-2)],'#8be8e2' if s<0 else '#d7958c',.7)
 # Face: deep undead sockets, exposed jaw, torn cheek; living eye shine and brows.
 eyeY=hy+1+(1 if state=='hit' else 0)
 for s in [-1,1]:
  ex=hx+s*7
  b.ell(ex,eyeY,4.4,3.5 if dead else 4,INK)
  if not (dead and s==1 and index%3==0):
   b.ell(ex+s*.4,eyeY,2.4,2.6,'#ffda78' if dead else '#63d4d5')
   b.line([(ex,eyeY-1.8),(ex,eyeY+1.5)],'#631f47' if dead else '#132d47',1)
   b.ell(ex-1,eyeY-1.4,.7,.7,'#fffbe1')
  b.line([(ex-3,eyeY-5+s*.4),(ex+3,eyeY-4-s*.6)],shade,1.5)
 b.ell(hx-4,hy+8,5,3,light);b.ell(hx+4,hy+8,5,3,light)
 b.poly([(hx-2,hy+5),(hx+2,hy+5),(hx,hy+8)],'#9b516b',None)
 b.line([(hx,hy+8),(hx,hy+10),(hx-3,hy+11)],INK,.7)
 if dead:
  b.poly([(hx-9,hy+10),(hx+9,hy+8),(hx+8,hy+14),(hx-7,hy+15)],'#461d36')
  for k in range(5): b.poly([(hx-7+k*3,hy+10),(hx-5+k*3,hy+10),(hx-6+k*3,hy+13+(k%2))],'#ded1af',None)
  b.poly([(hx+10,hy),(hx+16,hy-4),(hx+14,hy+6)],'#7f3549',None)
  for k in range(3):b.line([(hx-12+k*2,hy-4),(hx-10+k*2,hy-7)],'#533548',.6)
 else:
  for s in [-1,1]:
   for k in range(2):b.line([(hx+s*11,hy+7+k*2),(hx+s*22,hy+5+k*5)],'#b0c9c5',.6)
 # Distinct costumes and tools, hand-drawn materials.
 if hero:
  scarf='#ee6b55' if state!='feral' else '#ffb052'
  b.poly([(cx-15,45+bob),(cx+14,44+bob),(cx+12,50+bob),(cx-13,51+bob)],scarf)
  b.line([(cx-12,46+bob),(cx+10,46+bob)],'#ffcd88',1)
  b.poly([(cx-10,49+bob),(cx-25,53+step*3),(cx-36,48+other*5),(cx-32,58+other*3),(cx-15,58+step*3)],scarf)
  b.line([(cx-14,52+bob),(cx-26,55+step*3),(cx-32,52+other*4)],'#ffac70',1)
 if shape=='crown':
  b.poly([(hx-17,hy-12),(hx-20,hy-26),(hx-10,hy-21),(hx,hy-32),(hx+7,hy-22),(hx+19,hy-28),(hx+16,hy-12)],'#a27b50')
  b.poly([(hx-14,hy-15),(hx-15,hy-22),(hx-8,hy-18),(hx,hy-27),(hx+6,hy-18),(hx+15,hy-23),(hx+13,hy-15)],'#f4cf81',None)
  b.ell(hx,hy-17,2.5,3,'#ed6f8c',INK)
 if shape in ('horns','antenna'):
  for s in [-1,1]:
   b.line([(hx+s*12,hy-13),(hx+s*23,hy-24+step*3),(hx+s*21,hy-31)],INK,4)
   b.line([(hx+s*12,hy-13),(hx+s*23,hy-24+step*3),(hx+s*21,hy-31)],'#b1e8df',2)
   b.ell(hx+s*21,hy-31,2,2,accent)
 if shape=='helmet' or id=='engineer':
  b.poly([(hx-20,hy-7),(hx-16,hy-17),(hx-5,hy-20),(hx+12,hy-18),(hx+18,hy-8)],'#dbab58');b.box(hx-21,hy-8,42,3,'#fbe09b',INK);b.box(hx-3,hy-18,5,10,'#f9d48a')
 if id=='healer':
  b.box(hx-17,hy-12,34,5,'#e5eddf');b.box(hx-2,hy-16,4,12,'#e5667a');b.box(cx+18,59,12,14,'#e5e7cf',INK);b.box(cx+23,61,3,10,'#e5667a');b.box(cx+20,65,9,3,'#e5667a')
 if id=='brawler':
  for s in [-1,1]:b.ell(cx+s*21,62+step*s*4,8,7,'#9a513e',INK);b.line([(cx+s*21-4,60+step*s*4),(cx+s*21+4,60+step*s*4)],'#f5c18c',2)
 if id=='tank':
  b.poly([(cx-29,50),(cx-13,49),(cx-12,72),(cx-22,79),(cx-31,70)],'#446a80');b.poly([(cx-27,53),(cx-17,52),(cx-16,69),(cx-22,74),(cx-27,68)],'#90b5b9');b.line([(cx-22,55),(cx-22,68)],'#e4d68e',2)
 if id=='sniper' or shape in ('visor','scope','mask'):
  b.box(hx-17,hy-2,34,5,'#243344',INK);b.box(hx-14,hy-1,12,2,'#93f1ee')
 if id in ('trapper','engineer'):
  b.line([(cx+23,68),(cx+25,49)],'#b2c0b7',3);b.poly([(cx+21,50),(cx+20,43),(cx+23,41),(cx+23,46),(cx+27,46),(cx+28,41),(cx+31,44),(cx+29,51)],'#bdccbf')
 if id=='trapper':
  b.ell(cx-22,66,8,4,'#677c84',INK)
  for k in range(5):b.poly([(cx-29+k*3,65),(cx-27+k*3,60),(cx-26+k*3,65)],'#d8dcc9',None)
 if id=='bard':
  b.ell(cx+16,64,7,9,'#c99860',INK);b.ell(cx+16,62,3,3,'#362e3f');b.line([(cx+18,60),(cx+25,43)],'#e7c780',4);b.line([(cx+16,68),(cx+25,43)],'#f4dfba',.6)
 if shape=='blades':
  b.poly([(cx+23,53),(cx+36,49+step*3),(cx+39,68+step*3),(cx+28,71),(cx+26,60)],'#7f9295');b.line([(cx+36,52+step*3),(cx+38,66+step*3)],'#dce2cc',1);b.line([(cx+28,64),(cx+33,67)],'#a9514d',2)
 if dead and (shape=='hood' or id in ('hexer','summoner','blight','weaver')):
  b.line([(cx-24,75),(cx-25,38)],'#978b7e',3);b.ell(cx-25,37,5,6,INK);b.ell(cx-25,37,3,4,'#a9e5a7' if 'blight' in id or 'venom' in id else '#e7a5e4')
 if id=='volt-hydra':
  for s in [-1,1]:
   b.line([(cx+s*15,52),(cx+s*29,36)],shade,8)
   b.poly([(cx+s*24,38),(cx+s*24,25),(cx+s*30,30),(cx+s*35,24),(cx+s*36,39)],fur)
   b.line([(cx+s*27,35),(cx+s*33,35)],'#ffdc8c',2)
 if id=='stalker':
  b.poly([(hx-16,hy-12),(hx-21,hy-5),(hx-18,hy+13),(hx-11,hy+17),(hx-13,hy+4)],'#3b4044')
  b.line([(hx-19,hy-7),(hx-16,hy+12)],'#c4b882',1)
 if id=='dasher':
  for k in range(4):b.poly([(hx-5+k*3,hy-11),(hx-7+k*3,hy-22+k),(hx-1+k*3,hy-11)],'#e6d3ad')
  b.line([(cx-6,54),(cx+5,56),(cx-5,59),(cx+5,61)],'#ac514a',2)
 if id=='shambler':
  b.poly([(cx-10,49),(cx+4,50),(cx+5,62),(cx-6,61)],'#6c3f4c')
  for k in range(4):b.line([(cx-8,51+k*2),(cx+2,52+k*2)],'#c1b69b',1)
 if id in ('blight','venom-oracle','plague-empress'):
  for k in range(4):
   x=cx+wide+3+math.sin(k)*3;y=45+k*5
   b.ell(x,y,3.5,3.5,'#426344',INK);b.ell(x-1,y-1,1.6,1.6,'#c4e389')
 if id=='weaver':
  b.poly([(cx+16,53),(cx+29,45),(cx+31,59),(cx+20,64)],'#60527e')
  b.line([(cx+21,55),(cx+28,50),(cx+28,59),(cx+21,60)],'#b8abe1',1)
 if id=='jawbreaker':
  b.poly([(hx-17,hy+6),(hx-13,hy+20),(hx+12,hy+20),(hx+18,hy+5),(hx+12,hy+15),(hx-11,hy+15)],'#c5b49a')
  for k in range(5):b.poly([(hx-11+k*5,hy+16),(hx-9+k*5,hy+10),(hx-7+k*5,hy+16)],'#f0e7c4')
 if id=='the-catastrophe':
  for s in [-1,1]:
   b.poly([(cx+s*12,47),(cx+s*29,36),(cx+s*35,45),(cx+s*28,57)],'#623448')
   for k in range(3):b.poly([(cx+s*(21+k*4),43),(cx+s*(21+k*4),31-k*2),(cx+s*(26+k*4),45)],'#e7b49e')
  b.line([(hx-2,hy-11),(hx+2,hy-5),(hx-2,hy+1)],'#ffb294',1.5)
 if elite or sup:
  for s in [-1,1]:
   b.poly([(cx+s*(wide+2),44),(cx+s*(wide+9),36),(cx+s*(wide+7),49)],'#d3bca1')
 if sup or id=='the-catastrophe':
  # Broken floating crown-shards, asymmetry and rib-like luminous chest cuts.
  for k in range(5):
   x=19+k*14;y=13+math.sin(t+k)*3
   b.poly([(x,y),(x+3,y-6),(x+5,y+2)],'#e8a4d5')
  for k in range(3): b.line([(cx-7,53+k*3),(cx,55+k*3),(cx+7,52+k*3)],'#e880aa',1)
 # Machine gun body is a separate runtime aim layer; hands are painted on the atlas.
 if hero or id in ('shooter','sniper','watcher','echo-reaper','ghost'):
  b.ell(cx+8,61-recoil,5,4,light,INK)
 if state=='adrenaline':
  for k in range(4):
   y=43+k*7+math.sin(t+k)*2;b.line([(7,y),(18+k,y-1)],'#7ee9ed',1)
 if state=='feral':
  b.line([(hx-12,hy-4),(hx-4,hy-1)],'#b15742',1.5);b.line([(hx+4,hy-1),(hx+12,hy-4)],'#b15742',1.5)
  b.poly([(hx-5,hy+10),(hx,hy+13),(hx+5,hy+10)],INK,None)
 if state=='hit': b.line([(hx-13,hy-3),(hx-5,hy-1)],'#fff2d4',2)
 return im.resize((96,96),Image.Resampling.LANCZOS)
allies=['shooter','healer','tank','brawler','sniper','engineer','trapper','bard']
colors=['#e5c38a','#92e6bf','#9fc6ee','#ed9b7d','#bde282','#ebc36e','#8bdfeb','#d1a1ec']
shapes=['visor','healer','armor','fangs','scope','helmet','antenna','hood']
def atlas(id,state,n,c,shape,group,index=0):
 sheet=Image.new('RGBA',(96*n,96))
 for f in range(n):sheet.paste(sprite(id,state,f,n,c,shape,group,index),(96*f,0))
 sheet.save(OUT/f'{id}-{state}.png',optimize=True)
for state in ['idle','run','hit','feral','adrenaline','attack']:atlas('hero',state,24,'#edece1','scarf','hero')
for i,id in enumerate(allies):atlas(id,'run',12,colors[i],shapes[i],'ally',i)
for group,rows in catalog.items():
 for i,r in enumerate(rows):atlas(r['id'],'run',6,r['color'],r.get('shape',{'melee':'fangs','ranged':'scope','caster':'hood'}.get(r.get('role'))),group,i)
# Seamless deterministic pavement. Edge pixels match through wrapped brush work.
for biome,base in enumerate(['#23343e','#253b36','#413137','#302e48']):
 rng=random.Random(420+biome);im=Image.new('RGBA',(300,300),base);d=ImageDraw.Draw(im)
 for y in range(-16,316,20):
  for x in range(-32,332,40):
   xx=x+(20 if (y//20)%2 else 0);c=tuple(max(0,min(255,v+rng.randint(-8,7))) for v in rgb(base))
   d.rounded_rectangle((xx+1,y+1,xx+38,y+18),3,fill=c,outline='#15232d')
   d.line((xx+5,y+2,xx+34,y+2),fill=tint(base,1.35),width=1)
   d.line((xx+4,y+17,xx+36,y+17),fill=tint(base,.65))
 # center asphalt channel and gritty aggregate, continuous across north/south seams
 d.rectangle((116,0,184,300),fill=tint(base,.67))
 for k in range(6500):
  x=rng.randrange(300);y=rng.randrange(300);v=rng.choice([-7,-4,4,9]);p=im.getpixel((x,y));d.point((x,y),fill=tuple(max(0,min(255,c+v)) for c in p[:3])+(255,))
 for x in [113,186]:d.line((x,0,x,300),fill=tint(base,1.9),width=2)
 for y in range(20,300,60):d.rectangle((148,y,151,y+24),fill='#8f8e6c')
 for k in range(16):
  x=rng.randrange(300);y=rng.randrange(300);w=rng.randrange(8,35)
  for off in [-300,0,300]:
   d.line((x-w,y+off,x+w,y+off),fill=['#3e696e','#45665b','#815144','#585678'][biome],width=1)
 im.save(OUT/f'ground-{biome}.png')
# Architectural prop paintings at 3x resolution, same ink/material vocabulary.
def prop(kind):
 im=Image.new('RGBA',(96*S,96*S));b=Brush(im);rng=random.Random(89)
 if kind=='building':
  b.box(0,0,96,96,'#172633');b.box(1,1,94,83,'#3c505c',INK);b.box(5,5,86,66,'#22343f',INK)
  for y in range(9,70,6):
   for x in range(6,92,12):b.line([(x+(3 if y%12 else 0),y),(x+10,y)],'#41535b',.5)
  for y in [15,34,53]:
   for x in [12,32,52,72]:
    b.box(x,y,12,13,'#0c1d2a',INK);lit=rng.random()>.4
    b.box(x+1,y+1,9,9,'#8e7956' if lit else '#304c5d');b.box(x+2,y+1,3,9,'#d4b87a' if lit else '#63828d');b.line([(x,y+13),(x+13,y+13)],'#749293',1)
  b.box(4,3,88,4,'#79908b',INK);b.box(1,70,94,24,'#28333e',INK)
  b.box(12,76,27,18,'#122432',INK);b.box(15,78,21,10,'#3e6671');b.line([(15,78),(27,87)],'#80a4a4',1)
  b.box(67,74,17,22,'#0b1724',INK);b.box(69,76,12,13,'#385868');b.box(79,84,1,2,'#e5c58e')
  b.box(40,73,21,11,'#112632',INK)
  # Original fractured neon glyphs, no external font dependency.
  for x in [43,49,55]:b.line([(x,81),(x,76),(x+3,76),(x+3,78),(x,78)],'#6be9d4',1)
  b.line([(41,85),(60,85)],'#ec9aab',1);b.line([(64,7),(63,49),(68,58),(66,72)],'#121c29',1)
  b.box(7,7,16,4,'#596d71');b.line([(7,9),(21,9)],'#a6b9ad',.7)
 elif kind=='car':
  b.ell(49,78,45,10,(4,9,17,120))
  for x in [17,68]:
   for y in [19,69]:b.box(x,y,13,10,'#111a28',INK);b.line([(x+2,y+2),(x+10,y+2)],'#66757d',1)
  b.poly([(3,35),(11,25),(33,25),(42,14),(66,14),(78,27),(89,31),(94,49),(90,73),(10,73),(3,61)],'#38586d',w=1.5)
  b.poly([(8,38),(33,30),(73,31),(87,38),(87,51),(7,51)],'#7197a6',None)
  b.poly([(36,29),(44,17),(64,17),(73,29)],'#142b3c');b.poly([(40,27),(46,19),(53,19),(49,27)],'#a2c9c8',None)
  b.poly([(34,32),(74,32),(70,53),(32,53)],'#294354');b.line([(37,34),(68,34)],'#9cc5c5',1)
  b.line([(8,57),(87,57)],'#142837',2);b.line([(12,61),(84,61)],'#769595',1)
  b.box(80,39,10,6,'#f7dca2',INK);b.box(5,40,5,8,'#cd7d74',INK)
  b.box(82,54,8,10,'#152735');b.line([(83,56),(89,56)],'#b9bdab',1)
  b.line([(15,28),(23,33),(20,39),(30,45)],'#182537',1);b.line([(56,18),(60,23),(57,28)],'#d2e4d9',.6)
  for x,y in [(18,48),(61,66),(74,28)]:b.line([(x,y),(x+8,y-2)],'#c59d7d',1)
 else:
  b.box(8,23,80,57,'#31574e',INK);b.poly([(8,23),(19,12),(91,12),(88,25)],'#6f9380');b.box(5,24,86,8,'#91aa88',INK)
  b.poly([(8,34),(87,34),(85,76),(11,76)],'#456a58');b.poly([(8,34),(21,35),(21,75),(11,76)],'#68856d',None)
  for x in [25,43,61,79]:b.line([(x,38),(x-1,70)],'#203e3e',3);b.line([(x+2,38),(x+1,70)],'#7d9a78',1)
  b.box(30,43,29,15,'#c6bd8e',INK);b.line([(34,47),(53,47)],'#48665c',2);b.line([(34,52),(48,52)],'#48665c',1)
  for x in [16,76]:b.ell(x,82,7,6,'#172833',INK);b.ell(x,82,2,2,'#91a39a')
  b.line([(8,31),(84,31)],'#c0c9a0',1)
  for k in range(18):
   x=rng.randrange(13,84);y=rng.randrange(35,74);b.line([(x,y),(x+2,y+1)],'#a08058',.8)
 im.resize((288,288),Image.Resampling.LANCZOS).save(OUT/f'prop-{kind}.png')
for kind in ['building','car','dumpster']:prop(kind)
print('Rendered 41 articulated RGBA atlases (402 painted frames) and seven environment assets.')
# Human-reviewable cast proof, not a gameplay screenshot or a runtime asset.
files=[OUT/'hero-run.png']+sorted(OUT.glob('*-run.png'));files=list(dict.fromkeys(files))
proof=Image.new('RGB',(1000,((len(files)+7)//8)*145),'#1c2938');pen=ImageDraw.Draw(proof)
for i,file in enumerate(files):
 frame=Image.open(file).crop((0,0,96,96));x=i%8*125+14;y=i//8*145
 proof.paste(frame,(x,y),frame);pen.text((x-6,y+101),file.stem.replace('-run',''),fill='#d4e1dc')
proof.save(OUT/'review-cast.png')

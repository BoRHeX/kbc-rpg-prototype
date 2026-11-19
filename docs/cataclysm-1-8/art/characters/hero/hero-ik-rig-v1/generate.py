"""Cataclysm 1.0: painted skin for the world-planted two-bone hero.

Run with Python + Pillow; no downloaded assets or random generation. The modern
canonical aim painting supplies the identity/weapon underpainting. Local inverse
warps animate separate ears, breathing chest, scarf and pistol recoil, never legs.
The three limb paintings are drawn here at 4x and reduced with Lanczos.
All coordinates are in source pixels, with vertical joint-to-joint leg axes.
"""
from pathlib import Path
from math import sin, cos, pi, exp
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
S = 4

def canvas(w, h):
    im = Image.new('RGBA', (w*S, h*S))
    return im, ImageDraw.Draw(im)

def poly(d, points, color):
    d.polygon([(round(x*S), round(y*S)) for x,y in points], fill=color)

def line(d, points, color, width=1):
    d.line([(round(x*S), round(y*S)) for x,y in points], fill=color, width=round(width*S), joint='curve')

def oval(d, box, color):
    d.ellipse(tuple(round(v*S) for v in box), fill=color)

def finish(im, name):
    im.resize((im.width//S, im.height//S), Image.Resampling.LANCZOS).save(HERE/(name+'.png'))

def limbs():
    # Thigh: sculpted charcoal trouser, curved armor, stitched outer seam,
    # ivory fur cuff and copper rivets. Joint caps remain rounded, not tubes.
    im,d=canvas(20,32)
    poly(d,[(6,0),(13,0),(17,4),(18,11),(16,23),(14,30),(10,32),(5,29),(3,22),(2,10),(3,4)], '#111d2a')
    poly(d,[(5,3),(12,2),(15,6),(15,14),(12,25),(7,27),(4,20),(4,10)], '#3e5261')
    poly(d,[(7,4),(12,3),(14,8),(12,17),(9,21),(6,18),(5,10)], '#637582')
    poly(d,[(6,5),(10,4),(9,13),(6,17),(5,11)], '#92a0a6')
    poly(d,[(14,5),(16,7),(16,17),(13,27),(11,28),(13,16)], '#243444')
    line(d,[(4,7),(4,17),(7,25)], '#b4b9b5', .7)
    for y in range(9,23,3): line(d,[(4.3,y),(5,y+.6)], '#d9ceaf', .45)
    poly(d,[(5,22),(9,24),(14,22),(14,27),(12,31),(7,30),(5,27)], '#c1c3bd')
    poly(d,[(5,24),(8,26),(9,24),(10,28),(13,25),(13,29),(10,31),(7,29)], '#ede8db')
    line(d,[(6,21),(9,22),(14,20)], '#101a24', 1.5)
    for x,y in [(6,7),(13,19)]:
        oval(d,(x-1,y-1,x+1,y+1),'#c49658'); oval(d,(x-.5,y-.7,x+.2,y),'#f8d9a0')
    finish(im,'thigh')
    # Calf: narrow hock, swept fur tufts and reinforced shin, ankle cuff.
    im,d=canvas(18,34)
    poly(d,[(5,0),(12,0),(15,4),(16,11),(13,19),(12,27),(14,31),(11,34),(5,33),(3,28),(4,21),(2,14),(2,6)], '#293440')
    poly(d,[(5,2),(11,1),(13,5),(13,12),(10,20),(10,28),(6,29),(6,20),(4,13),(4,6)], '#b0b4b3')
    poly(d,[(5,3),(9,2),(11,5),(10,12),(7,18),(5,13)], '#f4eee3')
    poly(d,[(11,4),(13,6),(14,11),(11,17),(9,25),(7,27),(8,17)], '#7e8f98')
    poly(d,[(3,8),(5,10),(3,15),(6,14),(5,19),(8,17),(7,23),(10,21),(9,28),(5,28),(4,20)], '#d4d5cc')
    line(d,[(6,5),(6,10),(8,12)], '#fff9e9', .8)
    line(d,[(12,9),(11,13),(9,17)], '#627581', .8)
    poly(d,[(4,26),(10,25),(13,28),(13,32),(9,34),(4,32),(3,29)], '#263846')
    poly(d,[(5,27),(10,27),(11,29),(5,30)], '#72818a')
    line(d,[(4,31),(9,32),(12,30)], '#b4afa1', .8)
    oval(d,(9,28,11,30),'#d2ab67')
    finish(im,'calf')
    # Paw: heel left, three separately shaded toes right. Dark planted sole,
    # lifted instep and fur breakups make toe-off legible at native phone size.
    im,d=canvas(24,16)
    poly(d,[(2,5),(5,2),(11,1),(15,4),(17,6),(21,7),(23,10),(23,13),(20,15),(6,15),(1,13),(0,9)], '#182837')
    poly(d,[(2,6),(6,3),(11,2),(14,5),(15,8),(21,8),(22,11),(19,13),(5,12),(2,10)], '#b4b9b6')
    poly(d,[(4,5),(8,3),(11,3),(12,6),(16,9),(13,11),(5,10),(3,8)], '#f2ecdf')
    poly(d,[(2,9),(5,11),(15,12),(21,11),(22,13),(18,14),(5,14),(1,12)], '#4e606c')
    for x,y in [(12,8),(16,8.5),(20,9.5)]:
        oval(d,(x-2,y-1,x+2,y+3),'#d9d9cd')
        line(d,[(x+1,y+1),(x+1,y+3)], '#71818a', .7)
        line(d,[(x-1,y),(x+.5,y)], '#fff6e6', .65)
    poly(d,[(3,4),(6,3),(8,4),(7,7),(3,8)], '#526774')
    line(d,[(3,5),(6,4),(7,5)], '#a5b4b7', .8)
    oval(d,(4,5,5.5,6.5),'#dab471')
    line(d,[(4,14),(18,14),(21,13)], '#0c1a26', .8)
    finish(im,'paw')

def torso():
    ref=Image.open(HERE.parent/'aim.png').convert('RGBA')
    atlas=Image.new('RGBA',(384,768))
    # Barrel landmarks from the canonical directional painting. Recoil uses
    # separate local influence around each weapon, rather than body bobbing.
    barrels=[[(56,43),(85,34)],[(58,53),(80,57)],[(44,72),(66,63)],[(18,60),(47,70)],[(5,40),(41,44)],[(11,29),(41,42)],[(35,6),(67,6)],[(21,19),(69,7)]]
    for bearing in range(8):
        base=ref.crop((96*bearing,0,96*(bearing+1),96))
        # Anatomical waist mask: remove ALL original legs. Retain the tailored
        # belt, but remove the low tail so the new knees never sit over old art.
        weapon_mask=Image.new('L',(96,96))
        wd=ImageDraw.Draw(weapon_mask)
        # Downward barrels project below the belt. Preserve those narrow gun
        # silhouettes explicitly, rather than truncating them with the legs.
        if bearing==2:
            wd.polygon([(41,54),(47,54),(49,73),(42,74)],fill=255)
            wd.polygon([(60,53),(66,52),(70,64),(64,67)],fill=255)
        if bearing==3:
            wd.polygon([(43,52),(50,53),(48,68),(45,73),(40,71)],fill=255)
        tail_mask=Image.new('L',(96,96)); td=ImageDraw.Draw(tail_mask)
        # Keep the reference's complete fluffy tail silhouette outside the
        # leg sockets, including its curved underside (no flat crop edge).
        if bearing in (0,1,2,5,6,7):
            td.polygon([(6,42),(24,42),(28,51),(34,55),(31,61),(25,65),(14,65),(6,57)],fill=255)
        if bearing in (3,4,5):
            td.polygon([(65,54),(73,48),(73,44),(91,44),(93,57),(80,62),(68,64)],fill=255)
        for y in range(96):
            for x in range(96):
                if (y>=62 or (y>=54 and not 31<=x<=65)) and not weapon_mask.getpixel((x,y)) and not tail_mask.getpixel((x,y)):
                    base.putpixel((x,y),(0,0,0,0))
        for frame in range(4):
            phase=frame*pi/2
            tile=Image.new('RGBA',(96,96))
            src=base.load(); out=tile.load()
            # Bilinear sampling keeps the reference's painted fur/metal detail.
            for y in range(76):
                for x in range(96):
                    chest=exp(-((x-48)/16)**2-((y-48)/12)**2)
                    ear=exp(-((y-14)/13)**2)*exp(-((x-46)/27)**4)
                    scarf=exp(-((x-30)/13)**2-((y-43)/10)**2)
                    recoil=sum(exp(-((x-gx)/13)**2-((y-gy)/8)**2) for gx,gy in barrels[bearing])
                    dx=.65*sin(phase)*chest+1.8*sin(phase+.5)*scarf
                    dx-=cos(bearing*pi/4)*(1.7 if frame==1 else -.3 if frame==2 else 0)*recoil
                    dy=.8*sin(phase+.8)*ear+.5*sin(phase)*chest+1.2*sin(phase+1)*scarf
                    sy=y-dy; sx=x-dx
                    ix=int(sx); iy=int(sy); fx=sx-ix; fy=sy-iy
                    if 0<=ix<95 and 0<=iy<95:
                        samples=[(src[ix,iy],(1-fx)*(1-fy)),(src[ix+1,iy],fx*(1-fy)),(src[ix,iy+1],(1-fx)*fy),(src[ix+1,iy+1],fx*fy)]
                        a=sum(c[3]*w for c,w in samples)
                        if a>0: out[x,y]=tuple(round(sum(c[k]*c[3]*w for c,w in samples)/a) for k in range(3))+(round(a),)
            # Expressive half-blink, confined to the actual cyan iris pigment.
            # Back-facing rows naturally have no eye to close.
            if frame==3:
                for y in range(18,36):
                    for x in range(25,72):
                        r,g,b,a=tile.getpixel((x,y))
                        if a>128 and g>r*1.3 and b>r*1.3 and g>115 and y<28:
                            tile.putpixel((x,y),(157,173,178,a))
            # Discrete new scarf ribbon, behind the underpainting, not a tint.
            ribbon=Image.new('RGBA',(96,96)); d=ImageDraw.Draw(ribbon)
            back=-1 if bearing in (0,1,7) else 1
            x=47+back*16; flutter=[0,-3,1,4][frame]
            d.polygon([(x,39),(x+back*10,40),(x+back*20,44+flutter),(x+back*15,46+flutter),(x+back*21,49+flutter),(x+back*7,46),(x,44)],fill='#701e28')
            d.line([(x,40),(x+back*9,42),(x+back*17,44+flutter)],fill='#e8594d',width=2)
            ribbon.alpha_composite(tile)
            ribbon.paste((0,0,0,0),(0,76,96,96))
            atlas.alpha_composite(ribbon,(frame*96,bearing*96))
    atlas.save(HERE/'torso.png')

if __name__=='__main__':
    limbs()
    torso()

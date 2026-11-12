#!/usr/bin/env python3
"""Original Cataclysm hero animation. Python 3 + Pillow; no external assets.

Run from any directory. Outputs only the six adjacent hero atlases, 24 x 96px.
Coordinates are authored at native resolution and rasterized at 3x for clean
small-scale contours. Feet use the renderer's y=82 ground, hips sit at y=66.
Each state has its own pose choreography; no source sheet is sampled.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw

SIZE, FRAMES, AA = 96, 24, 3
STATES = ('idle', 'run', 'hit', 'feral', 'adrenaline', 'attack')
INK = '#172637'
FUR = '#fffdf2'
SHADE = '#bac9cd'
CORAL = '#f77964'


def render(state, frame):
    im = Image.new('RGBA', (SIZE*AA, SIZE*AA))
    d = ImageDraw.Draw(im)
    t = frame/FRAMES*math.tau
    s, c = math.sin(t), math.cos(t)
    def poly(points, fill, outline=INK, width=1.5):
        pts = [(round(x*AA), round(y*AA)) for x,y in points]
        d.polygon(pts, fill=fill)
        if outline:
            d.line(pts+[pts[0]], fill=outline, width=round(width*AA), joint='curve')
    def line(points, fill, width=1):
        d.line([(round(x*AA),round(y*AA)) for x,y in points], fill=fill, width=max(1,round(width*AA)), joint='curve')
    def ellipse(x,y,rx,ry,fill,outline=None,width=1):
        d.ellipse((round((x-rx)*AA),round((y-ry)*AA),round((x+rx)*AA),round((y+ry)*AA)),fill,outline,round(width*AA))
    def limb(a,b,e,color=FUR,width=6):
        line([a,b,e],INK,width+3)
        line([a,b,e],color,width)
        ellipse(*b,width/2,width/2,color)
    def transform(points, x,y,angle):
        co,si=math.cos(angle),math.sin(angle)
        return [(x+u*co-v*si,y+u*si+v*co) for u,v in points]
    def gun(x,y,angle,kick=0,flash=False):
        def p(points,color,outline=INK,width=1):
            poly(transform(points,x,y,angle),color,outline,width)
        p([(-3,0),(3,0),(2,10),(-2,11),(-4,8)],'#855b48')
        p([(-5,-5),(12,-5),(13,-3),(17,-3),(17,1),(-5,1)],'#2e4052',width=1.4)
        p([(-4,-5),(12,-5),(12,-2),(-4,-2)],'#aec1ca',None)
        p([(13,-3),(17,-3),(17,1),(13,1)],'#172637',None)
        p([(-2,3),(3,3),(2,6),(-1,6)],'#e6bd7c',None)
        for a in (1,4,7):
            line(transform([(a,-4),(a,-2)],x,y,angle),'#587487',.7)
        if flash:
            p([(18,-1),(23,-4),(22,-1),(29,0),(22,2),(24,5),(18,2)],'#ffb650',None)
            p([(18,0),(24,0),(20,2)],'#fff8cd',None)
    moving=state in ('run','adrenaline')
    feral=state=='feral'
    hit=state=='hit'
    attack=state=='attack'
    # Grounded stance -> compression -> airborne passing pose -> foot strike.
    stride=(12 if state=='run' else 15)*s if moving else (4*s if feral else .9*s)
    bounce=-abs(c)*2.8 if moving else math.sin(t)*.8
    injury=math.sin(math.pi*frame/23)**2 if hit else 0
    bx=48+(3 if moving else 0)-injury*5
    by=bounce+(5 if feral else 0)+injury*3
    head_angle=(.07 if moving else 0)+(.17*injury if hit else .025*s)
    # Tail chain: delayed tip and bent root, behind the body.
    tip=(19+5*math.sin(t-.8), 58+7*math.sin(t-1.4))
    if moving: tip=(10,56+5*math.sin(t-.8))
    if state=='adrenaline': tip=(12+3*s,47+5*math.sin(t-1.1))
    if feral: tip=(17+4*s,48+7*c)
    if hit: tip=(24+8*injury,73-2*s)
    tail=[(bx-9,65+by),(29,69+by),(20,66+by),tip]
    line(tail,INK,9); line(tail,SHADE,6);line(tail[1:],FUR,4)
    # Scarf ends have a separate lag phase, not a translation of the head.
    wind=math.sin(t-.7)
    endx=10 if moving else 15+3*math.sin(t-.5)
    endy=40+by+(3*wind if moving else 6*wind)
    if state=='adrenaline': endy-=9
    poly([(bx-8,43+by),(29,46+by),(endx,endy),(endx+4,endy+9),(29,54+by),(bx-6,48+by)],'#c94e52')
    poly([(bx-8,44+by),(29,48+by),(endx+2,endy+2),(endx+5,endy+6),(29,51+by)],CORAL,None)
    line([(endx+5,endy+4),(29,49+by),(bx-11,45+by)],'#ffc393',1)
    # Separate thighs, knees and planted feet. Swing foot lifts; stance foot stays y=80.
    for side in (-1,1):
        phase=t+(0 if side==-1 else math.pi)
        walk=stride*side
        hip=(bx+side*7,64+by)
        fx=bx+side*8+walk
        fy=79-(max(0,math.sin(phase))*9 if moving else 0)
        if state=='adrenaline': fy-=max(0,math.sin(phase))*5
        if feral: fx+=side*6;fy=79-2*max(0,math.sin(phase))
        if hit: fx+=side*injury*4;fy-=injury*(3 if side==1 else 0)
        knee=(hip[0]+walk*.35+(3 if moving else 0),71+by-abs(walk)*.18)
        limb(hip,knee,(fx,fy-2),SHADE,6)
        poly([(fx-6,fy-3),(fx+3,fy-4),(fx+7,fy-1),(fx+7,fy+2),(fx-7,fy+2)],FUR)
        line([(fx-3,fy),(fx-3,fy+1),(fx,fy+1),(fx,fy)],'#8398a2',.7)
    # Vest: bevelled panels and simple brass fasteners read at game scale.
    poly([(bx-13,46+by),(bx+12,46+by),(bx+14,65+by),(bx+10,69+by),(bx-12,68+by),(bx-15,59+by)],'#334e5d')
    poly([(bx-11,48+by),(bx-2,48+by),(bx-2,64+by),(bx-11,63+by)],'#557582',None)
    poly([(bx+2,48+by),(bx+10,49+by),(bx+11,63+by),(bx+2,64+by)],'#3f606e',None)
    line([(bx,49+by),(bx,65+by)],'#8aa3ab',1)
    for side in (-1,1):
        poly([(bx+side*8-1,53+by),(bx+side*8+1,53+by),(bx+side*8+1,58+by),(bx+side*8-1,58+by)],'#e5c38b',width=.7)
    poly([(bx-12,64+by),(bx+12,64+by),(bx+11,68+by),(bx-11,68+by)],'#223441',None)
    poly([(bx-2,64+by),(bx+2,64+by),(bx+2,67+by),(bx-2,67+by)],'#dab376',width=.7)
    # Arms are independently choreographed, each ends in an actual pistol grip.
    for side in (-1,1):
        phase=t+(0 if side==1 else math.pi)
        firephase=(frame+(0 if side==1 else 6))%12
        kick=max(0,1-firephase/4) if attack or feral else 0
        shoulder=(bx+side*13,49+by)
        if attack or feral:
            wrist=(bx+side*(23-3*kick),53+by-4*kick+(2 if side<0 else -2))
            elbow=(bx+side*19,60+by)
            angle=(0 if side==1 else math.pi)+(-side*.28*kick)
        elif state=='adrenaline':
            wrist=(bx+side*22-2*math.sin(phase),48+by+side*4-3*math.cos(phase))
            elbow=(bx+side*18,56+by+3*math.sin(phase))
            angle=(-.35 if side==1 else 3.45)+.17*math.sin(phase)
        elif moving:
            wrist=(bx+side*19+math.sin(phase)*5,56+by+6*math.sin(phase))
            elbow=(bx+side*17,55+by+4*math.sin(phase))
            angle=(-.25 if side==1 else 2.8)+.4*math.sin(phase)
        elif hit:
            wrist=(bx+side*(20-7*injury),60+by-8*injury+side*s)
            elbow=(bx+side*19,58+by)
            angle=(.7 if side==1 else 2.5)+side*.6*injury
        else:
            wrist=(bx+side*20,59+by+side*2*s)
            elbow=(bx+side*17,54+by+side*s)
            angle=(.65 if side==1 else 2.8)+.1*math.sin(phase)
        limb(shoulder,elbow,wrist,SHADE if side<0 else FUR,5)
        gun(wrist[0]+side*1.5,wrist[1]-4,angle,kick,(attack or feral) and firephase==1)
        ellipse(*wrist,4,3.8,FUR,INK,1)
    # Head transforms independently around the neck. Ear tips remain feline.
    hx=bx+(1.5*s if moving else .7*s)-injury*2
    hy=29+by+(-2 if attack else 0)
    def hp(points,fill,outline=INK,width=1.5):
        poly(transform(points,hx,hy,head_angle),fill,outline,width)
    hp([(-19,12),(-20,-19),(-9,-11),(9,-11),(20,-19),(20,9),(15,16),(-13,16)],SHADE)
    hp([(-17,9),(-17,-15),(-8,-8),(9,-8),(17,-15),(17,8),(12,13),(-12,13)],FUR,None)
    hp([(-16,-14),(-10,-9),(-16,-6)],'#e79baf',None)
    hp([(16,-14),(10,-9),(16,-6)],'#e79baf',None)
    hp([(-16,-4),(-5,-8),(8,-8),(15,-11),(12,-4),(-9,-2)],'#ffffff',None)
    hp([(-17,6),(-11,9),(-9,13),(-14,12)],'#d8e1dc',None)
    hp([(17,4),(13,10),(8,13),(13,13),(17,9)],'#d0dbd8',None)
    def he(x,y,rx,ry,fill,outline=None,width=1):
        # Eyes follow head rotation through an affine point placement.
        px,py=transform([(x,y)],hx,hy,head_angle)[0]
        ellipse(px,py,rx,ry,fill,outline,width)
    blink=1
    if state=='idle' and frame in (15,16,17): blink=(.45,.12,.6)[frame-15]
    if hit: blink=.8-.65*injury
    for side in (-1,1):
        ex=side*8.5
        if feral:
            hp([(ex-5,-3),(ex+5,-3+side*2),(ex+4,4),(ex-4,5)],'#ef574e',width=1.3)
            hp([(ex,-1),(ex+1.5,-1),(ex+1,4),(ex,4)],'#401f32',None)
        else:
            he(ex,1,5.2,5.6*blink,'#142c3b')
            he(ex+.35*s,1,3.4,4*blink,'#4bd3e7' if state!='adrenaline' else '#8cf6f4')
            he(ex+.5,1.5,1.3,3*blink,'#18566f')
            if blink>.5: he(ex-1,-.5,1.2,1.4,'#fffef0')
        if hit:
            hp([(ex-5,-5),(ex+4,-3)],INK,None)
    hp([(-2.5,7),(2.5,7),(0,10)],'#d47e97',None,.7)
    for side in (-1,1):
        pts=transform([(0,10),(side*2,12),(side*5,11)],hx,hy,head_angle)
        line(pts,'#5a6370',.8)
        for j in range(2):
            pts=transform([(side*13,6+j*4),(side*(23+(2*s if feral else 0)),4+j*7)],hx,hy,head_angle)
            line(pts,'#ecf3e9',1)
    if feral:
        hp([(-5,12),(5,12),(3,15),(-3,15)],'#632c3e',None)
        hp([(-4,12),(-1,12),(-2,15)],FUR,None)
        hp([(4,12),(1,12),(2,15)],FUR,None)
        for side in (-1,1): hp([(side*15,-2),(side*6,-1)],INK,None)
    if hit:
        hp([(10,6),(14,10)],'#c35467',None)
        hp([(12,5),(16,9)],'#c35467',None)
    # Neck wrap sits over vest, under chin, with a knotted side and lit top fold.
    poly([(bx-15,43+by),(bx+15,43+by),(bx+13,49+by),(bx-12,50+by)],CORAL)
    line([(bx-12,44+by),(bx+13,44+by)],'#ffc19b',1.3)
    line([(bx-10,48+by),(bx+11,47+by)],'#c64b50',1)
    ellipse(bx-13,46+by,3,3,'#ed6d5d',INK,.8)
    return im.resize((SIZE,SIZE),Image.Resampling.LANCZOS)


def main():
    for state in STATES:
        atlas=Image.new('RGBA',(SIZE*FRAMES,SIZE))
        for frame in range(FRAMES): atlas.alpha_composite(render(state,frame),(frame*SIZE,0))
        atlas.save(Path(__file__).resolve().parent/f'hero-{state}.png',optimize=False)


if __name__=='__main__':
    main()

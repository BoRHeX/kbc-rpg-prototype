"""Extract approved source pixels; run from any directory with Pillow installed."""
from pathlib import Path
from collections import deque
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
source = Image.open(ROOT / 'references/hero-illustrated-pose-sheet.png').convert('RGB')
# Complete silhouettes, excluding adjacent poses and most floating action marks.
boxes = {
 'idle': (28, 30, 347, 340), 'joy': (354, 30, 645, 340),
 'walk': (652, 38, 1004, 335), 'sprint': (1032, 50, 1444, 307),
 'crouch': (17, 466, 338, 672), 'pounce': (369, 369, 714, 602),
 'startled': (744, 372, 1057, 679), 'hurt': (1074, 470, 1424, 677),
 'feral': (39, 751, 500, 1048), 'adrenaline': (548, 708, 912, 1048),
 'sleep': (1000, 798, 1393, 1048),
}
out = ROOT / 'illustrated'
out.mkdir(exist_ok=True)
for name, box in boxes.items():
    crop = source.crop(box)
    w, h = crop.size
    pixels = crop.load()
    exterior = set()
    queue = deque([(x, y) for x in range(w) for y in (0, h-1)] + [(x, y) for y in range(h) for x in (0, w-1)])
    # Flood only the exterior matte: enclosed white fur stays opaque.
    while queue:
        x, y = queue.popleft()
        if (x,y) in exterior or not (0 <= x < w and 0 <= y < h):
            continue
        r,g,b = pixels[x,y]
        if min(r,g,b) < 173 or max(r,g,b)-min(r,g,b) > 68:
            continue
        exterior.add((x,y))
        queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    mask = Image.new('L', (w,h), 255)
    mp = mask.load()
    for x,y in exterior:
        mp[x,y] = 0
    # Remove detached marks and background islands, retaining the complete cat.
    remaining = {(x,y) for y in range(h) for x in range(w) if mp[x,y]}
    largest = set()
    while remaining:
        component = {remaining.pop()}
        pending = list(component)
        while pending:
            x,y = pending.pop()
            for n in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if n in remaining:
                    remaining.remove(n); component.add(n); pending.append(n)
        if len(component) > len(largest):
            largest = component
    mask = Image.new('L', (w,h))
    mp = mask.load()
    for x,y in largest:
        mp[x,y] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(.45))
    rgba = crop.convert('RGBA')
    rgba.putalpha(mask)
    rgba = rgba.crop(mask.getbbox())
    # Shared source scale preserves head/body proportions between poses.
    rgba.thumbnail((round(rgba.width*.58), round(rgba.height*.58)), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (288,224))
    frame.alpha_composite(rgba, ((288-rgba.width)//2, 211-rgba.height))
    frame.save(out / (name+'.png'))
preview = Image.new('RGB', (288*4,224*3), '#294a50')
for i,name in enumerate(boxes):
    frame=Image.open(out/(name+'.png'))
    preview.paste(frame, ((i%4)*288,(i//4)*224), frame)
preview.save('/tmp/illustrated-extraction.jpg')

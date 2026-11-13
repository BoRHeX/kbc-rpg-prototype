"""Cataclysm 1.0 protagonist directional animation and restrained mobile UI correction.

Only recombines the existing CURRENT reference character art, never old painted
hero atlasses, newly invented character art or AI-generated impostor sprites.

For each of 8 genuine compass directions (authored aim reference), animate
8 run/8 attack or 6 idle poses from the matching modern painted sheets.
Build once in CI, ship normal PNG atlases, and draw a *single complete frame*
per hero draw; absolutely no in-game waist/leg stitching.

No gameplay balance, XP, dialogue, companion behavior, music or RNG edits.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parents[3] / "docs"
MODES = ("cataclysm-1-0-major", "cataclysm-100-lab")

def change_once(source: str, old: str, new: str, path: Path) -> str:
    if old in source:
        if source.count(old) != 1:
            raise RuntimeError(f"Ambiguous source hook {path}: {old[:65]}")
        return source.replace(old, new, 1)
    if new in source:
        return source
    raise RuntimeError(f"Unexpected code structure {path}; missing hook {old[:65]}")

def generate(root: Path) -> None:
    art = root / "art" / "characters" / "hero"
    aim = Image.open(art / "aim.png").convert("RGBA")
    assert aim.size == (8 * 96, 96), aim.size
    # Keep the torso, face, hands, both pistols and tail from the exact authored
    # compass pose; animate the legs and lower outfit from the matching series.
    mask = Image.new("L", (96, 96))
    d = ImageDraw.Draw(mask)
    for y in range(96):
        v = min(1.0, max(0.0, (y - 58) / 12))
        smooth = v * v * (3 - 2 * v)
        d.line((0, y, 95, y), fill=round(255 * smooth))
    for state, frames in (("run", 8), ("idle", 6), ("attack", 8)):
        source = Image.open(art / (state + ".png")).convert("RGBA")
        assert source.size == (frames * 96, 96), (state, source.size)
        combined = Image.new("RGBA", (8 * frames * 96, 96))
        for direction in range(8):
            facing = aim.crop((direction * 96, 0, (direction + 1) * 96, 96))
            for frame in range(frames):
                moving = source.crop((frame * 96, 0, (frame + 1) * 96, 96))
                rendered = Image.composite(moving, facing, mask)
                combined.paste(rendered, ((direction * frames + frame) * 96, 0))
        # 64 direction/phase pairs are real, distinct image source rectangles,
        # not a time-only counter or a CSS animation over a static PNG.
        target = art / ("directed-" + state + ".png")
        combined.save(target, optimize=True)
        assert Image.open(target).size == (8 * frames * 96, 96)
        print(f"AUTHORED DIRECTIONAL ART {root.name}: {state} {8*frames} frames {target.stat().st_size} bytes")

def patch_animation(path: Path) -> None:
    s = path.read_text()
    hook = "for(const id of enemyIds)loadAtlas(id+'-run',6);\nfunction assetStatus()"
    new = """for(const id of enemyIds)loadAtlas(id+'-run',6);
// The directional hero sheets use only the current modern reference artwork.
// Each 96px frame is a complete, pre-composited picture; no runtime stitching.
const directedHero=Object.create(null);
const directedMetrics={loaded:0,failed:0,total:3};
for(const [state,frames,fps] of [['run',8,12],['idle',6,7],['attack',8,12]]){
  const entry={ready:false,count:frames,fps,image:null};
  directedHero[state]=entry;
  if(typeof root.Image!=='function')continue;
  const img=new root.Image();entry.image=img;
  let settled=false;
  const fail=()=>{if(!settled){settled=true;directedMetrics.failed++;}};
  img.onerror=fail;
  img.onload=()=>{
    if(img.naturalWidth!==8*frames*96||img.naturalHeight!==96){fail();return;}
    const ready=()=>{if(!settled){settled=true;entry.ready=true;directedMetrics.loaded++;}};
    if(typeof img.decode==='function')img.decode().then(ready,fail);else ready();
  };
  img.src=assetBase+'characters/hero/directed-'+state+'.png?art='+assetRelease;
}
function directionalStatus(){return {...directedMetrics,states:Object.fromEntries(Object.entries(directedHero).map(([k,v])=>[k,v.ready]))};}
function assetStatus()"""
    s = change_once(s,hook,new,path)
    hook = "  const requested=state;\n  // Missing action sheets use the complete painted run cycle"
    new = """  const requested=state;
  const directed=id==='hero'?directedHero[state]:null;
  if(directed?.ready){
    const phase=reduced?0:Math.floor(Math.max(0,time)*directed.fps)%directed.count;
    const frame=aimFrame(aim)*directed.count+phase;
    ctx.save();ctx.scale(r/23,r/23);
    ctx.drawImage(directed.image,frame*96,0,96,96,-48,-58,96,96);
    if(damaged){
      ctx.save();ctx.globalAlpha=.52;ctx.filter='brightness(2.2)';
      ctx.drawImage(directed.image,frame*96,0,96,96,-48,-58,96,96);ctx.restore();
    }
    ctx.restore();return frame;
  }
  // Missing action sheets use the complete painted run cycle"""
    s = change_once(s,hook,new,path)
    hook="draw,assetStatus,overrideStatus,hasReferenceAnimation,aimFrame,heroBarrels,actionDuration"
    new="draw,assetStatus,directionalStatus,overrideStatus,hasReferenceAnimation,aimFrame,heroBarrels,actionDuration"
    s=change_once(s,hook,new,path)
    path.write_text(s)

def patch_game(path: Path) -> None:
    s=path.read_text()
    # Running never freezes each time the gun fires; the selected directional
    # gait still shows muzzle flashes from the already working combat renderer.
    s=change_once(s,"p.animation.attack=.14;p.lastShotAt=game.t;","p.animation.attack=.32;p.lastShotAt=game.t;",path)
    s=change_once(s,
      "anim.state=anim.hit>0?'hit':anim.attack>0?'attack':anim.moving?'run':'idle';",
      "anim.state=anim.hit>0?'hit':anim.moving?'run':anim.attack>0?'attack':'idle';",path)
    s=change_once(s,
      """      game.player.animation.state==='attack'?'attack':
      game.player.animation.moving?
        (ART.hasReferenceAnimation('hero','walk')&&game.player.animation.moveSpeed<game.player.speed*.65?'walk':'run'):
        'idle':requestedState;""",
      """      game.player.animation.moving?
        (ART.hasReferenceAnimation('hero','walk')&&game.player.animation.moveSpeed<game.player.speed*.65?'walk':'run'):
      game.player.animation.state==='attack'?'attack':'idle':requestedState;""",path)
    # Give the turret a mechanically recognizable base, rotating barrel, flash
    # and engineering color language; tiny bounded canvas work, no new actors.
    hook="  function drawCompanionEffect(pet){"
    turret="""  function drawEngineerTurret(c,t,time){
    c.save();c.translate(t.x,t.y);
    c.fillStyle='#071b23a9';c.beginPath();c.ellipse(0,15,22,8,0,0,TWO);c.fill();
    // Tripod base and hardened mount; unlike the old two golden rectangles.
    c.lineJoin='round';c.lineCap='round';
    for(const side of [-1,1]){
      c.strokeStyle='#092632';c.lineWidth=8;c.beginPath();c.moveTo(side*4,7);c.lineTo(side*17,15);c.stroke();
      c.strokeStyle='#b3a17d';c.lineWidth=4;c.stroke();
    }
    c.fillStyle='#344f5a';c.strokeStyle='#a7dac9';c.lineWidth=2;
    c.beginPath();c.ellipse(0,7,13,9,0,0,TWO);c.fill();c.stroke();
    c.fillStyle='#f1cf74';c.fillRect(-4,4,8,5);
    c.save();c.translate(0,-3);c.rotate(Number.isFinite(t.aim)?t.aim:0);
    c.fillStyle='#112d39';c.strokeStyle='#8dc5bb';c.lineWidth=2;
    c.beginPath();c.roundRect(-12,-10,26,18,5);c.fill();c.stroke();
    c.fillStyle='#c8b477';c.fillRect(-9,-8,6,4);c.fillRect(-9,1,6,4);
    c.fillStyle='#a2d8ca';c.fillRect(10,-5,23,10);
    c.fillStyle='#163946';c.fillRect(28,-5,6,10);
    c.fillStyle='#ffd890';c.fillRect(32,-3,3,6);
    if(t.timer>.28&&t.timer<=.35){
      c.fillStyle='#fff3b7';c.beginPath();c.moveTo(35,0);c.lineTo(50,-7);
      c.lineTo(45,0);c.lineTo(50,7);c.closePath();c.fill();
    }
    c.restore();c.restore();
  }
  function drawCompanionEffect(pet){"""
    s=change_once(s,hook,turret,path)
    s=change_once(s,
      "if(target){pet.followerStats.turretUsefulSeconds=(pet.followerStats.turretUsefulSeconds||0)+dt;}",
      "if(target){t.aim=Math.atan2(target.y-t.y,target.x-t.x);pet.followerStats.turretUsefulSeconds=(pet.followerStats.turretUsefulSeconds||0)+dt;}",path)
    s=change_once(s,
      "if(pet.turret){const t=pet.turret;inkBox(t.x-13,t.y-10,26,20,'#d1ae64');inkBox(t.x-4,t.y-23,8,22,'#aec9c5');}",
      "if(pet.turret)drawEngineerTurret(ctx,pet.turret,g.t);",path)
    path.write_text(s)

CSS = """
/* Protagonist directional animation pass — keep Android safe-area clear of HUD. */
:root{--cat-top-inset:env(safe-area-inset-top,0px)}
.identity,.quick-controls{top:var(--cat-top-inset)}
.identity{right:calc(max(8px,env(safe-area-inset-right)) + 52px);padding-right:0;
  min-width:0;gap:8px;white-space:nowrap;height:44px}
.identity .back{flex:0 0 auto}
.identity>span{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.identity .fullscreen-toggle{flex:0 0 auto;width:clamp(62px,14vw,88px);min-width:0;
  height:38px;min-height:38px;max-height:38px;margin-left:0;padding:5px 6px}
.quick-controls{right:max(8px,env(safe-area-inset-right))}
.hud{top:calc(var(--cat-top-inset) + 52px)}
#night-status{top:calc(var(--cat-top-inset) + 99px)}
#boss-status{top:calc(var(--cat-top-inset) + 125px)}
#major-buff-icons{top:calc(var(--cat-top-inset) + 114px)}
@media(orientation:portrait){
  .hud{top:calc(var(--cat-top-inset) + 52px)}
  #night-status{top:calc(var(--cat-top-inset) + 146px)}
  #boss-status{top:calc(var(--cat-top-inset) + 171px)}
  #major-buff-icons{top:calc(var(--cat-top-inset) + 197px)}
}
"""

def patch_css(path: Path) -> None:
    s=path.read_text()
    if "/* Protagonist directional animation pass" not in s:
        path.write_text(s.rstrip()+"\n"+CSS)

def main() -> None:
    for name in MODES:
        folder=ROOT/name
        generate(folder)
        patch_animation(folder/"animation.js")
        patch_game(folder/"game.js")
        patch_css(folder/"game.css")
        print("PATCHED",name,"all legacy hero art retained only as fallback")
if __name__=="__main__":
    main()

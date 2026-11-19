"""Build Pass 08 assets from verified API outputs. Run with Python and Pillow."""
import hashlib
import json
import math
import wave
from array import array
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STUDIO = ROOT / "STUDIO"
manifest = json.loads((STUDIO / "IMAGE_MANIFEST.json").read_text())
images = {}
assets = []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for record in manifest["images"]:
    source = ROOT / record["path"]
    assert digest(source) == record["sha256"], source
    with Image.open(source) as image:
        assert image.size == tuple(record["size"]) and image.mode == record["mode"], source
        images[source.stem] = (record, image.copy())


def output(path, **details):
    file = ROOT / path
    assets.append(dict(path=path, sha256=digest(file), bytes=file.stat().st_size, **details))


def raster(name, source, box, size):
    record, image = images[source]
    path = f"art/polish/{name}.png"
    derived = image.crop(box)
    derived.thumbnail(size, Image.Resampling.LANCZOS)
    (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
    derived.save(ROOT / path, optimize=True)
    output(path, source=record["path"], sourceSha256=record["sha256"],
           cropLTRB=list(box), size=list(derived.size), frameIndex=0)


raster("cover", "cataclysm_menu_cover", (0, 0, 1024, 1024), (768, 768))
raster("cover-small", "cataclysm_menu_cover", (0, 0, 1024, 1024), (480, 480))
for name, box in {
    "flooded-street": (2, 2, 388, 489),
    "stair-landing": (398, 2, 643, 489),
    "sealed-door": (652, 2, 1022, 489),
}.items():
    raster(name, "threshold_trial_arena", box, (384, 480))

# Editorial icons use hand-selected atlas rectangles. They carry no actor identity.
for name, box in {
    "company": (2, 52, 121, 182),
    "evolution": (394, 8, 520, 186),
    "mutants": (123, 190, 276, 345),
    "bosses": (492, 195, 656, 350),
    "fish": (2, 511, 147, 615),
    "bait": (715, 510, 871, 615),
    "jackpot": (145, 613, 274, 762),
}.items():
    raster(name, "codex_collectibles_atlas", box, (96, 96))

# Original pitches and envelopes, with a bell-like inharmonic partial.
RATE = 22050
for name, notes in {
    "menu-open": [(0, 392, .22), (.10, 587.33, .27), (.21, 659.25, .34)],
    "codex-turn": [(0, 783.99, .11), (.05, 1046.50, .13)],
    "trial-entry": [(0, 146.83, .38), (.22, 220, .39), (.44, 293.66, .5)],
    "weather-turn": [(0, 329.63, .20), (.16, 311.13, .28)],
    "trial-clear": [(0, 293.66, .36), (.15, 440, .36), (.33, 587.33, .54)],
    "trial-retry": [(0, 220, .25), (.15, 174.61, .32)],
}.items():
    frames = math.ceil(max(start + duration for start, _, duration in notes) * RATE)
    samples = array("h")
    for frame in range(frames):
        value = 0
        for start, pitch, duration in notes:
            t = frame / RATE - start
            if 0 <= t < duration:
                envelope = min(t / .012, 1) * (1 - t / duration) ** 2
                phase = math.tau * pitch * t
                value += envelope * (math.sin(phase) + .16 * math.sin(phase * 2.76))
        samples.append(round(value * 4800))
    if __import__("sys").byteorder != "little":
        samples.byteswap()
    path = f"audio/polish/{name}.wav"
    (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(ROOT / path), "wb") as wav:
        wav.setparams((1, 2, RATE, frames, "NONE", "not compressed"))
        wav.writeframes(samples.tobytes())
    output(path, source="STUDIO/build-polish-media.py", sampleRate=RATE, channels=1,
           frames=frames, encoding="PCM signed 16-bit little-endian")

(STUDIO / "POLISH_MEDIA.json").write_text(json.dumps({
    "sourceManifest": "STUDIO/IMAGE_MANIFEST.json",
    "animationPolicy": "New PNGs are static frame 0. Inherited frame descriptors keep original indices.",
    "assets": assets,
}, indent=2) + "\n")

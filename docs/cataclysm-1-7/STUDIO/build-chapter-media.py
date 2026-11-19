"""Rebuild Pass 03 crops, PCM compositions and the media manifests."""
import hashlib
import json
import math
from pathlib import Path
import struct
import wave

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ANIMATED = ROOT / "art/animated"
AUDIO = ROOT / "audio/generated"
ANIMATED.mkdir(parents=True, exist_ok=True)
AUDIO.mkdir(parents=True, exist_ok=True)
manifest_path = ROOT / "STUDIO/IMAGE_MANIFEST.json"
manifest = json.loads(manifest_path.read_text())
records = {}
sources = {entry["name"]: entry for entry in manifest["images"]}
images = {}
for name, entry in sources.items():
    path = ROOT / entry["path"]
    if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
        raise ValueError(f"Source hash mismatch: {path}")
    images[name] = Image.open(path)


def crop(key, source, box):
    name = "long_night_" + source
    image = images[name].crop(box)
    path = ANIMATED / f"long-night-{key}.png"
    image.save(path, optimize=True)
    records[key] = dict(path=str(path.relative_to(ROOT)), source=sources[name]["path"],
                        crop=list(box), size=list(image.size),
                        sha256=hashlib.sha256(path.read_bytes()).hexdigest())


for key, box in {
    "coast": (0, 0, 512, 512), "canal": (512, 0, 1024, 512),
    "occult": (0, 512, 512, 1024), "furnace": (512, 512, 1024, 1024),
}.items():
    crop(key, "chapter_city_atlas", box)

for i in range(10):
    col, row = i % 5, i // 5
    edges = (0, 204, 410, 615, 819, 1024)
    top, bottom = ((208, 502), (510, 820))[row]
    crop(f"emblem-{i+1:02}", "ten_chapter_emblems", (edges[col], top, edges[col+1], bottom))

crop("gateway", "climax_boss_stage", (0, 0, 365, 614))
crop("lieutenants", "climax_boss_stage", (365, 0, 1024, 616))
crop("squad", "climax_boss_stage", (0, 616, 1024, 1024))

scenes = ["coast", "canal", "furnace", "occult", "coast",
          "canal", "furnace", "occult", "occult", "furnace"]
# Root, color tones, and loop length. Registers and voicings shift with each district.
themes = [
    (45, [0, 7, 12, 15], 8), (43, [0, 10, 14, 17], 10),
    (40, [0, 7, 13, 19], 8), (48, [0, 7, 14, 21], 12),
    (46, [0, 5, 15, 19], 10), (42, [0, 8, 14, 19], 12),
    (41, [0, 6, 10, 18], 8), (47, [0, 7, 14, 16], 10),
    (39, [0, 6, 13, 20], 12), (38, [0, 7, 12, 22], 12),
]
rate = 22050
audio_records = {}


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def write_wav(name, seconds, sample):
    path = AUDIO / f"long-night-{name}.wav"
    frames = int(seconds * rate)
    pcm = bytearray(frames * 2)
    for i in range(frames):
        struct.pack_into("<h", pcm, i * 2, round(32767 * sample(i, frames)))
    with wave.open(str(path), "wb") as stream:
        stream.setparams((1, 2, rate, frames, "NONE", "not compressed"))
        stream.writeframes(pcm)
    audio_records[name] = dict(path=str(path.relative_to(ROOT)), seconds=seconds,
                               sampleRate=rate, channels=1,
                               sha256=hashlib.sha256(path.read_bytes()).hexdigest())


def compose_loop(index, root, tones, seconds):
    frequencies = [round(hz(root + interval) * seconds) for interval in tones]
    def sample(i, count):
        phase = math.tau * i / count
        drone = .28 * math.sin(phase * frequencies[0])
        pad = sum(.115 * (.55 + .45 * math.cos(phase * (n + 1) + n)) *
                  math.sin(phase * frequency) for n, frequency in enumerate(frequencies[1:]))
        slot = (i / count * 8) % 1
        step = i * 8 // count
        lead = frequencies[(step * (1 + index % 2) + index) % len(tones)] * 2
        bell = .22 * math.sin(math.pi * slot) ** 2 * math.exp(-3 * slot) * (
            math.sin(phase * lead) + .24 * math.sin(phase * (lead * 2 + 3)))
        return drone * (.72 + .28 * math.cos(phase * (2 + index % 3))) + pad + bell
    write_wav(f"chapter-{index+1:02}", seconds, sample)


def compose_cue(name, root, intervals):
    notes = [hz(root + interval) for interval in intervals]
    def sample(i, count):
        t = i / rate
        tail = min(1, (count - 1 - i) / (rate * .18))
        value = 0
        for n, freq in enumerate(notes):
            age = t - n * .19
            if age >= 0:
                env = min(1, age / .024) * math.exp(-4.1 * age)
                value += .23 * env * (math.sin(math.tau * age * freq) +
                                      .27 * math.sin(math.tau * age * freq * 2.01))
        return value * tail
    write_wav(name, 1.6, sample)


chapters = []
for i, (root, tones, length) in enumerate(themes):
    compose_loop(i, root, tones, length)
    chapters.append(dict(scene=scenes[i], emblem=f"emblem-{i+1:02}", loop=f"chapter-{i+1:02}"))
compose_cue("arrival", 57, [0, 7, 12, 14])
compose_cue("gauntlet", 40, [12, 6, 1, 0])
compose_cue("light", 62, [0, 7, 12])

frame_manifest = dict(chapters=chapters, frames=records, audio=audio_records,
                      transition=dict(duration=3.2, fadeIn=.22, fadeOut=.55,
                                      emblemDriftPixels=5))
frame_path = ROOT / "art/animated/long-night-frames.js"
frame_path.write_text(
    "/* Generated by STUDIO/build-chapter-media.py. */\n"
    "globalThis.CATA_CHAPTER_FRAMES = " + json.dumps(frame_manifest, indent=2) + ";\n")
manifest["pass03"] = dict(frameManifest=str(frame_path.relative_to(ROOT)),
                          frameManifestSha256=hashlib.sha256(frame_path.read_bytes()).hexdigest(),
                          derivedPngs=records, generatedWavs=audio_records)
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

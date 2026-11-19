"""Verify the delivered source atlases and build Pass 05 media. Requires Pillow."""
import hashlib
import json
import math
from pathlib import Path
import random
import struct
import wave

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RATE = 24000

# Source coordinates read from the delivered paintings. The mood sheet uses
# an uneven grid. Keep the entire rain/fish cluster together.
FUSION = {
    "trawl-ready": (0, 0, 512, 491),
    "trawl-cast": (512, 0, 1024, 491),
    "spotter-ready": (0, 491, 512, 1024),
    "spotter-fire": (512, 491, 1024, 1024),
}
WEATHER = {
    "rain": (0, 0, 512, 512),
    "storm": (512, 0, 1024, 512),
    "fog": (0, 512, 512, 1024),
    "clear": (512, 512, 1024, 1024),
}
MOOD = {
    "curious": (0, 0, 242, 461),
    "worried": (242, 0, 497, 461),
    "determined": (497, 0, 782, 461),
    "excited": (782, 0, 1024, 461),
    "beacon": (0, 461, 269, 1024),
    "cache": (230, 540, 540, 870),
    "rain-fish": (540, 461, 744, 1024),
    "rescue": (744, 461, 1024, 1024),
}
ATLAS_CUTS = {
    "companion_fusion_evolutions": ("fusion", FUSION),
    "weather_city_biome_atlas": ("weather", WEATHER),
    "companion_mood_missions": ("mood-mission", MOOD),
}
CUES = {
    "trawl-cast": (0.72, (220, 330, 440), 0.22),
    "spotter-fire": (0.48, (440, 587.33, 880), 0.16),
    "rain": (1.30, (246.94, 369.99, 493.88), 0.35),
    "storm": (1.65, (73.42, 82.41, 110), 0.52),
    "fog": (1.45, (174.61, 261.63, 293.66), 0.08),
    "clear": (1.20, (261.63, 329.63, 523.25), 0.03),
    "mission-complete": (0.85, (293.66, 440, 587.33), 0.04),
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verified_atlases():
    manifest = json.loads((ROOT / "STUDIO/IMAGE_MANIFEST.json").read_text())
    entries = {entry["name"]: entry for entry in manifest["images"]}
    atlases = {}
    for name in ATLAS_CUTS:
        entry = entries[name]
        path = ROOT / entry["path"]
        with Image.open(path) as source:
            actual = (source.format, source.mode, list(source.size),
                      path.stat().st_size, digest(path))
            expected = ("PNG", entry["mode"], entry["size"],
                        entry["bytes"], entry["sha256"])
            if entry["status"] != "GENERATED" or actual != expected:
                raise ValueError(f"Atlas evidence mismatch: {name}")
            bounds = source.getchannel("A").getextrema() if source.mode == "RGBA" else None
            if bounds and (bounds[0] != 0 or bounds[1] < 250):
                raise ValueError(f"Missing expected alpha range: {name}")
            atlases[name] = source.copy()
    return atlases


def save_frames(atlases):
    frames = {}
    for name, (group, cuts) in ATLAS_CUTS.items():
        for key, box in cuts.items():
            frame = atlases[name].crop(box)
            if group == "fusion":
                # Keep a shared bottom-center pivot within the two poses.
                stage = Image.new("RGBA", (512, 544))
                stage.paste(frame, (0, 544 - frame.height))
                frame = stage
                frame.thumbnail((192, 204), Image.Resampling.LANCZOS)
            else:
                if frame.mode == "RGBA":
                    frame = frame.crop(frame.getchannel("A").getbbox())
                limit = 320 if group == "weather" else 144
                frame.thumbnail((limit, limit), Image.Resampling.LANCZOS)
            path = ROOT / "art/advancement" / group / (key + ".png")
            path.parent.mkdir(parents=True, exist_ok=True)
            frame.save(path, optimize=True)
            frames[key] = dict(path=path.relative_to(ROOT).as_posix(),
                               atlas=name, sourceBox=list(box), size=list(frame.size),
                               sha256=digest(path))
    return frames


def save_cues():
    cues = {}
    for key, (duration, notes, noise_mix) in CUES.items():
        rng = random.Random(key)
        path = ROOT / "audio/advancement" / (key + ".wav")
        path.parent.mkdir(parents=True, exist_ok=True)
        samples = bytearray()
        noise = 0.0
        for i in range(round(duration * RATE)):
            t = i / RATE
            noise += 0.23 * (rng.uniform(-1, 1) - noise)
            signal = noise_mix * noise * math.exp(-3 * t)
            for index, note in enumerate(notes):
                age = t - index * duration / 5
                if age >= 0:
                    phase = math.tau * note * age
                    envelope = min(1, age / 0.025) * math.exp(-5 * age / duration)
                    signal += 0.16 * envelope * (math.sin(phase) + 0.22 * math.sin(2 * phase))
            fade = min(1, t / 0.018, (duration - t) / 0.09)
            samples.extend(struct.pack("<h", round(32767 * signal * fade)))
        with wave.open(str(path), "wb") as wav:
            wav.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
            wav.writeframes(samples)
        cues[key] = dict(path=path.relative_to(ROOT).as_posix(), seconds=duration,
                         sampleRate=RATE, channels=1, bits=16, sha256=digest(path))
    return cues


def main():
    inventory = {
        "frames": save_frames(verified_atlases()),
        "cues": save_cues(),
        "fusionAnimations": {
            "trawl_team": {"rest": "trawl-ready", "action": "trawl-cast", "holdMs": 220},
            "spotter_pair": {"rest": "spotter-ready", "action": "spotter-fire", "holdMs": 130},
        },
        "fusionPivotNormalized": [0.5, 1],
    }
    (ROOT / "STUDIO/ADVANCEMENT_MEDIA.json").write_text(
        json.dumps(inventory, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()

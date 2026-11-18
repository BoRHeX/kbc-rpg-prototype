"""Compose original, deterministic 24 kHz mono PCM for the mutation handoff."""
import hashlib
import json
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RATE = 24000
# Each voice gives onset, duration, initial/final Hz, amplitude and timbre.
CUES = {
    "bell-countdown": (4, 1.3, [(0,.40,380,380,.34,"metal"), (.49,.35,480,480,.38,"metal"), (.94,.35,615,615,.45,"metal")]),
    "bell-strike": (4, .65, [(0,.64,165,160,.53,"metal")]),
    "mimic-reveal": (4, .95, [(0,.30,1700,850,.22,"grit"), (.57,.37,135,600,.45,"growl")]),
    "roof-pounce": (4, 1.24, [(0,.46,790,370,.22,"grit"), (.50,.37,640,255,.29,"grit"), (.90,.33,125,38,.48,"growl")]),
    "necro-ritual": (3, 1.58, [(0,1.2,82,91,.28,"growl"), (.36,.66,165,175,.16,"growl"), (.82,.35,330,410,.22,"metal"), (1.19,.38,247,220,.34,"metal")]),
    "pack-charge": (3, 1.12, [(0,.21,105,55,.32,"growl"), (.28,.20,120,60,.36,"growl"), (.51,.17,150,65,.40,"growl"), (.70,.41,145,34,.41,"growl")]),
    "fish-theft": (2, .40, [(0,.10,820,1500,.22,"metal"), (.10,.11,1100,600,.32,"metal"), (.20,.19,1600,420,.28,"grit")]),
    "boss-phase-escalation": (5, 1.8, [(0,1.17,50,118,.34,"growl"), (.38,.75,128,210,.21,"growl"), (.82,.48,760,360,.21,"grit"), (1.18,.60,147,140,.47,"metal")]),
}
# Noise-based swells can accompany score tempo and harmony changes.
BEDS = {
    "pressure-bed": [(.2,3.1,125,70,.28,"bed"), (4,3.8,90,70,.32,"bed")],
    "mutant-bed": [(.2,4,300,180,.28,"bed"), (4.32,3.4,210,120,.31,"bed"), (1.3,1.4,380,550,.10,"bed")],
    "fishing-bed": [(.11,3,580,780,.21,"bed"), (2.5,2.7,620,920,.25,"bed"), (5.14,2.6,850,1200,.28,"bed")],
    "last-life-bed": [(.1,3.75,160,83,.36,"bed"), (3.95,3.85,115,63,.39,"bed")],
    "boss-bed": [(.1,4.2,95,70,.37,"bed"), (3.6,4.2,310,96,.33,"bed")],
}


def render(duration, voices):
    output = [0.] * round(RATE * duration)
    rng = random.Random(16406)
    for onset, length, hz, end_hz, level, timbre in voices:
        offset = round(onset * RATE)
        filtered = 0.
        for i in range(round(length * RATE)):
            t = i / RATE
            u = t / length
            phase = math.tau * (hz * t + (end_hz - hz) * t * u / 2)
            noise = rng.uniform(-1, 1)
            cutoff = hz + (end_hz - hz) * u
            filtered += min(.5, math.tau * cutoff / RATE) * (noise - filtered)
            if timbre == "metal":
                tone = (.48 * math.sin(phase) + .32 * math.sin(2.41 * phase) * (1-u)
                        + .20 * math.sin(4.17 * phase) * (1-u)**2)
            elif timbre == "growl":
                tone = .55 * math.sin(phase) + .23 * math.sin(2 * phase) + .22 * filtered
            elif timbre == "grit":
                tone = .65 * (noise - filtered) + .35 * math.sin(phase)
            else:
                tone = 2.6 * filtered + .05 * math.sin(phase)
            envelope = math.sin(math.pi * u)**1.3 if timbre == "bed" else (
                min(1, t/.008, (length-t)/.035) * math.exp(-2.3*u))
            output[offset+i] += tone * envelope * level
    return [round(sample * 32767) for sample in output]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    out = ROOT / "audio/generated"
    out.mkdir(parents=True, exist_ok=True)
    index = {
        "version": 1, "source": str(Path(__file__).relative_to(ROOT)),
        "sourceSha256": sha(Path(__file__)), "format": "signed mono PCM16 LE",
        "sampleRateHz": RATE, "assets": {},
        "mix": {
            "status": "Pass 04 runtime handoff", "cueBus": "fxBus", "stemBus": "musicBus",
            "cueGain": .5, "stemGain": .3, "duckInheritedScoreMultiplier": .67,
            "cueMaxVoices": 3, "reservedWarningVoices": 1, "cueGlobalGapMs": 90,
            "sameCueCooldownMs": 750, "maxBedsIncludingCrossfade": 2,
            "crossfadeMs": 450, "stateDwellMs": 750,
            "stemPrecedence": ["last-life-bed", "boss-bed", "fishing-bed", "mutant-bed", "pressure-bed"],
        },
    }
    compositions = {**CUES, **{name: (None, 8, voices) for name, voices in BEDS.items()}}
    for name, (priority, duration, voices) in compositions.items():
        dest = out / f"mutation-{name}.wav"
        samples = render(duration, voices)
        peak = max(map(abs, samples))
        assert 0 < peak < 32767
        loop = [0, len(samples)] if name in BEDS else None
        if loop:
            assert not any(samples[:256]) and not any(samples[-256:])
        pcm = struct.pack(f"<{len(samples)}h", *samples)
        with wave.open(str(dest), "wb") as stream:
            stream.setparams((1, 2, RATE, len(samples), "NONE", "not compressed"))
            stream.writeframes(pcm)
        with wave.open(str(dest), "rb") as stream:
            assert (stream.getnchannels(), stream.getsampwidth(), stream.getframerate()) == (1, 2, RATE)
            assert stream.getnframes() == len(samples) and stream.readframes(len(samples)) == pcm
        index["assets"][name] = {
            "path": str(dest.relative_to(ROOT)), "sha256": sha(dest), "priority": priority,
            "durationMs": round(duration * 1000), "sampleCount": len(samples), "loopSamples": loop,
            "peak": round(peak/32768, 5),
            "rms": round(math.sqrt(sum(s*s for s in samples)/len(samples))/32768, 5),
        }
    (out / "mutation-audio-index.json").write_text(json.dumps(index, indent=2) + "\n")
    print(f"Verified {len(index['assets'])} PCM WAVs")


if __name__ == "__main__":
    main()

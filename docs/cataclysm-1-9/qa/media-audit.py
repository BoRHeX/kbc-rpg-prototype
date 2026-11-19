"""Verify shipped PNG descriptors and measure PCM WAV footprint."""
import hashlib
import json
import re
import struct
import wave
from pathlib import Path

root = Path(__file__).resolve().parent.parent
errors = set()
pngs = set()


def check(path, digest=None, size=None):
    path = root / path
    if not path.is_file():
        errors.add(f"missing {path.relative_to(root)}")
        return
    data = path.read_bytes()
    if digest and hashlib.sha256(data).hexdigest() != digest:
        errors.add(f"hash mismatch {path.relative_to(root)}")
    if path.suffix == ".png":
        pngs.add(path)
        if not data.startswith(b"\x89PNG\r\n\x1a\n") or (
            size and tuple(size) != struct.unpack(">II", data[16:24])
        ):
            errors.add(f"invalid PNG header/dimensions {path.relative_to(root)}")


def scan(node):
    if isinstance(node, list):
        for item in node:
            scan(item)
    elif isinstance(node, dict):
        path = node.get("path") or node.get("url")
        if isinstance(path, str) and path.endswith((".png", ".wav")):
            if "/" not in path or path.startswith("characters/"):
                path = "art/" + path
            check(path, node.get("sha256"), node.get("size"))
        for value in node.values():
            scan(value)


manifests = [root / "art/actor-packs.json", *root.glob("art/animated/*index.json"),
             *root.glob("audio/generated/*index.json"), root / "STUDIO/IMAGE_MANIFEST.json",
             root / "STUDIO/POLISH_MEDIA.json"]
for manifest in manifests:
    scan(json.loads(manifest.read_text()))

for source in [*root.glob("*.js"), root / "index.html", root / "game.css"]:
    for reference in re.findall(r"(?:\./)?(art/[\w./-]+\.png)(?=[?'\")\s])", source.read_text()):
        check(reference)

total_bytes = 0
native_pcm = 0
decoded_at_48k = 0
wavs = list(root.glob("audio/**/*.wav"))
for path in wavs:
    with wave.open(str(path)) as clip:
        total_bytes += path.stat().st_size
        native_pcm += clip.getnframes() * clip.getnchannels() * clip.getsampwidth()
        decoded_at_48k += round(clip.getnframes() * 48000 / clip.getframerate()) * clip.getnchannels() * 4

print(f"{len(pngs)} PNGs checked via literal references and {len(manifests)} manifests")
print(f"{len(wavs)} WAVs, {total_bytes} file bytes, {native_pcm} PCM bytes, "
      f"{decoded_at_48k} bytes if all decoded to float32 at 48 kHz")
for error in sorted(errors):
    print(error)
raise SystemExit(bool(errors))

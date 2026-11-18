"""Cut the three Pass 02 atlases. Requires Python 3 and libpng 1.6."""
import ctypes as c
import hashlib
import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "art/animated"

# Source windows and contact points were picked on the actual paintings.
# Contact points are world origin registration even for suspended poses.
ATLAS = {
    "mutant_pack_atlas": [
        ("mimic-stray", "tell", (0, 90, 342, 457), (187, 436)),
        ("bell-ringer", "idle", (342, 0, 694, 504), (495, 481)),
        ("roof-pouncer", "perch", (695, 35, 1024, 505), (902, 448)),
        ("mimic-stray", "open", (0, 574, 334, 988), (164, 920)),
        ("bell-ringer", "swing", (334, 510, 695, 1024), (496, 981)),
        ("roof-pouncer", "airborne", (695, 517, 1024, 1004), (907, 943)),
    ],
    "mutant_necromancy_atlas": [
        ("necro-groomer", "idle", (0, 18, 348, 511), (218, 489)),
        ("pack-leader", "idle", (348, 0, 689, 508), (523, 488)),
        ("feral-fish-thief", "prowl", (689, 125, 1024, 513), (840, 492)),
        ("necro-groomer", "cast", (0, 513, 345, 1024), (199, 910)),
        ("pack-leader", "charge", (345, 508, 693, 1024), (535, 988)),
        ("feral-fish-thief", "dash", (693, 541, 1024, 1024), (938, 907)),
    ],
    "evolved_night_boss_atlas": [
        ("mourning-bell-sovereign", "armored", (0, 0, 514, 512), (382, 482)),
        ("mourning-bell-sovereign", "shattered", (514, 0, 1024, 516), (890, 497)),
        ("patchwork-broodmother", "stitched", (0, 514, 510, 1024), (377, 978)),
        ("patchwork-broodmother", "reformed", (510, 516, 1024, 1024), (895, 981)),
    ],
}

# A null duration holds until gameplay changes state.
STATES = {
    "mimic-stray": {"disguise": [["inherit:ordinary-fish-pickup", None]],
                    "reveal": [["tell", 620], ["open", 330]], "lunge": [["open", 260]]},
    "bell-ringer": {"idle": [["idle", None]], "countdown": [["idle", 750], ["swing", 550]],
                    "strike": [["swing", 280]], "interrupted": [["idle", 300]]},
    "roof-pouncer": {"perch": [["perch", None]], "landing-warning": [[None, 900]],
                     "leap": [["airborne", 320]], "land": [["airborne", 400]]},
    "necro-groomer": {"idle": [["idle", None]], "ritual": [["idle", 400], ["cast", 800]],
                      "reanimate": [["cast", 380]], "interrupted": [["idle", 300]]},
    "pack-leader": {"idle": [["idle", None]], "rally": [["idle", 520], ["charge", 180]],
                    "charge": [["charge", 420]], "dispersal": [["idle", 260]]},
    "feral-fish-thief": {"prowl": [["prowl", None]], "snatch": [["prowl", 160], ["dash", 220]],
                         "escape": [["dash", None]]},
    "mourning-bell-sovereign": {"phase-one": [["armored", None]],
                                "transition": [["armored", 600], ["shattered", 600]],
                                "phase-two": [["shattered", None]]},
    "patchwork-broodmother": {"phase-one": [["stitched", None]],
                             "transition": [["stitched", 500], ["reformed", 700]],
                             "phase-two": [["reformed", None]]},
}


class PngImage(c.Structure):
    _fields_ = [
        ("opaque", c.c_void_p), ("version", c.c_uint), ("width", c.c_uint),
        ("height", c.c_uint), ("format", c.c_uint), ("flags", c.c_uint),
        ("entries", c.c_uint), ("error", c.c_uint), ("message", c.c_char * 64),
    ]


def read_rgba(path):
    png = c.CDLL("libpng16.so.16")
    png.png_image_begin_read_from_file.argtypes = [c.POINTER(PngImage), c.c_char_p]
    png.png_image_finish_read.argtypes = [
        c.POINTER(PngImage), c.c_void_p, c.c_void_p, c.c_int32, c.c_void_p,
    ]
    info = PngImage(version=1)
    if not png.png_image_begin_read_from_file(c.byref(info), bytes(path)):
        raise ValueError(info.message.decode())
    size = info.width, info.height
    info.format = 3  # PNG_FORMAT_RGBA
    pixels = (c.c_ubyte * (size[0] * size[1] * 4))()
    if not png.png_image_finish_read(c.byref(info), None, pixels, 0, None):
        raise ValueError(info.message.decode())
    return size, bytes(pixels)


def rgba_png(width, height, rows):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
            + chunk(b"sRGB", b"\x00")
            + chunk(b"IDAT", zlib.compress(b"".join(b"\x00" + row for row in rows), 9))
            + chunk(b"IEND", b""))


def cut(pixels, window):
    left, top, right, bottom = window
    # Downsample with alpha-weighted RGB. Suppress the lowest alpha haze
    # without filling real gaps, especially between the shattered bell shards.
    pad = 2
    factor = 3
    width = (right - left + factor - 1) // factor + 2 * pad
    height = (bottom - top + factor - 1) // factor + 2 * pad
    rows = [bytearray(width * 4) for _ in range(height)]
    for oy, y in enumerate(range(top, bottom, factor), pad):
        for ox, x in enumerate(range(left, right, factor), pad):
            alpha = 0
            rgb = [0, 0, 0]
            for sy in range(y, min(y + factor, bottom)):
                for sx in range(x, min(x + factor, right)):
                    offset = (sy * 1024 + sx) * 4
                    a = pixels[offset + 3]
                    if a < 28:
                        continue
                    alpha += a
                    for channel in range(3):
                        rgb[channel] += a * pixels[offset + channel]
            if alpha:
                rows[oy][ox * 4:ox * 4 + 4] = bytes(
                    [round(v / alpha) for v in rgb] + [round(alpha / (factor * factor))]
                )
    return width, height, rows, pad, factor


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    manifest_path = ROOT / "STUDIO/IMAGE_MANIFEST.json"
    source_manifest = manifest_path.read_bytes()
    assets = {entry["name"]: entry for entry in json.loads(source_manifest)["images"]}
    index = {
        "version": 1, "sourceManifest": "STUDIO/IMAGE_MANIFEST.json",
        "sourceManifestSha256": digest(source_manifest),
        "preparationScriptSha256": digest(Path(__file__).read_bytes()),
        "coordinates": "Top left origin, x right, y down. Draw relative to pivotPx.",
        "playback": "One shot, then hold last pose until gameplay changes state. null pose means telegraph VFX only.",
        "frames": {}, "actors": {},
    }
    OUT.mkdir(parents=True, exist_ok=True)
    for atlas, entries in ATLAS.items():
        asset = assets[atlas]
        path = ROOT / asset["path"]
        assert digest(path.read_bytes()) == asset["sha256"], path
        size, pixels = read_rgba(path)
        assert size == (1024, 1024)
        for actor, pose, window, foot in entries:
            width, height, rows, pad, factor = cut(pixels, window)
            filename = f"mutation-{actor}-{pose}.png"
            dest = OUT / filename
            dest.write_bytes(rgba_png(width, height, rows))
            decoded_size, decoded = read_rgba(dest)
            assert decoded_size == (width, height)
            assert max(decoded[3::4]) > 240 and min(decoded[3::4]) == 0
            assert not any(decoded[3:width * 4:4])
            assert not any(decoded[-width * 4 + 3::4])
            for y in range(height):
                assert not decoded[y * width * 4 + 3] and not decoded[(y + 1) * width * 4 - 1]
            anchor = [round(pad + (foot[i] - window[i]) / factor, 2) for i in range(2)]
            assert 0 < anchor[0] < width and 0 < anchor[1] < height
            index["frames"][f"{actor}.{pose}"] = {
                "path": f"art/animated/{filename}", "sha256": digest(dest.read_bytes()),
                "source": asset["path"], "sourceSha256": asset["sha256"],
                "sourceWindowXYXY": window, "sizePx": [width, height],
                "pivotPx": anchor, "footAnchorPx": anchor,
            }
    for actor, states in STATES.items():
        index["actors"][actor] = {
            "worldUnitsPerSpritePixel": 0.53 if actor in ("mourning-bell-sovereign", "patchwork-broodmother") else 0.44,
            "states": {},
        }
        for state, sequence in states.items():
            frames = []
            for pose, duration in sequence:
                key = f"{actor}.{pose}" if pose and not pose.startswith("inherit:") else pose
                assert not key or key.startswith("inherit:") or key in index["frames"]
                frames.append({"frame": key, "durationMs": duration})
            index["actors"][actor]["states"][state] = frames
    (OUT / "mutation-frame-index.json").write_text(json.dumps(index, indent=2) + "\n")
    print(f"Verified {len(index['frames'])} transparent frames for {len(STATES)} actors")


if __name__ == "__main__":
    main()

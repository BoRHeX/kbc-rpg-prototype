# Cataclysm 1.0 — LITE MOBILE illustrated character release

**Release scope:** Cataclysm protagonist textures/animation only. Version stays **1.0**.
The target is LITE runtime, MOBILE controls, and artist-quality raster art.
"Simple" describes neither the character nor its aesthetic.

## One production chain

1. Read the existing hero's first (96×96) idle sprite as a **single identity
   reference**, never treat a 24-frame atlas as 24 separate reference cats.
2. Make **one original painted image-model visual anchor**, not geometrically
   assembled code art. Keep white cat, two pistols, red/coral scarf and eyes.
   Independent vision must verify that the painted result matches the reference.
3. Ask the image animation model for six true sequential raster GIF motions:
   idle (6), run (8), attack (8), hit (6), feral (8), adrenaline (8).
   Every frame is painted before playback. All states preserve the anchor's
   identity and texturing. Run includes contact/down/passing/up alternating legs;
   attack includes anticipation, firing, recoil, recovery.
4. Convert GIF frames into compact 96px transparent RGBA atlases offline.
   This image conversion is **not artwork generation**. Never draw limbs
   with Pillow or polygons as a substitute for illustrator-produced poses.
5. Put textures and generated atlases in the existing `art/characters/hero/`
   data-driven renderer; the renderer only loads PNGs, selects frame indices,
   and uses Canvas drawImage. Keep the existing fallback and gameplay untouched.
6. Independent checks: original reference fidelity, texture quality, actual
   joint articulation, real game decoding, phone viewport, 4 MiB atlas budget,
   actual Canvas draw-time budget, campaign mechanics, and mirror consistency.
7. Open a source PR and publish automatically through the existing delivery
   workflow only if ALL gates pass; verify live bytes. Otherwise retain
   evidence, don't publish, don't claim a completed release.

**API budget:** at most one painted anchor image request and one animated GIF
request for each of six states; no continuous retries or scheduled generation.
Visual model calls for scouting and independent critiques are separate.

**Game contract:** preserve Cataclysm 1.0 gameplay, character IDs, enemy AI,
permanent squad, world, HUD, weapons and audio. Only the protagonist's authored
texture atlases and their declarative manifest may change at release. No
procedural per-frame character rig is introduced. Avoid claiming physical
Samsung device performance from Chromium mobile emulation.

# Character pack integrity — 13 November 2026

**Integrated locally; independent visual/browser acceptance is still pending. Do not publish this revision as QA-approved.** Production has not been deployed or changed by this work.

## Art and routing

`art/actor-packs.json` is the sole actor-family authority: 1 hero, 8 companions, 27 enemies. Every family is assigned before texture loading, becomes ready atomically, and never changes afterwards. `CATA_ART.packInfo(id)` returns a frozen `{id, family, ready}` snapshot. The start button waits for complete actor packs; load errors fail explicitly instead of drawing another identity.

The hero uses `hero-articulated-v1` exclusively. New animation is baked from isolated painted texture parts of the existing **single white-cat identity** in protected `art/characters/hero/aim.png`. This is a texture rig, not AI-generated new reference art. Hard polygon part mattes and shoulder/hip/head/tail pivots replace the retired full-pose waist crossfade. The source PNG remains unchanged. No procedural hero is painted at runtime. Each atlas cell is a complete assembled appearance, with one head, torso, two arms and two legs. See `bake-hero.py` for the texture segmentation, joint transforms, and offline assembly.

Ten sheets cover idle/blink, running, attack recoil, running fire, feral movement/fire, adrenaline movement/fire, hurt and recovery, at eight aim bearings. Starts ease gait timing; stops finish a short planted-foot settling movement. Hurt and recovery have local action clocks. Muzzle anchors follow the rig's directional weapons. All cells preserve the (48,58) pivot. Runtime damage does not redraw the hero.

The old `hero-*.png`, reference-state overrides, and `directed-*.png` remain on disk as source/history but are never requested by this loader. The unreachable `catSprite` procedural body and animation fallback body are removed. `drawAnatomy` was inspected: it adds cocoon/trait rings, tentacles, wings, hooks and howler details, not an alternative full cat. Existing nonhero gun accessories remain attached details.

Each companion keeps its existing painted run atlas and matching attack/special/hit textures in one family. In particular, engineer special frames are untouched. Enemies each keep their one existing run family. There are no mob/companion art remakes.

Version remains 1.0. Main remains Night 1 / Level 1. Lab remains `STRESS_MODE=true`, Night 99, with its existing Level 100 lab setup. Score, XP thresholds, combat constants, companions, turrets, scenery, cards, controls, dialogue and CSS were not edited. The charcoal bubble background and tail remain `#151c2899` with white text.

## Evidence that exists

- `contract-results.json`: Node VM loader tests, PNG dimensions/availability, source-rectangle bounds, all 36 actor selections, frozen pack snapshots, both-mode texture parity, 2,240 hero state/direction/time draw instants **per mode**, one full-body `drawImage` per instant, and no retired hero requests. **These are not browser results.**
- `mobile-sprites.png` and `mobile-sprites-10s.gif`: offline sprite-only raster panels at 390×844, four compass directions, multiple times and states. The nominal complete sprite rectangle is 61 pixels: `96 × 27/23 × 390/720`. These are PIL resamples, **not gameplay captures**. Enlarge only for diagnosis; inspect at native size for legibility.
- `sprite-evidence.json`: exact atlas paths, source rectangles, frame indices, times, and pixel differences including a separate lower-body region. At 0.1–0.2 seconds, run and both buffed firing cycles change hundreds of lower-body pixels at this size. A return to the same leg phase at 0.3 seconds is retained in the results, not excluded.
- `eight-bearings-enlarged.png`: isolated eight-way rig silhouette inspection. All 864 baked cells were also checked for opaque pixels touching atlas cell borders; none did.
- `review.html`: live browser canvas replay with pause, state selection, fire toggle, four compass directions, PNG export and exact active image/source traces. Serve the repository's `docs` directory and open `/cataclysm-1-0-major/qa/review.html` (or the lab equivalent); the page links to the playable game.

Hero textures occupy 6,487,332 compressed bytes / 31,850,496 decoded bytes. All selected actors together occupy approximately 10.80 MiB compressed / 46.20 MiB decoded RGBA. These are asset accounting figures, not device-memory measurements.

## What remains unverified

This environment denies server sockets and Chromium fails before creating a page (`crashpad_linux.cc`, socket operation not permitted). `browser-attempt.log` records the failed attempt. No eight-viewport browser regression, actual mobile screenshot/video, actual gameplay canvas trace, low-memory device result, or independent art approval is claimed. The original ten-second device video was described in the request but was not available as a file for direct comparison.

The offline panels address the reported frozen legs and behind-layer by separating articulated limb movement from the old baked crossfade and eliminating runtime repaint. They do not establish equivalence to actual on-device play, particularly the reported 6–9 second interval. That comparison remains an acceptance requirement.

Run from repository root in a browser-enabled environment:

```sh
node docs/cataclysm-1-0-major/qa/pack-integrity.cjs
node docs/cataclysm-1-0-major/qa/browser-integrity.cjs
```

The browser harness fulfills local files directly (no production deployment), covers both modes at 390×844, 844×390, 360×800, 800×360, 768×1024, 1024×768, 1280×720 and 1920×1080, traces isolated rendered raster frames and actual gameplay hero draws, saves screenshots and exact active source URLs, checks pixel changes through actions/buffs and uses 4× CPU throttling on mobile viewports. Throttling is not a substitute for testing on a low-memory phone. Manual animation review and that device test must pass before publication. The Night 100 eighteen-champion stress test is not required by this harness.

# CATACLYSM 1.1 — URGENT ART CORRECTION · USE THE ACTUAL ILLUSTRATED CAT
Creator-approved reference: `docs/cataclysm-1-1/art/references/hero-illustrated-pose-sheet.png`
Art bible: `docs/cataclysm-1-1/art/references/ART-DIRECTION.md`
Creator feedback: the previous procedural cat is a disaster. Its stick/tube legs, oval body and tail-top pistol must **no longer appear** as the displayed hero. The actual hand-illustrated pose sheet is already in the repo, with 11 poses. This is NOT a request to conceptually imitate its art: use the **real pixels**.

## THIS ONE RUN — MAKE THE ILLUSTRATED CAT APPEAR IN GAME

- Preserve the current playable Cataclysm 1.1 game, world, enemies, companions, upgrades, HUD and music.
- Replace **only the visible hero rendering** with actual illustrated poses extracted from the source PNG. Do not rewrite the world or combat code.
- Extract appropriate complete-cat regions for idle, walk, run/sprint, crouch, hurt, rage/feral, adrenaline if possible. The PNG has rows of 4, 4, 3 poses on a 1448x1086 image. Use Pillow to crop, matte-remove the warm near-white background with alpha feathering, normalize scale and anchor position. This is IMAGE PROCESSING and allowed. Retain original painted linework/colors/proportions; do not synthesize the character with rectangles, circles, polygons, straight-line paws, skeletal tubes, SVG paths or code-drawn fur. Never show the old generated geometric body underneath.
- If an extraction is imperfect, jank is allowed. A genuine illustrated cat with imperfect masking beats a smooth procedural imposter. Ensure the sprite silhouette isn't sliced or covered by background blocks.
- For this art pass, **NO tail** and **NO gun** on the character. Hide the current floating tail pistol and procedural tail visual, but preserve automatic projectile damage/game mechanics for now. Gun and tail can be independently redesigned later after approved body animation. Do not draw any replacement weapon or substitute humanoid arms.
- Use an actual image drawing call (`drawImage` or equivalent) in the game hero rendering path. A small illustrated sprite atlas based on the reference and an `hero-illustrated.js` helper are fine. Ensure the sprite assets load from the 1.1 folder, not from 1.0.
- Give at least idle, running and hurt visibly distinct illustrated frames; feral/rage and adrenaline can reuse existing source poses with tint/effect overlays if necessary. The moving hero needs to remain on four paws with a cute recognisable head, cyan eyes and pink ears. No eight-directional body atlas is required.
- User controls still movement only. Retain 1.1 version label. No changes to old 1.0 source or other games.

## FILE SCOPE
Edit only `docs/cataclysm-1-1/` (art assets, game.js, optional helper js and index.html). Do not change workflows, the uploaded source pose sheet, reference documentation, QA, other versions, secrets or unrelated repositories.

## PLAYABLE-FIRST QA
Load `http://127.0.0.1:8765/cataclysm-1-1/`; click Start, verify a nonblank arena, inspect the **actual illustrated cat** at runtime, move it with real input and confirm it remains playable. This studio's philosophy: janky animations and nonfatal glitches ship. A blank screen does not.

Don't spend this run designing new cat art. **The art has already been drawn and is in the repository. Use it.** No tail, no gun in this character correction.

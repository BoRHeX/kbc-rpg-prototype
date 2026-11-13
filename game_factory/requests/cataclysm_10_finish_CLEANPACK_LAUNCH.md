# Execute canonical character texture pass — Hero ghosting fix, 99% visual focus

User supplied a ten-second 1080×2340 Samsung gameplay video of Cataclysm 1.0 and observed what looks like **a second animation playing behind the main sprite**. The main character still seems to have ghost limbs or an outdated texture blended in. User says engineer's kneeling turret-deploy animation is proof that an expressive, clean animation is technically achievable.

Root-cause evidence verified in the actual current code:
- Three generations of hero art are loaded in `animation.js`: old 24-frame hero-*.png, modern character reference frames and the newer directed-*.png sprites.
- The old `game_factory/cataclysm_next/qa/reanimate_hero.py` created the directed atlases using a feathered per-pixel `Image.composite(moving, facing, mask)` across mismatched full-body poses. That may bake TWO partially overlapping bodies directly into the PNG even when there is only one active draw call.
- A damage state currently calls `drawImage` twice on the same character silhouette with brightness. This is a second full-body layer; replace it with single-pass treatment.
- A large unreachable old procedural hero-drawing function remains after the early return in `game.js`. Eliminate dead code cleanly; do not change the genuine enemy trait overlays or engineer's excellent animations.

**Read `game_factory/requests/cataclysm_10_finish_cleanpack.md` for the real brief.** 99% of work is restoring a single coherent animated HERO, 1% is preserving slightly more translucent bubble CSS (#151c2899 already updated in both modes). Do not add dialogue or change fish, companions, turret, gameplay, controls, XP, score, world, UI or version 1.0.

The studio has creative freedom to produce an original clean-textured hero rig/sprites, including proper gait, 8-way gun facing and animated buff states. One complete full-body authored frame per draw; **no soft blend of two unrelated complete bodies, no old/modern swapping, no overlaid duplicate hero**. The other characters should each have one selected visual family; no expensive mass enemy redraw. Preserve authored engineer special animations.

Independent tests will inspect actual drawImage calls and pixels in mobile Chrome, plus stable hero pack routing via CATA_ART.packInfo(id). They will reject old directed-* crossfades being active. They will verify both game modes including normal Night 1 / L1 and separate Night 99 lab. Protect currently deployed version unless QA and live verification pass. Generate real visual acceptance screenshots and inspect them as art, not just counters. Do not lower tests to get green.

Execute the one high-level studio assignment without iterative human approvals. Release only after passing browser QA.

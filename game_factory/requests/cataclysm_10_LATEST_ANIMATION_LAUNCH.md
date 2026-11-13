# Cataclysm 1.0 — Latest authored animations are the single visual source

Creator screenshot on 2026-11-13 revealed the main cat switching graphic styles. Root cause was verified in the live renderer: modern authored `art/characters/hero/{idle,run,attack,hit,feral,adrenaline,aim}.png` references coexisted with legacy `art/hero-*.png` and an explicit hero-action override selected the older sheets whenever the main cat fired, got hurt or activated feral/adrenaline. Idle also selected a static 8-direction aiming sheet instead of its dedicated latest animation.

The two game animation.js files now:
- Always select the current reference atlas for **each available hero action state**, including hit, attack, feral and adrenaline.
- Use the modern idle sequence while idle, not a single frame from the aim-only sheet.
- Stay within the modern hero atlas family if a different reference state is still downloading.
- Keep older enemy art and legacy character fallback files only where no new authored replacement exists; don't delete the sole working animations for non-updated enemies and companions.
- Preserve the 1.0 gameplay, XP 6/8/10, speech, all cards and controls, autonomous companions and infinite world.

Reconcile HTML script revisions and renderer art URLs across production and Night99 lab to prevent stale Android mixes, independently verify image source paths and actual frame changes in real mobile Chrome, then publish via protected PR/merge and verify live asset hashes. NO paid AI redesign or new raster asset generation is needed. Test real image selection; don't merely assert FPS counters or total loaded PNGs. The full final-boss stress test is not required.

# Reanimate Cataclysm 1.0 — actual eight-direction animated protagonist

Creator's live screenshot, 13 November 2026:
- Current hero faces and points guns in a fixed direction despite aiming and movement.
- Original latest hero art includes eight different compass aim poses, but only one single pose is ever selected per direction.
- The independent latest reference run animation is eight frames in one direction; merely switching sprites as before makes character visually regress.
- The top Fullscreen/Exit control intersects the HUD on Samsung portrait and the engineer's deployed turret looks like a small yellow U-shaped mark.

**Execute only the deterministic and art-preserving directional reanimation script** `game_factory/cataclysm_next/qa/reanimate_hero.py`. Build **all** 8 compass facings × all 8 real modern running poses, 8 × 6 idle, and 8 × 8 attack directly into complete standalone PNG atlases from the **current matching modern art**. Draw one self-contained frame each time (never splice old/new character art at runtime). Preserve modern separate feral, adrenaline, hit state art. Keep barrel targeting using the existing aim map. While moving and firing, show running gait rather than snapping to a stationary attack pose. Use real target direction, not movement direction.

Also keep Fullscreen/Exit and Pause above the HUD with Android safe-area inset support; preserve one-thumb controls and the existing pause Guide. Draw the companion engineer turret like a real rotating turret (no extra game objects or resource costs).

**No gameplay redesign.** Keep Cataclysm 1.0, Night1/L1, early fish XP 6/8/10, balanced silencing and shooting, latest speech bubbles, all cards, squads, score, infinite stationary map and all existing approved art. Do not run AI generation. New authored derivative pixels are mechanically built from the already approved modern source. Confirm actual *frame pixels* differ over time in all eight directions, verify no title/HUD overlap in safe-area emulation, release only after real browser tests and live deployment hash checks. No 18-major stress test.

Use the autonomous GitHub Actions pipeline that accompanies this request. Any failure must preserve current live version; do not publish unfinished sprites or conceal test failures.

# BoRHeZ art department: repair independently rejected motion

You are **not** starting a new artwork assignment. An autonomous, independent **multimodal art director just rejected your latest result**. You must repair it using evidence, regenerate the sprite atlases, and preserve the Cataclysm **1.0** version and everything outside the character-animation task.

Read, in this order:
1. `game_factory/art_department/jobs/active.json` and `game_factory/art_department/PRODUCTION_PROMPT.md`.
2. `artifacts/art-department/revision-brief.md` and `artifacts/art-department/visual-review.json` — the ACTUAL negative report, not your self-assessment.
3. `artifacts/art-department/mechanical-gate.json` — understand why numeric pixel gates incorrectly passed.
4. The real runtime frame sheets `artifacts/art-department/run-cycle.png` and `attack-cycle.png` (24 sequential actual browser renders each), `motion-render.png`, `actual-game.png`, `animation-contact.png` and `reference.png`.
5. The current implementation `docs/cataclysm-1-0-major/art/hero_generate.py` and `docs/cataclysm-1-0-major/animation.js`.

**Do not claim a repair unless the moving character now looks obviously different.** The failed run already passed hash differences, RGBA checks, 24 different PNG frames, alpha silhouette family counts, and all browser/integration tests, yet visibly looked like two mirrored poses. Do not solve the wrong problem again.

Make a MATERIAL, NOT COSMETIC correction. Prefer restructuring motion synthesis around explicitly authored key poses and anatomical pivots: feet that plant on the ground and truly move relative to hips, flexing knees, distinct leg extension at contact and passing, a rising/falling pelvis, non-symmetric elbows, articulated dual pistols with anticipation, alternating recoil and recovery. For run, deliberately craft >8 visibly distinct *large-scale* body silhouettes over two strides. Ensure 24 interpolated frames cycle smoothly. Build separate state-specific choreography, not variants of a shared `sin(t)` bob with different paint/glow. Do not use chromatic noise, artificial tips, accessory wiggles, or mirror flips to inflate the score. Preserve white cat, coral scarf, two pistols and readable feline head/ears/tail.

For pixel art, avoid soft downsizing; use deliberate clusters and contrasting shaded planes, crisp outline and readable scale on a real phone. For attack, change torso/arm silhouettes across anticipation, firing and recoil; a single shoot pose with brief muzzle flash is insufficient.

The only allowed edits: the job's `source_dir/art/<character>-<state>.png` atlases, its reproducible `allowed_generator`, and `source_dir/animation.js` when necessary. DO NOT modify job, workflow, review scripts, scoring, visual gate, or any unrelated game.

After edits, execute the generator and cheap local checks if possible. The enclosing workflow will mirror sprites, run mechanical tests and Chrome in a fully capable environment, then obtain a NEW independent visual critique. The previous verdict must not be replaced with your own assurance. If you cannot reach the quality bar, fail closed.

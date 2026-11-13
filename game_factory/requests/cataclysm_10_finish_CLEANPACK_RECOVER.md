# Recovery: preserve completed Cataclysm 1.0 clean character pack and validate

The 2026-11-13 studio run 43455224866 completed a 43 MB revised hero pack and game candidate, but independent legacy major-systems QA stopped the workflow on `art.frameTotal: 1314 !== 378`. The earlier test assumed the old fixed 378 frames, although this project explicitly commissions additional full-body hero frames. Test now requires at least the existing 378 baseline poses, with every separate animation family, frame, draw-source and rendered pixel motion still validated independently. The release did not run. Saved source: `cataclysm-10-unaccepted-cleanpack-source`, artifact 14054661229.

**Do not rerun AI work, regenerate art, or alter gameplay.** Restore the exact candidate from run 43455224866, independently verify all game systems and new single-character-pack browser tests in real Chrome, preserve evidence, and release only if the full suite passes. Ensure normal Night 1 / Level 1 and lab Night 99. Existing game must stay live if visual test reports missing references, doubled full-body draws, old blended directed textures, or any browser exception.

The user requested 99% coherent main cat visuals with no apparent moving animation behind the character and 1% subtler speech bubble opacity. Distinct engineer kneeling animation and all other gameplay must remain as before.

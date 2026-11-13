# Final publication of independently accepted Cataclysm 1.0 clean protagonist texture pack

The recovered 43MB artwork/JS candidate from original studio run 43455224866 passed all source integrity and independent mobile Chrome checks on recovery run **43461987349**. Its exact approved artifact is **cataclysm-10-finish-cleanpack** (14057091302).

Verified in two game modes: 8 live mobile/desktop viewports; infinite city; all painted character assets; dialogue, pause menu and cards; early XP, ranged and silence balance; a single authoritative hero-articulated-v1 visual family; exactly ONE full-body draw per actor; visibly changing pixels and source-frame rectangles for six hero states across four directions; no old blurred directed-* hero sheets or legacy hero fetch; 2 visually distinct engineer turret skins; Night100 one-boss smoke test.

Publication failed AFTER all independent acceptance checks: `git diff --cached --check` rejected trailing whitespace in temporary `docs/cataclysm-*/qa/browser-attempt.log` crash logs accidentally captured in the artifact. They are NOT part of the game or art. The final release workflow downloads the approved artifact, removes only QA logs/temporary pycache and generated local validation results, reruns source and Chrome QA, commits/merges only approved game source/art, deploys and verifies live assets.

No AI rerun, no changes to game balance. Keep version 1.0 and Night1/L1, separate Night99 lab; preserve 99% focus on main cat visual integrity and the minor translucent speech-bubble adjustment. If any genuine check fails, leave public release untouched.

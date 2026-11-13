# Resume the exact completed Cataclysm 1.0 tuned candidate, no second AI pass

Requested source revision: run 43418796816 saved its complete source as `cataclysm-10-unaccepted-tuning-source` (artifact 14032813110). All stages except the newly authored tuning browser check passed: real eight-viewport Chrome, infinite-map traversal, painted art load, source tests, scoring, and accepted 1.0 character assets.

**Original test failure was in the new test itself**, not gameplay: it tried to use `CATA_LAB_DIRECTOR.priceFor` after serializing a function out of page.evaluate. The test now computes its numeric price inside the browser.

An additional genuine animation UX issue remains in the preserved candidate: static directional hero aim atlas was still drawn for moving run state. A surgical selector patch now restricts it to idle/aim, allowing the true 24-frame `hero-run` painted atlas during locomotion. The *corrected* QA checks real hero and enemy frames, costly ranged/ghost spawning, 6/8/10 early XP, and readable translucent typed speech.

Download the saved source, apply the precisely scoped animation selector patch in both modes, run comprehensive browser regression including the tuning test, publish via PR→merge→Pages only if all pass. Preserve all original game/AI-written content and never regenerate art or repeat the expensive coding stage. No 18-boss stress test.

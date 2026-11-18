# LAUNCH — ONE Cataclysm Studio RUN: versions 1.7, 1.8 and 1.9, TEN passes
**Explicit creator order:** 18 November 2026 — "Do 1.7, 1.8 and 1.9 in one run but multiple passes, like 10 passes."
**Tracking:** https://github.com/BoRHeX/kbc-rpg-prototype/issues/99
**Work order:** game_factory/CATACLYSM_17_19_TEN_PASS_ORDER.md
**Executable studio:** .github/workflows/cataclysm-17-19-ten-pass.yml

Start ONE finite GitHub Actions workflow containing ten sequential department jobs and one publication job, with no repeated owner approvals:
01/02/03/04 — 1.7 THE LONG NIGHT: ten story chapters, thousand nights, versioned checkpoint save/resume and phone background integrity, original art/audio and QA.
05/06/07 — 1.8 DISTILLED ADVANCEMENT: inherited 1.7 source, ORIGINAL illustrated companion-fusion and weather art, new Level-3 fusion recipes, weather effects, seeded missions and save compatibility.
08/09/10 — 1.9 POLISH & GATING: inherited 1.8 source, original menu/codex/arena illustration, unified functional systems and **playable Threshold Trial**; independent regression and QA.
Final publication — recover three stage-frozen versions, honor actual browser and art evidence, publish three honestly labeled candidates in one PR/Pages deploy. Preserve all pre-1.7 history; no source changes to 1.69 or earlier.

The model may make grounded architectural choices within these constraints. No 2.0 feature implementation or 2.0 release is permitted by this trigger. Ten passes only: no more automatic work, no unbounded retries.

If image/coding/testing API errors occur, preserve all source and assets after each pass; label incomplete/unverified instead of fabricating playability. Previous playable 1.69 URL remains available. This experimental build experiment should run to the end without stop-for-polish handholding.

## Preflight recovery: corrected actual baseline recognition
The first attempt (GitHub run #44380459811) hit a controller preflight error: 1.69 is a historical predecessor but had not been admitted by the game-path guard. The version-preserving controller has been corrected in commit 83c6ec48e6baece343ab3ff8169edfaa6c34a84a. Restart the SAME authorized ten-stage project from the genuine 1.69 source, do not claim previous failed candidate output as working. Keep exactly ten production passes and one publisher in this new corrected run.

## Validated canonical directory correction for the actual single ten-pass run
All published Cataclysm versions use hyphenated directories. The 1.69 baseline is `docs/cataclysm-1-69`, NOT `docs/cataclysm-1.69`. The new versions must be `docs/cataclysm-1-7`, `docs/cataclysm-1-8` and `docs/cataclysm-1-9`, with matching `-candidate` folders. Both controller and browser runner and GitHub workflow have been corrected and cross-checked at latest main. Attempts #44380459811 and #44380690483 hit only initial wrong folder-path preflights; do not treat them as production implementations. Launch the corrected SINGLE ten-pass studio run from last actual 1.69 and preserve every stage as previously ordered. Do not start independent 1.7/1.8/1.9 workflows.

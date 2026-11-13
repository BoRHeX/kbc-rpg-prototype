# One bounded Cataclysm 1.0 hero rig recovery — 13 November 2026

Investigated finished Art Department run 43473753649 and reviewed its actual mobile game screenshot and 48px animated stride preview. This was not an infinite pending studio task: it finished and failed.

Root causes, not artistic theory:
1. Stage1 accepted actor manifest URL form `characters/hero/hero-ik-rig-v1/*.png` correctly matches the renderer's `art/` base; the rigged validation incorrectly demanded an extra `art/` prefix. Validator fixed.
2. Stage2 actually passed the basic runtime Chrome review, then a second test used bare `CATACLYSM_READY` in a poll before the property existed; fixed to use `window.CATACLYSM_READY` safely.
3. The sandboxed coding agent cannot run local Chrome (crashpad socket permission); the independent GitHub runner can. Stop making the coding sandbox attempt browser QA.

**Single bounded attempt**: reuse Stage1's preserved four-piece skin and source from artifact `rejected-art-stage1`, run the corrected art/source/gait unit tests, run Chrome tests in proper GitHub runner, then ask the independent visual reviewer to score actual leg motion at mobile scale. If leg motion is still 2/5, STOP. If >=4/5 and all tests pass, merge and deploy. No new art generation and no three-stage retry, no gameplay or XP edits. Preserve existing game until independently accepted.

The current screenshot shows a coherent white cat and twin guns, but limited visible foot travel. Do not invent approval.

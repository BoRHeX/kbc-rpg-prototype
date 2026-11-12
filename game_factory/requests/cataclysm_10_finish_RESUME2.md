# Cataclysm 1.0 finishing — resume accepted follower checkpoint and completed painted artwork

Authorized one-time recovery. Keep version 1.0. Do not re-run scoring or follower AI, both fully independently passed in production run 43317139783.

The second animation run 43319559952 successfully generated 24 real companion animation atlases, the painted hero 8-direction dual-pistol aim atlas and seven painted city textures, but failed a hardcoded OLD asset-version assertion in the independent test. New source / image-model art was not published.

Rehydrate all 32 complete painted PNGs from artifact `cataclysm-10-evidence-animation` belonging to run 43319559952 BEFORE any image-generation calls. Validate PNG signatures and dimensions. Skip generation of all previously accepted cached frames; generate only genuinely missing assets. Implement stage-3 code in isolated Codex sandbox, then reattach the authentic generated images and run independent QA. The stale QA literals have been replaced with validation of same release versions and real image frame advancement.

If stage3 succeeds, automatically continue presentation and balancing, then independent real browser tests. Release Cataclysm 1.0 only after passing all gates. On future failure keep complete unaccepted source and generated image assets accessible for targeted recovery. Neither legacy Cataclysm nor Flame Game nor other projects may change.

This commit intentionally triggers the dedicated finishing workflow. No schedule, no other changes.

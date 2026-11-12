# One-time recovery: Cataclysm 1.0 presentation → balancing → release

The original autonomous finishing production order is still authorized. Keep version 1.0.

Restore the accepted **animation** checkpoint from workflow run 43322025281, which already contains the successful scoring, follower AI, 24 companion action sprite sheets, eight painted hero dual-pistol direction poses, and seven environment textures. Do not rerun those stages.

The previous presentation pass in run 43322900711 materially updated the mobile UI, upgrade selection, world render and map layout and passed both eight-viewport browser gameplay and the Night 100 stress test. It failed the ART QA gate due a **real cache revision mismatch** between `animation.js` (stage3) and `visuals.js` (stage4). No release was published; the previous modified presentation candidate was not archived. Rebuild the required presentation stage from the saved animation checkpoint. The trusted runner now synchronizes animation.js, visuals.js and all local index.html script/style cache revisions on both playables after the AI integration but BEFORE source and browser QA.

Reimplement integrated stage4 world, upgrades, mobile interface and follower-ability status; then execute full independent QA, stage5 balancing and genuine unprotected final encounter, final acceptance and publication. Preserve full source artifact if any stage fails. No per-step approvals, no changes to other games, no version bump. Success only when the full release gate passes.

This file triggers only the dedicated existing finishing workflow.

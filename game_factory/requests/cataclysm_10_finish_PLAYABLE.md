# Release Cataclysm 1.0 — playable campaign, not final-horde stress validation

Creator instruction, 13 November 2026:
- Release the completed game now from campaign Night 1, starting XP level 1.
- Restore the complete preserved balance-stage code, textures, character animations, follower AI, audio, UI, scoring, static infinite world and all game mechanics from GitHub run **43338706087**.
- Do not discard or regenerate artwork, and do not pay for a new coding pass.
- Stop using the 18-major Night100 simulation as the release gate.
- For the isolated Night100 lab test only, spawn **one boss**, not nine.
- Prioritize actual launch, mobile performance, no runtime exceptions and a working play link.
- Keep product title/version Cataclysm 1.0. The 100-night full-campaign finale is not certified by this release.

Workflow should run recover_playable -> source checks -> browser smoke -> PR -> merge -> GitHub Pages deployment. If any basic play smoke check fails, retain evidence and stop without falsely claiming release.

# Launch — Cataclysm 1.0 compact on-device tuning pass

Creator's current findings (2026-11-13):
- Shooting enemies and silencing are too cheap for director; player is being overwhelmed at Night 9 with only L2 and low HP
- Early fish thresholds 10/13/16 total 39 are too punishing; make them 6/8/10 and transition smoothly
- White opaque speech bubbles obscure sight; dark translucent with white letters and quick type-on
- Zombies and hero visibly lost much of their earlier sprite-frame movement; repair actual render fallback and pose selection, not animation counter
- Large rusty mooring/bollard decorations in pavement look like physical obstacles but are not; remove or replace cleanly

Read and execute the complete corrective order: `game_factory/requests/cataclysm_10_finish_tuning.md`. This is ONE final creator-driven improvement pass on the successful, already published Living Cats 1.0. Do not redo cards, dialogue writing, companion behavior, controls, soundtrack or game world. Preserve all original painted character art and the current working 1.0 live release until real Chrome QA passes. Scope game + lab only; keep normal campaign Night1/L1.

Implement actual changes, show evidence, submit accepted only after test/Chrome checks. No full Night100 stress requirement, no unrelated work.

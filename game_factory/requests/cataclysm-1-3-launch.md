# CATACLYSM 1.3 — FELINE COMPANY
**Owner order:** Configure and RUN the existing BoRHeZ Games Studio, 14 November 2026.
**Tracking:** https://github.com/BoRHeX/kbc-rpg-prototype/issues/89
**Product:** ONE continuing Cataclysm game, current 1.2 → current authorized release 1.3 → future 1.4 → 2.0 THE CATACOMBS.
**Source:** Real current playable 1.2 at docs/cataclysm-1-2/. Do not initialize a blank game.
**Output:** docs/cataclysm-1-3/ and https://borhex.github.io/kbc-rpg-prototype/cataclysm-1-3/

This document is the owner-authorized single high-level job. Execute two bounded sequential studio departments: core systems/gameplay, then art/audio/integration/QA. No further approvals for individual minor changes. Preserve actual source, archive/historical versions, release invariants, original style and movement-only mobile play.

## 1.3 required mechanical changes
1. Keep the eight original unique companions and ADD eight further distinct roles, all working in combat/support: Angler, Scout, Alchemist, Salvager, Saboteur, Stormcaller, Courier, Hexcat. The original role list is Shooter, Healer, Tank, Brawler, Sniper, Engineer, Trapper, Bard.
2. Real autonomous behavior: individual AI states, forage, eat fish rather than funneling it all to player, follow, engage, protect, escape and contextual rest/recover/banter. Reduce fish from routine zombies; allow solo-cat XP still to progress.
3. Real role-specific companion Levels 1 to 3, earned by combat/work and fish, with identity-defining Level-3 evolutions rather than generic number upgrades. Respect maximum four active slots and unique companion roles.
4. **Engineer Level 3 + Shooter Level 3 = MECHA CREW** occupying exactly ONE squad slot. Engineer deploys/repairs; Shooter boards and fires; heat/downtime/ammo or comparable limits; visible, audible, animated, useful and balanced. No phantom duplicates, free companion exploit or reward duplication.
5. Special extra pair fusions (Angler+Trapper, Scout+Sniper, Bard+Stormcaller) if achievable after functional Mecha Crew. No manual squad commands.
6. Maintain full 1.2 game systems: nine lives, HP/revive, random cards (3/4/5), rerolls, all earlier cat roles, four-legged illustrated hero and tail gun, all inherited art/music/voices/bullets/hordes/waves/scores, solo viable build, mobile movement-only input, auto attacks, pause and restart.
7. Art/audio MUST progress. Illustrate the new companions using original art assets or honest texture-compatible methods, distinct state animations, especially feeding, evolution and fusion; preserve genuine preexisting illustrated hero. Generate distinct sound/banter and readable UI with companion level, roster, fish intake, fusion readiness and Mecha status. No invented claims that procedural drawings are hand-painted.
8. Lightweight runtime diagnostic or deterministic tests for roster, levels, fish bookkeeping, fusion slots, revival and restart. Do NOT add cloud logging or analytics. Existing 1.2 source must not be overwritten.
9. No world map, conventional fishing minigame, 2.0 hand weapons, new manual aura menus, or external microtransactions. Those belong to later versions or have been rejected.
10. Release at a NEW, stable versioned URL. Document exact implemented feature IDs, missing work, real tests, caveats, visuals/audio limitations and 1.4 handoff. No false feature-completion claims.

## Studio memory and implementation boundaries
Follow game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md, game_factory/CATACLYSM_MASTER_LEDGER.json, game_factory/CATACLYSM_STUDIO_CONSTITUTION.md, game_factory/studio_meetings/2026-11-14-roadmap-council/PROPOSED_ROADMAP.md and FULL_TRANSCRIPT.json, plus actual docs/cataclysm-1-2/STUDIO-REPORT.md. Latest owner request overrides speculative council mechanics. Distinguish 1.3 delivery from speculative 1.69/1.8/1.9 and later 2.0.

The owner accepts unusual rough, janky, haggard playable development releases. Never accept blank/start-failing screens or silent overwrites. QA is practical: source changes and browser load/playable tests in portrait and landscape. Physical Samsung/art quality acceptance belongs to owner. Publish a bounded candidate; do not automatically schedule 1.4 or future work.

## Workflow recovery authorization — same Cataclysm 1.3 order
The initial run 43621889022 failed because Codex Department B ran after Department A dropped sudo in the same GitHub Actions job. The creator requested a fix. Use the corrected two-job pipeline (fresh Ubuntu runner for each Codex invocation), archive Department A game output as a real source artifact, then continue Department B and existing mobile Chrome/PR/Pages gate. This restarts the SAME owner-authorized 1.3 milestone; no change to scope or separate 1.4 release. Prior unfinished code from the failed runner was not committed; reconstruct from the last merged 1.2 source. Preserve all prior versions and do not fabricate a successful game release.

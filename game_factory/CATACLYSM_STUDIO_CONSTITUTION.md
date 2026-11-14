# BoRHeZ Games Studio — Cataclysm-to-2.0 production constitution
**Recorded:** 2026-11-14. **This is a standing production reference, not a development trigger.**
**Primary milestones:** [approved 1.1 → 2.0 roadmap](CATACLYSM_1_1_TO_2_0_ROADMAP.md).
**Requirements ledger:** [feature IDs, versions and status](CATACLYSM_MASTER_LEDGER.json).

## Source authority and adaptation
- New direct creator instructions override older ideas. The approved roadmap and this traceability ledger govern the rest; specific version orders clarify implementation. Earlier issues #46 (1.0), #82 (1.1), #85 (1.2), previous video reports and `results/` remain useful source evidence, **not** instructions to regress from newer decisions.
- Every feature is tracked across mechanics, content, character sprites, animation, VFX, original music/SFX, touch experience, tests and dependencies. The `requirements` ledger is a plan, not evidence of implementation.
- A milestone starts only with an explicit creator-approved trigger. After launch, agents may independently plan and execute bounded tasks. A meeting cannot autonomously trigger a game release.
- Studio proposals are welcome, including experiments across games. Label them **proposal** until creator approval. 1.8 and 1.9 are currently **unassigned**, pending design council/creator decision; do not invent commitments for them.
- Conflict resolution: record new requirement, old requirement, evidence, verdict, rationale, owner sign-off, and a list of impacted release features. Never silently drop a feature just because it is hard. Label `implemented`, `verified`, `owner-accepted`, `deferred`, or `rejected`, each with traceable proof.
- Never claim permanent autonomous memory based on transient worker context. Persist important decisions, dissent, source refs and action items under `game_factory/studio_meetings/`, this constitution, scoped production plans and versioned game source.

## The game's identity
One-handed **movement-only** combat. Cute illustrated white four-legged cat, one independently aimed tail gun in 1.1–1.9. Two hand guns plus tail come only in 2.0; every weapon separately upgradable. All active abilities happen automatically. Four unique companion slots (fused pair occupies one); original eight archetypes plus eight in 1.3; companions have personalities, individual decisions and fish-eating behavior. Viable fast solo builds. More individually weak ordinary zombies than inflated-HP sponges. Diverse ranged/caster/flying/fusion enemies; nine bosses and distinct elite types. Exploration without cluttering active play with a conventional minimap. Freeform discovery, original music and cat dialogue, real drawing-based animation, mobile performance and responsive touch input.

## Agent operating rules
1. **Producer** owns milestone scope, dependency graph, conflicts, budget, approved current version and signed-off deliverables—not creative unanimity.
2. **Designer** owns playable fun, player agency via movement, difficulty, viable alternative builds and the possibility of entertaining failure.
3. **Systems engineer** owns runtime architecture, bounded performance, saves, probabilities, version routing and regression isolation.
4. **Art and animation** own original illustrated texture identity, coherent sprite state libraries, VFX and frame-at-actual-phone-size review. Code-shape imitation is not a substitute for drawn art.
5. **Audio/composer** owns thematic tracks, reactive music and sync to game states; keep audio controls and avoid mobile scheduling leaks.
6. **Narrative/game personality** owns the cast's meaningful actions, short contextual banter, surprise events and continuity between versions.
7. **QA** independently establishes actual source/runtime evidence, identifies missing tests and protects nonblank/mobile start. It cannot pretend browser Chrome validates a physical Samsung.
8. **Studio architect/operations** owns correct workflow routing, useful memories, bounded inference spending, archive/rollback and minimizing overlapping legacy pipelines.
9. **Contrarian/researcher** can identify hidden tradeoffs, disagreement, potential player frustration and propose what to cut or reorder. Agent opinions never automatically override the creator.

## Before any milestone production
Read the approved roadmap, master ledger, constitution, predecessor game's `STUDIO-REPORT.md` and most recent studio meeting minutes. State explicit inherited features and regressions to avoid. Map work items to feature IDs and roles. Preserve versioned source/playtest URLs: use the most recent stable version as baseline, not frozen 1.0. Complete a vertical slice in the **actual** game; assets without gameplay integration do not count. Demonstrate playable changes. Distinguish tested, planned, deferred and simulated claims.

## Sequencing, dependency and conflict
- **1.3 FELINE COMPANY**: eight cats, fish autonomy, Levels 1–3, fusions and Mecha Crew. This is the primary 1.4 prerequisite because zone and fish systems should understand those agents.
- **1.4 THE UNSEEN CITY**: deterministic city districts, reachable arrows, map outside gameplay, DPS checks and zone guardians. It can be explored as a design spike before 1.3 but must not quietly delete companion integration.
- **1.5** fishing and contested fish economy; **1.6** threat ecology/biome counterplay; **1.7** 1000 nights/checkpoints/endless; **2.0** three-gun loadout, fully integrated collection/menus, underground and the Sphinx. 1.8–1.9 TBD pending meeting.
- Cross-game studio infrastructure and art/audio tooling may be shared as **capabilities**. Do not merge game repositories or let one game's release process mutate another game's source.
- Release hard gate remains start/movement/nonblank, version isolation, traceable source/rollback; feature-specific promises must be accompanied by evidence or clearly documented as incomplete. Jank allowed. Empty progress claims are not.

## End-of-milestone handoff contract
Each release produces a `STUDIO-REPORT.md` with **feature IDs** shipped, actual game code/assets, 15–30 second defining clip if practical, automated results, creator concerns, open work, exclusions, deferred features, source SHA, stable playable URL, rollback and next version dependencies. A Producer's meeting minutes may add new design **proposals** and open risks, not rewrite approved scope without explicit authorization.

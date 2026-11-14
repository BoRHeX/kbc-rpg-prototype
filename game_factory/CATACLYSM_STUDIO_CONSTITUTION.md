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

## First open-floor studio meeting — 14 November 2026
The [actual 21-response roundtable](studio_meetings/2026-11-14-open-floor.md) and [attributed machine-readable transcript](studio_meetings/2026-11-14-open-floor.json) are durable **advisory** context for Cataclysm, Flame Game, Peach Bounce and studio infrastructure. Read these before any new version-production brief. This was a multi-call AI simulation of departmental opinions, not permanent agents gaining human experience or a user-approved change to scope.

**Observed positions, not binding creator decisions:**
- Most participating roles favored releasing 1.3 before full 1.4. The Contrarian argued for an isolated 1.4 seed-city/DPS design spike while 1.3's companion AI/fish/fusion systems are built; other roles accepted controlled exploration but objected to replacing the real 1.3 features with stubs.
- Recommended next vertical slice: one genuinely functioning 1.3 fused companion with fish autonomy, illustrated actions and original cue sounds interacting with a miniature seeded 1.4 district, kept out of production until tested.
- Other risks: overlapping legacy GitHub workflows, mutable historical published URLs, transitory model-agent context, lack of real companion behavior diagnostics, weak mobile-scale art acceptance.
- Shared capabilities worth studying (without merging game repos): Flame Game's animation integration, audio layering and QA; Peach Bounce's deterministic future-path visualization and touch ergonomics.
- A proposed centralized knowledge graph is **not approved** and may be overengineering versus audited Git-backed memory and a strict source-of-truth ledger. Demonstrate a concrete information-retrieval failure before commissioning a new service.
- The meeting's summary incorrectly called the sequencing view 'unanimous' while preserving the Contrarian's alternative; the direct role statements take precedence over a synthesized consensus claim.
- 1.8 and 1.9 remain unassigned; no new feature set was authorized. New cross-game and content ideas remain proposals.

**Future meeting quality rule:** give the independent critic and at least one game designer an explicit opportunity to propose alternatives unconstrained by the prevailing roadmap, then test those alternatives against real evidence instead of merely rewarding agreement. Avoid repeatedly spending API calls to restate what is already approved.

**Release-enforcement gap:** This charter is stored in Git, but existing older workflows do not all automatically ingest it. A future 1.3 or 1.4 studio workflow must explicitly load this charter, feature ledger, roadmap, predecessor report and latest meeting minutes into its coding/producer prompt, then report feature-ID handoffs. Do not claim cross-run memory is active unless those inputs are actually loaded.

## Creator correction: ONE GAME and EIGHT cumulative updates — 14 November 2026
The creator explicitly clarified: **Cataclysm is one continuously evolving game.** Version 0.1 through 1.0 were its original development; 1.0's major title is **THE CATASTROPHE**. Versions 1.1, 1.2 (current released candidate), 1.3, 1.4, 1.5, 1.6, **1.69**, 1.7, 1.8, 1.9 and final **2.0 THE CATACOMBS** are changes and cumulative improvements of the SAME game, not unrelated games or independent replacements. Versioned source URLs are regression snapshots of ONE product. Preserve all working mechanics and previously earned progression in future versions unless a later direct creator instruction changes them.

**Exactly eight intermediary updates after 1.2:** 1.3 → 1.4 → 1.5 → 1.6 → 1.69 → 1.7 → 1.8 → 1.9, followed by 2.0. The creator named 1.69 as a special update; the exact feature set is open for the upcoming council to propose. **Custom version sequencing is explicitly ordered, not conventional semver numeric sorting.** The details of 1.8 and 1.9 are also open design tasks; the prior roadmap contained no defined content for them.

Each intermediate release must propose and deliver **integrated mechanics, actual content, drawn art/animation, SFX/music, interface and touch refinements**, advancing the eventual 2.0. Do not confuse distinct playable URLs with different products. Prototype exploration may be parallel; public milestones maintain the creator's specified order unless the creator expressly changes it.

The [second roadmap council](studio_meetings/2026-11-14-roadmap-council/MEETING_REQUEST.md) is authorized to discuss, challenge and *propose* the detailed eight-update roadmap, including 1.69/1.8/1.9. It is not automatically allowed to delete agreed features or trigger production. Agents may communicate in code notation, symbolic/Chinese scripts or any language, and verbatim remarks must be preserved; the final briefing should also make practical decisions comprehensible in English.

## Second roadmap council: eight cumulative releases — 14 November 2026
A second [independent 14-agent, 29-response council](studio_meetings/2026-11-14-roadmap-council/FULL_TRANSCRIPT.md) examined the ENTIRE continuous Cataclysm development road, not only 1.3-versus-1.4 sequencing. Its [machine-readable verbatim transcript](studio_meetings/2026-11-14-roadmap-council/FULL_TRANSCRIPT.json) preserves every opening statement and reply, while the [eight-release integrated proposed plan](studio_meetings/2026-11-14-roadmap-council/PROPOSED_ROADMAP.md) describes per-version mechanics, content, illustration, animation, soundtrack, interface, QA and handoffs. The Producer synthesis was a real model response, not user approval of any uncommitted features.

**Continuity requirement:** Every future Cataclysm production brief (1.3→1.4→1.5→1.6→1.69→1.7→1.8→1.9→2.0) must read this producer proposal **as advisory**, alongside the creator-approved original roadmap and the master ledger. Do not confuse archival version URLs with new games; fork the immediately preceding playable Cataclysm build and bring forward its systems. Owner-approved items stay required; new ideas such as 1.69 festival/synergy, a new mystical cat, 1.8 moods/weather, and 1.9 pre-2.0 UI are merely proposed until accepted.

**Critical review before formal adoption:** 1.69's proposed pulse aura must not reintroduce the earlier rejected manual aura button, extra companions must not contradict the roster/cap accounting, and 1.9 must be more than an unplayable UI mockup. Preserve dissent and creative alternatives. Never present the Producer's `approval_status: approved` on an individual new detail as actual creator sign-off. No development launched by the meeting itself.

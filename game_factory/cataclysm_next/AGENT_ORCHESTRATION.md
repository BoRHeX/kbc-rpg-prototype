# Cataclysm major-production agent orchestra

This specification is **assigned work**, not a brainstorming request. Read `PRODUCTION_BRIEF.md`, `DECISIONS.md`, and `ACCEPTANCE.md` before making changes.

## Production sequence and ownership

| Gate | Responsible agent | Exclusive file ownership | Binding deliverable |
|---|---|---|---|
| 0 | Producer + Technical Director | `game_factory/cataclysm_next/architecture/` | Baseline inventory, module interfaces, requirement ledger R1–R7, budget/risk report, dependency DAG, scene render-contract diagram, migration plan. No changes to playable source. |
| 1 | Engine Architect | `docs/cataclysm-1-0-major/engine/` | Deterministic game state, 13s clock, fixed timestep, RNG seed, event bus, pause/resume, read-only diagnostics, persistence adapter, imports/build plan. Golden regression vs current 1.0. |
| 2A | Combat Director + AI Engineer | `docs/cataclysm-1-0-major/combat/` | 9/9/6/3 roster, 3 melee + 3 ranged + 3 kiting caster logic, attack scripts, fusion/traits, offscreen spawning, threat caps, boss/elite schedules and kill credits. |
| 2B | Economy/Build Engineer | `docs/cataclysm-1-0-major/progression/` | Offer pool, weighted choices, reroll tokens/drops, eight-companion roster with cap four, auto-cast validity policy, upgrades and victory rewards. |
| 2C | World/Navigation Engineer | `docs/cataclysm-1-0-major/world/` | Larger streamed map, buildings/dumpsters/parked cars, collisions/nav and biome dressing, deterministic chunk generator, no pop-in. |
| 3A | Character/Animation Director | `docs/cataclysm-1-0-major/animation/` | Articulated head/torso/arms/legs/tail rigs, 162 enemy + 96 squad + ≥120 hero required frame/state samples, visual output/clip registry. |
| 3B | Composer + Sound Designer | `docs/cataclysm-1-0-major/audio/` | Two new original compositions, expanded SFX, bounded WebAudio scheduler and audio event map; demonstrate musically distinct sections. |
| 3C | UI/Accessibility Engineer | `docs/cataclysm-1-0-major/ui/` | Responsive landscape/portrait HUD, vector icons, indicators, cooldown timelines and accessible touch controls, reroll UI. |
| 4 | Integrator | `docs/cataclysm-1-0-major/index.html`, `main.mjs`, `game.css`, `assets-manifest.json` | Assemble reviewed modules, preserve all working current 1.0 mechanics, integrate tests. NO unreviewed agent-origin rewrite of sibling modules. |
| 5 | Independent QA + Performance Engineer | `game_factory/cataclysm_next/qa/`, `tests/cataclysm_major/` | Execute acceptance matrix, capture artifacts, report missing features, test long-run performance and audio/animation outputs. No production-code edits. |
| 6 | Release Engineer | Accepted candidate only | Isolated playtest deploy, source hash receipt, live URL check, rollback branch/tag. Never overwrite stable 0.9 or current 1.0 preview without explicit release approval. |

## Agent behavior rules
- Every role gets a small bounded work order with precise inputs/outputs and hard max API spend. Do not launch several expensive generalist Codex jobs at once; parallelize **only** modules with frozen interfaces.
- The Producer coordinates scope and priorities but **cannot** vote R1–R7 out. The Critic challenges design and interfaces, not user requirements.
- Archive an issue comment/report per agent: changed files, requirement IDs, runnable demo, test output, estimated cost and remaining shortcomings. Independent QA must verify, not repeat claims.
- The existing game has global mutable state and must be preserved via a baseline adapter; agents should not directly edit `docs/cataclysm-1-0-preview/`.
- Use separate feature branches/PRs per subsystem. No concurrent edits to the same file. Merge via the Integrator after contract and tests pass.
- Do not let any agent generate/disclose secrets, private video/transcript text or external copyrighted art/audio.
- Store only public technical decisions and non-sensitive QA artifacts as reusable agent memory; avoid private reasoning dumps. Recover prior decisions from `architecture/` and issue comments.
- For optional improvements not in R1–R7, propose a separate issue; they must not displace required work.

## Frozen module interfaces before parallel work
- `Engine.step(dt, input)` advances simulation only while running, fixed deterministic clock, emits typed events. `Engine.snapshot()` returns immutable read-only serializable state. `Engine.restart(seed)` resets run.
- `World.getChunk(index,seed)` returns bounded scenery and collision data, culls off-camera chunks; `World.queryObstacles(aabb)` feeds physics/navigation.
- `Director.scheduleNight(n,seed)` returns exactly one event-ledger entry for each night 1..100 with a list of slots (`boss`, `elite`, `superElite`, `normal`) and threat budget; event IDs guarantee idempotent credits.
- `EnemyCatalog` exposes 9 normal, 9 boss, 6 elite, 3 superElite distinct archetype IDs and attack/telegraph definitions. `EnemyAI.update(e, snapshot, dt)` controls movement and casts; casters use kiting with explicit min/max preferred range and obstacle avoidance.
- `Progression.offer(snapshot,seed)` returns 3 unique valid choices; `Progression.reroll(tokenCount,offerSeed)` consumes one earned token, generates different choices and never changes game clock.
- `Abilities.shouldActivate(ability, snapshot)` and `Abilities.activate(ability, snapshot)` implement auto-cast with valid target/effect guard, cooldown and activity telemetry. No manual gameplay activation.
- `Animator.pose(archetypeId,state,frameIndex)` returns separately drawable head, torso, arms, legs, tail transforms; frame counts are manifest-driven and tested. `Animator.render(ctx,rig,pose)` remains visual, not a source of gameplay truth.
- `Audio.play(event)`, `Audio.setMusic(scene)`, `Audio.pause`, `Audio.resume`, `Audio.dispose`; uses WebAudio unlock on direct gesture, bounded node count, distinct original score IDs and event cues.
- `UI.render(snapshot)` has no authority to mutate game physics; user choices emit typed commands. HUD/buff timers derive exclusively from state.
- `Score.resolveVictory(snapshot)` returns 999999999 **only** after Night 100 clear plus required kill counters and player alive; does not allow victory from UI scripting or time alone.

These are interface targets. Architect must explicitly reconcile details with current code **before** specialist coding. Freeze interface revisions with a versioned decision record, not silent edits.

## Build gates
1. Architecture ADR and tests approved before parallel branches.
2. Each specialist PR passes syntax/contract tests, reports effects and cites R IDs.
3. The Integrator runs all systems in a locally playable game after every merge; existing 1.0 movement, sound, upgrades, shadow, squad and fusion regressions are blockers.
4. Full Night-100 simulation uses accelerated deterministic clock with actual enemy/upgrade/encounter code, not fabricated QA state.
5. Screenshot/animation-contact-sheet inspection, original-music listening review, Samsung touch evaluation and final creator gameplay review supplement automated tests.
6. Only reviewed/accepted source deploys. Keep candidate continuously playable but clearly labeled as development and preserve rollback. No schedule or nightly agent loops.

**Immediate next assignment:** Gate 0 architecture + resource plan; do not begin all five implementation passes in a single full-repo Codex run.

# ADR-0001 — First safe migration for Cataclysm major 1.0

**Status:** proposed for Gate1 implementation, not game implementation completed.

## Why the studio must refactor first
The current verified playable 1.0 has a 2,060-line `game.js` carrying global mutable `game`, `ctx`, audio and rendering state. Source-audited entry points:

| Legacy source line | Function / responsibility | New owner |
|---|---|---|
| 47 | `chunkAt` + terrain | World/Nav |
| 64 | `updateFoundation` biome/shadow/endgame | World for map; Campaign for clocks/endgame |
| 100 | `spawnFinalBoss` level-99 nine-crown loop | Combat/Campaign; migrate to Night100 semantics |
| 305–445 | `music` and `playSfx` | Audio |
| 477 | `start` game state/reset | Engine |
| 532–558 | `offerUpgrade`, `chooseUpgrade` | Progression/Economy |
| 644–760 | `spawnEnemy`, traits/fusion | Combat/AI |
| 873 | `companionSpecialAbilityActivate` | Auto-Ability/Progression |
| 1038 | `spawnBoss` | Combat/Campaign |
| 1292 | `tick` and mixed legacy night/wave/boss clocks | **Engine/Campaign priority** |
| 1448 | `updateHud` | UI |
| 1645 | `catSprite` | Art/Animation |
| 2019 | read-only diagnostics | Engine + QA |

Source: `docs/cataclysm-1-0-preview/game.js`; verified by the Gate0 source audit. Existing playable game must not be modified by this migration.

## Architecture decision
Keep the game in static GitHub Pages (Canvas + ES modules + WebAudio), no heavy framework or CDN requirement. Add **isolated pure modules** in `docs/cataclysm-1-0-major/`; only the Integrator owns `index.html`, `main.mjs` and top-level game orchestration. Never require all specialists to edit `game.js` simultaneously.

### Gate1 first refactor (single PR, one agent)
1. Clone exact 1.0 playable baseline to candidate directory; do not overwrite existing 0.9 or preview.
2. Implement **pure** `engine/night-clock.mjs` exported `getNight(t)`, `getEventSlots(n)`, `advanceClock(state,dt)`. Monotonic fixed-step simulation; no wall-clock/DOM use. `getNight(t)` clamps 1..100; freeze on paused/upgrade; Night100 begins at t=1287.
3. Implement `engine/campaign-ledger.mjs` typed IDs + `recordKill`, `recordSpawn`, `resolveVictory` with idempotent credits and a genuine 999999999 winner score only when alive and full thresholds met. The 9+9+9 interpretation is provisional and isolated behind this interface.
4. Implement deterministic `engine/random.mjs` for replayable simulation and wave tests; do not replace the baseline random/AI until subsequent integration.
5. Add `engine/tests/*.test.mjs` checking 13-second boundaries, 11 boss slots, 16 elite slots, five overlaps, nine distinct boss IDs, 9/9/9 credits, one-time winner score, repeat credits ignored, paused and upgrade state freeze, terminal failure stays below winner score.
6. Add minimal `engine/README.md` explaining how the Integrator later hooks these modules into `tick`, boss spawning and scoring; don't cut the current rendering/music/controls loose in Gate1.
7. QA must run Node module tests and existing full browser smoke against the cloned unmodified baseline. No public deployment until later phase; the architecture work is not a playable update.

### Simulation and interface details
- **Clock:** `night = clamp(floor(t/13)+1,1,100)`; use integer ticks or a bounded accumulator, avoid time drift and double-emitting events on tab suspension; prevent duplicate wave entries when dt skips a boundary.
- **Director:** stage slots by night, not wall time; normal/night9 boss and night6 elite slots can overlap. Special threat budget reserves independent IDs, so both events are acknowledged even if attack sequence is deferred for fairness.
- **Kill credits:** one type ID per enemy archetype and unique instance ID. Fusion, timeout, despawn, repeated hit handlers and boss revival must never award duplicate kills. Separate `bossCount`, `eliteCount`, `superEliteCount`.
- **Score:** displayed regular score remains normal until `resolveVictory` accepts true finale; then set exactly 999999999, persist once, display modal. No single toggled `won=true` in UI can bypass engine checks.
- **State:** `Engine.snapshot()` produces a serializable copy, not a mutable reference; visual and audio subsystems consume events and snapshots, not mutate simulation.

### Deferred work (must not be forgotten)
R1 audio, R2 full animation assets, R3 world geometry, R4 auto abilities + HUD, R5 upgraded choices/rerolls, R6 enemy roster and R7 fully playable 100-night campaign follow via the assigned specialist PRs. Gate1 pure clock/ledger tests **do not** satisfy those requirements on their own.

## Rollback
All work is isolated on `production/cataclysm-1-0-catastrophe-major-20261111`; existing `docs/cataclysm/` (0.9) and `docs/cataclysm-1-0-preview/` (1.0 playtest) must remain byte-identical. Any rejected candidate remains as source and QA evidence, never published under the stable URL.

# Repair Department 1 — Pass 06 current result

**PARTIAL experimental candidate; full browser acceptance remains BLOCKED on this runner.** This update supersedes the Pass 05 repair request below; that report is retained as prior evidence. Stable/default 1.3 is unchanged. No new artwork was generated: the three-image limit is already consumed. All original PNGs and derived sprite files are preserved.

Concrete repairs in `game.js` and `company-presentation.js`:

- **Unsafe guardian entry:** the integrated guardian previously spawned at the plaza center, including directly on the player. It now selects a collision-clear perimeter point, reachable from the plaza and more than 260 units from the player. Its existing warning and attack paintings remain in use. This fixes spawn contact risk; complete encounter balance remains unaccepted.
- **Frozen Kiln Mother gas:** the inherited ambient-gas unlock returned before processing guardian-created clouds during the first 240 seconds. Clouds now age, warn for one second, damage through inherited HP/life handling, and expire at their declared five-second lifetime. Random ambient gas still waits for its original unlock. This repairs an actual inert attack and indefinitely retained visual effect.
- **Hidden Mecha acting:** the new raster adapter suppressed the entire inherited overlay. The original machine painting now retains the inherited Engineer/Shooter cutout acting during build/boarding, assembly/repair tool cues, heat bar and event bubbles. The procedural fallback chassis only draws when the genuine machine strip is unavailable. These are reused crew poses with code-native tools, not newly painted assembly states or independent crew artwork.

Verification: `qa/runtime.cjs` passes the inherited nine-life/cards/16-role/fish/fusion/restart suite plus new production-function regressions for safe guardian placement, early gas warning/damage/expiration and crew rendering with the illustrated adapter in both motion modes. `STUDIO/qa-runtime-pass06.log` and `qa/runtime-results.json` hold results. The asset validator passes (`STUDIO/qa-assets-pass06.log`), including original image hashes. JavaScript syntax checks pass. Canvas doubles do not establish pixel composition or audio quality.

Chrome was retried with Chromium and installed Google Chrome. Both fail **before page creation** with crashpad `setsockopt: Operation not permitted` / SIGABRT. `STUDIO/qa-chrome-pass06.log` and `qa/chrome-evidence/failure.txt` preserve the latest attempt. Neither portrait nor landscape assertions execute here. The supplied independent Pass 05 `BROWSER_QA.json` records a successful basic start/nonblank smoke in both orientations; that evidence remains preserved, but does not imply the expanded survival/company/guardian smoke passed, or that these repairs received browser pixel acceptance. No physical Samsung test, listening approval or hardware performance claim is made.

The Chrome harness now checks guardian reaction distance and brings the perimeter spawn into view before auditing actual guardian image draws. On a browser-enabled runner run `CHROME_PATH=/opt/google/chrome/chrome node docs/cataclysm-1-4/qa/chrome-smoke.cjs`; it includes both 390×844 and 844×390. Review Mecha assembly/boarding and guardian gas visually and with sound before acceptance.

`EXTRA_PASS_REQUEST.json` is now `{"request":false}`. No automatic repeat is requested for the same missing-art list: four distinct guardian paintings, independent crew/build paintings and transparent city objects remain missing, and further image generation would exceed the approved cap. Other Pass 05 limitations below remain. This repair does not assert completion of all 1.4 promises or promote the candidate to stable. Source/deliverable hashes are in `PASS_06_MANIFEST.json`.

---

# Cataclysm 1.4 — final polish / independent QA

15 November 2026. **PARTIAL experimental candidate; browser acceptance BLOCKED.** This pass inspected the actual integrated runtime, predecessor source/report, concept, asset plans, original PNGs, derived sprites, audio records, integration report, roadmap, ledger and production policies. It made gameplay and visual source fixes. It did not publish, promote stable, change the default game, or modify 1.0–1.3. Only `docs/cataclysm-1-4/` is in scope. Stable/rollback remains `../cataclysm-1-3/` and its existing URL.

The full JavaScript game starts and renders through DOM/canvas doubles. **That is not a browser launch or pixel pass.** Both available browsers failed before page creation. No PLAYABLE/VERIFIED release label, fresh phone screenshots, hardware FPS, natural 100-night completion or physical Samsung verification is claimed. No game-start failure was established either: browser infrastructure prevented observing it. Existing copied screenshots/GIFs/reports under this directory are historical, not Pass 05 acceptance evidence.

## Source fixes delivered

- Gate kills now count only while the matching attempt is active. Survivors from failed attempts cannot prepay a retry; tagged actors cannot disappear into ordinary enemy fusion. Existing actual kill handling prevents repeated kill awards.
- Late gates require more weak enemies rather than inflated ordinary HP. First-attempt solo quotas: Level 1 needs 12 bodies at 2.03 HP; Level 85 needs 24 at 4.5 HP (108 total). The previous Level 85 formula needed 120 HP from 12-HP bodies, about 10 kills. Three spawns per second means the new late quota requires roughly eight spawn batches even with immediate kills. Retry easing, retreat, 12-second recovery and third-attempt survival relief remain. Courier still reduces quota. This is a targeted improvement, not an endgame balance certification.
- Provoked guardians survive distance retirement and cannot be consumed by enemy fusion. Previously retreat could leave the district marked awake after its sole guardian vanished permanently.
- Guardian pulse execution now selects the supplied attack painting briefly; Mecha near-overheat selects its smoke painting and repair selects its repair painting. Build/boarding still lack dedicated illustrations.
- Four districts now use different genuine ground crops (wet street, blue paving, asphalt, grey paving), clipped at district boundaries. These add visual orientation cues to the existing different obstacle footprints. Opaque, nonseamless crop limitations remain.
- District text sits above the companion ledger in portrait/landscape CSS; arrow distance labels are clamped inside the canvas and raised above the bottom ledger. Gate labels accurately say “horde HP.” Relief uses its delivered relief audio cue.

Changed runtime: `game.js`, `game.css`. Expanded deterministic tests: `qa/runtime.cjs`. Expanded future browser smoke: `qa/chrome-smoke.cjs` (start screenshot, actual image draw tracing, gate/guardian, paused map and restart). Test instrumentation is injected by the harness, not exposed to ordinary players.

## Feature status

“Implemented” below describes source and deterministic evidence; it does not imply phone or Chrome acceptance.

| Feature | Status and evidence | Limits / broken or missing behavior |
|---|---|---|
| Starting game / canvas | Implemented; complete shipped scripts/assets load; movement and draw calls pass runtime harness. | Actual start button, rendered pixels and touch are BLOCKED in browser. No new screenshots. |
| White quadruped / independent tail | Preserved; hero renderer and all 11 illustrated art files match 1.3 byte-for-byte. Tail muzzle/aim fixture passes in both facings. | Visual readability at actual phone size untested. |
| Nine lives, cards, solo, restart | Implemented; nine distinct deaths, revival retention/grace, terminal death/reset, 3/4/5 cards, reroll costs and solo perks pass. | No natural solo completion or browser interaction claim. |
| 16 companions / Mecha | Implemented; all 16 recruitment/level paths, eight new work paths, food conservation, four slots, component locks, revival, build/board/fire/heat/repair and reset pass. Company modules match 1.3. Illustrated Mecha strip is loaded/drawn in runtime source. | New-role bodies remain inherited aliases plus code costume overlays. Detailed boarding/build art and drawn gait missing; obstacle catch-up needs real travel playtest. |
| CAT-14-01 city | Implemented small finite 5360² city, four connected district templates, seeded prop positions and collision-backed frontiers. Same/different seed, clear spawn, finite boundary, locked/open passage tested. | Not the richer concept's canals/bridges/interactive city. All-seed flood-fill and squad travel loops not proven. |
| CAT-14-02 map | Partial: discovered 2×2 map in pause menu, seed-local discovery memory; active map-open rejected in fixture and pause parent hides on resume. No active minimap. | No title-screen/between-run map entry or spatial street map. Scout discovery persistence without later player entry is incomplete. |
| CAT-14-03 arrow | Implemented cardinal-grid routing against actual inflated solids; magnet/rage/beacon only, route-distance hint, waypoint direction, offscreen render condition. Fixtures exclude locked-away and expiring pickups. | 80-unit routing may fail local attachment or miss a narrow route; .8s cache, not exact continuous shortest path. Edge/HUD pixels unverified. |
| CAT-14-04 guardians | Partial: 12 local kills plus plaza entry provoke; four behavior branches, warning, attack/hit art, retention on retreat, no normal fusion. Provocation/defeat fixture passes. | One painted identity reused across four names. Full encounter dodgeability and all four attacks not browser tested. |
| CAT-14-05 rare life | Implemented eligible Terminus reward on seeds divisible by four; cap nine, once per seed, persistent plus session ledger. Repeat and restart farming fixtures pass. Old timed lottery disabled. | Storage deletion/unavailable storage across sessions defeats persistent history. Full lives spend eligibility without deferred reward. |
| CAT-14-06/07 gates | Implemented movement-only entry, 24s marked horde, quota/time, actual kill health credit, failure recovery/easier retries and third-attempt relief. Success/failure/retry/relief fixtures pass. | Spawn cap can delay pressure; offscreen retreat still advances the survival relief timer. Quota changes do not solve the whole campaign's late power curve. |
| CAT-14-08 city/art/audio/story | Partial: genuine raster city, guardian, Mecha references; four generated ambience loops and several event cues integrated with inherited mixer/music; short discovery banter. | No destructibles, working bridge/lever/locker states, weather simulation, complete story sequence, unique guardian paintings or listening approval. |
| CAT-14-09 company connection | Partial: Scout marks adjacency, Courier discounts quota, Angler work/economy and atomic eating retained. No composition lock on gates; Mecha remains one slot/two owned components. | Route planning/catch-up around all obstacles and natural fish fairness not phone tested. |
| CAT-14-10 mobile/performance | BLOCKED browser/hardware; runtime routing/reward regressions pass. | 390×844 and 844×390 checks never reached page creation. No representative 30 FPS proof, CPU/memory profile or Samsung test. |

## Art and audio inspection

Original references remain under `art/generated/`: `city_district_atlas.png`, `guardian_boss_atlas.png`, `mecha_and_companion_atlas.png`. Their source hashes match `IMAGE_MANIFEST.json` through the rerun asset validator. Pass 02 records real OpenAI Images API output; this pass made no generation calls. Original city/guardian imagery and the derived Mecha strip were visually inspected with the image viewer. The guardian is one rust-armored green-eyed feline with four poses; the Mecha contains integrated tiny crew paintings. The city atlas contains painted streets, roofs, waterfront and props. These are actual raster assets, not procedural substitutes.

Derived references: `art/animated/frame-index.json`, `guardian-frames.png`, `mecha-frames.png`, city crops and `preview.html`. Animation is four painted poses with translated variants, not eight separately painted poses or a limb rig. The runtime explicitly loads these strips and city crops; a browser `drawImage` audit is now scripted but remains unexecuted. Art validation proves file integrity/frame bounds, not final rendered composition.

Still missing: three distinct guardian identities (and complete per-boss state sets), independent Mecha crew/build/boarding art, bespoke illustrated bodies/state sheets for eight inherited 1.3 additions, transparent collision-matched city props and interaction states, seamless ground tiles, richer directional acting. Shop/waterfront/arch crops remain opaque rectangular surfaces stretched to obstacle bounds. This is **PARTIAL art, not ART-BLOCKED**: the three originals exist.

Audio: all 15 delivered WAVs validate as non-silent, unclipped PCM with declared durations; four loops have near-zero endpoints. Source routes ambience through the existing master bus and event cues through FX with a voice cap. Inherited soundtrack and synthesized role/Mecha cues remain. No second audio context was introduced. Not all delivered cues are used (e.g. route-found/guardian-intro); warning ducking, cancellation of pending event loads across restart, compressed mobile derivatives and fatigue/mix polish remain. **No listening, audible playback, browser decode or Samsung speaker test was possible.** Numeric waveform checks do not certify the mix.

## Tests actually run

| Invocation / inspection | Result / evidence |
|---|---|
| `node docs/cataclysm-1-4/qa/runtime.cjs` | PASS after final runtime edits. `qa-runtime-pass05.log`, `../qa/runtime-results.json`; real production functions under DOM/canvas doubles. Expanded attempt/retreat/fusion/map/arrow assertions also run. |
| Level 1 / Level 85 gate fixtures | PASS; `qa-balance-pass05.json`. Explicit synthetic state, not a natural build/playthrough. |
| `node --check` on all 15 index-loaded scripts | PASS; `qa-syntax-pass05.json`. Browser harness syntax also passes. |
| `python docs/cataclysm-1-4/STUDIO/tools/validate_assets.py` | PASS; `qa-assets-pass05.log`, `qa-pass03/asset-validation.json`. Original/derived hashes, PNG/frame/alpha data, 15 WAVs and endpoints. |
| Compare predecessor hero/company source and hero illustrations | PASS unchanged; `qa-inheritance-pass05.json`. No writes to 1.3. |
| `node docs/cataclysm-1-4/qa/chrome-smoke.cjs` | BLOCKED before page creation. Chromium crashpad `setsockopt: Operation not permitted`, SIGABRT; `qa-chrome-pass05.log`. |
| `CHROME_PATH=/opt/google/chrome/chrome node docs/cataclysm-1-4/qa/chrome-smoke.cjs` | BLOCKED before page creation for installed Google Chrome, same socket failure; `qa-google-chrome-pass05.log`. |
| Portrait / landscape, actual image pixels, touch, map screenshots, restart browser smoke | NOT EXECUTED; launch failure. `BROWSER_QA.json` records zero executed viewports. |
| Listening, hardware Samsung Chrome/Samsung Internet, sustained FPS, natural 100-night run, video | NOT TESTED; no claim inferred from desktop emulation, fixtures or old media. |

The expanded browser smoke should run in both orientations on a browser-enabled runner. Its fixtures alter state to expose fusion/guardian/gates quickly; they are not natural progression. A physical Samsung test must separately identify model, browser (Chrome versus Samsung Internet), orientation, sound, duration and performance. Neither browser was tested on physical Samsung here.

## Difficulty and handoff

The owner's 1.3 Night 100 / Level 85 / 9-of-9 completion is a valid warning about late pressure, not a representative balance study. This pass increased late gate body count while reducing individual HP, isolated retries and preserved weak-deck relief. Guardians can no longer silently vanish on retreat. It did not replay that completion, tune all nine campaign bosses or demonstrate that a high-damage multishot build now loses lives. Campaign endgame difficulty remains an open risk. Gates are finite, spawn-limited encounters: high damage can still trivialize each body.

A bounded art repair pass is justified in `EXTRA_PASS_REQUEST.json` by specific missing promised assets, not automatically by the existence of a running core. Preserve all three originals and derived assets. Retest Chrome after any repair on a runner permitting launch; inspect canvas/HUD/arrow/guardian tells and Mecha in both orientations. Next mechanics verification should cover real solo and squad gate clears/failures, four district return loops, 20–30s Mecha footage, audio with music on/off and natural late-build pressure. No infinite loop or stable promotion is requested.

For separately authorized **1.5 HOOK, LINE & CATNIP**, carry forward atomic fish consumption/eater credit, four slots, committed fusion components, deterministic city/collision routing, seed-local discovery and nonrepeatable life eligibility. Preserve movement-only controls. Fishing spots/bait/risks and contested fish economy are 1.5 work, not implemented here. Do not use this report to defer unresolved 1.4 art/browser checks invisibly into a claim of completed 1.5. Default/rollback stays 1.3 until owner acceptance. Source and diagnostics remain available even if later browser execution exposes breakage.

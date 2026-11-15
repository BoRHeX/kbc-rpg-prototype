# Cataclysm 1.4 — THE UNSEEN CITY — Pass 04

**PARTIAL experimental source candidate.** Actual JavaScript integration, 15 November 2026. Only `docs/cataclysm-1-4/` changed. Stable 1.3 is untouched. No deployment, stable promotion, physical Samsung check or successful browser launch is claimed. Prior copied reports describe historical versions and are not this pass's evidence.

## Running implementation

`game.js` now boots as 1.4 and owns a bounded 5360×5360 seeded city with four connected districts. Seed changes legal obstacle sockets independently of combat RNG. Cinder has compact cover, Sluice low horizontal islands, Ember tall furnace lanes, Terminus broad gaps. These are initial obstacle templates, not the complete concept's canal/bridge and interactive city simulation. Streets connect through four collision-backed gate throats; unlocking changes the same geometry used by movement and routing. Start is a clear central plaza. Discovery persists under a 1.4 seed-specific key, with storage failure tolerated.

Approaching a frontier beacon starts a 24-second marked horde DPS check. Defeating its tagged zombies credits their actual health budget; unrelated kills do not pass the check. Failure imposes 12 seconds of recovery and reduces the retry quota. Surviving the third attempt opens a relief route, so weak decks can progress. Retreat remains possible. Gates require no party composition, pads or companion count. Mecha stays one actor with two committed component identities. Scout marks a nearby adjacent district; Courier reduces gate quota by 10%. Angler and the atomic fish ledger remain inherited.

Twelve local kills plus entering the district's central plaza provoke its guardian. Bellkeeper rushes, Mother Dredge calls adds, Kiln Mother creates warned gas, Last Conductor fires radial shots. They have different encounter behavior and health, but **share the one supplied guardian illustration**. Four uniquely illustrated guardians remain missing. Guardians do not gate required city progress. A Terminus guardian on seeds divisible by four grants +1 life if below nine, once per seed; a full pool spends eligibility without a second reward. Persistent storage plus a session ledger prevents same-seed restart farming (clearing browser storage/new sessions without working storage cannot preserve history). The old automatic 180-second life lottery is disabled. Its legacy QA-only reward helper remains for inherited revival regression fixtures.

The arrow considers only magnet, rage and currently actionable beacon targets. An 80-unit cardinal navigation search uses inflated actual collision geometry, collision-tested player/target attachments, routed distance, lifetime filtering and visible waypoint direction. Cached geometry/edges avoid rebuilding searches every frame. It draws at the viewport edge only for offscreen targets and reports world units. Limitations: coarser than concept's 40-unit grid, no perfect continuous shortest-path claim, a player without a clear local grid attachment gets no arrow until moving clear. Recalculation is at most 1.25Hz on changed state; consumed/expired targets are suppressed immediately at render time. No active minimap exists. The discovered map is a two-by-two panel in the pause menu only.

## Real assets wired into canvas and mixer

Exact PNG loads in `game.js`:

- `art/animated/city-wet-street.png`
- `art/animated/city-shop-warm.png`
- `art/animated/city-waterfront.png`
- `art/animated/city-shop-neon.png`
- `art/animated/city-archway.png`
- `art/animated/guardian-frames.png`
- `art/animated/mecha-frames.png`

These are the Pass 03 crops of the genuine original PNGs recorded in `STUDIO/IMAGE_MANIFEST.json`; originals remain intact. Canvas draws the city crops as primary ground/obstacle surfaces, selects guardian poses from the strip and replaces the Mecha body/overlay with its illustrated strip after decoding. No new hero substitution. Opaque city crops are visibly rectangular and stretched; they are not transparent props or seamless tiles. Texture decode failure retains plainly temporary geometric obstacle fallback. Inherited enemy/cat role illustrations remain inherited. New unique guardian paintings, crew build/board art and transparent city objects remain incomplete.

District WAV ambience lazy-loads one district at a time through the existing audio context/master bus at low gain alongside the inherited soundtrack. Pass 03 gate/guardian/life WAV cues use the existing FX bus with eight-voice cap. Existing mute/volume applies; ambience stops on pause/restart/end and resumes through simulation. No second audio context. Audio is **not listened to or browser-certified**; warning ducking, full audio fatigue/mix polish and load cancellation/compressed streaming remain unfinished.

## Verification and handoff

- `node --check docs/cataclysm-1-4/game.js`: PASS.
- `node docs/cataclysm-1-4/qa/runtime.cjs`: results in `qa/runtime-results.json`. Full shipped scripts and PNG existence/dimensions run against DOM/canvas doubles. Covers inherited nine lives/revival/cards/rerolls, 16 roles, food accounting, Mecha slots/ownership/heat/restart, plus deterministic city seed variance, clear spawn, perimeter and gate collision, success/relief, routed magnet exclusion, guardian provocation/defeat and nonrepeatable reward.
- `node docs/cataclysm-1-4/qa/chrome-smoke.cjs`: BLOCKED, missing `playwright` dependency. Exact invocation output: `STUDIO/chrome-integration-attempt.log`. Portrait/landscape smoke source targets 1.4, but did not execute browser checks. Inherited screenshots and prior failure files are not new evidence.

Pass 05 should install/use available Chrome tooling, inspect both phone orientations and actual generated crop composition, test all district loops with squad catch-up, inspect gate horde crowding and guardian tells, listen to ambience/SFX, and stress late-game builds. This pass provides real gameplay source; it does not claim completion of the full concept's lockers, bridges, destructibles, authored story sequence, four painted guardian identities, natural 100-night balance, mobile performance or owner acceptance. No external publication was attempted under this directory-only assignment.

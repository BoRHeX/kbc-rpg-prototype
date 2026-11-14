# Cataclysm 1.3 — FELINE COMPANY

Department A candidate, 14 November 2026. One continuing Cataclysm game copied from the actual 1.2 release. Owner issue #89. Only this version directory is writable. Studio workflows, roadmap and every previous release remain unchanged. The broader two-job pipeline recovery is outside this directory-only Department A assignment; this artifact is its source input, not proof that the pipeline or Pages ran.

## Responsibilities and sequence

1. **Producer:** own scope and CAT-13 ledger below; protect inherited nine lives, cards/rerolls, quadruped hero/tail gun, solo build, hordes, audio, pause/restart and movement-only combat. Distinguish systems verification from artistic acceptance and publication.
2. **Gameplay:** retain all eight established specialties; author eight actual ranged/support roles, individual appetites, contextual decisions, role evolutions and balanced Mecha downtime. Original Brawler stays melee only. No manual combat input added.
3. **Systems:** own `company.js` accounting/progression contract and `game.js` integration, unique committed roles, four active slots, atomic consumption, component ownership, local diagnostics and bounded arrays. Simulation timers pause with the run. No network telemetry.
4. **Art/audio — Department B, sequential handoff:** replace the explicitly reused textures with distinct companion illustrations, improve feed/evolution/fusion acting, compose distinct role sounds and finish readable phone UI. Preserve inherited assets/music and genuine illustrated hero. Existing code overlays are procedural; do not call them hand-painted. Hooks below are functional, optional presentation extensions.
5. **Integrator:** consume this real source artifact in the fresh Department B runner, keep build version and local script order coherent, integrate presentation without changing accounting, collect source hashes and stable versioned URL evidence.
6. **QA:** independently run deterministic runtime checks, Chrome portrait/landscape smoke and gameplay recording, then owner phone/art acceptance. Do not equate canvas test doubles with browser pixels or claim Samsung FPS. Reject start failures; report nonfatal jank honestly.

## Feature ledger

| ID | Department A delivery / status | Department B / release evidence still needed |
| --- | --- | --- |
| CAT-13-01 | Implemented: 16 recruitable unique roles, eight new distinct work functions and ranged sidearms | Balance/readability playtest |
| CAT-13-02 | Partial: real combat/support, new authored text, role labels; inherited illustrated textures reused through explicit aliases | Distinct illustrated sprites, role sounds and animation art |
| CAT-13-03 | Implemented core: follow, attack, protect, escape, forage, feeding, rest; inherited prepare/recover/interruption and contextual banter | Mobile behavior/acting review |
| CAT-13-04 | Implemented: food atomically leaves ground, credits eater only; ordinary drops .65 → .22; ordinary kills grant .55 × XP multiplier independently | Extended solo/squad economy balance |
| CAT-13-05 | Implemented: per-cat work thresholds 24 / 75 for Levels 2 / 3, food +6 work per value; distinct Level-3 effects | Evolution art and longer pacing review |
| CAT-13-06 | Implemented: two committed component cats become one actor/slot; cannot recruit either component; permanent until restart | Visual fusion readability |
| CAT-13-07 | Implemented: build 2s, board 1s, piercing fire .18s, +13 heat/shot, cooling 4/s, overheat ≥100, repair 6s then reboard | Proper illustrated boarding/repair, original Mecha audio |
| CAT-13-08 | Deferred optional: Trawl Team, Spotter Pair, Thunder Chorus | No claim these pairs fuse |
| CAT-13-09 | Implemented: distance-based catch-up speed up to 3×, Courier faster; no new teleport or player cap | Obstacle/catch-up phone review |
| CAT-13-10 | Partial: authored banter, inherited SFX, snack motion, labels, rough animated Mecha heat frame, event/draw hooks | Distinct art/music/SFX production |
| CAT-13-11 | Deterministic integration PASS: inherited survival and new roster/levels/food/fusion/heat/restart tests | Browser start/touch/pixels and physical owner review pending |

## Implemented identities and Level 3

All except Brawler have effective ranged attacks. Eight original specialties remain in their original state machine. Work comes from original committed casts (+2), new successful work (+3), food (+6 per fish value), and repeated training cards (+8). Levels are individual and capped at 3, separate from inherited investment rank.

| Role | Actual support / Level-3 evolution |
| --- | --- |
| Shooter | Six-round reload role; Level 3 adds piercing second volley |
| Healer | Stationary treatment; Level 3 also heals slowly while moving |
| Tank | Guard; Level 3 committed action grants .8s sanctuary |
| Brawler | Melee lunge; Level 3 cleaves adjacent enemies |
| Sniper | Prepared long-range shot; Level 3 adds six-body piercing shot |
| Engineer | Turret builder; Level 3 doubles ordinary turret lifetime; eligible Mecha component |
| Trapper | Snares; Level 3 larger, twice-lasting ordinary nets |
| Bard | Anthem; Level 3 heals on committed anthem |
| Angler | Autonomous safe-period catch every 18s; Level 3 catches two fish; no fishing minigame |
| Scout | Marks targets to amplify received bullet damage; Level 3 longer marks and larger field |
| Alchemist | Spends energy, replenished by eating/rest, to slow enemies and heal; Level 3 larger, stronger cloud |
| Salvager | Recycles every five additional weighted kills into timed turret; Level 3 doubles turret life |
| Saboteur | Stuns local enemies and clears nearby hostile bullets; Level 3 wider, longer blackout |
| Stormcaller | Hits/stuns up to three close targets; Level 3 chains to seven in larger radius |
| Courier | Faster movement, eats nearby fish on behalf of hungriest other ally; Level 3 delivers two caches per action |
| Hexcat | Marks/slows and directly curses elites with stronger damage; Level 3 larger elite curse |

Angler catch is an explicit accounted food source, without a fishing location/bait UI. Salvager uses combat scrap represented by weighted kills, not newly destructible scenery. Saboteur stun/bullet removal is the effective interruption; existing enemy classes do not all use the same cooldown field. These are bounded first-pass behaviors, not future city/fishing systems.

## Department B integration contract

- Load `company.js` before `game.js`. `CATA_COMPANY.identities[role]` supplies inherited texture alias and evolution description; preserve alias fallback until new art is ready.
- Optional `globalThis.CATA_COMPANY_PRESENTATION.event(payload)` receives `{role,event,x,y,level}` for work, feed, evolve, boarding, firing, breakdown and repaired transitions. Optional `.draw(ctx,pet,simulationTime)` runs in world coordinates before the sprite. Balance your canvas save/restore calls.
- `pet.type`, `level`, `work`, `food`, `energy`, `state`, `phase`, `forage.eating`, `companyEvent`, `eventUntil`, `mechaStage`, `mechaClock`, `heat`, `components` are real runtime state. Never create separate reward-producing Engineer/Shooter actors when drawing Mecha crew.
- `CATACLYSM_DIAGNOSTICS.snapshot().company` reports roster, component roles, slot count and food equation `spawned − player − eaten − onGround`. Expected zero. This ledger counts physical fish, excluding inherited scripted victory currency and QA seed currency.
- Use `?qa=company`, `CATA_13_QA.start()`, `.recruit(role)`, `.work(role,n)`, `.meal(role,value)`, `.tick(seconds)`, `.diagnostics()` for explicit local fixtures. Normal mode exposes no mutation helpers. Recruit Engineer/Shooter, give each 75 work, then tick to witness automatic fusion. Food helper deliberately spawns accounted fixture food.
- Keep optional fusion pairs deferred unless core Mecha remains verified. No three guns, world map, manual squad commands, fishing minigame, cloud logging or future work scheduling.

# Cataclysm 1.7 · The Long Night

Pass 02 implements the campaign inside the inherited Canvas game. The source is an integration build awaiting browser acceptance. Changes are confined to docs/cataclysm-1-7/.

## Delivered

- Ten contiguous 100-night chapters. Chapter themes change the HUD, street tint, music arrangement and pressure schedule. The schedules combine existing mutant families, timed hazards, elite releases and fusion opportunities. Chapter bosses use named attack patterns, with additional attack changes for the Switchyard Hybrid and Blackout Warden. Ordinary nights can advance with enemies alive. Milestones hold until the required encounter is defeated and the cat is alive.
- Night 100 advances to 101 after the Bell Captain falls. The old Night 100 victory path is disconnected from the production loop. Nights 971–1000 add emergency avenue firestorm effects and rotating marked hazards. Night 1000 requires two one-second light holds, three sequential escorts and the two-phase Catastrophe. Chapter rewards and the 10,000-point finale credit are recorded with progression.
- The title offers checkpoint resume and a new campaign. Starting over from a resumable checkpoint asks before replacing it. A committed completion receipt enables opt-in Endless with a fresh build and nine lives. Endless cycles the ten themes, increases the director budget by 5% per full cycle up to 50%, and records its best night separately.
- Checkpoints use the Pass 01 v1 envelope. Start, chapter boundaries, terminal outcomes and safe background transitions write to alternating slots. Pause and backgrounding freeze gameplay, including revival and fishing. Restoration preserves player stats, equipment, upgrades and offered choices, lives, XP, fish accounting, fishing casts and outcomes, the sixteen-role squad and Mecha components, seeded city state, mutation and corpse links, active Wild Card state, projectiles, hazards, director economy and pending releases. Combat, offers, director, dialogue, chapter and fishing RNG state survive a reload. Presentation caches, transient effects, audio nodes and input are rebuilt or cleared.
- CRC32 over canonical JSON detects corruption. The reader selects the highest valid revision, and the writer reads back the new slot before acknowledging it. A quota failure leaves the previous valid slot available. Newer recognized schemas are protected, and Web Locks provide a single writer where available. The fallback asks the player to confirm single-tab saving and checks for stale revisions. Legacy city discovery and seed warranty migrate into the run/profile transaction. Historical audio settings and best score are still read. A 1.69 Night 100 win supplies no campaign receipt.

## Pacing and bounds

The fixed step is 1/60 second. A 630-step floor gives 10.5 seconds per night and 2h55m of base combat, compared with 3h36m40s at 13 seconds. Pass 01 budgets 90 seconds for nine chapter bosses, 45 for the finale and 165 for decisions and transitions, giving a three-hour target. Overtime and upgrade decisions are tracked separately. Ordinary admissions halve after 30 seconds of milestone overtime and stop after 60 seconds, with 45/90 seconds in the finale and one HP reduction for an overdue story enemy. Actual completion time depends on the build, boss fights and decisions.

The live engine retains ceilings of 140 enemies, 160 friendly shots, 180 fish stacks, 48 powerups, 16 reroll drops, 10 mutation corpses and 280 particles. Optional director releases queue up to 24. Distant optional major actors can withdraw without kill credit. Each journal slot is limited to 524,288 serialized characters. The seed history shares that limit, so an oversized save is reported and the preceding valid slot remains usable.

## Repeatable checks

```sh
node docs/cataclysm-1-7/qa/long-night-fixtures.cjs
node docs/cataclysm-1-7/qa/long-night-browser.cjs
```

The Node fixture runs the shipped modules on a DOM and Canvas test double. It passed the 629/630-step boundary, a committed fishing cast after reload, Mecha and upgrade restoration, a linked corpse and gate, revival, seed-26 festival dwell and a matching 120-tick continuation. It traversed all 1,000 consecutive boundaries using accelerated clocks and scripted boss damage, exercised the final lights and escorts, verified a revival delays completion, then reloaded the completion receipt and started Endless. It also checked legacy migration, corrupt-slot recovery, simulated quota and newer-schema protection. This is segmented campaign evidence. It does not measure player difficulty or frame rate.

The browser fixture targets 390×844 and 844×390 and requires Playwright and Chrome. Playwright was unavailable on the Pass 02 runner. Direct Chrome startup aborted before navigation with `sandbox_host_linux.cc:41` and `shutdown: Operation not permitted`. No Pass 02 browser screenshots, real Samsung testing, uninterrupted three-hour run or 30-minute endurance result were produced.

## Remaining for Passes 03 and 04

Pass 02 uses inherited visual and audio assets plus chapter tint, text, hazard outlines and synthesized arrangement changes. Pass 03 owns original PNG and WAV production and integration. The pressure schedules share existing AI and hazards, with chapter-specific parameters and enemy mixes. The full bespoke per-chapter choreography in the concept, including dedicated crane-lane boss animation and hand-authored corpse clusters, remains deferred. Current adapter identities for non-enemy actor arrays use snapshot order and companion devices live in member state. The full malformed-save matrix, multi-tab browser ownership, worst-case checkpoint size, full-run balance and device performance remain unverified.

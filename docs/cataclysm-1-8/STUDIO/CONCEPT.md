# Cataclysm 1.8 · Distilled Advancement

Pass 05 inherits the frozen Pass 04 runtime. The ten-pass owner order authorizes the 1.8 council proposal. The design keeps the 1.7 campaign, movement-only combat and four-slot squad. Pass 06 owns gameplay integration. Engineer + Shooter → Mecha Crew is the sole implemented companion pair. The Wild Card mutant combination is a separate system.

## Two launch recipes

| Pair | Readable silhouette | Automatic behavior and balance target |
| --- | --- | --- |
| Angler + Trapper → **Trawl Team** | Two cats under a tall net frame, with a low loaded stance and an overhead casting pose | Every 9 active seconds at most, cast a net toward a reachable cluster. Hold up to four ordinary enemies for 1.4 seconds, with reduced slow on elites and no boss root. Rain adds 0.4 seconds to the hold. During the Rain Cache mission the net gives the player a safe retrieval window. Use one bounded net and no passive fish spawn. |
| Scout + Sniper → **Spotter Pair** | Upright periscope with Scout above and Sniper low at the barrel | Every 7 active seconds at most, telegraph one exposed priority target for 0.45 seconds and take one piercing shot if line of sight still holds. The mark amplifies the next allied hit by 20% for up to 2 seconds and is consumed by that hit. Fog shortens acquisition for the whole squad. Spotter regains part of that range via the periscope. |
| Bard + Stormcaller → **Thunder Chorus** | Stretch design for an illustrated two-cat instrument rig | One telegraphed pulse on a shared cooldown, with up to three short chains in storm. Omit from the launch recipe list unless behavior and original art are integrated and tested. The delivered sheets contain two fusion teams. |

Use the ready pose while following and the action pose on a confirmed net cast or shot release. Keep the shared bottom-center pivot and mirror the whole crew to aim left. Cooldown and wind-up are readable through pose timing and the existing field effects. The launch recipes replace the parents' attacks and specials with a single behavior budget per team.

## Slot and economy contract

- Offer a voluntary merge in the existing paused upgrade interface for two active, unfused parents at Level 3 (75 work each in the inherited Company progression). Recheck eligibility at commit. At four active slots, merging leaves three and frees one for recruitment. Existing automatic Mecha behavior stays compatible.
- Remove both parent actors and place a single team actor in one atomic squad mutation. Retain two flat parent records with distinct role identity, rank, exact work, food and energy. The team wrapper owns presentation and timers. Effective committed roles include the parents for offer filters, recruit guards and checkpoint validation. Cancel owned traps, targets and reservations during the transition. Never replay a special or rank-up on restore.
- Offer separation only in the paused upgrade interface with one free slot and a safe placement for both parents. A failed check changes nothing. Restore the same parent records, retire the wrapper and carry forward a merge/action lockout of 10 active seconds so splitting or merging cannot refresh specials.
- Use existing forage eligibility and the one-pickup consume path. A crew chooses one eligible parent per meal by lowest energy, with stable role-order ties. Credit the real fish value once to the ledger and that parent. Award at most one ordinary work event per successful team action, to the participating parent in stable alternating order. Merge, split and migration award zero XP, work, fish or player currency. The team never runs the original Angler catch loop.

## Mood and district weather

Start at **Curious**. Every two active seconds choose by priority: **Worried** below 25 energy or during immediate danger, **Determined** during an active nearby mission, **Excited** for six active seconds following a successful special or safe feeding, then Curious. Release Worried only after four safe seconds and energy at least 35 when low energy caused it. Worried prioritizes close formation and safe food. Determined prioritizes the mission target within normal leash and range. Excited favors a nearby eligible target while preserving the same cooldown. Curious uses inherited formation and forage rules. For crews, compare the lower parent energy.

Hash world seed, chapter, district and epoch in an isolated deterministic stream. Start the first district clear. Propose 3-night weather epochs and a short entry transition. Use the player's authoritative district to drive audio and HUD. Evaluate targeting and hazards by actor location. Keep telegraphs, loot and emergency routing legible in every state.

| Weather | Presentation | Gameplay starting values |
| --- | --- | --- |
| Clear | Amber city tile and clean skyline | Normal ranges and movement |
| Rain | Blue reflective streets and sparse streaks | Ordinary dashes travel 15% less, Trawl Team gets a slightly longer hold |
| Fog | Pale-green fog art with a visible safe radius | Ordinary ranged enemy and companion acquisition capped at 300 world units. Spotter cap is 360. Existing bullets and boss telegraphs stay visible. |
| Storm | Indigo skyline and visible ground warning | At most one small strike per eight active seconds in the active district. Telegraph 0.85 seconds and choose an open location away from the player at selection. Existing stagger rules handle ordinary enemies caught inside. |

Use weather tiles in the district-entry card and HUD badge. Reserve the dynamic world overlay for limited-size rain and fog, and avoid full-screen lightning flashes. Reduced-motion rendering uses static weather and a steady strike warning. It shares the same simulation.

## Optional seeded missions

Generate one reachable offer per chapter from a separate seed hash and stable mission ID. Pick a fallback reachable site or skip the offer if candidate positions fail. Enter its marker to accept. Limit to one active mission, defer offers during guardian, gate and finale conflicts, and expire at the chapter boundary. Keep playable solo and with any squad.

- **Rain Cache** uses the painted beacon and cache. Stay within the marked circle for 2 seconds while an existing bounded enemy group approaches. Trawl can block that route. Grant a one-use 6-second movement buff on collection.
- **Signal Rescue** uses the cyan drone marker. Approach and hold near it for 3 seconds to recover its signal. Spotter can prioritize a nearby ranged sentry. Grant one temporary shield charge expiring after 12 active seconds.
- Record consumed mission ID and resulting timed buff in the same checkpoint write. Allow movement out of the circle to interrupt progress, and preserve terminal state over reload. Mission rewards never mint food, work, currency or lives.

## Illustrated mobile HUD

Use the four existing squad positions as compact 32–36 CSS pixel chips. A fused chip shows the ready crew crop with a small paired-paw symbol and “L3”. Overlay one illustrated mood head on the active chip. Place the district weather thumbnail and short text beside the night label. The upper-edge mission tab combines its painted marker and one short verb, such as “Recover signal”. Pause details carry full labels, parent names, timers and eligibility. Use shape and text alongside color. Make combat chips read-only, respect safe-area insets, and keep the objective and squad strip above open play space in portrait and compact across the top in landscape. Check 390×844 and 844×390 for clipping and target visibility.

## Checkpoint handoff

The inherited `long-night.js` journal expects schema 1 / gameVersion 1.7, canonical CRC32, revision and alternating `cataclysm-17-save-a/b` slots. `checkpoint.js` serializes members and validates the Mecha-only component roster. Pass 06 should introduce schema 2 / gameVersion 1.8 and dedicated `cataclysm-18-save-a/b` slots. Offer a one-time import when no valid 1.8 journal exists, subject to newer-schema protection and explicit recovery on damaged journals. Verify the original CRC and validate the original format before projection. Leave both 1.7 slots intact. Keep campaign receipt, seed/RNG state, chapter/night, profile, fish and exact companion balances, active Mecha and all pending encounters. Initialize mood deterministically and start weather clear and missions empty on import. 1.69 has legacy scores, preferences and city state without a resumable run envelope.

Validate the new recipe map, maximum four actors, global role uniqueness including parents, exact two Level-3 components and no nesting. Persist crew cooldowns, action progress, parent mood/energy, district weather epoch and any pending strike, mission IDs and reward state. Maintain fixed active-time ticks, background pause, journal size bounds and prior-revision recovery. Restore references by stable IDs using the existing checkpoint reconstruction pattern.

Pass 07 should exercise four→three→four, full-slot split rejection, duplicate-card rejection, meal/work conservation, v1.7 migration with active Mecha, pending storm strike and mission restore, repeated completion rejection, deterministic district changes, asset rendering and muted/paused audio. Verify that weather changes targeting or enemy behavior in matched seeded runs.

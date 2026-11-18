# Cataclysm 1.6 — Mutations After Midnight

Pass 04 integration, 18 November 2026. **Partial experimental source. Browser acceptance blocked on this runner.** The runtime is the inherited 1.5 game with the Pass 02/03 mutant assets and new behavior. Test evidence below distinguishes deterministic checks from launch and playtesting.

| Encounter | Implementation and counterplay |
| --- | --- |
| Mimic Stray | Draws through the ordinary fish renderer without creating a collectible. Approach or damage starts a 950 ms reveal, followed by a fixed-direction lunge. Step sideways or shoot it. Defeat drops two real fish. |
| Bell-Ringer | The 1.3 second countdown has a gold ring, a raised-bell frame and a WAV warning. A hit or stun interrupts the countdown. Each ringer has two successful cast attempts, each admitting up to two minions subject to safe placement and caps. |
| Roof Pouncer | Starts outside the camera margin at a connected clear socket. It marks a position predicted from movement, holds the ground warning for 900 ms, crosses visually in a 320 ms leap and checks the fixed destination against terrain before landing. It causes contact damage during the landing window. |
| Necro-Groomer | Claims a nearby corpse at the end of a 1.2 second ritual. Damage or stun preserves the corpse and stops the cast. Two attempts per groomer. Raised actors can't create corpses, earn XP or make fish drops. |
| Pack Leader | Rallies up to three base shamblers, stalkers or orbiters to a shared snapshot of the player's location. The leader commits the group after a 700 ms warning. The leader's death sends surviving followers into a brief harmless scatter. A rallied orbiter dives with the group and can hit on clear terrain. |
| Feral Fish Thief | Races toward existing free fish and winds up for 380 ms before trying to take up to two units in one transaction. Interrupt with damage, claim fish first, or distract it with a committed baited cast. Angler reservations and fish already marked for Courier or player collection are protected. Defeat during the three-second retreat restores one unit. |

[Encounter state machines](../mutations.js) · [Game hooks and collision checks](../game.js) · [Fish ledger](../company.js)

## Combination, bosses and bounds

- At Night 15 or later, a nearby idle Bell-Ringer and Necro-Groomer can merge into a single hybrid with their combined threat cost. The hybrid raises nearby corpses with interruptible rituals and uses a five-way volley when it has no eligible corpse. At most one hybrid is active and at most one is created per night.
- Eligible scheduled bosses can evolve from Night 18 when wounded and close enough. District and that district's guardian provocation flag select the form. Mourning Bell Sovereign projects a warned eight-way volley with visible gaps. Patchwork Broodmother can raise up to three corpses, with a warned straight-line rush when no eligible corpse is available. Evolution retains the scheduled encounter ID, reward, score credit and current HP. The mandated finale has its original roster.
- The inherited anatomy cocoon path now runs with the live lab director. The existing 18-second cooldown and one-incubating-cocoon rule remain, with a new cap of two living cocoons and offspring combined. Wings survive trait inheritance. City guardians, gate actors, fishing mutants, new families and rallied members are excluded from that path.
- The ecology admits at most three new base encounters per night, one per family at a time, subject to live population and director threat. Summoned and raised enemies share a live cap of five and withdraw after 24 seconds. The corpse list holds at most ten markers for 16 seconds each. The new boss evolution and hybrid have independent one-active caps. The spawn path can skip an encounter when geometry, recovery or available threat prevents placement.

## Raster, audio and dialogue

The runtime loads the Pass 03 frame index and draws its 16 transparent raster cutouts by their annotated pivots in world space. Simulation timestamps select reveal, bell swing, leap, ritual, charge, theft and boss transition poses. Pickup disguise uses the inherited fish art. Ground shadows, corpse markers, warning rings, and attack lines are canvas effects.

The existing audio context and volume use five loopable WAV beds with last-life, boss, committed fishing, active mutant and wave-pressure precedence. The requested bed must hold for 750 ms before crossfade, with at most two bed sources during transition. Eight WAV cues play from gameplay events through the shared effects bus. Brief score ducking prioritizes urgent warnings. Pause, mute, tab hiding and restart stop mutation sources and invalidate pending cues. Short crew or solo-cat bubbles use the lower screen edge, with per-line cooldowns and no movement input capture.

[Original images and provenance](IMAGE_MANIFEST.json) · [Frame timing and pivots](../art/animated/mutation-frame-index.json) · [WAV assets](../audio/generated/mutation-audio-index.json) · [Media runtime](../mutation-media.js)

## Verification

| Check | Evidence |
| --- | --- |
| Production runtime with DOM, canvas and audio doubles | PASS. Tests exercised normal lab-mode mutant admission, all six decisions, damage interruption, minion cap, nonrecursive revival, wall-safe off-screen leap and landing, flying pack behavior, atomic fish theft and refund, hybrid and two Night 80 evolution fixtures. Canvas calls used an actual indexed PNG path and world coordinates. WAV file buffers reached the audio double. Pause, interruption and stale-warning suppression passed. [Fixture source](../qa/mutation-fixtures.cjs) · [Runtime log](qa-runtime-pass04.log) |
| Inherited production regressions | PASS in the same suite. Includes fishing cast/cancel/pause, bait, rare/jackpot award guards, mutating fish, city gates/routes/guardians, nine lives, 16 recruits and their work paths, four slots, Mecha one-slot fusion, and card/reroll flow. Score, campaign, director and the illustrated hero modules match 1.5. [Regression source](../qa/runtime.cjs) · [Results](../qa/runtime-results.json) |
| Media and syntax | PASS. SHA-256 matched the three original atlases, 16 derived PNG frames and 13 WAVs. Verified RGBA PNG headers, indexed frame references and 24 kHz mono PCM WAV headers and sample counts. Top-level JavaScript and changed harnesses parse. [Media log](qa-media-pass04.log) · [Syntax log](qa-syntax-pass04.log) |
| 390×844 and 844×390 browser smoke | BLOCKED before page creation. The local Playwright package is missing. Direct Chromium fails in Crashpad with `setsockopt: Operation not permitted`. Google Chrome with the Crashpad testing switch gets as far as the sandbox host before failing with `shutdown: Operation not permitted`. The smoke harness includes assertions for touch, real canvas pixels and mutant sprite draw, plus browser WAV decode. [Harness](../qa/chrome-smoke.cjs) · [Playwright log](qa-browser-pass04.log) · [Chromium log](qa-chromium-launch-pass04.log) · [Chrome retry log](qa-chrome-retry-pass04.log) |

## Partial and known limitations

- A successful natural Night 80–100 run with solo and squad builds remains unmeasured. Fixtures establish differences in attack decisions and spending bounds. Dense streets can suppress roof sockets and minion placement, and high-DPS builds can kill candidates before a hybrid or boss evolution develops.
- Roof Pouncer visuals cross rooftops while the damageable body stays at its safe launch socket until landing. The landing marker persists during flight. The two authored paintings per actor are reused across states, and legibility, audio balance, browser pause/mute behavior and frame pacing still need on-device or browser review.
- Newly added WAV decode failures are silent so the inherited score and visual telegraphs can continue. The inherited city one-shot asynchronous restart edge remains. Existing 1.5 fishing pose and shoreline limitations carry forward, as does the alternate Ninefold Dawn text's omitted jackpot breakdown.
- Both target browser orientations, natural company economy over a full run and physical Samsung testing remain unverified. The GitHub Actions workflow owns independent Pass 05 artifacts and the experimental candidate publication. This pass supplies the versioned 1.6 source and evidence under its designated directory.

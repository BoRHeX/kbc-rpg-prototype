# Cataclysm 1.8 · Distilled Advancement

Pass 07 froze the 1.8 source and assets in this directory for 1.9. Local browser acceptance is **UNVERIFIED**. Chromium failed before navigation at both 390×844 and 844×390 when the runner denied `shutdown(child_socket_, SHUT_RD)`. The coordinated workflow runs its own Chrome startup and nonblank-canvas gate after this pass. [Local Chromium log](../qa/pass07-chromium.log) · [Candidate status](CANDIDATE_STATUS.json)

## Corrections

- Spotter now applies its two-second mark on a surviving projectile hit. Firing alone previously marked the aimed target, including on a miss. The mark adds 20% to one subsequent eligible allied hit and Spotter cannot consume its own mark. The regression drives the real projectile collision and checks the one-use multiplier. [Projectile collision](../game.js#L2954) · [Crew fixture](../qa/long-night-fixtures.cjs)
- Fog retains at least 45% opacity for distant ordinary enemy bodies. Dash, mutation, fishing-mutant, gate, city, caster and major attack warnings, as well as marked targets, keep their regular rendering. Rain, fog and storm each tint the street below actors, pickups and warnings. The tint has no animation or flashes. [Weather draw](../game.js#L3347) · [Fog exclusions](../game.js#L3473)
- Gates, city events and bosses break an in-progress mission dwell. A committed parent attack flag is cleared during fusion so separation starts from a clean following state. [Mission interruption](../game.js#L935) · [Fusion transition](../advancement.js#L10)

## Deterministic runtime evidence

Both Node harnesses execute shipped game scripts with browser API doubles. The campaign harness accelerates progression at night boundaries and drives selected encounter, combat and UI transitions. [Campaign fixture results](../qa/pass07-long-night.log) · [Inherited runtime results](../qa/runtime-results-pass07.json)

| Area | Evidence |
| --- | --- |
| Trawl Team and Spotter Pair | The pause controls combine four eligible parents into two slots and reject a Level-2 pair. The fixture exercises Trawl's cluster stun, Spotter's aim, piercing projectile and one-use mark, committed-role recruitment rejection, separation headroom and remerge cooldown. A crew independently consumes a single pickup for its hungrier parent while player fish and XP stay fixed. Both crews live through checkpoint restore and a revive. Restart clears the active squad and fish and restores nine lives. |
| Weather and missions | A matched ordinary caster starts at range 390 in clear weather and holds fire in fog. Helper assertions cover rain's 0.85 dash multiplier and Spotter's 360-unit fog cap. The fixture exercises a pending storm warning and the ordinary-enemy stagger on resolution. A seeded mission appears through production placement. Dwell resets on exit or a gate interruption. Both reward kinds are exercised, including one-use ward consumption and a completed mission that cannot refresh its reward after reload. |
| Save compatibility | A checksum-valid schema-1 fixture imports a Mecha crew and exactly 31 player fish from the 1.7 journal. The original bytes remain in the 1.7 slot and resume records a schema-2 revision. Fixture coverage includes active fishing, upgrade offers, revival, backgrounding, corruption fallback, quota failure and protection against future-schema overwrite. The archived 1.7 directory was unavailable in this checkout, so the import uses a constructed schema-1 fixture. For 1.69, the checks cover legacy discovery, spent guardian warranty and rejection of Night 100 progress as an Endless unlock. Checkpoint continuation begins with 1.7. |
| Campaign and Endless | Segmented progression covers all 1,000 nights, ten checkpointed milestones and the distinct finale. The fixture denies early Endless and opts in after loading a valid completion receipt. It also checks the 630-tick night boundary. |
| Published mechanics | Seed 26 completes the Wild Card festival dwell and reproduces a 120-tick continuation after reload. The inherited runtime suite exercises festival visuals and pulse, the six mutant archetypes, their counterplay, optional fishing, bait weights, cast cancellation, atomic catch, jackpot bounds, and the Mecha lifecycle. |

## Art and audio

All three original raster atlas files match the Pass 05 SHA-256 manifest. The fixture verifies byte signatures and hashes for 16 derived PNGs and seven WAV cues. Static inspection shows two distinct illustrated crews with different silhouettes, including Trawl’s net and lures and Spotter’s raised optics and rifle. The production canvas issues draw calls for both pairs' ready and action frames and for the painted mission beacon and active mission icon. Weather crops are used in the HUD and mood portraits are referenced by the production companion renderer. The street tint and warning ring are canvas effects. [Original atlases](IMAGE_MANIFEST.json) · [Derived media](ADVANCEMENT_MEDIA.json) · [Canvas draw paths](../game.js#L3412)

## Remaining for playtest

- Real Chrome canvas pixels, touch and phone-scale readability remain open in both orientations. No physical Samsung run, FPS measurement, gameplay recording, audible mix check, continuous 30-minute trial or natural full campaign was performed.
- Rain dash pacing has a helper assertion. The full movement tuning, fog contrast on device, mission visibility in a full squad, and long-run balance across seeds and builds need playtest.
- Weather WAVs are short cues. Full illustrated city weather scenery, separate adaptive weather music layers and the stretch Thunder Chorus pair remain deferred.

The freeze manifest covers shipped files and QA evidence. The producer updates candidate status and the pass ledger separately. Verify from this directory with `sha256sum -c STUDIO/PASS07_FREEZE.sha256`. [Freeze file hashes](PASS07_FREEZE.sha256)

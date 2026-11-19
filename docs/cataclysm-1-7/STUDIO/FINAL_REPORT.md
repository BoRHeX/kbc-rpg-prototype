# Cataclysm 1.7 · The Long Night

Pass 04 freezes the 1.7 source for 1.8 inheritance. **PARTIAL** is the local evidence-based status. The campaign and continuity fixtures passed. Local Chrome aborted before navigation, so the two-orientation browser gate remains pending for the outer workflow. The freeze covers this version directory and its real assets. [Candidate status](CANDIDATE_STATUS.json) · [Runtime hashes](pass04-runtime.sha256) · [Browser attempt](pass04-browser.log)

## Campaign and checkpoints

| Check | Observed result |
| --- | --- |
| Thousand-night progression | The production clock advanced Night 1 at step 630. The segmented fixture passed each of the 1,000 consecutive boundaries through the production reducer. It held the milestone nights for story bosses, passed Night 100 into Chapter 2 with Endless locked, then exercised the two light holds, three escorts and final boss at Night 1000. The fixture advances clocks directly between milestones and scripts boss damage. |
| Chapter identity | Ten 100-night themes have distinct names, accents, emblems and audio. Pressure manifests change mutant groups, hazards and elite or fusion opportunities. Ten story bosses used nine opening attack patterns. The final avenue adds late hazards and the light-and-escort sequence. The four city districts and inherited enemy AI underpin these themes. |
| Active restore | Saved and restored all ten partially damaged milestone bosses with their IDs, HP, attack state and encounter records. The snapshots also covered a live city guardian, gate linkage, player HP and equipment, exact Mecha components, pending upgrade cards, revival, a linked mutant corpse and a committed cast with a one-time payout. Seed 26 festival dwell and 120 subsequent gameplay ticks matched across reload. |
| Background and journal | Synthetic visibility and pagehide events exercised pause and save. A two-hour jump in the hidden-frame clock left gameplay unchanged. Alternating slots recovered an older valid revision when the latest was corrupt and preserved valid data on simulated quota failure. Future schemas blocked writes. 1.69 seed discovery and spent warranty were imported. The 1.69 Night 100 record granted no Endless access. |
| Endless | A direct start remained blocked before a full win. The Night 1000 fixture checked that lethal damage and revival delayed the win, rewarded 10,000 milestone points once, unlocked opt-in Endless, then started it with nine lives and a fresh build. Simulated quota exhaustion preserved the earned unlock in the active session. A later successful save made the receipt survive reload. |

[Campaign rules](../long-night.js#L6) · [Runtime milestones and finale](../game.js#L2009) · [Checkpoint capture and hydrate](../checkpoint.js) · [Campaign fixture](../qa/long-night-fixtures.cjs) · [Campaign execution log](pass04-campaign.log)

## Repairs and continuity

- A guardian warranty earned between checkpoints could be reclaimed after a same-seed restart. Awarding the warranty now updates the active profile immediately, so the next checkpoint includes it even after restarting. The continuity fixture uses the real start path to verify that the second award is denied. [Guardian award](../game.js#L184) · [Continuity fixture](../qa/runtime.cjs)
- A save taken just after a Pack Leader was removed dropped the reference its pack needed to scatter. The checkpoint now preserves the removed leader's position for that pending behavior. The fixture compares scatter vectors before and after reload. [Checkpoint adapter](../checkpoint.js#L39) · [Pack behavior](../mutations.js#L223)
- A full win originally depended on a successful storage write to expose Endless. The menu and start handler now use the validated session receipt and retain the unsaved warning on write failure. The frame and chapter audio also honor the background flag. The boss health HUD gives the required story boss priority over optional bosses. [Checkpoint and menu](../game.js#L904) · [Frame loop](../game.js#L3395) · [Boss HUD](../game.js#L2932)
- The adapted inherited runtime harness passed 16 recruits, four-slot ownership, Mecha build through repair, nine lives, city gate relief and guardian rewards, optional fishing with bait and jackpot, six mutant families, hybrid and elite evolutions, and Festival and Archivist interactions. Wild Card coverage included seed admission, lore, lantern timings, reward idempotence and Mecha/Courier passive pulse triggers. These checks run shipped JavaScript with DOM, canvas and audio doubles. [Continuity results](../qa/runtime-results-pass04.json) · [Continuity log](pass04-continuity.log)

## Media and evidence limits

The manifest verification matched 34 file hashes covering three original PNG atlases, 17 derived PNGs, 13 WAVs and the frame manifest. Fixtures observed all 17 chapter assets reach draw calls and checked WAV scheduling, stale decode cancellation and stopping chapter voices. Playwright was unavailable locally, and Google Chrome 157.0.8103.50 aborted at `sandbox_host_linux.cc:41` with `shutdown: Operation not permitted`. There are no Pass 04 local screenshots or real browser pixel, touch, or audio results. The preserved browser harness targets 390×844 and 844×390. [Media provenance](IMAGE_MANIFEST.json) · [Verified media hashes](pass04-media.sha256) · [Browser harness](../qa/long-night-browser.cjs)

The 10.5-second floor yields 2h55m of active time before boss overtime and menus. Natural full-run balance, arbitrary-position finale navigation, 30-minute real-time endurance, physical Samsung behavior, frame rate, audible mix and worst-case save size remain unmeasured. Local storage can roll back to the most recent successful checkpoint after an abrupt kill. Concurrent real-browser writers, storage eviction and the broader malformed-save matrix were outside local coverage. Journal snapshots are full copies. Several chapter themes share biome art and enemy behaviors, including the two charge openings. The bespoke choreography described in the concept remains incomplete.

## Reproduction and handoff

Run from the version directory.

```sh
node qa/long-night-fixtures.cjs
node qa/runtime.cjs
sha256sum -c STUDIO/pass04-media.sha256
sha256sum -c STUDIO/pass04-runtime.sha256
node qa/long-night-browser.cjs
```

The browser script requires Playwright and an installed Chrome. The outer workflow archives the 1.7 candidate and supplies its own browser evidence and candidate label. Pass 05 inherits the frozen version into a new 1.8 directory. The checkpoint format remains schema 1 and can read the earlier 1.7 records. Legacy 1.69 has metadata keys and no resumable run envelope. [Save schema](SAVE_SCHEMA.json) · [Earlier implementation](IMPLEMENTATION_REPORT.md) · [Authorized pass order](../../../game_factory/CATACLYSM_17_19_TEN_PASS_ORDER.md)

# Cataclysm 1.69 — The Wild Card

**Pass 06 · PARTIAL · repaired startup, browser acceptance pending.** The experimental source is archived in this version directory for owner playtest.

- The workflow’s Google Chrome run reached the page in both mobile orientations, then recorded a null `game.t` exception and a one-color canvas. On the first animation frame, the caption comparison still evaluated its right-hand side even when optional chaining returned undefined on the left. The exception prevented registration of the next frame, so clicking Start hid the overlay without restoring rendering. The fix gates caption selection on an active game and retains the existing caption priority during play. [Workflow browser evidence before repair](BROWSER_QA.json) · [Pre-fix reproduction](qa-runtime-pass06-before.log)
- The production-script fixture now executes title-screen frames before Start, checks for canvas draw calls and a hidden gameplay caption, then runs the full existing gameplay suite. The added check reproduced the browser error before the repair and passed afterward, along with the festival, Archivist, Mecha, fish and mutant fixtures. All Pass 05 media hashes also matched. [Runtime log](qa-runtime-pass06.log) · [Repair source hashes](qa-source-pass06.sha256) · [Media hashes rechecked](qa-media-pass06.log)
- The local Chrome retry stopped before page creation at `shutdown: Operation not permitted`. The scheduled Pass 06 workflow smoke runs after this repair on the outer runner. Patched browser results and screenshots are pending. No physical Samsung test was performed. [Local Chrome retry](qa-chrome-pass06.log)

## Baseline and browser

- Published 1.6 passed its production-script harness with DOM, Canvas and audio doubles, including start, movement, mutant admission and media calls, fishing and restart. The 1.6 workflow pinned unavailable Playwright **1.66.1**. That installation failure prevented browser QA. Playwright **1.56.1**, the 1.69 workflow pin, resolved locally. The inherited smoke harness subsequently hit Chromium Crashpad `setsockopt: Operation not permitted` on this runner. [1.6 runtime log](qa-runtime-16-pass05.log) · [1.6 browser attempt](qa-chrome-16-pass05.log)
- 1.69's smoke harness targeted 390×844 portrait and 844×390 landscape with Google Chrome 157.0.8103.50. Chrome aborted in `sandbox_host_linux.cc` on `shutdown: Operation not permitted` before it could navigate. A direct single-process launch hit the same error. Both orientations, real canvas pixels, touch, audio decoding and the audible mix remain unverified. The sandboxed smoke produced no screenshots. The outer workflow captured the blank canvases in `CHROME_390x844.png` and `CHROME_844x390.png`. [Chrome attempt](qa-chrome-169-pass05.log) · [Smoke harness](../qa/chrome-smoke.cjs)

## Production fixtures

| Area | Observed result |
| --- | --- |
| Festival | Seeds 0–31 yielded two dormant and thirty ineligible runs. Both admitted layouts had four Cinder Court points with 33-unit clearance, direct access from the start and more than 100 units of fishing clearance. Forced blocked layout and stress exclusion passed. Seed 26 reached lighting and listening, lost partial dwell after leaving a ring, awarded two fish once after both stamps, and retired after fading. Timeout at second 44 beat a pending stamp. Departure and life loss ended the event. The gust marked at most two enemies and the special Mimic was admitted once in the controlled encounter. |
| Archivist and art | The optional lore visit set the read state and cue. The authored court, Archivist and prop atlases reached production `drawImage` calls with source rectangles. The character is an illustrated festival NPC with lore and pose reactions. Recruitment and levels for the Archivist remain deferred. |
| Passive pulse | Actual Scout marking, a Mecha volley and Courier delivery exercised the automatic triggers. The pulse chose up to three eligible enemies, excluded the guardian, expired after 1.25 seconds and enforced a ten-second cooldown and two-pulse nightly cap. An empty target set spent no charge. A new night permitted another pulse. Life loss cleared the active slow. |
| Audio | The festival bed and lore WAV reached playback in the shared audio double. The reward fanfare could be lost when an earlier cue occupied the Wild Card voice or a pulse fired in the same frame. Pass 05 gives the reward priority over the lower-priority voice and preserves the reward cue across same-frame companion work. Fixtures verify one Wild Card effect voice, mute stopping active sources, invalidation of pending decode callbacks and suppression of stale cues on unmute. The shared mix can still omit cues at its effects limit. |
| Continuity and difficulty | Passed Mimic, Bell-Ringer, Pouncer, Necro-Groomer, Pack Leader, Fish Thief, hybrid and both elite evolution fixtures. Inherited fishing cast, bait, jackpot, guardian, map, nine-lives, upgrade and restart checks passed. Fish accounting, four unique slots and level-three Engineer plus Shooter fusing to one Mecha slot passed. A level-85 fixture required 24 horde kills at 4.5 mob HP and reported quota 108. Festival difficulty evidence is limited to encounter, reward and pulse bounds. Natural solo and squad progression and late-game balance remain unmeasured. |

[Runtime log](qa-runtime-pass05.log) · [Structured results](../qa/runtime-results-169.json) · [Wild Card fixtures](../qa/wildcard-fixtures.cjs) · [Balance fixture](qa-balance-pass05.json) · [Syntax](qa-syntax-pass05.log) · [Changed source hashes](qa-source-pass05.sha256)

## Picture and sound evidence

| Original illustrated PNG | SHA-256 |
| --- | --- |
| Midnight Festival world | `390d280588dad0ac97a77fce57602d913ff74b092b664cd3d7dfc7d3d48e1102` |
| Archivist character | `adbb3e5362a4d9355ff541aa1f4300a43dca542422e20f0961c67bd088770942` |
| Wild Card fusion and festival props | `515f419b69ccd88bfc85b5cb34ff5a0cdf8737d914294021f0eaf9c38854e720` |

The three originals, three packed atlases, 15 derived frames and five original WAVs matched the pass manifests. PNG headers, chunk CRCs, atlas crop bounds and mono 24 kHz PCM sample counts passed. The hashes identify source pictures and runtime assets. [Asset checks](qa-media-pass05.log) · [Full hashes](qa-media-pass05.sha256) · [Image provenance](IMAGE_MANIFEST.json)

## Handoff to 1.7 The Long Night

Use the versioned 1.69 candidate and its pass ledger as the starting snapshot after owner review. On [featured seed 26](../index.html?seed=26), the opener has a festival and Archivist encounter. A first-minute pulse requires fixture setup or an organically qualifying squad. The scheduled Pass 06 workflow smoke covers the immediate browser retest. This repair requests no additional specialist pass.

For 1.7's 1000-night campaign and mobile save/resume, store the city seed and simulation clock, wave and campaign progression, lives and recovery, guardian and gate progress, squad identities and work/food state, fish ledger and pending transactions. Save festival phase, post dwell and stamps, read and pressure-attempt flags, result and settled reward together with the fish state. Save pulse night, count, cooldown and active expiry where applicable. Resolve companion and enemy links through stable IDs on restore and rebuild transient audio and visuals from restored state. Cover checkpoint retries around a lantern reward, committed fishing, Mecha fusion and life loss. Endless Mode and campaign checkpoints remain 1.7 work.

[Pass ledger](PASS_LEDGER.json) · [Extra-pass request](EXTRA_PASS_REQUEST.json)

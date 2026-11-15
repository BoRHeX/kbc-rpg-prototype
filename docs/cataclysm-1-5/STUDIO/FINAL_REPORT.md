# Repair Department 1 — Pass 06

15 November 2026. **PARTIAL experimental candidate; current browser acceptance BLOCKED.** This section supersedes the Pass05 art repair request below. Trigger: the written specialist request in `EXTRA_PASS_REQUEST.json`, supported by the actual source crops, original atlases and QA report. No new image generation, prior-version edits, default-site changes or stable promotion occurred.

## Actual repairs

- Repaired the reproducible media preparation script and regenerated the cat/mutant strips and mobile derivatives from the three hash-verified original PNGs. Low-alpha background haze is removed; each crop retains its largest connected painted component plus a two-pixel edge fringe, removing detached neighboring atlas fragments. Painted RGB is unchanged. Location and gear preparation stays unchanged.
- Replaced the clipped cast/bite/reel crop choices with intact windup/reel source regions. Cast reuses windup and bite reuses reel: these are reused original paintings, **not newly illustrated poses**. Updated frame rectangles, provenance and derivative hashes are in `art/animated/fishing-frame-index.json`.
- Corrected production `fishingDraw` so its code-native line begins at the illustrated rod tip for windup, waiting and bite/reel rather than a fixed point disconnected from the rod. Tail-gun/combat hero rendering and movement-only controls remain inherited.
- Closed the specific derivative cleanup request. No automatic next repair is requested.

## Evidence and checks

- `node qa/runtime.cjs` (from the 1.5 directory): **PASS**, exit 0. `qa-runtime-pass06.log` and `../qa/runtime-results.json` retain evidence. Tests call production functions and now check all three active pose line origins, alongside inherited nine-life/cards/company/Mecha/city/gates and fishing cancellation, hazard caps, bait, ledger and jackpot regressions. These are canvas/DOM doubles.
- `python STUDIO/tools/validate_fishing_media.py`: **PASS**, 14 files and 16 animation mappings; `qa-media-pass06.log`, `FISHING_MEDIA_VALIDATION.json`. Original PNG SHA-256 values still match the image manifest; frame bounds, derivative hashes and existing audio checks pass. Audio regeneration is deterministic and introduces no new composition.
- JavaScript syntax checks: **PASS** for changed `game.js` and `qa/runtime.cjs`.
- Visually inspected actual composited derivatives: `alpha-preview-cat-pass06.png` and `alpha-preview-mutant-pass06.png`. Checkerboard backgrounds expose transparent edges; rods and mutant silhouettes are intact at strip scale. These inspection previews are not gameplay screenshots.
- Actual Chromium retry: **BLOCKED before page creation**, launch timeout with crashpad `setsockopt: Operation not permitted`; `qa-chrome-pass06.log`. Neither orientation assertion ran. Supplied earlier basic Chrome start/nonblank evidence is preserved as historical evidence; it does not verify this repair. No phone, audio listening or FPS acceptance is claimed.

## Remaining defects

CAT-15-01–05 retain the implementation and limitations documented in Pass05. CAT-15-06 remains **PARTIAL**: alpha/crop defects are improved, but the stationary reference cat still appears beside the inherited quadruped rather than forming a unified cast rig; some reused poses are upright. Cleanup can remove detached droplets, glints or fine disconnected line sections. Gear retains source haze, water remains rectangular perspective art, and isolated normal/rare fish and separate ordinary treasure paintings remain missing. CAT-15-07 remains **PARTIAL** pending actual browser drawing/touch/audio checks in both orientations.

Still unaccepted: natural solo/squad food progression after the 9% drop setting, late mutant difficulty (24 HP), suppression of danger at spawn caps, alternate Ninefold Dawn ending jackpot breakdown, all-seed navigation/spawn reachability, soundtrack mix and pending audio lifecycle across reset. Existing wall/spawn fixes are preserved; this art pass does not prove every spawn socket reachable. All original PNGs and all 1.5 game systems remain preserved. No 1.6 work was started.

Deliverable hashes are recorded in `PASS_06_MANIFEST.json`. The older report below remains available as prior evidence.

---

# Cataclysm 1.5 — Pass 05 gameplay polish and independent QA

15 November 2026. **PARTIAL experimental candidate. Browser acceptance BLOCKED.** This is the inherited 1.4 game with integrated fishing, not a separate demo. This pass changed only `docs/cataclysm-1-5/`. Earlier versions, default site and candidate sibling path are untouched. No deployment, public URL, stable promotion, natural Night-100 completion or physical Samsung acceptance is claimed. The explicit directory restriction prevents writing the separate candidate index; this source and its evidence are retained for the publication job.

Read authority: owner playtest/scope, master ledger, 1.1–2.0 roadmap, constitution, standing production policy, council multipass policy, predecessor final/integration reports, and 1.5 concept/art/media/integration handoffs. Previous pass reports remain historical and may describe behavior superseded below.

## Confirmed defects corrected

- **Pause erased fishing danger.** `pause()` discarded the reserved cast/outcome while consuming the committed attempt. It now freezes the active cast with simulation time. Resume retains the same outcome; subsequent movement cancels/reels and releases a reserved ambush. No extra control or pause-time reward. Regression checks object identity while paused and actual hazard creation after resume/cancel.
- **Ambush exceeded its cap.** Five existing fishing enemies admitted three more because the cap was checked only before the loop. Capacity is now checked for every actor; the five-to-six regression passes. Six remains the maximum fishing hazard population, subject to the inherited overall spawn cap.
- **Flying/phasing enemies escaped bounds.** `moveWithCollision` returned before wall handling for terrain-bypassing actors. They now retain prop traversal while clamped inside the physical outer wall and blocked from entering locked districts. Wing/phase fixtures push all four exterior corners by 500 units. This repairs a real remaining path outside the wall after integration's spawn fixes.
- **Pause guide contradicted inherited life mechanics.** Removed the obsolete three-minute lottery and “bosses never award lives” claims; guide describes the rare eligible once-per-seed Terminus reward. Only Level-3 Engineer + Shooter → Mecha Crew is presented as implemented; future pairs are unknown/unavailable.
- **QA version mismatch.** Browser smoke still asserted build 1.4. It now expects 1.5 and includes real-spot cast, cancellation, screenshot and actual fishing-image draw assertions. Those browser assertions did not execute here.

## Seven authoritative feature IDs

“Implemented” is production-source plus deterministic runtime evidence, not browser/hardware approval. Overall systems remain partial where acceptance or promised presentation is missing.

| ID | Status and actual evidence | Limits / known defects |
| --- | --- | --- |
| CAT-15-01 | Implemented core, partial acceptance: eight seeded spots, dry aprons, solid water, automatic one-second commitment/reel, movement/displacement/damage cancellation. Production tests cover windup cancel, committed cancel, leaving apron, automatic resolution and pause preservation. Nine sampled seeds have clear radius-52 aprons and radius-29 plaza approaches. | Small rectangular water patches in existing streets, not richer canal/bridge topology. No all-seed flood-fill or browser geometry inspection. Pause intentionally freezes a cast rather than discarding it. |
| CAT-15-02 | Implemented core: rod/line rank caps, three charged bait packs, automatic plain-lure fallback; existing random card/reroll dispatch retained, at most one fishing card per offer. Weight sums and bait shifts tested; final worm charge consumed exactly once. | No inventory bait switching or exact concept family-weight ceiling. Rod benefit is only 0.1s per rank. Cards show base odds; no dynamic risk/odds panel. |
| CAT-15-03 | Implemented core, balance partial: weighted fish/rare/treasure/cache/mutant/ambush; ordinal reserved before bait debit, run nonce prevents identical fixed-city jackpot farming, three commitments per spot, cooldown, bounded danger. Actual mutant warning/lunge and post-pause ambush tested. | Mutant fixed at 24 HP, not night-scaled. Hazard/global spawn caps can suppress danger without replacement. Cancellation loses a reward; consumed attempt is not refunded. Persistent dwell risk does not reset outside. No statistical campaign fairness or natural high-level combat acceptance. |
| CAT-15-04 | Implemented ledger connection: physical catch units enter `addFish`/company spawned ledger once; repeated resolve IDs cannot duplicate credit. `caught` is provenance, not spendable fish. Inherited atomic companion eating, autonomous work, Angler/Courier and solo perks pass. Ordinary drop configuration is 9%; four caches and major/guardian rewards remain. | Reduced food supply is not proven fair over a natural solo/squad campaign. No claim of a new independently painted ordinary fish. |
| CAT-15-05 | Implemented separate counter: unique award IDs, cache removal from subsequent tables, 10,000 cap, separate HUD/end score copy; cap/duplicate award tests pass. `score.js` unchanged from 1.4, preserving historical Night-100 completion scoring. | No fresh Night-100 completion. The alternate inherited Ninefold Dawn victory text replaces detailed end copy; that route still omits the jackpot breakdown. No storage-tamper protection. |
| CAT-15-06 | **PARTIAL illustration/audio.** Three real original PNGs and four derived strips exist and are loaded/drawn by production fishing code. Water ripple/line VFX, pose selection, mutant poses, seven real original WAV cues through existing FX bus. File/hash/frame/audio checks pass. | Cat/mutant matte rectangles and clipped rods/fragments are visible in asset inspection. No clean quadruped cast rig, isolated ordinary/rare fish or ordinary treasure illustration. Water scenes are opaque perspective patches. Runtime pixels, audible mix, HUD phone readability remain unaccepted. |
| CAT-15-07 | **PARTIAL QA.** Full production runtime under DOM/canvas doubles passes inherited and fishing regressions; 17 script syntax checks pass; media validator passes 14 files/16 state mappings; 22 inherited/new WAVs numerically non-silent/unclipped. | Chromium and Google Chrome both fail before page creation. Zero current browser viewports executed; no touch/pixel/audio decode acceptance, Samsung test, FPS proof or natural progression completion. |

## Real image, code and sound evidence

Originals visually inspected in this pass: [location atlas](../art/generated/fishing_pond_world_atlas.png), [cat/gear atlas](../art/generated/fishing_cat_gear_atlas.png), [mutant atlas](../art/generated/abyssal_catch_mutant_atlas.png). They are genuine detailed raster paintings recorded by Pass 02 as Images API output; this QA pass generated no images. Exact original SHA-256 values and paths are in [IMAGE_MANIFEST.json](IMAGE_MANIFEST.json), verified by [FISHING_MEDIA_VALIDATION.json](FISHING_MEDIA_VALIDATION.json). All three allowed originals are already consumed.

Visually inspected derived [cat strip](../art/animated/fishing-cat-strip.png) and [mutant strip](../art/animated/fishing-mutant-strip.png) confirm painted pose reuse and also the matte/crop defects. [Frame descriptors](../art/animated/fishing-frame-index.json) record crop provenance and timing. Location art is attractive flooded city imagery; it does not make the rectangular collision shapes accurate to every painted shoreline. The inherited quadruped hero/tail remains the moving combat body; a separate fishing cat pose is drawn beside it. This is partial presentation, not a complete hero rig or independently painted animation frames.

Production [game.js](../game.js) contains `fishingInit`, `fishingOdds`, `fishingTick`, `fishingResolve`, `fishingHazard`, `fishingDraw`, bounded spawning and collision fixes. [qa/runtime.cjs](../qa/runtime.cjs) calls those actual functions, not a reimplementation. [qa-inheritance-pass05.json](qa-inheritance-pass05.json) records that company, campaign, director, score, hero renderers and company presentation match 1.4 while integrated game source differs.

Seven new actual WAVs: [water](../audio/generated/fishing-water-ambience.wav), [cast](../audio/generated/fishing-cast-splash.wav), [reel](../audio/generated/fishing-reel.wav), [bite](../audio/generated/fishing-bite-warning.wav), [rare](../audio/generated/fishing-rare-catch.wav), [jackpot](../audio/generated/fishing-jackpot.wav), [ambush](../audio/generated/fishing-ambush-tension.wav). These are original offline oscillator/noise compositions, not recordings or new soundtrack production. The inherited music remains. [qa-audio-pass05.json](qa-audio-pass05.json) checks all 22 WAVs: 16-bit PCM, nonzero RMS and peaks below clipping. No listening approval or audible playback is claimed. `cityCue` uses the existing context/FX bus and voice cap; water is currently an eight-second one-shot, not positional looping ambience. Pending asynchronous cue loads can still outlive a restart; mix/ducking remains unfinished.

## Tests and inherited continuity

| Actual check | Result / retained evidence |
| --- | --- |
| `node docs/cataclysm-1-5/qa/runtime.cjs` | PASS; [log](qa-runtime-pass05.log), [results](../qa/runtime-results.json). Full shipped scripts/assets with DOM/canvas doubles. |
| `python docs/cataclysm-1-5/STUDIO/tools/validate_fishing_media.py` | PASS; [log](qa-media-pass05.log), original/derived hashes, frame bounds/references and seven new WAVs. |
| `node --check` top-level scripts and QA harnesses | 17 PASS; [syntax results](qa-syntax-pass05.json). |
| Chromium smoke | BLOCKED before page creation: crashpad `setsockopt: Operation not permitted`, fatal handler initialization, timeout. [log](qa-browser-pass05.log). |
| Google Chrome smoke after source fixes | BLOCKED before page creation, same crashpad permission failure/SIGABRT. [log](qa-google-chrome-pass05.log). |
| Portrait 390×844 / landscape 844×390 | Harness targets both; neither executed. Existing copied screenshots/earlier logs do not count as this pass's proof. |
| Samsung Chrome / Samsung Internet | NOT TESTED on physical hardware. Desktop mobile emulation would still not establish either. |

Inherited regressions re-run: four seeded districts and locked/open gate collision; gate success/retry/third-attempt relief; independent reachable magnet arrow (ordinary pickups excluded); pause-only map; guardian safe perimeter entry/provocation/defeat and gas warning/damage/expiry; unique rare life reward; all 16 recruitment/work paths, own-food accounting, four slots, Mecha component ownership/build/board/fire/heat/repair; nine distinct deaths/revival/grace and terminal reset; 3/4/5 cards, rerolls, solo perks, restart and keyboard movement. No fishing minigame buttons were added. This is function-level regression coverage, not a natural traversal or complete company campaign on a phone.

Wall/spawner checks explicitly cover safe-spawn samples near the city edges/corners and all-open districts, collision-clear aprons/water, nine sampled layout seeds and now flying/phasing movement limits. Ordinary/catch spawn origins use inherited integration bounds. They do not prove every enemy entry socket is connected under every gate/seed, or that squad routing never sticks. Wall paintings remain stretched inherited buildings. Full all-seed reachability and in-browser travel loops remain open collision/navigation risks.

## Tension investigation and bounded handoff

The owner's two Night-100 clears with nine lives are a valid signal of insufficient experienced-player pressure, not proof that all builds are easy. This pass did not replay either run. Source inspection explains why risk can remain mild: mutant HP is fixed at 24, the ordinary enemy HP scale stops at +45%, director population/threat limits suppress pressure, and major kills provide recovery. Fishing currently allows only 24 commitments per run, so it cannot be an unlimited stationary income machine. Plain bait starts at 17% combined mutant/ambush risk; catnip starts at 24%; maximum dwell tier adds 12 percentage points, while rank-2 line removes four. These are table probabilities, not observed natural encounter rates. A strong automatic tail/squad can still erase the mutant before contact.

Pause danger deletion is fixed without indiscriminate enemy inflation. Food drops remain reduced from the inherited 65% baseline to configured 9%; that is meaningful scarcity but could also starve weak squads. High-level mutant scaling, measured time-to-kill, late-build fishing exposure, travel and food survival need a bounded fishing-balance pass with solo and squad evidence. No claim that endgame difficulty is solved.

[EXTRA_PASS_REQUEST.json](EXTRA_PASS_REQUEST.json) requests **one** concrete art cleanup pass using existing originals: remove matte/fragments and calibrate fishing sprite crops/placement without further image generation. Maximum extra-pass budget is three; this report does not authorize an endless browser retry or a 1.6 start. Remaining inherited guardian/crew illustration debt, richer city interactions, missing fishing map/odds UI, unmeasured economy/difficulty and hardware acceptance remain explicitly partial. Keep the candidate/source and diagnostics even if subsequent browser testing exposes a failure.

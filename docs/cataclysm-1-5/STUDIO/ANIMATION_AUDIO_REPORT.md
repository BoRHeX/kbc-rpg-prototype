# CATACLYSM 1.5 — Pass 03 animation and audio

15 November 2026. **PARTIAL: real source-derived media delivered; gameplay integration pending.** This is the animation/composer department handoff, not the systems or final QA pass. Only `docs/cataclysm-1-5/` was written. Prior versions, default site, gameplay, inherited soundtrack and sound controls are untouched. No new image API call or publication was performed.

## Verified source provenance

The actual `STUDIO/IMAGE_MANIFEST.json` and all three listed 1024×1024 PNGs were inspected before preparation. Their SHA-256 hashes match the manifest exactly:

| Original under `art/generated/` | SHA-256 |
| --- | --- |
| `fishing_pond_world_atlas.png` | `32cf84bf4eb0e630a32b47bf5757c1eb3e79d32c50fd9911a61fd7465e46ddcb` |
| `fishing_cat_gear_atlas.png` | `a9230824dccc9930c953793306160cee177dba96364eadd3a48129b93bf90dd0` |
| `abyssal_catch_mutant_atlas.png` | `d9ac10c7594d8a10a11bae3af1ba0b5e7e6be3a24c6f003c83902cfce34ad9dc` |

These are genuine raster paintings recorded as OpenAI Images API output by Pass02. This pass verifies the files and recorded provenance, not a new API transaction. The location source is opaque. Cat/gear alpha ranges 0–254 with 28.78% fully transparent pixels; mutant alpha ranges 0–254 with 43.47% fully transparent pixels. Having an alpha channel does not establish clean isolated silhouettes: painted background shading persists. No missing illustration was fabricated or replaced by a code primitive.

The actual atlases differ from the concept's requested layout and 2048² target. Crops follow the observed 1024² composition, not speculative cells. The cat sheet has a seated idle/wait, upright casting/reeling poses, gear, a fish basket and jackpot chest. The mutant has four different painted poses. The location atlas has canal, pond, sewer, dock and a painted ripple/bobber patch.

## Deliverables and mappings

`art/animated/fishing-frame-index.json` contains source hashes, source rectangles, derivative hashes/sizes, pivots, mobile scale and 16 timed state mappings. Four horizontal PNG strips and four half-size mobile PNG references are delivered:

| Strip | Cells | Cell size | Content |
| --- | --- | --- | --- |
| `fishing-cat-strip.png` | 7 | 256² | idle, wait, cast, bite, caught, windup, reel |
| `fishing-gear-strip.png` | 6 | 192² | rod, fishbone, worm, catnip, fish net, jackpot chest |
| `fishing-mutant-strip.png` | 4 | 256² | lurking, hooked, lunge, stunned |
| `fishing-locations-strip.png` | 5 | 256² | canal, pond, sewer, dock, ripple with bobber |

Mobile references use the same cell order at half dimensions; multiply strip source rectangles by 0.5. Resizing uses nearest-neighbor sampling with preserved aspect ratio and transparent padding. These are 22 crops, not 22 newly drawn paintings. All state holds, pose reuse and water scaling/opacity are derived animation, not newly painted intermediate frames. There is no limb rig claim.

`fishing-sprite-player.js` is an optional reference adapter: load descriptors/images, select time-based poses, hold a readable reduced-motion frame, and draw a thin quadratic canvas fishing line. It installs no gameplay hooks. `fishing-preview.html` offers state inspection and tap-to-play audio when served over HTTP. It is not linked into the shipped game and has not been browser-accepted here. The adapter's canvas line is code-native mechanics/VFX, explicitly not original character illustration.

Integration should select windup → cast → wait → bite/reel → caught fish/treasure/jackpot or mutant warning/lunge/recovery. On movement cancellation, stop the pending catch immediately and optionally play the ≤200ms cancel reference while allowing movement. Descriptor timing is presentation only: game simulation owns commitment, danger and atomic catch awards. Rod-tip anchors are provisional normalized reference points, not calibrated hero sockets. The source includes baked line art; an overlay cannot erase it.

## Original audio files

`audio/generated/fishing-audio-index.json` records seven actual mono, 22,050 Hz, 16-bit PCM WAV files with hashes, durations, peaks, RMS, loop endpoints and suggested buses/gains:

| File prefix `fishing-` | Seconds | Intended trigger |
| --- | --- | --- |
| `water-ambience.wav` | 8.0 | low-gain spot proximity loop |
| `cast-splash.wav` | 0.7 | committed cast landing |
| `bite-warning.wav` | 0.55 | visible bite warning |
| `reel.wav` | 1.0 | cancellable reeling loop |
| `rare-catch.wav` | 1.5 | rare catch resolution |
| `jackpot.wav` | 2.4 | distinct bounded jackpot award |
| `ambush-tension.wav` | 3.2 | warned mutant/ambush entry |

These are original deterministic offline oscillator/noise compositions, not recordings, audio API output, or new soundtrack claims. Water combines low periodic wash and pitched bubbling; cast uses decaying noise/plunk; bite uses three high pings; reel uses a ratchet pulse; rare and jackpot use different ascending phrases; tension uses low beating tones. Inherited music remains primary.

Routing is a **handoff, not implemented integration**: reuse the existing `audio`, `fxBus` and master path in `game.js`, existing user-gesture unlock, volume/mute controls, and eight-voice cap. Load at most one water loop, stop/fade water/reel on pause, movement cancellation, death, restart and end. Invalidate pending async decodes on reset. Route cues through FX and ambience through the existing master at low gain; duck ambience under danger. No new buttons or second AudioContext. The preview's native audio controls are asset review tools only.

## Validation actually performed

`python docs/cataclysm-1-5/STUDIO/tools/prepare_fishing_media.py` reproduces all fishing PNG/WAV files using Python standard library only. Pillow/NumPy are unavailable; package installation failed due DNS restrictions, so no dependency or external service is needed. Source decoding supports the actual RGB/RGBA PNG filters and preserves source channels without alpha keying.

`python docs/cataclysm-1-5/STUDIO/tools/validate_fishing_media.py` passes original/derivative hash checks, PNG decoding, source and strip rectangle bounds, nonempty frames, state references, PCM format/duration, non-silence, no clipping and near-zero loop endpoints. Results: `FISHING_MEDIA_VALIDATION.json`. JavaScript syntax passes. A Node Canvas double exercises all 16 mappings at five times in normal/reduced motion (160 draw calls), plus line drawing: `FISHING_PLAYER_VALIDATION.json`. Actual strips were visually inspected with the image viewer. Tests establish data validity, not game behavior or browser pixel composition.

No listening acceptance, browser audio decode/playback, physical Samsung test, phone readability, sustained FPS or portrait/landscape browser pass is claimed. No fabricated gameplay or publication evidence. Runtime fishing, fish accounting, spawn reachability and CAT-15-07 mechanics tests belong to the later systems/QA passes.

## Explicit remaining art limitations

- Cat poses are predominantly seated/upright rather than a complete quadruped action set. Preserve the inherited moving white hero, independently aimed tail gun and combat rendering. Do not substitute these reference poses wholesale during active combat.
- Cat casting arcs cross neighboring cells in the generated composition. Some cropped rods/lines are truncated and small neighboring fragments remain. No claim of seamless production-ready acting or clean alpha separation.
- Scene crops are opaque perspective patches, not seamless top-down tiles or collision maps. Water patch contains baked bobber/line. Place localized illustrations without stretching a new square district grid; define dry aprons, water targets and reachable spawn sockets in gameplay geometry.
- Isolated painted bobber, isolated normal/rare fish, separate ordinary treasure, clean rod-only overlay and complete quadruped cast/reel sprites remain **MISSING_ILLUSTRATION_OR_CLEANUP**. Basket/chest reuse is explicitly identified. A code bobber/ripple is allowed VFX, never a claim of new painted fish/character art.
- No further image generation was attempted: the approved three originals exist and consume the three-image allowance. Status is partial prepared illustration, not ART-BLOCKED and not full CAT-15-06 completion.

The owner’s 1.4 playthrough, finite four-district walls/spawner concern, preserved solo/company economy and sole implemented Engineer+Shooter fusion remain integration constraints. This media pass adds no gameplay, fusion or 1.6 features. It neither promotes stable nor asserts that the whole 1.5 candidate is playable.

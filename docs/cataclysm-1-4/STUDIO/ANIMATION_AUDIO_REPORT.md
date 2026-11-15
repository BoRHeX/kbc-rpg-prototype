# Pass 03 — animation and audio handoff

**Status: PARTIAL.** Real generated illustrations were used; ART-BLOCKED does not apply. Asset delivery only: no gameplay integration or playable-release claim. Work stays within `docs/cataclysm-1-4/`; inherited 1.3 hero, soundtrack and gameplay are preserved.

## Direct deliverables

- [Human-inspectable animation/audio preview](../art/animated/preview.html): changing illustrated poses over checkerboard, mobile sizes (guardian 80px / Mecha 96px), enlarged views, pause, reduced motion and audio selector. Serve the 1.4 directory over HTTP and open `art/animated/preview.html`; fetch requires HTTP.
- [Frame index](../art/animated/frame-index.json): source hashes/crops, output hashes/dimensions, alpha bounds, foot pivots, world sizes, frame timing, loops and derivation.
- [Guardian strip](../art/animated/guardian-frames.png), [Mecha strip](../art/animated/mecha-frames.png), plus 16 individual transparent references named `guardian-{idle,stalk,attack,hit}-{0,1}.png` and `mecha-{walk,shoot,overheat,repair}-{0,1}.png` under `art/animated/`.
- Twelve `art/animated/city-*.png` illustrated crops: wet street, crossing, waterfront, warm/neon shops, moss alley, arch, paving blue/grey, asphalt, moss ground and water.
- [JS adapter](../art/animated/sprite-player.js): `loadFrames`, `frameAt`, `drawFrame`. Dedicated 256px-cell format; do not feed it to the inherited 96px actor-pack loader. Asset paths in indices resolve from the 1.4 root.
- [Audio index](../audio/generated/audio-index.json): per-file SHA-256, duration, channels, note events, peak/RMS and intended mix policy. [Cinder](../audio/generated/district-cinder.wav), [Sluice](../audio/generated/district-sluice.wav), [Ember](../audio/generated/district-ember.wav), [Terminus](../audio/generated/district-terminus.wav) and [guardian introduction](../audio/generated/guardian-intro.wav) are playable WAVs.
- Ten short WAVs under `audio/generated/`: `beacon-hold`, `gate-begin`, `gate-pass`, `gate-fail`, `gate-relief`, `guardian-warning`, `guardian-hit`, `guardian-defeat`, `life-recovery`, `route-found`.

## Provenance and animation limits

Inspected `STUDIO/IMAGE_MANIFEST.json` and the three actual original PNGs before preparation. All original hashes match pass 02. Producer/model provenance is OpenAI Images API / `gpt-image-2.5-flare`, as recorded by pass 02. This pass made no image-generation calls and leaves source bytes untouched.

| Original in art/generated/ | SHA-256 | Actual content |
|---|---|---|
| city_district_atlas.png | `50229823ce1b3b78f531db8cb5c9f2b7166499eac4a51b777d23e2030f150f1c` | 1024² RGB opaque packed city |
| guardian_boss_atlas.png | `dc90d63a934ff414d97687c9e058de9b83a7625b5a3b037977fd8000a5a45898` | 1024² RGBA, four poses of ONE guardian |
| mecha_and_companion_atlas.png | `634b1273ea7863c4c9110b6e185d02263e42e6c9346fc95e81f01896559cf536` | 1024² RGBA, four machine poses with integrated crew |

Actual alpha exists, including hidden RGB background colors; maximum source alpha is 254. Removed only alpha ≤3 dust, used premultiplied-alpha area downsampling, and padded transparent 256² cells. Guardian crop rectangles follow irregular spacing rather than assuming equal quadrants. No chroma-key replacement, painted body parts, procedural chassis or recolored substitute bosses were made. Reproduction: `python docs/cataclysm-1-4/STUDIO/tools/prepare_assets.py` (standard library only).

Each actor has four different paintings and eight delivered frames. Phase 0 is a cropped painting; phase 1 bakes a 2px upward translation, plus 2px forward for attack/shoot. State descriptors and multi-pose demonstration loops contain real frame references and durations. This is limited pose/transform animation, not a newly painted gait, independent limb rig or directional cycle. Demonstration loops are inspection montages; gameplay must select states from simulation. Pose changes can pop and silhouettes vary. Reduced motion uses a stable frame without changing combat timing.

City crops are STATIC, OPAQUE, and `seamless:false`; they are not transparent props or certified seamless tiles. Their painted rectangular backgrounds must not masquerade as alpha-cut obstacles. Original teal/violet night lighting and rusty orange machinery complement the inherited white hero, but guardian tone is grimmer and fine crew detail at 96px remains limited. Original PNGs and derived strips were visually inspected here; no phone acceptance is claimed.

## Composition and mobile integration

Original deterministic additive/FM and harmonic noise-like synthesis; no stock samples, recorded voices or performers. Reproduction: `python docs/cataclysm-1-4/STUDIO/tools/compose_audio.py`. Four stereo 44.1kHz 16-bit PCM ambience compositions last 24 seconds each (eight bars, 80 BPM). Sparse district-specific note contours sit over low hum and airy partials. One six-second mono introduction and ten short mono cues include a two-second relief stinger. These are electronic compositions; the concept's recorded-sounding rain/rope/furnace foley remains incomplete.

**Listening notes/status: NOT AUDITIONED.** No listening facility was available to this worker. Numeric non-silence, headroom and endpoints passed; perceived harshness, loop fatigue, district distinction and fit with inherited music require listening using the preview. File creation is not listening acceptance.

Pass 04 must use the existing unlocked audio context and master mute/volume; cap new voices at eight, use one ambience at nominal 0.22 gain, cues at 0.6, duck ambience 6dB under warnings and suspend on pause. These are intended integration policies, not implemented game mixer behavior. Preserve inherited main score/Mecha/food sounds. Rate-limit hits; warning once per encounter; reward cues after successful transactions; no repeating arrow sonar. Preview uses HTML audio for audition only.

Runtime textures total **1,329,176 bytes compressed; 5,051,904 bytes decoded RGBA (4.82 MiB)**. Load sheets and city crops, not original atlases and individual references too. No per-frame canvas allocation is needed. WAV masters total **18,476,796 bytes (17.62 MiB)**; one stereo float ambience buffer uses **8,467,200 bytes (8.07 MiB)**. Lazy-load one district and release the old buffer. Optional compressed audio derivatives remain undone; do not preload all four WAV loops on mobile.

## Verification and remaining gaps

[Asset validation results](qa-pass03/asset-validation.json): PASS for original/output hashes, PNG dimensions/alpha, all frame bounds/timing references, all 15 WAV headers/durations, nonzero samples, no clipped samples and near-zero loop endpoints. Reproduce with `python docs/cataclysm-1-4/STUDIO/tools/validate_assets.py`. JS module syntax check passed.

Browser preview verification is BLOCKED: local HTTP server socket creation returned `PermissionError: [Errno 1] Operation not permitted`; Chromium failed creating its headless user-data container ([log](qa-pass03/chromium.log)). No browser playback screenshot, audible mix approval, gameplay integration, FPS or Samsung test is claimed.

Pass-02 output differs from concept's proposed 2048² 4×4 sheets: only one guardian identity exists, not Bellkeeper/Mother Dredge/Kiln-Mother/Last Conductor. Separate crew poses, build/board paintings, switch/locker/pallet states and transparent city prop sprites are missing. Do not relabel one boss as four unique painted guardians. Keep art status PARTIAL; further illustration needs a separately budgeted art pass.

Pass 04 may integrate these real guardian/Mecha textures with a dedicated adapter and retain inherited renderers until new PNGs decode. Preserve the hero/tail, nine lives, cards, companions, fish ledger and fusion ownership. CAT-14-04/08 remain incomplete against the four-guardian/full-city-art concept. Map/arrow/gate mechanics and browser portrait/landscape QA remain with passes 04–05. No stable promotion or publication was attempted.

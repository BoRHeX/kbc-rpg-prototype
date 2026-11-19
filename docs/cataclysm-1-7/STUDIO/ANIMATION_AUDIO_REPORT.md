# Cataclysm 1.7 · The Long Night · Pass 03

All three supplied Image API PNGs were present and matched their recorded SHA-256 hashes. Pass 03 used the existing three API outputs. [Image provenance and full per-file hashes](IMAGE_MANIFEST.json)

| Original PNG in `art/generated/` | SHA-256 |
| --- | --- |
| `long_night_chapter_city_atlas.png` | `a681f1f76dcb8e998a7a1faef720010989d81a62b5a3785e7004203560f4f5e4` |
| `long_night_ten_chapter_emblems.png` | `77247d8b05a06cd4ba0985bf8d44f9d37bc04ddb512b8e408c83eb29dc3b34b4` |
| `long_night_climax_boss_stage.png` | `000f6a402fddd8589e5fec788163016d94ab6872fb2af356a2cec1bc9b3fcf12` |

## Pictures and transitions

- Seventeen exact-pixel PNG crops went into `art/animated/`: four city plates, ten alpha emblems and three finale elements. The frame manifest records source rectangles, dimensions and SHA-256 for each frame, the chapter-to-frame mapping, and banner timing. Four city plates recur across ten chapter-specific emblems. The tightly spaced lieutenants and squad are grouped stage art, and the banners animate still frames with drift and fades. The in-game enemies retain the inherited animated sprites. [Frame manifest](../art/animated/long-night-frames.js) · [Rebuild script](build-chapter-media.py)
- Chapter arrivals and checkpoint resumes show a brief, passive banner with an HTML title and detail over raster art painted with Canvas `drawImage`. The persistent HUD gives the current chapter or finale objective. The banner has portrait and short-landscape positioning, hides outside active play, and disables fade and drift in reduced-motion mode. [Banner and HUD code](../game.js#L2159) · [Mobile styles](../game.css#L395)
- At Night 1000 the gateway marks the current light behind combat actors. The gateway, lieutenants and squad art mark the light, escort and final-boss transitions. Story arrivals now announce the actual encounter name without first queuing the inherited roster name. The inherited finale aura is scoped to the Night 1000 boss in the campaign. [Finale progression](../game.js#L2052) · [Gateway in world render](../game.js#L3174)

## Score

Ten original ambient loops and three original stingers were composed in the rebuild script and rendered as 22,050 Hz mono 16-bit PCM WAVs under `audio/generated/`. Loops run 8–12 seconds with chapter-specific voicings and rhythmic figures. Arrival, light and gauntlet stingers run 1.6 seconds. Each normal chapter uses its loop in place of the district ambience underlay, alongside the inherited adaptive score and encounter cues. [WAV hashes and durations](IMAGE_MANIFEST.json) · [Compositions](build-chapter-media.py)

The game calls the chapter scheduler from its music update. Web Audio decodes the WAVs, starts one looping source and up to one stinger through the shared music/master buses, and stops both on mute, pause, upgrade, revival, backgrounding or terminal state. Pending decodes are invalidated on state changes. The cache retains the current chapter and up to three cues. [Game audio hook](../game.js#L716) · [Web Audio source scheduling](../chapter-media.js#L42)

## Checks

- Recomputed hashes for the three originals, all crops and WAVs, and the frame manifest. Verified exact crop pixels, PCM layout, expected duration and nonzero audio data. All 260 files under the 1.69 baseline's `art/` and `audio/` trees have byte-identical counterparts in 1.7.
- `node qa/long-night-fixtures.cjs` passed. The production scripts reached draw calls for all 17 chapter PNGs with the Canvas double. The audio double verified WAV-backed loop/stinger scheduling, retirement on transition or pause, and cancellation of stale decodes. The same run passed the 630-tick boundary, checkpoint and replay cases, segmented Night 1–1000 progression, finale and Endless unlock.
- The Chrome fixture could not load Playwright. Direct headless Chromium with a writable temporary profile aborted before navigation at `sandbox_host_linux.cc:41` with `shutdown: Operation not permitted`. Portrait/landscape screenshots, real browser audio decoding and mix, physical Samsung testing, uninterrupted campaign play and 30-minute endurance remain unverified. [Browser harness](../qa/long-night-browser.cjs)

## Integration file hashes

| File | SHA-256 |
| --- | --- |
| `game.js` | `984f890fd017e12bc71bc1eebefd38c6ab68b1ea98b79847240f73acda4217ad` |
| `index.html` | `566e3f7d1990a4db08a12e8e20bc090e8b565a798955575669c48ec4fb06e8f7` |
| `game.css` | `9844d017a531958ef508104477ff1c5c0ca37cd3baa945b261ab1a66d1cee697` |
| `chapter-media.js` | `a45239feaa907a3a01668b43265fdd829ddbf14067367013a4fcc4d280e74e4d` |
| `art/animated/long-night-frames.js` | `8f143c5ce465ca86050f5ae3f103073464a7695dec5bb5c7d1fbd7490ea88ff0` |
| `STUDIO/IMAGE_MANIFEST.json` | `0d2f9ff75216c608b1d185e8f0789a82443557051054a21277fd05f248defcb0` |
| `STUDIO/build-chapter-media.py` | `ab7cdbcc840dcc67e8c42ca24c8ab2c6085a28a16ae03a1d5b92ad4b4406b506` |
| `qa/long-night-fixtures.cjs` | `dde1be90f0776e8fe3e99a1ac16eed942c33a52c26bfc4de9684034ffb640f76` |

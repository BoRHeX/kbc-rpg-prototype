# Cataclysm 1.69 — The Wild Card

Pass 03 sprite preparation, animation mapping and original audio. The deliverables are 15 source-backed RGBA cutouts, three runtime atlases, one adaptive music loop, four cues and the media hooks for Pass 04.

## Painted sources and derivatives

Verified the three local source files against the byte sizes and SHA-256 hashes in [IMAGE_MANIFEST.json](IMAGE_MANIFEST.json). Inspected the decoded paintings. All three are 1024×1024. The Archivist and prop sheets have alpha range 0–254. The RGB plaza painting is opaque.

| Source | SHA-256 |
| --- | --- |
| Archivist character atlas | `adbb3e5362a4d9355ff541aa1f4300a43dca542422e20f0961c67bd088770942` |
| Midnight Festival world atlas | `390d280588dad0ac97a77fce57602d913ff74b092b664cd3d7dfc7d3d48e1102` |
| Fusion and festival prop atlas | `515f419b69ccd88bfc85b5cb34ff5a0cdf8737d914294021f0eaf9c38854e720` |

The Archivist cutouts cover stride, listen, read, ward, heal and alarm. Their annotated foot pivots register the poses at 55–70 world units across. Polygon masks separate painted prop silhouettes at overlapping crop boundaries and can clip some peripheral glow. The court derivatives preserve opaque painted rectangles for the plaza, facade mural, stall and inset street rune. The transparent props supply the rune disk, lanterns, scroll chest, carved cat mural and resonance cockpit vignette. The cockpit is an effect illustration for the festival, with the inherited Mecha artwork available for the actual squad actor.

The runtime uses half-resolution packed atlases with approximately 3.69 MiB of decoded RGBA combined. The full-resolution individual crops are retained for inspection and further authoring. Atlases and WAVs total 1,987,791 bytes for runtime requests. The archived standalone PNGs add several MiB to the directory. [Frame index with per-file SHA-256, source and packed rectangles, masks, pivots, scale and timing](../art/animated/wildcard-frame-index.json)

The source lacks an in-between walk cycle, blink frames, separate cup/saucer gestures and an empty-to-set supper mural sequence. The walk state holds the single painted stride, the reading chain transitions from listen to open book, and ward/heal/alarm return to listen. The court painting supports a street vignette with lanterns and a carved mural. Mobile visual readability still needs browser review.

## Original WAVs

| Index key | Length | Composition and use |
| --- | ---: | --- |
| `festival-bed` | 10 s | Four bars at 96 BPM. Plucked nocturnal melody, bass responses and soft offbeat brushes. Loop samples 0–240,000 with an exclusive end. |
| `fusion-pulse` | 480 ms | Rising metallic notes over a low curved tone for automatic synergy. |
| `archivist-lore` | 760 ms | Brush attack and falling ceramic notes for a glyph or lore reveal. |
| `event-reward` | 910 ms | Ascending four-note arpeggio for the reward. |
| `stage-shift` | 690 ms | Low sweep with an answering two-note figure for a stage transition. |

The cues and loop were composed for this pass and rendered as 24 kHz mono PCM16 from oscillators and seeded brush noise. The loop's wrap step is 33 PCM counts (approximately −60 dBFS). [Audio index with WAV paths, SHA-256, sample counts, loop points and peaks](../audio/generated/wildcard-audio-index.json)

## Pass 04 handoff

- Call `CATA_WILDCARD_ART.draw(ctx, frameKey, worldX, worldY, scale)` for the packed scenery and props, and `drawArchivist(ctx, state, elapsedMs, worldX, worldY, scale)` for timed Archivist poses. Both return a draw-success boolean. The optional scale defaults to 1. Cull draws at the game call site. [Raster runtime](../wildcard-art.js)
- Set `game.wildcardMedia.festivalActive` during the scoring window. The inherited mixer selects the quiet festival bed ahead of pressure music and behind last-life, boss, committed fishing and mutant beds. This reuses the existing crossfade and score underneath. For a cue, replace `game.wildcardMedia.cue` with a fresh object containing `name` (one of the four one-shot keys above) and `started` (current simulation seconds). Cues share the effects cap, allow one festival voice, expire if stale and are discarded across pause or restart. [Shared media runtime](../mutation-media.js)
- Festival timing, district placement, rendering call sites, Archivist behavior and aura gameplay are Pass 04 work. The Pass 03 hooks require those call sites to present the assets during a normal run.

## Verification

- Decoded and checked every PNG, verified atlas rectangle bounds and pivot bounds, and compared packed pixels against the corresponding subsampled source crops. Verified all indexed SHA-256 values, WAV headers, sample counts and peaks.
- A Node VM fixture exercised draw selection for the listening-to-reading transition, festival WAV loading, fishing and mutant priority, shared effects accounting, reset and resume without cue replay. The inherited `node qa/runtime.cjs` suite passed with its DOM, canvas and audio doubles, including mutant entry and cue loading, fishing/catch and fish economy, and Mecha/four-slot fixtures.
- Compared inherited art and audio against 1.6. All inherited files in those directories match. Browser rendering, live Web Audio mix, mobile performance and physical-phone testing remain unverified.

| Indexed deliverable | SHA-256 |
| --- | --- |
| Frame index | `b9695615da2bf401773ebd84a4dceb3cd5c249dd69c3b06d5c4390aa116ab502` |
| Audio index | `6885b0ce34d48b8d7934f91a1e2fb271cb9aad191338e81ce0385113a8602eb7` |

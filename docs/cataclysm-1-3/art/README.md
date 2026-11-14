# Catastrophe: ink, rain and broken neon

Original locally authored artwork. Rebuild with `python docs/cataclysm-1-0-major/art/generate.py` (Pillow and Node required). No downloaded assets, fonts, models, licensed designs or network requests are used by the generator. The council in `artifacts/cataclysm-art/ART_COUNCIL.md` informed the complete roster, role equipment, tier silhouettes and fallback integration.

The 41 horizontal RGBA atlases use 96 × 96 frames, painted at triple resolution and downsampled. Six hero states have 24 frames each; eight allies have 12 each; 27 zombie archetypes have six each. All 41 atlases are byte-distinct, and each frame is pixel-distinct within its sheet. This is 402 rendered frames, including the additional 24-frame attack sheet; the existing public `frameTotal=378` contract is deliberately preserved.

Living cats have reflective eyes, intact ears and role equipment. Undead cats have torn ears, deep sockets, exposed teeth and wounds. Larger threats add capes, horns, metal plates, wings, plague sacs, oversized jaws, broken crowns and shards. The white hero wears a coral scarf; feral poses add a hot scarf and snarling expression, adrenaline adds speed marks, attacks recoil, and legs, arms, tail, head and cloth articulate independently. `review-cast.png` is a contact sheet of the actual assets; guns are continuously aimed by a separate runtime layer.

Four seamless 300px ground paintings combine beveled cobbles, gritty asphalt, drains and wet lines in harbor, overgrown, ember and violet moods. Three 288px city paintings supply brickwork, windows, fractured neon glyphs, steel car panels, cracked glass, rust and dumpster ribs. Existing late-game firestorm rendering remains responsible for catastrophic fire and hazard visibility.

`animation.js` eagerly loads and decodes every atlas, uses source rectangles in `drawImage`, and exposes `assetStatus()`. Origin (48,58) places feet at the procedural renderer's +24 local-pixel ground contact. Radius scaling is unchanged. Missing/loading assets retain the existing articulated renderer. `visuals.js` likewise falls back per environment asset. No runtime bitmap generation is used. The existing public visual pass, pose API and reduced-motion behavior remain intact.

## Verification in this workspace

- Passed unchanged: `major-systems.cjs`, `visuals-scroll.cjs`, `spawn-economy.cjs`.
- Passed unchanged: `art-integration.cjs` in `/tmp/cataclysm-art-qa`, an isolated copy with the workflow's exact animation/visual/art mirror applied. The repository's Night 99 directory was not edited.
- Additional local checks verified true alpha, all 402 within-atlas poses distinct, source rectangles against actual PNG dimensions, eager load accounting, failure fallback and balanced Canvas saves/restores. Mock-image checks do not establish real Chrome decoding or performance.
- Both required Chrome tests were attempted. Chrome exits before opening a page because this sandbox denies socket operations (`setsockopt: Operation not permitted`); the HTTP server is also denied socket creation. Real viewport/load QA and gameplay screenshots are still required in the workflow environment.
- GitHub CLI has no authenticated account here. No PR, merge or Pages publication is claimed. The existing art-studio workflow performs mirroring, browser gates, screenshot capture and PR creation after this coding step.

Gameplay files, audio, balancing, controls, campaign, spawner and finale mechanics were not edited.

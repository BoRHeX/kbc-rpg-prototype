# EXECUTIVE PRODUCTION ORDER — BO RHEZ GAMES STUDIO
## CATACLYSM 1.0: THE CATASTROPHE — ART PASS 01
### Objective: CREATE ORIGINAL GAME ART AND APPLY IT TO THE PLAYABLE GAME

This is a BUILD order, not a concept request. Read and incorporate artifacts/cataclysm-art/ART_COUNCIL.md, created by five independently thinking studio agents (Producer, Designer, Researcher, Engineer, Critic). The producer does not get to cut scope, and the coder does not get to submit mockups instead of working game art.

**Current authoritative game:** docs/cataclysm-1-0-major/, booted via its index.html; animation.js exports CATA_ART, visuals.js exports CATA_VISUALS, and game.js uses ART.draw and VIS.ground/VIS.prop. This build already works. Cataclysm 1.0 begins at LEVEL 0/NIGHT 1 and has a carefully scripted 18-major Night 100 finale. The separate docs/cataclysm-100-lab/ is the LEVEL 100/NIGHT 99 stress test. **DO NOT TOUCH game logic, balances, controls, audio or spawner.** The studio should demonstrate artistic competence, not rewrite proven systems.

### Art direction
Create a cohesive **premium 2.5-D illustrated neon-noir apocalypse**: expressive white hero cat with distinct scarf and machine gun, eight recognizable companion cats (healer, tank, shooter, brawler, sniper, engineer, trapper, bard), and a varied bestiary of **zombie cats**, not generic circles with differently colored labels. Richly lit cobblestones and asphalt, dark urban masses, broken neon signs, wreckage, wet reflections and multiple biome moods. At Night 99/100, firestorm and defeated city feel catastrophic without hiding projectiles, safe zones or enemies. Art should be significantly different in screen captures from the existing simple Canvas silhouettes.

Treat this as authored game artwork, not CSS decoration. Require distinct head/ears, torso, limb shapes, equipment, facial expressions, damage, lighting/shadows and character proportions. Zombies should look undead and threatening, not copies of the allies. Bosses need memorable large silhouettes; super-elites and elites visibly differ from normal zombies at game scale. Avoid copyrighted character designs or external licensed assets.

### Production requirements — real files and integration
1. **Produce 41 or more actual transparent PNG sprite atlases** in docs/cataclysm-1-0-major/art/ using Python/Pillow/CairoSVG or other locally installed tools. Use an authentic illustrator-style pixel-art/painted look with multiple shading layers and secondary highlights, NOT plain rectangles and flat random geometry. The runtime must load these files, not a description of them. No network/CDN downloads, no external fonts, no internet image scraping. You can write a reproducible generator under art/ (Python and Markdown allowed).
2. Exact atlas names and frame counts:
   - `hero-idle.png`, `hero-run.png`, `hero-hit.png`, `hero-feral.png`, `hero-adrenaline.png`, `hero-attack.png` — **24 distinctly rendered frames each**.
   - `<ally-id>-run.png` for ALL EIGHT from `CATA_ART.allyIds` — **12 distinct frames** each.
   - `<enemy-id>-run.png` for ALL TWENTY-SEVEN from `CATA_ART.enemyIds` — **6 distinct frames** each, including 9 normal, 9 boss, 6 elite, 3 super-elite.
   - Use a horizontal sheet, transparent RGBA, minimum **64×64 pixels per frame**, preferably 96×96. Each animation pose must include visible motion beyond a trivial hue change or whole-sprite wobble (limbs, bounce, recoil, expression, cloth or weapon). At least 37 atlases must be byte-distinct; preferably all unique.
3. Produce environmental art: at least four original tileable ground/biome texture images and three city-prop visual assets (building, parked car, dumpster), with differentiated material and architectural detail. Integrate visibly through VIS.ground and VIS.prop. Provide graceful fallback to existing rendering if a file fails.
4. **Modify only `docs/cataclysm-1-0-major/animation.js`, `visuals.js`, and new `art/**` files.** You are NOT authorized to edit game.js, campaign.js, director.js, hazards.js, firestorm.js, index.html, tests, workflow files, game.css, other games, or 0.9. The art studio workflow automatically mirrors the final animation, visuals and art directory into the Night 99 stress test; do not edit that directory yourself.
5. Make `ART.draw` actually use `CanvasRenderingContext2D.drawImage` with decoded atlas images and source frame rectangles; scale and align sprite feet, weapon aim and collision radii correctly. Do not replace an articulated character by a static bitmap. Preserve `frameCount`, `pose`, `frameTotal=378`, `draw` semantics, attack recoil, damaged flash, reduce-motion behavior, correct canvas save/restore balance. Fall back to existing procedural art while images load or when they cannot be loaded.
6. Expose `CATA_ART.assetStatus()` returning `{loaded,failed,total}`. Eagerly initialize the 41 atlases (without failing under Node.js when Image is absent). There must be no missing image fetches and the actual game should use the painted sprites after loading. Avoid unbounded per-frame object allocations and runtime raster-generation. Keep mobile Samsung portrait/landscape responsive.
7. In visuals.js preserve current `pass` and public API contracts and ensure the new textures are actually drawn during streetScene. Use subtle ambient shadow/light/reflection details and richer prop surfaces, but prioritize character quality and gameplay readability.

### Evidence required before any studio claim of success
- `node game_factory/cataclysm_next/tests/art-integration.cjs` passes: 41 files, real transparent PNGs, frame resolution and unique image content.
- `node game_factory/cataclysm_next/tests/major-systems.cjs`, `visuals-scroll.cjs` and `spawn-economy.cjs` pass unchanged.
- `node game_factory/cataclysm_next/tests/browser-major.cjs` passes eight real Chrome viewport gameplay checks, including starting at Level 0/Night 1.
- `node game_factory/cataclysm_next/tests/browser-art.cjs` passes: >=40 sprites loaded, zero failures, both real gameplay links active.
- Source and stress-test art must match exactly; preserve Night 100 mechanics.
- Save human-reviewable screenshots (full game and Night 99) in artifacts/cataclysm-major/.
- A successful run must create an integrated-art PR; do NOT call it published until merged and GitHub Pages confirms it.

The user requested: **"tell the studio to create art for the game and apply it."** Do the artwork and integration yourself in this coding job. Do not stop after a roadmap, a design memo, a palette swap or an unplayable collection of sprites. The five-role council is advisory. Make the game visually compelling while keeping gameplay intact.

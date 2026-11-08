# Cataclysm 0.9 — Graphics Experiment (isolated)
This is an explicitly authorized ONE-SHOT visual overhaul, not a release.
**Branch:** `experiment/cataclysm-09-graphics`; **production version:** 0.9. Production files in `main` MUST NOT be modified. Work on this branch only.

## Assignment
Make a bold, visually coherent and immediately recognizable upgrade to the EXISTING 2D Canvas game at `docs/preview/`. Preserve gameplay, difficulty director, city events, companion abilities, relics, upgrades, achievements, keyboard/touch physics, level logic, timers and data semantics. Do not change existing enemy collision or spawn calculations for cosmetics. No new dependencies/network requests/assets, no large new files, no asset fetching, no canvas 3D/WebGL rewrite. Edit only `docs/preview/game.js`, `docs/preview/game.css`, and if absolutely needed `docs/preview/index.html` (the runner will reject everything else). Preserve `BUILD = '0.9'`, existing build handshake, metadata/cache-busting compatibility and all element IDs.

## Visual goal
Make Cataclysm look like a purposefully art-directed, watchable survival game: **stylized nocturnal ruined city, readable silhouettes, cinematic but performant 2D lighting, and characterful cats**. The previous visuals are primitive geometry and a flat blue-gray grid. Replace their visual language while staying clear and playful, rather than a generic particle-color tweak.

Producer / Design reasoning (record briefly in the final job summary) should prioritize:
1. **Environment composition.** Richer readable streets, sidewalks, crossings, cracks/debris, variation in pavement and building facades/windows, curb/road lane detail. Cheap deterministic drawing, repeatable camera-safe variation, cull anything outside the camera. The city must feel like a city, not an abstract grid. Existing background geometry remains non-solid unless already solid.
2. **Hero and allies.** White hero cat with recognizable cat ears, face, tail, body, weapon and readable facing or animation cues. Shooter, healer and tank each visibly distinct via gear/silhouette/colors/weapon/medical/armor iconography; small sprites must remain legible on mobile.
3. **Zombie roster.** Distinct enemy cat silhouettes and visual identity for shambler, weaver, dasher, orbiter, stalker, ghost, gas, boss; visually communicate speed and danger. Mutation symbols, enemy charge telegraphs and boss health must remain legible.
4. **Impact and atmosphere.** Muzzle flashes, recoil, bullet trails, contact flashes, hit feedback, pickups, companion active ability feedback, power/relic highlights, city event warnings. Use controlled particles, no epileptic flashing.
5. **Mobile UI polish.** Refine HUD, overlay, upgrade cards and buttons with consistent typography/spacing, preserve single-screen LANDSCAPE; avoid blocking movement canvas or shrinking controls. Check 844x390 and 640x320 landscape plus 390x844 portrait. Keep text and color contrast high and user choice clear.

## Nonnegotiables
- **Version remains 0.9** in title, header, game JS BUILD, and preview identity. Add a visual experiment identifier only as auxiliary label if safely possible; do not make live users think 1.0 shipped.
- Keep current functionality of joystick, pause/resume/restart, sound, camera tracking, 3 companion abilities, tactic, relic controls, XP, timers, boss, dynamic enemies and city events, stored best score; no change in gameplay math.
- Target efficient Canvas2D use: cache or bound textured patterns; render only what is on screen; avoid full-map per-frame expensive gradients and thousands of draw calls; performance at dense enemy counts matters more than needless glow.
- No external imagery/fonts/CDNs/sounds; use original vector/procedural illustration. Avoid copyright/trademark-dependent assets.
- Store the resulting artwork in existing JS Canvas and CSS, not new files. Do not edit workflows, docs/games, docs/experiments, game_factory tests, or project config. The trusted pipeline will package and preview separately.
- Include meaningful visual changes in several domains, not just CSS recoloring. Prefer cohesive depth + memorable characters over maximum detail.

## Deliverable
A testable graphical overhaul committed ONLY to the experiment branch by the trusted workflow, with before/after screenshot artifacts. If the scope risks destroying playability, prefer a smaller coherent overhaul and report limitations. **Never autonomously merge into main or replace the current 0.9 live game.**

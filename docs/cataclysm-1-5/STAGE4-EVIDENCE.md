# Stage 4 — world, touch UI and upgrades

Implemented in both playable modes; campaign starts Night 1 and the laboratory keeps its Night 99/100 setup. Version remains 1.0. Earlier stage work and supplied PNGs retained.

- Painted ground uses a 670px world grid, deterministic longitudinal variation and continuous lane alignment. Removed procedural paving, facade, window, vehicle and dumpster overlays/fallback drawings. Roofs use square 218px contact footprints; vertical cars use 72×126px footprints in the road, bins remain on pavement. Texture alpha margins extend outside collision footprints and provide bounded contact shadows.
- Removed persistent companion/hero aura decoration, reduced shot glow, brief special bursts and trap fill opacity. Follower labels moved off the combat field into interactive 44px+ touch controls; interruption/preparation colors and stationary healer / nearby trapper / charging tank hints use live engine states.
- Collapsible settings contain sound, volume and restart. Pause, tactics and held relic remain accessible on the combat rail. Portrait squad row and landscape rail respect safe areas. Upgrade dialog scrolls on constrained screens with four cards in two portrait columns or four landscape columns.
- All existing upgrade IDs, permanent roles, four-active cap, weighted distinct offers, reroll tokens and frozen upgrade simulation remain. Cards show category, supplied companion sprite art or symbolic icons, current/next values and engine-supported synergy hints. Fire-rate investment has diminishing returns shared by preview and application. Fully capped armor/critical and squad range without companions are excluded. Existing rank/overflow options remain available.

## Sandbox evidence

Passed:
- JavaScript syntax checks for both game entry points and shared visuals.
- `node game_factory/cataclysm_finish_acceptance.cjs presentation` (includes follower and painted animation contracts).
- `node game_factory/cataclysm_finish_score_contract.cjs`.
- Existing `major-systems.cjs`, `spawn-economy.cjs`, `art-integration.cjs`, `visuals-scroll.cjs` in `game_factory/cataclysm_next/tests/`.
- Temporary VM harness executed each mode's actual offer functions for 1,000 draws: exactly four distinct offers per draw, capped and missing-squad options excluded, diminishing rate factor 0.85 initially / 0.925 after 12 investments.
- Byte parity of shared visuals, animation, follower module, scoring and all art; Stage 4 CSS rules identical. Existing CSS mode-comment difference retained.

Trusted runner still needs real Chrome screenshots/touch checks on portrait Samsung and short landscape screens, upgrade/recruit/reroll interactions, boss warning readability under load, and frame-pressure measurement. No Chrome screenshots, FPS results or image generation are claimed by this sandbox stage. No tests, workflows, request files or protected painted hero states were edited.

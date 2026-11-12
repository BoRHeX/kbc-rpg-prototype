# BoRHeZ Games — reusable Art & Animation Department

**Milestone:** independently transform one visual reference into an expressive, multi-state animated character, integrate it in a playable game, review the actual pixels, and publish only a proven result. Cataclysm's white hero is acceptance test #1, **not** authorization for another environment/enemy graphics overhaul.

## Contract / future games
- Each job is a JSON manifest under `jobs/`. Point `source_dir` at any game under `docs/`, supply `reference` PNG (a single image, a frame, or a sprite sheet), state names, frame count/size, and game-specific browser acceptance. No daily or automatic schedule; run by explicit job change or workflow dispatch.
- **Visual scout** sends the actual reference image to a vision-capable model and records style, silhouette, body-part topology, palette, pose/motion and ambiguity. It must not simply guess from a filename.
- **Artist/Animator** creates independent frame art from the reference (a reproducible generator is mandatory). Character consistency and articulated movement outrank frame count. The allowed output is manifest-controlled; never patch unrelated games.
- **Integrator** binds frames to the game's actual renderer, tests sprite pivot/scale/orientation/fallback and runs the playable game in Chrome.
- **Independent QA** checks transparency, each frame's meaningful pixel change, no renamed old files, reference identity, motion, real loaded assets, runtime errors, mobile visibility and screenshots. A multimodal reviewer sees reference, animation contact sheet and screenshot, and can fail the build. Mechanical pass alone is not acceptance.
- **Publisher** can merge the verified PR and deploy to the existing Games Hub; verifies published asset hash and playable URL. If any gate fails, no merge/deploy. Screenshots, contact sheet, rationale and review are retained as workflow artifacts.

## Non-negotiable evidence
1. Original generated character sheets have a committed, reproducible source; all named states and exact frame dimensions. Every sheet **must differ** from the repository's original.
2. Observable joint/expression movement between frames; image-only pose swaps or color shifts are rejected. Preserve recognizable anatomy across states.
3. In-browser `CATA_ART.assetStatus().failed === 0`, actual gameplay at mobile size, animation render test, no JS exception or 404.
4. Multimodal critique must separately evaluate identity consistency, meaningful movement, aesthetics/readability, and true in-game integration; scores below manifest minimum fail.
5. Published assets are byte-verified against committed candidates. Do not claim acceptance based only on workflow submission.

For another game: supply a corresponding character manifest and integration/acceptance adapter (browser script), not a copied Cataclysm-specific workflow. This is capability infrastructure; game-specific asset rules live in job manifests and adapters. Initial browser adapter intentionally tests Cataclysm, while the central producer, vision reviewer and mechanical animation checks are reusable.

**Cost/control:** explicitly requested runs only, one art job at a time, preserve API budget; stop when the gate fails rather than looping uncontrolled. Requires repository `OPENAI_API_KEY` for Codex and the two independent vision reviews.

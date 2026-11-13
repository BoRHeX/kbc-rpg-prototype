# Cataclysm 1.1 — illustrated main cat

**Authoritative visual source:** `hero-illustrated-pose-sheet.png` is the exact owner-approved illustration generated in ChatGPT and delivered as original PNG bytes. **Use these actual image pixels as the reference.** Do not ask a coding agent to re-draw the cat using Canvas, SVG primitives, Pillow ellipse/rectangle tools, geometric rigs or generated procedurally assembled limbs.

## Canonical character
Cute white quadruped, large expressive turquoise eyes, pink ears/nose, fluffy cheek/chest fur, bold coral-red band across back, natural four-paw cat anatomy, expressive illustrated shading and clean distinctive silhouette. Keep proportions and identity consistent between states. The concept sheet contains **no tail, gun or weapons**: do not add any for this artwork approval pass.

## Source poses (left to right)
Row 1: neutral stand, joyful idle, walk, sprint / leap.
Row 2: crouch, pounce, startled, hurt / grimace.
Row 3: rage, determined, relaxed sleep.

## Rules for the art department
- Reference pixels are the starting art; the sheet is not permission to create a similar but inferior code-drawn cat.
- Use image-based sprite extraction, retouch, mask/alpha cleanup or image-model editing **based on this actual artwork** for production sprites. Drawing geometry in source code is permissible for collisions and overlays, NEVER the visible character body.
- Do not use the old Cataclysm 1.0 humanized/IK torso/leg asset requirements for this new quadrupedal hero.
- Keep the illustrated **body** separate from any future moving tail or weapon system. No gun or tail in this reference sheet.
- A sprite should be an actual image asset and the game should display the asset with `drawImage` or equivalent.
- This commit is a **visual identity/reference pass only**; do not claim that a new in-game animation has already been installed.
- No art-director perfection bureaucracy; playful jank is welcome once the actual illustrated design is preserved. Prevent blank-screen failures when subsequently integrated.

Main Cataclysm 1.1 remains playable at `docs/cataclysm-1-1/`. Never modify frozen `docs/cataclysm-1-0-major/` or `docs/cataclysm-100-lab/`.

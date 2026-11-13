# START WORK NOW — Cataclysm 1.1 · EVERYTHING DRAWN
BoRHeZ Games Studio production order, 13 November 2026. Issue: https://github.com/BoRHeX/kbc-rpg-prototype/issues/82

## Your mission and freedom
Implement a **real playable Cataclysm 1.1** using the 1.0 campaign code already copied to `docs/cataclysm-1-1/`. Make a substantial, playful build **in this one coding run**. Do not just plan, write reports, or rename the version. Existing architecture stays wherever useful; invent whatever new art/mechanics make 1.1 enjoyable. Preserve the 1.0 running game, not its old visual constraints.

**Critical new creator policy: PLAYABLE FIRST.** Jank is an asset. Strange animations, ridiculous behavior, imbalanced waves, awkward UI and interesting bugs are welcome. The only hard release gate is that the game opens, can start and paints real playable frames, without an immediate fatal crash. Do **not** spend this run on giant test suites, art-director votes, physics perfection or extensive release paperwork. If something is rough but playable, SHIP IT. Keep the existing music, play/pause/restart, mobile touch and desktop movement functioning.

## Specific must-have 1.1 changes — implement, don't summarize

### 1. White cat: original DRAWN quadruped, tail gun only
- Reimagine the current white hero as a **cute four-legged cat**. Draw/render original textured illustration or coherent painted sprite assets (Pillow/CairoSVG are installed; an illustrated atlas/asset-generation Python script is fine). Keep personality, eyes, ears, scarf and expressive face.
- The body is **independent of combat direction**. Use one sideways or three-quarter character presentation, with animated **four-leg gait**, not 8 directional hero sheets. Move forward/back/up/down in world space without changing its illustrated facing to attack.
- Separately animate/aim a visibly attached flexible **tail with a small gun at its tip**. Rotate and track the existing auto-target angle independently of body movement. Body should not rotate to aim. Gunfire and muzzle effects visibly follow the tail direction; where practical set actual projectile spawn at muzzle.
- Animate recognizably different **idle (breathing/blinking), running (four paws stepping), hurt/stagger, adrenaline, rage/feral, shield**. The body can remain simplified/artfully exaggerated. Even funny hand-drawn deformation is preferable to mechanical kinematics perfection.
- Remove/re-route old two-hand pistol/directional full-body visual logic for hero ONLY; do not remove the useful remainder of animation/actor art system. Do not stack old human-shaped hero underneath the new cat.
- IMPORTANT: The three-gun system (two hands + tail) is reserved for **2.0**. For 1.1 the existing primary character weapon is represented as **a single tail gun**, not new slot UI.

### 2. Followers: everyone shoots except Brawler
Eight existing roles: Shooter, Healer, Tank, Brawler, Sniper, Engineer, Trapper and Bard. Seven other roles must fire actual automatic ranged attacks/projectiles when eligible while retaining their useful specials (tank shields, healer heals, engineer turret, trapper traps, bard buff, etc). Brawler remains a melee attacker only. Make shots visible and damaging, vary cadence/strength by role, and ensure existing shooter/sniper guns aren't accidentally doubled. Preserve 4 unique active follower cap and automatic skills. Don't add companion levels or new roster.

### 3. MORE zombies, not HP sponges
Increase *ordinary zombie count per wave* substantially compared with existing 1.0, aim ~2× when performance allows. Keep ordinary units weak and fairly fragile: **NUMBERS > STRENGTH**. Preserve elite/boss danger, spawning offscreen and distinctive enemies, but crowd the screen with readable bodies. Reasonable object/performance cap only to prevent freezing the game on a phone. Prefer noticeable difference to microscopic tuning.

### 4. More actual roguelite upgrades
Add at least SIX meaningful new upgrade cards/effects, e.g. tail pierce, tail burst, tail rapid-fire, lucky bounces, sprint dodge, shield rebound, squad crossfire, fish momentum. Integrate into the existing upgrade eligibility/choice renderer without softlocks. Preserve existing damage/rate/speed/XP, specials, three-or-more choices and existing companion upgrades. Cards must actually affect stats/behavior, not merely descriptions. No three-gun slot/economy in this version.

### 5. A release worth opening
Retain current city, enemies, world content, music, fish, bosses and scoring. Update **runtime build** (`BUILD='1.1'` or equivalent), HTML boot handshake `expected='1.1'`, overlay/title/version to clearly say Cataclysm **1.1 — EVERYTHING DRAWN**, and update any hard-coded asset URLs to load from this versioned directory. You may improve title art, particles and cards within time available.

## Non-negotiable source scope
You may modify/add/remove files **only inside** `docs/cataclysm-1-1/`. The workflow has already copied latest campaign 1.0 there. Do not touch `docs/cataclysm-1-0-major/`, `docs/cataclysm-100-lab/`, `docs/cataclysm/`, `docs/preview/`, CI workflows, tests, GitHub Pages, secrets or unrelated files. Do not generate code/scripts/reports outside the 1.1 folder (you may run temporary commands in /tmp). **No changes to the original release.** Existing 1.0 files may be read for reference.

## Minimum self-check before stopping
Open the actual local game at `http://127.0.0.1:8765/cataclysm-1-1/`, verify loading and starting, move the cat and inspect one frame/screenshot if tooling permits. Be pragmatic: fix only blank-screen crashes or missing assets that block play. A separate minimal two-viewport boot smoke will run after you finish. **Let playful imperfections ship.**

When this is finished, the workflow will commit and publish the playable 1.1 to:
https://borhex.github.io/kbc-rpg-prototype/cataclysm-1-1/

Proceed autonomously. No requests for approval. No per-frame QA debates. **Jank is canon.**

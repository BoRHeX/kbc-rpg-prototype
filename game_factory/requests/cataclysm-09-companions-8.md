# BoRHeZ Games Studio — CATACLYSM 0.9 / EIGHT COMPANIONS, FOUR ACTIVE

## Creator's immediate executive order
Keep the game release version **0.9**, the primary development branch `development/cataclysm-09`, and its current clean primary URL `/cataclysm/`. Expand the companion roster from the existing three PERMANENT cats (shooter, healer, tank) to **exactly eight distinct recruitable companion types (five NEW)**. The active **companion squad is capped at FOUR followers** (the playable hero is separate, never counted in the four). The player must be able to choose WHICH four. No hidden temporary followers, expiration timers, forced extra companions, cosmetic duplicates, or secretly exceeding the cap. This is the requested 0.9 content update, NOT version 1.0 and NOT a sequel.

Preserve the already live fullscreen-on-Play capability (and exit control), toroidal solid city, existing three roles, Fishbone Encore, city events, boss, music/boss transition, upgrades, game saves and mobile input.

## Five roles; studio has creativity inside these roles
Implement **five genuinely different CAT companions** alongside the established three. Suggested robust canonical identities for deterministic QA and readability:
1. **Brawler** — short-range claw/swipe specialist, with bounded knockback or stun special.
2. **Sniper** — long-range, deliberate high-impact precision attack, marked target or piercing special.
3. **Engineer** — deploys a limited-life stationary turret or defensive gizmo as its special, no runaway permanent entities.
4. **Trapper** — places temporary floor traps that slow/debuff enemies, terrain-aware and visibly clear.
5. **Bard** — beat-driven morale/tempo aura tied to game simulation or music beat, plus a short team speed/fire/damage performance special; never require microphone or introduce a second audio score.

The studio can refine mechanics and names if substantially better, but maintain EXACTLY 8 documented roles including legacy three, each recognizably different in normal attacks/passive and in a special. Distinct artwork: fur palette, gear/hats/tools, recognizable outlines at phone scale, and self-explanatory upgrade text. Avoid role designs that create unfair invulnerability, infinite damage, or unbounded particles/projectiles.

## Mechanics and roster-management constraints
- Define `const MAX_COMPANIONS = 4` and an exactly eight-element `roleNames` roster in game.js; preserved old names shooter/healer/tank and the five new roles as distinct IDs.
- Maintain all role ranks and unlocks within a run even if the cat leaves the active four. Re-recruiting a previously unlocked type retains its investment rank; repeated recruitment while active improves its rank as before. Do not allow rank farming by swapping.
- Recruiting a fifth DIFFERENT type may NOT exceed the four active. Instead the upgrade UI offers a **deliberate replacement choice** among the currently active four. This selection must happen while gameplay is paused for upgrade; no involuntary auto-removal or lost upgrade. Include a cancel/back path so the user may choose another offered upgrade without losing the level. If the role already exists among active companions, train it instead of replacing.
- The active companion cap is distinct from existing `squad-count` upgrade, which multiplies effective strength only, NOT active visible cat count. Maintain the existing squad stats/upgrades including `squad-damage`, rate, spread and bounce; cap does not suppress stats.
- All four active cats get correct independent moving collision bodies (no overlap with hero, enemies, terrain), formation/navigation in looping world, boss/taunt handling, and cannot leave the map. No narrow-corridor pathing problems.
- Every role has a usable special on a distinct mobile-friendly button while active; four active special buttons must fit **one screen in landscape 640x320** and portrait. No buttons outside the arena or unscrollable menu. If role absent, its button is hidden. Cooldowns use SIMULATION time (freeze on pause/death/upgrade). Keep upgrade overlay, restart, mute, fullscreen and tactic buttons accessible. Display squad capacity count (e.g. SQUAD 3/4) and selected roles. Honor reduced motion.
- Existing shooter/healer/tank must keep their working roles and abilities. New roles should interact meaningfully with current loop, no new dependencies or assets, no external image/audio requests. Short original per-role SFX if suitable, but not a competing soundtrack. Do not significantly change game difficulty when solo or with 4, cap crowd effect buffs.
- Keep named version token `const BUILD = '0.9'`, plain HTML `<title>Cataclysm 0.9 · BoRHeZ Games</title>`, `game-version` 0.9, existing internal audio engine compatibility marker, `WORLD_SIZE = 2400`, and gameplay diagnostic snapshot. Add READ-ONLY `companions:{limit:4,roles:[...roleNames],active:[...],ranks:{...},uniqueCount:8}` in existing diagnostic snapshot for trusted QA. Do not make it possible to mutate state through the snapshot.
- Existing two-pass editor (upgrade offer) must continue to guarantee a player-common choice and 3 offered upgrades; adding five new options must not crowd out all non-companion upgrades.

## Engineering and quality rules
- Coding agent may modify **ONLY** `docs/preview/game.js`, `docs/preview/game.css`, `docs/preview/index.html` (game config only if necessary) and write brief role/design decision memo `game_factory/decisions/cataclysm-09-companions-8.md`. DO NOT edit QA tests, workflows, publisher, trusted existing reports, original `main:docs/preview/` game, other games or dashboard.
- The coding-agent sandbox cannot run Chrome, local HTTP or audio. Don't revert an otherwise sound implementation solely because browser testing is unavailable in sandbox. The separate trusted GitHub Actions runner performs Chrome tests and can reject an unfit candidate. Run `node --check` if permitted.
- Avoid O(n^2) explosions due to pairwise checks or new weapon attacks. Cap turrets, trap count, projectiles, status auras, and effects.
- Include actual implemented mechanics (not empty/no-op stubs), skins and UI controls for all 8; compile and test the selector, active cap, switching, ability timers, soldier formation, torus seams, game pause, boss, and mobile controls.
- Studio decision memo should describe the 8 roles, specials, controls, capacity/replacement UX, actual files changed and known limitations; no fake transcripts of private thought processes.
- On success, **do not automatically bump the version**. Only publish to new primary /cataclysm/ URL when all independent Chrome gates and exact-hash QA report pass. Preserve the original archival /preview/ and graphics experiment.

Budget awareness: user has already consumed about half of their studio AI budget. Prefer one cohesive sound implementation, bounded code, and deterministic self-checks. No repeated free-form API runs or 1.0 work.

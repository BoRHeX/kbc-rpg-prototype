# Cataclysm 0.9 — free choice pass 001

Decision: **Fishbone Encore**, one pickup-driven crowd-control mechanic. Candidate source remains on `development/cataclysm-09`; release is conditional on independent gates. No publication or branch merge was performed.

## Brief studio viewpoints

- **Creative Director:** Turn collecting fish into an observable setup/payoff: gather a short chain, release a concert-like wave, escape or finish the crowd. This gives viewers an action they can anticipate.
- **Gameplay Engineer:** Pickups currently provide progression without an immediate tactical response. Reward a route through nearby fish without adding another mobile button or bypassing solid buildings.
- **Art/Sound Director:** Use a warm gold soundwave, existing illustrated cats, and the original power-up chime. Keep the rock/DnB and Alley King dubstep arrangements intact; avoid flashes or a new competing music layer.
- **QA/Production Lead:** Select one bounded interaction with existing damage, defeat, collision and pickup paths. Expose read-only counters and test seam, armor, cooldown and frozen-time behavior. Defer additional enemies, controls and progression systems.

Resolution: implement the pickup wave, with building occlusion, partial boss resistance and a rearm interval. Extra damage, slow stacking and repeated triggering are deliberately bounded.

## Intended player-visible behavior

Collect three fish within **eight simulation seconds of the first fish** to release Fishbone Encore. The deadline does not refresh on the second fish. Fish value counts, so merged caches retain their usefulness. Excess value grants no stored future activations.

The wave hits enemies whose centers are within **230 world pixels**, provided a building does not block the shortest toroidal line from the player. It deals **2 × player damage**, respecting elite wind-up armor and shield mutations. Survivors move at **45% speed for three seconds**. The Alley King takes **one quarter of this damage** and moves at **85% speed**. Existing stronger slows win; effects do not multiply. The wave grants no healing, invulnerability or immunity to hazards/contact damage.

A gold sweep and ENCORE caption identify the activation. Affected enemies display SLOWED; bosses display RESIST. The existing fish card shows charge/deadline, a progress meter, then a **ten-second rearm countdown measured from activation**. Collecting fish during rearm still awards normal fish, XP and score. The opening instructions explain the trigger. No new touch control or HUD row is added.

## Actual source changes and edge cases

- `docs/preview/game.js`: per-run Encore state; simulation timer updates; hook after actual fish collection; bounded single-pass damage with the existing `blockingTerrain` helper and `defeatEnemy` path; temporary per-enemy slow applied through ordinary collision movement; wave rendering and enemy labels; HUD updates; copied diagnostic state and per-enemy slow duration. Technical patch ID identifies this pass; BUILD remains `0.9`.
- `docs/preview/index.html`: accessible Encore progress meter in the existing fish card and shorter opening instructions. Exact document title, game-version ID/text, version handshake and local asset loading remain intact.
- `docs/preview/game.css`: compact meter and small-screen label sizing within the fish card. No additional input surface. Reduced-motion rendering uses a stationary boundary rather than an expanding sweep; no shake or flash is introduced.
- Restart resets all Encore state. Pause, death and upgrade choices stop its simulation timers. A pickup that opens an upgrade dialog can trigger Encore first; the resulting cooldown and slow then freeze with combat.
- The wave damages once at activation, not once per rendered frame or periodically inside its displayed boundary. Later entrants receive no hit. Its three-second visual fades while affected survivors retain their individual timers.
- Victims are traversed using a snapshot because ordinary defeat handling removes enemies and may append fish drops. Kill credit, drops, boss rewards and director damage accounting use existing paths. A large cache produces at most one activation, including at boss defeat.
- Shortest wrapped deltas apply to range and occlusion; no geometry or navigation functions changed. Nothing moves actors directly or creates solid geometry. The only additional simulation RNG draws come from ordinary defeat handling. Existing bounded particle/projectile pools and the audio context are reused; no new city event is introduced. Encore reuses the capped original power SFX bus and does not select music modes.

## Local evidence and independent QA requirements

Local checks completed:

- `node --check docs/preview/game.js` passed.
- A temporary Node VM harness ran the actual game closure with DOM/Canvas stubs and test-only access injected into an in-memory source copy. Assertions passed for charge/deadline expiry, merged-cache triggering, cooldown lockout/rearm, normal/shield/boss damage, building occlusion, opposite-seam hits, existing defeat/kill accounting, actual pickup XP, pause/upgrade freezes, actual movement slow ratios and strongest-slow behavior, and clean restart. Stub rendering executed at all three requested viewport dimensions without exceptions; this is **not visual/layout QA**.
- Source comparison confirmed the entire world/physics and audio-engine sections and inline boot handshake are unchanged. Exact title/version/audio marker, permitted-file scope, development branch and `git diff --check` passed. No Chrome, local HTTP, official browser suite, real WebAudio playback or physical device testing was run in the coding sandbox. No external QA result is claimed.

Independent release gates must prove:

1. All **eight existing physics QA tests**, including unchanged 2400 torus, solid buildings and collision functions, spawn/pickup clearance and wrapping. Test Encore across each seam and behind buildings as additional cases.
2. All **eight existing audio QA checks**: no pre-gesture playback; trusted source bridge; layered survival scheduling; boss transition; survival return; pause silence; mute suppression; unmute using the same context. Preserve internal `AUDIO_PASS_ID = 'graphics-lab-audio-01'` without exposing that name in the UI. Listen for mobile headroom when pickups, Encore and combat overlap.
3. Real playable layout/input at **844×390**, **640×320**, **390×844**: meter/label fit, reachable start and upgrade choices, touch drag/release/cancel, keyboard, three permanent companion roles and their specials, tactics, runes, city events, sound, score, restart and resume. Check reduced-motion and keyboard focus. Do not interpret the Node render smoke check as proof.
4. Natural survival play: chains are achievable during the first minute without guaranteeing a reward; the countdown is legible; waves visibly match damage/slow; no post-pause burst, duplicate kills, repeated cache triggers or stun lock; bosses still appear every five minutes and remain dangerous. Check mature builds, magnet collections, elite armor and overlapping relay/rune slows.
5. After trusted gates pass, publish the candidate only at **`/cataclysm/`** using the existing release mechanism. Preserve archived `main:docs/preview/`; do not merge branches or overwrite `/preview/`. CI, publisher, tests, reports, dashboard, original release, other games and game configuration are untouched by this pass.

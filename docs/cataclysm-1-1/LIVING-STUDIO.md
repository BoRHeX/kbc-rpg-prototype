# Living cats · studio candidate 02 · 13 November 2026

Cataclysm remains 1.0. Both entry points start at Night 1, Level 1, with the same public introduction. Publication belongs to the trusted workflow; this candidate has **not** passed browser acceptance or been published.

## Playing changes

Movement, firing and effects are now independent animation decisions. Moving always selects the current eight-direction painted run atlas, including during hit recovery, feral, rage, adrenaline and overdrive. Stationary shooting uses directional attack; rest uses directional idle. Buffs add a slightly quicker cycle and a restrained whole-silhouette spring/lean; breathing and firing recoil also preserve the complete painting. There are no composited waist/leg pieces or replacement buff poses. Without a target the hero faces the movement vector; with one, visual aim continues to follow the actual shot bearing. Reduced motion holds the directional frame and removes these secondary transforms. Existing aura and combat effects retain their role.

Directional sheets take precedence over compatibility artwork, including partial loading. Companion action fallbacks use an available modern run/idle/attack sheet before a legacy sheet.

Engineer rank 1 deploys a brass winding-key machine; training to rank 2+ deploys its porcelain, fin-cooled workshop sibling. Both have splayed suspension feet, a riveted rotating housing, targeting lens, vent marks, barrel recoil, muzzle flash, remaining-life lights and a folding amber shutdown cue. `window.drawEngineerTurret(ctx,t,time)` remains callable; `t.aim` and `t.skin` (`brass` / `porcelain`) are cosmetic renderer inputs. No purchase, input or combat statistic was added. Target choice, .35-second shot cadence, eight-second lifetime, summon count and damage expressions are unchanged.

The hero now has 159 local lines across existing and new situations. Added branches cover pressure, critical health, recovery, levels, each street biome, visible drizzle and each companion role. New exchanges give the engineer, healer, tank, bard, trapper, sniper and brawler distinct replies. Existing fish, missed-shot, victory, death and companion-event hooks remain active. Selection keeps per-event cooldowns, line cycles and recent-text suppression; it also avoids addressing absent companion roles. Expired pressure/critical/healing requests are discarded. Ordinary speech starts at least 5.5 seconds apart and retains role cooldowns; urgent warnings may interrupt. Final nights suppress casual conversation. Dark translucent bubbles, white typewriter text, HUD avoidance and pause/reduced-motion behavior remain in place.

## Evidence and validation

- [Hero temporal pixels](LIVING-HERO-FRAMES.png): actual `catSprite` → `CATA_ART.draw` source rectangles and transforms, rasterized from the existing PNGs at a 390-pixel phone scale. Columns are t=2.00, 2.11, 2.23, 2.37 seconds. Four row groups face E, S, W, N. Within each group: normal walking/firing, feral walking/firing, adrenaline walking/firing, overdrive stationary firing. These are renderer-derived frames, **not screenshots**.
- [Turret command capture](LIVING-TURRETS.svg): actual canvas renderer commands translated to SVG, enlarged for inspection. Columns: brass and porcelain. Rows: tracking, firing and shutdown. These are **not browser captures**.
- [Machine-readable results](LIVING-QA.json): 64 temporal cases × four samples spanning eight directions, movement/stationary firing and four buff conditions. Every case advances modern directional source frames; all pixel comparisons in the displayed four-direction matrix differ. Also verifies reduced-motion stability, distinct turret skins/activity, contextual dialogue and frozen speech during pause.
- The existing `corrective-check.cjs` passes without changes: early XP 6/8/10, chained offers, ghost/silence timing, spawn budget and ranged-role bounds, projectile cap, dialogue reveal/freeze, art parity and JS syntax.
- Complete game scripts executed in a Node VM with mocked DOM/canvas for 12 simulated seconds in each directory at 390×844 and 844×390. All four runs stayed running with zero JS exceptions, accepted keyboard/touch movement, began at Night 1 / Level 1 and froze on pause. This does not validate real DOM geometry, audio or browser APIs.

## Trusted workflow still required

Local HTTP bind fails with `PermissionError: [Errno 1] Operation not permitted`. Chromium aborts before loading a page (`setsockopt` / socket shutdown denied), even using a writable temporary profile and disabling crash reporting. Browser screenshots/video, actual on-screen temporal motion, portrait/landscape layout, Samsung-like touch comfort, fullscreen/audio and zero browser/runtime errors therefore remain **unverified**. Run those acceptance checks before publication; the renderer and VM evidence above is deliberately distinguished from browser evidence.

No accepted PNGs, tests, pipelines, other games or historical releases were edited. No live image service or network dependency was added. Both directories contain matching polish modules and evidence; the lab retains its existing QA-only final-spawn branch.

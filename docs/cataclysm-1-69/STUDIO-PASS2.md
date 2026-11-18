# Creative studio pass 2 — 1.0

The pass-1 dialogue, companion fishing, formation planning and state-aware special abilities remain in place. Painted atlases, scoring and campaign systems are preserved. Release/lab-specific startup behavior remains intact.

## Shipped

- Four real, eligible weighted upgrades retain current → next effects and earned rerolls. New field-card titles, descriptions and original SVG illustrations accompany substantial portraits of each matching painted companion. Portraits crop the physical eight-frame attack sheet without altering it. Portrait uses a bounded 2×2 grid; landscape uses four columns. Cards do not scroll.
- The arena exposes movement, pause and fullscreen. Removed settings rail and hid legacy manual combat controls. Existing companion and rune auto-casts remain; squad tactics now choose aggressive/supportive/defensive automatically according to health and nearby enemies, preserving durations and cooldowns. Companion activity remains a passive status line.
- Dedicated pause dialog: Resume, persisted volume and mute, fullscreen/exit, Guide, restart and Games exit. Guide is `#pause-guide`; artwork is `.upgrade-art`; `#pause`, `#fullscreen` and `data-cat-speech` remain. The hero has an additional pawwritten-Guide line alongside the preserved voice bank.
- Upgrade arrow navigation, native Enter/Space confirmation, modal Tab containment, Escape pause/resume, focus restoration and existing pointer release/reset paths.

## Validation performed

- JavaScript syntax checks on both game files and dialogue module.
- VM execution of the actual card/eligibility/roll and pause functions: 100 four-choice rolls per edition, unique eligible offers, artwork node creation, companion training current → next text, pause/resume state transitions and input clearing passed.
- HTML IDs checked for duplicates; local script/style references and new SVG XML validated. Studio CSS additions, dialogue and art match between editions.
- No finale stress test performed. No image generation or atlas changes.

## Browser QA limitation

The requested 360×780, 844×390, 915×412 and 1280×720 viewport layouts are implemented but **not browser-verified in this runner**. Starting a local HTTP server fails with `PermissionError: Operation not permitted`; installed Chromium aborts in Crashpad with `setsockopt: Operation not permitted`. The Playwright bundled browser is absent. Actual screenshots, touch/mouse/fullscreen interactions, real gameplay upgrades, paused rendering and browser resource/error monitoring therefore remain for the trusted browser pipeline. VM checks do not substitute for those checks.

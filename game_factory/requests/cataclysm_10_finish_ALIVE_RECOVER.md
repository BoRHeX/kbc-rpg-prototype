# Cats Alive — targeted recovery from the preserved completed studio candidate

The autonomous Cats Alive run 43443458400 finished its creative implementation but correctly did NOT publish: independent browser-art QA caught that the Night 99 lab was mistakenly given the main campaign's `const STRESS_MODE=false`. Actual Night 99 now launched as Night 1. All prior source, score, infinite map, eight viewport gameplay and art sheet loading checks passed. The complete 20 MB authored source and artwork was preserved as `cataclysm-10-unaccepted-alive-source` artifact 14046782783.

**Do NOT rerun the AI art/writing stage and do not overwrite the new dialogue, turret skin designs or animation.** Restore this exact complete source, apply `game_factory/cataclysm_next/qa/recover_alive_lab.py` (sets the lab alone to `STRESS_MODE=true`, retaining main campaign Night 1), run independent Chrome acceptance of all requested improvements and a single Night100 boss lab smoke test, then publish the accepted build via PR and GitHub Pages only if all checks pass.

Other acceptance checks now recognize the studio's two actual turret skins by their authored names instead of imposing numeric skin IDs, and accept a *moving* modern-hero frame during buffed/hit motion instead of mandating the older static feral pose. The new direct visual-motion test verifies animation rigorously.

The public game must remain Cataclysm 1.0 and preserve its existing balance, XP costs 6/8/10, map, controls, fish and companions. No full Night100 stress test. No generated assets discarded.

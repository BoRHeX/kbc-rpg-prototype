# 1.0 on-device corrective candidate — 13 November 2026

Baseline: local main and origin/main both `83b5378eabe094d5f04b6dd23282f46f778d359a`; initial working tree clean. Only the two playable folders changed. Game version stays 1.0. Cache revision is `cataclysm-10-playtest-20261113-07`.

Both paths share director prices: melee 1 / 2 / 2.6; weaver 5, orbiter 7, hexer/blight 9, summoner 10, ghost 12. Normal releases enforce the formerly disabled budget check and a one-third spawn composition gate, additionally capped at six ranged/casters until six minutes and eight thereafter. Rejected ranged selections become melee to avoid a deterministic spawn-selection deadlock. Campaign budget grows from 16 toward 48; LAB keeps its independent late-game budget. Existing population caps and major schedules remain. Initial normal release waits 1.5 seconds.

Ordinary projectiles share a 16-shot ceiling; majors can raise the shared ceiling to 32. Ordinary windups are 0.85–1.1 seconds, cooldowns 4.6–5.8 seconds. Casts aim at their telegraphed location and check terrain and distance. Ghost silence warns for 1.25 seconds with a visible 220-unit violet boundary, then checks the living caster, current range and terrain. Leaving, killing the caster or breaking sight defeats it. Ghosts share a 16-second cooldown; successful silence lasts 1.2 seconds.

The single director `xpRequired` function supplies award gates, chained upgrades, HUD, meter, pause build details and diagnostics. L1–10 thresholds: 6, 8, 10, 13, 16, 20, 24, 28, 32, 36; L11 onward uses 7+3L.

Speech uses compact translucent charcoal styling, white text and noninteractive DOM. A hidden finished line reserves layout; the visible line types over 0.25–0.8 simulation seconds. The full accessible line remains on the status node. Reduced motion reveals immediately. No character timers are created. Dialogue writing and event/cooldown policies are preserved.

Enemy missing-action sheets continuously cycle their painted run fallback. Hero action, hit, feral and adrenaline use the complete original 24-frame sheets. Ordinary directional aim draws its complete reference pose, with subtle whole-body movement during travel, avoiding unrelated waist/leg seams. The eight-bearing reference sheet remains unchanged.

The post and ropes were in ground-0.png, including the lower ring hardware. Only those three regions were replaced with nearby flat masonry sampled from the original bitmap. All four textures were visually inspected; ground-1/2/3 contain no matching mooring hardware and remain unchanged. Both paths have identical ground assets. Building/car/dumpster assets and collision geometry are untouched.

Validation: `node docs/cataclysm-1-0-major/corrective-check.cjs`, existing score contract, follower acceptance and animation acceptance pass. The corrective harness executes actual award gates, chained gates, ghost logic, spawn logic, projectile cap, speech DOM reveal and simulation-clock freeze, plus drawImage source-rectangle progression. Results are in CORRECTIVE-CHECKS.json. These frame checks do not claim browser pixel validation.

Browser QA remains pending: local HTTP binding and Chromium startup fail under this environment's socket restrictions. No eight-size browser pass or rendered pixel comparison is claimed. Existing screenshots, diagnostics and externally maintained QA/workflows were preserved. No full eighteen-major stress run, image-generation calls or dependency installs were performed.

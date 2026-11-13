# Stage 5 — Cataclysm 1.0 release candidate

Real implementation in both allowed directories. Previous scoring, eight follower roles, painted assets, four-choice upgrades and rerolls retained. Campaign starts Night 1; LAB starts Night 99 at level 100 (qaNight100 starts at 100). Shared game source now differs only in STRESS_MODE; 93 shared module/art files match byte for byte.

## Combat and finish

- Removed the 17-second player shield, group finalShield health restoration, and timed mutual protection. Each arrival is immediately damageable and displays an 0.8-second individual warning before moving/attacking. No DEBUG immunity or timer victory added. Existing contact/projectile damage can kill the player.
- Fixed final roster remains 9 bosses, 3 super-elites, 6 elites, with all 27 archetypes and all 100 normal campaign nights unchanged. Victory requires exactly 18 released arrivals, empty queue, 18 unique actual defeat IDs, no live final enemy, and a living player. Despawns cannot substitute for kills.
- Pre-tuning finale clears took 16.9–19.4s with almost full HP. Final champions now have 3.6× HP, 1.65× damage, 1.2× movement speed, a 1.2s initial attack cooldown and 2.8s repeat cooldown (existing individual attack windups remain). Physical follower damage is multiplied by 1.6 while all preparation, interruption, reload and cooperation rules remain intact.
- Actual Catastrophe defeat retains a fallen painted boss, plus a victory illustration using the existing painted sprite, fanfare, 18/18 caption and final score components/time/HP. The statistics overlay transitions 2.4 seconds AFTER a genuine victory. Simulation scoring stops immediately on victory; the transition never awards anything.
- +999999999 remains additive and once-only. Farming points remain. Normal best scores keep their existing key; LAB uses separate best/win keys. Best and win records persist the score rule, component breakdown and milestone IDs. Fixed a pre-existing director-flag ambiguity that had prevented campaign best-score saves.
- Follower diagnostics expose observed state seconds, casts, special casts, interruptions, aborts, hit sources, productive acting uptime and turret uptime. Existing measured frame time/pressure remains exposed. Particle ceiling reduced from 500 to 280, or 120 under frame pressure; damage is unchanged by that visual budget.

## Deterministic actual encounters

The attached STAGE5-ENCOUNTERS.json includes all 32 final encounters, four pre-tuning comparisons, one cooperation probe, raw component/role counters, peak populations, source hashes, and executable reproduction sources. The VM runs the actual unmodified game tick at 60Hz with DOM/canvas stubs; it does not replace combat with a formula. Seeds: gameplay 424242, economy 990100. Early/mid/late windows start at Nights 1/45/85 and run 39 simulation seconds; Night 100 runs until death/victory or a 180s bound. Snapshot builds use tiered fixed equipment/stats, then collect real fish and apply the first actual offered upgrade. This is representative encounter evidence, not a full human campaign completion or browser performance claim.

| Mode / starting night | Solo | Balanced | Damage | Support |
| --- | --- | --- | --- | --- |
| Campaign / 1 | running, 3.00 HP | running, 3.00 HP | running, 3.00 HP | running, 3.00 HP |
| Campaign / 45 | running, 5.88 HP | running, 13.00 HP | running, 6.63 HP | running, 7.00 HP |
| Campaign / 85 | running, 21.58 HP | running, 22.00 HP | running, 21.58 HP | running, 13.75 HP |
| Campaign / 100 | 40.2s clear, 5.38 HP | 38.2s clear, 16.59 HP | 39.0s clear, 6.37 HP | 43.2s clear, 8.34 HP |
| LAB / 1 | running, 3.00 HP | running, 3.00 HP | running, 3.00 HP | running, 3.00 HP |
| LAB / 45 | running, 9.88 HP | running, 12.00 HP | running, 10.38 HP | running, 11.38 HP |
| LAB / 85 | running, 20.16 HP | running, 21.00 HP | running, 21.00 HP | running, 20.72 HP |
| LAB / 100 | 39.3s clear, 0.04 HP | 37.3s clear, 16.87 HP | 46.2s clear, 11.29 HP | 38.8s clear, 14.69 HP |

HP is remaining HP at the end of each bounded encounter. Fixed late snapshots include real campaign milestones; LAB retains its own stress setup. Short stationary windows deliberately constrain healer/engineer/sniper uptime. The extra Night 45 damage-squad probe increased stationary windows from 1.6s to 3.4s per seven seconds: engineer completed one special cast with 3.27 actual turret-useful seconds; sniper completed six casts. The player ended at 2 HP, showing the cost of cooperation under fire. Zero-cast cases in the main matrix are retained as observed.

## Independent verification and release handoff

PASS: six existing independent scripts (finish balance acceptance, score contract, major systems, spawn economy, art integration, visual scrolling); syntax of all game JS; git diff --check; mode-normalized logic parity and 93 shared module/art files. Additional actual-game VM probes verified start setups, first-arrival vulnerability, spawn/defeat/last-enemy/despawn/alive gates, real projectile mortality, additive bonus exactly once, saved best metadata and post-victory presentation control flow. Direct-kill contract probes are distinct from actual simulated balance victories.

Mandatory trusted release job Chrome checks, screenshots/recordings, touch layouts, measured frame pressure and PR remain pending. No Chrome, image-generation, PR, deployment or LIVE success is claimed by this sandbox stage. Existing release workflow is unchanged and must remain gated on genuine acceptance.

Known gate conflict: the unchanged browser-horde.cjs:41 expects all 18 final enemies alive simultaneously. Independently killable arrivals can fail that obsolete expectation. The trusted runner must resolve this acceptance-contract conflict within its authorized scope; do not reintroduce immortal enemies or publish on a failed gate. Preserve the required roster/release/actual-defeat assertions.

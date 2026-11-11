# Acceptance matrix — required independent evidence

All tests exercise **real game code** and the actual built asset registry, not static HTML declarations or fabricated snapshots. Independent QA cannot merely echo coder claims. Every failing row creates a blocking issue with reproduction, evidence and owner; no soft scope reduction.

| ID | Must prove | Deterministic/system evidence | Browser/creative evidence |
|---|---|---|---|
| R1 | Two new original melodic compositions, identifiable independent motifs/sections; unique attack, boss, elite, buff, reroll, win/fail SFX. | Score registry identifies ≥2 new IDs; scheduler fires real notes; effects map non-overlapping cue types; WebAudio voices limited; pause/mute/volume tested. | Audio capture or explicit human listening of both full melodies and event timing; boss transitions don't jump in volume. |
| R2 | 27 × 6 + 8 × 12 + 5 × 24 = ≥378 genuine articulated frame-state selections, including unique feral/adrenaline/damage/idle. | Manifest lists 9 normal, 9 boss, 6 elite, 3 super elite + 8 companions and hero states, tests every pose index; head, torso, legs, arms, tail present. | Sprite sheet/contact sheets or rendered video reviewed, no identical/blank clips, controls keep 30/60fps target on mobile; reduced motion works. |
| R3 | Wider world, large visible buildings/dumpsters/cars, physical interactions and persistent streaming. | Test at least two horizontal seams, three biome switches, five chunk evictions/regenerations, collision and enemy navigation around all three obstacle classes, actor spawn safety. | Human visual check for bigger usable structures and recognizable map change; no offscreen pop-in or impenetrable mazes. |
| R4 | Compact icon-based HUD and automatic intelligent abilities. | Every companion ability fires only when cooldown/conditions satisfied (healer only injured, sniper target exists), cooldown reset exactly once, buff active/remaining/cooldown states correct; no manual activation required. | Screenshot at eight viewports including narrow Samsung landscape; indicators readable, buttons reachable, pause/upgrade still work. |
| R5 | More meaningful upgrade branches and earned reroll drops. | Weighted offer validity + exactly three unique choices, reroll debits 1 token exactly once, first and subsequent rerolls maintain valid pool, no duplicates or companion softlock after 4; boss/elite drops bounded. | Player sees token inventory, reroll button and before/after choices, strategic difference between builds. |
| R6 | 9 regular (3/3/3), 9 bosses, 6 elites, 3 super elites, differentiated behaviors. | Count IDs, inspect unique attack scripts, test 3 casters keeping safe preferred distance and navigating around walls, test telegraph/cancel and combat/kill credits, stress threat cap. | Watch each type spawn/attack/take damage/die, verify silhouettes/telegraphs and no indistinguishable palette swaps. |
| R7 | 100 ×13s night schedule, boss every 9, elite every 6, fair overlaps, actual 999999999 victory. | Advance from t=0→1300+ via accelerated real engine; assert exact night indexes, 11 boss slots, 16 elite slots, five overlap nights, 9 unique boss types, 9 normal elite and 9 super-elite defeat opportunities, true victory once after Night100, defeat/early score never equals reward. | Night/horde pacing visible, final clear understandable; real input required to defeat waves. |
| Regression | Existing gameplay and release safety. | Movement, shooting, hit damage, XP/choices, shadow, 4-of-8 permanent squad, mutations, fusion/cocoons, offscreen spawns, biomes, audio controls, diagnostics, restart, save history. | Eight screen sizes, touch, focus, fullscreen/mute, no broken controls, ≥30-min accelerated stability with no object/audio runaway. |

## Eight viewport checkpoints
`390×844`, `360×780`, `640×320`, `667×375`, `780×360`, `844×390`, `915×412`, `1280×720`. Treat phone landscape as primary, portrait as fallback. Test actual pointer input, content height/overflow and fixed viewport.

## Night boundaries to assert
- `t=0.000 → Night1`; `t=12.999 → Night1`; `t=13.000 → Night2`.
- `t=103.999 → Night8`; `t=104.000 → Night9` (first boss).
- `t=64.999 → Night5`; `t=65.000 → Night6` (first elite).
- `t=221.000 → Night18` (boss + elite overlap).
- `t=1287.000 → Night100`; `t=1299.999 → Night100`; `t=1300.000 → final resolution`.
- All clocks pause when upgrade choice is open; no jump after tab sleeps/resumes.

## QA gates, in order
1. **Baseline audit:** record hashes and current runtime diagnostics; preserve unchanged existing 1.0 and 0.9 links.
2. **Module contract tests:** run unit and smoke before integration, no imports broken.
3. **Content completeness:** assertions on distinct behaviors, frames, compositions, upgrade pools, sound events and asset registry.
4. **Integrated Chrome:** all eight viewports and actual movement, combat, level-up choice, rerolls and auto-abilities.
5. **Accelerated endurance:** real engine executes 100 nights through final victory; verify budget caps, high-level state and deterministic reproducibility at three seeds; independent observer validates not fabricated.
6. **Qualitative review:** capture clips/contact sheets and musical demonstrations. Automated assertions cannot validate character appeal or musical distinction alone.
7. **Release:** candidate code SHA, acceptance ledger, gameplay capture, rollback ref, Pages URL verification. Stable 0.9 and prior 1.0 remain available. Human playtest feedback logged as remaining work if not yet performed.

**Independent fail condition:** A feature is described in a plan but not visibly present; source check only; missing animations; identical boss behaviors; rerolls as free infinite refresh; ability requires taps; Night100 victory awarded on time alone; score can reach 999999999 without win; GitHub build succeeds but site is not playable; or test only exercises a mocked version of the real code.

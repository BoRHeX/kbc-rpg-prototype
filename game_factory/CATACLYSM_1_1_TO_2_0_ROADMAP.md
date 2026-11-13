# CATACLYSM — ROADMAP FROM 1.1 TO 2.0
## 2.0 destination: THE CATACOMBS
**Product vision approved for planning:** 13 November 2026. **1.1 scope approved:** 13 November 2026, [executive studio issue #82](https://github.com/BoRHeX/kbc-rpg-prototype/issues/82). **Status:** approved brief, not proof that 1.1 production ran or that a new release exists. Never modify frozen 1.0 or trigger legacy 1.0 pipelines.

> Survive. Upgrade. Explore. Laugh. Run. Try again. Every run should give the player a different story — including surprising losses. One-handed movement remains the ONLY direct gameplay control.

## Version boundary — frozen 1.0

**Cataclysm 1.0 — The Catastrophe** is the original finished milestone, preserved at `release/cataclysm-1.0-the-catastrophe-20261113`, source snapshot `1c2af2239dd1be6083d8df127580513dff6d3b55`. Existing playable URLs:
- Main game: https://borhex.github.io/kbc-rpg-prototype/cataclysm-1-0-major/
- Level 100 / Night 99 laboratory: https://borhex.github.io/kbc-rpg-prototype/cataclysm-100-lab/

**Never develop 1.1 in either 1.0 game directory.** A branch protects historical source, but a live GitHub Pages URL is mutable if `main` redeploys changed files. Before the first 1.1 code change, create independent `docs/cataclysm-1-1/` and `docs/cataclysm-1-1-lab/` or equivalent versioned paths, copy the exact 1.0 baseline, configure publishing to touch only those paths, and regression-test the two 1.0 URLs. Freeze a playable URL as well as a Git ref. Do not trigger existing legacy 1.0 animation pipelines by editing their request files.

## Immutable game DNA

- A white cat surviving a city overrun by zombie / monster cats; distinct pursuing, dashing, dodging, ranged, mutant, caster, elite and boss behaviors.
- Movement-only input: drag/joystick or WASD, automatic targeting, automatic companion skills, context-sensitive encounters. Menu, pause and upgrade choices remain interface actions, not combat controls.
- Random upgrade cards, meaningful weapons/perks, fish, upgrades, rare magnets/rage/beacons, enemy waves, bosses, music and distinctive cat dialogue.
- Four unique active companion **slots**, not more. Companions have opinions, movement, special abilities and personality. A fused pair occupies one slot.
- Fast protagonist mobility: the main cat may vastly outrun its companions. The squad must catch up gracefully, not teleport continuously or impose a speed limit.
- Preserve a readable, fair mobile game with humorous surprises and multiple viable solo-cat, weapon, squad, economy and exploration builds.
- **Animation is performance, not foot-ground simulation.** The player never demanded ground-contact physics. Exaggerated, illustrated, readable full-body acting is the goal. Physical floor planting is optional art direction, never an acceptance requirement.

## Release roadmap

| Version | Name | Release-defining experience | Deliberately NOT in this release |
|---|---|---|---|
| **1.1** | **EVERYTHING DRAWN** | Original illustrated quadrupedal white cat with **independent auto-aiming tail gun** (no directional body frames); expressive idle/run/hurt/adrenaline/rage/shield; all companions shoot except melee Brawler; significantly denser weak-zombie waves; 6+ meaningful new upgrades; cohesive UI/VFX and lightweight title shell. | No three-gun slots, new companion roster, companion evolution, new world systems or 1000-night campaign. |
| **1.2** | **NINE LIVES** | Nine lives separate from HP, fair revival and rare life rewards, stronger perk/card depth and survivability choices while retaining the 1.1 tail-gun combat layout. | The three-slot two-hand-plus-tail loadout (reserved for 2.0), new companion roster, biome simulation. |
| **1.3** | **FELINE COMPANY** | 8 new companions (16 total), actual fish-eating autonomy, companion level progression/evolutions, first pair fusions; 4 active slots remain. | World-map overhaul, fishing economy. |
| **1.4** | **THE UNSEEN CITY** | Known seeded districts, non-gameplay world map, in-run arrows to valuable items only, zone kill counters, provoked area bosses and rare extra lives, DPS-gate waves unlocking areas. | Full-length 1000-night final balancing. |
| **1.5** | **HOOK, LINE & CATNIP** | Fishing rod, fishing spots, bait, fishing risks/rewards, special catches, jackpot counter and strategic resource scarcity. | Endless mode. |
| **1.6** | **MUTATIONS AFTER MIDNIGHT** | More genuinely distinct enemies, elite/boss evolutions, biome hazards, combinations and counterplay; more voiced/lettered contextual dialogue and adaptive soundtrack. | Final three-hour endurance tuning. |
| **1.7** | **THE LONG NIGHT** | 1000-night campaign structure, checkpoint/resume, three-hour-class runs, pacing and performance stabilization; unlock Endless Mode. | Claims of full 2.0 completion. |
| **2.0** | **THE CATACOMBS** | Full three-weapon loadout (two hands plus tail, separately upgradeable), unified menu, discovered world map, deep underground biomes, companion fusion gallery, evolution codex, major endgame events and the Sphinx; polish all integrated systems. | Unbounded scope creep or another engine rewrite. |

These are outcome gates, not a promise of fixed dates or a mandate to write every subsystem before playable releases. Each version is a separate playable milestone and can be revised based on real test evidence.

### 1.1 — EVERYTHING DRAWN (APPROVED; executive issue #82)

**Authoritative change dated 13 November 2026:** The owner replaced the previous eight-way directional hero with a **cute quadrupedal white cat** whose **drawn tail-mounted firearm alone rotates, tracks targets and shoots**. The body is no longer an eight-facing pistol-character. The original 1.1 visual overhaul remains important, but this approval also explicitly includes **seven shooting companions, denser zombie hordes and more upgrade choices**. This section and [issue #82](https://github.com/BoRHeX/kbc-rpg-prototype/issues/82) supersede the earlier hero animation instructions. Original 1.0 remains frozen.

**Hero art direction:** establish a coherent real illustrated/painted asset family with one canonical body, an independently aimed jointed tail/gun and visible four-leg running gait; keep expression, blinks, reactive ears and a cute readable silhouette at gameplay scale. Avoid algorithmic placeholder shapes, duplicated hero bodies and eight-way directional body atlases. A reproducible texture-producing rig is acceptable **only if the visible result looks drawn and alive**. Tail aiming and recoil must not freeze leg animation or rotate the body to face enemies.

**Required protagonist states:** idle, run (slow-to-fast cadence), hurt with recovery, adrenaline, rage/feral, shield (idle and moving), plus existing death/restart behavior. Expressions, poses and timing must genuinely differ; tinting one still frame does not satisfy the brief. Existing automatic targeting/movement controls remain. Projectiles and muzzle flash originate at the moving tail gun, not invisible paw pistols. **One tail gun in 1.1; two hand weapons plus tail arrive at 2.0**, not 1.2.

**Companions:** the eight are Shooter, Healer, Tank, Brawler, Sniper, Engineer, Trapper and Bard. Every one **except Brawler** acquires targets and fires visible, effective ranged attacks; Brawler remains melee-only. Healing, tank protection, engineer turrets, trapper snares, bard support and all other defining specialties remain intact. Balance combined firepower so a four-member squad does not trivialize the horde. Four unique active companion slots and permanent allies remain.

**Zombies and upgrades:** prioritize **many ordinary weak zombies over fewer inflated-health zombies**. Increase ordinary wave spawn/active density visibly versus frozen 1.0, with meaningful recovery rhythm, offscreen spawning, readable elite/boss tells and performance-bounded caps. Use a deterministic same-stage count comparison (target around 2× where device performance allows, not an unconditional unbounded spawn target). Add **at least six** real, eligible upgrades with observable effects on tail firing, mobility, shielding/recovery and squad synergy; preserve current choice logic and existing upgrade effects, never create impossible cards or extra direct combat controls. Three random choices remain the 1.1 baseline.

**Drawn presentation:** keep the earlier aspiration for coherent original character/follower/enemy art, UI cards, encounter panels, muzzle flashes, dialogue, illustrated VFX, lightweight title/start/settings shell and visual hierarchy, without creating later-version map, fishing, fusion or weapon-economy features.

**1.1 acceptance and delivery:** independent art review of **actual animated gameplay** at ~48px, genuine tail-muzzle targeting during motion, six visibly distinct states, 7/8 allies ranged and Brawler melee, stronger horde density with sensible weak-mob health, 6+ functioning upgrades, and unchanged 1.0 content. Run deterministic unit/mechanic checks, real-browser landscape/portrait mobile tests, source/live hash checks and hardware playtests. Aim for 60 FPS, target ≥30 sustained FPS on representative real Samsung hardware; Chrome alone cannot certify hardware FPS. Make `docs/cataclysm-1-1/` (plus versioned lab if needed) and do NOT edit either original 1.0 game directory or URL. No publish without independent QA and accepted candidate. The creator decides final artistic acceptance.

**Studio preflight:** the old mobile route targets `docs/cataclysm/` with limited asset scope; the old autonomous route targets `docs/preview/`; the existing art workflow was designed for the historical 1.0 anatomy. Therefore, a **versioned artifact and orchestration route** must be established before issuing production triggers; do not pretend an issue alone starts code generation. Keep a single shared orchestrator, independent art specialist and one release chain; do not proliferate version-specific legacy workflows.

### 1.2 — NINE LIVES

**Nine lives are a separate pool from HP.** HP can be damaged/healed during a life. On zero HP, lose one of the nine lives and revive after a short safe reset; at zero remaining lives, the run ends. No infinite invulnerability chain or death that resets all XP. Make extra lives rare, valuable, visible, and cap/recovery rules explicit. Boss-earned +1 lives arrive with 1.4, not via ordinary mob farming.

**Perks:** upgrade selections stay random; build-specific perks can unlock a fourth or fifth card, rerolls and unusual tail-weapon/follower interactions. Do not make the best build always simply faster firing. Balanced solo-cat and companion-heavy strategies must survive.

### 1.3 — FELINE COMPANY

Keep the current eight **Shooter, Healer, Tank, Brawler, Sniper, Engineer, Trapper, Bard**. Add eight genuinely different cats (working names and identities, creative director may refine the art/lore):
- **Angler:** catches fish, hunts special bait, sometimes brings danger to a fishing spot.
- **Scout:** identifies useful off-screen pickups and ambush approaches.
- **Alchemist:** eats fish to brew unstable buffs and enemy debuffs.
- **Salvager:** transforms abandoned props and scrap into devices.
- **Saboteur:** uses decoys, blinds enemies, disrupts dangerous casters.
- **Stormcaller:** channels crowd-control arcs and electrifies wet areas.
- **Courier:** very fast rescue, pickups and **feeding other companions** rather than returning all fish to the player.
- **Hexcat:** curses enemy traits, counters elite evolutions, creates risk/reward debuffs.

**Companion economy and autonomy:** companions forage and **eat their own fish**; they do not automatically turn their catch into player currency. Ordinary mob fish drops become rarer. Player XP is still earnable without monopolizing fish. Fish from bosses, fishing, caches and encounter objectives sustains both strategies. Each cat switches among follow, attack, feed, escape, protect, forage, rest, recover, joke and squad-formation states contextually. No new manual squad orders. Companions have individual pacing; a fast player can outrun them, triggering clever catch-up behavior.

**Levels and evolution:** start with clear per-companion Level 1→3 progression from actual work, fish consumption and special events; Level 3 unlocks an identity-defining evolution, not only +10% damage. Unlocking Level 3 does not force fusion. Two Level 3 cats with an eligible bond may combine, occupy **one** of the four active slots, and free one slot for another recruit. Both component cats are committed to the fusion until its defined end/reversal; no duplicate free companions.

**Signature fusion:** Level 3 **Engineer + Level 3 Shooter → MECHA CREW**. The Engineer builds and maintains a mobile mecha, Shooter climbs in and mows down zombie crowds, with deployment, boarding, ammunition/heat, breakdown and repair animations. This is one squad member (one slot), but its output must have balanced cost/downtime. Other possible first-release fusions: **Angler + Trapper → Trawl Team** (nets and rare catches), **Scout + Sniper → Spotter Pair** (long-range weak-point marking), **Bard + Stormcaller → Thunder Chorus** (rhythmic AOE). Show fusion as an illustrated performance.

### 1.4 — THE UNSEEN CITY

**The world is known by the game but not fully exposed during a run.** Generate a coherent seeded city/district topology with connected roads, obstacles, opportunities and area/biome boundaries. Show a beautiful *world map in the menu or between runs*, recording discovered districts and unlocks. During active play there is **no conventional minimap**; show only a small smart off-screen arrow to the nearest reachable valuable **magnet, rage or beacon** (with icon/distance), so players still explore. Avoid arrows pointing through locked areas or screen clutter.

**Area boss logic:** surviving and defeating a threshold of enemies in a zone provokes that area's guardian. An optional risky in-world action (entering a beacon circle rather than a button) can accelerate the provocation. Each unique eligible boss can rarely restore **+1 life** when provoked and defeated; reward is once-per-unique-area-boss per run to prevent farming. If near maximum life capacity, a valuable alternate reward should appear. Nine lives are meaningful, not infinite via repeated boss farms.

**DPS checks and unlocked areas:** periodic rising-pressure zombie waves test the current build, with visible countdowns, elite telegraphs and reasonable escape corridors. Passing opens another district or route. Failing has legible consequences — temporary containment, escalating hazard, missed shortcut — rather than a permanent unwinnable softlock. Scale wave budgets to stage + build without punishing high DPS instantly or spawning mobs inside the viewport.

### 1.5 — HOOK, LINE & CATNIP

**Fishing is a risky exploration mechanic, not a separate mandatory minigame with new combat buttons.** Discover fishing spots in the city and later underground. Enter and remain in the spot briefly to cast automatically; movement away cancels or reels in, preserving movement-only play. Rod, line and bait are buildable/upgradeable via random cards. Worm, glowing fishbone, royal catnip and other special baits change catch tables, danger and companion interest. A giant catch may be a treasure, mutant or enemy ambush.

**Jackpot counter:** an original fish-and-combo scoring lane rewards exceptional catches, stylish near-death escapes and boss provocations; high jackpots are rare, transparent and cannot make ordinary survival score meaningless. The fish economy needs a real supply/demand simulation: fewer mob drops, competing companion appetites, fishing/caches/bosses as alternative sources. No boring mandatory fishing grind.

### 1.6 — MUTATIONS AFTER MIDNIGHT

Add threat identities and combat counterplay rather than making dozens of color swaps. Candidate mechanics: **Mimic Strays** disguise themselves as harmless pickups; **Bell-Ringers** signal reinforcements unless interrupted; **Roof Pouncers** leap off-screen with telegraph shadows; **Necro-Groomers** temporarily reassemble defeated zombies; **Pack Leaders** coordinate dash formations; **Feral Cats** attempt to eat valuable fish before the squad can. Expand elite and biome-boss evolutions, flying and combining mutant chains, and environmental special hazards. Avoid unbounded particle and mob performance spikes.

Add contextual banter for player, companion personalities and fusions: arriving in a biome, gambling on bait, snatching fish, rescuing a friend, activating overdrive, losing a life and finally seeing the Sphinx. Original music adapts to waves, fishing tension, companion specials, boss provocations and the last life. Dialogue remains short and placed to avoid covering the player.

### 1.7 — THE LONG NIGHT

**1000 nights** as a meaningful marathon, not 1000 identical timers. Use ~10–11 seconds average active night time if the target is a roughly three-hour real-play campaign; keeping the original 13-second night for 1000 nights would take about 3h37m *before* card selection and pauses. Let boss encounters create natural peaks rather than mechanically prolong each night. Every 100 nights is a chapter, with biome, visual/music and threat evolution. Save/resume between chapters and safely after phone backgrounding — serialized seed, unlocks, lives, equipment, fish, squad status, zone state and pending encounters, with version/schema migration and corruption recovery.

**Endless Mode** unlocks after completing the designed 1000-night story. It is opt-in and may continue indefinitely with periodic new biome cycles, adaptive threat budgets, record tracking and fair performance caps. A phone restart must not erase three hours of progress. Test accelerated simulated runs and real 30-minute sessions; memory, audio nodes, active bullets, NPCs and effects must remain bounded.

### 2.0 — THE CATACOMBS

**2.0 three-weapon system:** The cat gains **two independently equipped hand guns plus the existing tail gun**, each with independent upgrades (weapon type, damage, speed, pierce, bounce and special effects). All auto-aim; movement remains the only active combat control. This feature was moved from 1.2 to 2.0 by the owner's 13 November 2026 clarification. Preserve the expressive quadrupedal character identity while introducing all three visible weapons.


Deliver the complete connected world, polished main menu, accessible world-map / district records, unshown active-play topology, illustrated codex of enemies and evolved companions, fusion journal, rare fish/bait collection, jackpot history, upgrade/weapon mastery, completed 1000-night chapters, nine-life scoreboards and Endless unlock. The city descends into underground catacombs as a final dramatic region, with its own ecology, fishing opportunities, bizarre boss mechanics and authored art. **The Sphinx** is the signature final boss, preceded by character-driven cataclysmic encounters. The final encounter should test curiosity, risky builds and squad cooperation, not only raw HP.

The ending should feel like an earned discovery while leaving a truly replayable roguelite: different seeds, choices, routes, bosses, compounds, conversations and failure stories.

## Studio work orders and boundaries

**One creative milestone at a time.** Let the studio split the milestone into design, gameplay, art, animation, audio, integration and independent QA without asking for approval on every small choice. Give each department a clear input, expected playable evidence, and protected files/interfaces. Agent names are functional roles, not a claim that dozens of independent workers always run concurrently.

**Version safety:**
1. First create a distinct 1.1 game/test path and branching plan, with hard path checks that fail if any release/campaign folder from 1.0 is edited. Switch Cataclysm's active studio target and video-review handoff to the new development version explicitly; current `mobile_jobs.target_for` maps major-version jobs to `docs/cataclysm`, NOT a version-specific 1.1 folder.
2. Pin every milestone to a source commit and stable playable URL; preserve the previous release unchanged. Work only on a version-named feature branch. Never merge an unrelated studio artifact.
3. Each milestone must produce an actual **mobile playable build**, a 15–30 second gameplay recording of its defining feature, source/change log, tests, known limitations and a rollback pointer. Scripts passing are not a substitute for gameplay video or owner playtesting.
4. Automated tests: start, touch/movement-only controls, pause, upgrade cards, companion cap, performance, no draw/asset errors, preservation of 1.0, new feature's rules and failure cases. Review gameplay at real Samsung scale; for art, compare actual animated pixels, not frame counts. Protect original soundtrack and dialogue.
5. The Producer can challenge requirements with evidence and offer creative alternatives, but cannot silently omit an agreed feature. Defer difficult features transparently in the milestone record rather than claiming completion.
6. Scope and spending: one open Cataclysm job per milestone; predefined budget/time limit and at most one engineering repair cycle unless the creator authorizes another. No auto-infinite retries, no mass workflow creation, no daily publishing. A failure leaves the previous playable release intact.
7. The scheduled Drive gameplay review currently checks twice daily (06:20 and 18:20 UTC, if enabled and correctly credentialed). It must **never automatically retarget frozen 1.0** or initiate an unrelated 1.1 release. Gate its actionable output to an active, explicitly authorized game version.
8. A release is accepted by the game's creator after a playable build; the independent test pipeline may reject safety/functional failures but should not pretend mathematical joint tracking determines whether cartoon animation is beautiful.

### Release definition of done

- Every promised feature has a visible in-game demonstration and a reproducible test or explicitly recorded human visual review.
- Both gameplay and graphics are distinctive, readable on a real phone, and amusing in context.
- Mobile controls remain movement-only and the game remains playable without touching menus during fighting.
- Randomness generates varied but viable build paths; rare events are rare and reasonably discoverable.
- No silent modifications to released 1.0 paths, no missing assets, no non-working Night99 laboratory, and no requirement for the creator to babysit GitHub Actions.

## The next studio order — **NOT EXECUTED**

**Cataclysm 1.1 — EVERYTHING DRAWN.** Create a completely separate development branch and playable 1.1 URL from frozen 1.0. Give the visual department creative responsibility for one coherent illustrated art bible and hand-drawn/painted game, especially the white protagonist's full acting range, while preserving all existing 1.0 mechanics. Treat the entire hero/squad/enemy/UI as one artistic direction, not isolated overlays. Implement, integrate, test, record gameplay, then present a playable 1.1 with a concise art-change report and honest known issues. Do not launch companion/world/weapon expansions yet.

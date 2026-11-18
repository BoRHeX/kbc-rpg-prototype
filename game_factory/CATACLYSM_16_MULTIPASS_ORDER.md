# CATACLYSM 1.6 — MUTATIONS AFTER MIDNIGHT
**Owner-authorized order:** 18 November 2026 — "Do 1.6".
**Product continuity:** ONE evolving Cataclysm game. Actual merged 1.5 HOOK, LINE & CATNIP is the direct source baseline. 1.6 is next in the explicit release order; **1.69 follows 1.6**, it is not skipped, and no future milestone is authorized by this order.
**Source:** `docs/cataclysm-1-5/`, merged PR #94. `docs/cataclysm-1-5/STUDIO/CANDIDATE_STATUS.json` currently records a PLAYABLE browser-smoke candidate, although its long-form report marks visual/in-depth QA PARTIAL/BLOCKED on the limited agent runner. The owner has not personally accepted 1.5 in this conversation. That is acceptable for an experimental cumulative 1.6 branch but never claim the baseline was comprehensively verified.
**Output:** `docs/cataclysm-1-6/` and an honestly labeled `docs/cataclysm-1-6-candidate/`. Preserve all 1.0–1.5 URLs, directories, and source verbatim.

## Approved core: genuine mutant enemy ecology rather than recolors
The explicit original 1.6 roadmap introduces real threat identities and counterplay:
1. **Mimic Strays:** visually pretend to be ordinary fish, magnets or pickups; reveal through a readable tell and lunge when approached. They MUST NOT turn every pickup into an unavoidable trap; give timing, detection/escape and rewards.
2. **Bell-Ringers:** summon extra reinforcements by ringing a sonic bell; delay can be interrupted by player/companion damage, and number of living summoners must be bounded. Distinct bell artwork and recognizable audio.
3. **Roof Pouncers:** jump into view from off-screen rooftops with telegraphed ground shadow, then lunge into a predicted landing point. Avoid spawning outside city collision bounds and avoid non-telegraphed instant damage.
4. **Necro-Groomers:** reanimate defeated zombies or recombine wrecks into stronger undead; revival has a limited corpse budget/cooldown and is stopped by killing/interruption. No runaway exponential spawn.
5. **Pack Leaders:** organize coordinated charge/flank/dash formation with weaker pack cats; readable leader aura and visible reaction when leader dies. Avoid all mobs being pure HP inflation.
6. **Feral Fish Thieves:** race toward genuine collectible fish/player catch drops, attempt to steal/eat/deny fish from player and companions, and may be distracted by bait/fishing; defeated thieves can refund a portion. Verify atomic fish economy and Angler/Courier/Mecha interactions.

**Mutant combination/flying mechanics:** preserve and actively exercise existing flying and fusion/combining enemies, then evolve at least one NEW mutant combination chain with clearly different behavior, e.g. Bell-Ringer+Necro-Groomer or Pouncer+Pack Leader; risk should change in play, not only a stat multiplier. Enforce per-wave elite/boss budgets, independent caps, graceful cleanup/retreat and mobile performance.

**Boss/elite evolutions:** introduce at least two mechanically different elite evolution states or boss phases, reading city district and previously provoked guardians; don't overwrite or trivialize 1.4 guardians or fishing hazards. Meaningful readable telegraphs, attack patterns, and counterplay for viable solo/tail versus companion builds. Late-game tuning should react to user's repeated full 100-night victories without losing any of 9 lives in 1.3 and 1.4, but DON'T simply inflate HP or kill rate in a cheap way.

**Dialogue and music:** richer short character and companion reactions to each mutant type, fish theft, fishing bait, fusion, biome hazard, rescue, boss provocation and last-life danger. Music dynamically adds/layers original stems based on wave pressure, mutants, fishing tension and near-death state; use actual sound files and inherited volume/mute controls. Prevent audio spam, one-shot loops, too many AudioContexts, and captions obscuring the cat.

**Illustrated art and animation:** Generate three ORIGINAL illustrated 1024x1024 PNG atlases with actual image API:
- `mutant-pack-atlas`: distinct original drawn full-body characters for Mimic Stray, Bell-Ringer and Roof Pouncer, 2–3 pose variations each.
- `mutant-necromancy-atlas`: Necro-Groomer, Pack Leader and Feral Fish Thief, clear silhouette and multiple poses.
- `evolved-night-boss-atlas`: vivid late-night mutant boss/evolution forms with readable attack/telegraph variants, dark neon cataclysm aesthetic.
Transparent sprites, explicit alpha, hash/asset manifest, derived actual animated frames and integration into game runtime. Renderer may draw code-native VFX/telegraph rings but must not substitute geometric placeholder characters and claim hand-illustration is complete.

**Inheritance is nonnegotiable:** same actual game, one-handed movement-only combat, white running quadruped/tail gun, nine HP/lives rules, cards/rerolls, 16 companion identities and unique Level-3 evolution, max four squad slots, one-slot Engineer+Shooter Mecha fusion, all current fish-eating behavior and new 1.5 casting/bait/jackpot/ambush mechanics, seeded city districts/map/route arrow/gates/guardians/rare life rewards, original score and restart mechanics. Preserve original art/music, don't silently drop old boss/enemy families.

## Production process — executable autonomous studio
**Five isolated sequential passes,** each with a versioned GitHub Actions artifact:
01 Concept, encounter budget, threat telegraph design, animation/art/audio specifications and dependency plan (STUDIO/CONCEPT.md, STUDIO/ASSET_PLAN.json).
02 Real raster image API generation, max three files, manifest SHA hashes and truthful ART-BLOCKED errors.
03 Spritesheet/animation preparation and original music/SFX stems actually delivered as files. Save frame index, audio index and handoff report.
04 Integrate six real enemy behaviors, fusion chains and existing city/fishing/companion mechanics in runtime; use real PNG references in rendered sprites, original sounds and UI. Actual functional JS, not just documentation.
05 Post-integration gameplay/visual/audio polish, source tests, 390x844 and 844x390 Chrome browser startup/real drawing, deterministic AI state machine and gameplay economy checks, QA known defects report.
Autonomous 06–08 optional repairs only when specific QA/department reason is recorded; hard budget cap 3, no infinite retries, no required individual creator approvals. Codex calls must run on separate runners to avoid drop-sudo failure. Workers only edit `docs/cataclysm-1-6/`; publish job may additionally create `docs/cataclysm-1-6-candidate/`.

**Release policy:** After each pass always preserve source and artifacts. The final release job attempts to commit and publish new 1.6 experimental candidate EVEN IF BROKEN with status BROKEN/PARTIAL/PLAYABLE based on actual evidence. Previous 1.5 remains untouched. No fake claims of Samsung hardware tests. The current image API worked for 1.4/1.5, but this run must separately verify it. Don't label broken "playable" or automatically promote 1.6 stable.

## Explicit acceptance / diagnostic questions
- Do six mutant families perform ACTUAL different decisions in deterministic fixtures, each with readable spawn tell and bounded attack/summon/fish impacts?
- Are corpse revival and new combining mutants finite? Can interruption prevent summons/revives? Does killing Pack Leader disorganize the pack?
- Do mimic/roof pounce spawns respect district solid walls and reachable bounds (recent 1.4 bug regression)?
- Is stolen bait/fish applied to the 1.5 atomic ledger exactly once, preserving player XP, companion feeding, rare jackpot and fishing cooldown?
- Does the game's visual runtime load/draw actual generated mutant raster sprite frames rather than only canvas circles?
- Does adaptive music respond to gameplay state without overloading audio performance?
- At Night 80+ do weaker/solo and high-DPS squad builds have meaningful choices, not only sponges?
- Do inherited Mecha Crew, one-slot fusion, nine lives, pause-world-map and rod/jackpot still work after 1.6?
- What genuinely works, what's broken or not fully tested, and where is each source/test proof?

## Source evidence
Authoritative: `game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md`, `game_factory/CATACLYSM_MASTER_LEDGER.json`, `game_factory/CATACLYSM_STUDIO_CONSTITUTION.md`, `game_factory/STUDIO_MULTIPASS_PRODUCTION_POLICY.md`, multipass council policy, the **current actual 1.5** `STUDIO/FINAL_REPORT.md` and `STUDIO/INTEGRATION_REPORT.md`, game source and in-repo QA fixtures. Version 1.6 delivered as ONE next version; future 1.69 remains pending separate authorization.

# Cataclysm — Council-proposed roadmap from 1.2 to 2.0

**Status:** advisory proposal, not automatically creator-approved or implemented.

**Product:** game: Cataclysm; continuity: ONE ongoing video game: 0.1→1.0 The Catastrophe→1.1→1.2→1.3→1.4→1.5→1.6→1.69→1.7→1.8→1.9→2.0 The Catacombs; current: 1.2; major_milestones: 1.0: The Catastrophe; 2.0: The Catacombs; intermediate_updates: 1.3; 1.4; 1.5; 1.6; 1.69; 1.7; 1.8; 1.9; count_intermediate: 8; version_order_note: Custom display labels not semver; 1.69 not numerically sorted

**Eight updates:** 1.3 → 1.4 → 1.5 → 1.6 → 1.69 → 1.7 → 1.8 → 1.9 → **2.0 THE CATACOMBS**.



## Council's eight integrated releases

### 1.3 — FELINE COMPANY

**Player experience:** Doubling companions to 16 cats with full autonomous fish-eating economy, distinct AI states, real Level 1–3 progressions, signature evolution fusions including Mecha Crew. Visibly smooth, expressive animations and banter enrich squad dynamics visible from game start.

**Mechanics:** Companions forage and eat fish independently, fish drops rarer, evolving fusion slot accounting for squad of four active; Mecha Crew fusion mechanics with boarding, heat management, repair downtime. Telemetry logging for fish resource and AI pacing introduced.

**Content/cast:** Adds 8 new companions (Angler, Scout, Alchemist, Salvager, Saboteur, Stormcaller, Courier, Hexcat) with unique support/combat roles plus fusion combos (Mecha Crew mandatory; several optional), companion banter and feeding behaviors integrated.

**Illustration/animation:** Fully hand-drawn animated companion sprites and fusion sequences including Mecha Crew boarding/disembarking, independent tail gun muzzle recoil preserves leg animation, detailed companion idle, run, feed and joking animations at mobile resolution.

**Original music/SFX:** Unique companion sound cues for feeding, fishing, and fusion bursts; adaptive banded music layers respond to squad state and fish economy tension; banter voice lines expanded.

**UI/touch:** Clear HUD showing companion levels, fusion readiness, fish economy indicators; all controls remain movement-only with automated targeting and no extra combat buttons.

**Engineering/QA:** Full AI telemetry integration enables proactive bug detection; deterministic unit tests cover fusion slot logic, fish economy sync, and companion state transitions; 30–60 FPS mobile performance target verified on Samsung devices; isolated build with no legacy code breakage.

**Inherited:** Maintains all 1.2 features including nine lives, tail gun combat, and upgrade cards; inherits animation states and movement-only input control.

**Dependencies / handoff:** Foundation for all subsequent versions; gating requirement for full 1.4 seeded city gating and companion-dependent mechanics; must be integrated and tested fully before 1.4 merges; fish economy telemetry feeds 1.5 fishing design.

**Tradeoffs:** Delays full 1.4 world exploration to avoid brittle integration; excludes fishing (1.5), seeded districts (1.4), mutant eco (1.6); complexity focuses on companion autonomy, fusion and stable resource tracking to avoid regression.

**Demo:** Playable demo with fully animated 16 companions including Mecha Crew fusion, fish-aware companion AI pacing runs; stable companion and fish economy telemetry artifact; clean 30+ fps video on real Samsung mobile; deterministic regression test logs; full mobile UI layout.

**Approval status:** approved



### 1.4 — THE UNSEEN CITY

**Player experience:** Seeded deterministic city districts guide exploration via world map outside runs; in-run no minimap but offscreen arrow indicating nearest reachable magnet/rage/beacon; DPS gated waves unlock new districts; area bosses provoke rare +1 life rewards, requiring tactical progression.

**Mechanics:** Deterministic city topology with interconnected districts, roads, obstacles; DPS-check waves test player power and open new zones; provoked unique area bosses yield rare +1 life once per run; failure produces hazards unobtrusive to progress; all gating leverages companion AI states post-1.3; companion-lite AI stubs allowed for prototyping only.

**Content/cast:** Expands world lore with thematic districts, unique boss encounters and provocation systems; companion roles connected (Scout, Courier, Angler) influence district navigation; no fishing or fusion changes.

**Illustration/animation:** Hand-painted multi-layered animated city tiles with weather, dynamic lighting, skyline, ambient VFX; unique boss art and animations scoped as isolated vertical slice for early prototyping; no intrusive minimap HUD.

**Original music/SFX:** Ambient city soundscapes and district-specific environmental music; DPS-check and boss encounter hooks add tension; subtle directional sound cues support offscreen arrow.

**UI/touch:** Consistent movement-only controls; HUD minimalism with offscreen arrow icon/distance category; world map accessible outside runs; progression and kill counters included; companion UI integration deferred to 1.3 completion.

**Engineering/QA:** Runs in isolated feature branch with strict gating to prevent premature fusion/fish economy logic in live builds; deterministic seed mapping; performance capped to prevent frame rate dips on mobile; QA on directional arrow reliability and DPS gating console.

**Inherited:** Inherits full companion AI autonomy and fusion slot management from 1.3; preserves tail gun control and nine lives system; no fishing integration.

**Dependencies / handoff:** Requires stable 1.3 companion autonomy; handoff to 1.5 fishing economy leveraging companion fish-eating; foundational for 1.7 campaign navigation and pacing.

**Tradeoffs:** Prototyping 1.4 vertical slices allowed with companion-lite AI stubs for faster progress; excludes fishing (1.5), mutant ecology (1.6); no public releases without 1.3 integration.

**Demo:** Playable district navigation demo with seeded deterministic maps, offscreen guidance arrows, DPS gate countdowns, and boss provocation animation; companion-lite AI stub verified; stable playable URL with performance and regression tests on Samsung hardware.

**Approval status:** approved



### 1.5 — HOOK, LINE & CATNIP

**Player experience:** New fishing mechanic automates casting when stationary in fishing spots; bait and rod types unlockable through random cards; jackpot scoring for rare catches; contested fish economy shifts resource control to player and companions; fishing risk/reward diversifies exploration without adding combat input buttons.

**Mechanics:** Risk-timed automatic fishing system cancelable by player movement with rods and baits; jackpot counters reward stylish near-death escapes and special catches; fish economy rebalanced reducing mob fish drops to balance companion appetites and boss/caches yield; no new combat buttons; companions show autonomous selective fishing interest.

**Content/cast:** New fishing spots with water environments; multiple fish varieties including mutant/risky species and treasure; bait and rod upgrade cards; companion fishing reactions integrated; no new companions.

**Illustration/animation:** Fish spot locations, rod casting/reeling with animated lines and water ripples; splash and struggle animations synchronized with catch events; companion animated reactions to jackpot and ambush.

**Original music/SFX:** Gentle water splashes, line tension sounds, suspenseful catch jingles; jackpot fanfare audio cues; fishing-themed adaptive music motifs; distinct companion fishing interest and reaction voice samples.

**UI/touch:** Fishing spot indicators on HUD; jackpot scoring lane; bait and rod status shown clearly; controls fully compatible with movement-only input; fishing canceled automatically by player movement.

**Engineering/QA:** Catch outcome deterministic tests; bait effect logic verified; companion/city fish economy simulated and balanced; performance budget maintained; extended playtests on mobile devices for fishing UI clarity and input latency.

**Inherited:** Fish economy depends on 1.3 companion fish-eating autonomy; no new companion additions; inherits 1.4 district navigation; no DPS gating changes.

**Dependencies / handoff:** Requires full 1.3 fish autonomy and 1.4 district seeded city; prepares for mutant ecology layered in 1.6.

**Tradeoffs:** No combat input creep; excludes mutant enemies; fully integrated with companion fish economy; avoids monotony via jackpot risk mechanics.

**Demo:** Playable fishing demo with rod casting animation, bait variety, jackpot scoring lane with visual feedback; deterministic catch outcomes and companion reactions; performance tested on Samsung phones.

**Approval status:** approved



### 1.6 — MUTATIONS AFTER MIDNIGHT

**Player experience:** Diverse new enemy families with unique telegraphed attacks, elite and biome-specific boss evolutions; environmental hazards and biome differences enrich tactical counterplay; companion fusion banter and dynamic adaptive hard-rock/electronic soundtrack layers heighten immersion and tension.

**Mechanics:** Six+ distinct enemy types (Mimic Strays, Bell-Ringers, Roof Pouncers, Necro-Groomers, Pack Leaders, Feral fish thieves) each with unique AI and attack patterns; elite and boss evolutions with phasing and biome-specific hazards; fusion cocoon and trait inheritance mechanics; balanced threat scaling with telegraphing; companion AI voice banter and fusion chatter added.

**Content/cast:** Full art roster of new mutants and evolved bosses with visual behavioral differences; enriched biome variation; animated environmental hazard effects; expanded companion interactions and dialogues.

**Illustration/animation:** Distinct mutant sprites, boss evolutionary states with phasing; robust telegraphed attack animations; particle and biome VFX capped for performance; integration of companion fusion auxiliary animations.

**Original music/SFX:** Adaptive layered soundtrack with tense electronic/rock elements responding to wave intensity and boss encounters; new ambient biome soundscapes; extensive companion fusion banter lines and enemy SFX with performance caveats.

**UI/touch:** Improved enemy telegraph UI clarity; no new combat input; companion banter audio integrated unobtrusively; preserves movement-only controls.

**Engineering/QA:** New AI traits and state machines tested with stress on performance; bound particle budget and animation frame count policies enforced; adaptive audio scheduling validated at mobile scale; companion banter linked to game state telemetric logging.

**Inherited:** Builds on full 1.5 fishing and 1.4 city gating; companion fusion and fish economy fully integrated; telegraph and AI pattern data must align with prior releases.

**Dependencies / handoff:** Stable 1.3–1.5 integration; prepares foundation for 1.69’s companion-fusion story events and urban environmental effects.

**Tradeoffs:** Prioritizes depth in enemy variety and biome hazards; no new fishing or district exploration expansions; focused on tactical combat challenge refinement.

**Demo:** Playable combat demo with new enemy families, elite evolutions, and telegraph attacks; companion fusion banter heard; performance and memory budget profiles safe on target devices.

**Approval status:** approved



### 1.69 — THE WILD CARD

**Player experience:** A rich thematic vertical slice uniting fusion synergy aura mechanics, an urban festival city district event featuring dynamic lighting and NPC crowds, a new mystical companion ‘Archivist Cat’ with aura pulse abilities, and mild environmental mutations affecting companion AI and enemy spawns; novel adaptive fusion-driven soundtrack layers and expressive banter enrich atmosphere without input complexity increase.

**Mechanics:** Introduces temporary symbiotic link buff auras between companions affecting crowd control and fish economy pacing; timed ‘city festival’ event district morphing ambiently alters enemy and companion effectiveness; one new companion adding unique fusion and curse/heal duality powers; mild mutation swap randomization optional toggle; companion meta-communication signals enrich emergent narrative and tactical options.

**Content/cast:** One new mystic companion with dedicated art and animation; festive city district art with time-limited dynamic illumination; NPC festive crowds and new particle effects (fireflies); unique fusion pulse aura effects with corresponding sound motifs; companion banter expanded to reflect event engagement and emotional states.

**Illustration/animation:** Layered dynamic festival lighting and particle VFX; companion pulse aura visual overlay with soft animated arcs; emotive companion animation states; NPC celebration gestures; atmospheric city wall murals illustrating mystical themes.

**Original music/SFX:** New fusion conductor adaptive soundtrack component responds to companion fusion states dynamically; festival-themed melodic motifs; city ambient soundscapes including crowd murmur and firefly chimes; companion emotional banter and spell sound effects expanded.

**UI/touch:** Unobtrusive companion signal prompts indicating meta-communication; timed event progress indicators; no new player combat inputs; preserves movement-only gameplay; HUD adapted for event visibility.

**Engineering/QA:** Integrated fusion pulse mechanic conforms to 1.6 combat contract; event district runtime effects bounded for performance; telemetry logging tracks companion aura uptime and emotion state changes; extensive regression testing to guard marathon campaign pacing; vertical slice isolated in dedicated deployment path.

**Inherited:** Builds directly from 1.3 companion fusion and 1.6 combat; extends 1.4 district environment with interactive lighting; prepares 1.7 marathon narrative pacing and save system.

**Dependencies / handoff:** Requires steady 1.3–1.6 integration; prepares emotional player-companion investment and tactical depth for 1.7 1000-night campaign; handoffs to 1.8 fusion expansion and urban biome dynamic events.

**Tradeoffs:** Avoids combat system overhaul; limits mid-run random mutation complexity for stability; confined to a single seeded district event and companion; balances narrative depth with performance constraints; experimental but scoped for vertical slice proof-of-concept.

**Demo:** Playable urban festival event run with expressive new companion fusion aura, festively lit district, and a single scripted mini-story vignette; adaptive soundtrack demo looping; companion banter and meta-communication observable; mobile performance test on Samsung hardware; no input complexity beyond movement-only.

**Approval status:** proposal_only



### 1.7 — THE LONG NIGHT

**Player experience:** A stable 1000-night marathon campaign segmented into ~10 chapters (~3 hours total), featuring progressive biome evolution, escalating threat pacing, checkpoint and safe resume on mobile supporting phone backgrounding and schema migration; unlocks an Endless Mode providing infinite replay with adaptive difficulty and score tracking.

**Mechanics:** Implements save/resume with corruption repair and incremental snapshot diffing; escalating DPS gating with biome and enemy evolutions; distinct chapter-specific rewards and boss gauntlets; companion fusion progression persists; pacing shaped for mobile session length; unlock Endless Mode upon campaign completion.

**Content/cast:** Expanded chapter biome art and enemy variants; boss evolution sequences; enriched companion banter crescendo; subtle fatigue/adrenaline animation layers; progressive music score arcs with crescendo and thematic stingers.

**Illustration/animation:** Dynamic environment themes evolve per chapter (lighting, weather cues, skyline changes); detailed boss phase animations; gradual visual fatigue and adrenaline expressions for player and companions; improved save/load and checkpoint HUDs.

**Original music/SFX:** Thematic chapter scores with dynamic crescendo/decrescendo; unique boss fight hooks and ambient soundscapes; refined volume mix controls supporting quiet mobile sessions; companion fusion melodic cues deepen immersion.

**UI/touch:** Campaign progress tracker UI with chapter numbers and statuses; save/restore interface optimized for phone and one-thumb use; Endless Mode selection menu integrated; no additional combat control buttons.

**Engineering/QA:** Robust mobile save architecture with serialized RNG and incremental diffs tested; phone background safe suspend/resume verified; performance caps enforced during extended runs on Samsung hardware; telemetry review of companion pacing and resource consumption over long runs.

**Inherited:** Fully compatible with 1.3–1.6 content including companion fusion and fish economy; extends 1.4 district gating into curated multi-chapter pacing; depends on 1.69 narrative and fusion synergy innovations for deeper player engagement.

**Dependencies / handoff:** Requires stable 1.3–1.6 and 1.69 event foundation; provides core gameplay overhaul for 1.8 fusion depth and 1.9 polish integration; critical gating milestone for 2.0 progressive weapon and underground biome systems.

**Tradeoffs:** Focused on stability and pacing polish, no new major combat or exploration mechanics; performance-budgeted to sustain multi-hour mobile runs; narrative progression layered gradually to avoid fatigue.

**Demo:** Full 1000-night campaign playable run highlighting save/resume, chapter transitions, escalating difficulty; distinct biome visuals and audio per chapter; eventual Endless Mode unlock; stable UI and performance on Samsung devices; verified deterministic replay consistency.

**Approval status:** approved



### 1.8 — DISTILLED ADVANCEMENT

**Player experience:** Deep companion fusion system expansion with new hybrid combos beyond Mecha Crew, including fusion break/repair mechanics; companion synergy UI panel showing mood and buff states; introduction of dynamic city weather and lighting affecting visibility and enemy behavior; subtle tactical scripted side missions with fusion synergy incentives.

**Mechanics:** Expanded companion fusion tree with unlockable passive synergies; new companions’ emotional mood impact on AI behavior and player banter; city biome weather states causing fog, rain, lightning; companion AI adapting behaviorally to environmental conditions; scripted emergent tactical encounters for side missions.

**Content/cast:** Additional companion fusion combinations unlocked; weather effects influence enemy types and companion roles; new visual weather VFX; tactical side mission content seeded procedurally; companion emotional animation states enhanced and banter variety increased.

**Illustration/animation:** Layered hand-drawn weather VFX (fog shrouds, rain particles, lightning strikes) with reflective wet surfaces; companion fusion ritual and mood animations; dynamic lighting and shadow play across districts; smooth HUD fusion panels and weather indicators.

**Original music/SFX:** Weather-dependent adaptive audio layers merging naturalistic city and environmental sounds with mutant combat tension; fusion ritual sound stings; companion mood-driven dynamic banter tracks; subtle tactical encounter music cues.

**UI/touch:** Expanded companion fusion UI with detailed synergy and mood indicators; weather and visibility state icons; integrated tactical side mission markers; mobile optimized HUD maintaining one-thumb movement-only control; no new combat buttons.

**Engineering/QA:** Introduces environment and weather system modules; integrates companion mood telemetry into UI; performance impact profiled and capped; ensures mobile-friendly frame rates with weather effect toggles; rigorous QA on companion fusion states and behavior under varying lighting.

**Inherited:** Builds on 1.7 marathon structure and full previous companion fusion mechanics; extends 1.69 event themes with rich fusion and environmental interactions; prepares fusion UI and environmental system architecture for 1.9 polish and 2.0 gameplay.

**Dependencies / handoff:** Depends on solid 1.7 campaign save/resume stability and 1.69 fusion/aura foundations; gates richer companion tactical depth precursor to 1.9 integration and 2.0 triple-weapon prep.

**Tradeoffs:** Adds considerable complexity to companion fusion and environment but scoped with performance guardrails; side missions limited to scripted tactical vignettes to prevent sprawl; no new basic control schemes added.

**Demo:** Playable 1.8 runs demonstrating new fusion combos, weather impact on visibility/combat, side mission scenarios; companion emotional UI visible and reactive; stable mobile performance at 30+ fps; telemetry data evidencing behavioral adaptiveness.

**Approval status:** proposal_only



### 1.9 — POLISH & GATING

**Player experience:** Final system polish locking all previous companion, fusion, city, and campaign systems; performance optimization targeting stable 60fps on mid-range Android; unified menu and world map with integrated codex and companion evolution/fusion gallery; introduction of weapon upgrade UI affording preview of 2.0 triple-weapon system without live firing; comprehensive tutorials on fusion and multi-weapon synergy; save/load integrity with exhaustive schema migration.

**Mechanics:** No new combat mechanics; display of weapon trees for two hands plus tail in UI; refined companion fusion balance and slot occupancy; consolidated UI systems unifying upgrade, codex, world map and campaign progress; tutorial overlays and streamlined interaction design; fix regression bugs and polish companion AI pathing.

**Content/cast:** Additional companion fusion variants showcasing late-game diversity; refined coded portraits and full animation polishing for companions and foes; new codex entries and collectible records grouped coherently for player reference.

**Illustration/animation:** All new animations smoothly blended and uniform frame rates; polished muzzle recoil and tail gun firing effects; enhanced companion and environment particle effects tuned for mobile clarity; improved spritesheet packing reducing load times and memory usage.

**Original music/SFX:** Final mixed audio layers with developer-tunable volume controls; refined dynamic soundtrack transitions; integrated codex and menu sound cues; balanced companion fusion audio stings and fade-outs.

**UI/touch:** Fully scalable UI layouts accommodating portrait and landscape orientations; mobile accessible codex and world map overlays; tutorial and hint systems integrated contextually; HUD opacity and clutter toggles added; strict movement-only control input; tutorial baked-in for 2.0 multi-weapon control concepts.

**Engineering/QA:** Extensive regression suite over 1000-night accelerated play simulations; deterministic replay tests; memory footprint and frame rate optimized on real Samsung hardware; seamless save schema migration scripts; thorough crash and stability testing; rollback support ensured in build pipeline.

**Inherited:** Cumulative inheritance from 1.3 through 1.8 companion/fusion/city/campaign systems; UI and audio systems matured from 1.7 onward; codex and collectibles foundation laid; weapon system visuals scaffolded for 2.0.

**Dependencies / handoff:** Final gating milestone before 2.0; prepares player onboarding for complex triple-weapon combat; final polish and technical stabilization critical to 2.0’s release quality.

**Tradeoffs:** No new gameplay mechanics; intense focus on polish, bug fixing, and UI/UX finalization; excludes full weapon system firing which is saved for 2.0; constrained content additions maintain schedule.

**Demo:** Full system demo showcasing game-wide polish, codex navigation, fusion gallery, weapon upgrade trees; tutorials demonstrating fuzzy transition to 2.0 combat; stable 60fps and memory profile on physical devices; regression passing verified.

**Approval status:** proposal_only



## Major 2 0

requirements: Full triple-weapon system: two independently aimed handguns plus the existing tail gun, independent upgrades; Deep underground catacomb biomes with new traversal physics; New enemy archetypes and evolving boss phases culminating in the Sphinx; Unified menu, discovered city/world map, equipment/collections UI and companion fusion/gallery codex; Checkpointed 1000-night marathon campaign and unlockable Endless Mode compatible with all companion/fusion growth; Preserve mobile-friendly one-thumb movement-only controls and animation clarity; Extensive batch-tested save/resume schema migration with corruption recovery and mobile background safety; No silent removals of existing companions, fish economy, or nine lives system; backwards-compatible progression



## Overall Architecture

sequencing: Strict 1.3 companion AI autonomy and fusion rollout before full 1.4 city seeded district gating. 1.4 prototyping allowed in isolation with minimal companion-lite AI stubs to accelerate art/UI progression without risking gameplay regression. 1.69 identified as a narrative-mechanical vertical slice bridging fusion synergy and city ambience uniquely. 1.8 and 1.9 set as deep fusion expansions and polish gates preparing for 2.0 triple weapon complexity. 2.0 culmination with underground biomes and Sphinx final boss.; branching_and_versioning: Each version has immutable deployment URL, isolated artifact and source branch, including strict locking of legacy 1.0 builds. 1.4 prototype uses feature-flagged companion stubs. Telemetry and deterministic seed continuation govern save/load and testing. Save states use incremental delta snapshots starting 1.3 to prevent corruption on mobile devices.; core_systems: Detailed companion AI with autonomous fish economy and fusion slot accounting (1.3 base) underpin city exploration mechanics (1.4) and fishing economy (1.5). Distinct enemy archetypes with telegraphed attacks and biome hazards emerge in 1.6. Midroadmap synergy aura + companion memory meta-layer with adaptive soundtrack and animation pulse feedback featured in 1.69. Marathon campaign manifests in 1.7, layering pacing, checkpointing and evolving threats.; mobile_ux: Preserve movement-only one-thumb input rigor across updates. HUD evolves incrementally with overlays for companion levels, fusion state, fishing jackpot meters, offscreen reachable arrows while avoiding minimap clutter. UI codex and collection galleries appear in late roadmap. Save/load integrated menu with backgrounding safety from 1.7 onward. Adaptive audio volume/mute, reduced motion modes and mobile performance targets enforced.



## Dependency Graph

1.3: ; 1.4: 1.3; 1.5: 1.3; 1.4; 1.6: 1.3; 1.4; 1.5; 1.69: 1.3; 1.4; 1.6; 1.7: 1.3; 1.4; 1.5; 1.6; 1.69; 1.8: 1.7; 1.69; 1.9: 1.8; 1.7; 2.0: 1.9; 1.8; 1.7



## Novel Cross System Opportunities

CompanionMoodEmpathy: From 1.3 onwards, integrating companion emotional states affecting AI synergy, banter tone, and combat buffs/debuffs deepens player attachment without UI complexity, bridging narrative, animation, sound, and gameplay.; FusionPulseAura: 1.69 introduces tactically timed companion pulse buff auras influencing fish economy and crowd control, unifying economy, AI, and combat pressure dynamically, coupled with urban festival city event ambient environmental variation.; AdaptiveFusionConductor: Dynamic soundtrack agent weaving companion fusion states and fish economy tension into real-time evolving music layers enhances emotional immersion while maintaining mobile performance.; CompanionLiteAIStub: Parallel development of 1.4 district exploration and UI possible with minimalistic companion AI stubs simulating positional and fish data, accelerating art/design without full 1.3 dependency.; IncrementalSaveDiff: Save/load implemented as incremental snapshot diffs starting 1.3 improves campaign session integrity, reduces memory footprint and corruption risk on mobile, critical for marathon runs.; FluidCompanionLocomotion: Drop abrupt teleport catch-ups in favor of animated acceleration/deceleration blends improving immersion and perceived companion autonomy; a quality-of-life and immersion enhancer commencing in 1.3/1.4.; ShadowCompanionMode: Experimental late-game asynchronous AI 'ghost run' of companion squad mimicking prior run tactics broadens emergent gameplay and replay depth without adding input complexity.



## Areas Of Disagreement

1.3 vs 1.4 concurrency: Producer and Companion AI demand strict 1.3 completion before 1.4; Contrarian and Art Director propose isolated 1.4 vertical slice with companion-lite stubs to accelerate art/UI, risking brittle integration; consensus for tightly gated parallel prototyping with no public release until 1.3 stable.; 1.69 identity: Diverse conflicting proposals for 1.69 identity: narrative Urban Festival pulse aura (Creative Director), mutation swap mechanic (Contrarian), city spirits spectral companion (QA), symbiotic fusion redefinition (Art Director); final proposal fuses fusion synergy aura, urban festival ambience, new mystical companion and mild mutation randomization for controlled emergent gameplay.; Complex companion synergy in 1.8: Contrarian advocates deep social/morale synergy risking micromanagement, Producer and QA warn about mobile UX overload; compromise favors optional passive emotional states with banter and UI indicators.; Use of mutation swap mechanic: Contrarian supports it for replay surprise in 1.69; others prefer more limited experimental vertical slice focused on narrative/fusion synergy due to risk of unpredictability.; Companion teleport catch-up: Animator recommends full replacement with fluid leg motion; engineering notes performance and risk tradeoffs postponing full implementation beyond 1.3 depending on QA results.



## Source Evidence Gaps

1.69 precise scope: No creator-approved definitive identity yet; multiple competing proposals require final owner decision.; 1.4 companion-lite stub UX impact: Limited test data on whether partial companion AI stub in 1.4 accelerates real progress without integration regressions.; FusionPulse gameplay balance: Need empirical data on impact of timed pulse auras on fish economy and combat difficulty before 1.7 campaign.; Companion memory system: No detailed telemetry or gameplay impact evaluation provided; scope and complexity unclear.; Impact of fluid companion locomotion: Technical implementation details and mobile performance impact require prototype testing.; 1.8/1.9 tactical side missions and fusion expansions: Content design and performance profiling incomplete; UI complexity risk assessment pending.



## Approvals Needed

Final 1.69 concept identity and feature scope with owner signoff; Formal acceptance of 1.3 companion AI autonomy and fusion deliverables as gate for 1.4 full development; Authorization of 1.4 partial companion-lite AI prototyping scope and gating rules; Approval of companion emotional/mood meta-layer integration timing and optional UI implementation; Consent on scope and toggles for mutation swap mechanic in 1.69 or later; Confirmation of acceptance criteria for mobile frame rate, save migration and telemetry integration standards across 1.3–1.9; Decision on companion fluid locomotion implement timing and performance goals; Validation of 1.8/1.9 fusion system complexity caps and UI polish scope before ramping 2.0 development



## Immediate Next Steps

Lock down 1.3 FELINE COMPANY full companion AI autonomy, fish economy and fusion mechanics scope, begin high-fidelity implementation with telemetry and QA integration; Establish isolated 1.4 seeded district map vertical slice with companion-lite AI stub for parallel art, audio, and UX testing with strict feature gating; Define and document 1.69 vertical slice integrating fusion synergy aura, urban festival lighting effects and new companion with mild mutation randomization, develop prototype with expressive animation and adaptive soundtrack layers; Set up telemetry collection and analysis tools for companion AI states, fishing economy, fusion pulses starting 1.3; Design UI overlay concept for companion mood/empathy meter and fusion state display targeting 1.8 release; Plan save/resume system with incremental snapshot diffing strategy for robust 1000-night campaign persistence starting with 1.3 architecture and iterate through 1.7; Prototyping animation state blends for fluid companion locomotion to replace teleport catch-up, assess performance on Samsung hardware; Formalize QA acceptance criteria for each milestone including performance, functional regression, and mobile UX verification



## Interpret with caution

Original creator-approved mechanics in the source roadmap remain authoritative.

The special 1.69 identity and 1.8/1.9 proposals require creator approval.

No actual source was built; studio must check every feature against real code at each version.

Full attributed discussion: [FULL_TRANSCRIPT.md](FULL_TRANSCRIPT.md) and [FULL_TRANSCRIPT.json](FULL_TRANSCRIPT.json).

# Cataclysm 1.4 — THE UNSEEN CITY — autonomous five-pass production assignment
**Creator authorization:** 15 November 2026: implement the newly agreed multi-pass BoRHeZ Games Studio production architecture and advance the ONE continuing Cataclysm game from 1.3 FELINE COMPANY toward 1.4 THE UNSEEN CITY.

**Latest stable/rollback:** docs/cataclysm-1-3/ and https://borhex.github.io/kbc-rpg-prototype/cataclysm-1-3/ . Never modify 1.0–1.3 directories.
**Current experimental candidate:** docs/cataclysm-1-4/ . Candidate dashboard: docs/cataclysm-1-4-candidate/. Stable 1.3 remains the default/rollback until a separate confirmed stable acceptance.
**Authority and memory:** read game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md; game_factory/CATACLYSM_MASTER_LEDGER.json; game_factory/CATACLYSM_STUDIO_CONSTITUTION.md; game_factory/STUDIO_MULTIPASS_PRODUCTION_POLICY.md; game_factory/studio_meetings/2026-11-15-multipass-council/MULTIPASS_POLICY.md; docs/cataclysm-1-3/STUDIO-REPORT.md. This job implements 1.4 only, not 1.5+.

## Non-negotiable gameplay evolution
Keep the existing 1.3 ACTUAL gameplay: white quadruped illustrated cat, independent tail gun, nine lives and restart, reroll/upgrade cards, 16 real companion roles, AI fish consumption and four-slot squad, Mecha Crew fusion, mob waves, existing music, mobile movement-only input and viable solo play.

New 1.4 content/mechanics:
- **Seeded connected explorable city districts**, with streets, environments, obstacles and meaningful differences between districts (not merely scrolling decorative colors). Deterministic seeds and repeatable navigation.
- **World map only in menu / between runs**, revealing discovered districts; NO conventional active-game minimap.
- **In-play arrow** to closest reachable magnet, rage pickup or beacon, with distance hint and accurate offscreen behavior. Do not add a direct gameplay action button.
- **DPS-check zombie horde waves** unlock district access, with understandable progression and failure consequence; no permanent softlock because a one-handed player picked a weaker upgrade deck.
- **Area guardians and provoked boss encounters**, appropriately different enemies/illustrations. Rare eligible, nonfarmable +1 life reward when earned; avoid duplicate 1.2 life lottery.
- Connect 1.3 cats sensibly: Scout/Courier explore or mark, Angler's economy remains viable, Mecha and fused companions count correctly and do not break zone gates; lower enemy kill pressure that is trivialized by overpowered late level builds.
- Expand story/banter, original ambient tracks/SFX, distinct city art. One game evolving cumulatively; original assets are not optional generic code rectangles.
- Owner played 1.3 Night 100 at Level 85 with **9/9 lives**. That is a diagnostic signal to examine balance, not proof of all players' experience. Improve difficulty where 1.4 gates make encounters meaningful, without abandoning the fun jank character.
- Preserve stable gameplay under 1.3. If this candidate breaks, **publish it as BROKEN/PARTIAL with diagnostics**, DO NOT rewrite 1.3, and do not claim a successful playable release.

## Art pipeline is real and separate
Pass 02 executes a direct OpenAI image-generations API with model gpt-image-2.5-flare, capped to three actual generated PNGs for city environment atlas, feline guardian boss atlas, detailed illustrated Mecha/crew atlas. Files, alpha and SHA-256 hashes are recorded. Input art is in docs/cataclysm-1-4/art/generated and STUDIO/IMAGE_MANIFEST.json. These are *real raster images*, not fake images drawn with Canvas commands. If the API fails or lacks access, mark ART-BLOCKED and continue with an honestly partial candidate; do not lie or silently substitute recycled shapes as complete art. Rendering/animation may crop or transform genuine PNGs into usable sprites, while preserving source images.

## Real autonomy and pass boundaries
Five base passes: (1) concept/asset spec; (2) image generation; (3) sprites/animation/audio; (4) 1.4 mechanic + art integration; (5) post-integration polish/QA.
Up to three extra PASS-06/07/08 iterations may be requested by specialists if the QA evidence or EXTRA_PASS_REQUEST.json justifies them. Each Codex model invocation is a separate GitHub Actions job, since the old same-runner drop-sudo failed. All pass source/results transferred as stage artifacts with visible manifest. A failed stage must not erase all progress.
Each stage may edit only docs/cataclysm-1-4/ (except the final publication job creates docs/cataclysm-1-4-candidate/). Reports are source evidence, not a substitute for actual code/art/sounds. No new cloud databases, direct user gameplay controls, unrelated projects or scheduled future development.

## Five-pass concrete handoffs
Pass 01: deliver STUDIO/CONCEPT.md and STUDIO/ASSET_PLAN.json. Describe specific 1.4 districts/boss encounters, navigable arrow graph, art style compatible with 1.3 source and a realistic asset inventory. Do not start coding all of 1.4. Include stage art integration constraints, visual samples and original audio needs.
Pass 02: REAL art service creates three PNG files and STUDIO/IMAGE_MANIFEST.json; no model may invent what exists.
Pass 03: from actual PNGs, deliver cropped sprite-compatible files under art/animated/ plus frame maps and useful original sound cues in audio/generated/. Use illustration only if present and explicitly preserve partial/blocked status otherwise. Output STUDIO/ANIMATION_AUDIO_REPORT.md. No invented completed art.
Pass 04: implement the approved city gameplay in the actual copied 1.3 runtime, load new PNG/sprite atlas assets explicitly in canvas, extend graphics, sounds, world map and integration. Output STUDIO/INTEGRATION_REPORT.md and JS source changes. Even if a mechanism fails, preserve source and report.
Pass 05: polish mechanics/art on actual game, produce STUDIO/FINAL_REPORT.md and QA evidence; optional EXTRA_PASS_REQUEST.json with request:boolean, reason:string, target:art|mechanics|performance|audio, no false Samsung tests. QA browser smoke independently checks portrait+landscape. Include inherited 1.3 feature checks, and honesty on all unimplemented 1.4 features.
Extra passes: fix concrete issues from Stage 05, preserve all previous assets, retest Chrome each time. Cap of three; never create an infinite agent loop.

## Candidate publication
Stage artifacts are always retained (best effort where platform allows). Final always-attempted candidate PR includes only docs/cataclysm-1-4 and docs/cataclysm-1-4-candidate. Candidate status BROKEN/PARTIAL/PLAYABLE measured against real Chrome results and asset references; never call physical Samsung verified. Previous 1.3 remains stable. QA diagnoses and informs repair, it does not erase code. No forced approval prompts for routine implementation changes. The owner will playtest and decide promotion to stable.

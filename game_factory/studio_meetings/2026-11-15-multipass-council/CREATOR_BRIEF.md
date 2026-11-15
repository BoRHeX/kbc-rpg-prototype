# CREATOR COMMISSION — BoRHeZ Studio: multi-pass development and honest broken candidate policy
**Date:** 15 November 2026. **Status:** Real studio architecture council, NOT authorization to start Cataclysm 1.4.
**Creator request:** Have the agents talk openly, criticize the 1.3 production method, propose a production pipeline with MORE THAN ONE PASS between releases, and **allow agents themselves to add necessary passes** instead of being constrained to one-shot delivery.

## Ground truth from creator playtest
Cataclysm is ONE game; playable current version is 1.3 **FELINE COMPANY**, following 1.0 THE CATASTROPHE major and 1.2 NINE LIVES, leading through the roadmap to 2.0 THE CATACOMBS. Creator genuinely beat 1.3 on Night 100/100, Level 85, score 1,000,067,379, keeping nine lives. Game systems are improving: Engineer+Shooter fusion creates working one-slot Mecha; other new followers have distinct behavior. However art is profoundly disappointing: eight new companions are recycled old companion bodies with code-drawn accessories, e.g. Stormcaller is Bard plus a lightning symbol; Mecha is a code-drawn box with tiny legs/barrel and miniaturized crew. Actual illustrated original asset work was not delivered. The owner **accepts odd/janky visuals and gameplay**, but wants the studio to develop real image-based illustrated assets, sprites and animations, rather than systematically taking canvas shape shortcuts. Owner is willing to trust the studio to choose the implementation details.

## Existing code evidence: learn from failures
- Source: `docs/cataclysm-1-3/STUDIO-REPORT.md`. 1.3 reused existing PNG textures with procedural costume overlays, code-generated Mecha, synthesized cues; no new painted sheets, no new score; browser smoke passed later in GitHub. Both gameplay and art are first-class requirements. 1.3 victory with nine lives suggests difficulty may deserve investigation; NOT proof of universal imbalance.
- Source: `.github/workflows/cataclysm-1-3-playable-first.yml`, `.github/workflows/cataclysm-1-3-recover-20261114.yml`. The first attempted two model calls IN ONE job; second crashed due to Codex dropping sudo after first invocation. Fixed separate jobs and artifact handoffs. A later run failed from missing `artifacts/cataclysm-13` directory. Final recovered 1.3 successfully merged PR #90 and published at `https://borhex.github.io/kbc-rpg-prototype/cataclysm-1-3/`.
- Original constitution and ledger currently call nonblank/start a hard release gate. Creator now asks to revisit that for experimental **candidates**, allowing bad/unfinished/broken artifacts to ship, with transparent failures, rather than throwing away progress. Do NOT falsely label broken candidates as stable playable versions.
- A standing problem: many legacy GitHub workflows run/fail unrelated to current milestone; avoid blanket releases and unintended old workflow triggers.
- Current original 1.4 goal: **THE UNSEEN CITY**: seeded districts, menu world map / no play minimap, reachable arrows, boss encounters, unlockable DPS-gated areas. It needs substantial illustrated city and boss environments, not only code rectangles.
- Important preservation: the one game inherits 1.3; protect 1.0 through 1.3 and source, preserve variant playtest URLs, version identity and existing game features.

## Proposed flow to challenge, not to blindly accept
1. Concept, art direction, asset specifications and mechanic requirements
2. Original image illustration pipeline (genuine raster assets with transparent layers; may require a proper image-generation API/tool rather than a text-only coding agent)
3. Spritesheet/rig/animation state assets and audio design
4. Integration into the previous game source: mechanics + scenes + companions with actual graphics/sound
5. Post-integration playtest, polish, optimization, QA, version report and candidate deployment
6. EXTRA passes may be added by participating departments when dependencies or unexpected discoveries warrant them; allow reruns and department handoffs rather than squeezing everything into one invocation.

## Critical release question
The creator asks: "They must release the next version even if it doesn't work — just log that it doesn't work or works bad?" The council MUST meaningfully argue this, including whether a broken 1.4 is appropriate as a visible experimental candidate, whether the last stable 1.3 should remain default, what constitutes a stable release, and how to preserve the actual unfinished work even if build/test/upload/merge fails. Never fabricate success or call a file "playable" when it crashes. A GitHub outage/denied write may still make publishing impossible; design fallback artifacts/branches.

## Specific tasks for independent roles
- Choose **how many passes** should normally exist between 1.3 and 1.4, with owner-not-specified additional passes where objectively warranted.
- Explicitly define which pass actually produces raster illustrations/spritesheets/animations, which tool integration is necessary, and what happens when art generation API is missing/failed. Avoid silently falling back to shapes and claiming asset delivery.
- Separate stable release from automatic **always-attempt candidate snapshot** (pass/fail/missing tests). Dev snapshots remain inspectable and linkable if possible; browser failures yield a labeled candidate and troubleshooting log, no deletion. Preserve previous working versions.
- Decide how agents share files, state, opinions and handoff contracts across fresh GitHub runners; neither lose work to QA nor try to reuse root privileges.
- Propose dynamic pass addition, loop limits, API-cost limits, failure recovery and why agents should decide (without step-by-step creator babysitting).
- Critique 1.3 honestly, including gaming balance and art debt, rather than superficial agreement.
- Decide QA role: test+report, fix+retest, risk rating, never fake browser/Samsung validation.
- Explain how this applies to other BoRHeZ games (Flame Game and Peach Bounce) without merging their repos.
- Debate which code-drawn overlays remain proper (VFX, HUD, debugging) vs original rasterized character/environment assets.
- Present a specific 1.4 build pipeline including the deliverables and continuation/candidate publication contract for EVERY pass. Creative alternatives and dissent invited.
- Agents may speak naturally, code, mathematical notation, Chinese characters, etc; preserve exact statements and produce an English summary to be actionable.
- Real independent agent calls and actual second-round replies, not faux scripted consensus.
- This meeting may author a **proposed and creator-aligned multipass production policy** and draft pass/QA contract. Do not modify game runtime, do not launch 1.4, do not claim that adding a meeting file causes every legacy workflow to adopt the policy.

## Source register
`game_factory/CATACLYSM_STUDIO_CONSTITUTION.md`; `game_factory/CATACLYSM_MASTER_LEDGER.json`; `game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md`; `game_factory/studio_meetings/2026-11-14-roadmap-council/PROPOSED_ROADMAP.md`; `docs/cataclysm-1-3/STUDIO-REPORT.md`; `.github/workflows/cataclysm-1-3-playable-first.yml`; `.github/workflows/cataclysm-1-3-recover-20261114.yml`.

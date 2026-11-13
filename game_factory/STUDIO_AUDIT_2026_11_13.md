# BoRHeZ Games Studio — GitHub automation audit
**Date:** 2026-11-13. **Repository:** `BoRHeX/kbc-rpg-prototype`. **Scope:** actual `.github/workflows/*.yml` trigger definitions, production scripts, recent workflow results. **Status:** read-only audit/documentation; no game or CI logic changes in this report.

## Executive finding

The repository currently contains **46 workflow YAML files**. They are not 46 cooperating agents. A smaller set performs useful work; the rest are specialized, older, experimental, recovery, or 1.0-only paths. Multiple independently built orchestration pipelines target related Cataclysm assets, which explains duplicate releases, fragile compatibility tests, Pages collisions and heavy manual repair.

**The studio is a collection of triggered GitHub jobs, not a continuously running autonomous team.** Most start only when a file changes or somebody dispatches a workflow. One scheduled workflow is configured to inspect gameplay videos twice a day, subject to credentials/Actions availability.

## Actual autonomous capabilities

| Capability | Implemented entry point | What it can actually do | Trigger and limit |
|---|---|---|---|
| New mobile game or scoped update | `mobile-game-studio.yml` / `mobile_jobs.py` | Validate request; 3 independent game ideas when creating, Critic compares them, Producer selects; for updates, five planning roles; Codex implements HTML/CSS/JS; independent Chrome/mobile tests; a single repair attempt; AI QA; artifact hash + delivery receipt | `game_factory/requests/current.json`, manual `workflow_dispatch`, or video `repository_dispatch`; **one job at a time** |
| Small mobile-game publication | `mobile-game-delivery.yml`, `games-hub-pages.yml` | Verify accepted source/hashes; deploy full `docs/` site to Pages; verify live game or dashboard bytes; preserve URLs and build history | accepted delivery dispatch, file changes, or manual |
| Separate Cataclysm creative council | `autonomous-cataclysm.yml`, `autonomous_studio.py`, `plan_cycle.py` | Five AI role calls, bounded coding, independent browser gate, at most one coding repair and QA; publish if accepted | manual or a change to `game_factory/STUDIO_TRIGGER.md` |
| Art & Animation Department | `art-animation-department.yml` | Analyze a reference image; AI artist writes texture assets and integration; test frame mechanics and Chrome; multimodal art review; at most two isolated revisions; protected merge and deploy | changing `game_factory/art_department/jobs/active.json` or manual dispatch |
| Image-to-animated-character experiments | `reference-animation-studio.yml` + `reference-animation-delivery.yml` | Read a repo/Drive reference; attempt raster anchor/sprite production and acceptance; pass accepted art to publisher | manual or `game_factory/requests/reference_animation.json`; needs suitable API/Drive access |
| Gameplay video reviewer | `gameplay-video-review.yml`, `video_pipeline.py`, `video_bridge.py` | Select newest or explicit private Drive video; FFmpeg processing, transcription, sampled image review; create QA report; if actionable, create a validated studio update request and dispatch the Mobile Studio | **cron `20 6,18 * * *`** = 06:20 and 18:20 UTC, or manual/explicit file request; requires working Google/OAI secrets |
| CI/test enforcement | `game-factory-tests.yml`, `cataclysm-major-playtest-qa.yml`, `reference-animation-infrastructure-qa.yml` and specialized tests | Unit tests, 8-browser-viewport tests, image/asset checks, wave/score contracts, generated QA artifacts, failure logs | targeted pushes and pull requests; **passing some checks does not mean the whole suite passed** |

The video workflow's configured schedule is twice daily, despite an older README that describes a once-daily time. GitHub secret *values and current Drive connectivity were not verified in this audit*; a configured trigger is not proof that it succeeds.

## Roles and memory — what is real

The shared mobile planning roles are **Designer, Researcher, Engineer, Critic, Producer** plus a separate coding agent and QA reviewer. They run API calls and GitHub Actions jobs when invoked; this is not a persistent 25-agent mind. They can create real code, tests, artifacts and releases. Some planning uses three competing proposals; updates use a feedback-driven council.

`agent_memory.py` defines an SQLite agent/event ledger for roles, decisions, evidence and conversation IDs. The Mobile Studio stores that database in temporary `artifacts/mobile/memory.sqlite3` and intentionally excludes it from diagnostic upload. It **does** load up to three prior committed game-job receipts from `game_factory/results` into planning evidence, and workflows can restore archived plans/candidates. This is useful but **not a complete persistent, cross-run studio memory or shared autonomous world model**. Durable history comes mainly from Git, results, briefs, and artifacts that have not expired.

The art workflow can genuinely generate new reference-based assets, but past Cataclysm results show that frame counts and IK physics can pass mechanical checks while **actual phone-size animation still appears weak**. Human artistic acceptance remains necessary.

## What it does NOT do reliably or automatically

- It does not keep writing and publishing games indefinitely without a trigger, except that the **scheduled video-review trigger could initiate a new update chain** when credentials work and actionable footage is found.
- It does not automatically upload to YouTube, read arbitrary future recordings, or guarantee private video was analyzed fully; image review samples frames.
- It does not ensure that 46 workflow files constitute 46 truly independent role workers operating concurrently.
- It does not guarantee all agents share persistent context across runs. Old READMEs, current manifests and active code paths can disagree.
- It does not guarantee new art is beautiful just because the CSS, atlas hashes or IK coordinates pass.
- It does not automatically know that Cataclysm 1.0 is frozen; version boundaries must be enforced in the active studio target.
- It does not have one clearly authoritative release pipeline for Cataclysm: several older launch, recovery, art and Pages workflows remain present.

## Verified recent outcomes and risks

1. **Frozen source:** commit `1c2af2239dd1be6083d8df127580513dff6d3b55` pinned to `release/cataclysm-1.0-the-catastrophe-20261113`. The 1.0 campaign and Night99 lab were released for the owner's playtesting. **Branch immutability is NOT live-URL immutability.** Public `/cataclysm-1-0-major/` and `/cataclysm-100-lab/` are served by Pages from `main`, so an unguarded future deploy can change them.
2. **Dashboard publication verified:** `games-hub-pages.yml` run [43496530675](https://github.com/BoRHeX/kbc-rpg-prototype/actions/runs/43496530675) succeeded and verified live dashboard bytes. 1.0 and Level100 play URLs are prominently pinned.
3. **Independent 1.0 major QA has an unresolved failing test:** run [43483632625](https://github.com/BoRHeX/kbc-rpg-prototype/actions/runs/43483632625) passed core spawn and eight-viewport browser checks but failed the Night100 horde script's expectation `18` vs observed `1` at `browser-horde.cjs:32`. **This may be stale QA assumptions or a real finale-mode mismatch; it is not proof of either until reconciled.** Do not claim the entire release test suite is green.
4. **Art reviews rejected final leg movement:** the last independent visual rounds rated leg motion 2/5 despite working source/Chrome mechanics. The owner explicitly requested a playable candidate; it was merged as a **playtest, not an art-approved final polish**. A future 1.1 must be judged as drawn animation, not grounded foot math.
5. **Workflow sprawl:** old `cataclysm-1-0-*.yml` recovery flows, `cataclysm-10-finish*.yml`, `cataclysm-art-studio.yml`, `autonomous-cataclysm.yml`, multiple Pages/delivery workflows and the main Mobile Studio overlap in responsibility. A maintenance edit to an old request/trigger can accidentally awaken a different pipeline.
6. **Current default route is not version-specific:** in `mobile_jobs.target_for`, updates to Cataclysm with release major >=1 select `docs/cataclysm`. They do **not** automatically select a distinct `docs/cataclysm-1-1`. Planning also reads old `game_factory/CATACLYSM_1_0_ROADMAP.md`. The new 1.1–2.0 roadmap is written but requires explicit version-aware routing before development.

## Proposed minimal operating model for 1.1 onward — NOT EXECUTED

**Keep the useful parts; remove overlapping entrypoints from future production only after review.** A realistic minimal model is:

`ONE VERSIONED REQUEST` → `Producer/Council (design and dependency split)` → `Codex implementation + Art/Animation/Audio tasks` → `Independent unit + real mobile Chrome + human visual QA` → `One protected versioned release` → `One live URL and changelog`.

The existing Mobile Minigame Studio can be the orchestrator; the existing Art Department becomes a bounded specialist, not its own alternate Cataclysm production authority. Publishing and test workflows are shared infrastructure. The audio/gameplay specialist is a scoped task, not a new GitHub Actions workflow per effect. A failed build stays on the development branch with actual failure evidence. The Producer may choose artistic implementations, but cannot rewrite the approved milestone's objectives.

**Before any 1.1 coding:** (a) create separate game and lab paths, (b) explicitly route jobs and source roadmap to 1.1, (c) block writes to the two 1.0 game directories in coding and publication, (d) stop/pause or version-gate the scheduled gameplay video handoff, (e) define ONE authoritative Pages delivery chain and concurrency group, (f) mark old 1.0-only workflows as historical/deprecated and eventually disable them after documenting the final ownership, not blindly delete their records, (g) add long-run browser performance, artwork animation clip review and owner device feedback gates.

**Proposed service responsibilities:** Producer resolves version/features and keeps roadmap/evidence ledger; Game Engineer implements core; Art Director owns drawn references and visual quality; Animator integrates actual visible motion; Audio Director works with original music and timed cues; QA measures gameplay regression/performance/phone experience; Publisher merges the *accepted exact candidate* and verifies deployed bytes. All departments can operate from one major assignment and hand off at frozen interfaces, but the workflow does not silently start the next release without owner authorization.

**Do not confuse infrastructure changes with game features.** In particular, **1.1 = everything drawn**. Avoid another 1.0-like loop of animation frameworks and recovery workflows. The roadmap is [`game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md`](./CATACLYSM_1_1_TO_2_0_ROADMAP.md). It is planning, not a launch trigger.

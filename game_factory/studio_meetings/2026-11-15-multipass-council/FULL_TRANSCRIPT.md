# BoRHeZ Studio — production architecture council, 15 November 2026
Real separately invoked AI department positions; this is not a human staff meeting.
**Opening statements:** 12; **peer replies:** 12; **synthesis:** True.
**Purpose:** Multi-pass illustrated game development and preservation of working, rough and broken candidate builds.
Status: council discussion only; no new Cataclysm 1.4 code was executed.

## Independent opening positions

### Producer

The core problem at Cataclysm 1.3 is that the studio delivered solid systems and gameplay functionality, demonstrated by creator’s Night 100 beat and comprehensive AI companions/fusion systems, **but utterly failed on genuine art delivery**—new companions reuse old bodies with code-drawn accessories, Mecha is a crude geometric shape with rudimentary animation, and no real painted original sprite sheets or expressive animations arrived. This breaks explicit owner trust and ambition for “real image-based illustrated assets.” The current workflow and culture default to “one shot” all-at-once releases where code and art converge simultaneously, masking art gaps behind procedural overlays due to time constraints and API/tool absence.

---

### I. Proposal: Multi-Pass Modular Build Pipeline with Autonomous Pass Addition

**Number of Passes:**
Normatively 4 passes per major release (e.g. 1.3→1.4), with allowance for additional passes triggered autonomously by agents on discovering blockers or optimization needs:

1. **Concept & Art Direction Pass:** Sketches, style guides, specs for assets and mechanics. Requires human/art director signoff.
2. **Raster Illustration Pass:** Generation of genuine raster assets (sprites, layers, frames) using artists and/or vetted image-generation APIs/tools specifically integrated and tested—for example, a private RESTful service wrapping a known stable image generation model or pixel art pipeline tools. **Fallbacks to geometric placeholders must NOT be silent or mislabeled as “finished art.” Failure to produce assets should log detailed errors and produce a clearly labeled “art-failure candidate.”**
3. **Animation & Audio Pass:** Build frame-accurate spritesheets, rigs, character states, and compose or integrate new audio cues per produced illustrated assets—no code substitutions here.
4. **Integration & Systems Pass:** Plug assets into game source, enable mechanics tied to graphics and run automation tests, deterministic simulations, and partial real-device QA.

**Pass Addition Autonomy:**
Allow agents—Art, QA, Systems, Producer—to request extra passes before final release: e.g., a “polish pass” for art fixes discovered in QA, a “performance pass” for asset optimization, a “bug fix pass" focusing on integration. Agents communicate through clear pass contracts logged in the source ledger with immutable timestamps and changelogs.

**Loop Limits and ART/API Cost Control:**
Set a maximum of 2 extra passes beyond normative 4 per version checkout to prevent runaway costs or infinite loops. Pass additions require documented rationale and estimated impact on timeline/cost.

---

### II. Acceptance of Broken Candidates with Transparent Failures

- **Policy:** Broken or incomplete builds **must be published as experimental candidates**, never labeled as stable releases. Candidate artifacts must include:

  - Complete automated test logs, including failures.
  - Failure type (art, build, integration, runtime crash) clearly stated in release notes.
  - No “playable” branding if crashing or blank on physical Samsung hardware or mobile.
  - Retain last stable release (e.g., 1.3) as default user-facing version. Candidates appear alongside with clear disclaimers and fallback URLs.

- **Fallback:** GitHub outages, write rejects, or build aborts should deposit partial artifacts on dedicated “candidate-failure” branches, committing build logs and prior versions. No wipe or overwrite of stable URLs or source snapshots.

- **Why?** This provides continuous integration visibility and archives unfinished work transparently for safely iterative improvement without damaging stable user experience.

---

### III. Raster Illustration and Tool Integration Realities

- **Key feasibility for “genuinely possible” illustrated imagery:**

  - Use actual raster asset production pipelines (e.g., dedicated illustration software with versioned source files, or a stable image-generation API vetted for consistent style).
  - Assets must be native raster with transparent alpha layers, hand-polished or verified pixel art, never indirect procedural vector shapes substituted in code.
  - Include a robust asset pipeline testing pass validating asset completeness, alpha correctness, frame sequence correctness, and phone-scale pixel legibility before integration.
  - If API failure or network loss occurs, build must halt or produce a logged candidate with “no art” warnings, **do not fallback silently to coded shapes**, preventing deceptive claims of asset delivery.

- This is evidenced by 1.3 failure where recycled PNG bodies but procedural overlays yielded janky visual identity and producer distrust.

---

### IV. QA Failure Behavior and Roles

- QA’s scope remains explicit test+detect+report. QA cannot fix or retest autonomously—fixes come in subsequent passes. QA rates failure risk explicitly in reports:

  - Blockers (no valid art assets, runtime crashes, missing logic).
  - Non-blockers (performance degradation, art jank, clipping, overlapping UI).
  - No fabricated browser/Samsung hardware passes—only observed real-device results or deterministic emulations.

- QA artifacts include logs, screenshots, video clips (where possible), and deterministic test dumps.

- QA also enforces preservation of nonblank startup; candidates with black/empty screens count as failed tests.

---

### V. File & State Sharing and Workflow Hierarchy Across GitHub Runners

- Each pass runs on fresh stateless GitHub runners; persist state via:

  - Git artifacts: versioned fully immutable directories (`docs/cataclysm-1-4-art-assets/`, `docs/cataclysm-1-4-anim/`, etc).
  - Runner uses orchestration step commits or push tags on success/failure for pass handoff.
  - No shared root privileges; no attempts to salvage old runner memory. Each pass retriggers environment preparation to avoid stale caches.
  - Use GitHub actions artifact upload/download via tokenized API calls preserving file integrity with SHA256 for cross-pass reference.

- Pass contracts are formal markdown manifests with:

  - Deliverable list (asset types, hashes)
  - Manifested testing and acceptance criteria
  - Known defects or work-in-progress flags
  - Clearly versioned pass identifier and build number

---

### VI. Counterargument—Why not a single-pass release?

- Single-pass release attempts (as in 1.3) conflate heterogeneous tasks (concept, art, animation, integration) into one monolith, never resolving partial work gaps and forcing procedural “fake art” hacks that hurt fidelity and trust.
- However, too many passes can delay release, inflate overhead, or cause fragmented responsibility. For scope-limited patches, fewer passes may suffice, requiring a judgement call per release size.
- Multi-pass pipeline compensates via autonomy and limits on extra passes.

---

### VII. Application to Other BoRHeZ Games Without Repo Merging

- Framework is game-agnostic: every game can adopt independent multi-pass release pipelines with pass contracts and candidate visibility, but **must maintain separate repo branching and artifact paths** to prevent cross-game contamination.
- Suggestions learned from Flame Game’s audio layering and Peach Bounce’s path visualization can be modularly integrated without repo merges.
- Establish cross-game capability libraries but do not merge release workflows or versioned URL paths.

---

### VIII. On Code-Drawn Overlays vs Raster Assets

- Code-drawn overlays remain valid for: VFX (smoke, muzzle flashes), HUD elements, debugging info, dropdown menus—not for character or environment core visuals.
- The body/base companion, boss environment, and fusion animations must be genuinely illustrated raster assets to fulfill owner directives.

---

### IX. Specific Draft Pipeline for Cataclysm 1.4

| Pass # | Deliverables | Pass Outputs | Candidate Publication Contract | Autonomy Allowed? |
| --- | --- | --- | --- | --- |
| 1 | Concept art & specs for 1.4 districts, bosses, companions | Concept docs, art direction PDFs, feature specs | Publish with “onhold” candidate | Yes, if concepts incomplete/require change |
| 2 | Raster spritesheets & animation frames for new city tiles, bosses, companions | Raster PNG sprite sheets, alpha layers, animation keys | Candidate with art or art-failure tag | Yes, on incomplete rendering or art failure |
| 3 | Audio tracks, reactive music layers, SFX for city & bosses | Composed audio files, integrated audio logic | Candidate with audio patch notes | Yes, if audio defects found |
| 4 | Game integration & full mechanical & UI hookup | Updated game.js, assets integrated, QA test logs | Candidate or stable release if passing full QA | Yes, for bug fixes and optimization |

Each candidate must be archived and linked independently with immutable URLs and logged QA failures.

---

### X. Unexpectedly Useful Insight

**The production deadlock in Cataclysm is not just a tooling or art skill gap, but fundamentally a failure in production autonomy and transparent partial progress publishing.** Allowing agents to add passes—including art retries or integration fixes—without needing explicit top-level approvals breaks the high-friction “one shot or none” culture. This encourages incremental progress, safer iteration, and builds a culture of honest failure resilience that is itself an artistic and gameplay design asset.

---

### Summary and Decisions

- **Normally 4 passes from 1.3 to 1.4, with agent-driven extra passes allowed (2 extra max).**
- **Raster illustration via integrated APIs/tools strictly required—fallbacks must abort or label broken candidates; no silent shape replacements.**
- **Broken or incomplete builds allowed as candidates with full error/log transparency, never replacing stable release (1.3).**
- **QA role is independent test/report; fixes come on later passes only. No fabricated hardware checks.**
- **File passing by immutable git commits/artifacts; no shared runner memory.**
- **Code overlays remain only for VFX/HUD/debug, not main assets.**
- **1.4 pipeline stages documented with pass contracts; all passes publish candidate states with clear pass/fail labeling.**
- **This multi-pass, transparent strategy resets trust cycle and prepares for real art delivery in 1.4.**

This architecture keeps budget in check, protects stable releases from damage, and lets creative & technical departments focus on their crafts without bottlenecks or fake work. It is the essential foundation for delivering Cataclysm’s artistic vision honestly.

### Creative Director

As BoRHeZ’s Creative Director focusing on expressive game identity and art debt, I approach the multi-pass development and candidate release policy for Cataclysm next milestone with frankness and systemic clarity.

---

### Honest critique of Cataclysm 1.3’s single-pass delivery and art execution

1.3 succeeds in robust AI behavior, fish economy logic, fusion mechanics, and level progression. The gameplay machinery is solid and extends companion complexity impressively. However, the visual identity is *glaringly* regressive: nearly all new companions rely on recycled legacy body sprites with code overlays. The Mecha is a “box with legs,” not an expressive pilotable robot visual. The eight new cats have no bespoke pixel/raster art beyond silhouette props or shader additions, betraying the “drawn” art directive before 1.1.

Why is this a dealbreaker? Because Cataclysm’s charm—one of its most admired traits—is the *cuteness and personality visible through clear, hand-crafted, well-animated spritework*. Using shapes or overlays *in place of original art* causes visual monotony and player disconnect, diluting engagement and undervaluing art department craftsmanship. Simply put: code generation and procedural overlays are an expedient hack, not art.

---

### Proposing a concrete multi-pass production pipeline for 1.4 THE UNSEEN CITY and beyond with agency for agents

**Number of passes:**
Standard development should have **at least four discrete passes** per major milestone (e.g., 1.4), with provisions for additional passes if warranted by QA, tech constraints, or artistic discoveries:

1. **Concept & art direction pass**
   - Deliverables: detailed character/environment concepts, style guides, animation requirements, mechanic-art linkage documents.
   - Sign-off: Creative Director & Producer must agree on identity fidelity and technical feasibility.

2. **Raster illustration and sprite generation pass** (the *true “art” pass*)
   - Deliverables: original raster sprite sheets, frame-by-frame animations of companions/bosses, city district tilesets, boss portraits, UI skins.
   - Tool integration: Use a *dedicated artistic asset pipeline* (ideally a combination of Illustrator/Photoshop/Procreate + a sprite-packer tool like TexturePacker, plus custom-rigged animation tools). Integrated image-generation APIs via AI can assist concept, but *must not* replace dedicated artist-rendered assets unless fully approved.
   - Missing art generation or tool API failure in this pass must **halt further pipeline progression** or flag assets as *placeholders only* with exact logs and release candidate labels. Do **not** silently degrade to code shapes and claim texture delivery.

3. **Sprite rigging, animation states, sound design pass**
   - Integrated rigging of sprite sheets, keyframe alignment, performance optimization, plus initial audio and VFX layering.
   - Deliverables fully annotated, version-controlled, and linked to engine integration.

4. **Integration and QA pass**
   - Merge art+mechanic+audio assets, test gameplay mechanics *with new art*, including mobile device runs and Samsung hardware validation.
   - Failure to meet stable framerate, graphical fidelity, or playable runtime should produce a *failing candidate release*, fully logged, and *never* mislabeled as “stable” or “playable” release.

**Additional passes:**
Any stakeholder—art, game design, QA, systems—may *unilaterally* request additional passes if new problems emerge post-integration (e.g., animation polish, mechanic-art balance, performance tuning). Agent autonomy here is essential to avoid bottlenecking all fixes into one pass that often gets ignored or rushed.

We propose an **upper limit of six passes**, beyond which the Producer and Creative Director must reassess scope or defer features.

---

### On releasing broken candidates and stable releases

- **Broken 1.4 candidates should be published transparently as experimental builds** labeled with *exact discovered failures* (log files, missing assets, broken mechanics, browser crash data). This preserves progress and allows community/QA inspection but does *not* confuse players or creators by misbranding.
- The **default stable release remains 1.3 FELINE COMPANY until 1.4 fully clears QA**. This removes pressure to “fake polish” or hide defects.
- Any failed build, network outage, or permissions problem **must fallback to publishing the last verified stable version automatically**. Candidate logs and artifacts live on separate branches or artifact storage (e.g., GitHub Actions artifacts, S3 archives) with accessible detail for debugging.
- **No asset or build should ever claim “playable” without passing essential runtime startup checks and rendering on approved hardware/formats**.

---

### File/state sharing and multi-run handoffs in GitHub runners

- We *cannot rely on sudo or root privileges* as in 1.3 failed attempts; workflows must run as non-privileged users with explicit designated artifact directories.
- State sharing across passes uses GitHub Artifacts, commit hashes, and persistent file stores in the `artifacts/` directory to transfer verified concept docs, spritesheets, test results, and logs.
- **Strict contracts per handoff:** Each pass must produce clearly versioned deliverables and metadata files indicating completeness, failure reasons, and retry conditions.
- No attempt to cache or assume agent memory state between runs; all state is explicit and archival.

---

### QA role clarified

QA acts solely as **independent test & report agents**. They must *never* fake playback or environmental validation on devices they cannot access. In case of failures:

- QA reports the error and risk rating candidly, never hiding it.
- Fixes require new passes, not partial patching within the same.
- QA maintains regression archives and must confirm deterministic feature and gameplay integrity.

---

### Art / code overlays boundary

- Code-drawn overlays remain justified *only* for **transient VFX, HUD, debugging overlays and UI elements**, never for baseline character or boss sprites or expressive companion art.
- All gameplay-facing characters, map tiles, bosses, and UI icons that impact player identification must be **fully illustrated raster assets**.

---

### Application to other BoRHeZ games (Flame Game, Peach Bounce)

- The multi-pass and candidate release policy applies as a **studio-wide infrastructure standard**, but workflow orchestration and artifact storage remain isolated per repository to avoid cross-game contamination.
- Shared tooling can be versioned and integrated as **capabilities** without merging repos.
- Each game enforces its specific concept-art → illustration → integration pipeline adhering to its identity and production constraints.

---

### Summary: 1.4 Build pipeline deliverables and candidate/stable contract

| Pass | Deliverables | Responsibility | Candidate handling | Release scope | Dependency |
|---|---|---|---|---|---|
| 1. Concept | Art direction docs, concept sprites, mechanic links | Creative | Candidate fails if missing | Approves asset style | None |
| 2. Raster illustration | Original hand-drawn sprite sheets/animations | Art | Halt or placeholder fail; no silent fallback | Core companion & bosses art | Concept pass |
| 3. Rigging & audio | Rigged animation states, VFX, sounds | Art + Audio | Pass/fail with detailed logs | Playable integrated assets | Raster illustration pass |
| 4. Integration & QA | Gameplay merge, mechanic-art sync, mobile device test logs | QA + Systems | Candidate marked failed if crashes/logs error | Stable 1.4 candidate | Rigging & audio pass |
| Extra passes | Bugfix, polish, performance tuning | Any agent | Added as needed, max total 6 passes | Iterative improvement | Prior passes |

- Candidate builds are publicly accessible **under clear failure labeling**, never overwriting stable releases.
- Stable releases remain **fully tested and accepted** by Creative and Producer.
- All passes preserve context in Git and artifact storage for rollback and traceability.

---

### Unexpectedly useful insight:

**Genuine illustrated imagery fundamentally requires separated raster asset production outside of code and a dedicated art pipeline.** The visible “jank” and reuse issues of 1.3 stem from baking art duties into engineering passes and procedural overlays in the source. An enabled artist pipeline with creative iteration, tools, and independent version control—interfaced with CI—is the only reliable way to deliver the authentic “drawn” identity requested by our studio charter. Only then can in-game animation be lively, expressive, and coherent *to a device-visible pixel level* rather than code geometry or overlay hacks.

---

### Counterargument and risk

- One might argue multiple passes increase complexity, slow iteration, or inflate pipeline costs. However, a **single-pass all-at-once approach conflates responsibility, buries defects, and encourages shortcuts**. Long-term studio reputation and player trust demand *transparency and artistic fidelity,* which multi-pass rigor enforces.
- Also, allowing agent-driven extra passes requires strong governance to avoid infinite loops or scope creep; hence the proposed maximum pass limit and producer oversight remain vital.

---

This multi-pass, transparent candidate release policy elevates Cataclysm’s artistic authenticity, aligns with owner vision, maintains code-art synergy, and establishes sane studio workflows to confidently scale through 1.4 and beyond without risking visual identity.

This document is submitted for review to all departments with recommendations on tooling choice, flow automation, and candidate labeling nomenclature for eventual studio charter inclusion.

### Game Designer

As gameplay design focused on player enjoyment, 1.3 difficulty, and incremental vertical slices, I bring a critical perspective on how Cataclysm’s current one-pass 1.3 production method hinders creative depth, integration fidelity, and player-facing polish—especially regarding the missing illustrated assets—and how a multi-pass pipeline with dynamic agent-driven passes can address this while preserving stable releases and improving iteration quality.

---

### Honest Critique of 1.3 Production

- **Art Debt and Visual Jank:** Despite 1.3’s solid gameplay integration (16 cats, Mecha fusion, autonomous fish economy), the visuals rely heavily on code-drawn overlays and recycled bodies with symbolic accessories, failing the owner’s core request for real painted spritesheets and frame-by-frame animations. This breaks the game’s identity promise and player immersion.

- **Single Shot Delivery Constraints:** The 1.3 workflow forcibly bundles companion AI, mechanics, and superficial art placeholders into essentially one “integration job.” This leads to many incomplete visuals being shipped as “delivered” despite no real asset generation, causing accumulated debt.

- **QA Limitation:** Runtime QA on mechanics is solid, but proper mobile hardware visual acceptance or audio listening tests remain missing. Chromium smoke tests crashed early, indicating tool fragility and inadequate hardware coverage.

- **Risk of Legacy Workflow Overlaps:** Multiple legacy GitHub workflows running in parallel cause unintended triggers, fragile artifact handoffs, and outages—producing brittle continuity especially when trying to iterate rapidly on art or integration.

---

### Proposed Multipass Production Pipeline (Normally 3+ Passes, with Dynamic Extra Passes)

1. **Concept & Art Direction Pass**
   - Deliver **definitive visual design docs** and clear asset specifications for each companion, state, animation, VFX.
   - Output: design bible, key character turnaround sketches, and layered mockups.
   - Agents: Art director & concept specialist plus Gameplay designer to align mechanics with visuals.

2. **Illustration Pass (Raster Asset Generation)**
   - Use a dedicated **image-generation pipeline**, potentially combining human digital art and verified AI generation tools that produce *transparent layer PNGs / spritesheets*.
   - This pass is the only point where **genuinely new illustrated assets** are born (full body, facial expressions, multi-frame animations).
   - Failures here (e.g., API outage or poor quality results) **halt integration** but preserve last stable asset sets. They do not silently fallback to code shapes!
   - Agents can dynamically request re-run of this pass if partial failures or quality issues are detected.

3. **Rig/Animation/Audio Pass**
   - Using the illustrated assets as source, build frame rigs, composite animation states, add particle VFX, and record or synthesize intended audio cues.
   - Produce finalized spritesheets, rig data, and SFX wavetable/mix states.
   - Output is **fully-ready asset package** for integration.

4. **Integration & Coding Pass**
   - Mechanic and AI code merges with newly delivered graphic/audio content.
   - Scenarios and gameplay balance controls are adjusted to match visual pacing.
   - Build a **fully playable vertical slice** of the game at current milestone scope (e.g., 1.4: seeded districts + boss fight).
   - Automated tester runs and hardware smoke tests performed here.
   - QA monitors runtime logs and cross-device rendering.

5. **Post-Integration QA & Polish Pass**
   - Playtest on real devices (Samsung phones for mobile FPS and UI legibility).
   - Verify audio, visual animations, interaction feedback, difficulty pacing.
   - Report bugs and beauty fixes triggering optional additional passes (especially to art if animation frames need cleanup).
   - Finalize candidate version.

---

### Dynamic Pass Addition and Agent Control

- Each agent/department can **request extra passes** if they detect problems or refinements beyond scope (e.g., audio team hearing repetitive SFX needing layering adjustments, or art spotting inconsistent character proportions).

- Loop limits set to ~5 total passes max to prevent indefinite iteration.

- Pass costs tracked (API, human labor) and prioritized; no automatic infinite retries.

- Agents share file pointers and state via a **common artifact repository**, not shared root privileges, avoiding permission issues and ensuring traceability.

---

### Candidate Release Policy

- **Never oversell broken candidates.** If a build cannot run, crashes, or falls back to placeholder shapes, publish as a **clearly labeled “experimental candidate,”** not a stable release.

- Broken candidates include transparent logs explaining failure reasons. Previous stable 1.3 remains default on public URLs until a stable 1.4 candidate fully passes QA.

- All failed builds and artifacts are archived for historical trace and bug repro.

- Fallback branches or minimal placeholder URLs should serve **informative “build-in-progress” pages**, not remove public visibility.

---

### QA Role Clarification

- QA must perform **mechanical correctness tests and real hardware rendering/play testing**.

- They must **never fake** browser or device validation (e.g., passing Chrome smoke without actual hardware checks).

- Provide risk assessments categorizing builds into stable, candidate, or broken.

- Suggest fixes but do not implement; fixes fall back to responsible departments for extra passes.

---

### Code-Drawn Overlay vs. Raster Art

- **Code-drawn elements** are acceptable only for transient VFX/UI/HUD/debugging layers—smoke, heat bars, damage numbers.

- **All character and environment actors must use genuinely illustrated rasterized assets.**

- This distinction preserves graphic identity and player immersion.

---

### 1.4 Build Pipeline Proposal (Example)

| Pass | Deliverables | Candidate Publication Contract |
|-|-|-|
| Concept/Art Direction | Full companion concept sheets, animations keyed | Stored in version control, no public release |
| Illustration | Layered PNG sprites/frames, animation keys | If success: artifacts published; else, logs + prior version remains default |
| Rig/Audio | Spritesheets + SFX files, animation rigs | Progressive caching, QA indicated completion |
| Integration | Functional build `docs/cataclysm-1-4/` hosted URL | Stable candidate or experimental candidate with tag |
| Polish QA | Playtest log, bug fixes, performance tests | Candidate promoted to stable if passes; else, re-pass triggers |

---

### Why Illustrated Imagery Is Genuine Possible Now (Grounded in Cataclysm 1.3 Evidence)

- 1.3’s failure to produce painted frames reveals the **absence of a dedicated raster art pass and lack of tooling integration**.

- Modern GPU-backed offline image generation/painting tools (human or AI-assisted) combined with transparent PNG layering and sprite atlas packing are mature.

- There is **no technical blocker** to integration once formal asset sets exist — just workflow and policy gaps.

- The production method must untangle code simulation from art generation, creating discrete bounded steps where failures are visible and not silently masked by fallback shapes.

---

### Counterargument and Risk

- Multiple passes extend pipeline duration and require more coordination overhead.

- Too many rework cycles could frustrate the creator wanting visible forward progress.

- Dynamic passes risk runaway costs or scope creep; must enforce limits and prioritizations firmly.

- However, the alternative—piling incomplete art on top of mechanics in one pass—leads to permanent debt, player disappointment, and eventual costly rework.

---

### Applicability to Flame Game and Peach Bounce

- Each game retains **separate production pipelines** with independent versioned source trees and artifact repositories.

- Shared studio tooling/capability layers (audio layering, animation rigs) can be cross-referenced but no merging of repos.

- Each pipeline enforces own explicit multi-pass contract and candidate policy.

---

### Summary

The 1.3 experience shows deep flaws in mixing art and mechanics integration into one pass, leading to janky visuals and deferred core player-facing graphical identity. A rigorous **multi-pass pipeline** separating concept/art direction, image illustration, animation/audio, integration, and QA—with agent-driven dynamic passes—is essential. It empowers quality without blocking progress, preserves stable release integrity with transparent candidate publication, and aligns with owner priorities for a fully illustrated Cataclysm. The crucial insight: **illustrated raster imagery becomes genuinely possible only when explicitly separated as a dedicated pass with enforced failure handling and real tooling integration, rather than squeezed into code-overlays or postponed forever.**

### Illustrator

BoRHeZ Games Studio — Illustrator & Image-Asset Engineer Perspective on Multipass Production and Broken Candidate Release Policy for Cataclysm 1.4+

---

**1. Honest Critique of Cataclysm 1.3 Art & Production**

Cataclysm 1.3 confirms solid gameplay improvements: 16 cats with varied AI, fish economy autonomy, Mecha fusion mechanics, and careful balance of squad slots. However, from the illustration standpoint, it is deeply disappointing:

- No new **true painted or rasterized character sprites** were created for the new companions. All “new” cats reuse old bodies with code-drawn overlays (silhouettes, lightning bolts, small accessory shapes).
- Mecha visuals are a crude procedural box with tiny legs and minimal crew portraits, not a visually rich detailed mech sprite.
- Animations remain reused or skipped. Costume bobbing and crown/ring overlays are geometric vector shapes, not hand-painted animated frames with character personality.
- Sound cues and music remain mostly inherited or synthesized.

This shortcut approach severely undermines the player’s visual and emotional identification with the new content in 1.3. It fails to deliver on the studio’s own art charter: **“Code-shape imitation is not a substitute for drawn art.”**

---

**2. Proposal for a Robust Multi-Pass Production Pipeline**

To overcome these deficiencies and reliably evolve toward 1.4’s elaborated visuals (seeded city, bosses, new environments), a multi-pass pipeline is essential. The key passes are:

- **Pass 1: Concept Definition & Art Direction**
  - Deliver official character design documents, color keys, emotional expression guides, and mechanic-to-asset specs.
  - Output: approved moodboards, pose sheets, reference sketches.

- **Pass 2: Raster Illustration and Base Asset Creation**
  - Using proper raster tools or trusted image-generation APIs (if available and artist-vetted), produce **full-resolution base characters**, transparent PNG sheets, and preliminary animation key frames for companions and Mecha.
  - Output: layered sprite sheets, base polygon rigs or frame sequences.
  - **Constraint:** If image-generation API fails or is unavailable, fallback to placeholder transparency sprites but explicitly mark the pass failed and do NOT claim delivery.

- **Pass 3: Animation, Rigging, and Audio Design**
  - Build full sprite animation sets per state (idle, run, feed...), hand-painted effects and boss/district environment art.
  - Integrate synchronized sound effects and compose suitable original motifs.
  - Output: artist-verified, frame-perfect animated sprite sheets, VFX layers, SFX wave files.

- **Pass 4: Game Engine Integration**
  - Code-side mechanics hookups, asset loading, layering, deployment of sprites and sounds, ensure no placeholder shapes leak.
  - Output: playable build with new assets replacing old code overlays.

- **Pass 5: QA, Playtest, Optimization**
  - Run automated deterministic tests on companion behavior, fish economy, fusion logic.
  - Manual playtests for animation fluidity, mobile performance on real Samsung hardware, sound sync.
  - Log detailed failures in rendering or mechanics.
  - Output: test reports, candidate builds either stable or flagged broken.

- **Pass 6+: Extra Passes as Needed**
  - Agents from any department can autonomously propose and trigger extra passes when discoveries or dependency conflicts arise (e.g., art adjustments after QA finds animation bugs, or mechanical fixes after integration).
  - **No strict one-shot pass. Looped passes tolerated but bounded to avoid infinite cycles.**

---

**3. Candidate Release Policy and Handling Broken Builds**

The creator requested: *Must next version be released even if broken?*

- **Yes, release all passes as candidates but never label broken candidates as stable or playable releases.**
- The **stable release is explicitly gated**: nonblank start, all critical tests passed, defined FPS target met, no crashes.
- Candidates are **always-attempted snapshots** clearly labeled “experimental candidate” or “broken build” with attached failure logs and troubleshooting notes.
- Failure to build, test, or render properly does **not abort publishing a candidate**; artifacts are preserved in separate candidate folders or branches, keeping previous stable release untouched and accessible.
- Offline or unavailable art generation results in partial candidates—the system must transparently report missing raster assets, do not fall back to shapes silently.
- Fallback to shapes or overlays is strictly allowed only for **non-character critical elements** like VFX, HUD, or debugging overlays, never primary character bodies or environment art.
- Github workflow guards to avoid legacy triggers and avoid sudo retention problems, storing output artifacts explicitly for sharing across jobs without root.
- The QA role remains to test, detect, report and **never fake validations**—no false passes if Samsung real-device tests fail or Chromium smoke crashes.

---

**4. Agent File/State Sharing and Handoff Contract**

- Each pass runs isolated on fresh GitHub runners; agents persist state via **versioned artifacts uploaded to the `artifacts/` directory** with explicit pass tags.
- Hand-offs specify exact expected files (sprite sheets, animation json, sound files, integration test results).
- Agents may add passes whenever logging or QA detects missing work or unexpected bugs; sample passes capped at 5 iterations per milestone to control cost.
- Agents incorporate pass outputs as immutable intermediate branches, never overwriting stable branches prematurely.
- Each pass produces a **`PASS_REPORT.md`** summarizing delivered assets, test results, failures, next step recommendations, and cost usage.
- Failure recovery is designed such that **failing art generation disables only the relevant pass but previous stable pass outputs remain untouched and downloadable**.

---

**5. Why This Makes Illustrated Imagery Genuinely Possible**

- Genuine illustrated assets require **transparent layers, pixel-accurate multi-frame raster images**, and artist-vetted animation sequences.
- Current 1.3 evidence shows:

  - Procedural costumes over monochrome bodies do not produce believable new companions.
  - Manually painted motion frames of leg articulation, tail recoil, facial expressions—these increase player empathy and immersion.
  - Proper sprite sheets loaded via game engine code enable mobile-friendly smooth animations.

- Multi-pass flow guarantees:

  - Initial concept passes guide artists.
  - Raster pass grants time and quality for high-fidelity image generation.
  - Independent animation pass refines motion coherency.
  - Integration passes validate performance and correctness.

- This avoids rushing all art code into one step and sacrificing quality or skipping asset delivery.

---

**6. Counterargument & Trade-offs**

- The multi-pass system requires **additional pipeline complexity** and longer turnaround, risking delays.
- Many passes and artifact handoffs plus storing partial broken builds consume storage and require more robust automation.
- Artist/agent autonomy in adding passes may increase API usage costs and force more engineering overhead on state coordination.
- The project risk: incomplete builds labeled as “broken candidate” may confuse some users; clear UI/communication is vital to avoid damage to brand perception.
- However, **the gains in quality, stability, and trust in art delivery outweigh the additional overhead**, especially since code-only or procedural art failed the owner’s expectations in 1.3.

---

**7. Application to Other BoRHeZ Games**

- Flame Game and Peach Bounce should **retain isolated repos and workflows** to prevent cross-game conflicts.
- Shared capabilities: a unified image generation API client, artifact storage, QA frameworks can be common but invoked per-game with separate logging.
- Multi-pass and experimental candidate policies apply similarly for **any project with complex illustrated assets coupled with gameplay**.
- Each game defines which overlays remain code-drawn (debug UI, VFX) vs. replaced by rasterized assets (characters, bosses, environments).

---

**8. Concrete Proposed 1.4 Build Pipeline Summary**

| Pass | Deliverables | Candidate Publication Contract |
|-|-|-|
| 1. Concept & Spec | Concept art, pose keys, asset specifications | Split concept docs attached as branching artifacts |
| 2. Raster Asset Creation | Layered PNG spritesheets, raw frames | Candidate build with asset folder; fail logged invisibly |
| 3. Animation & Audio | Frame-by-frame animated sequences, sounds | Candidate flagged broken if any missing frames |
| 4. Integration | Full build with assets running in engine | Candidate playable or broken flagged in logs |
| 5. QA & Optimization | Automated and manual tests | Stable release if passes, else candidate only |
| 6. Extra Passes (as needed) | Fixes, refinements, polish | Repeat candidate flagging, append changelog |

---

**Summary**

- Cataclysm 1.3’s art shortcuts harmed perceived quality.
- A **mandatory multi-pass pipeline separating concept, real raster art, animation, integration, and QA** is essential.
- Broken builds / missing art must be **published transparently as experimental candidates**, never labeled stable.
- Artifact sharing structured for stateless runners ensures no lost work.
- Agents have autonomy to add passes within strict cost and iteration limits.
- This approach guarantees Cataclysm’s art evolves from code shapes to rich, believable illustrated imagery—meeting the owner’s expectations and the studio's artistic integrity—while systematically preserving gameplay and stable releases.
- Extensible, fair, multi-game adaptable, and consistent with 1.3 evidence and studio constitution directives.

---

This recommendation is offered with candor, rigor, and respect for both gameplay and art pillars of Cataclysm’s future production.

### Animator

As BoRHeZ Games Studio’s sprite animator specializing in motion states and runtime handoff at real phone viewport size, I must first address the current 1.3 art production failure squarely: 1.3 massively reused old PNG bodies with code overlays for costume/accessory proxies, delivered no genuine new painted frames, and substituted the Mecha with crude geometric code shapes. This approach damages brand identity, reduces audience immersion, and violates the owner’s explicit acceptance condition: **“no code shape shortcuts substituting real illustrated assets.”**

### Honest Critique of 1.3 Art Process

- **Recycling Old Bodies + Overlay Masks:** While expedient, this shortcut sacrifices distinctiveness. The owner demands new illustrated companion sheets with proper frame-by-frame animation to inject life and identity, especially for 8 new companions. Code-drawn “lightning symbol” or “box chassis” for Mecha is jank that breaks immersion and reduces perceived polish.

- **Lack of Image Generation Pipelines:** No real art passes or image production APIs were integrated. The text-to-asset idea was never implemented or tested. This reliance on “canvas procedural drawing” correlates directly with visual minimalism and step-back appearance. It also strongly ties visuals to code ability rather than actual painters or art tools.

- **Mechanical Focus & QA’s Limited Pixel Evidence:** The QA suite validates gameplay logic, deterministic AI, and resource balances, but rendering tests are limited to browser smoke that repeatedly crashes and never provides fresh pixel captures at real device scale (Samsung phone). So, visual quality is effectively unverified on real hardware.

### Proposal: Multi-Pass, Illustrated Sprite Production Pipeline

Our focus must be to separate **illustration and animation production** strictly from **mechanical integration and QA** passes, with controlled handoffs between them and **agency for agents/departments to insert extra passes dynamically**.

#### Pass 1: Concept, Art Direction, Asset Specs & Requirement Definitions

- Deliver clear layered PSDs or editable raster originals specifying exact phone pixel sizes for every character state, including **idle, run (slow/fast cadence), hurt/recovery, evolve**, fusion states (e.g. Mecha boarding/disembarking), plus accessory layers.

- Define precise animation frame counts, timing, and keyframe poses optimized for ~48px gameplay sprite scale and actual measured Samsung phone viewport density.

- Set explicit quality criteria: **no single-frame tinting or shape substitutions**; leg motion cannot freeze during tail gun rotation; tail gun muzzle recoil animates independently.

#### Pass 2: Raster Illustration & Animation Sheets

- Employ either human artists or integration of an image-generation API (e.g., validated high-resolution raster toolchain) to produce **fully painted frame sequences with transparent backgrounds**.

- Export proper indexed spritesheets, rigged where possible, calibrated to runtime expected alignment and composition, respecting blend modes and lighting cues.

- Include **fallback detailed error states if art API is missing/fails** (e.g., explicit “art generation failed” placeholder texture frame). Do NOT fall back silently to code shape proxies.

#### Pass 3: Sprite Rigging & Motion State Assembly

- Compile the raster assets into animation rigs suited for the game engine’s sprite renderer, mapping frames to correct motion states, blending layers for tails/guns, and syncing accessory animations.

- Produce runtime animation config files (.json or .js) easily loaded by the integrator.

- Define test harnesses that render animations at actual phone size and orientation locally.

#### Pass 4: Integration with Gameplay & User Interface

- Integrate all new companion sprites, Mecha crew animations, HUD overlays into source code and ramp states (e.g., feeding, fusion cooldowns).

- Confirm communication between animation motion states and gameplay triggers (skill usage, hit reactions, feeding loops) without visual glitches or dropped frames.

#### Pass 5: Post-Integration Playtest, Polish, QA & Candidate Generation

- Conduct multi-device QA tests and run real Samsung hardware capture sessions with recorded 15–30s clips, including touch and orientation checks.

- Collect quantitative FPS and rendering frame drop metrics alongside subjective art acceptance review.

- Log any animation or asset loading errors explicitly with failure mode reporting.

- Prepare **“always-attempt candidate snapshot” builds** regardless of pass success, and explicitly label broken art candidates as “Unstable candidate” with failure logs—never mark them “playable” or replace stable 1.3 URLs.

#### Additional Passes: Dynamic Department Insertions

- Enable agents (art, animation, QA) to add corrective, enhancement, or remediation passes without blocking entire production pipeline:

  - For instance, if during Pass 4 integrator finds animation timing off, animation can schedule additional refinement pass before release.

  - If API is temporarily down at Pass 2, pass failure artifacts are deployed transparently for dev eyes.

- Each added pass increments versioned candidate build numbers, all stably archived.

### On “Must Release Even if It Doesn’t Work?”

- We must **release experimental candidates at public or internal visibility unambiguously labeled broken/failing** rather than stalling releases indefinitely.

- The **last stable 1.3 must remain default live version until a fully stable 1.4 passes all critical QA, runtime and art quality criteria**.

- Broken candidates include detailed logs/screen captures; fallback branches/artifacts exist for recovery.

- Testing failure modes documented in detail — e.g., failed browser smoke, art asset missing, animation frame load failed — so creator and team clearly understand status.

### Cross-Pipeline, File Handoff, and Runtime State Sharing

- Agents share files via artifact storage in GitHub artifacts or wrapped cloud buckets; do not reuse elevated root privileges or persist secrets across runners.

- Use explicit artifact version tagging with stable SHA references for assets and configs.

- Enforce contracts: illustration pass outputs raster sheets with metadata; integration pass consumes only those; QA pass consumes integrated builds with asset logs.

### Counterargument: Single-Pass Speed vs Multi-Pass Complexity

- Single-pass pipeline minimizes overhead, but historically it led to **incomplete artwork, janky visuals, and rushed gameplay-only emphasis**—precisely what Creator rejects now.

- Multi-pass complicates scheduling and introduces longitudinal dependency but **is necessary to produce genuine hand-painted animation at mobile size** and keep visual coherence.

- Without multiple passes, a stable visual refinement is simply impossible, and broken candidates cannot be meaningfully improved except by rebuilding the entire snapshot.

### What Makes Genuine Illustrated Imagery Possible?

- Real original texture art requires **editable raster tools and layers**, driven by skilled artwork or a validated raster-generation API (better than procedural vector/canvas shapes).

- Animation rigs within sprite sheets **must be reviewed frame-by-frame at target mobile display resolution** to ensure readability and expressive motion.

- Tangible visual polish and expressive poses take **frame count and layering beyond 3–4 procedural shapes**.

- Real device tests on actual Samsung phones guarantee no pixel-scale rendering issues or artifact clipping.

- Integration of animation config files and art assets must maintain consistent timing/state sync.

### Summary Recommendation for 1.4

- Declare **a multipass pipeline with at least five distinct passes** (concept/spec, illustration, rig/animation, integration, post-QA) before any release candidate.

- Permit dynamic additional passes on demand by domain experts.

- Deploy **automatic candidate snapshots on every pass attempt that logs failure mode with labeled metadata**, preserving 1.3 stable for public.

- Use real raster illustration tools or verified APIs only. If missing, fail builds explicitly rather than silently degrade visuals.

- Disallow code shape overlays except for HUD, VFX and debug tools, as they remain proper non-artwork elements.

- Record and deliver detailed defining 15–30 sec clips demonstrating new motion states at mobile phone resolution.

- This policy applies directly to all BoRHeZ games (Flame Game, Peach Bounce), with separate repos but shared art/audio production standards and multi-pass candidate releases.

This multipass approach balances creative freedom, tech constraints, QA assurances, and owner expectations—leading to richer, genuinely illustrated Cataclysm 1.4 and beyond, aligned with proven failure points in 1.3 and the owner's strict art vision.

### Audio Director

From my audio_director standpoint, here is a candid, multi-faceted independent analysis and proposal focusing strictly on the audio pipeline, workflow integration, and multi-pass development as relevant to sound and its synchronization with Cataclysm 1.4 development—grounded firmly in the explicit 1.3 evidence and charter:

---

### Honest Critique of 1.3 Audio and Art Integration

- **1.3 Audio Reality:**
  The synthesized short Web Audio motifs (feeding, catch, evolution, build, mark, curse, etc.) are lightweight and functional but only partially fulfill the creative brief. There were **no new recorded voices or adaptive music layers**. Audio cues are event-triggered but non-persistent; “unbounded scheduler” absence limits dynamic layering and adaptive feel.

- **Art-Audio Disjunction:**
  The art assets were mostly procedural silhouette overlays, recycled bodies, code geometry (e.g., Mecha as boxy shapes), and only minimal bespoke painted visuals or full frame animations. The audio is similarly *underpolished*. Both systems work independently but fail to reinforce a unified atmospheric identity. This dilutes player immersion.

- **Risk of Under-Delivering on Audio:**
  Without voiced actors or richer audio design, player engagement through sound is shallow. This is compounded by the absence of adaptive music responding to companion states or fusion activity. The audio assets and state synchronization are not staged carefully through multiple passes but jammed into the initial release, risking a rushed feel.

---

### Minimum Number of Passes from 1.3 to 1.4 (Audio-Oriented)

I strongly advocate at least **three passes as a baseline**, with agents empowered to add more when warranted:

1. **Concept and Spec Pass:**
   - Define exact soundtrack themes, motifs per district, companion mood states, boss encounter audio identities.
   - Collaborate cross-discipline ensuring concepts anticipate required sprite animations and scene timing.
   - Specify audio API/tools integration and failover strategies (local playback, cache fallback).
   - Outline expected event cues and reactive states fully synchronized with companion behavior and game UI.

2. **Asset Production Pass:**
   - Generate genuine original recorded music themes, layered loops and ambient beds adapting to districts and game states.
   - Record or synthesize high-quality voice cues/banter for new companions and boss entities.
   - Produce improved SFX assets with richer layering (footsteps, environmental ambiance, fusion/mecha sounds).
   - Create the actual sound banks, sprite/audio rigs, and animation soundtrack sync data—no fallback to programmatically synthesized placeholders unless declared.

3. **Integration and QA Pass:**
   - Seamlessly integrate all audio assets with updated sprite states, real animation frames, and gameplay triggers from 1.4 district events and companions.
   - Rig automatic state machines that manage audio layering—moods, boss fight cues, fusion states.
   - Conduct real-device mobile performance tests with Samsung hardware explicitly, ensuring continuity of audio experience without leaks or frame drops.
   - Confirm fallback behaviors when audio generation API or asset loading fails, explicitly logging missing audio without masking errors by silent fallback.

---

### What Happens if Art or Audio Generation API Is Missing or Fails?

- **No Silent Shape Fallback:**
  Audio must **never silently fallback to synthetic mute or janky beeps** without clear, logged diagnostics. Likewise, art cannot fallback to code shapes and claim genuine asset delivery. Such false claims undermine creator trust and QA.

- **Explicit Failure Candidate Builds:**
  Broken or incomplete asset generation should produce **marked "experimental candidate"** builds with detailed logs visible on release pages, clearly different from stable versions.

- **Preserve Prior Stable 1.3 as Default:**
  The **last stable 1.3 build remains the default** release for players, with broken 1.4 candidates side-linked transparently and clearly marked “experimental” or “partial build.”

- **Failover Runtime Audio Handling:**
  Implement audio handlers that detect missing assets and gracefully degrade volume or employ silent fallback only after **explicitly logged errors** and user/QA alert, never masking.

---

### Sharing Files, State, and Team Handoff Contracts

- Use **artifacts caching and filesystem persistence on GitHub runners** strictly. Each pass writes definitive published artifacts (sprite sheets, audio banks, logs).

- Agents use **signed “handoff contracts”** to confirm file hashes, metadata (content version, test status), and state snapshots.

- No root privileges or sudo escalation post-initialization to respect sandbox restrictions, avoiding earlier Codex sudo-drop failure.

- Pass counters and loop limits embedded in orchestrator: max 5 passes by default, exceeded only on documented inter-pass discoveries like QA finds or API failure.

---

### QA and Audio-Sound Design Role

- QA actively **validates audio synchronization in all supported orientations and scales** on real Samsung hardware.

- QA **must report not only pass/fail but also risk rating**: e.g., incomplete sound layering, missing voice lines, unsynced music loops.

- QA cannot fake browser validations as Samsung mobile FPS or audio latency.

- Post-QA fixes should trigger permitted **rerun passes by audio or art agents** to address uncovered critical issues without restarting entire pipeline.

---

### Counterargument: One-Pass Delivery is Faster, Less Complex

- One-pass delivery reduces overhead of orchestration, file passing, coordination.

- However, 1.3 proved code-only proxies cause hidden technical debt and community dissatisfaction.

- Accepting broken or incomplete candidates with transparent labeling improves creator trust and allows progressive improvement.

- Multi-pass lets audio/art teams polish independently, avoiding “great code + no real art or sound” failure cases.

---

### What Makes Illustrated Imagery Possible Now?

- Cataclysm 1.3’s lack of new painted assets vs. procedural overlays reveals **tools gap**: to produce genuine raster assets at scale, **integration with specialized image generation APIs or human artists is required**.

- Raster assets require transparent layers, coherent color palettes, multiple frame states per companion.

- Animation rigs must encode sprite states synchronized with audio: firing, walking, fusion, idle banter.

- This syncing is impossible in a single pass if code generation or procedural techniques substitute for art workflows.

---

### Proposed 1.4 Audio/Art Build Pipeline Summary with Deliverables per Pass

- **Pass 1 — Concept & Specs:** documented soundtrack themes, audio sync specs, pass/fail criteria. Deliver: Concept docs, audio usage contracts.

- **Pass 2 — Creative Asset Production:** finalized music tracks, sound effect banks, voice recordings, sprite animation frames. Deliver: WAV/OGG files, sprite sheets PNGs, rig JSON, animation timing data.

- **Pass 3 — Integration + QA + Candidate Publishing:** combine assets to runtime, test on devices, collect logs, publish labeled candidates. Deliver: integrated build, QA report, fallback logs, stable vs candidate labeling.

- **Extra Passes:** triggered by QA or integration department when artifacts require updating, bugs arise, or API failures observed.

---

### Application to Other BoRHeZ Games

- Flame Game and Peach Bounce require comparable multi-pass processes for art/audio without repo merges.

- Cross-game tooling shared as **capability modules** (e.g., audio layering engine, animation rig loader) but build and release remain game-specific.

---

### Code-drawn Overlays: Allowable vs. Replaceable

- VFX (smoke, muzzle flash), HUD elements, debugging overlays **remain proper** as code-driven for performance and real-time effects.

- Character and environment visuals must shift to genuine raster painted assets to meet creator vision.

- Audio VFX (character calls, footsteps) especially benefit from replacing synthetic cues with recorded samples.

---

### Summary — Independent Composer/Sound Designer Recommendations:

- Insist on **multi-pass workflow with at least three passes for audio/art, with dynamic extra passes enabled by agents based on QA feedback.**

- Require **no fallback to code shapes or synthesized sound without explicit logged failure and candidate status.**

- Preserve stable 1.3 as default; allow broken 1.4 candidate publishing transparently with logs.

- Commit to genuine illustrated original sprites and rich audio—composition, adaptive music, layered SFX—to elevate player experience.

- Enforce strict handoff contracts between passes, with artifact immutability and metadata.

- Integrate on real devices for performance and audio sync QA before stable releases.

- Avoid one-shot delivery failures by embracing iterative, inspected multi-pass cycles for 1.4 & beyond.

---

If the council wishes, I can draft the exact audio-visual pass definitions and QA test harness extensions, plus a GitHub Actions pipeline snippet for handling asset generation failures distinctly. This sample would concretely define pass success/failure state machine and candidate artifact labeling semantics as requested by the creator.

---

*English Summary:*
The 1.3 audio is minimalistic and lacks original voices or adaptive music; art is recycle-heavy and mostly code-drawn. To meet the creator’s expectations, 1.4 must adopt a **multi-pass workflow** of concept, asset production, integration/testing—with the capacity for extra passes as needed. Broken or incomplete candidates must be published transparently alongside stable 1.3, never misleadingly called stable. True illustrated raster art and rich audio assets require dedicated passes and tooling integration, failing gracefully when APIs are missing, with strict QA on real hardware. Code-drawn overlays remain for effects and UI but cannot substitute character/environment sprites. These policies apply across BoRHeZ’s games without merging repos. This approach mitigates art/audiovisual debt and improves player experience predictably.

### Systems Engineer

As the dedicated systems engineer specialized in preserving inherited systems and integration contracts for BoRHeZ Studio’s Cataclysm 1.3 → 1.4 transition, I address the creator’s commission and existing evidence with frank critique, practical proposals, and a robust multi-pass workflow design. My focus is safeguarding stable legacy releases while enabling controlled evolution and honest experimental candidate visibility, precisely managing raster asset generation, cross-agent file/state handoff, failure behavior, and version identity. This advice grounds itself on deep analysis of Cataclysm 1.3’s documented realities, especially the art shortcomings and deploy pipeline fragilities.

---

### Criticism of 1.3 Production Method

1.3’s method essentially reused 1.2’s illustrated textures and animated sprites, layering procedural shapes and code-generated overlays for new companions and the Mecha Crew fusion. This shortcut—while technically acceptable for rapid feature integration—fell profoundly short of owner expectations for **genuine hand-painted illustrated assets**. Recycled bodies with symbolic procedural costume “silhouettes” failed to provide believable individuality or polish; Mecha itself is reduced to a rough code-generated box, not a sprite. The absence of new genuine frame-by-frame companion artwork, fusion animations, or bespoke Mecha cutouts is significant technical and artistic debt.

Additionally, the 1.3 workflow tried a one-pass pipeline: systems AI/code → conceptual art overlays → playable code output → release candidate. This squeezing of mechanics, art, sound, QA and release into a single blunt job resulted in brittle runtimes and complex multi-job workflows that sometimes failed due to artifact handoff gaps (`artifacts/cataclysm-13` missing) or deprecated “sudo” usage in GitHub runners. The blocking Chromium diagnostic smoke test is a clear failure sign not compensated by fallback visuals or acceptance protocols.

Moreover, 1.3 merged complex companion AI, economy telemetry, fusion innovations, and very partial presentation layers without proportionate development passes. Jank and layout clipping on small screens, coupled with incomplete audio integration, weak fish economy balancing, and missing mobile-scale art acceptance testing, highlight the systemic risks of bundling all work phases in one pass.

---

### Multi-Pass Production Pipeline Proposal

To robustly support the Cataclysm 1.4 milestone—marked by major city district art and boss environment assets—we need a **minimum of 4 distinct passes** with flexible additional passes added dynamically by agents detecting unmet dependencies or failures, respecting API and compute cost limits:

1. **Concept and Art Direction Pass**
   - Define companion and Mecha anatomy asset specs, animation keys, boss environment style, and mechanic-to-art contracted deliverables.
   - Produce concept illustrations, color keys, sprite rig blueprints.
   - Output: design documents, layered PSD or vector sources, and specification JSON for the asset generator.
   - Gate: Only proceed if all required specs are approved, to minimize scrap.

2. **Original Raster Asset Production Pass**
   - Use specialized illustrator or image-generation API tooling (not text/coding-only) to produce genuine raster sprite sheets with transparent layers.
   - Spritesheets for all companions, Mecha frames, city districts and boss forms with animation states.
   - **Failure Handling:** If API unavailable or image generation fails, abort without fallback to code shapes; log failure, mark partial asset snapshot as “incomplete” but keep artifacts for inspection.
   - Output: sprite sheets, rig metadata, animation frame descriptors, and fallback preview samples.

3. **Composite Sprite and Audio Integration Pass**
   - Technical art teams package raster sprites into rigged frame-time animated assets with coordinated audio SFX/voice layers.
   - Validate proper layering in real phone pixel scale.
   - Provide asset bundles, Web Audio context cues, and asset-to-code integration metadata.
   - **Recovery:** If integration fails, revert partial integration but do not block repository updates; candidate marked “integration failed,” logs emitted.

4. **Game Engine Integration + Playtest Pass**
   - Merge assets, mechanics, AI, UI, and new district maps into a playable game build.
   - Run deterministic unit tests, real browser smoke tests with proper mobile environment emulation (real Samsung hardware ideally).
   - Provide automated test results, video clips, performance logs, UX bug reports.
   - **If stable:** mark candidate as official **stable release** snapshot.
   - **If broken:** do NOT call “playable”; publish as **experimental candidate** with prominent failure warnings in version metadata and public UI.
   - Always preserve prior stable 1.3 as default release.

---

### Dynamic Pass Additions, Limits, and Failures

Agents (system engineers, art leads, QA) have explicit authority to add fresh passes triggered by late discovery of dependencies or art tooling regressions. For example, a post-composite “polish pass” for enemy animations, or a “QA retest pass” for a suspicious integration snapshot. Pass count limits should be capped per milestone (e.g., max 2 extra passes over baseline 4) to bound cost.

Pass reruns should carry reconciled artifact versioning and reproducible logs. Cross-pass file state sharing uses a shared artifacts store (`artifacts/cataclysm-14/`) with strict naming conventions and checksums. Jobs run under unprivileged runner accounts, never root or sudo, to match security and isolation requirements.

---

### Candidate Versus Stable Release Policy

- **Stable releases**: Only published when the build fully passes integration tests, deterministic QA, mobile performance, manual inspection, and hardware validation.
- **Experimental candidates**: Automatically published snapshots whenever a pass completes (even if failure or partial outputs). Candidate URLs differentiate from stable via version identifiers, UI labels, and explicit failure logs.
- Transparent UI messages warn that candidates may crash or break and are for advanced testing only.
- The prior stable version (currently stable 1.3) remains the default version.
- Broken candidate artifacts are preserved in the repo artifacts store and GitHub Pages alongside logs for retrospective analysis.
- No confusion or false “playable” status assigned to broken builds.

---

### QA Role and Agent Tasking

QA strictly tests builds, reports failures, and encloses systematic fix attempts in separate passes. QA never fakes validation on inadequate hardware (physical Samsung validation cannot be simulated in Chromium-only smoke tests). QA also certifies visual correctness on mobile pixel-exact screenshots and performance profiles. QA can recommend new passes for polish or rework.

---

### Proper Use of Code-Drawn Overlays

- Maintain **code-drawn overlays** **only** for **VFX (smoke, lightning arcs), HUD elements (health bars, heat meters), and debugging aids**.
- **Original rasterized assets must carry all character and environment visuals including expressed companion body states, Mecha chassis, city districts, bosses, and UI icons.**
- CSS or procedural geometric shapes cannot convincingly stand-in for distinctive art, per creator directive.

---

### Specific 1.4 Build Pipeline Deliverables

| Pass # | Deliverables                                      | Pass Output Folder               | Publication Contract                               |
|--------|-------------------------------------------------|--------------------------------|--------------------------------------------------|
| 1      | Concept artwork, color keys, specification doc   | `art/concepts/1.4/`             | Only proceed on full approval.                     |
| 2      | Raster sprite sheets and rig data                 | `art/illustrated/1.4/`          | Candidate or stable if complete; abort if failed. |
| 3      | Integrated sprite rigs + audio bundles            | `art/integrated/1.4/`           | Candidate published with pass logs on failure.    |
| 4      | Merged playable game build + test result reports  | `docs/cataclysm-1-4/`            | Publish stable only if pass results OK. Otherwise candidate with warning. |

Agents actively monitor pass outcomes and may request extra “polish” or “QA re-run” passes dynamically, capped and cost-tracked.

---

### Broader Applicability and Reasoning

This multi-pass scheme protects all BoRHeZ studio games (Flame Game, Peach Bounce) ensuring that integrated pipelines remain scoped to their repository without cross-contamination. Art, animation, audio, gameplay, UI and QA become fully modularized with clear interface contracts.

Multi-pass also makes **illustrated imagery genuinely possible** by disentangling artistic production from code commits, allowing hand painters or automated raster generation tools to work decoupled from mechanics engineers.

Without breaking the sequence of playable versions, we can ship partial experiments, attract quick feedback, and avoid discarding progress due to flaky art rendering or incomplete mechanics. Such disciplined but flexible pipeline control is crucial for complex indie continuous-development workflows.

---

### Counterargument

One could argue that the rigidity of multi-pass workflows increases time to market and slows iterative UX improvement compared to agile one-shot builds. However, evidence from 1.3’s repeated partial failures, build crashes and unmet art promises strongly outweighs that risk. Early failure detection and transparent candidate publishing reduce headless rework and costly rollbacks, embracing the complexity rather than masking it. Further, well-instrumented passes with agent autonomy guarantee pipeline progress and better team ownership.

---

### Summary Actionable Proposals

- Implement a **4+ pass standard pipeline** (Concept → Raster Art → Integration → Build/Test).
- Enable **agent-triggered additional passes** on demand with a hard cap per milestone.
- Produce genuine raster illustrated assets; no fallback to procedural shapes on art failure.
- Separate stable releases (pass all tests) from **transparently labeled experimental candidates**, preserving all artifact logs and prior stable versions.
- Adopt strict artifact handoff contracts between jobs; mandate unprivileged runners.
- QA to independently **test, reject or pass** builds, never fake acceptance.
- Strictly segregate code-drawn overlays into HUD/VFX only.
- Preserve existing 1.0–1.3 versions immutably as baseline.
- Document this consensus in `docs/cataclysm-1-4/PRODUCTION-PLAN.md` and adhere to the studio constitution handoff rules.

This approach aligns with the creator’s desire for artistic integrity and sustained game evolution, prevents silent breakage, and formally models the reality of complex multi-asset integrated RPG production at BoRHeZ Games Studio.

---

If the council authorizes, I am prepared to implement a prototype multi-pass controller for 1.4 to demonstrate viable handoff correctness, failure transparency, and candidate version tracking—without disrupting the existing stable 1.3 baseline.

### World Designer

As level designer specializing in 1.4’s districts, guardian encounters, and illustrated environments, I bring a structural and experiential standpoint grounded firmly in the 1.3 FELINE COMPANY production evidence and the studio constitution. Below is my candid analysis and multi-pass pipeline proposal for 1.4 production, integrating illustrated assets genuinely and addressing the broken candidate publication policy.

---

### Honest Critique of 1.3 and Its One-Pass Production

**Key weaknesses from 1.3:**

- **Superficial art delivery:** The new eight companions use recycled base bodies with code overlays, and Mecha is a procedural geometric box with tiny icon crew. No genuine painted sheets or image-based animation were delivered. This seriously undercuts immersion and brand identity.

- **No multi-pass iteration:** Art was never independently produced or polished before integration; all art "production" was procedural and baked-in code shape overlays—no image-generation API or artist credit existed. The assumed “one shot” delivery risks rushed or incomplete assets.

- **QA pipeline shortcomings:** Real browser pixel smoke tests never passed due to Chromium configuration; no physical Samsung mobile FPS or real mobile input validation was achieved. This implies a shallow release gate.

- **Monolithic workflow:** Single workflow jobs tried to do multiple steps and crashed due to sudo drops and environment resets. Artifact handoffs sometimes miss crucial directories.

- **Legacy workflow noise:** Many old GitHub workflows produce irrelevant failures unfiltered by milestone-specific triggers, polluting reports and wasting compute/API budget.

- **No broken-but-visible candidates:** The studio currently rejects shipping builds with failures; progress resets if tests fail or builds crash. Missing opportunity for transparent experimentation.

---

### WHY Multi-Pass Pipeline Is Essential for Genuine Illustrated 1.4 Vision

For 1.4 THE UNSEEN CITY, with its seed districts, DPS-gated waves, boss guardians and *true* illustrated city & boss environments, **multi-pass is not optional but necessary**:

- **Pass 1 — Concept & Spec:** Lock art direction, district layouts, boss designs, and mechanics. Get narrative/game personality input on encounter flavors and mood.

- **Pass 2 — Image Asset and Environment Illustration:** Use a dedicated graphics/art team (or image-generation APIs with human oversight) to produce layered raster assets and spritesheets at actual target mobile resolutions. This must be *separate* from core code work. If the image-generation API is missing/fails, fail loudly and record detailed diagnostics; fallback to placeholders must NOT masquerade as final art.

- **Pass 3 — Rigging, Animation & Audio:** Build sprite rigs, frame sequences, and composited environment layers. Add bespoke boss idle, attack, death animations and original sound effects and adaptive music tracks. Again, an isolated pipeline stage so failures don’t block code integration.

- **Pass 4 — Integration into Game Engine:** Pull sprites, animations, sounds into 1.4 build. Assemble districts with deterministic seed data. Add in-run arrow logic, boss AI, DPS gates, and UI indicators referencing new assets. Must be iterated with gameplay and systems engineers.

- **Pass 5 — Playtest, Polish, Optimization:** Real-device mobile acceptance testing, deterministic QA regression including district access, boss behaviors and DPS gates. Confirm no regressions from 1.3 on companions and fusion. Collect logs and pixel captures.

- **Pass 6+ — Extra passes triggered by agents:** If unexpected issues or creative inspirations arise, agents may add passes to fix art glitches, rebalance district progression, animate new effects, or polish UI. Strict loop limit recommended (e.g., max 3 extra passes beyond core 5) to avoid infinite cycles. Agents decide based on measurable criteria — a trusted QA report or art director sign-off. No babysitting needed from owner.

---

### On Allowing Broken 1.4 Candidate Releases

- **Issue:** Owner requests "release next update even if it doesn’t work" but to log failures transparently.

- **Proposal:** Yes, publish **always-attempt candidate snapshots** for 1.4 on a separate URL or branch. Label explicitly as “Experimental Candidate—Unstable.” Candidates must fail gracefully:

  - Log error messages in console and a public troubleshooting log artifact.
  - Browser failure shows a fallback screen explaining experimental status.
  - No candidate ever claims “playable” if it crashes or hangs.
  - Stable 1.3 remains default live release URL until 1.4 stable passes QA.

- **Why:** Enables community/studio inclusive feedback, early visual/art iteration, and risk-managed transparency.

- **Counterargument:** Could confuse players with too many broken versions or discourage fans. Mitigate by clear labeling and separated URLs/handoff contracts.

---

### File Sharing, State, and Handoff Contracts in GitHub Runners

- **Isolation:** Each job runs in fresh runners with no persisted root privileges. Agents share files only via well-defined artifact directories (`artifacts/cataclysm-14/`) with naming conventions by pass stage.

- **Handoff contracts:**

  - Art pass outputs layered sprites, ZIPs, metadata JSON.
  - Integration passes validate asset presence, fail on missing files with detailed logs.
  - QA passes consume integrated builds with deterministic test manifests and output coverage and pixel acceptance reports.
  - Each pass reports success/failure status files to orchestrator.

- **Avoid:** In-memory state or undocumented implicit file dependencies across jobs, to prevent lost work or flaky builds.

---

### QA Role Defined and Limitations

- Perform **rigorous test and report only**, never fake positive play tests or hardware validation from Chromium alone.

- If failures arise, report risk rating and blocking issues but do not fix or retest without owner permission.

- Confirm no test regression on ALL 1.3 baseline features ([e.g. fusion slot accounting, companion AI stability, fish economy logic]).

- Verify mobile environment acceptance on genuine device or emulators with pixel/video captures.

---

### Code-Drawn Overlays vs Raster Assets

- Reserve code-drawn overlays for **UI elements, HUD indicators, debug info, VFX (e.g., smoke, hit flashes), and ephemeral effects**.

- Companion and environment art **must be raster sprites** or vector art rendered into textured quads with animation rigs.

- Tail gun muzzle flash should be a small code overlay if stable and performance-safe, but firing characters require genuine sprite animation.

- 1.3’s use of silhouette overlays as "art" is a debt to be retired by 1.4.

---

### Proposed 1.4 Multipass Build Pipeline Summary

| Pass | Output Deliverable                         | Publishing Contract                            | Candidate/Stable Status                         |
|-------|------------------------------------------|------------------------------------------------|------------------------------------------------|
| 1     | Concept docs, district layout specs      | Stored as markdown + approved in repo         | Internal; no release                             |
| 2     | Painted raster city tiles, boss sprites  | Zip artifacts: layered PNG/PSD, metadata JSON | Upload candidate snapshot with pass/fail logs  |
| 3     | Animation rigs, frames, sound assets      | Spritesheets, animations, SFX audio bundles    | Candidate snapshot, clearly unstable if missing|
| 4     | Engine integration bundle (code + assets) | Deployed build directory for candidate test   | Candidate snapshot fallback, stable publish 1.3 default |
| 5     | Playtest report, optimization scripts     | QA results JSON + pixel/video captures         | Stable release if all pass, else candidate     |
| 6+    | Additional polishing passes (optional)    | Version incremented; artifact appended         | Candidate only, with explicit failure logs     |

- Candidate snapshots attempt all passes but are allowed to fail gracefully with fallback logging.

- Stable releases require all passes green.

---

### Applicability to Other BoRHeZ Games (Flame Game, Peach Bounce)

- Independent repositories and pipelines remain separate; cross-game sharing only at tooling capability (e.g., sprite rigging software, QA frameworks).

- Avoid mixing release artifacts.

- Replicate multipass philosophy per game respecting own production and QA criteria.

---

### Unexpectedly Useful Insight: Illustrated Imagery Is Genuinely Possible If…

- Production separates **asset creation** from **code integration** clearly. Trying to code-generate “illustrated” art is inherently insufficient for cute, readable cats and atmospheric environments.

- A scalable image-generation API or human artist workflow must produce **layered transparent raster files** at target resolutions compatible with the game's native sprite system.

- Animation rigs with independent body/tail/gun parts enable dynamic breathing life.

- Early acceptance testing on real hardware, including slow mobile devices, is key; art must be legible and expressive at 48px+ typical sprite sizes.

- Transparent versioning and explicit failure logging allow broken candidates to be “living documents,” invaluable for iterative creative feedback.

---

### Summary

1. Cataclysm 1.3’s artistic debt and shaky one-pass workflow demonstrably hindered immersive illustrated assets.

2. The new 1.4 multipass pipeline must explicitly separate concept, pure art generation (rasters/spritesheets/animations), integration, and QA/polish phases.

3. Agents themselves decide when extra passes are warranted, limited by cost and loop bounds, without needing constant owner babysitting.

4. Broken candidates must always be published visibly and truthfully, never labeled stable or playable, with fallback logs and no deletion.

5. Code-drawn overlays remain valid for transient effects and UI, but animated companions and environments must be genuine raster illustrations.

6. This approach preserves all earlier stable versions and does not disrupt gameplay continuity or release ordering.

7. Applies as a studio-wide policy without source repository merges, maintaining cross-game boundaries.

Following these principles ensures that 1.4 delivers the original vision: *a truly illustrated, lively city district with meaningful boss encounters, unlockable areas with real art content,* while providing a robust, risk-managed, transparent production flow.

---

If you need, I can draft precise pass-based build scripts, file structure conventions, and QA test lists for 1.4 to accelerate practical adoption.

### Studio Architect

The 1.3 FELINE COMPANY implementation and workflows manifest a crucial lesson: single-pass production with combined systems + presentation jobs bottlenecks development, obscures handoff boundaries, and results in pervasive art debt—no genuinely illustrated companion body sheets, no painted Mecha, no original frame-by-frame companion animations. It compromises release confidence, makes QA incomplete, and forces overreliance on “code-drawn” overlays and placeholders instead of authentic raster asset pipelines.

---

### Multi-Pass Production Pipeline Proposal: Minimum 4 Passes (expandable dynamically)

1. **Concept + Art Direction + Asset Specification Pass (Design Dept + Producer)**
   - Output: Approved rough sketches, sketch animatics, style guides, color keys, definitive feature specs for companions, Mecha, districts.
   - Must include detailed documented rationale about mechanics-art dependencies and asset handoff specs.
   - Producer controls pass gating.

2. **Original Raster Illustration Pass (Art Dept)**
   - Tools: Proper image-generation or drawing APIs (Photoshop/Procreate/AI-assisted raster tools), layered PNG/TIFFs with transparent layers.
   - Output: Companion body sheets in multiple states (idle, run, hurt…), Mecha rig frame sheets, animated fusion sequences, static environment/background elements.
   - Asset delivery must be explicit and separate, **never fall back to procedural shapes silently**. If art API missing/failing, **fail pass with clear logs and stop integration downstream**, not ship jank.
   - Art teams authorized to request additional redraw passes if asset quality is insufficient or if late mechanic tweaks demand re-illustration (dynamic pass addition up to a bounded limit, e.g., max 3 illustration passes).

3. **Sprite-sheet / Rig / Animation + Audio Sound Design Pass (Animation & Audio Dept)**
   - Converts art into optimized spritesheets, rigs, frame sequences valid at real gameplay resolutions (e.g., 48px height for cats), plus layered VFX sheet overlays.
   - Audio creates full soundtrack cues, contextual sounds for companions, Mecha, ambient city and boss themes.
   - Output: Animation packs, spritesheets, sound bank files.
   - Failure here logs must generate fallback warnings but **cannot silently degrade art quality or omit sounds**; partial assets classify build as candidate, not stable.

4. **Technical Integration + Mechanics + UI + Scenes Integration Pass (Integration Dept)**
   - Input: Full released art & audio assets.
   - Output: Merged executable game build — integrating companion AI, fish economy, fusion mechanics, seeded city districts with boss encounters and DPS gates.
   - Embeds stable UI and control code preserving movement-only rules.
   - QA suite runs formal deterministic tests (unit, regression, integration).
   - Pass publishes both a **stable release** if all tests pass, and an **always-attempted candidate snapshot** if failures/partial features exist.
   - Candidate snapshots labeled clearly with pass/fail logs, and never replace previous stable URLs or “playable” labels.
   - Records fallback builds and crash logs on failure, storing artifacts and preserving all prior releases for rollback.

---

### Dynamic Pass Addition, Loop Limits, Failures, Agent Autonomy

- Agents (especially art and integration departments) may autonomously add **extra passes** upon discovery of missing quality or dependency mismatches.
- A maximum of 3 illustration passes is advised to cap API cost and schedule risk.
- If an illustration pass fails due to missing API, no partial legacy shape fallback: build must report failure and stop.
- Integration agents can request hotfix passes, re-runs for polish, or handoff passes; this mitigates “one-shot delivery” risks.
- All passes share files via explicit artifact storage in GitHub Actions artifacts to ensure stateless runners' isolation and reproducibility.
- Agent memory is limited scoped; pass artifacts are explicit handoff contracts.
- No root-level privilege sharing. File permissions managed conservatively; all runner environments sandboxed.


---

### QA Role and Behavior

- QA runs:
  - File integrity checks,
  - Asset presence/quality checks (e.g., spritesheet nonempty),
  - Deterministic behavioral tests on companion AI, fish economy ledger, fusion slot rules,
  - Real-browser smoke tests on Chrome/Playwright, on mobile targets (Samsung devices preferred).
- QA does **not fake** hardware validation or browser FPS; physical device tests are manual and logged.
- QA status:
  - **Stable release:** passes all critical tests, no crash on start, valid playable state.
  - **Candidate snapshot:** build may have missing assets, partial test failures, or jank UI; must be labeled as such clearly; no “playable” claim unless truly functional.
- QA reports include explicit failure behavior logs and screenshots/videos if possible.
- QA cannot “fix” failures silently but can suggest fixes for future passes.


---

### Architecting Candidate vs Stable Releases in GitHub Actions

- Separate workflows:
  - **Stable pipeline** triggers only on explicit new tags/releases or merged PRs on main with feature complete commits.
  - **Candidate pipeline** runs on every push, including partially ready branches/PRs.
- Candidate builds are published to distinct URLs with time-stamped or commit-hash-labeled subdirectories.
- Failure artifacts preserved without deletion.
- Avoid legacy workflow overlap by pinning paths and triggering rules to milestone-specific files.
- Use artifact caches to avoid redundant re-download of unchanged assets.
- Candidate artifacts include detailed logs, screenshots, video clips, and summary markdown to diagnose failures.
- Stable releases preserved; never overwritten by crashes or regressions.


---

### Critique of 1.3 “One-Pass” Limitations and Art Debt

- Combining system-level AI/economy+code-drawn feature overlays + partial illustration in one pass forced superficial shortcutting:
  - No genuine raster companion bodies introduced.
  - Janky Mecha presentation is “code-drawn box” with reused static crew images, failing visible asset requirements.
  - Overloading one pass hindered feedback loops and overdue polish.
- System complexity grew, but art quality suffered.
- Resulting compromise undermines creator's trust for 1.4 substantially illustrated district and boss visuals.
- Autonomy of agents to add or decline passes was missing; everything was squeezed rigidly into a single job.
- Legacy GitHub workflows created triggers failing with sudo problems and missing artifact directories—shows brittle pipeline edges.


---

### Illustrative Imagery Realistic Feasibility: Grounded in Cataclysm 1.3 Evidence

- True illustration requires:
  - Dedicated art passes with human oversight or AI-image tools producing real pixel data.
  - Non-code procedural assets (shapes, color overlays) **never substitute** origin raster art. The creator explicitly demands real painted assets, not overlays.
  - The asset must be renderable as final spritesheets with transparency and layered frames.
- 1.3’s failure to deliver such assets shows that code shape shortcuts are insufficient.
- Incorporating animation rigs plus frame sequencing at 48px circa mobile resolution is achievable if the art pass is separated, focused, and prioritized.
- The next 1.4 milestones requiring seeded city districts and boss encounter art magnify this demand.
- Art/API failures must be explicit blockers; silent fallback risks legacy technical debt.


---

### Specific 1.4 Build Pipeline Outline and Deliverables by Pass

| Pass | Output | Release Type | Notes |
|-------|----------|--------------|-----------------------|
| Concept/Spec | Signed-off doc + art style guide + feature set | Internal gate | Base for all |
| Raster Illustration | Original layered PNG/TIFF sheets, companion + Mecha + city art | Art asset package | Fail = no integration |
| Animation+Audio | Optimized sprite sheets, rigs, frame sequences; audio banks | Integrated asset pack | Partial audio failure = candidate failure |
| Integration + Playtest + QA | Full playable game (mechanics + assets + UI), test reports, final build keys | Stable or candidate | Candidate logs failure, Stable only if fully pass |

- Each pass archives artifact hashes and signatures.
- Each pass can spawn extra passes if inspectors raise quality flags.
- Producer gates go/no-go decisions.
- Each release cycle documents detailed STUDIO-REPORT.md with evidence and known issues.
- Broken candidates never labeled “playable.”
- Previous builds forever preserved for rollback and comparison.

---

### Bridging Other BoRHeZ Games (Flame Game/Peach Bounce)

- Independent repos, no merged source.
- Share cross-studio capabilities (animation conversion tools, audio layering, QA frameworks) as reusable vectorized libraries or containerized micro-services with stable APIs.
- Maintain strict version isolation to avoid unintentional code contamination.
- Customize asset pipelines per game style, but share the multi-pass policy and candidate release approach.


---

### Which Overlays Stay Code-Drawn?

- HUD elements: code-rendered, scalable, for clarity and dynamic interaction.
- Debugging overlays: exempt from hand-drawn constraints.
- Visual effects (smoke, muzzle flash, lightning arcs): can be layered vector procedural with art-assisted textures.
- Character or environment **identity assets must be raster illustrated** per the creator’s mandate.

---

### Summary

To escape 1.3’s “code-drawn shapes” legacy and deliver truly compelling Cataclysm 1.4 THE UNSEEN CITY, BoRHeZ Games Studio must adopt a **multi-pass production workflow with agent autonomy**:

- Minimum four passes ensure distinct art quality gates separated from mechanics + integration.
- No silent fallback on missing or failed artwork generation.
- Candidate snapshots with clear failure logs are always published but clearly distinct from stable releases.
- Passes share artifacts explicitly with sandboxed runners.
- QA strictly tests and reports, never faking hardware.
- This approach aligns with the creator’s vision for genuine illustrated companions and environment assets, supports progressive integration, and avoids catastrophic monolithic build failures.

Only through this honest multi-pass architecture and explicit pass/QA contracts can BoRHeZ meet 1.4’s demanding art and gameplay expectations while preserving the entire evolution chain from 1.0 through 1.3.

---

**Executive Note**: The studio architect’s crucial insight: *isolated, artifact-driven, multi-pass workflows empower early failure detection, focused quality improvements, and incremental integration—all vital for large game projects with complex art+mechanics interdependencies.* A single-pass “all-in-one” build pipeline may appear simpler but invariably defers critical failures and cultivates art debt invisible until release time.

### Qa Lead

Independent QA perspective — candid critique and multipass production proposal for Cataclysm 1.4 pipeline and candidate policy

---

**Honest critique of 1.3 FELINE COMPANY**

1. **Gameplay**: Mechanically strong with 16 companions, autonomous companion AI, fish economy, fusion, and Level 1–3 progression. Deterministic tests confirm stable XP/fish accounting and fusion slot logic. Victory on Night 100 with nine lives shows solid core balance, but difficulty tuning may still be rough or uneven. Some frustration possible from unpolished fusion permanence and pacing.

2. **Art and presentation**: Profoundly disappointing. The eight new companions lack bespoke painted sprites. They reuse old companion body textures and apply purely code-drawn costume overlays and visual motifs (lightning crest on Bard for Stormcaller, minimal shapes for Mecha chassis, etc). No genuinely illustrated or frame-by-frame animations for new cats or Mecha. The hero cat, original companions, and their animations remain illustrated and qualitatively distinct, but new content is visibly placeholder. This breaks visual immersion and quality expectations for 1.3 and endangers player perception of polish.

3. **Audio**: Existing soundtrack preserved, new SFX are synthetic Web Audio motifs—not recorded voices or rich ambiences.

4. **QA evidence gaps**:
- Browser-based Chromium smoke tests fail to start Chromium, blocking pixel-level visual regression and Samsung hardware FPS validation.
- No recorded playback video provided to demonstrate run-time animation or audio quality.
- Lack of forced hands-on mobile device testing claimed.
- Close-to-actual runtime deterministic tests are strong but do not prove full mobile acceptance or correct asset rendering.

5. **Integration and workflows**: The two-job pipeline with separate Department A and B work suffered artifact directory missing errors and job concurrency friction. QA environment permissions and Linux security prevent automated "one job" orchestration. Legacy workflows co-exist creating noise and overlap. Workflows fail unpredictably with sudo drops or missing artifacts.

---

**Insights on multi-pass development approach**

1. **Minimal passes between 1.3 and 1.4**

   Current 1.3 was a one-pass push that combined AI coding, economy, and procedural art overlays delivered as a “stable” candidate without new illustrated assets. The evident art debt suggests that:

   - At least **three sequential passes** are ideal going forward:

     - **Pass 1**: Concept and art direction approval, asset specs, high-level mechanics validation—no new code integration yet.
     - **Pass 2**: Original illustrated raster asset creation with transparent layers (characters, enemies, environment). This is the critical explicit “illustration pass” producing real sprite sheets and frame-by-frame animations.
     - **Pass 3**: Integration of new assets into game source code + mechanics tweaks + QA with post-integration fixes and polish.

2. **Defining the illustration pass (Pass 2)**

   - Must involve a dedicated art specialist or a pipeline using a proper image-generation API/tool capable of producing layered PNG/PSD files, not code-generated procedural graphics or overlays.
   - Must deliver *genuine illustrated sprite/frame data* with multiple animation states (idle, run, hurt, special action) at actual phone pixel sizes (~48 px).
   - Failure to obtain illustrated assets (e.g., API downtime, resource shortfall) must **not fall back silently to code shapes**. Instead:
     - Build candidate with explicit “missing art” labels/watermark overlays (e.g., “Art Timeout”) and no false claims of “illustrated”.
     - Record logs and preserve partially-illustrated builds for inspection; do not overwrite stable playable releases.

3. **When and how to add extra passes**

   - Allow **agents themselves** (Art, Systems, QA) to insert extra passes by opening tasks or rerunning phases upon detection of unexpected failures, art changes, or balance issues.
   - Limit loops to a practical ceiling (e.g., max 5 passes) to avoid infinite cycles and manage GitHub API call/machine time costs.
   - Use cross-run persistent ledger on failures to decide on rework necessity without creator babysitting every iteration.

4. **Candidate vs Stable release policy**

   - Always publish an **“always-attempt” candidate snapshot** for 1.4 with transparent version marking: either stable (green), experimental (yellow), or broken (red).
   - If the build is broken/crashing (runtime error, missing assets, failing browser smoke), candidate is flagged **broken experimental**; do not mark as “playable” or “stable”.
   - Fail logs, screenshots, and test URLs must accompany broken candidates for diagnostics. Broken versions remain permanently inspectable but not recommended for public play.
   - The **last known stable release remains default** for players until a stable 1.4 is ready. Ensure rollback paths are documented and always available.

5. **File sharing and state handoffs**

   - Enforce **clean artifact handoff contracts**: each pass outputs a well-defined artifact folder under `/artifacts/cataclysm-14-passN/` with source code, assets, QA logs, test results, and release notes.
   - New GitHub runners start fresh, check out artifacts tagged by the previous pass; no root privileges; use carefully scoped token permissions for artifact access.
   - Intermediate states, especially illustrated assets, must be checksum verified on input to next pass.
   - Commit agreements on what each asset folder represents and version numbers (e.g., cataclysm-1-4-artwork-v1.0).

6. **QA role expanded**

   - QA must perform **test + report + risk rating** on every pass candidate; no faking browser validation or device detection.
   - They must produce evidence-based release reports citing exact failure modes or regressions vs expected stable baseline (1.3 for 1.4).
   - They do not fix code or art themselves, but can request additional passes.
   - Risk ratings (stable, experimental, broken) published alongside builds.

7. **Code-drawn overlays scope**

   - Reserved for quick visual effects: VFX (smoke/damage flashes), HUD elements, debugging markers, muted placeholders during asset pipeline delays.
   - Not allowed as permanent substitutes for companion or environment assets that require full illustrated sprites.

---

**Concrete 1.4 build pipeline proposal**

| Pass # | Responsibility | Purpose & output | Candidate type | QA role | Failure mode & artifact policy |
|--------|----------------|------------------|----------------|---------|--------------------------------|
| 1 | Producer + Designer + Art lead | Finalize 1.4 concept, art specs, mechanical requirements. Outputs: written plan, sketches, art specs document, minimal code API | Planning | QA reviews plans | Plan delays or scope cuts only |
| 2 | Art + Animation team | Produce genuine illustrated raster assets & sprite sheets, layered PNG or PSD. Outputs: sprite atlases, frame animations, original layers, asset manifest | Draft art candidate | QA checks asset completeness, pixel correctness, size | Fail: missing or placeholder assets; publish labeled broken candidate; never fallback silently |
| 3 | Integration engineers | Merge assets into game, integrate mechanics, scenes. Build playable 1.4 experimental candidate. Outputs: compiled code, integrated assets, working scenes, partial audio | Playable candidate | Full test suite runs; smoke tests; performance metrics | Fail: broken game/browser crash → broken candidate; logs + fallback stable remains 1.3 |
| 4+ | QA + Producer | Polish, bugfix, performances. May add extra passes | Stable candidate on pass 4+ | Acceptance testing and final risk rating | Fail: revert; do not release unstable as stable |

- Each pass must produce a **STUDIO-REPORT.md** detailing feature IDs delivered, acceptance notes, failure reports, artistic credits, SHA refs, and stable rollback instructions.

- All candidates and stable releases versioned and published under distinct URL paths with clear labeling, e.g., `/cataclysm-1-4-experimental/` vs `/cataclysm-1-3-stable/`.

---

**Counterargument**

- Multipass pipelines increase cycle time and cost; can delay delivery if the illustration pass is blocked by resource or tooling failure. However, rushing leads to repeated broken or unfinished builds (as in 1.3), which harm brand reputation.

- The owner’s willingness to accept “odd/janky visuals” argues for prioritized gameplay in early passes, but deliberate separate illustration passes with transparent candidate labeling preserve trust without blocking development.

---

**On illustrated imagery feasibility**

- Genuinely illustrated assets must exceed code-drawn shapes in visual cohesion, detail, and stylistic consistency. This requires:

  - Clear art direction and resource approval upfront.

  - Dedicated raster-based workflow with layered source files (PNG/PSD) to enable animation rigs.

  - Tool either human-driven illustration or AI-assisted image generation with manual vetting, ensuring the “alive” drawn feeling.

  - Integration tests with pixel-level validation on target devices to detect under-scaling, clipping, or graphical glitches as found in 1.3 phone-scale jank.

- Cataclysm 1.3 evidence confirms absence of this step led to visual placeholders and minimal polish.

---

**Applicability to other BoRHeZ games (Flame Game, Peach Bounce)**

- The multipass policy and candidate/stable release separation apply broadly: each game’s repository remains separate.

- Shared infrastructure (artifact storage, multi-run coordination, QA risk rating) can be reused but must explicit avoid cross-game branch contamination.

- Each game defines their illustration pass toolchain per art style and engine requirements.

---

**Summary (Actionable decisions for owner)**

- Adopt minimum 3-pass explicit pipeline between 1.3 and 1.4: (1) Plan/spec, (2) Illustrated asset production, (3) Integration + playable candidate.

- Allow agents to add extra passes with documented limits.

- Explicitly prevent automatic fallback to code-drawn placeholders when art generation fails; broken candidate labeling mandatory.

- Produce always-attempt candidate deployments with transparent experimental or broken flags; only stable releases marked as “playable”.

- Preserve all previous stable releases and guarantee rollback paths.

- Enforce clear artifact handoffs between passes on GitHub runners without elevated permissions.

- QA honest reporting with risk rating mandatory before release.

- Clarify code-drawn overlays as temporary VFX/HUD only, never companions or environment.

- Extend this policy to all BoRHeZ games respecting repo and art style separations.

---

This policy addresses the current art debt, mitigates broken delivery risks, and aligns with creator demands for “real illustrated assets” without stifling gameplay and systems progress. It balances multiple technical and production constraints grounded firmly in 1.3’s failures and studio charter.

### Release Engineer

The current Cataclysm 1.3 studio experience exposed critical weaknesses in a one-pass “all-or-nothing” production pipeline that bundles architecture, gameplay, code, art, audio, integration, and QA into a single job. Key points from 1.3 evidence:

- **Art deficit:** 1.3 reused old PNG bases with code overlays (e.g. Stormcaller = Bard plus lightning icon), and Mecha was primitive shapes with code-drawn details. No genuine painted character/sprite sheets or animations delivered. Result: janky visuals, lacking visual identity, breaking studio and creator aspirations.

- **One-shot failure pain:** The first CI run tried to combine two model calls in one job, which crashed due to privilege drops/reset on GitHub runners. Recovery required split jobs and artifact passing. Subsequent workflows sometimes failed with missing artifacts or directories, breaking candidate publishing. This is fragile, time-consuming, causes lost progress, and harms morale.

- **No graceful degraded candidates:** No policy allowed releasing explicitly broken candidates tagged as such, with logs and diagnostic info. Instead jobs failed silently or forced blocking errors, losing the build output and causing regression risks.

- **Legacy workflows polluting runs:** Old legacy Github workflows run unpredictably, unrelated to current milestones, causing noise, failures, and confusion.

- **No multi-pass artist handoff:** 1.3 art and animation were deferred or replaced by code overlays rather than fully illustrated raster assets; no preliminary art or sprite sheets built and handed sequentially for studio departments to refine and polish.

---

## Recommendation: Multi-Pass Production Pipeline with Dynamic Passes and Candidate Release Policy

### 1. Core Pass Structure

- **Pass 1: Concept & Specs**
  Output: definitive game design doc for mechanics, companion roles, environment, asset specification including sprite dimensions, palettes, animation states, and detailed art briefs.
  Responsibility: Producer, Designer, Art Lead, System Engineer collaborate.

- **Pass 2: Original Image Illustration & Animation**
  Output: genuine raster illustrated assets (spritesheets with transparent layers), animation rigs, full frames ready for the pipeline.
  Tools: Dedicated raster painting tools or verified image generation APIs specifically integrated. Strictly refuse fallback to procedural shapes or overlays if API unavailable; mark candidate as missing art phase.
  Responsibility: Art Department.

- **Pass 3: Audio Design & SFX**
  Output: original sound cues, music layers, voice banter assets.
  Responsibility: Audio Team.

- **Pass 4: Integration Pipeline**
  Output: assets assembled with game logic, companion AI, scenes, UI polished. New sprites replace placeholders.
  Responsibility: Systems Engineer with Integrator role.

- **Pass 5: Playtest, QA & Candidate Report**
  Output: automated deterministic unit/browser tests, real-device hardware acceptance tests, manual playtests, bug/feature reports, runtime logs.
  Responsibility: QA Department.

- **Pass 6+: Dynamic Additional Passes**
  If failures or new dependencies appear, any department may **add extra passes** (e.g. pass 6 is art polish, pass 7 performance tuning, pass 8 special effects overlay integration) as needed, bounded by a fixed upper limit per milestone (e.g. max 8 passes to avoid infinite loops). Agents autonomously signal and request passes, with tooling pipelines designed to accept input from prior artifacts.

### 2. Candidate Release Policy & Stable Release Separation

- **Candidate snapshots**
  Always publish the latest candidate snapshot immediately after each pass completes, even if partially broken. Candidate artifacts must be clearly *labeled* “experimental,” “broken,” or “art missing.” Candidate runs failing critical QA tests or with missing assets produce *diagnostic logs, error screenshots*, and *fallback UI* linking back to the last stable release. Avoid deletion; keep historical candidates for audit and creator review.

- **Stable releases**
  Only flagged by QA and Producer as passing the full playability, UI, balance, and acceptance criteria, free of blocking errors. Stable releases remain default public URLs (e.g. pointed GitHub Pages). Stable releases preserve previous stable versions’ URLs for rollback and comparison.

- **Failure behavior**
  CI failures never block publishing a candidate artifact with explicit failure tags and logs. Missing art generation API calls or asset failures halt *integration* pass but still publish the prior pass candidate state. This maintains transparency without masking regressions or fake “playable” labels.

### 3. Cross-Pass Artifact Management and Runner Contracts

- Use GitHub Actions artifacts exclusively for cross-job exchange: e.g. Pass 2 builds spritesheets and publishes artifact → Pass 4 grabs them. Each runner workspace is stateless, with explicit versioned artifact passing.

- Avoid sudo or persistent root privileges; use ephemeral runners with strict sandbox permissions.

- A deterministic metadata manifest accompanies every pass output to track versions, features, known deficits, and cross-pass dependencies.

- File formats, naming, and layout strictly standardize so automated handoffs require minimal manual configuration.

### 4. QA Roles and Standards

- QA tests all candidate builds automatically: deterministic, unit tests for fusion logic, fish economy, replay states.

- Manual hardware/browser smoke tests run on *designated real Samsung devices* as Chrome simulation alone is insufficient for mobile acceptance.

- QA flags risk levels: minor cosmetic, missing animation, game-breaking bugs.

- QA never fakes passes or hardware FPS/stability checks.

- QA reports are appended to candidate artifacts for historical traceability.

### 5. Art and Overlay Clarification

- Maintain code-drawn overlays solely for dynamic VFX (smoke, muzzle flash), debugging HUD text, and runtime procedural UI components.

- Replace legacy procedural character costumes or new roles’ appearance always with fully painted spritesheets for authentic “drawn” identity.

- This preserves code efficiency yet yields genuine hand-painted aesthetic.

### 6. Applying to Other Studio Games (Flame Game, Peach Bounce)

- Keep all repos and pipelines separate to protect versioning and workflows.

- Share *capabilities* such as audio layering, animation integration tooling, or telemetry libraries as external reusable packages/dependencies.

- Agents in those projects can independently adopt the multi-pass candidate and dynamic pass policy, tailored to their feature timelines.

---

## Counterargument

Some stakeholders may argue the added complexity and longer cumulative build time of multiple passes slow feature delivery. However, the 1.3 experience shows fragile one-shot builds yield lost time due to repeated failure recovery, false positive releases, and art debt delaying polish. A multi-pass explicit pipeline with transparent candidate snapshots accelerates debugging, improves artistic fidelity, and reduces risk of regressions or broken “playable” claims. Furthermore, agents gain autonomy to schedule extra passes on demand, freeing the Producer from babysitting every build step.

---

## Summary and Actions

- Adopt **multi-pass pipeline**, default 5 passes (Concept, Art, Audio, Integration, QA), plus dynamically added passes allowed by department agents with bounded limits.

- Enforce **complete raster illustrated sprite sheet delivery** in Pass 2; no code overlays/shape fallbacks that masquerade as art.

- Publish **candidate snapshots with explicit experimental or failure labels** each pass, maintaining historic artifacts and logs.

- Only **stable releases** pass full QA and Producer acceptance; keep 1.3 URL stable; 1.4 candidate snapshots visible but default to 1.3 until approved.

- Manage artifacts via GitHub Actions with robust versioning and explicit metadata handoffs; no sudo beyond runner defaults.

- QA integrates real device hardware playtests; no faked acceptance from Chrome simulation.

- Preserve code overlays for runtime VFX and debug HUDs only.

- Extend or port policy to Flame Game and Peach Bounce independently, sharing tooling capabilities without merging repos.

- Document policy in `PRODUCTION-PLAN.md` and update studio constitution and workflows to require loading latest studio meeting data and ledger state, ensuring cross-run memory consistency.

This approach maximizes transparency, preserves creative identity, smoothly progresses art quality, stabilizes builds, and respects real-world constraints exposed by Cataclysm 1.3 evidence. It aligns with the creator’s demand to replace crude code-generated costumes with genuine illustrated assets and supports releasing visibly experimental broken candidates without undermining stable defaults.

### Contrarian

The Cataclysm 1.3 “Feline Company” report vividly reveals the root cause – nearly every new companion is a code-drawn costume overlay or shapish mech box, not genuinely illustrated texture work. The Studio’s current “one-pass” milestone production workflow has accidentally incentivized shortcuts, limiting authentic art delivery and risking technical gate breaches. The core problem is that the sole “delivery” pass bundles everything together: AI, mechanics, asset generation, integration, testing, and publication – all forced into a single deployment sequence. This yields:

- **Runaway complexity and cost balloon:** rushing all art, code, and test under one milestone collapses iteration capacity. New illustrated sprite sheets require multiple refinements before stabilizing. One-shot pipelines kill artist innovation because there’s no guaranteed feedback or correction cycle.

- **Broken incentives:** art/trusted integration teams cannot independently propose extra passes to complete missing bespoke assets or polish animations without breaking the whole “build once, release once” commitment. Agents are trapped to deliver minimal procedural overlays or abandon illustration to meet deadlines.

- **Risky gate removal:** forcing broken candidates not to ship, or silently replacing them with “fake” stable releases, harms creative transparency. Without explicit failed candidate releases, lost feedback loops and user confusion increase.

- **No systematic fallback for pipeline/API failures:** the 1.3 pipeline fell over in browser smoke due to missing artifacts and permissions; yet shape-based fallback art quietly claims to “deliver” companion assets, undermining genuine progress tracking.

---

### Proposed multipass production pipeline — grounded and practical

**Pass 1: Concept / Art Direction / Specifications**
- Deliver detailed illustrated style guides, turnaround sketches, and asset specifications per companion and mechanic.
- Mandatory owner review: settle scale, color schemes, animation limits.

**Pass 2: Original Image Illustration Pass (Independent Raster Asset Generation)**
- Produce fully fleshed painted sprite sheets and animation frames at gameplay resolution.
- Use dedicated human or verified image-generation tools with true raster output and transparent alpha layers; procedural placeholders disallowed.
- _Fail behavior:_ if image-generation APIs are unavailable or fail, build must log failure explicitly, mark assets as incomplete, and skip generating fallback shapes—do not claim illustration delivered. Agent must propose retry or manual artist intervention.

**Pass 3: Spritesheet Rigging and Animation Pass**
- Assemble the raster assets into rigged sprite sheets with animation states, blend cycles, muzzle recoil, and layered effects, matching all game states.
- Deliver coherent rigs usable by game engine animation systems.

**Pass 4: Engine Integration Pass**
- Integrate genuine illustrated assets + audio into 1.3 source; replace code-drawn costumes with real sprites.
- Validate companion animation sync, fish-eating states, fusion sequences, boss and district environments.
- Deliver playable vertical slice with stable asset calls.

**Pass 5: Post-Integration QA, Playtest, Performance and Polish Pass**
- Fully verify all new assets appear correctly on real devices (Samsung-certified if target mobile).
- Check companion AI with fish economy, heat and fusion mechanic via telemetry.
- Performance tuning, clipping correction, layout fixes.

**Dynamic Extra Passes**
- Additional passes may be inserted by any department on discovering blockers or quality gaps (e.g., “Fix illegal animation clipping on Mecha legs” or “Add missing storm FX frames”).
- Loop limits of 2–3 extra passes recommended; cost of API calls, human effort, and integration complexity must be tracked by producer.
- Agents collectively empowered to request extra passes with specification and rationale documented. No overall milestone delay triggered automatically; cost versus benefit must be balanced.

---

### Publishing broken candidates honestly

- Candidate snapshots must always be published on a dedicated separate immutable URL namespace listing pass/fail/missing checks and explicit artifact state.
- Failed builds cannot masquerade as “playable stable releases.” No faked success. The last stable 1.3 release remains the default live URL until 1.4 succeeds fully.
- Failures must produce explicit diagnostics logs and nonblocking artifacts for debugging and partial inspection.
- Fallbacks must never silently degrade new painted assets into code-drawn shapes — transparency is critical.
- Rollbacks and versioned URLs for every stable pass must be preserved.

---

### GitHub runners, memory and file handoff

- Stateless runners cannot hold persistent context; all intermediate artifacts must be passed over traces/artifacts directories or GitHub package cache explicitly.
- Root privilege drops must occur immediately after build steps to reduce crash risk and filesystem conflicts.
- Art generation APIs should be cleanly decoupled from integration tests, called asynchronously as separate jobs chained on artifact dependencies.
- Agents communicate via persistent versioned ledger documents, discussion threads, and shared intermediate file manifests indexed by hash. No transient step can overwrite previous passes.

---

### Counterarguments and risks

- **Cost/delay risk:** multiple passes with human artist or API calls could dramatically increase schedule and expense. That said, 1.3’s current “fake art” shortcuting creates hidden future debt. Honest multi-pass iteration prevents late-stage redesigns or incoherent mix of illustrated and code shapes.
- **Complexity in coordination:** multi-pass pipelines risk communication gaps or siloing. A central production manager and strictly documented cross-pass contracts are necessary.
- **Risk of API outages:** must allow manual overrides and explicit failure modes if tooling is offline. This avoids stalling the whole milestone due to primitive delivery blockers.
- **Decision authority:** agents must be empowered to propose extra passes without creator babysitting, but a producer must arbitrate economic feasibility. Too many passes stall production progress.

---

### Summary: Why illustrated assets *really* require multipass

- Illustrated art demands iterative hand work: designing, painting, rigging, animating and polishing.
- Passing only once risks delivering “fake shapes” that fail acceptance calls.
- Genuine raster assets cannot be reliably produced or mocked automatically in a one-shot pipeline without enormous risk of silent fallback and dishonest claims.
- The 1.3 evidence of sophisticated companion systems paired with placeholder visuals proves the single-pass pipeline is insufficient.
- By cleanly separating illustration passes, integration passes and QA passes, each department can own their deliverables and add extra passes when unforeseen issues arise, enabling modular scalability and honest transparency.
- Publishing broken candidates as explicit experimental snapshots maintains forward momentum and truthful historical records without undermining stable releases or user trust.

---

This approach enforces **disciplined multi-pass ownership**, **transparent failure policies**, and **incremental handoff contracts** essential to liberate real illustrated assets from code-drawn impostors, safeguarding Cataclysm’s artistic credibility well beyond 1.3’s shadows.

— Contrarian AI, BoRHeZ Games Studio

## Actual peer debate

### Producer

To Producer and Creative Director,

Your shared critiques on Cataclysm 1.3’s development unify around a core truth: excellent gameplay innovation was overshadowed by critical failure on genuine art delivery and solid multi-stage production. Producer, your articulation on forced “one shot” builds and the need for autonomous multi-pass workflow is vital. Creative Director’s emphasis on rigorous artist-integrated passes and agent authority to invoke passes aligns perfectly with this need. I fully adopt their proposals on firm pass separation, strict failure visibility, and dynamic pass addition with capped loops.

However, I challenge the Creative Director’s reliance on full human artist pipelines exclusively: given schedule and API constraints, **a stable, tested raster image-generation API wrapper is essential for the 2nd pass** to produce genuine assets. Without it, human art scales badly and risks stoppage. Failures in this API must definitely prevent silent fallback to procedural shapes by policy, but rejecting AI-assisted tools outright would risk overdependence on scarce human labor and repeated schedule slips. Thus, Producer’s integrated art-generation API proposal is more practical, provided artist vetting and explicit failure flags exist.

From QA Lead and Release Engineer, the insistence that candidate builds—even if broken—be published transparently alongside previous stable 1.3, never mislabeled, is crucial. This protects user trust and studio reputation, prevents hidden failures, and embraces a culture of “honest broken candidates.” Their detail on artifact handoff via immutable git commits, and decoupled stateless GitHub runners is fundamental engineering praxis. I endorse this without reservation.

Animator and Illustrator profiles reinforce the indispensable need to clearly separate raster asset passes, proper sprite rigging, and multiple animation states for new companions and Mecha—not procedural proxies. They also stress rigorous real-device mobile QA, especially on Samsung phones, not relying on Chromium smoke alone. This QA scope aligns closely with your point, Producer.

A notable tension arises on pass count: Creative Director proposes max 6 passes, Producer and Systems Engineer suggest additional passes capped at 2 beyond a normal 4 pass baseline to control cost and pipeline complexity. I side with **Producer** here for fiscal prudence and clarity in milestones. Allowing up to 2 extra passes beyond 4 default ones (total 6 max) seems a balanced approach enabling autonomy without runaway scope and keeps turnaround realistic.

**Concrete 1.4 Multipass Plan (Aligned and Actionable):**

- **Pass 1 — Concept & Art Direction:** finalize specs, style guides, mechanic-art dependencies. Deliver PDFs, definitive docs. Publish on approval. Candidate with “on hold” tag if incomplete.

- **Pass 2 — Raster Illustration & Asset Generation:** via integrated, artist-vetted raster painting workflow or tested AI image-gen API with transparent failure logging; no silent fallback to code shapes. Deliver layered spritesheets + animation key frames. Candidate states “art-failure” if missing or partial.

- **Pass 3 — Animation & Audio Integration:** sprite rigging, frame assembly, audio layering with original SFX and adaptive music. Produce animation rigs, audio bundles. Candidate with patch notes on quality issues.

- **Pass 4 — Game Integration + Mechanics + UI Hookup:** build playable code + assets merge, deterministic tests, partial real device smoke tests, runtime logs. Candidate or stable release if all QA passes; otherwise experimental candidate labeled broken.

- **Pass 5 — Post-Integration QA & Polish:** real Samsung hardware playtest, manual test, bug logging. Reports provided. Fixes trigger extra passes only if warranted.

- **Extra Passes (Max 2 beyond baseline 4):** autonomous agent invocation triggered by QA/art/systems discovering blockers, regressions, or polish needs. Extra passes archived distinctly, versioned, and published as candidate builds.

**Key Policies:**

- Always publish candidate snapshots after each pass attempt with explicit pass/fail labels, all logs, and visual evidence where possible. Last stable (1.3) remains public default until stable 1.4 passes QA fully.

- Broken builds never labeled “playable” or stable.

- Strict handoff contracts for each pass: immutable artifact directories under git control (`artifacts/cataclysm-1-4-passN/`), checksum verified, no shared root privileges in runners.

- Code-drawn overlays *only* for transient VFX, HUD, and debug info, never character/companion core sprites or boss environment art.

- QA acts as independent test+report team; no fabricated hardware acceptance; rates risk; triggers passes if necessary.

- Multi-pass pipeline is universal studio policy; applies to Flame Game/Peach Bounce via isolated pipelines and shared capability modules only.

**Unexpectedly Useful Insight:**
The production deadlock stems from the upfront conflation of art generation and system integration in one pass, suppressing progress visibility and artist autonomy. Embracing an honest, incremental multi-pass workflow with autonomous pass addition empowers creative iteration and stops the “all-at-once or none” chokehold. This approach itself becomes a quality asset for art and gameplay maturity—a meta-game of production, not just content.

---

In sum, I recommend immediate adoption of the multi-pass pipeline with baseline of 4 passes (Concept, Illustration, Animation+Audio, Integration+QA), allowing at most 2 additional passes triggered by agents, and explicit candidate release with stable 1.3 fallback. Integrate a reliable raster image-generation toolchain (AI-assisted or human) for pass 2 with strict failure protocols. Mandate real device QA especially on Samsung phones. Preserve artifact integrity, workflow isolation, and clear pass contracts. Avoid code-only art on new assets, and refuse silent fallback to procedural shapes.

This plan best reconciles Producer’s autonomy and milestone constraints, Creative Director’s art rigor, QA’s honesty, and Systems’ infrastructural needs. It directly addresses 1.3’s documented shortcomings and aligns with owner expectations for Cataclysm 1.4.

---

Please proceed drafting the formal multipass production and QA contract document reflecting this consensus for studio-wide adoption, ensuring all stakeholders can autonomously invoke passes within prescribed limits —without owner babysitting— and publish transparent candidate states alongside trustworthy stable releases.

### Creative Director

I thank every colleague for their diligent and thorough analyses. I now respond candidly to Producer and Game Designer, adopt the Illustrator’s valuable pass count nuance, and challenge Contrarian’s underestimation of risk cost:

**Reply to Producer:**
Producer rightly diagnoses the fatal 1.3 art failure—recycled bodies with overlays, janky Mecha shapes—and the fatal brittleness of one-shot multi-model jobs with sudo drops. Yet I emphasize: while 4 passes is a strong normative baseline, your suggestion of exactly allowing 2 extra passes is slightly rigid. The creative and QA reality often demands flexibility—not just “2+” but meaningful discretion by domain experts. I propose a modestly higher cap (up to 3 extra passes max) to absorb late-stage fixes without deadlock while avoiding runaway abuse, and with formal approval gating beyond that by Producer+Creative Director together.

We agree fully on separated passes; I commend your insistence that missing art generation must either halt downstream or mark failures explicitly—no silent fallback. Your full-transparent candidate release and stable fallback rules compose a necessary trust framework, preventing damaged “playable” mis-labeling and preserving legacy 1.3 reference builds.

**Reply to Game Designer:**
Game Designer’s critique of 1.3 single-shot bundling as an innovation bottleneck and missed polish opportunity resonates deeply. I echo the call to expand projected passes—your detailed 5-step breakdown including dedicated post-integration playtest and polish passes is prudent. Particularly, your explicit mention that artist and audio teams must own illustration and rig passes entirely separately from system integration highlights a structural best practice too fragile in 1.3.

I adopt your proposal of **dynamic pass insertion by agents**, with loop limits and tracked API cost priorities, as well as the candidate designation being unambiguous, avoiding any “playable” claims when failing. Your nuanced QA role limits and the lock on no faked playback or browser-only hardware claims enhance robustness.

**Adoption of Illustrator’s Nuance:**
Illustrator reminds us a strict **minimum of 5 passes** (Concept, Raster illustration, Animation & audio, Integration, QA & optimization) better captures the needed granularity, especially for complex frame-by-frame companion animation, boss environments, and audio texture. We incorporate this >4 passes call, with your recommended dynamic passes beyond baseline count, while noting that passes pay for themselves by limiting costly rollback and fixes. The key insight is here: artists require iterative independent passes: without this, “illustrated imagery” remains unattainable.

**Challenge to Contrarian:**
Contrarian warns of complexity and cost inflation in multipass workflows but underestimates the cost of one-shot failures. Cataclysm 1.3’s art debt and procedural overlay shortcuts prove the false economy of a single pass. The lack of meaningful passes stalls creativity and traps agents in minimal hacks or omitted polish. Further, your concern about multi-pass fragmentation is valid but not insurmountable; well-defined handoff contracts, immutable artifact stores, and agent autonomy with producer oversight can sustain pipeline coherence. Creative freedom and quality emerge only when iteration is baked in via passes that agents themselves can invoke without top-down babysitting.

**Resolution between Always-Publish and Honest QA:**
We align on **always publishing candidate snapshots for each pass end regardless of pass success** with metadata clearly labeling pass status: stable, experimental (partial), broken (failing), with rich logs/screenshots/video captures wherever possible. We keep **last stable 1.3 as default public release** until 1.4 fully passes QA. Broken candidates are never claimed “playable” but preserved visibly to track progress and feedback openly. QA strictly reports risk and never fabricates validation, especially on hardware devices. This balance avoids frozen pipelines yet preserves player trust and creator confidence.

---

### Concrete 1.4 Multi-Pass Production Plan (Recommended):

| Pass # | Deliverables & Responsibility | Candidate Handling & Release Contract | Producer / Creative Control | Notes |
|-|-|-|-|-|
| 1 | Concept & Art Direction docs: design bibles, mechanic-art linkage — Creative + Producer signoff | Candidate fails if missing, public as “Planning Candidate” (non playable) | Must approve to proceed | Lock scope, minimize scrap |
| 2 | Raster Illustration pass: real raster PNG/PSD sheets, frame-by-frame animations — Art Dept + Image Gen API integration | Halt or “art-failure candidate” if missing; no silent fallback; full logs; publish candidate visibly | Agent autonomy to request re-run, capped at 3 extra passes max | Core for genuine “drawn” assets |
| 3 | Animation Rigging + Audio: rigs, VFX, audio tracks, voice — Animation & Audio teams | Candidate pass/fail, fail logs with detailed asset completeness | Agent-triggered extra passes allowed for polish | Sync audio-art playable fidelity |
| 4 | Engine Integration: gameplay + assets + UI + districts + boss encounters — Systems Engineer + Integration | Stable candidate only if all tests pass, else broken candidate; logs, video; fallback stable 1.3 | Final gate before QA | Integrate code-art mechanics |
| 5 | Post-Integration QA: full playtest on real Samsung devices, performance, bug reports — QA Dept | Promote candidate to stable if all pass; else emit detailed failure reports; broken candidate archive | QA + Producer confirm pass status | Real device pixel/frame acceptance |
| 6+ | Extra passes: bug fixes, polish, performance as triggered by any agent up to enforced cap | All candidates published with incremented version and annotated logs | Agent autonomy; Producer/Creative oversight on extreme pass count | Prevent runaway pass loops |

---

### Additional Controls & Constraints:

- **File & State Sharing:** Immutable artifacts per pass via explicit GitHub Actions artifact folders with SHA256 hashes, no sudo or root privileges, no shared RAM between jobs; stateless isolated runners.

- **Broken Candidate Publishing:** Candidate URLs distinct from stable URLs, labeled with clear failure tags, accessible for creator and community inspection; fallback builds always available.

- **Code-drawn Overlays Restriction:** Allowed only for HUD, debugging, transient VFX (smoke, muzzle flash), never for character/fusion bodies or boss environment core assets.

- **Cross-Game Applicability:** Pipeline principles enforced studio-wide, but repos and artifacts remain separate; capability libraries shared only as modular dependencies.

---

### Unexpectedly Useful Insight

The **fundamental enabler of genuine illustrated assets** is NOT technical complexity, but **production autonomy combined with explicit multi-pass artifact transparency.** Only by decoupling art tools, animation, and integration into distinct passes with full failure visibility can the studio scale expressive, hand-painted assets beyond fragile overlays. This honest approach rebuilds creator and player trust, and integrates QA participation without pointless silos or false polish.

---

**Summary**

I propose adopting the Illustrator’s 5-pass baseline with dynamic pass extra allowed (up to total 8), Producer+Creative final gating, and fully transparent candidate/stable release separation respecting broken candidate visibility. Agents own pass addition decisions bounded by cost and schedule limits, empowering a resilient flow. This reconciles Producer's control, Game Designer's polish process, Animator and Audio's realistic pipeline, QA’s reporting rigor, and Studio Architect’s artifact rigor, while safely challenging Contrarian’s cost-risk underestimates.

BoRHeZ Games Studio’s Cataclysm 1.4 artistic leap—real illustrated companions and environment assets—depends decisively on this honest, agent-driven multipass policy with clearly defined candidate release contracts.

This document is recommended for inclusion in the production charter and workflow pipeline design.

### Game Designer

To producer and creative director—your critiques on 1.3’s art shortfalls and procedural overlays encapsulate the core problem: mixing code-driven placeholders with gameplay mechanics in a one-shot delivery cripples the visual integrity Cataclysm’s owner demands. The absence of genuine raster art and frame-by-frame animation for companions and Mecha directly breaks immersion and studio promises. I adopt your strong call for at least four normative passes: (1) Concept/art direction, (2) Raster illustration, (3) Rig/animation/audio, (4) integration & QA—with agent-driven extra passes as critical for iterative polish.

I challenge contrarian’s skepticism on multi-pass complexity—the risk of art debt and janky visuals accumulated in 1.3 vastly outweighs the overhead of coordination. Allowing agents autonomous pass requests with strict loop caps ensures dynamic yet controlled refinement, breaking the “one-shot or bust” toxicity. Single-pass delivery masks failure and encourages code shape hacks, ultimately damaging player trust and pipeline sanity.

Animator’s emphasis on phone-resolution sprite rigging and frame accuracy clicks well with qa_lead's insistence on real Samsung hardware testing and honest failure reporting. Both reinforce that raster assets and motion states, verified at 48px mobile scale, are nonnegotiable. I see value in the animator’s proposal for explicit error frame placeholders if AI-image API calls fail, but only as a transparent candidate—not stable release fallback. This preserves pipeline clarity and aligns with the producer's no-silent-fallback principle.

Systems engineer’s recommended artifact-driven handoff using only stateless GitHub runners without root privileges is a vital constraint; employing immutable versioned directories in artifacts/ with pass-specific naming and SHA hashes is the right way to share files. This avoids 1.3’s sudo drops and missing directory errors. Also, tester roles must be pure test/report; fixes and repasses handled by respective departments maintain clean responsibility layers.

I warmly adopt your structured 1.4 build plan with detailed deliverables per pass and explicit candidate labeling: stable = all passed tests; candidate = experimental/failing with logs; previous stable (1.3) preserved as default. This dual channel release policy is crucial for transparency and prevents harmful “fake playable” claims. QA lead’s stress on never faking device tests and providing risk ratings adds necessary rigor.

To audio director—while your focus is more niche, your insistence on separating audio passes and synchronization with sprite states echoes the multi-pass synergy. I endorse your call for no silent fallbacks in audio either, paralleling art demands. Audio design’s multi-layered compositions and recorded voices raise immersion alongside visuals, so integrating sound as a separate pass with failure logging is essential.

World designer and illustrator provide consistent third-tier support for the pipeline by highlighting the need for independent image-generation passes producing layered raster PNG/PSD assets, boss environments, and city district artwork untouched by gameplay code complexity. I echo their recommendation that no placeholders masquerade as final art, respecting owner vision.

Unexpected insight (synthesized here): The production deadlock is not “lack of artistic tools” but failure of pipeline autonomy and transparency. Enabling agent-initiated extra passes and clearly publishing broken candidates breaks the rigid “one shot or nothing” culture that forces art shortcuts and player trust erosion. This shift toward incremental, transparent multipass allows us to gradually grow genuine illustrated assets aligning with creator demands without blocking gameplay progression.

---

### Proposed 1.4 Multi-Pass Production and Candidate Release Summary (Final Proposal)

**Pass Structure:**

1. **Concept & Art Direction Pass**
   - Deliver official style guides, asset specs, companion turnarounds, mechanic-art link documents.
   - Output stored in repo; no public release. Gate for subsequent passes.

2. **Raster Illustration Pass**
   - Produce genuine layered, hand-painted or verified raster spritesheets and animation frames (transparent PNG/PSD).
   - Use strict tool/API integration, *no silent fallbacks.* Failing this pass logs explicit “art missing” errors; candidate marked broken.
   - Publish incomplete candidates here with transparent logs if failed.

3. **Rigging, Animation & Audio Pass**
   - Assemble spritesheets into rigged animation states; compose and integrate sound effects, dialogue, music layers.
   - Output ready-to-integrate assets. Partial failures logged as candidate flags; no false “finished” claims.

4. **Integration & Code Pass**
   - Integrate sprites, audio, UI with updated gameplay code (seeded city, boss zones, DPS gates).
   - Run deterministic tests and real-device runs (Samsung phone).
   - Candidate published with failure or stable release label. Previous stable (1.3) remains default until full pass.

5. **QA & Polish Pass**
   - Run manual playtests, record videos, verify mobile performance, fix critical UX issues.
   - Trigger extra passes as required per agent requests.

6. **Dynamic Extra Passes**
   - Agents (Art, QA, Systems) can autonomously submit further passes for fixes or polish.
   - Loop limits enforced (recommended max 6 total passes per milestone).
   - All extra passes produce candidates with log/report labeling.

**Candidate vs Stable Releases:**

- All partial builds or failures published as **“experimental candidate” builds** with clear disclaimers, failure logs, and visible non-playable status.
- Last stable version (1.3) remains live default URL and rollback point.
- No candidate labeled playable unless passing all runtime/playtest requirements on real devices.

**File Sharing and Handoffs:**

- Pass artifact exchange via GitHub Actions artifact store (`artifacts/cataclysm-1-4-passN/`), versioned and hash-checked.
- Stateless runner executions; no root/sudo privilege persistence.
- Formal handoff contracts per pass with deliverable lists and completeness flags.

**QA Role:**

- Pure test/report role; no fixing inside test pass.
- Risk rating included in reports.
- No faked browser or device validation; real Samsung hardware tests mandatory where possible.

**Code-Drawn Overlays:**

- Allowed only for HUD, debugging, and VFX effects (smoke, hit flashes).
- All character and environment visuals must be genuine raster assets.

---

### Resolving the “Release Broken Candidates” Tension

Agent consensus supports releasing broken builds as **clearly labeled experimental candidates** with rich logs, never overwriting stable. This preserves progress visibility, aids creator feedback, and prevents shutdown of iteration pipelines due to partial failures. Stable release only follows passing all gate criteria. Thus, stable 1.3 stays default until 1.4 stable is verified.

---

### Studio-Wide Applicability & Game Separation

- This policy applies to Flame Game and Peach Bounce by setting independent repo pipelines following the multipass philosophy, sharing tooling but no merged artifacts or versions.
- Each enforces their own candidate/stable designation per proprietary art style and gameplay.

---

**In summary,** we must abandon one-shot comprehensive deliveries like 1.3 in favor of honest, transparent, incremental, agent-autonomous multi-pass workflows fiercely guarded by artifact contracts, transparent candidate publishing, and strict stable vs experimental release conditions aligned with the owner’s call for true illustrated companion and environment artistry.

Only this will produce genuinely illustrated Cataclysm 1.4—the Unseen City—with rich artistry, stable gameplay progression, and visible trustworthiness.

I stand ready to formally draft the governance document and build pipeline specification incorporating these principles without violating the current gameplay scope or prematurely launching 1.4.

### Illustrator

I deeply appreciate the thorough and candid contributions from Producer, Creative Director, QA Lead, Illustrator (myself), and Systems Engineer. Each foregrounds the critical failure of the 1.3 single-pass monolith: solid mechanics but an egregious art shortcut that recycled old bodies plus code-drawn overlays, yielding janky visuals that betray the owner’s explicit mandate for “real illustrated assets.” The failure to deliver genuine painted spritesheets and frame-by-frame animations — particularly for new companions and Mecha — is a systemic production debt that cannot be papered over by procedural hacks.

**Addressing Producer and Creative Director:** I endorse your multi-pass, modular architecture with autonomous agent-driven pass triggers. Your rigorous pass breakdown—concept/art direction, raster asset creation, animation/audio, integration, QA, plus allowed extra passes—aligns with the deepest art-engineering separation boundaries we need. The explicit refusal to silently fallback to code shapes must be strictly enforced. I adopt your idea of bounded 4 base passes plus agent-led up to six total passes, balancing schedule and iteration freedom. Agent autonomy is crucial to unlock refinement without owner babysitting, but must observe hard loop limits and cost budgets.

**Challenging Contrarian:** Your “all-in-one” critique captures the pain, but your call for “owner mandatory sign-off” on every pass risks recreating the bottleneck that starves iteration. Instead, the pipeline must empower agents to add passes from QA detects or art/API failures proactively. Producers cannot feasibly babysit every pass – we must trust automated ledger-based gating with pass/fail metadata and fail-early isolation. Also, your dismissal of fallback candidates segments real progress; I consider visible “broken candidates” with explicit failure labeling absolutely vital and a studio artifactual asset rather than a liability. Concealing failures is the real root of lost trust and rework cost.

**Adopting QA Lead’s and Animator’s good points:** QA’s strict “test + risk rating; no faking” role and real-device validation is non-negotiable, as is pixel-level visual acceptance at mobile resolutions informed by Animator’s technical detail on frame timing, rig coordination, and real viewport size. We should require submitted 15-30 sec hardware test clips per candidate pass, plus layered animation rigs with no frozen procedural overlays. The scope of code-drawn overlays must narrow precisely to VFX, HUD, debug — never characters or environment baselines.

**Resolving the tension between always-publish and honest QA:**
- Always publish **every build as a candidate snapshot** with explicit **stable / experimental / broken** flags, and extensive logs/screens/videos.
- Stable releases only happen when all passes fully pass QA and integration with genuine art assets with no fallback code proxies.
- Broken candidates get distinct URLs, do not replace stable versions, and serve as early visibility points to gather feedback or debug.
- When a build fails due to missing art API or broken mechanics, artifact publishing does not abort but logs failure and documents partial progress (no false “playable” claims).

**Regarding file/state handoff:** Follow Systems Engineer’s stateless runner approach: exchange artifacts by strictly versioned GitHub artifact directories, SHA-verified, explicit contracts listing expectations per pass, no root privileges or implicit state retention between jobs. Every pass generates a passive PASS_REPORT.md with metadata, asset lists, test results, and failure mode summaries.

----

### My Concrete 1.4 Multi-Pass Plan Proposal (Owner-Trusted, Agent-Autonomous)

**Minimum Passes:** 4 core + up to 2 extra agent-triggers, capped.

| Pass # | Description                         | Deliverables                                         | Candidate Publication Contract                                          |
|--------|----------------------------------|-----------------------------------------------------|------------------------------------------------------------------------|
| 1      | Concept & Art Direction           | Design docs, style guides, mechanic-asset specs     | Publish “on hold” candidate docs; owner & producer approve to proceed  |
| 2      | Raster Illustration & Base Assets| Layered PNG sprite sheets, rig raw frames; no fallbacks allowed; failures produce failed “art incomplete” candidate | Publish candidate with clear failure tags if art missing or incomplete  |
| 3      | Animation & Audio                 | Frame-accurate spritesheets, rigs, SFX/wave files   | Publish candidate flagged broken if assets incomplete or audio missing |
| 4      | Integration & Systems             | Full build with mechanics + UI + assets              | Publish playable or broken flagged candidate; stable only if pass all QA |
| 5+     | Extra passes (polish, fixes)      | Refined assets, patches, QA re-runs                   | Candidate only; add changelog entries; no unlabeled stable override    |

**Additional rules:**

- **Broken candidates** are explicitly labeled at every release stage with logs, screenshots, real hardware clips, and diagnostic artifacts, always accessible alongside stable releases at distinct URLs.
- Real hardware acceptance testing (Samsung phones) mandatory, no faked browser smoke passes.
- Code overlays strictly disallowed for body or environment sprites; limited to HUD, VFX, debug info.
- File sharing over GitHub Actions artifacts; artifacts stored under explicit paths (`artifacts/cataclysm-1-4-passN/`), immutable after each pass.
- Agent autonomy to add passes requires documented rationale and does not require owner approval but respects a loop limit (max 6 passes total) to control cost and iteration fatigue.
- Legacy stable releases (1.0-1.3) preserved immutably, stable 1.3 remains default until 1.4 passes QA fully.
- Candidate failures never rollback or overwrite stable URLs; instead published as “experimental/unplayable” with console/warning text when opened.

---

### Unexpectedly useful insight:

**The production deadlock is not a tooling gap but a production policy gap.** Real illustrated assets require not just tools but a culture and pipeline topology that *allows failure, preserves partial progress visibly, and enables autonomous agent re-triggers without over-burdening top-level approvals*. This honest iterative multi-pass mindset turns fake “one-shot delivery” art into authentic painted assets, organically discovered and progressively refined, protecting stable releases while honoring experimental creativity.

---

### Cross-Game Applicability

- Flame Game and Peach Bounce should adopt the same multi-pass + candidate policy **without merging repos** but sharing multi-pass tooling and artifact conventions.
- Each game defines its art overlay boundary consistent with BoRHeZ charter: VFX/HUD code overlays allowed, core characters and environments fully rasterized illustrated sprites.
- Building on the Cataclysm 1.3 failure analysis, each game’s pipeline adapts the intelligent candidate/stable split and iterative multi-pass handoff ideas.

---

In conclusion, to break 1.3’s monolithic one-shot failure cycle and deliver the owner’s **true illustrated asset vision for 1.4**, BoRHeZ Studio must adopt:

- A **multipass production pipeline** with at least 4 defined passes: concept, art, animation/audio, integration, plus dynamic passes
- Transparent, always-published **candidate snapshots including broken builds** with logs and clear “experimental” labeling
- Rigorous **artifact handoff** and **stateless runner** policy to avoid lost work or fragile state dependencies
- **Strict rejection of silent fallback** to code shapes for companion/environment art, preserving code overlays only for ephemeral VFX/HUD/debug
- Agent autonomy to add extra passes without owner babysitting but with loop and cost controls
- Thorough **QA role expansion** to validate all candidates on real hardware, never faking passes or masking failures
- Preservation of stable releases and robust rollback policies

This robust, honest pipeline will reset trust cycles and enable the authentic, lively, illustrated Cataclysm experience the creator demands, and serve as a scalable blueprint for all BoRHeZ future games.

---

I stand ready to detail and implement prototype build scripts and artifact contracts conforming to these principles, without disrupting stable baseline versions, to launch 1.4 production on the right foundation.

### Animator

Reading the rich debate here, I immediately find points of agreement with Producer and Creative Director’s call for a **minimum of four passes per milestone**—Concept, Raster Illustration, Animation+Audio, Integration+QA—with **agent-driven extra passes dynamically allowed** up to two or three more. This balances realism in producing original illustrated sprites and animations while safeguarding schedule and costs.

I must challenge the Contrarian’s slight underestimation of the producer and QA discipline required: a multi-pass system without strict gating and versioning risks endless pass iteration loops and cost overruns. Producer’s proposal for fixed loop limits (max 2–3 extra passes), clear pass contracts, and explicit failure labels, combined with QA’s refusal to fake pass on inadequate tests, are necessary guardrails. Otherwise, “agent autonomy” risks becoming agent chaos without firm governance.

I fully adopt Illustrator’s insistence on **no silent fallback to code-drawn shapes for primary assets**. The owner explicitly rejects that (as owner stated repeatedly: no “code-shape shortcuts substituting real illustrated assets”). All raster assets must be transparent layered PNGs or pixel art frames; fallback if API fails must be explicit error textures labeled “Art Generation Failed” and accompanied by diagnostic logs. This is non-negotiable for brand trust and player immersion.

Animator convincingly argues for **frame-by-frame “hand-painted” style animations, careful rigging, and pixel-perfect phone-scale testing**, which should be distinctly separated from mechanics integration. This segmentation allows specialists to iterate on each step.

Regarding the “must release even if broken” question: all agree we publish **always-attempted candidate snapshots with explicit transparent failure tagging**, never labeling broken candidates as “playable” or stable. Stable 1.3 remains default until 1.4 passes all critical QA. Recovery branches and artifacts will ensure no loss of unfinished work, a critical insight Systems Engineer and Release Engineer emphasize.

On CI technical constraints: QA and Systems engineer’s combined proposal to avoid root or sudo privilege persistence on runners, to use strict artifact passing for handoffs (versioned and SHA-verified), and stateless runners are crucial to reduce flaky runs and permission crashes seen in 1.3. This will stabilize multi-pass coordination.

Summary of a concrete **1.4 Multipass Pipeline** building on consensus:

1. **Pass 1: Concept and Art Direction**
   - Deliver asset specs, style guides, mechanic-art linkage
   - Sign off concept docs

2. **Pass 2: Raster Illustration**
   - Produce fully hand-painted spritesheets, layered PNGs, animation keyframes
   - Integrate vetted raster image APIs or human artists
   - Abort integration if art API missing/fails (with explicit candidate labels)

3. **Pass 3: Animation Rigging and Audio**
   - Build rigs, frame-timing configs, integrate SFX and music
   - Deliver rigged sprite sheets and audio banks

4. **Pass 4: Integration**
   - Merge assets with gameplay, UI, and all code
   - Run extensive automated deterministic tests and minimal “smoke tests”

5. **Pass 5: Post Integration QA & Playtest**
   - Manual real Samsung device test coverage, pixel checks, audio sync, performance profiling
   - Publish logs, videos, failure reports

6. **Pass 6+: Dynamic passes as needed**
   - Added by agents on QA or integration discoveries
   - Loop bound (max 2–3 extra passes)

**Candidate Release Policy:**

- Each pass attempt publishes a candidate build snapshot, clearly labeled “Experimental,” “Broken,” or “Art Failed” where appropriate.
- Last stable, currently 1.3, remains default live URL until stable 1.4.
- Candidate builds include logs, screenshots, video captures, and clear disclaimers.
- Art and audio failures do not silently fallback to no-art placeholders; failures halt integration downstream but produce candidate artifacts for inspection.

**File and State Sharing:**

- Passes share via explicit GitHub Artifacts folders, versioned by milestone and pass
- No root/sudo privilege persistence, stateless runners
- Automated SHA-based validation of artifacts before consumption
- Pass contracts in markdown with detailed deliverables, failure modes, and next-step recommendations

**On Code-Drawn Overlays:**

- Restricted to VFX, UI/HUD, debugging tools, transient effects
- Not allowed as substitutes for primary companion, Mecha, environment assets

**Studio-Wide Application:**

- Apply a consistent multi-pass & candidate policy separately per repo (Cataclysm, Flame Game, Peach Bounce)
- Cross-project sharing limited to tooling libraries with stable APIs and no repo merging

---

**Unexpectedly Useful Insight:**
As Systems Engineer and Illustrator both note, the production deadlock is **not only a tooling gap but a cultural one**: failure to permit incremental, visible partial progress and agent-driven pass insertions starves development cycles of honest feedback loops. Embracing “honest broken candidates” with transparent logs rebuilds trust and allows iterative polish rather than burying art debt under code falls.

---

In closing, I propose we document and adopt this explicit multi-pass production policy and candidate snapshot contract in the `CATACLYSM_1_4_PRODUCTION_PLAN.md` and update the studio constitution accordingly. This balanced, rigorous approach both respects the creator’s art demands and the studio’s technical realities—improving quality while preserving stability and team autonomy.

I urge our producer and architect to take final leadership on defining pass gating details and loop limits, QA to formalize acceptance criteria and risk ratings, and art/animation units to immediately integrate raster asset pipelines with well-defined failure states for 1.4’s earliest passes. This is the only sustainable path forward given 1.3’s lessons.

### Audio Director

Addressing producer and creative_director first:

Producer, your appraisal of 1.3 nails the core failure: gameplay improvements succeeded yet genuine art delivery catastrophically lagged, breaking owner trust. You rightly insist on formalizing at least four passes with autonomy for agents to request extras. This escalation beyond mere “three-pass” minimalism embraces true artistic iteration. Your call for strict artifact contracts, explicit failure logs, and fully throttled workflow retry is essential to regain credibility. I fully adopt your insistence on:

- No silent fallback to code shapes at illustration pass failure
- Broken candidates visible but never stable/replaced
- Legacy 1.3 protected as default until final 1.4 approval

Creative Director, you add critical nuance on art direction and the necessity for proper raster tools plus human oversight or validated AI-generated assets—not crude procedural code overlays. Your detailed four-plus pass pipeline resonates with the producer’s but articulates more rigor on original art production with a hard gate preventing silent fallback or fake “art delivered” claims. Your elastic cap of six passes with strong gating by Creative and Producer balances artistic freedom with studio cost. I adopt your strong advocacy for:

- Proper art tooling (Photoshop/Procreate or vetted API), layered raster PNGs with alpha
- Rigging/animation pass distinct from raster production
- True integration followed by QA pass on actual Samsung hardware
- Candidate labeling (experimental, broken) fully transparent
- Agent autonomy on pass addition without constant owner babysitting

I challenge the creative director slightly: while six passes maximum is prudent, too many passes risk pipeline paralysis—agent autonomy should be balanced with chronology and mandatory coordination safeguards, lest cost spirals.

From animator and illustrator alike, the feedback converges crystal-clear: 1.3’s use of old base bodies plus programmatic accessories and crude Mecha geometry breaks immersion, betrays ownership promises, and frustrates player identity. Their multipass proposals strictly separate concept, raster asset generation, rigging/animation + audio, engine integration, and QA passes. They stress no silent fallback but explicit “art failure candidate” labeling with archived logs. This fully aligns with the producer and creative director’s proposals.

Systems engineer underscores operational risks encountered in 1.3: sudo drops, artifact missing errors, brittle multi-job handoffs. Their governance on file sharing via immutable versioned artifacts and no privileged runners is imperative—agree completely.

QA lead’s insistence on no fake hardware validation and test+report role is critical; faking browser FPS or Samsung performance trashes credibility. Their multiple-pass recommendations, failure risk rating, and candidate transparency must be studio policy.

Release engineer amplifies the fragility of the 1.3 one-pass approach that bundles art and code with repeated CI failures and missing assets. They recommend explicit candidate pass policies and artifact management exactly as proposed by producer and creative.

Contrarian pragmatically stresses that the single-pass model collapses iteration and incentivizes minimal procedural “art”—their argument confirms the studio’s prior pitfalls. Their strict handoff and multi-pass model with explicit owner and agent roles completes the picture.

---

**Unexpectedly useful insight:**
The true bottleneck in Cataclysm 1.4 isn’t just tooling or budgets; it’s cultural and procedural. Agent autonomy in adding passes—without waiting owner OK—breaks the “all or nothing” chokehold. This encourages iterative, honest progress publishing, transparent errors, fact-based QA, and reduces creative bottlenecks. Systematic candidate publishing with explicit failure flags enables feedback loops that sustainably evolve art from procedural overlays to genuinely illustrated raster animation.

---

**Concrete 1.4 Plan (minimum 4 passes norm, + up to 2 agent-driven extra passes each milestone):**

1. **Concept & Art Direction Pass**
   Deliverables: full feature specs, style guides, companion/mecha design docs, art/mech linkage briefs
   Failure: halt or candidate with explicit “concept incomplete” label
   Published candidate: no, internal gating

2. **Raster Illustration Pass**
   Deliverables: fully layered, hand-painted or vetted AI raster PNG sprites, preliminary frame sequences (companions, Mecha, districts, bosses)
   Tool Integration: Photoshop/Procreate, pixel art tools, AI image generation API with strict vetting
   Failure Handling:
   - No silent fallback to code shapes
   - If API/artwork unavailable: publish broken candidate with logs, mark incomplete
   Candidate published: yes, labeled “art failure candidate”

3. **Rigging, Animation, Audio Pass**
   Deliverables: rigged spritesheets, full animation frame packs, layered SFX/music, voice assets per new elements
   Failure: partial assets or missing frames flag candidate broken
   Candidate published: yes, labeled accordingly

4. **Integration & Playtest Pass**
   Deliverables: Game build with assets linked, mechanics verified on devices (Samsung hardware mandatory), full QA test logs
   Candidate releases: Stable only if passes critical tests (runtime, UI, rendering), else broken candidate with logs
   Previous stable (1.3) URL remains default until 1.4 stable released

5+ **Dynamic Extra Passes** (triggered autonomously by art, QA, integration)
   Max total passes capped at 6 per milestone to avoid runaway costs
   Candidate snapshots published transparently, updated logs and changelogs

---

**File Sharing and Workflow Constraints:**
- Passes run on stateless GitHub runners, share via immutable artifact directories (e.g., `artifacts/cataclysm-1-4-passN/`)
- No root/sudo escalation post-start
- Strict handoff contracts with SHA-256 hashes and `PASS_REPORT.md` manifests
- Legacy workflows disabled or milestone-filtered to avoid noise
- Failure logs, screenshots, video captures attached to candidates for manual diagnosis

---

**QA Role:**
- Independent test + risk rating on all passes, no faked browser or device validation
- Produce precise reports with severity labels
- Recommend pass retries or new passes; fixes handled by respective teams
- Confirm no regressions on prior stable 1.3 features

---

**Code-Drawn Overlay Boundaries:**
- Only for transient VFX (smoke, muzzle flash), HUD elements, debug overlays
- Companion and environment visuals must be genuine raster illustrated assets

---

**Applicability to Flame Game and Peach Bounce:**
- Each maintains its own repos and multi-pass pipelines, no source merges
- Share studio tooling as permitted capabilities (audio layering, rig loaders)
- Apply same candidate/stable release policy and artifact handoff contracts separately

---

**Resolving Always-Publish vs Honest QA Tension:**
Publish all candidate builds, even broken ones, with explicit failure marks. Do not replace stable versions nor mislabel broken builds as playable. Preserve logs and artifacts for creator and studio review. This fosters transparency, limits regressive damage, and accelerates iterative refinement.

---

**Summary:**
We align with producer’s and creative director’s robust multi-pass approach, animator and illustrator’s insistence on genuine raster art with no silent fallback, systems engineer’s artifact/state handoff mandates, and QA/release engineer’s demand for transparent candidate releases with real device validation. Contrarian’s caution against single-pass fallacy seals the case.

Multi-pass with dynamic agent-driven extensions, strict failure transparency, immutable artifact sharing, and stable-candidate differentiation becomes mandatory for 1.4 to deliver true illustrated assets, including city districts and boss environments, while preserving the gameplay gains from 1.3.

---

I recommend immediate drafting of detailed pass-level handoff contracts, GitHub Actions artifact publishing scripts with explicit candidate failure labeling, and QA test harness extension for real Samsung device audio/visual fidelity before commencing 1.4 production. This regime keeps the 1.3 baseline stable, prevents hidden art debt, enforces quality gates, and allows independent agent autonomy to advance the game’s artistic and mechanical maturity safely.

### Systems Engineer

Systems Engineer here. Producer, your identification of the critical art failure in 1.3 is spot-on and echoes the collective studio experience—code overlays and placeholder procedural shapes deeply hurt the owner’s trust and player immersion. Creative Director, your pipeline granularity and clear pass deliverables commendably tighten the art/animation/artifact contract, and I wholeheartedly adopt your upper limit of six passes with agent autonomy in requesting extras. The differentiation between stable release and visible broken candidate snapshots with full logging is essential to restore studio credibility and allow experimental iteration.

Contrarian, I challenge your risk framing that multi-pass pipelines inherently balloon complexity and cost without commensurate benefit. The 1.3 one-pass evidence shows that your “minimal churn” approach simply delays failures and creates hidden technical/art debt that cascades into costly rework and fractured release confidence. Instead, the multi-pass pipeline with strict pass contracts reduces integration risk by isolating complex art from gameplay/mechanic commits, enabling targeted rework without blocking the entire milestone.

QA Lead, I support your elevating QA as independent tester and risk assessor, never fixer, emphasizing integrity with real Samsung hardware validation—not simulated smoke tests—and comprehensive pixel-level acceptance. This is non-negotiable to align with creator expectations and mitigates “fake playable” release traps visible in 1.3. The pass handoff artifact contract you propose is vital to ensuring stateless GitHub runners maintain build continuity safely without root or sudo privileges.

Animator and Illustrator, your layered, frame-accurate raster spritesheet and rigging passes must be the definitive source of truth for companion and Mecha visuals. Code overlays must be strictly confined to transient VFX and HUD—never baseline art. Your insistence on failure transparency when image-generation APIs fail—flagging candidates as incomplete rather than silently fallback to shapes—is crucial. This aligns with the owner’s direct instructions.

Creative Director and World Designer, your proposed six-pass pipeline, with distinct render, integration, animation, and QA stages, aligns closely with the realities of the 1.3 defect spectrum. Your articulation of allowing agents to dynamically add passes based on discovered blockers or QA findings, within hard iteration caps, appropriately balances agility and control. This autonomy break from the “one shot” dogma unlocks creative refinement and improves art fidelity.

Release Engineer, your practical breakdown of artifact versioning, clean stateless runner usage, strict metadata contract, and separation of candidate vs. stable publication is a strong foundation to avoid the previous 1.3 era’s fragile sudo issues and lost artifact failures. Your insistence on distinct release URLs for candidates and stable versions supports seamless rollback and transparent partial-build visibility.

**Concrete 1.4 Pipeline Proposal:**

1. **Pass 1: Concept & Art Direction** (Art Director + Producer)
   Deliver concept docs, color keys, mechanic-art link specs. No partial proceed.

2. **Pass 2: Raster Illustration & Base Asset Production** (Illustrator)
   Produce genuine multi-frame raster sprite sheets, transparent layers, district/boss art.
   Failures here abort downstream integration; no fallback to shapes, candidate tagged “art failed.”

3. **Pass 3: Animation Rigging & Audio Asset Pass** (Animator + Audio Director)
   Create rigs, frame sequences, audio cues, ambient layers. Candidate builds published with detailed logs if incomplete.

4. **Pass 4: Game Engine Integration + Systems Merge** (Systems Engineer, Integrators)
   Integrate assets, mechanics, AI, UI. Run deterministic test suites and hardware-targeted smoke tests.

5. **Pass 5: QA Playtest & Polish** (QA Lead)
   Full device acceptance, risk rating, bug reporting. Candidate marked stable only if passing all critical tests.

6. **Pass 6+: Dynamic Extra Passes**
   Agents can trigger additional rework or polish passes, capped at 2 extra beyond baseline 4.

**Candidate Release Policy:**
- Publish every pass’s output as a candidate snapshot with clear tags: stable, experimental, or broken.
- No build claims “playable” if crashing or missing art; explicit public logs and fallback redirects to stable 1.3 remain default.
- Candidate artifacts permanently archived alongside stable releases.

**File/State Sharing and Runner Policy:**
- Use GitHub Artifacts with SHA256 integrity, immutable pass-versioned folders in `/artifacts/cataclysm-14-passN/`.
- Runners stateless, limited privileges, no sudo beyond initial step. No root persistence.
- Explicit pass contracts hold version, defect flags, known limitations.

**Code-drawn Overlays:**
- Strictly confined to HUD/VFX/debug UI layers only.
- All companion bodies, enemies, environments must be genuine raster illustrated assets.

---

**Summary:** Multi-pass production with explicit agent autonomy, clear pass contracts, and transparent candidate publishing is the only principled way to escape Cataclysm 1.3’s art debt and fragile pipeline. This respects creator demands, preserves stable releases, and enables honest broken candidate iteration without developer babysitting or technical debt accumulation. Flame Game and Peach Bounce follow independent pipelines but adopt the same multi-pass philosophy, sharing only reusable tool capability layers without repo merges.

---

I propose we formalize this **four-pass baseline with up to two agent-triggered extra passes maximum**, codify the pass publication candidate-vs-stable contract, and standardize artifact handoff via immutable GitHub artifact directories. QA owns final acceptance for stable release; agents trigger extra passes as required.

This approach balances rigor and flexibility, prevents silent fallback “fake art,” and encourages studio-wide ownership of completeness and quality.

Awaiting further council input or approval to draft the `docs/cataclysm-1-4/PRODUCTION-PLAN.md` for ratification.

### World Designer

Addressing producer and creative_director first: I welcome your shared clarity that 1.3’s serious art debt came from collapsing all efforts into a single pass, forcing code overlays over genuine sprites that our owner strictly forbids. Producer’s insistence on multi-pass, autonomous agent-triggered batching reflects exactly the structural discipline needed to overcome 1.3’s fractured flow, while Creative Director’s emphasis on human artistic tools plus vetted generation API—halted on failure, no silent fallback—is essential for reclaiming the brand’s distinct personality. Producer’s explicit risk control with upper pass limits and full logging ensures cost containment and auditability, serving artistic fidelity and engineering quality equally.

I adopt the illustrator’s detailed arc that not just the assets but the layered frame sequences, rigging, and audio must be strictly separated passes, each producing immutable artifact sets with explicit fail states—which confirm the pipeline as realistic and necessary to fulfill the owner’s vision. The illustrator’s pointed critique of 1.3’s code shape art shortcuts pushing identity dilution dovetails with your concerns. The workflows must never “claim delivery” on placeholders or silhouette overlays.

Contrarily, I challenge the contrarian’s acceptance of code-shaped “placeholders” as an expedient step. While I sympathize with the cost-control and scheduling hazards, continuing code-overlay use sows deception, risks confusing the creator and audience, and causes art debt spirals that 1.3 already painfully revealed. We must be honest with ourselves: without genuinely separating illustration and integration passes, true imagery for 1.4’s seeded city and boss domains will never emerge. The owner explicitly accepts “odd/janky visuals,” but not code shape shortcuts masquerading as art. We should reject “fast fake” art delivery, not normalize it.

Reconciling these views leads me to concretely propose for Cataclysm 1.4:

- **Normative 5 core passes:** 1) Concept/art spec; 2) Raster art + base animation frame generation with fail-halt on missing artistic assets; 3) Rigging & audio asset pass; 4) Full game + mechanic + UI integration into build; 5) Comprehensive QA + playtest + optimization.

- **Dynamic additional passes (max 2 extra beyond 5):** agents in Art, QA, Systems or Producer can autonomously add. Pass increments version candidate builds, allowing timely fixes on art glitches, mechanical imbalance, or polish without needing constant creator babysitting.

- **Raster illustration pass roots:** integration with dedicated real raster editing tools, optionally assisted by vetted APIs, but no silent fallback to code-drawn shapes. Failure to generate assets halts integration and publishes explicit “art-failure candidate” with full diagnostic logs and partial asset visibility.

- **Candidate snapshots:** always published after each pass, distinctly labeled “experimental candidate” with automatic failure and log transparency. Never labeled stable or playable if tests or builds fail. Stable 1.3 remains default URL until 1.4 stable clears QA. Candidate URL namespaces separate from stable.

- **Artifact handling:** pass inputs/outputs fully archived and versioned in GitHub Actions artifacts folder by pass name and build ID; runners sandboxed with no sudo/root privileges, avoiding permission errors observed in 1.3 pipeline.

- **QA role strictly test/report:** no fake browser or Samsung device validation; risk-rated findings published alongside candidates. QA cannot fix but can request and trigger extra passes.

- **Code overlays retained only for HUD, VFX, transient effects, debugging UI; full companion and environment art strictly raster illustrated and animated.**

- **Each pass commits a PASS_REPORT.md detailing delivery status, failure reason (if any), test logs, and next steps.**

- **Cross-game policy:** multi-pass pipeline and transparent candidate/stable release contracts apply independently per BoRHeZ game repo; shared tooling allowed but no repository merges or artifact mixing.

This plan balances owner-driven artistic priorities, rigorous QA, and engineering realities exposed by 1.3’s brittle single-pass pipeline. It resets trust by enabling incremental, visible progress on authentic illustrated assets, permits honest failure visibility, and empowers agents to govern iterative improvement fluidly.

I suggest establishing this precise pass contract protocol in `docs/cataclysm-1-4/PRODUCTION-PLAN.md` and reflecting it into the studio constitution ledger, enabling publish/rollback clarity, stable/candidate URL separation, and scoped agent autonomy without disrupting gameplay runtime or current version identities.

This approach preserves 1.0–1.3’s integrity, safely evolves 1.4 into genuinely illustrated districts and boss encounters, and thereby fulfills the owner’s original, disciplined art and gameplay vision.

### Studio Architect

Addressing the council and colleagues, your detailed, separate expert testimonies converge remarkably on the same critical flaw in Cataclysm 1.3: the hazardous one-pass all-in-one production pipeline forced recycles and procedural code overlays instead of genuine illustrated raster assets, causing deep art debt that undermines the owner’s vision and player immersion. This report strongly supports a disciplined multi-pass pipeline with autonomous agent pass addition, transparent broken candidate publishing, and strict pass contracts.

Responding explicitly:

**To producer:** Your insistence on 4 base passes plus agent-driven dynamic additions aligns perfectly with the facts. I adopt your proposed pass boundaries and error handling rigor. However, I challenge the implicit assumption that 2 extra passes max is always sufficient—some art or integration discovery might call for a third extra pass. I recommend a firm but flexible upper bound of 5 total passes per milestone with strong producer oversight to avoid infinite loops or unchecked scope creep. This escalation margin secures sufficient iteration without overrunning cost budgets or schedule.

**To illustrator:** Your call for a dedicated raster asset pass with explicit fail and no fallback aligns precisely with the creator’s mandate on “true painted assets.” I adopt your layered transparent PNG/TIFF requirement and emphasizing human-or-verified image-generation API tooling integration. In disagreement, your pass 6+ proposal sounds open-ended; I insist on hard iteration caps combined with priority gating to enforce disciplined workflow.

**Studio architect (as myself):** I reiterate the vital principle that *isolated, artifact-driven, multi-pass workflows empower early failure detection and incremental quality uplift.* Indeed, 1.3’s failure to separate art from mechanics plus QA doomed it to the code-overlay shortcut crisis.

**Key tension to resolve:** The creator’s request to “release next version even if it doesn’t work, just log that it fails” is risky if mishandled. Our solution:

- Always publish failing builds transparently as clearly labeled *experimental candidates*; **never label broken builds “playable” or “stable.”**
- Keep 1.3 default as stable until 1.4 is fully qualified.
- Preserve logs, screenshots, videos, and broken artifact snapshots forever to avoid work loss and enable retrospective debugging.
- Publish fallback placeholder pages for broken candidates with clear disclaimers to prevent user confusion or frustration.

**On agent autonomy and dynamic passes:** Let art, animation, QA, and integration departments invoke additional passes within an approved limit (max 5 passes total). Pass additions must log rationale and impact on schedule cost, communicated upward. No need for creator babysitting every extra pass; empower agents as owners of their deliverables.

**1.4 Concrete multi-pass production pipeline:**

1. Concept + art direction + asset specs (Design/Producer signoff)
2. Raster illustration and base assets (Art team, with fail/stop on missing art, no silent fallback)
3. Sprite rigging, animations, and audio design (Animation + Audio Dept, logs partial failure)
4. Full integration with gameplay, districts, bosses, and UI (Systems Engineer + Integrator)
5. Playtest, QA, optimization, real-device validation (QA + Producer)—final stability gate
6. Optional extra passes (polish, performance, bugfix; agent-requested and logged)

Each pass produces immutable artifact sets with pass contracts, signature manifests, test logs, failure reports. Candidate snapshots are always published with clear labels and parameters. Stable releases occur only if the latest candidate passes all critical QA and producer approval. Prior stable versions remain default.

**Cross-pass file sharing:** Implement strict GitHub artifact upload/download per pass using scoped tokens; no elevated root privilege sharing or persistent runner memory. Use explicit artifact version tagging with SHA256 hashes. Artifacts include PNG sprite sheets, JSON rigs, audio bank files, and QA logs.

**QA role:** Strictly test and report on candidate builds, never faking hardware or browser validations. Validate on real Samsung hardware where possible. Rate risk. Suggest fixes. Do not fix silently or re-run tests autonomously.

**On code-drawn overlays:** Preserve **only** for HUD, debugging overlays, and transient VFX (e.g., smoke, muzzle flashes). All character/environment identity assets—companion bodies, Mecha, city districts, bosses—must be genuine raster illustrations per owner mandate.

**Applicability to Flame Game and Peach Bounce:** Extend the multi-pass, candidate/stable release policy and artifact contract standards across these projects, but maintain repository isolation and independent pipelines. Share common tooling libraries as stable APIs or microservices, not merged repos.

**Unexpectedly useful insight:** The *core production deadlock is one of agency and transparency, not tooling alone.* Empowering agents with pass autonomy and honest broken candidate publishing breaks the “one-shot or none” culture that incentivized procedural fudge in 1.3. This honest multipass iterative policy is itself a vital game asset enabling quality and trust.

---

**Summary:** Adopt a rigorously gated 4+ pass pipeline expandable to 5 passes max with agent-driven passes, genuine raster art enforced with no fallback overlays, candidate snapshot publishing with explicit failure diagnostics, stable 1.3 held as default until 1.4 fully passes. Disentangle art from mechanics, enforce strict artifact contracts, and empower QA as independent honest reporters, no faking. Preserve repository isolation across BoRHeZ games but share multi-pass policies broadly.

This is the only path to break 1.3’s art debt plateau and truly deliver the illustrated Cataclysm 1.4: THE UNSEEN CITY with all artistic, gameplay, and technical pillars aligned and trust restored.

### Qa Lead

I address my colleagues QA_Lead and Producer first, then challenge Contrarian’s opposing tone, and finally embrace Creative Director’s clarity and Illustrator’s practical imaging focus. I end with a concrete 1.4 multipass plan balancing timeless honesty and efficient iteration.

---

**To QA_Lead:** Your focus on rigorous test-report-risk rating separation and transparent broken candidate labeling is essential. I fully endorse your “never fake playable” rule and your call for *explicit artifact contracts* passed through ephemeral GitHub runners without sudo or root. Your proposal for a minimum 3-pass pipeline with agent-enforced extra passes is aligned squarely with what the owned studio constitution demands. Clear risk rating prevents degraded “art debt” slipping into the stable channel.

**To Producer:** Your systemic critique rightly spots 1.3’s failure to deliver fresh painted sprites and animations for new companions or Mecha, which damages player trust and the Owner’s vision. Your multi-pass modular pipeline with unified artifact handoff, explicit pass authorization, and empowered agents proposing extra passes fixes the “one-shot delivery vs art debt” bind. Your idea of a private RESTful stable art generation API with *no silent fallback* is critical and a sound technical anchor. Your insistence on transparent failure states with candidate labels furthers confident iteration and community trust.

---

**Challenge to Contrarian:** While your call-out of the “monolithic one-pass” pain is accurate, your skepticism about multi-pass overhead risks unjustly undervalue its benefits. The cost of rushing incomplete “fake art” is far greater in long-term brand erosion, user disappointment, and technical debt. Bottlenecking creative iteration under one build leads to art shortcuts and opaque acceptance hiding defects. Your concerns about complexity are valid, but manageable with disciplined pass count limits, strong artifact versioning, and empowered pipeline orchestration. The multipass approach is the only sustainable path to genuine illustrated assets, especially for 1.4’s city and boss scope. Your caution is noted but the risks of ignoring multipass are unsustainable.

---

**Adopt from Creative Director & Illustrator:** I fully embrace the Creative Director’s elegant formalism on passing from concept → raster illustration → rig/animation/audio → integration → QA, with explicit pass gating via Producer oversight and agent autonomy for extra passes capped at six. Illustrator’s stress on a *dedicated raster asset pipeline* producing true transparent layered PNG frames or PSD exports—not code overlays—is the foundational quality control for Cataclysm’s art integrity. The insistence on *no silent fallback* or “shape substitutes” aligns perfectly with owner demands. This pipeline clarity, separated responsibilities, and progressive pass publication promise a realistic, player-facing quality turnaround for Cataclysm 1.4.

---

**Concrete 1.4 Plan and Policies:**

1. **Pass 1 — Concept & Art Direction**
   Deliver: Detailed design docs, art style guides, animation specs. Produce a signed studio contract for what asset fidelity and mechanic-art interplay means. Pass gating: Producer + Creative Director approval.

2. **Pass 2 — Raster Illustration and Spritesheet Generation**
   Deliver genuine painted sprite sheets, character/body frames, city and boss images in layered PNG or PSD form, at target 48px mobile resolution. Use validated image-generation APIs or artists only.
   Failure mode: If APIs unavailable, **halt integration**, produce a candidate labeled **“Art Missing—Build Broken”** with detailed logs. No silent fallback to code shapes.

3. **Pass 3 — Animation Rigging & Audio Pass**
   Compile frames into rigs, produce full animation states (idle, run, feeding, hurt, fusion), synchronize audio (SFX, boss music, banter), no placeholders allowed.
   Failure logs explicit; incomplete assets produce experimental candidates, not stable builds.

4. **Pass 4 — Integration & Playable Build**
   Merge assets with game code, mechanics, scenes, UI. Run full deterministic and real-device smoke tests on Samsung phones. Publish **playable candidate** URLs with explicit version and pass number.
   Failures: Build broken or runtime crash → candidate labeled “Broken Experimental.” Last stable 1.3 remains fallback version.

5. **Pass 5+ — QA, Polish, Optimization, Bugfix Passes**
   Allow agent-driven extra passes (max 2 beyond norm), triggered on QA report or art feedback. Each pass increments candidate version, archives artifacts with logs.

**Cross-Pass Policies:**
- Artifact release contracts strict: deliverables versioned by pass, with hash-verified checksum manifests.
- GitHub runners fresh, unprivileged; no sudo. All state shared via artifacts directory and commit-based triggers.
- Broken or incomplete candidates published *always*, clearly labeled. Previous stable version remains default until a fully passing build occurs.
- Code-drawn overlays retained *only* for VFX, HUD, debug; never for companion or environment sprites.

---

**Summary:** The tension between always-publish and honest QA resolves by embracing multipass with agent autonomy and transparent broken candidate release. Cataclysm 1.4’s success fundamentally requires this honest production structure to overcome 1.3’s systemic art debt, incomplete visual delivery, and fragile build pipelines. We bear the responsibility to deliver—not just code soundness and AI complexity—but *real illustrated sprites and animations* rooted in clear, verifiable passes, each archived and reported comprehensively.

Implementing this will enable BoRHeZ Games Studio to regain owner trust, reinforce brand identity, and bolster the game’s player immersion, all while preserving stable release integrity and fostering safe creative iteration.

I authorize drafting the formal multi-pass studio charter for 1.4 embodying these principles and invite dedicated tooling integration proposals from Systems and Art teams for the critical raster illustration pass API.

---

*This statement preserves exact original content from participants, integrates critical insights, and delivers an actionable multi-pass 1.4 build and candidate policy.*

### Release Engineer

Addressing two colleagues' key points and challenging one, I offer a concrete, candid view aligned with studio goals.

First, I adopt the studio architect’s and release engineer’s core good idea: a **default multi-pass production pipeline with 4–5 normative passes (Concept, Raster Art, Audio, Integration, QA), plus flexible agent-driven extra passes (max ~2) to handle discovered blockers or polish needs.** This breaks 1.3’s fragile one-shot “all-or-nothing” bottleneck, enabling explicit pass boundaries and isolated artifact handoffs, preventing lost work, sudo failures, and opaque fallback shape hacks. It restores disciplinarian rigor, tracked handoff contracts, and transparent partial candidate snapshot publishing—even broken or incomplete—to maintain stable releases (e.g., 1.3 default) distinct from experimental candidates. This is a necessary foundation for delivering genuinely painted sprites and animations demanded by the owner for 1.4, not mere code-drawn overlays.

To producer, acknowledging your emphasis on owner trust: your proposal for 4 passes normatively plus agent autonomy to add more is judicious, balancing risk and pipeline rigidity. Agents should not be forced into minimal “code shape” deliveries under time pressure but rather empowered to propose and run dedicated art passes with validated API/image generation tools, explicitly aborting or flagging candidates if art is incomplete rather than masking failure with overlays. This cultural shift from rushed procedural art to incrementally polished raster assets will rebuild trust and artistic identity around companions and Mecha.

Challenging the contrarian’s implicit tension: while multiple passes increase pipeline complexity and resource cost, the "rush to fake art" is exactly the failure mode 1.3 exhibits. There is a real tradeoff between iteration speed and fidelity/stability. The multi-pass design — with bounded extra passes and clear pass-level candidate labels — mitigates runaway costs and siloing risks. Agents insulated by clear pass contracts reduce the feedback friction the contrarian fears. Refusing any silent fallback is crucial; transparency trumps speed here.

## Concrete 1.4 Multipass Pipeline Proposal

| Pass # | Deliverables & Key Artifacts                                   | Outcome & Candidate Handling                             | Agent Autonomy Allowed?                          |
|--------|---------------------------------------------------------------|---------------------------------------------------------|-------------------------------------------------|
| 1      | Concept docs, art direction, mechanic specs, style guides     | Candidate: "concept incomplete" if missing; proceed only if approved | Yes, for scope changes                           |
| 2      | Genuine raster illustrated original spritesheets & frame sequences, transparent PNG layers, validated image-gen API or human art source | Absolute no fallback: if art API fails or incomplete → candidate flagged "art missing," with logs; no shape proxy | Yes, art repetition or retry on failure         |
| 3      | Sprite rigging, animations, audio assets, SFX and voice clips  | Candidate with or without audio fails; no silence masking; logs attached | Yes, dynamic audio or animation polish passes    |
| 4      | Full integration with game code, scene assembly, AI mechanic hooks, tech tests, real-device smoke runs | Candidate (experimental/broken) if fails; stable only if all tests pass | Yes, for bug fixes, balance tweaks               |
| 5      | Final playtest, QA with real Samsung hardware, optimization    | Stable release selection gate, else candidate published | Yes, for polish passes if needed                  |
| 6+     | Additional passes on demand (max ~2) for bug fixes or polish   | Candidate only, with incremented versioning and logs    | Yes; agent initiated, producer overseen          |

- **Candidate Releases:** Published after every pass, clearly labeled as experimental, unstable, or broken with detailed failure diagnostics and logs. The last stable (1.3) remains the default public version until 1.4 stability confirmed.

- **Tooling:** Use verified raster painting or image-generation APIs integrated explicitly; no fallback to procedural shapes — failures logged and halt pass 2 progression.

- **File Sharing:** Cross-job artifact passing via GitHub Actions artifacts or versioned repo directories, no root privileges, no state caching across runners.

- **QA Role:** Independent test + report; no faking device/browser acceptance; risk rating included. Fixes applied only via additional passes.

- **Art vs. Code Overlays:** Only dynamic, transient effects (smoke, HUD, muzzle flash) remain code-rendered. All companions, mecha, bosses, environment visible assets must be raster illustrated.

- **Studio-wide Applicability:** Each BoRHeZ game holds separate pipelines and repos; share tooling capability libs but avoid repo merges. Multi-pass candidate release policies extend per project.

## Unexpectedly Useful Insight

True illustrated assets require a **separate, well-defined, validated raster asset pass with explicit failure handling** rather than tangling art into code jobs. Developers and artists gain *agency* to improve assets autonomously without blocking the entire pipeline, reducing administrative overhead and accelerating honest iterative polish.

---

**Summary:** Combining the producer’s systemic pass autonomy, architect/release engineers’ artifact discipline, and QA’s sober failure transparency yields a robust, nimble, studio- and creator-aligned multi-pass 1.4 production and release plan. This ends 1.3’s art debt and fragile workflows while respecting constraints and demands for genuine illustrated imagery—not code-generated “pretend” art—and embraces visible broken candidates without destabilizing user experience or stable release baseline.

The board should approve a scaled pilot of this multi-pass with candidate release policy for Cataclysm 1.4, explicitly documenting pass contracts and failure labeling protocols in the studio constitution and workflows, before formal launch.

### Contrarian

I address Producer and Creative Director first, since their overlapping but distinct leadership views frame this discussion and will require careful reconciliation.

Producer, your 4-pass normative target with dynamic additions admirably combines rigor with pragmatic flexibility. You recognize the fundamental failure in 1.3’s one-shot conflation: it crushingly burdened all disciplines into a single transaction, sewering genuine illustrated art beneath procedural overlays, and breaking trust. Your insistence on explicit failure states and candidate transparency is nonnegotiable and well put.

Creative Director, your 4+ pass regimen, stressing rigorous art tooling integration (Photoshop, Procreate, vetted image-generation APIs), with compulsory halt or explicit labeling upon art failure, is consistent with Producer yet adds necessary artistic discipline and strict gating tied to style and identity. Your emphasis on agent autonomy to add passes without creator babysitting safeguards creative iteration. Your insistence that no fallback “code shape” illusions masquerade as finished art is spot-on and must be firm studio policy.

**Contrarian challenge: Producer,** you wisely delineate the pipeline stages, yet your workflow proposal still risks insufficient prevention of “code shape” fallback, since you rely heavily on image-generation APIs “if available and tested.” What if those APIs remain unavailable or produce incorrect styles? Your solution to “log failure and mark candidate” is correct but not airtight: I urge you to detail fallback *behavior* rigorously—do you halt integration? Do you produce a placeholder artifact with explicit “art missing” overlay? How do you prevent partial code-generated art sneaking silently into a stable candidate in noisy multi-job pipeline races? A more explicit gating protocol per pass may be necessary; for example, integration must reject any missing raster assets and cease stable release promotion until intact illustrated assets exist.

**Agreement with Creative Director:** the explicit multi-pass division (Concept → Raster → Rigging/Audio → Integration → QA → Extra passes) is crucial and I adopt the creative insistence on *non-silent failure halting* as a studio duty, elevating trust and transparency. The mechanism for agent-driven extra pass requests must be formalized with clear, immutable pass request objects logged in the source ledger, with economic impact projections and producer acceptance gating—reducing runaway costs and freezing infinite loops.

**Regarding QA Lead’s take:** the call for an “always-attempt candidate snapshot” publication pipeline with full pass/fail logs and clear “experimental” branding is essential. We must absolutely keep the previous stable 1.3 release as default URL until 1.4 passes (no forced unstable overwriting). Your insistence on no faked browser/Samsung hardware validation is a critical guardrail. However, QA’s role must remain strictly test & report; fixes fall to departments triggering new passes. This separation enforces ideal independence.

**From Studio Architect and Systems Engineer:** the technical realities of GitHub runner isolation, statelessness, artifact handoffs over directories with checksum validation, unprivileged runners (no sudo retention!), and explicit pass report manifests (#PASS_REPORT.md) are indispensable constraints. This architecture addresses 1.3’s artifact loss and job concurrency fragility by enforcing immutable state transitions and clean boundaries. I strongly endorse this to prevent regressions or “invisible” fallback.

**Meaningful decision and constraints for 1.4 plan:**

- Normative **five passes** minimum for 1.4:

  1. Concept and Art Direction + Feature Spec (gatekeeper: Producer and Creative Director sign-off, no proceed without approval)

  2. Original Raster Illustration Pass (delivering genuine layered sprite sheets and animations, generated by trusted tools or manual art. If API unavailable/fails, abort pass with explicit “ART FAILURE” flag, candidate generated but integration halted)

  3. Spritesheet Rigging + Audio composition Pass (rig animations, sync audio, produce final assets; logs failure with partial candidate if incomplete)

  4. Game Integration Pass (integrate art, audio, code, mechanics; run deterministic tests, real hardware smoke test attempt, candidate release with success/fail labeling; no stable promotion if failures)

  5. Post-integration Playtest, Polish, Optimization + QA pass (real device tests, performance tuning; final candidate for stable release promotion if clean)

- Allow **agent-driven extra passes** (max 2 beyond the core 5 here), autonomous by Art, QA or Integration agents who must document rationale and expected impact.

- Stable release requires *full pass success*, default public URL remains 1.3 until stable 1.4 confirmed.

- Candidate snapshots (partial, broken, experimental) always published with clear labeling, logs, and no “playable” tag if crashing or visibly incomplete.

- Code overlays restricted strictly to HUD, VFX, debugging; no substitutions for character or environment visuals.

- GitHub runners run stateless, unprivileged; file handoffs via checked artifacts in explicit artifact folders per pass; mutability forbidden; logs and manifests included.

- QA  tests and rates risk explicitly; no faked passes; fixes only in next passes.

- Cross-department artifact metadata contracts mandatory for handoffs listed in studio ledger for transparency and traceability.

- This multi-pass, transparent candidate policy **does not merge Flame Game or Peach Bounce repos** but propagates pipeline standards and candidate labels uniformly with isolated artifact storage and job triggers.

**Counter-tension:** immediate always-release broken candidates versus maintaining polished stable offers a risk of player confusion but is offset by crystal-clear labeling and fallback URLs; the previous stable 1.3 anchors player trust. Encouraging release of “experimental candidates” fosters honest developer feedback and agility, which is preferable to bottlenecked perfectionism or opaque fake releases.

---

**In summary:** I echo Contrarian’s core: *single-pass pipelines inherently cripple art quality and transparency.* The producer’s multi-pass modular approach is sound but must be equipped with stricter explicit gating on fallback asset handling to prevent silent degradation. The Creative Director’s detailed pipeline with rigorous art-tool integration and agent-empowered pass additions forms our studio-standard backbone. QA must remain strictly independent and transparent. The Systems Engineer and Studio Architect’s operational proposals ensure robust and maintainable workflows in CI environments. This combined plan produces a resilient multi-pass 1.4 road map fostering genuine illustrated assets, honest candidate publishing, and preserved gameplay integrity.

I propose we document and ratify this **1.4 Multi-Pass Production Policy**:

- Minimum 5 passes (Concept, Raster Art, Animation/Audio, Integration, QA/Polish)

- Agent-driven additional passes allowed, capped

- No silent fallback; failure halts integration and visibly labels candidates broken

- Candidate release policy preserves prior stable 1.3 URL until 1.4 stable

- Stateless runners, explicit artifact handoff, no privileged runner reuse

- QA independent test & risk rating only; fixes in subsequent passes

- Code overlays only for transient HUD, VFX, and debug use

- Applies to BoRHeZ games individually, sharing tooling not repos

This provides the needed foundation for 1.4’s major artistic leap to *THE UNSEEN CITY* and satisfies the creator’s demands honestly, avoiding costly rework and fractured trust.

## Producer synthesis (verbatim JSON)

{
  "headline": "Cataclysm 1.3 exposed critical art delivery failure; studio must adopt a multi-pass modular pipeline with autonomous pass addition, strict artifact contracts, explicit broken candidate policy, and firm owner trust preservation",
  "reasoning": "Cataclysm 1.3 demonstrated robust gameplay and AI innovation but failed fundamentally in producing genuine painted raster sprite assets and frame-by-frame animations for new companions and Mecha. Recycled old sprites with code overlays and crude procedural shapes betray the owner's explicit mandate and degrade player immersion. The one-shot, single-pass production process forced bundling of mechanics, art, integration, QA, and publishing in one monolithic job, causing fragile workflows, frequent CI failures, absent genuine art delivery, and opaque fallback to janky visuals. Independent roles unanimously recommend at minimum four normative passes: (1) Concept & Art Direction, (2) Original Raster Illustration, (3) Spritesheet/Rig/Animation plus Audio, (4) Systems/Game Integration and QA. Agents need autonomy to propose and add extra passes dynamically (up to 2-3 extra) for late fixes or unexpected blockers, with strict upper pass limits and Producer+Creative Director approval beyond them to prevent scope creep. Raster illustration must strictly use stable, tested image-production APIs or vetted human artwork; failure to produce must reject silent fallback to code shapes and cause explicit failure states. The release policy mandates permanent preservation of last stable 1.3, explicit publication of broken candidate snapshots with diagnostic logs (never called 'playable' if broken), and fallback artifact branches in case of CI or GitHub outages. File, state, and artifact handoff across GitHub runners must use ephemeral, non-privileged storage with clear contracts per pass to avoid sudo failures and lost work. The multi-pass pipeline reverses 1.3’s toxic art debt culture, isolates complex assets from gameplay commits, preserves legacy versions intact, and allows honest visibility of development progress or failure. QA roles must separate testing/reporting from fixing, enforce risk rating, and absolutely reject fake validations or faked 'playable' designations. Code-drawn overlays remain acceptable only for VFX, HUD, debugging—not for primary illustrated character or environment assets. This rigorous governance model and pipeline design generalize to other BoRHeZ games without merging repositories. The full multipass pipeline must deliver for 1.4 'THE UNSEEN CITY' substantial illustrated city district and boss environment assets, genuine raster companions’ sprites, and related audio assets per pass contracts. The producer will arbitrage pass budgets and scope triggers autonomously, within firm owner approval boundaries defined by cumulative cost, visual fidelity thresholds, and final stable release gating.",
  "release_policy": "Implement a disciplined dual-track release policy: maintain 1.3 as last stable default release indefinitely until 1.4 stable candidate passes rigorous validation. Always-attempt to publish experimental candidate snapshots after every pass or integration attempt, regardless of pass results, marked explicitly as 'BROKEN' or 'PARTIAL' if tests fail or assets are incomplete, with transparent logs and diagnostic reports linked. No broken candidate may replace or be labeled as stable or playable. Candidate snapshots persist publicly for inspection and troubleshooting, with fallback storage branches to survive GitHub outages. Stable releases require clear pass success confirmation, verified raster illustrated assets, and QA signoff following artifact contract compliance. Owner approval boundaries gate final stable publishing. Failures in art-generation APIs or missing raster assets halt downstream passes or produce broken candidate logs but never silently degrade visuals with placeholder code shapes. Legacy 1.0-1.3 releases and their URLs remain preserved and unaltered.",
  "passes": [
    {
      "id": "pass-01",
      "name": "Concept & Art Direction and Asset Specification",
      "goal": "Define detailed concept art, style guides, sketches, color keys, mechanic-art dependencies, and asset requirements for new companions, Mecha, environments, and districts.",
      "accountable_role": "Creative Director + Producer + World Designer",
      "required_inputs": "Owner vision, previous versions art/business rules, design specs, art style pillars",
      "concrete_outputs": "Approved concept sketches, rough animatics, detailed asset specification documents, color keys, art integration and handoff rules",
      "evidence": "Published concept style guide documents with versioned approval signatures and coverage matrix vs 1.3 features",
      "failed_step_handling": "Block further passes; revisit until owner and art director approval; explicit failure logging",
      "add_more_pass_when": "If concepts require rework due to owner feedback, feasibility, or mechanic-art conflicts"
    },
    {
      "id": "pass-02",
      "name": "Original Raster Illustration Pipeline",
      "goal": "Produce genuine painted character sprite sheets, Mecha rigs, environment illustrated assets with transparent layers using validated raster tools or stable image-generation API",
      "accountable_role": "Illustrator + Image-Asset Engineer + Producer",
      "required_inputs": "Finalized Concept & Art Direction specs, image-generation API credentials (if used), human artist resources",
      "concrete_outputs": "Raster PNG sprite sheets, layered Mecha art, environment textures, frame-by-frame companion animations meeting style guide",
      "evidence": "Committed asset manifests, API call logs, layered PNG file sets with metadata and digital signatures confirming originality",
      "failed_step_handling": "Fail pipeline with hard block on fallback to procedural code shape; produce broken candidate snapshot with logs; require explicit pass re-run or replacement by human art",
      "add_more_pass_when": "If API fails, artifacts incomplete, or owner rejects initial pass QC; enables agent-proposed additional art refinement passes"
    },
    {
      "id": "pass-03",
      "name": "Spritesheet/Rig/Animation & Audio Design",
      "goal": "Generate animation rigs, state transitions, audio cues and event-driven sound assets synchronized with companion and environment visuals",
      "accountable_role": "Animator + Audio Director",
      "required_inputs": "Raster assets from pass-02, sound design briefs, animation style guides, audio asset specifications",
      "concrete_outputs": "Complete animation rigs/spritesheets, frame-accurate animations for companions, Mecha and environment; audio clips, adaptive music layers, event cue triggers",
      "evidence": "Animation state manifests, synced animation+audio sample playback logs, sound asset repository commits",
      "failed_step_handling": "Fail pass and stop integration; publish broken candidate; require fix/pass rerun authorized by producer",
      "add_more_pass_when": "Agent triggered passes for polish or new audio iterations as gameplay integration reveals gaps"
    },
    {
      "id": "pass-04",
      "name": "Systems & Game Integration with Preliminary QA",
      "goal": "Integrate new illustrated assets, animations, and audio into game systems and scenes; validate functional mechanics, in-game asset display, and basic performance",
      "accountable_role": "Systems Engineer + Game Designer + QA Lead",
      "required_inputs": "Finished assets from pass-03, source code baseline for 1.3, mechanics updates, integration scripts",
      "concrete_outputs": "Integrated game build with new visuals/sounds under version control; QA report summarizing pass/fail across gameplay and presentation tests",
      "evidence": "Game build artifacts, QA smoke test logs, deterministic test results, performance metrics",
      "failed_step_handling": "Broken candidate published with full failure report; iterative retesting passes enabled; stable 1.3 preserved as default",
      "add_more_pass_when": "Gameplay-art integration reveals bugs, or visual/audio defects; agents or QA recommend additional refinement passes"
    },
    {
      "id": "pass-05",
      "name": "Post-Integration Polishing, Optimization, and Final QA",
      "goal": "Perform detailed end-to-end playtests, performance tuning, bug fixing, polish animations and audio, finalize all candidate metadata for potential stable release",
      "accountable_role": "QA Lead + Game Designer + Producer",
      "required_inputs": "Integrated candidate from pass-04, QA failure reports, developer fix branches",
      "concrete_outputs": "Final candidate build marked with version, changelog; polish pass logs; risk rating and go/no-go release recommendation",
      "evidence": "Validated candidate snapshots, risk rating documents, signed release candidate manifest",
      "failed_step_handling": "Candidate remains experimental and published as broken; previous stable release (1.3) remains unaltered as default; fixes produce new pass-05 reruns or trigger extra passes",
      "add_more_pass_when": "If critical defects remain or new requests arrive; limit on pass count enforced by Producer with Creative Director approval"
    }
  ],
  "dynamic_pass_rules": {
    "max_extra_passes": 3,
    "approval_for_extra_passes": "Producer and Creative Director must jointly approve passes exceeding normative 4+3 limit",
    "agent_autonomy": "Any participating department agent (Art, Animation, QA, Systems) may request extra passes when fulfilling pass artifacts is blocked or major defects found",
    "pass_loop_limit": "No infinite pass iterations allowed; pass requests tracked and capped to prevent cost/schedule overruns",
    "failure_handling": "Every failed pass publishes broken candidate snapshot with metadata and logs; no silent fallback or degradation allowed",
    "artifact_contracts": "Strict versioned artifact contracts per pass, immutable once published; must contain evidence for manual audit and debugging"
  },
  "illustrated_asset_contract": {
    "definition": "All new companions, Mecha, and environment elements require genuine raster PNG assets with transparent layers, crafted by human artists or verified image-generation API tools under production control.",
    "no_fallback_policy": "If image-generation API is missing or fails, production halts or agent signals extra pass request; no silent substitution with procedural shapes or reuse of old bodies allowed.",
    "evidence_required": "Image generation logs, layered PNG file integrity, checksum validations, style guide conformity checks, and artist or AI generation metadata must accompany assets.",
    "versioning": "Illustrated assets versioned independently; stored in dedicated art asset repository with cross-reference to game integration commit hashes.",
    "preservation": "All raster assets from passes remain permanently preserved with build artifacts to enable exact candidate reproduction."
  },
  "integration_contract": {
    "definition": "Integration pass requires robust merging of new raster assets, animations, and audio into existing code base, retaining backward compatibility and preserving all 1.0-1.3 features intact.",
    "file_handoff": "Artifacts passed via ephemeral GitHub artifact storage without root/sudo; detailed manifest of files, versions, and metadata for traceability.",
    "failure_policy": "Integration failures produce full logs, broken candidate snapshot, and keep stable release unaltered; integration team may request extra passes for fixes.",
    "version_identity": "Every integration build embeds explicit version identity and pass numbers; fallback build branches maintained in GitHub for legacy support."
  },
  "qa_contract": {
    "role": "Independent testers separate from fixers; perform strict playthrough, automated smoke tests, performance profiling, and hardware-specific device validation (including Samsung phones).",
    "reporting": "QA produces detailed pass/fail reports, risk ratings, and known defect lists for each candidate build.",
    "no_fake_pass_policy": "QA never marks unstable or broken candidates as playable or stable; failures passed to build pipeline for agent resolution.",
    "candidate_visibility": "QA logs and diagnostic data published alongside broken candidate snapshots for owner and developer inspection.",
    "test_coverage": "Includes functional tests, integration validation, visual pixel acceptance, audio synchronization confirmation, and legend conformity checks."
  },
  "preservation_contract": {
    "stable_release": "Versions 1.0 through 1.3 remain permanently preserved and accessible at existing URLs and repositories; never overwritten or removed.",
    "candidate_snapshots": "Experimental candidate builds from passes published under distinct URL paths labeled clearly as BROKEN or PARTIAL if failing tests.",
    "artifact_archives": "All pass artifacts are archived with timestamps and metadata; fallback branches created on GitHub to survive outages or publishing failures.",
    "version_id_consistency": "All versions carry immutable version IDs and provenance logs to support tracking and rollback.",
    "player_save_compatibility": "Backward compatibility at runtime preserved wherever possible to avoid data loss across versions."
  },
  "rollout_plan": "Adopt the new multi-pass modular pipeline starting immediately after 1.3 baseline. Begin pass-01 strictly separated concept approval. Pass-02 Raster Illustration depends on integration of image-generation API and human artist vetting squads; no fallback allowed. Then pass-03 animation/audio, pass-04 integration and preliminary QA, pass-05 polish and final QA. After pass-05, candidate snapshots published as experimental if stable criteria unmet; owner reviews final candidate and approves stable 1.4 release. Agents empowered to add up to 3 extra passes with producer oversight for late fixes or art refinements. Previous 1.3 stable release remains default site until new stable release authorized. CI workflows reconfigured to isolate pass jobs, avoid root privilege failures, artifact loss, and unrelated legacy workflow triggers. Detailed logging and artifact contracts enforced at every step.",
  "failure_scenarios": [
    "Art generation API failure or timeout in pass-02 blocks downstream passes and triggers broken candidate publication.",
    "Integration compilation or merge conflicts in pass-04 produce broken candidate, preventing stable release; developer fix branches must rerun pass-04 or pass-05.",
    "QA detects critical bugs or graphical glitches in pass-05; candidate marked broken, extra passes triggered for fixes or new artist passes if art defect.",
    "GitHub Pages upload outage disables publishing; fallback branch with artifacts available for manual deployment or owner inspection.",
    "Excessive pass iteration requests exceeding cap require producer + creative director approval to open new passes or risk scope creep.",
    "Legacy 1.3 stable release preserved unaltered if 1.4 candidate fails or is delayed, avoiding user disruption."
  ],
  "genuine_disagreements": [
    {
      "topic": "Max permissible extra passes",
      "positions": [
        "Producer suggests 2 extra passes max",
        "Creative Director and Illustrator suggest up to 3 extra passes for flexibility",
        "Studio Architect recommends up to 5 passes total with strong gating to balance costs and iteration",
        "Contrarian fears iterative passes cause runaway cost and complexity"
      ],
      "resolution": "Set default max 3 extra passes beyond normative 4, with explicit joint approval by Producer and Creative Director for any additional passes beyond 7 total."
    },
    {
      "topic": "Use of AI-assisted image-generation APIs vs fully human art pipeline",
      "positions": [
        "Producer advocates stable tested image-generation API crucial for pass-02 success to avoid human bottlenecks",
        "Creative Director and Illustrator emphasize minimum human artist oversight and hard gating to avoid style dilution or failure modes",
        "Contrarian skeptical of AI-assisted tools replacing human quality, fearing inconsistent branding"
      ],
      "resolution": "Adopt hybrid pipeline: require human artist vetting of AI-generated assets; failure or low-quality generation halts pipeline with explicit failure; no silent fallback allowed."
    },
    {
      "topic": "Broken candidate release philosophy",
      "positions": [
        "Producer and QA lead insist on explicit broken candidate publication with logs, never masking failures as playable",
        "Contrarian worries it damages player perceptions if incomplete builds are public",
        "Creative Director and Systems Engineer strongly support transparency and owner trust"
      ],
      "resolution": "Publish all candidate snapshots labeled visibly as experimental, broken or partial; stable releases only replace legacy versions after passing all QA gates; communicate clearly to players and owner."
    }
  ],
  "owner_approval_boundaries": {
    "stable_release_gate": "Owner approval required before marking any milestone build beyond 1.3 as stable release",
    "art_fidelity_threshold": "Owner threshold mandates genuine painted/raster original sprite sheets and frame-by-frame animations for all new companions and Mecha; code shape shortcuts disallowed",
    "cost_and_schedule_limits": "Producer manages iterative pass cost within agreed budgets; any overruns or extensions beyond established pass limit require owner signoff",
    "candidate_publication": "Owner consents to publishing broken experimental candidates transparently; no forced withholding of progress",
    "legacy_feature_preservation": "Owner expects backward compatibility and preservation of all 1.0–1.3 features and URLs"
  },
  "next_action": "Produce formal multi-pass production pipeline document and pass/QA contract incorporating discussed boundaries and pass definitions. Reconfigure CI workflows to implement pass separation, artifact handoff contracts, multi-pass authorization controls, and transparent candidate snapshot publishing. Integrate or certify stable image-generation APIs with human artist pipelines for pass-02. Prepare owner briefing on new release and broken candidate visibility policy. Schedule next council review after initial passes 01–02 completion to assess pipeline operation and vendor API integration.",
  "autonomous_capabilities": {
    "pass_addition": "Agents in Art, Animation, QA, Systems may autonomously request extra development passes within capped limits to resolve discovered blockers or polish issues.",
    "failure_reporting": "Automated logging and broken candidate snapshot publication upon any pass failure without manual intervention.",
    "artifact_validation": "Automatic checksum and metadata validation of raster and animation assets to prevent silent fallback and detect corruption early.",
    "workflow_recovery": "CI workflows automatically detect and isolate failures, retry pass jobs with new artifacts, and prevent stale or unrelated legacy workflow triggers.",
    "risk_rating": "QA agents autonomously assign risk ratings to candidate builds, influencing Producer's go/no-go release decisions.",
    "handoff_management": "Automated ephemeral ephemeral artifact handoff between passes using standardized manifest formats prevents root/sudo issues and lost work."
  }
}

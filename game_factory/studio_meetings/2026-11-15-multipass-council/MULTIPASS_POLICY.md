# BoRHeZ Games Studio — council-proposed multi-pass development architecture
**From actual 15 November 2026 council.** Creator has authorized discussing and dynamically adding production passes; final technical implementation remains separate. This document does not launch 1.4.
## Council recommendation
Cataclysm 1.3 exposed critical art delivery failure; studio must adopt a multi-pass modular pipeline with autonomous pass addition, strict artifact contracts, explicit broken candidate policy, and firm owner trust preservation

## Reasoning
Cataclysm 1.3 demonstrated robust gameplay and AI innovation but failed fundamentally in producing genuine painted raster sprite assets and frame-by-frame animations for new companions and Mecha. Recycled old sprites with code overlays and crude procedural shapes betray the owner's explicit mandate and degrade player immersion. The one-shot, single-pass production process forced bundling of mechanics, art, integration, QA, and publishing in one monolithic job, causing fragile workflows, frequent CI failures, absent genuine art delivery, and opaque fallback to janky visuals. Independent roles unanimously recommend at minimum four normative passes: (1) Concept & Art Direction, (2) Original Raster Illustration, (3) Spritesheet/Rig/Animation plus Audio, (4) Systems/Game Integration and QA. Agents need autonomy to propose and add extra passes dynamically (up to 2-3 extra) for late fixes or unexpected blockers, with strict upper pass limits and Producer+Creative Director approval beyond them to prevent scope creep. Raster illustration must strictly use stable, tested image-production APIs or vetted human artwork; failure to produce must reject silent fallback to code shapes and cause explicit failure states. The release policy mandates permanent preservation of last stable 1.3, explicit publication of broken candidate snapshots with diagnostic logs (never called 'playable' if broken), and fallback artifact branches in case of CI or GitHub outages. File, state, and artifact handoff across GitHub runners must use ephemeral, non-privileged storage with clear contracts per pass to avoid sudo failures and lost work. The multi-pass pipeline reverses 1.3’s toxic art debt culture, isolates complex assets from gameplay commits, preserves legacy versions intact, and allows honest visibility of development progress or failure. QA roles must separate testing/reporting from fixing, enforce risk rating, and absolutely reject fake validations or faked 'playable' designations. Code-drawn overlays remain acceptable only for VFX, HUD, debugging—not for primary illustrated character or environment assets. This rigorous governance model and pipeline design generalize to other BoRHeZ games without merging repositories. The full multipass pipeline must deliver for 1.4 'THE UNSEEN CITY' substantial illustrated city district and boss environment assets, genuine raster companions’ sprites, and related audio assets per pass contracts. The producer will arbitrage pass budgets and scope triggers autonomously, within firm owner approval boundaries defined by cumulative cost, visual fidelity thresholds, and final stable release gating.

## Release policy
Implement a disciplined dual-track release policy: maintain 1.3 as last stable default release indefinitely until 1.4 stable candidate passes rigorous validation. Always-attempt to publish experimental candidate snapshots after every pass or integration attempt, regardless of pass results, marked explicitly as 'BROKEN' or 'PARTIAL' if tests fail or assets are incomplete, with transparent logs and diagnostic reports linked. No broken candidate may replace or be labeled as stable or playable. Candidate snapshots persist publicly for inspection and troubleshooting, with fallback storage branches to survive GitHub outages. Stable releases require clear pass success confirmation, verified raster illustrated assets, and QA signoff following artifact contract compliance. Owner approval boundaries gate final stable publishing. Failures in art-generation APIs or missing raster assets halt downstream passes or produce broken candidate logs but never silently degrade visuals with placeholder code shapes. Legacy 1.0-1.3 releases and their URLs remain preserved and unaltered.

## Evolving pass sequence

### 1. Concept & Art Direction and Asset Specification

**Owner:** Creative Director + Producer + World Designer
**Goal:** Define detailed concept art, style guides, sketches, color keys, mechanic-art dependencies, and asset requirements for new companions, Mecha, environments, and districts.
**Inputs:** Owner vision, previous versions art/business rules, design specs, art style pillars
**Deliverables:** Approved concept sketches, rough animatics, detailed asset specification documents, color keys, art integration and handoff rules
**Evidence:** Published concept style guide documents with versioned approval signatures and coverage matrix vs 1.3 features
**On failure:** Block further passes; revisit until owner and art director approval; explicit failure logging
**When agents add passes:** If concepts require rework due to owner feedback, feasibility, or mechanic-art conflicts

### 2. Original Raster Illustration Pipeline

**Owner:** Illustrator + Image-Asset Engineer + Producer
**Goal:** Produce genuine painted character sprite sheets, Mecha rigs, environment illustrated assets with transparent layers using validated raster tools or stable image-generation API
**Inputs:** Finalized Concept & Art Direction specs, image-generation API credentials (if used), human artist resources
**Deliverables:** Raster PNG sprite sheets, layered Mecha art, environment textures, frame-by-frame companion animations meeting style guide
**Evidence:** Committed asset manifests, API call logs, layered PNG file sets with metadata and digital signatures confirming originality
**On failure:** Fail pipeline with hard block on fallback to procedural code shape; produce broken candidate snapshot with logs; require explicit pass re-run or replacement by human art
**When agents add passes:** If API fails, artifacts incomplete, or owner rejects initial pass QC; enables agent-proposed additional art refinement passes

### 3. Spritesheet/Rig/Animation & Audio Design

**Owner:** Animator + Audio Director
**Goal:** Generate animation rigs, state transitions, audio cues and event-driven sound assets synchronized with companion and environment visuals
**Inputs:** Raster assets from pass-02, sound design briefs, animation style guides, audio asset specifications
**Deliverables:** Complete animation rigs/spritesheets, frame-accurate animations for companions, Mecha and environment; audio clips, adaptive music layers, event cue triggers
**Evidence:** Animation state manifests, synced animation+audio sample playback logs, sound asset repository commits
**On failure:** Fail pass and stop integration; publish broken candidate; require fix/pass rerun authorized by producer
**When agents add passes:** Agent triggered passes for polish or new audio iterations as gameplay integration reveals gaps

### 4. Systems & Game Integration with Preliminary QA

**Owner:** Systems Engineer + Game Designer + QA Lead
**Goal:** Integrate new illustrated assets, animations, and audio into game systems and scenes; validate functional mechanics, in-game asset display, and basic performance
**Inputs:** Finished assets from pass-03, source code baseline for 1.3, mechanics updates, integration scripts
**Deliverables:** Integrated game build with new visuals/sounds under version control; QA report summarizing pass/fail across gameplay and presentation tests
**Evidence:** Game build artifacts, QA smoke test logs, deterministic test results, performance metrics
**On failure:** Broken candidate published with full failure report; iterative retesting passes enabled; stable 1.3 preserved as default
**When agents add passes:** Gameplay-art integration reveals bugs, or visual/audio defects; agents or QA recommend additional refinement passes

### 5. Post-Integration Polishing, Optimization, and Final QA

**Owner:** QA Lead + Game Designer + Producer
**Goal:** Perform detailed end-to-end playtests, performance tuning, bug fixing, polish animations and audio, finalize all candidate metadata for potential stable release
**Inputs:** Integrated candidate from pass-04, QA failure reports, developer fix branches
**Deliverables:** Final candidate build marked with version, changelog; polish pass logs; risk rating and go/no-go release recommendation
**Evidence:** Validated candidate snapshots, risk rating documents, signed release candidate manifest
**On failure:** Candidate remains experimental and published as broken; previous stable release (1.3) remains unaltered as default; fixes produce new pass-05 reruns or trigger extra passes
**When agents add passes:** If critical defects remain or new requests arrive; limit on pass count enforced by Producer with Creative Director approval

## Dynamic Pass Rules
{
  "max_extra_passes": 3,
  "approval_for_extra_passes": "Producer and Creative Director must jointly approve passes exceeding normative 4+3 limit",
  "agent_autonomy": "Any participating department agent (Art, Animation, QA, Systems) may request extra passes when fulfilling pass artifacts is blocked or major defects found",
  "pass_loop_limit": "No infinite pass iterations allowed; pass requests tracked and capped to prevent cost/schedule overruns",
  "failure_handling": "Every failed pass publishes broken candidate snapshot with metadata and logs; no silent fallback or degradation allowed",
  "artifact_contracts": "Strict versioned artifact contracts per pass, immutable once published; must contain evidence for manual audit and debugging"
}

## Illustrated Asset Contract
{
  "definition": "All new companions, Mecha, and environment elements require genuine raster PNG assets with transparent layers, crafted by human artists or verified image-generation API tools under production control.",
  "no_fallback_policy": "If image-generation API is missing or fails, production halts or agent signals extra pass request; no silent substitution with procedural shapes or reuse of old bodies allowed.",
  "evidence_required": "Image generation logs, layered PNG file integrity, checksum validations, style guide conformity checks, and artist or AI generation metadata must accompany assets.",
  "versioning": "Illustrated assets versioned independently; stored in dedicated art asset repository with cross-reference to game integration commit hashes.",
  "preservation": "All raster assets from passes remain permanently preserved with build artifacts to enable exact candidate reproduction."
}

## Integration Contract
{
  "definition": "Integration pass requires robust merging of new raster assets, animations, and audio into existing code base, retaining backward compatibility and preserving all 1.0-1.3 features intact.",
  "file_handoff": "Artifacts passed via ephemeral GitHub artifact storage without root/sudo; detailed manifest of files, versions, and metadata for traceability.",
  "failure_policy": "Integration failures produce full logs, broken candidate snapshot, and keep stable release unaltered; integration team may request extra passes for fixes.",
  "version_identity": "Every integration build embeds explicit version identity and pass numbers; fallback build branches maintained in GitHub for legacy support."
}

## Qa Contract
{
  "role": "Independent testers separate from fixers; perform strict playthrough, automated smoke tests, performance profiling, and hardware-specific device validation (including Samsung phones).",
  "reporting": "QA produces detailed pass/fail reports, risk ratings, and known defect lists for each candidate build.",
  "no_fake_pass_policy": "QA never marks unstable or broken candidates as playable or stable; failures passed to build pipeline for agent resolution.",
  "candidate_visibility": "QA logs and diagnostic data published alongside broken candidate snapshots for owner and developer inspection.",
  "test_coverage": "Includes functional tests, integration validation, visual pixel acceptance, audio synchronization confirmation, and legend conformity checks."
}

## Preservation Contract
{
  "stable_release": "Versions 1.0 through 1.3 remain permanently preserved and accessible at existing URLs and repositories; never overwritten or removed.",
  "candidate_snapshots": "Experimental candidate builds from passes published under distinct URL paths labeled clearly as BROKEN or PARTIAL if failing tests.",
  "artifact_archives": "All pass artifacts are archived with timestamps and metadata; fallback branches created on GitHub to survive outages or publishing failures.",
  "version_id_consistency": "All versions carry immutable version IDs and provenance logs to support tracking and rollback.",
  "player_save_compatibility": "Backward compatibility at runtime preserved wherever possible to avoid data loss across versions."
}

## Rollout Plan
Adopt the new multi-pass modular pipeline starting immediately after 1.3 baseline. Begin pass-01 strictly separated concept approval. Pass-02 Raster Illustration depends on integration of image-generation API and human artist vetting squads; no fallback allowed. Then pass-03 animation/audio, pass-04 integration and preliminary QA, pass-05 polish and final QA. After pass-05, candidate snapshots published as experimental if stable criteria unmet; owner reviews final candidate and approves stable 1.4 release. Agents empowered to add up to 3 extra passes with producer oversight for late fixes or art refinements. Previous 1.3 stable release remains default site until new stable release authorized. CI workflows reconfigured to isolate pass jobs, avoid root privilege failures, artifact loss, and unrelated legacy workflow triggers. Detailed logging and artifact contracts enforced at every step.

## Failure Scenarios
[
  "Art generation API failure or timeout in pass-02 blocks downstream passes and triggers broken candidate publication.",
  "Integration compilation or merge conflicts in pass-04 produce broken candidate, preventing stable release; developer fix branches must rerun pass-04 or pass-05.",
  "QA detects critical bugs or graphical glitches in pass-05; candidate marked broken, extra passes triggered for fixes or new artist passes if art defect.",
  "GitHub Pages upload outage disables publishing; fallback branch with artifacts available for manual deployment or owner inspection.",
  "Excessive pass iteration requests exceeding cap require producer + creative director approval to open new passes or risk scope creep.",
  "Legacy 1.3 stable release preserved unaltered if 1.4 candidate fails or is delayed, avoiding user disruption."
]

## Genuine Disagreements
[
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
]

## Owner Approval Boundaries
{
  "stable_release_gate": "Owner approval required before marking any milestone build beyond 1.3 as stable release",
  "art_fidelity_threshold": "Owner threshold mandates genuine painted/raster original sprite sheets and frame-by-frame animations for all new companions and Mecha; code shape shortcuts disallowed",
  "cost_and_schedule_limits": "Producer manages iterative pass cost within agreed budgets; any overruns or extensions beyond established pass limit require owner signoff",
  "candidate_publication": "Owner consents to publishing broken experimental candidates transparently; no forced withholding of progress",
  "legacy_feature_preservation": "Owner expects backward compatibility and preservation of all 1.0–1.3 features and URLs"
}

## Next Action
Produce formal multi-pass production pipeline document and pass/QA contract incorporating discussed boundaries and pass definitions. Reconfigure CI workflows to implement pass separation, artifact handoff contracts, multi-pass authorization controls, and transparent candidate snapshot publishing. Integrate or certify stable image-generation APIs with human artist pipelines for pass-02. Prepare owner briefing on new release and broken candidate visibility policy. Schedule next council review after initial passes 01–02 completion to assess pipeline operation and vendor API integration.

## Autonomous Capabilities
{
  "pass_addition": "Agents in Art, Animation, QA, Systems may autonomously request extra development passes within capped limits to resolve discovered blockers or polish issues.",
  "failure_reporting": "Automated logging and broken candidate snapshot publication upon any pass failure without manual intervention.",
  "artifact_validation": "Automatic checksum and metadata validation of raster and animation assets to prevent silent fallback and detect corruption early.",
  "workflow_recovery": "CI workflows automatically detect and isolate failures, retry pass jobs with new artifacts, and prevent stale or unrelated legacy workflow triggers.",
  "risk_rating": "QA agents autonomously assign risk ratings to candidate builds, influencing Producer's go/no-go release decisions.",
  "handoff_management": "Automated ephemeral ephemeral artifact handoff between passes using standardized manifest formats prevents root/sudo issues and lost work."
}

## Traceability
Full verbatim discussion: [FULL_TRANSCRIPT.md](FULL_TRANSCRIPT.md).
Structured policy: [MULTIPASS_POLICY.json](MULTIPASS_POLICY.json).
New workflows must EXPLICITLY ingest this policy; writing a policy file alone does not change existing CI.

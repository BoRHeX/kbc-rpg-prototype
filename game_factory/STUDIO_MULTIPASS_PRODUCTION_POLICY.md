# BoRHeZ Games Studio — multi-pass production and candidate preservation policy
**Policy date:** 15 November 2026. **Origin:** Owner's new instruction and the 12-agent production council, [full transcript](studio_meetings/2026-11-15-multipass-council/FULL_TRANSCRIPT.md), [council proposal](studio_meetings/2026-11-15-multipass-council/MULTIPASS_POLICY.md).

This document records the owner's direction and an implementation-ready pass contract. **It does not assert that existing GitHub Actions production workflows now implement these requirements.** The next authorized production workflow must actually load/enforce this document and provide the tools it requires.

## Game/version continuity
The project is ONE Cataclysm game. 1.3 FELINE COMPANY is the last published candidate and the 1.4 THE UNSEEN CITY source baseline. Preserve the source and playable URLs of versions 1.0–1.3 and all previous working copies. Branches and version-specific snapshots are history and evidence of this *one* game, not new games.

## Default five real passes
The council's structured output contains **five** named phases. Earlier prose loosely called this a four-pass design; for execution use the *actual five required stage IDs* listed below. Extra work can be automatically inserted by departments and must not be squeezed into a single job just because release time is short.

1. **Concept, art direction and asset specifications.** Deliver new mechanic/scene decisions, asset manifest, concept references, scale constraints, sprite state needs and acceptance examples.
2. **Actual original raster illustration.** Deliver PNGs or other genuine image-based illustrations for characters, environments and new machines; clear alpha and provenance. An image-generation/drawing tool with a validated working API, credential, quota and output pathway must exist; a text-only coding agent does not automatically have it. If it is unavailable, label `ART-BLOCKED` and preserve the source/art manifest, not code-draw an ersatz "illustrated" asset.
3. **Sprites, animations and music/SFX.** Assemble sprite/rig frame sequences and integration-ready animation descriptors; design and produce original audio cues and any musical layers actually required.
4. **Game/mechanics integration.** Integrate genuine pass 2–3 assets into the immediately preceding playable game while implementing the current approved gameplay feature set. Preserve earlier mechanics. Provide an executable build or, if integration breaks, archived source plus explicit launch failure.
5. **Post-integration improvement and QA.** QA evaluates, describes defects, records evidence and proposes fixes; coding/art agents perform correction passes. QA does not invent evidence or become the sole maker of the fixes. Issue a versioned candidate for review.

A pass is meaningful only if it creates a real deliverable with a location, asset/code hash, manifest or working file, not just a self-congratulatory progress summary.

## Agent-chosen extra passes
Any specialist may propose a concrete additional phase (e.g., redraw, collision/navigation integration, audio synchronization, animation repair, difficulty rebalance, asset compression, test-repair-and-retest). A Producer/Studio Architect arbitration can accept up to **three additional passes** per milestone, for **five core plus three extra = eight planned passes maximum**, each with documented necessity and cost. Stop looping once that budget is used; publish/keep the current incomplete candidate. Additional budget or a change of the overall game roadmap requires an explicit new creator instruction. There is no manual creator permission for every normal phase or routine change.

## Separate candidate publication from stable promotion
- **After every pass, preserve artifacts**: original images, source changes, frame/sound files, pass manifests, test results, logs, exact environment/tool conditions and dependency handoff; create an immutable artifact and recovery branch/commit when supported. No failed job deletes previous pass output. Ensure the artifact upload runs with `if: always()` or equivalent fallback and runs *before* strict QA release gates.
- **Always attempt a labeled development candidate snapshot** after integration/final pass, even with broken game code, missing graphics, or failing tests, unless publication is prevented by permissions, secrets/security risk or external infrastructure failure. Include diagnostics when the game doesn't start. Early concept/art-only passes get source/asset archives, not fictional playable game URLs.
- Honest status labels: `BROKEN` (won't start/critical failure), `PARTIAL` (runs but missing promised capabilities or incomplete art), `PLAYABLE` (browser boot and basic input evidenced, roughness permitted), `VERIFIED` (specific verified checks; **never** implies real Samsung hardware was tested unless it was). Status is per candidate, never inferred from a job finishing or a model saying “done.”
- A failed test **does not prevent archiving and experimental candidate publication**. It **does** prevent calling it successfully playable/verified or replacing the last accepted stable release. Candidate paths and labels must not overwrite earlier version-specific published URLs or last working default. Promote to stable only with honest minimum launch and owner acceptance, or an explicit revised owner instruction.
- The creator explicitly permits publishing unfinished/broken candidates; **do not treat this as permission to misrepresent quality or leak secrets.** If the publishing platform itself fails, retain source/QA artifacts and report the failure instead of claiming a public link exists.

## Engineering of agent handoffs
Each Codex invocation runs on a **fresh isolated runner**, never two `openai/codex-action@v1` calls in one job after `drop-sudo`. Transfer versioned files and stage manifests using verified GitHub artifacts/commits, preserving proper relative paths and all needed directories. Every consumer checks prior artifacts and gives a clear failure record; failing a pass invokes archiving and optional repair passes, not deleting the milestone source.

## Images are not magic
Generating new illustrated art requires an actually connected image tool/service, with image output rather than merely authored prompts. The Art Director and independent image QA may critique/rerun images autonomously under the pass budget. A compulsory human approval for **every art asset** would defeat the creator's request; reserve manual review for overall version acceptance or genuinely unresolved creative conflicts. Procedural circles, labels, collision outlines and HUD elements are allowed for their own tasks, but *not* silently presented as original character illustrations or new environment paintings.

## Testing and evidence
QA should test load/start, input, nonblank graphics, roster/fusion/state, image/spritesheets visible on canvas, sound triggers and audio mix, mobile portrait/landscape, game stability, performance, normal run, endgame stress and compatibility. Test failures are scored and logged; the playable acceptance label requires browser proof. A screenshot in source or a synthetic canvas test is not physical device evidence. Late-game difficulty should be investigated using user-play feedback: in 1.3 the creator finished Night 100 at Level 85 with 9/9 lives. One run is a **signal** to examine balance, not definitive proof.

## 1.4-specific first application
The council proposed this exact model for **Cataclysm 1.4 THE UNSEEN CITY**. Concept must define seeded districts, explorable layout, map only outside active play, nearest reachable magnet/rage/beacon arrow, DPS gates, provoked guardians and the city art direction. Art and animation produce proper original raster district pieces, bosses and environmental scenes. Integration inherits 1.3 companion fish/fusion/mecha and nine lives. Do not launch 1.4 simply by adding this policy; the version needs a separate creator-authorized production trigger.

## Council's unresolved issues
The council differed on 2 vs 3 extra passes, how aggressively to halt downstream work after missing art, and whether human artists should vet each generated asset. For autonomy and the creator's stated desire to inspect even broken versions, this policy uses five core + up to three extra, archived work and labeled candidates, and peer art review without mandatory per-asset human approval. Stage budgets are a starting bounded rule and can be changed by the creator.

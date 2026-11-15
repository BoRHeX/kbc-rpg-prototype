# LAUNCH — Cataclysm 1.4 THE UNSEEN CITY
**Creator's instruction:** "Ok let's make it happen" — 15 November 2026.
**Authorized work:** Build and run the new BoRHeZ Games Studio five-pass, genuinely image-based, autonomous production pipeline for Cataclysm 1.4.
**This is the SAME Cataclysm game**, continuing from the published 1.3 Feline Company, not a separate product.

Read the complete scoped job in `game_factory/CATACLYSM_14_MULTIPASS_ORDER.md` and standing multipass policy `game_factory/STUDIO_MULTIPASS_PRODUCTION_POLICY.md`.

Five independent development passes with archived handoffs:
01 Concept and 1.4 environment/gameplay specs;
02 real raster image generation using supported `gpt-image-2.5-flare` (maximum three medium-quality PNG requests; actual key capability unverified until the runner calls it);
03 spritesheet/rig/animation + original music/SFX;
04 real 1.4 gameplay art and systems integration from 1.3;
05 post-integration polish and browser QA.
After that up to **three automatically justified repair passes** using independent runners and the stage's actual QA evidence. No individual approval prompts; no infinite retry loops.

1.4 must substantively implement seeded city districts, world map only outside runs, reachable offscreen item arrow, DPS gated zones, district guardians/boss provocation, rare nonfarmable lives. Preserve 16 companions, Mecha Crew, fish economy, nine lives, the illustrated four-legged hero, movement-only combat, and historical release URLs.

**Release instruction:** preserve all work after each pass, regardless of failure. After integration/QA, attempt to publish a **labeled experimental candidate** at `/cataclysm-1-4-candidate/`, with status BROKEN/PARTIAL/PLAYABLE justified by real tests. Do not discard a broken candidate or call it playable. Keep 1.3 as stable rollback and don't silently promote 1.4.

An image API failure is ART-BLOCKED, not permission to claim code-drawn placeholders are hand-drawn art. Browser failure is captured in diagnostics and does not block experimental candidate publishing. Only actual availability and permissions can guarantee publication; keep an artifact even if PR/Pages fails.

**Do not start 1.5 or rewrite the standing policy.**

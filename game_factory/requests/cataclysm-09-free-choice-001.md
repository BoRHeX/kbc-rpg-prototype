# BoRHeZ Games Studio — CATACLYSM 0.9 / FREE CHOICE DEVELOPMENT PASS 001

## Executive order from the game's creator
The successful combination of illustrated cat-city graphics, toroidal world and solid collisions, original 174 BPM hard-rock/drum-and-bass soundtrack and 142 BPM Alley King dubstep boss music is now the PRIMARY CATACLYSM DEVELOPMENT PATH. The creator authorizes the studio to make any Cataclysm improvements it independently judges valuable. Exercise creative autonomy. Do not ask for a feature list or retread old gameplay videos. One-off autonomous creative update, NOT a schedule.

Game identity must be just Cataclysm 0.9 — no "Graphics Lab", "Effects Pass", "Experimental", 1.0 or alternate game title. Technical branch: development/cataclysm-09, not the old graphics-only experiment. Public play URL: /cataclysm/ once QA passes. Previous main:docs/preview/ remains preserved; do not change, don't merge branches, and do not modify other games or dashboard.

## You are a studio, not an obedient patch generator
Use a brief internal council to decide what to make:
- Creative Director: what makes Cataclysm's next minute more fun AND more entertaining to watch on YouTube?
- Gameplay Engineer: what is the weakest interaction, readability, pacing or replayability link?
- Art/Sound Director: what complements the distinctive cats, city, glow, rock/DnB and boss dubstep?
- QA/Production Lead: what cohesive improvement can be implemented, tested and safely shipped in ONE pass?
Resolve differences, make a decision independently, and implement it. You may choose gameplay, systems, enemies, visual effects, audio, UX, accessibility, tactical depth, balance or performance. Choose a fresh original feature or improve an existing weak link. One memorable idea with deep implementation is better than twenty disconnected tweaks.

## Release-level constraints (nonnegotiable)
- Version BUILD='0.9', HTML title exactly Cataclysm 0.9 · BoRHeZ Games, game-version DOM ID and text 0.9, boot handshake.
- Preserve 2400 torus and existing wrapCoord, wrappedDelta, dist, isTerrainClear, moveWithCollision, resolveActorCollisions functions. Eight physics QA tests must pass. Solid buildings, mostly open streets, characters and pickups not buried in obstacles.
- Preserve functional internal AUDIO_PASS_ID = 'graphics-lab-audio-01' marker for test/publisher compatibility (do not show this internal legacy name to players); boss music transition, return, mute/pause, one AudioContext, user-gesture Play activation. Eight independent audio QA checks must pass.
- Maintain responsive playable landscape at 844×390, 640×320, portrait at 390×844, touch joystick, all 3 permanent companions, random upgrades, companion ability buttons, runes, city events, restart/resume, boss every 5 minutes, sound and score.
- No external CDNs/assets/scripts, microtransactions, paywalls, stolen music or designs. Original Canvas2D, JS, CSS, WebAudio and existing config only. Respect performance, contrast, reduced motion, no flashing and mobile audio headroom.
- New features must be observable during gameplay, not only descriptions.
- May edit only docs/preview/game.js, docs/preview/game.css, docs/preview/index.html, docs/preview/game-config.json and write game_factory/decisions/cataclysm-09-free-choice-001.md. DO NOT modify CI, publisher, tests, reports, original release, dashboard, main branch or other games.
- Do not fake QA or alter gameplay/test semantics solely to pass checks. The coding-agent sandbox cannot launch Chrome or local HTTP; GitHub Actions runs tests after coding. Do not revert a candidate for lack of sandbox browser access. Node syntax check is permitted. Do not claim external QA results.

## Required studio decision memo
Create game_factory/decisions/cataclysm-09-free-choice-001.md with: (1) brief viewpoints of four roles; (2) one/two independently chosen improvements, reason and fit to Cataclysm; (3) intended player-visible changes; (4) actual code changes and edge cases; (5) what independent QA must prove. A concise technical decision record, NOT fake verbatim thought transcripts. No private data.

## Deliverable
Leave a substantive source update and decision memo in the worktree. Trusted gates check syntax, physics, survival and boss audio, and game input/layout at three viewports before publishing only at the new clean /cataclysm/ URL. User explicitly gave the studio creative freedom: make the choice and implement it. Never overwrite archived /preview/.

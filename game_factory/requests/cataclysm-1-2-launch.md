Cataclysm 1.2

# BoRHeZ Games Studio: autonomous milestone order
Owner authorization: 2026-11-14
Title: NINE LIVES
Tracking issue: https://github.com/BoRHeX/kbc-rpg-prototype/issues/85
Approved release roadmap: game_factory/CATACLYSM_1_1_TO_2_0_ROADMAP.md

Implement the release in the actual existing illustrated Cataclysm 1.1 game, forked into an independent docs/cataclysm-1-2/ playable URL. One project brief; autonomously plan, split functional responsibilities, implement, integrate and run minimal practical tests. No babysitting.

## Core behavior
1. Exactly nine lives begin each new run. Lives are a distinct finite resource from ordinary HP; HP damage and healing work normally. When HP reaches zero, consume one life exactly once. If lives remain, revive automatically with readable short grace, partial HP, visual and audio feedback. If none remain, real game over.
2. Retain XP, level, card upgrades, fish, companions and active night/wave when revived. Do not duplicate pickups or reset other counters. Ensure restarting a completed run resets to nine lives.
3. Show nine-life status in game HUD at phone scale (icons or readable count, not hidden in diagnostics), including short animation and expressive cat banter on life loss/last life. Preserve fast, cute four-legged illustrated hero with one independently aimed tail gun.
4. Introduce limited, explicitly rare extra-life recovery up to a bounded cap and with duplicate/farming safeguards. Do NOT add boss-earned extra lives in 1.2; those debut in 1.4.
5. Upgrade card perks can unlock four or five random offers (max five). Add genuinely functional rerolls with visible token count and honest card regeneration; zero valid-choice softlocks are not acceptable. Protect pause semantics during card decisions.
6. Add real differentiated survival, shield, risk/reward, mobility, tail weapon and squad perks. Balance a viable solo-cat path and a four-companion squad.
7. Preserve 1.1 base: one-thumb movement-only combat; illustrated quadruped/tail aim; Shooter, Healer, Tank, Sniper, Engineer, Trapper and Bard shoot while Brawler remains melee; dense weak ordinary zombie waves; elite and boss logic; soundtrack, voice and existing UI.

## Delivery policy
A little jank, haggardness, balance roughness and nonfatal bugs are acceptable. A blank screen, unresponsive game or unimplemented namesake mechanic is not. Keep all previous version directories strictly untouched. One bounded autonomous production run, no indefinite QA or retry loops. Report shipped behavior and known limitations plainly. Provide separate playtest URL, commit/PR trace and essential Chrome phone smoke test; creator will playtest the build.

No 2.0 two-hand-plus-tail weapons, new 1.3 roster/evolutions, 1.4 districts or 1.5 fishing.

Production command: Cataclysm 1.2

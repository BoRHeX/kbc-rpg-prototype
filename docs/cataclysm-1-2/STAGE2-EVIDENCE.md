# Stage 2 follower implementation evidence

Implemented in campaign and Night 99/100 lab without changing mode setup, score.js, scoring rules, upgrade IDs, recruitment cap, or painted assets.

- Identical follower-behavior.js loads before game.js and exports CATA_FOLLOWERS plus CommonJS exports. Eight unique speeds, formation anchors, preparation/action/recovery durations and cooperation hints.
- Live enemy melee contact and enemy projectile collision call the shared interruption function. Stagger lasts 0.42 seconds, with 1.5 seconds of protection from onset. Followers have no HP or death. Enemy projectiles continue past followers toward the player.
- Tank guarding and brawler attacking resist interruption; recovery remains interruptible. Shooter reloads six-round magazines. Healer requires a stationary nearby player; moving or player damage aborts treatment. Sniper kneels, checks terrain LOS, repositions around cover, and aborts on displacement/hit. Engineer builds turrets over 2.2 seconds. Trapper needs player help within 110 units. Bard grants song bonuses only during performance and taunts for 0.65 seconds at most once per five seconds.
- Manual buttons and automatic abilities share preparation, interruption and cooldown mechanics. Status and animation selection follow actual states.
- Existing diagnostics include companion state/phase, ammo, protection, cast/special/interrupt/abort counts, hit sources, seconds by state, useful action seconds, and turret useful seconds.

Verification completed in sandbox:

- `node game_factory/cataclysm_finish_acceptance.cjs followers`: PASS.
- `node game_factory/cataclysm_finish_acceptance.cjs score`: PASS.
- Node syntax checks for both game scripts and shared behavior: PASS.
- Byte comparison of behavior modules: identical. Follower loop/special/support source parity: identical.
- `git diff --check`: PASS.
- Temporary Node VM harness exercised the actual updateCompanions, manual activation/resolution, enemy projectile functions and melee contact branch in both builds with deterministic mocked world helpers. All eight produced casts. Over nine simulation seconds: shooter 9, healer 3, tank 2, brawler 6, sniper 3, engineer 2, trapper 3, bard 2. Additional assertions passed for reload interruption and protection, LOS refusal, stationary treatment and movement abort, guard/strike immunity and vulnerable rest, trapper cooperation range, all eight delayed manual specials, melee interruption, and projectile interruption without projectile absorption.

The VM harness is mechanics evidence, not a real-browser performance or rendering test. Real Chrome, screenshots and image-generation validation belong to the subsequent trusted runner.

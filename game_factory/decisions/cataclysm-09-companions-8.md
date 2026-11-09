# Cataclysm 0.9 companions

Eight permanent roles; the first four unique recruits fill the run's squad. Unowned recruitment upgrades then become ineligible, including direct calls. Owned role choices train one rank; squad-count multiplies strength without adding cats. Three offers retain a guaranteed player common. No swap interface or temporary companions.

| Role | Normal attack / passive | Special |
| --- | --- | --- |
| Shooter | Spread volleys; nearby fire-rate bonus | Radial burst |
| Healer | Light shots; nearby regeneration | Shared-player heal |
| Tank | Light shots; nearby mitigation | Six-second guard and enemy diversion |
| Brawler | Close claws with brief stun | Area claw damage and stun; bosses resist |
| Sniper | Precision shots pierce two targets and mark for team damage | Powerful shot pierces six targets |
| Engineer | Tool shots | One stationary turret for eight seconds |
| Trapper | Up to three five-second slowing traps | Three larger eight-second snares |
| Bard | Rhythmic nearby damage and team damage/fire buff | Seven-second stronger damage and movement buff |

Each role has distinct drawn gear and fur. Specials use simulation-time cooldowns (18 seconds; healer 24). Turrets and traps are finite effects, not actors. Four formation slots retain terrain/actor collisions. Only recruited ability controls appear. Diagnostics expose detached role, active-role and rank collections.

Validation: node syntax check and git diff whitespace check passed. Self-contained execution of actual source functions passed 2,000 offer rolls at capacity, direct fifth-role rejection, 1,000 rank trainings, all eight specials and 15 simulated seconds per role with finite projectiles, turret expiry and trap bounds. Browser, physics, audio and fullscreen acceptance and publishing remain for the independent Actions runner; no browser was run in sandbox. Public archive unchanged.

# Cataclysm 1.0 · Final playable build

The current live game already contains the requested core mechanics: city combat against cats, sprint and buffs, four unique squad slots, upgrades, fish, bosses, dialogue, music, and mobile movement-only controls. Preserve all of it. No game factory expansion or new features.

Single bounded visual correction: reuse the preserved four painted component hero rig from 43473753649, then run `game_factory/art_department/finish_hero_gait.py` once to amplify planted-foot displacement, knee bends and airborne paws. Maintain the white cat, upper-body dual-pistol aim, all companions, enemies, music, artwork, and Cataclysm 1.0 content. Both campaign and lab must agree on assets and retain Night1/L1 and Night99/L100 respectively.

Run existing gameplay/browser acceptance and an independent visual review of actual 48px player animation. **Never lower leg-motion acceptance from 4/5.** If accepted, merge only the candidate, deploy Pages, and verify actual live files. If rejected, leave current release playable and report the concrete visual defect instead of automatically generating further art.

This is a release candidate, not a request for another ambitious animation architecture.
Correction after first candidate QA: the browser probe compared two knee snapshots separated by approximately one gait period and reported identical knees even though the solver and unit tests passed. It now measures nine actual WASD samples over multiple phases, requiring each knee and ankle to shift at least 2.5px. The visual reviewer still has independent veto and the requirement of visually readable running legs is unchanged. Reuse the same saved textures; no new art, no gameplay edits, no additional pipelines.

# Decision register — do not invent unresolved rules

## D-001: Numbering
The user typed “0.1” while discussing the substantial 1.0 redesign. Treat this as the existing Cataclysm 1.0 project, not a request to downgrade to 0.1. Build an isolated major 1.0 candidate; keep 0.9 and the current 1.0 preview playable. Final naming is subject to creator review.

## D-002: Fixed campaign clock
100 nights × 13 **simulation** seconds = 1300 seconds = 21m40s, excluding upgrade-selection and paused time. Night n begins at t=(n-1)×13. `night = min(100, 1+floor(t/13))` while running. The night clock freezes while choosing upgrades and paused; never use wall-clock time. End must be close to 22 minutes; producer must justify any small bounded resolution window.

## D-003: Boss and elite arithmetic
Boss wave every ninth night = **11** encounters at nights 9..99 inclusive, despite only **9 distinct boss designs**. Use each unique boss at least once (first nine events at nights 9..81); nights 90 and 99 are advanced rematches, not extra unique archetypes.

Elite wave every sixth night = **16** events at nights 6..96 inclusive. Five overlaps with boss nights (18,36,54,72,90) must be scheduled and survive budget/collision accounting.

## D-004: Proposed count reconciliation — provisional, must surface to creator
Interpret “defeating night 100 9 bosses 9 elites and 9 super+elites wave” as **cumulative** at least nine regular boss kills, nine regular elite kills, and nine super-elite kills by the end of a Night-100 final encounter, rather than 27 simultaneous bosses/elites at Night 100. This preserves the stated ~22-minute run and a readable mobile scene.

A viable deterministic slot calendar:
- Bosses: nights 9,18,27,36,45,54,63,72,81 (9 unique), plus 90 and 99 (two rematches).
- Normal elite slots: nights 6,18,30,42,54,66,78,90 (8), plus one featured normal elite in Night 100 (9).
- Super-elite slots: nights 12,24,36,48,60,72,84,96 (8), plus one featured super-elite in Night 100 (9).
- Night 100: clearly telegraphed finale; the last elite and super-elite are genuine threats and their defeat, along with cumulative boss threshold ≥9, is needed for victory. Design final-boss/crown requirements so the campaign remains achievable.

The distinction between **types** (9/6/3) and **encounters** (11/9/9) is mandatory. These slot choices are *implementation suggestions* for the Producer to validate and expose to the creator, **not** proof that the creator specified this exact distribution. Do not falsely call this interpretation confirmed. An alternative (9+9+9 simultaneous final wave) would require a different timetable or win-time budget and must return for clarification before implementation.

## D-005: Victory state
Victory iff Night100 finale completed, player alive, unique boss kill credits ≥9 total, normal elite kill credits ≥9, super elite kill credits ≥9. Exactly 999999999 score is awarded **once**, persistently, only on true victory. Death/timeout without requirements does not grant score. Event and kill credits are idempotent; despawn, fusion or interrupted boss cannot count as player victory. Surviving beyond 100 nights is not a substitute. No invisible debug shortcut counts as completion.

## D-006: Animation minimum
- 27 elite/boss/normal distinct archetypes × 6 frames = 162.
- 8 companion types × 12 frames = 96.
- Hero five 24-frame states (idle/run/hit/feral/adrenaline) = 120.
- Minimum 378 tested frame-state samples. Hero state overlap (feral+adrenaline), target angle and reduced motion need deterministic layering. Each pose consists of separately addressable head, torso, legs, arms, tail.
- Procedural/skeletal rigs are allowed **only if actual frames vary meaningfully** and special states communicate mechanics visually.

## D-007: Music
Two NEW original songs/melodies beyond existing survival/boss material. They may be synthesized through WebAudio (avoids licensing and asset download). Expose score IDs, phrase structure, transitions, and clip/motif demo. “Two more layers on the same song” does not pass.

## D-008: Availability and scope
The current `cataclysm-1-0-preview` is a verified playable candidate with earlier, different release criteria. It does **not** satisfy R1–R7 merely by being labeled 1.0. The definitive major build must pass new criteria before replacing the user's preferred play URL. No changes to Flame Game Studio, other mobile games or public UI until integrated and approved.

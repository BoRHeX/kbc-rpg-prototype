# Cats alive — studio pass 1 (1.0)

Implemented in the actual game loop, not a sample scene. `cat-personality.js` is identical in both candidates. Game differences remain the original stress-mode flag, initial lab level and dedicated lab QA arrival override. The normal campaign starts Night 1, level 1; its introduction now states the correct level.

## Voices and signals

225 local library entries plus seven authored exchange responses. Hero: stubborn improviser; shooter: procedural chatter and cartridge Dennis; healer: gentle, stern triage; tank: protective living architecture; brawler: impatient physical punctuation; sniper: spare, precise, dry; engineer: speculative repairs; trapper: patient, anxious knot collector; bard: affectionate and theatrically inconvenient. Exchanges require the other named role to be recruited. Feeding permits short responses from other recruited cats. Nights 98–100 suppress light banter and pending jokes and use sober special-call lines.

Signals: first simulation tick, early movement tip, actual damage calls, wounded hero with recruited healer, measured HP gain/completed treatment, feral/adrenaline rising edges, projectiles expiring without hits (attributed to their actual owner), actual major arrivals/defeats, recruitment, actual existing nearby fish, retrieval, completed eating, quiet intervals, city encounter changes and nearby cocoons/mutants/ghosts, late-night transitions and actual terminal run modes. No game-time API requests. A private seeded PRNG never advances combat or upgrade randomness.

The simulation scheduler bounds its queue to ten, visible speech to two, history to forty and recent-text memory to fourteen. It rotates each role/event bank without replacement, suppresses recent cross-role text, expires stale events, gives speakers recovery time, spaces low-priority utterances, and lets urgent damage/arrival/terminal speech interrupt quieter speech. Display lifetime is 2.8–4.8 running seconds. Pauses and upgrade screens freeze the scheduler, follower timers, eating and cooldowns. Bubbles hide during these overlays and resume with their remaining lifetime.

DOM bubbles expose `data-cat-speech="hero|shooter|…"` and `data-speech-event`. Positions use the same player-relative world camera and shake as the canvas. Clamped tails, above/below placement, HUD/caption collision rejection and offscreen suppression keep them near their actor. HUD geometry is cached at approximately 12 Hz; character tracking follows rendered frames. No input is intercepted. No source art or poses were changed.

## Companion behavior

Only one recruited cat may forage at a time, only from an interruptible following phase, without a pending special. A deterministic nearest-fish search uses existing unclaimed fish within 220 of the cat and 280 of the hero. Recent injury, visible live enemies, nearby hostile projectiles, unsafe terrain/path, gas, city telegraphs, rising shadow, healing preparation and the final nights prevent a detour. Danger, an attracted/disappeared fish, interrupted preparation or seven running seconds cancels it. Eating takes 0.85 seconds and retrieval has a 32-second cooldown; cancellation uses 24 seconds. No food means normal combat and no penalty.

The original fish object is marked for the existing pickup loop, which credits its complete value, XP, pickup effects, sound and Encore exactly once. No earned fish is deducted; no replacement fish or XP is invented. Followers return through their existing navigation. Formation is re-evaluated after food/timeout and every sixteen running seconds: roles retain front/rear spacing, shift support away from enemy pressure and spread under crowding. The tactic button remains optional.

Automatic specials require useful real targets, stationary nearby wounded hero for healer, close pressure for tank/brawler, a worthwhile sniper target, and useful turret/trap/song deployment. Existing preparation validates range/line of sight before committing. Empty intervals consume no attack-special cooldown. A known queued major arrival within three seconds reserves attack specials unless immediate pressure or a live major makes casting worthwhile. Turrets and traps are not needlessly replaced while productive. No new player buttons.

## Stage 2 Guide contract

No Guide exists in this candidate's pause UI. This pass does not create a second one or claim an unavailable panel exists.

After the deferred personality script loads, Stage 2 registers:

```js
CATA_CATS.registerGuide({
  available: () => guideIsMountedInPauseMenu,
  cue: ({actor, target, until, clock}) => {
    // Optional, idempotent presentation hook. actor='hero', target='pause'.
    // Times are dialogue simulation seconds, never Date.now().
  }
});
```

`available` must be a cheap synchronous boolean and mean the Guide can actually be opened in pause. Register `null` to unmount. Provider failures are isolated from gameplay. When available, the hero can mention it after 18 running seconds and at long intervals thereafter; a static arrow and outline point to the existing pause button during that speech. The optional cue runs each rendered speech frame and must not open a menu or advance timers; the core handles the pointing cue without new sprite art. Stage 2 owns the actual Guide UI, navigation, localization and pause behavior.

## Public QA and local checks

Existing browser snapshot adds `catSpeech` (clock, active/queued events, speaker deadlines, bounded history and deterministic state), `catSpeechVisuals` (speaker, event, actual visibility and screen position) and `formationPlan`. Existing companion snapshots include forage/eating state, cooldown, meal count and behavior version 3. Paused snapshots preserve the speech simulation state; visual bubbles hide. Gameplay snapshot APIs and their existing fields remain available.

Local checks passed: both game/module syntax checks; identical personality module and speech CSS additions; preservation of the three intentional major/lab source differences; deterministic replay; nine distinct speakers; pause/upgrade freeze; nonrepeat bank rotation; urgent interruption; one forager; full original fish-value retention and pickup wiring; danger cancellation; hazardous-route rejection; no forage during role preparation; no-fish fallback; semantic overlay construction; actor-position tracking; offscreen suppression; pause hide/resume; Guide registration/unregistration and failure isolation. Temporary Node/VM checks exercised the real module and extracted forage functions with controlled world signals and a DOM geometry adapter. `git diff --check` passed.

Browser visual/mobile performance validation remains for the trusted pipeline. This environment denied binding a local HTTP server, and Playwright's browser executable was absent. No browser screenshot or full campaign playthrough is claimed.

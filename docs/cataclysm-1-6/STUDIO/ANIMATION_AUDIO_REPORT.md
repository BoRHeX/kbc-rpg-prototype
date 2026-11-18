# Cataclysm 1.6 · Pass 03 animation and audio handoff

**Media delivered. Gameplay integration and acceptance pending.** All three local 1024×1024 Pass 02 PNGs matched the SHA-256 hashes in the on-disk image manifest before cropping. The source paintings use two rows of three or two rows of two, with two distinct poses per actor. The crop windows follow those actual poses. [Pass 02 image manifest](IMAGE_MANIFEST.json)

## Sprite frames

Six mutant families and two boss forms have 16 transparent PNG cutouts and 28 state sequences. The index records per-file SHA-256, source PNG hashes, crop windows, pixel dimensions, pivots, foot anchors, world scale and state timings. The prep script suppresses low-alpha haze, downsamples with alpha-weighted color and adds a two-pixel transparent guard. Every output decoded with zero-alpha borders, visible foreground and an in-bounds pivot. All 16 cutouts were visually inspected composited over gray. [Frame index](../art/animated/mutation-frame-index.json) · [Preparation script](tools/prepare_mutation_frames.py)

| Actor | State timing and display |
| --- | --- |
| Mimic Stray | Use the inherited ordinary fish pickup renderer for disguise. Reveal holds the fish-shell tell for 620 ms, then shows the open jaw for 330 ms. Lunge holds the open jaw for 260 ms. |
| Bell-Ringer | Countdown holds the upright bell for 750 ms and the raised swing for 550 ms. Strike uses the swing for 280 ms. Interruption returns to idle. |
| Roof Pouncer | Draw the painted ledge only in the perch state. Show a ground shadow at the committed landing point for 900 ms. Draw the airborne pose for the 320 ms leap and 400 ms of landing recovery, then return to the appropriate gameplay state. |
| Necro-Groomer | Ritual holds idle for 400 ms, then the painted cast for 800 ms. Reanimate holds cast for 380 ms. Interruption returns to idle. |
| Pack Leader | Rally holds idle for 520 ms, then the charge pose for 180 ms. Charge holds that pose for 420 ms. Dispersal uses idle for surviving leaders, and the followers' runtime reaction should play separately when their leader dies. |
| Feral Fish Thief | Snatch changes from prowl at 160 ms to dash for 220 ms. Escape carries the dash pose. Both original poses depict a fish in the mouth. Confirm each actual theft with a separate event cue. |
| Mourning Bell Sovereign | Transition changes from armored at 600 ms to shattered for 600 ms, then holds the shattered phase. |
| Patchwork Broodmother | Transition changes from stitched at 500 ms to reformed for 700 ms, then holds the reformed phase. |

In Pass 04, select the state from gameplay and read the sequence using elapsed simulation time since state entry. Draw each frame at actor position minus scaled pivot coordinates. Apply mirroring around the pivot if needed for direction, and apply any visual leap elevation above the pivot while keeping the landing shadow at ground level. Hold the last pose until gameplay advances the state. Keep collision and hit timing under simulation control, and keep essential tells visible under reduced motion and mute. Painted pack echoes and ritual spirits are part of the respective artwork. Actual minions use separate gameplay actors. The unpainted mimic disguise uses inherited pickup art, and the roof landing warning uses a code-native shadow. The two paintings per actor are reused across states. Crop review does not establish their legibility during mobile combat.

## Original PCM

Eight one-shot cues cover bell countdown, bell strike, mimic reveal, roof pounce, necro ritual, pack charge, fish theft and boss phase escalation. Five eight-second noise-based musical beds cover pressure, mutant activity, fishing tension, last-life danger and bosses. All are original offline compositions rendered to 24 kHz mono signed 16-bit PCM. Readback confirmed WAV headers, sample counts, nonzero RMS, absence of sample clipping and silence at each bed's loop boundaries. File hashes, synthesis source hash, peaks, RMS, priorities and loop points are in the index. [Audio index](../audio/generated/mutation-audio-index.json) · [Composition script](tools/compose_mutation_audio.py)

- Route cues to the inherited `fxBus` and beds to `musicBus` through the existing context and master volume/mute. Keep the inherited score running. For a priority-4 or priority-5 warning, briefly duck the inherited score's own gain to 67% and restore smoothly after the cue. Starting gains are in the index.
- Trigger cues on state entry or confirmed event. Trigger the theft cue after the economy transfer succeeds. Start countdown/ritual and leap cues on the warning, and fade them promptly if the corresponding action is interrupted. Keep three mutation cue voices at most, reserve one for priority 4+, and let a higher-priority cue preempt the lowest active voice when needed. Apply a 90 ms global gap to ordinary requests and a 750 ms per-ID cooldown. Drop suppressed cues. Keep the inherited/global voice limits in force.
- Select one bed by precedence after 750 ms of stable state. Last life with low HP takes precedence over an active boss, committed fishing tension, a live mutant encounter and elevated director pressure. Use no bed at rest. Crossfade over 450 ms with at most two bed sources during the fade. Loop only beds.
- Cache in-flight decode promises per asset. Recheck run identity, state identity, visibility, pause and mute after decode before playing. Stop and disconnect on pause, mute, hidden tab, death and reset. Re-evaluate states on resume and require a current gameplay event for a new one-shot.

Reproduce from the 1.6 directory with `python STUDIO/tools/prepare_mutation_frames.py` and `python STUDIO/tools/compose_mutation_audio.py`. Frame prep requires libpng 1.6. Browser drawing, cue playback, listening balance, hardware and performance acceptance remain pending. These files are a Pass 04 handoff.

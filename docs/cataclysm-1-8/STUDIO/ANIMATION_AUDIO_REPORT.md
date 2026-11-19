# Pass 05 animation and audio handoff

The 1.8 directory arrived with the Pass 04 runtime already copied. Recursive content comparison found differences limited to studio material and the new art and audio directories. Both game.js files match the frozen source SHA-256 `2018a1036ac516918becf3b60b5ba396c843c9952a0b8c06a3debc1a185225f0`. The inherited runtime still identifies as 1.7. Pass 04's own status records its two Chrome viewport checks.

## Image evidence

All three delivered 1024×1024 PNGs match their entry in [IMAGE_MANIFEST.json](IMAGE_MANIFEST.json) by SHA-256, byte count, dimensions and mode. Both transparent images have alpha from 0 to 254. The weather sheet is RGB. Source images were used directly and this pass made zero additional API calls.

[ADVANCEMENT_MEDIA.json](ADVANCEMENT_MEDIA.json) records 16 derivative PNGs with paths, source rectangles, output sizes and hashes. The two painted teams each have a ready pose and an action pose. The four frames share a 192×204 canvas and bottom-center pivot, with 220 ms proposed for net cast and 130 ms for the shot. These are two-state performances. Additional walk-cycle drawings would need new source art. Visual inspection of the cuts at review scale showed small neighboring fragments on several tightly packed mood and marker crops. Weather crops are illustrations for tiles and entry cards, with world-overlay treatment specified in the concept.

## Audio

Seven original synthesized one-shots are in `audio/advancement/`. Trawl uses a low rising pluck and noise for the net release. Spotter uses a short brighter attack. Rain uses a soft pitched patter, storm a low rumble, fog a low cluster, and clear an ascending chime. Mission completion uses a separate rising figure. Each file is 24 kHz mono 16-bit PCM with short fades. Cue definitions and synthesis are in [build-advancement-media.py](build-advancement-media.py).

For integration, trigger fusion cues on the successful gameplay action, weather cues once on stable district/weather entry, and mission audio once when the reward commits. Route playback through the existing master mute and pause lifecycle. Skip resume-time replay of committed cues and expire stale decodes. These files are one-shots with silent edges. Browser playback and in-game mix remain integration checks.

## Checks run

- Ran `python STUDIO/build-advancement-media.py` with Pillow. Visually inspected source and derived contact sheets.
- Verified all derivative hashes, decoded the PNGs, checked plan links, and read the WAV samples to check format, sample counts, signal and clipping.
- Ran `node qa/long-night-fixtures.cjs` in 1.8. The inherited segmented campaign, checkpoint and Mecha restore fixtures passed. The fixture's audio scheduling uses test doubles.

This pass delivered source media and design. The new gameplay, HUD and media playback await Pass 06. Pass 05 did not run a new browser or physical-device test.

# Stage 3 implementation evidence

Implemented in both campaign and Night 99/100 lab, retaining their separate startup/economy behavior. Earlier Stage 2 working-tree changes are retained.

- `animation.js`: eight hero aim frames are compass bearings E, SE, S, SW, W, NW, N, NE, selected by angle, including negative-angle wrapping. Aim upper body is composited at source row 70 with independently animated original lower-body frames. Moving while firing keeps running feet. Feral/adrenaline use their original lower-body sheets and color aura; hit retains the original full hit sheet. No original hero PNG was edited.
- Simulation updates target bearing between shots. Shot origins and flashes use the same barrel anchor function; both directions reverse through authored poses without mirroring or rotating a generic character. No synthetic hero gun overlay is added.
- Companion preparation holds early action frames. Acting restarts the state clock; frame 3/8 commits shots, melee damage, turret construction, snares and special effects. Healing starts after this marker. Sound occurs on commitment. Hit interruption resets the clock and cancels uncommitted work. Special, attack, run and hit are selected from behavior, with finite action/hit playback.
- Missing companion action sheets explicitly hold the actor's first existing painted pose rather than cycling run frames. Actor-local loading and validation retain fallback safety.
- Enemy identities are retained; footfall compression, gait lift and finite damage recoil improve contact.
- Shared art cache release: `cataclysm-10-stage3-aim-01`. Script cache URLs also updated. Snapshot presentation exposes art readiness, aim bearing and follower action clocks/commit status.

## Trusted art integration contract

The trusted runner produces the PNGs AFTER this sandbox. They have not been generated or visually approved here. The existing manifest loader automatically consumes `characters/<role>/{attack,special,hit}.png` (eight 96px frames, manifest fps) and `characters/hero/aim.png` (eight 96px compass poses). Existing seven city painting paths are already wired through `visuals.js`: ground-0..3, prop-building, prop-car, prop-dumpster. Both modes must receive identical assets and updated manifests.

Optional `characters.hero.aim.aim` manifest metadata supports `split_y` (default 70) and `barrels`: eight pairs of [x,y] pixel coordinates, one pair per pistol, relative to each 96px frame. The default barrel anchors use a 31px reach and 8px lateral separation. After painting, the trusted visual pass should calibrate these anchors to the actual painted muzzle tips and inspect the waist seam in all eight directions. No additional overlay image is required: the new aim sheet supplies the real painted forearms and pistols. Missing aim art preserves the existing hero sheet until the asset loads.

## Verification executed

- Node syntax checks passed for both game scripts, both animation modules and both follower modules.
- Isolated Node VM with mock decoded image sheets passed in BOTH modes: all eight compass indices, negative wrapping, independent lower-body + directional upper-body draw calls, frame-3 attack selection, terminal hit frame clamping, missing-action first-pose fallback, finite barrel anchors, and interruption clock reset.
- animation.js, follower-behavior.js and visuals.js have byte parity between modes.
- SHA-256 comparison against sandbox-entry hashes: all 26 existing hero PNGs are unchanged.
- No Chrome run or image generation was performed in this sandbox. Actual painting quality, seam alignment, muzzle calibration, real browser playback and frame pressure remain for the trusted runner.

Protected hero PNG SHA-256 inventory (sandbox entry and completion identical):

- `art/hero-idle.png`: `60d5e35cc880db4754a5a4a63d1952224e5a9f9faa2c4b4c332feb726138b6b3`
- `art/hero-attack.png`: `00dc426524cfdd84660484daed4b75669266e46bf6f3e02419cb13dbe2877250`
- `art/hero-adrenaline.png`: `65686777b3ce54d2aeb8ecc3343a4dd28d0c6b8216dfdf0ea62b1db2a705fb99`
- `art/hero-run.png`: `e5a80b95b328cab4d8e243e80f0bedf706bc6e185adfb59c8eb21720438e3d8b`
- `art/hero-feral.png`: `d64005f29db0a76db1ca7b88ae1824f80789494a024871c74d5e98fb66fac3d9`
- `art/hero-hit.png`: `82cf24a816cd09bc63d88a9d20629d1213aecf4e7f726a63259fd6d10ed17f86`
- `art/characters/hero/attack.png`: `b424ccf255041eafe87bce9ddefd718b51194af30f1632b0fbdcc201cae976f2`
- `art/characters/hero/hit.png`: `a74239549b3d650416a6640530d3e330348e924367a0d8f69d51c77d237b6c1d`
- `art/characters/hero/anchor.png`: `2d9e979f75d15701b1f9a7ca25869657a3d3361250136e95dfda3e43212be790`
- `art/characters/hero/adrenaline.png`: `94c1851d3f9b0b66885566fd670ea689a733083ecc02e86fbca2f0646587cc20`
- `art/characters/hero/run.png`: `8484512d0f3b14727673cfc02128058d08fd84f6e39f204fc2b409b70714b64d`
- `art/characters/hero/idle.png`: `5f55caaf5c71cca7c1ff38c93d4f11f201fc5eaf7d7866073a0893c2f66c57cc`
- `art/characters/hero/feral.png`: `ca236cf4ba5d660fdd133da2ce425d3a90dd20e5df620a835d54ae179aaf9fe3`

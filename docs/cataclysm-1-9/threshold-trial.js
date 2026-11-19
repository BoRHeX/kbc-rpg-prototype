/* Seeded encounter director used by the isolated Threshold Trial runtime. */
(function (root) {
  'use strict';

  const phases = [
    { weather: 'rain', enemies: ['pack-leader', 'pack-leader', 'dasher'], objective: 'street-beacon' },
    { weather: 'fog', enemies: ['bell-ringer', 'necro-groomer'], objective: 'stair-beacon' },
    { weather: 'storm', enemies: ['roof-pouncer', 'mourning-bell-sovereign'], objective: 'door-beacon' },
  ];
  const phaseLimit = 40;
  const holdSeconds = 2;

  function begin(seed) {
    return { seed: seed >>> 0, zone: 0, elapsed: 0, hold: 0, status: 'active' };
  }

  function encounter(state) {
    const phase = phases[state.zone];
    const mixed = Math.imul(state.seed ^ Math.imul(state.zone + 1, 0x9e3779b9), 0x85ebca6b);
    const approach = ((mixed ^ (mixed >>> 16)) >>> 0) % 4;
    return { ...phase, enemies: [...phase.enemies], approach, phaseLimit, holdSeconds };
  }

  // Call once per active simulation step. Objective is gated by tagged threat
  // IDs, which the adapter removes only on confirmed death.
  function step(state, dt, { threatsRemaining, inBeacon, defeated }) {
    if (state.status !== 'active') return null;
    if (defeated) {
      state.status = 'failed';
      return 'failed';
    }
    if (!Number.isFinite(dt) || dt <= 0) return null;
    state.elapsed += dt;
    state.hold = threatsRemaining === 0 && inBeacon ? state.hold + dt : 0;
    if (state.hold + 1e-8 >= holdSeconds && state.elapsed <= phaseLimit + 1e-8) {
      if (state.zone === phases.length - 1) {
        state.status = 'cleared';
        return 'cleared';
      }
      state.zone++;
      state.elapsed = 0;
      state.hold = 0;
      return 'advance';
    }
    if (state.elapsed + 1e-8 >= phaseLimit) {
      state.status = 'failed';
      return 'failed';
    }
    return null;
  }

  const trial = { begin, encounter, step };
  root.CATA_THRESHOLD_TRIAL = trial;
  if (typeof module === 'object') module.exports = trial;
})(globalThis);

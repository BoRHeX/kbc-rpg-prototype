const assert = require('node:assert/strict');
const trial = require('../threshold-trial.js');

const state = trial.begin(73);
assert.deepEqual(trial.encounter(state), trial.encounter(trial.begin(73)));
assert.ok(new Set(Array.from({ length: 16 }, (_, seed) =>
  trial.encounter(trial.begin(seed)).approach)).size > 1);

const tick = (dt, overrides) => trial.step(state, dt, {
  threatsRemaining: 0, inBeacon: true, defeated: false, ...overrides,
});
assert.equal(trial.encounter(state).weather, 'rain');
assert.equal(tick(1), null);
assert.equal(tick(1, { threatsRemaining: 1 }), null);
assert.equal(state.hold, 0);
assert.equal(tick(1), null);
assert.equal(tick(1, { inBeacon: false }), null);
assert.equal(state.hold, 0);
assert.equal(tick(2), 'advance');
assert.equal(trial.encounter(state).weather, 'fog');
assert.equal(tick(2), 'advance');
assert.equal(trial.encounter(state).weather, 'storm');
assert.equal(tick(2), 'cleared');
assert.equal(tick(2), null);
assert.equal(trial.step(trial.begin(0), 40, { threatsRemaining: 1 }), 'failed');
assert.equal(trial.step(trial.begin(0), 2, { defeated: true }), 'failed');
assert.equal(trial.step(trial.begin(0), 41, {
  threatsRemaining: 0, inBeacon: true,
}), 'failed');
console.log('Threshold director: seeded approach, objective resets, three phases, timeout, death and terminal idempotence passed.');

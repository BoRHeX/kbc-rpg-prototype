/* Shared Cataclysm 1.0 scoring rules. */
'use strict';
(function (root) {
  const RULE_VERSION = 'cataclysm-1.0-score-1';
  function advanceSurvival(previousFloat, seconds, night) {
    return previousFloat + seconds * 2 * (1 + 0.015 * (night - 1));
  }
  function tally({survivalPoints, weightedKills, fish, milestonePoints}) {
    const components = {
      survival: Math.floor(survivalPoints),
      kills: 7 * weightedKills,
      fish: 9 * fish,
      milestones: milestonePoints
    };
    return {total: components.survival + components.kills + components.fish + components.milestones, components};
  }
  function newLedger() {
    return {milestonePoints: 0, awarded: []};
  }
  function awardMilestone(ledger, id, amount) {
    if (ledger.awarded.includes(id)) return false;
    ledger.awarded.push(id);
    ledger.milestonePoints += amount;
    return true;
  }
  const api = Object.freeze({RULE_VERSION, advanceSurvival, tally, newLedger, awardMilestone});
  root.CATA_SCORE = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);

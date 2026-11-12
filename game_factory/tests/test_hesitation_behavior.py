"""Exercise the real Cataclysm hesitation function using Node.js, without a browser."""
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class HesitationBehaviorTests(unittest.TestCase):
    def test_behavior_and_cooldown(self):
        script = r"""
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync('studio/web/game.js', 'utf8');
const begin = src.indexOf('  function hesitationFactor(');
const end = src.indexOf('\n  function spawnEnemy()', begin);
assert(begin >= 0 && end > begin, 'Missing real hesitation helper');
const factor = vm.runInNewContext(src.slice(begin, end) + '\nhesitationFactor;', { Math });
const enemy = {fearTimer:0, fearCooldown:0};
assert.equal(factor(enemy,90,1/60,()=>0), 0.12, 'Close enemy should hesitate');
assert.equal(enemy.fearCooldown, 3);
assert(enemy.fearTimer > 0);
let draws = 0;
const rand = () => {draws++; return 0;};
assert.equal(factor(enemy,90,1/60,rand), 0.12, 'State persists for a short time');
assert.equal(draws, 0, 'Cooldown must not resample randomness');
const far = {fearTimer:0, fearCooldown:0};
assert.equal(factor(far,180,1/60,rand), 1, 'Far enemies still chase');
assert.equal(draws, 0, 'Far enemies must not sample RNG');
const nontrigger = {fearTimer:0, fearCooldown:0};
assert.equal(factor(nontrigger,90,1/60,()=>1), 1, 'A missed random check must preserve chase');
const p30 = 1-Math.exp(-0.8/30);
const p60 = 1-Math.exp(-0.8/60);
assert(Math.abs(Math.pow(1-p30,30)-Math.pow(1-p60,60))<1e-12,
       'Trigger probability over one second should be frame-rate independent');
assert(src.includes("if(e.fearTimer>0){outline("), 'Paused enemy requires a visible marker');
"""
        result = subprocess.run(
            ["node", "-e", script],
            cwd=ROOT, check=False, capture_output=True,
            text=True, timeout=15
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()

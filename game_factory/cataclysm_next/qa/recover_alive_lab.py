"""Restore Night99 lab mode in preserved Cats Alive 1.0 candidate.

A creative stage copied the normal campaign's STRESS_MODE=false into both
game directories. Patch only the lab flag; do not replay AI or replace art.
"""
from pathlib import Path
major = Path("docs/cataclysm-1-0-major/game.js")
lab = Path("docs/cataclysm-100-lab/game.js")
old = "const STRESS_MODE=false;"
new = "const STRESS_MODE=true;"
a, b = major.read_text(), lab.read_text()
assert a.count(old) == 1 and new not in a, "Normal campaign must retain Night 1 start"
if old in b:
    assert b.count(old) == 1 and new not in b, "Ambiguous laboratory mode declaration"
    lab.write_text(b.replace(old, new, 1))
else:
    assert b.count(new) == 1 and old not in b, "Unexpected laboratory mode declaration"
assert major.read_text().count(old) == 1
assert lab.read_text().count(new) == 1
print("Restored lab at Night 99; main game remains Night 1. No other files changed.")

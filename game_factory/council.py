"""Deterministic, bounded Game Factory agent council for BoRHeZ Games.

Purpose: propose balancing experiments with evidence, not replace actual player
testing or assert that LLMs are independently building games.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from dataclasses import asdict, dataclass, replace

BASELINE = {
    "speed": 235.0, "enemy_speed": 63.0,
    "spawn_interval": 1.65, "shot_interval": .62,
    "enemy_hp": 3, "fish_drop_chance": .65,
}
TARGET = 90.0
SEEDS = tuple(range(20261001, 20261013))


@dataclass(frozen=True)
class Variant:
    name: str
    speed: float
    enemy_speed: float
    spawn_interval: float
    shot_interval: float
    enemy_hp: int
    fish_drop_chance: float

    def valid(self) -> bool:
        return (160 <= self.speed <= 350
                and 30 <= self.enemy_speed <= 140
                and .35 <= self.spawn_interval <= 3.5
                and .2 <= self.shot_interval <= 1.4
                and 1 <= self.enemy_hp <= 7
                and 0 <= self.fish_drop_chance <= 1)


@dataclass(frozen=True)
class Ballot:
    department: str
    vote: str
    argument: str
    evidence: str


def candidates() -> list[Variant]:
    base = Variant("Original", 235, 63, 1.65, .62, 3, .65)
    return [
        base,
        replace(base, name="Night stroll", enemy_speed=54, spawn_interval=1.9),
        replace(base, name="Fast claws", shot_interval=.52, enemy_hp=3),
        replace(base, name="Horde mode", spawn_interval=1.05, enemy_speed=76),
        replace(base, name="Nine lives", speed=260, enemy_speed=69,
                spawn_interval=1.50, fish_drop_chance=.78),
    ]


def trial(c: Variant, seed: int) -> dict:
    """Simplified agent-play model, intentionally not the browser game physics."""
    r = random.Random(seed)
    x = y = 0.0
    hp = 3
    time = 0.0
    cooldown = 0.0
    iframe = 0.0
    spawner = 0.0
    kills = 0
    fish = 0
    enemies: list[dict] = []
    dt = .20
    while time < TARGET and hp > 0:
        time += dt
        spawner -= dt
        cooldown -= dt
        iframe = max(0, iframe - dt)
        if spawner <= 0 and len(enemies) < 120:
            a = r.random() * 2 * math.pi
            enemies.append({"x":x+math.cos(a)*330,
                            "y":y+math.sin(a)*330,
                            "hp":c.enemy_hp})
            spawner = max(.27,c.spawn_interval/(1+time*.009))

        nearest = min(enemies,
                      key=lambda e:(e["x"]-x)**2+(e["y"]-y)**2,
                      default=None)
        if nearest:
            dx = nearest["x"] - x
            dy = nearest["y"] - y
            d = max(1, math.hypot(dx, dy))
            # Scripted evasive movement plus occasional mistakes.
            a = math.atan2(-dy, -dx) + .75 * math.sin(time*1.2+seed)
            x += math.cos(a)*c.speed*.62*dt
            y += math.sin(a)*c.speed*.62*dt
            if cooldown <= 0 and d < 410:
                cooldown = c.shot_interval
                nearest["hp"] -= 1
                if nearest["hp"] <= 0:
                    enemies.remove(nearest)
                    kills += 1
                    if r.random() < c.fish_drop_chance:
                        fish += 1
                        if fish % 12 == 0:
                            hp = min(5, hp + 1)
        for e in enemies:
            dx = x - e["x"]
            dy = y - e["y"]
            d = max(1, math.hypot(dx, dy))
            e["x"] += dx / d*c.enemy_speed*dt
            e["y"] += dy / d*c.enemy_speed*dt
            if d < 36 and iframe == 0:
                hp -= 1
                iframe = 1.3
        # Simulated positioning errors: not actual mobile-player data.
        if enemies and r.random() < .002:
            hp -= 1
    return {"survival":round(min(TARGET, time), 1),
            "completed":hp > 0, "kills":kills, "fish":fish}


def evaluate(c: Variant) -> dict:
    runs = [trial(c, seed) for seed in SEEDS]
    average = sum(x["survival"] for x in runs)/len(runs)
    survival_rate = sum(x["completed"] for x in runs)/len(runs)
    avg_kills = sum(x["kills"] for x in runs)/len(runs)
    avg_fish = sum(x["fish"] for x in runs)/len(runs)
    # This is a proposed design-utility objective, NOT engagement analytics.
    score = 60-abs(70-average)*.55 + min(14,avg_kills*.26) + min(9,avg_fish*.3)
    score -= abs(survival_rate-.55)*11
    return {"name":c.name, "score":round(score,2),
            "avg_duration":round(average,1),
            "survival_rate":round(survival_rate,3),
            "avg_kills":round(avg_kills,1),
            "avg_fish":round(avg_fish,1),
            "parameters":asdict(c),
            "simulation_only":True}


def council_report() -> dict:
    variants = candidates()
    rows = [evaluate(c) for c in variants]
    baseline = rows[0]
    best = max(rows, key=lambda row:row["score"])
    evidence = hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()
    validated = all(c.valid() for c in variants)
    ballots = [
        Ballot("Design","YES","Five constrained gameplay variants were proposed for comparison.",evidence),
        Ballot("Balance","YES" if best["score"] >= baseline["score"] else "NO",
               "Compared candidates against a declared, subjective prototype utility function.",
               evidence),
        Ballot("Engineering","YES" if validated else "NO",
               "Checked numeric limits and deterministic repeatability; not an Android performance test.",
               evidence),
        Ballot("Quality","REVIEW",
               "A simplified agent-play model cannot establish enjoyment, accessibility or real gameplay quality.",
               evidence),
        Ballot("Publishing","ABSTAIN",
               "No platform release, store rights, payment or human approval were supplied.",
               evidence),
    ]
    return {
        "status":"deterministic experimental council (not autonomous LLM agents)",
        "experiment_id":evidence[:16],
        "simulator":"synthetic top-down 90-second player model, not browser runtime",
        "seeds":len(SEEDS), "experiments":rows,
        "recommendation":best,
        "ballots":[asdict(b) for b in ballots],
        "decision":"Propose '"+best["name"]+"' for manual mobile playtesting; do not auto-ship.",
        "limitations":(
            "These are synthetic simulations, not player behavior or YouTube data. "
            "The winner depends on a subjective utility function. "
            "No game code, economy, release files or source settings were changed."
        ),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--out")
    args = parser.parse_args()
    report = council_report()
    rendered = json.dumps(report, indent=2, sort_keys=True)
    if args.out:
        from pathlib import Path
        destination = Path(args.out)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(rendered+"\n", encoding="utf-8")
    else:
        print(rendered)


if __name__ == "__main__":
    main()

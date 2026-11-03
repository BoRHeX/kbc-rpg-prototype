"""KBC Oracle Lab v0: a deterministic, bounded knowledge-transfer experiment.

No LLM calls, money, XP or arbitrary rewards. This is a *test harness*, not a
validated general definition of individual KBC.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from dataclasses import dataclass, field
from typing import Any


def digest(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Rule:
    premise: str
    conclusion: str


@dataclass
class Agent:
    name: str
    observations: set[str] = field(default_factory=set)
    known: set[str] = field(default_factory=set)
    proofs: dict[str, dict] = field(default_factory=dict)


class OracleLab:
    """Authoritative simulation core; the Oracle is the *reference*, not a player."""

    def __init__(self, agents: dict[str, set[str]] | None = None):
        # Explicitly bounded synthetic domain, independently specified.
        self.facts = {"switch_closed", "circuit_complete", "lamp_powered"}
        self.rules = (
            Rule("switch_closed", "circuit_complete"),
            Rule("circuit_complete", "lamp_powered"),
        )
        self.genesis = "K=1 (simulation reference convention)"
        self.agents = {
            name: Agent(name, set(initial), set(initial))
            for name, initial in (agents or {
                "Explorer": {"switch_closed"},
                "Researcher": set(),
            }).items()
        }
        if not self.agents:
            raise ValueError("At least one agent required")
        for agent in self.agents.values():
            if not agent.known <= self.facts:
                raise ValueError("Initial observations outside reference universe")
            for fact in agent.known:
                agent.proofs[fact] = {"rule": "OBSERVED", "premises": [], "source": "initial"}
        self.events: list[dict] = []
        self.step = 0
        self._log("initialize", {"agents": sorted(self.agents), "universe": sorted(self.facts)})

    @property
    def oracle_kbc(self) -> float:
        return 1.0

    def score(self, name: str) -> float:
        """PROVISIONAL metric: verified fact coverage in this finite fixture."""
        agent = self.agents[name]
        return len(agent.known & self.facts) / len(self.facts)

    def _log(self, event: str, details: dict) -> None:
        prev = self.events[-1]["hash"] if self.events else "GENESIS"
        record = {"step": self.step, "event": event, "details": details, "previous": prev}
        record["hash"] = digest(record)
        self.events.append(record)

    def verify_history(self) -> bool:
        prev = "GENESIS"
        for entry in self.events:
            base = {k: entry[k] for k in ("step", "event", "details", "previous")}
            if entry["previous"] != prev or entry["hash"] != digest(base):
                return False
            prev = entry["hash"]
        return True

    def infer(self, name: str) -> list[str]:
        agent = self.agents[name]
        derived = []
        changed = True
        while changed:
            changed = False
            for rule in self.rules:
                if rule.premise in agent.known and rule.conclusion not in agent.known:
                    # Evidence is an explicit, checkable derivation, not an LLM assertion.
                    agent.known.add(rule.conclusion)
                    agent.proofs[rule.conclusion] = {
                        "rule": "IMPLICATION",
                        "premises": [rule.premise],
                        "source": self.rules.index(rule),
                    }
                    self.step += 1
                    self._log("derive", {"agent": name, "fact": rule.conclusion,
                                         "premise": rule.premise, "kbc": self.score(name)})
                    derived.append(rule.conclusion)
                    changed = True
        return derived

    def communicate(self, sender: str, receiver: str, fact: str, enabled: bool = True) -> bool:
        if sender not in self.agents or receiver not in self.agents:
            raise KeyError("Unknown agent")
        if fact not in self.agents[sender].known:
            raise ValueError("Agent cannot transmit unknown knowledge")
        self.step += 1
        if not enabled:
            self._log("communication_blocked", {"from": sender, "to": receiver, "fact": fact})
            return False
        target = self.agents[receiver]
        was_new = fact not in target.known
        if was_new:
            target.known.add(fact)
            target.proofs[fact] = {
                "rule": "RECEIVED",
                "premises": [],
                "source": sender,
                "sender_proof": copy.deepcopy(self.agents[sender].proofs[fact]),
            }
        self._log("communicate", {"from": sender, "to": receiver, "fact": fact,
                                   "new": was_new, "recipient_kbc": self.score(receiver)})
        return was_new

    def verify_agent(self, name: str) -> bool:
        """Check current proof graph against fixture rules; reject unsupported claims."""
        a = self.agents[name]
        if set(a.proofs) != a.known or not a.known <= self.facts:
            return False
        for fact, proof in a.proofs.items():
            if proof["rule"] == "OBSERVED":
                if proof["source"] != "initial" or fact not in a.observations:
                    return False
            elif proof["rule"] == "IMPLICATION":
                premise = proof["premises"]
                if len(premise) != 1 or Rule(premise[0], fact) not in self.rules:
                    return False
                if premise[0] not in a.known:
                    return False
            elif proof["rule"] == "RECEIVED":
                source = proof["source"]
                if source not in self.agents or fact not in self.agents[source].known:
                    return False
                if not proof.get("sender_proof"):
                    return False
            else:
                return False
        return True

    def snapshot(self) -> "OracleLab":
        """Independent experimental branch; changes never affect its parent."""
        return copy.deepcopy(self)

    def report(self) -> dict:
        return {
            "oracle_kbc": self.oracle_kbc,
            "measurement": "provisional verified fixture coverage; NOT general KBC valuation",
            "step": self.step,
            "agents": {
                name: {"kbc": self.score(name), "known": sorted(agent.known),
                       "proofs": agent.proofs}
                for name, agent in self.agents.items()
            },
            "history_valid": self.verify_history(),
            "events": self.events,
        }


def experiment() -> dict:
    base = OracleLab()
    base.infer("Explorer")
    control = base.snapshot()
    treatment = base.snapshot()
    control.communicate("Explorer", "Researcher", "switch_closed", enabled=False)
    control.infer("Researcher")
    treatment.communicate("Explorer", "Researcher", "switch_closed", enabled=True)
    treatment.infer("Researcher")
    return {
        "hypothesis": "Communication enables new demonstrable knowledge at receiver",
        "control": control.report(),
        "treatment": treatment.report(),
        "receiver_gain": treatment.score("Researcher") - control.score("Researcher"),
        "sender_loss": control.score("Explorer") - treatment.score("Explorer"),
        "note": "The universe and inference rules are synthetic; outcomes test the implementation, not real-world KBC.",
    }


def main():
    parser = argparse.ArgumentParser(description="Run free deterministic Oracle experiment")
    parser.add_argument("--output", help="Optional JSON report filename")
    args = parser.parse_args()
    result = experiment()
    rendered = json.dumps(result, indent=2, sort_keys=True)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as file:
            file.write(rendered + "\n")
        print(f"Wrote {args.output}")
    else:
        print(rendered)


if __name__ == "__main__":
    main()

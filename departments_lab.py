"""KBC Department Council v0: reproducible local experiments, not actual autonomous AI.
Run: python departments_lab.py
Uses oracle_lab.py; no network, accounts, advertising, or paid API calls.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from typing import Any

from oracle_lab import OracleLab


def canonical_hash(value: Any) -> str:
    body = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Evidence:
    id: str
    claim: str
    kind: str
    payload: dict


@dataclass(frozen=True)
class Position:
    department: str
    vote: str
    argument: str
    evidence_ids: tuple[str, ...]
    reservation: str


class CouncilLab:
    """A meeting produces a research decision, never knowledge or currency."""

    DEPARTMENTS = ("Research", "Engineering", "Audit", "Economics", "Media")

    def __init__(self) -> None:
        self.events: list[dict] = []

    def record(self, event: str, payload: dict) -> None:
        previous = self.events[-1]["hash"] if self.events else "GENESIS"
        entry = {"event": event, "payload": payload, "previous": previous}
        entry["hash"] = canonical_hash(entry)
        self.events.append(entry)

    def history_valid(self) -> bool:
        previous = "GENESIS"
        for entry in self.events:
            raw = {key: entry[key] for key in ("event", "payload", "previous")}
            if entry["previous"] != previous or canonical_hash(raw) != entry["hash"]:
                return False
            previous = entry["hash"]
        return True

    @staticmethod
    def communication_trial(enabled: bool) -> dict:
        lab = OracleLab()
        lab.infer("Explorer")
        before_sender = lab.score("Explorer")
        transmitted = lab.communicate(
            "Explorer", "Researcher", "switch_closed", enabled=enabled
        )
        lab.infer("Researcher")
        return {
            "communication_enabled": enabled,
            "transmitted": transmitted,
            "recipient_coverage": lab.score("Researcher"),
            "sender_coverage": lab.score("Explorer"),
            "sender_before": before_sender,
            "history_valid": lab.verify_history(),
            "proofs_valid": all(lab.verify_agent(name) for name in lab.agents),
            "event_count": len(lab.events),
        }

    def observe(self) -> Evidence:
        control = self.communication_trial(False)
        treatment = self.communication_trial(True)
        repeat = self.communication_trial(True)
        metrics = {
            "control": control,
            "treatment": treatment,
            "receiver_gain": round(
                treatment["recipient_coverage"] - control["recipient_coverage"], 10
            ),
            "sender_loss": round(
                control["sender_coverage"] - treatment["sender_coverage"], 10
            ),
            "reproducible": treatment == repeat,
            "world": "three synthetic circuit facts and two implication rules",
            "metric": "fixture coverage, not universal KBC valuation",
        }
        evidence_id = canonical_hash(metrics)
        evidence = Evidence(
            id=evidence_id,
            claim="Knowledge may spread without subtracting knowledge from its sender",
            kind="bounded-simulation",
            payload=metrics,
        )
        self.record("experiment", {"evidence": asdict(evidence)})
        return evidence

    def deliberate(self, evidence: Evidence) -> list[Position]:
        p = evidence.payload
        checked = all(
            p[key]["history_valid"] and p[key]["proofs_valid"]
            for key in ("control", "treatment")
        )
        useful = checked and p["reproducible"] and p["receiver_gain"] > 0
        nonrival = checked and p["sender_loss"] == 0
        positions = [
            Position("Research", "yes" if useful else "no",
                     "Observed a measurable receiver gain under the communication treatment."
                     if useful else "The experiment does not establish the proposed effect.",
                     (evidence.id,),
                     "Only establishes behavior inside the three-fact fixture."),
            Position("Engineering", "yes" if checked and p["reproducible"] else "no",
                     "Replay and local proof checks pass." if checked and p["reproducible"]
                     else "Verification or repeatability is insufficient.",
                     (evidence.id,),
                     "Existing proof-checking code still needs independent adversarial review."),
            Position("Audit", "yes" if nonrival else "no",
                     "Sender's fixture coverage remains constant." if nonrival
                     else "A no-loss claim is unsupported.",
                     (evidence.id,),
                     "Hash-linked logs are not protection against privileged rewriting."),
            Position("Economics", "abstain",
                     "No real-world production cost, revenue, or allocation measurements.",
                     (evidence.id,),
                     "No conclusion about currency or economic viability."),
            Position("Media", "abstain",
                     "No genuine human audience observations were collected.",
                     (evidence.id,),
                     "No conclusion about content demand or YouTube monetization."),
        ]
        for position in positions:
            self.record("argument-and-vote", {"position": asdict(position)})
        return positions

    def meeting(self) -> dict:
        evidence = self.observe()
        positions = self.deliberate(evidence)
        votes = {value: sum(p.vote == value for p in positions)
                 for value in ("yes", "no", "abstain")}
        approved = all(
            p.vote == "yes" for p in positions if p.department in
            {"Research", "Engineering", "Audit"}
        )
        decision = "approve-next-bounded-experiment" if approved else "revise-and-retest"
        self.record("decision", {"decision": decision, "vote_counts": votes})
        return {
            "status": "offline deterministic agents; not AI deliberation",
            "proposal": "Should the KBC laboratory test knowledge diffusion in a larger world?",
            "evidence": asdict(evidence),
            "positions": [asdict(p) for p in positions],
            "vote_counts": votes,
            "decision": decision,
            "limitations": [
                "A vote does not determine truth or mint KBC.",
                "The Oracle is a reference/verifier, not a voting participant.",
                "No real-world economic forecasts or audience analytics were used.",
                "No external publishing, fabricated engagement or identity impersonation.",
            ],
            "history_valid": self.history_valid(),
            "events": self.events,
        }


if __name__ == "__main__":
    print(json.dumps(CouncilLab().meeting(), indent=2, sort_keys=True))

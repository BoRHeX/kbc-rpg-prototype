"""KBC City v0: inspectable, bounded multi-agent knowledge simulation.

The Oracle has reference value 1 within a *defined finite simulation*.
Resident KBC is a PROVISIONAL coverage metric, not the final KBC theory.
The deterministic core makes experimental results reproducible without an API.
"""
from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import dataclass, field

from oracle_lab import OracleLab

WIDTH, HEIGHT = 12, 9
PLACES = {
    "Oracle": {"x": 1, "y": 1, "color": "#9874f0", "description": "Reference and observation"},
    "Library": {"x": 5, "y": 1, "color": "#60b7c8", "description": "Verifiable observations"},
    "Workshop": {"x": 9, "y": 1, "color": "#e7ab63", "description": "Derivation and application"},
    "Forum": {"x": 6, "y": 5, "color": "#72bd9d", "description": "Knowledge exchange"},
    "Residence": {"x": 2, "y": 7, "color": "#8496b2", "description": "Private perspective"},
}
START = (
    ("Explorer", "Explorer", (2, 7)),
    ("Researcher", "Researcher", (5, 5)),
    ("Engineer", "Engineer", (10, 7)),
    ("Archivist", "Archivist", (4, 7)),
    ("Critic", "Critic", (10, 5)),
)


def digest(record: dict) -> str:
    return hashlib.sha256(
        json.dumps(record, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()


@dataclass
class Resident:
    name: str
    role: str
    x: int
    y: int
    goal: str = "Residence"
    known: set[str] = field(default_factory=set)
    proofs: dict[str, dict] = field(default_factory=dict)
    memory: list[str] = field(default_factory=list)

    def position(self):
        return [self.x, self.y]


class KBCCity:
    def __init__(self, branch: str = "genesis", count: int = 5):
        fixture = OracleLab({"fixture": set()})
        self.facts = frozenset(fixture.facts)
        self.rules = tuple(fixture.rules)
        self.branch = branch
        self.tick = 0
        if count < 2 or count > 50:
            raise ValueError("City population must be between 2 and 50")
        definitions = list(START)
        for number in range(len(definitions) + 1, count + 1):
            definitions.append(
                (f"Resident {number:02d}", "Researcher",
                 ((number * 7) % WIDTH, (number * 3) % HEIGHT))
            )
        self.residents = {
            name: Resident(name, role, *pos) for name, role, pos in definitions[:count]
        }
        self.events: list[dict] = []
        self.timeline: list[dict] = []
        self._emit("genesis", residents={
            name: {"role": r.role, "position": r.position()}
            for name, r in self.residents.items()
        }, facts=sorted(self.facts), rules=[
            {"premise": r.premise, "conclusion": r.conclusion} for r in self.rules
        ])
        # Initial observation belongs to Explorer's restricted history, not Oracle's KBC.
        self._observe("Explorer", "switch_closed", source="initial")
        self._record_timeline()

    @property
    def oracle_kbc(self):
        return 1.0

    def kbc(self, name: str) -> float:
        return len(self.residents[name].known & self.facts) / len(self.facts)

    def _emit(self, event: str, **data):
        prev = self.events[-1]["hash"] if self.events else "GENESIS"
        body = {"id": len(self.events), "tick": self.tick,
                "type": event, "data": data, "previous": prev}
        body["hash"] = digest(body)
        self.events.append(body)
        agent = data.get("agent")
        if agent in self.residents:
            self.residents[agent].memory.append(
                f"T{self.tick} {event}: " +
                json.dumps({k: v for k, v in data.items() if k != "agent"}, sort_keys=True)
            )
            self.residents[agent].memory = self.residents[agent].memory[-40:]

    def _record_timeline(self):
        self.timeline.append({
            "tick": self.tick,
            "scores": {name: round(self.kbc(name), 6) for name in self.residents},
            "knowledge_blocks": len(set().union(*(a.known for a in self.residents.values()))),
        })

    def _observe(self, name: str, fact: str, source: str) -> bool:
        if name not in self.residents or fact not in self.facts:
            raise ValueError("Unknown agent or fact")
        if source not in ("initial", "library"):
            raise ValueError("Untrusted observation source")
        r = self.residents[name]
        if source == "initial" and (self.tick != 0 or name != "Explorer"):
            raise ValueError("Genesis observation is only for Explorer")
        if source == "library" and (r.x, r.y) != (PLACES["Library"]["x"], PLACES["Library"]["y"]):
            raise ValueError("Agent must visit the Library to observe")
        if fact != "switch_closed":
            raise ValueError("Only switch_closed is directly observable in this fixture")
        if fact in r.known:
            return False
        r.known.add(fact)
        r.proofs[fact] = {"kind": "observation", "source": source}
        self._emit("observe", agent=name, fact=fact, source=source, kbc=self.kbc(name))
        return True

    def infer(self, name: str) -> str | None:
        agent = self.residents[name]
        if (agent.x, agent.y) != (PLACES["Workshop"]["x"], PLACES["Workshop"]["y"]):
            raise ValueError("Derivations take place at the Workshop in v0")
        for rule in self.rules:
            if rule.premise in agent.known and rule.conclusion not in agent.known:
                agent.known.add(rule.conclusion)
                agent.proofs[rule.conclusion] = {
                    "kind": "derivation", "premise": rule.premise
                }
                self._emit("derive", agent=name, fact=rule.conclusion,
                           premise=rule.premise, kbc=self.kbc(name))
                return rule.conclusion
        return None

    def share(self, sender: str, receiver: str, fact: str) -> bool:
        if sender == receiver or sender not in self.residents or receiver not in self.residents:
            raise ValueError("Two distinct existing agents required")
        a, b = self.residents[sender], self.residents[receiver]
        forum = (PLACES["Forum"]["x"], PLACES["Forum"]["y"])
        if (a.x, a.y) != forum or (b.x, b.y) != forum:
            raise ValueError("Both agents must be in the Forum")
        if fact not in a.known or fact not in self.facts:
            raise ValueError("Sender must know a verified reference fact")
        if fact in b.known:
            return False
        b.known.add(fact)
        b.proofs[fact] = {
            "kind": "received", "from": sender,
            "sender_proof": copy.deepcopy(a.proofs[fact]),
        }
        self._emit("share", agent=sender, receiver=receiver, fact=fact,
                   sender_kbc=self.kbc(sender), receiver_kbc=self.kbc(receiver))
        b.memory.append(f"T{self.tick} received {fact} from {sender}")
        b.memory = b.memory[-40:]
        return True

    def _move(self, name: str, destination: str) -> bool:
        if destination not in PLACES:
            raise ValueError("Unknown destination")
        resident = self.residents[name]
        resident.goal = destination
        target = PLACES[destination]
        old = resident.position()
        if resident.x != target["x"]:
            resident.x += 1 if resident.x < target["x"] else -1
        elif resident.y != target["y"]:
            resident.y += 1 if resident.y < target["y"] else -1
        if old == resident.position():
            return False
        self._emit("move", agent=name, origin=old,
                   destination=resident.position(), place=destination)
        return True

    def _at(self, name: str, place: str) -> bool:
        a = self.residents[name]
        return (a.x, a.y) == (PLACES[place]["x"], PLACES[place]["y"])

    def observation_for(self, name: str) -> dict:
        """Agent-limited observation. Never reveal hidden Oracle fixture proofs."""
        a = self.residents[name]
        return {
            "name": name, "role": a.role, "tick": self.tick,
            "position": a.position(), "goal": a.goal,
            "known": sorted(a.known), "kbc": self.kbc(name),
            "places": list(PLACES),
            "others_visible_at_forum": [
                b.name for b in self.residents.values()
                if b.name != name and b.position() == a.position() and self._at(name, "Forum")
            ],
            "memory": a.memory[-6:],
            "permitted_actions": ["travel", "study", "derive", "share", "wait"],
        }

    def default_action(self, name: str) -> dict:
        """Simple deterministic resident policy; NOT an LLM."""
        a = self.residents[name]
        if self._at(name, "Forum"):
            for other in self.residents.values():
                if other.name == name or not self._at(other.name, "Forum"):
                    continue
                for fact in sorted(a.known):
                    if fact not in other.known:
                        return {"action": "share", "receiver": other.name, "fact": fact}
        if "switch_closed" not in a.known:
            target = "Forum" if a.role in ("Researcher", "Critic") and self.tick < 16 else "Library"
            return {"action": "travel", "destination": target} if not self._at(name, target) else (
                {"action": "study"} if target == "Library" else {"action": "wait"}
            )
        # Explorer visits the Forum early to make the communication experiment observable.
        if a.role == "Explorer" and self.tick < 14:
            return {"action": "travel", "destination": "Forum"} if not self._at(name, "Forum") else {"action": "wait"}
        if len(a.known) < len(self.facts):
            return {"action": "derive"} if self._at(name, "Workshop") else {
                "action": "travel", "destination": "Workshop"
            }
        return {"action": "travel", "destination": "Forum"} if not self._at(name, "Forum") else {"action": "wait"}

    def act(self, name: str, command: dict) -> dict:
        """All policy proposals pass a narrow authorization boundary."""
        if name not in self.residents:
            raise ValueError("Unknown agent")
        if not isinstance(command, dict):
            raise ValueError("Command must be an object")
        action = command.get("action")
        if action == "travel":
            destination = command.get("destination")
            if not isinstance(destination, str) or destination not in PLACES:
                raise ValueError("Invalid destination")
            moved = self._move(name, destination)
            return {"action": "travel", "moved": moved, "destination": destination}
        if action == "study":
            if not self._at(name, "Library"):
                raise ValueError("Study requires the Library")
            return {"action": "study", "learned": self._observe(name, "switch_closed", "library")}
        if action == "derive":
            fact = self.infer(name)
            return {"action": "derive", "learned": fact}
        if action == "share":
            receiver, fact = command.get("receiver"), command.get("fact")
            if not isinstance(receiver, str) or not isinstance(fact, str):
                raise ValueError("Invalid share request")
            return {"action": "share", "shared": self.share(name, receiver, fact)}
        if action == "wait":
            return {"action": "wait"}
        raise ValueError("Unsupported action")

    def advance(self, steps: int = 1, policy=None) -> dict:
        if not isinstance(steps, int) or not 1 <= steps <= 20:
            raise ValueError("Steps must be 1..20")
        for _ in range(steps):
            self.tick += 1
            for name in list(self.residents):
                if policy is None:
                    instruction = self.default_action(name)
                else:
                    try:
                        instruction = policy(self.observation_for(name))
                    except Exception as exc:
                        instruction = {"action": "wait"}
                        self._emit("policy_error", agent=name, message=str(exc)[:160])
                try:
                    self.act(name, instruction)
                except (ValueError, TypeError) as exc:
                    self._emit("rejected", agent=name, reason=str(exc)[:160],
                               proposal=str(instruction)[:160])
            self._record_timeline()
        return self.state()

    def integrity_check(self) -> bool:
        """Replay all knowledge and movement from the hash-linked event log."""
        previous = "GENESIS"
        known = {name: set() for name in self.residents}
        position = {}
        for ev in self.events:
            body = {k: ev[k] for k in ("id", "tick", "type", "data", "previous")}
            if ev["previous"] != previous or digest(body) != ev["hash"]:
                return False
            previous = ev["hash"]
            kind, d = ev["type"], ev["data"]
            if kind == "genesis":
                position = {name: list(row["position"]) for name, row in d["residents"].items()}
                if set(position) != set(known):
                    return False
            elif kind == "move":
                if d["origin"] != position[d["agent"]] or not (
                    0 <= d["destination"][0] < WIDTH and 0 <= d["destination"][1] < HEIGHT
                ):
                    return False
                if abs(d["origin"][0] - d["destination"][0]) + abs(d["origin"][1] - d["destination"][1]) != 1:
                    return False
                position[d["agent"]] = d["destination"]
            elif kind == "observe":
                if d["fact"] != "switch_closed" or d["fact"] in known[d["agent"]]:
                    return False
                if d["source"] == "initial":
                    if d["agent"] != "Explorer" or ev["tick"] != 0:
                        return False
                elif d["source"] == "library":
                    if position[d["agent"]] != [PLACES["Library"]["x"], PLACES["Library"]["y"]]:
                        return False
                else:
                    return False
                known[d["agent"]].add(d["fact"])
            elif kind == "derive":
                if position[d["agent"]] != [PLACES["Workshop"]["x"], PLACES["Workshop"]["y"]]:
                    return False
                if d["premise"] not in known[d["agent"]] or (
                    d["premise"], d["fact"]
                ) not in {(rule.premise, rule.conclusion) for rule in self.rules}:
                    return False
                if d["fact"] in known[d["agent"]]:
                    return False
                known[d["agent"]].add(d["fact"])
            elif kind == "share":
                forum = [PLACES["Forum"]["x"], PLACES["Forum"]["y"]]
                if position[d["agent"]] != forum or position[d["receiver"]] != forum:
                    return False
                if d["fact"] not in known[d["agent"]] or d["fact"] in known[d["receiver"]]:
                    return False
                known[d["receiver"]].add(d["fact"])
        return all(known[name] == resident.known and
                   position[name] == resident.position()
                   for name, resident in self.residents.items())

    def state(self) -> dict:
        return {
            "branch": self.branch, "tick": self.tick, "oracle_kbc": 1,
            "reference_facts": sorted(self.facts), "reference_size": len(self.facts),
            "scoring": "PROVISIONAL: verified reference fact coverage / reference fact count",
            "places": PLACES, "map": {"width": WIDTH, "height": HEIGHT},
            "residents": [{
                "name": name, "role": r.role, "x": r.x, "y": r.y,
                "goal": r.goal, "kbc": round(self.kbc(name), 6),
                "known": sorted(r.known), "proofs": copy.deepcopy(r.proofs),
                "memory": r.memory[-10:],
            } for name, r in self.residents.items()],
            "timeline": self.timeline[-200:],
            "events": self.events[-70:],
            "integrity": self.integrity_check(),
        }

    def oracle_query(self, question: str, target: str = "Oracle") -> dict:
        question = question.strip()[:1000]
        if target != "Oracle" and target not in self.residents:
            raise ValueError("Unknown conversation target")
        if target != "Oracle":
            r = self.residents[target]
            # Deliberately not a simulated LLM reply. Distinguish observation from dialogue.
            response = (
                f"OFFLINE PERSPECTIVE — I am {r.name}, {r.role}. "
                f"My known facts: {', '.join(sorted(r.known)) or 'none'}. "
                f"My current reference coverage is {self.kbc(target):.3f}. "
                "For generative conversation, configure a model API."
            )
        elif any(word in question.lower() for word in ("why", "how", "proof", "derive")):
            response = (
                "The fixture has three facts and two implications: switch_closed -> "
                "circuit_complete -> lamp_powered. Study gives one verified observation; "
                "workshop derivation and forum transfer preserve provenance. "
                "These are synthetic rules, not a general proof of KBC."
            )
        elif any(word in question.lower() for word in ("who", "agent", "value", "kbc")):
            scores = ", ".join(f"{name}: {self.kbc(name):.3f}" for name in self.residents)
            response = f"Oracle reference KBC=1. Provisional individual coverage: {scores}."
        else:
            response = (
                f"This bounded simulation has {len(self.facts)} reference facts, "
                f"{len(self.residents)} residents, {self.tick} ticks and "
                f"{len(self.events)} recorded events. Ask how knowledge was derived, "
                "or which agents have the highest coverage."
            )
        self._emit("chat", target=target, question=question, answer=response)
        return {"target": target, "reply": response, "mode": "offline-reference"}

    def fork(self, name: str) -> "KBCCity":
        branch = copy.deepcopy(self)
        branch.branch = name
        branch._emit("fork", parent=self.branch, child=name)
        return branch


class CityManager:
    def __init__(self, population: int = 5):
        self.branches = {"genesis": KBCCity(count=population)}
        self.active = "genesis"

    @property
    def city(self):
        return self.branches[self.active]

    def fork(self, name: str) -> dict:
        if not isinstance(name, str) or not name or len(name) > 40:
            raise ValueError("Branch name must be 1..40 characters")
        if not all(ch.isalnum() or ch in "-_" for ch in name):
            raise ValueError("Branch names may use only letters, numbers, - and _")
        if name in self.branches:
            raise ValueError("Branch already exists")
        if len(self.branches) >= 12:
            raise ValueError("Maximum 12 experimental branches")
        self.branches[name] = self.city.fork(name)
        self.active = name
        return self.report()

    def switch(self, name: str) -> dict:
        if name not in self.branches:
            raise ValueError("Unknown branch")
        self.active = name
        return self.report()

    def report(self) -> dict:
        return {"active": self.active, "branches": list(self.branches),
                "city": self.city.state()}

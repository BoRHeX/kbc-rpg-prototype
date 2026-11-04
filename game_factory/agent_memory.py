"""Persistent council identity, evidence and decision history (SQLite)."""
from __future__ import annotations
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

ROLES = {
    "researcher": "Investigate source code, gameplay and feedback; cite evidence.",
    "designer": "Propose mechanics and explain intended player experience.",
    "engineer": "Plan implementation and check technical constraints.",
    "implementer": "Edit reviewable Cataclysm game code with strict limits.",
    "critic": "Challenge design, mobile accessibility and assumptions.",
    "qa": "Review actual test evidence; never fabricate test outcomes.",
    "producer": "Coordinate decisions, review gates and educational changelog.",
}

class CouncilMemory:
    def __init__(self, path: str | Path):
        self.db = sqlite3.connect(str(path))
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
        PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS agents(
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL,
            charter TEXT NOT NULL,
            model TEXT NOT NULL,
            conversation_id TEXT,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS events(
            event_id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL REFERENCES agents(id),
            run_id TEXT NOT NULL,
            kind TEXT NOT NULL,
            payload TEXT NOT NULL,
            source_refs TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
        """)
        self.db.commit()

    def register(self, role: str, model: str, agent_id: str | None = None):
        if role not in ROLES or not model.strip():
            raise ValueError("Known role and model required")
        agent_id = agent_id or f"cataclysm.{role}"
        self.db.execute(
            "INSERT OR IGNORE INTO agents VALUES (?, ?, ?, ?, ?, ?)",
            (agent_id, role, ROLES[role], model, None, datetime.now(timezone.utc).isoformat()))
        self.db.commit()
        return agent_id

    def agent(self, agent_id: str) -> dict:
        row = self.db.execute("SELECT * FROM agents WHERE id=?", (agent_id,)).fetchone()
        if row is None:
            raise KeyError(agent_id)
        return dict(row)

    def set_conversation(self, agent_id: str, conversation_id: str):
        if not conversation_id.strip():
            raise ValueError("conversation ID required")
        if self.db.execute("UPDATE agents SET conversation_id=? WHERE id=?",
                           (conversation_id, agent_id)).rowcount != 1:
            raise KeyError(agent_id)
        self.db.commit()

    def record(self, agent_id: str, run_id: str, kind: str, payload: dict,
               source_refs: list[str] | None = None) -> str:
        self.agent(agent_id)
        if not run_id.strip() or not kind.strip() or not isinstance(payload, dict):
            raise ValueError("run ID, kind and object payload required")
        event_id = str(uuid4())
        self.db.execute(
            "INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?)",
            (event_id, agent_id, run_id, kind,
             json.dumps(payload, sort_keys=True), json.dumps(source_refs or []),
             datetime.now(timezone.utc).isoformat()))
        self.db.commit()
        return event_id

    def history(self, agent_id: str, limit: int = 50) -> list[dict]:
        self.agent(agent_id)
        if not 1 <= limit <= 500:
            raise ValueError("limit out of bounds")
        rows = self.db.execute(
            "SELECT * FROM events WHERE agent_id=? ORDER BY rowid DESC LIMIT ?",
            (agent_id, limit)).fetchall()
        return [{**dict(row), "payload": json.loads(row["payload"]),
                 "source_refs": json.loads(row["source_refs"])} for row in reversed(rows)]

    def close(self):
        self.db.close()

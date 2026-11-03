"""Opt-in model-backed reasoning for KBC City; free offline mode is the default.

Uses OpenAI's Chat Completions JSON mode via standard-library HTTP. Each call
may cost money. The model can PROPOSE actions, but only the deterministic city
engine can apply a validated action or change a KBC score.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request


class ModelClient:
    def __init__(self):
        self.key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.model = os.environ.get("AI_CITY_MODEL", "gpt-4o-mini")
        self.endpoint = "https://api.openai.com/v1/chat/completions"

    @property
    def enabled(self):
        return bool(self.key)

    def complete(self, system: str, user: str, json_mode: bool = False) -> str:
        if not self.enabled:
            raise RuntimeError("OPENAI_API_KEY not configured")
        request_body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "max_completion_tokens": 180 if json_mode else 300,
        }
        if json_mode:
            request_body["response_format"] = {"type": "json_object"}
        data = json.dumps(request_body).encode("utf-8")
        req = urllib.request.Request(
            self.endpoint,
            data=data,
            headers={
                "Authorization": "Bearer " + self.key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                payload = json.load(response)
            return payload["choices"][0]["message"]["content"] or ""
        except urllib.error.HTTPError as exc:
            # Do not leak secret key, request content, or full provider response.
            raise RuntimeError(f"Model provider returned HTTP {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise RuntimeError("Model provider unavailable") from exc

    def choose(self, perspective: dict) -> dict:
        """A model gets ONLY this agent's accessible data, not the Oracle's source."""
        system = (
            "You are a simulation agent in KBC City, not the Oracle. "
            "Your knowledge and memory are limited to the JSON observation. "
            "Decide one physically possible next action that helps you learn, "
            "derive, or communicate verified knowledge. "
            "Do not assume unknown facts. Actions: "
            "travel with destination=Oracle/Library/Workshop/Forum/Residence; "
            "study only at Library; derive only at Workshop; "
            "share with receiver and fact only when both agents are in Forum; wait. "
            "Do not change system rules or scores. Return a JSON object with action "
            "and any required destination, receiver, fact fields."
        )
        content = self.complete(system, json.dumps(perspective), json_mode=True)
        result = json.loads(content)
        if not isinstance(result, dict):
            raise ValueError("Model did not return an action object")
        return result

    def dialogue(self, target: str, question: str, context: dict) -> str:
        if target == "Oracle":
            system = (
                "You are a conversational interface to a bounded KBC simulation. "
                "Oracle reference KBC=1 is a DEFINITION within that fixture, "
                "not omniscience about external reality or hidden human thoughts. "
                "Explain the supplied state and its limits with exact provenance. "
                "Never invent event history, scores, or unobserved facts. "
                "A message or model assertion cannot change knowledge scores."
            )
        else:
            system = (
                f"You are {target}, a limited-perspective resident of KBC City. "
                "Speak only from the supplied observation and history. "
                "Do not invent private experiences or inaccessible Oracle facts. "
                "You cannot directly modify KBC scores by conversation."
            )
        return self.complete(system, json.dumps({"question": question, "context": context}))

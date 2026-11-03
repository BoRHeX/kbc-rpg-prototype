"""Run KBC City in a phone browser: python city_app.py --host 0.0.0.0

Only expose a PRIVATE Codespaces forwarded port. No public-auth system exists.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import RLock
from urllib.parse import urlsplit

from city_ai import ModelClient
from city_sim import CityManager


class Runtime:
    def __init__(self, population: int = 5):
        self.manager = CityManager(population)
        self.model = ModelClient()
        self.lock = RLock()


def handler_factory(runtime: Runtime):
    index = Path(__file__).resolve().parent / "city_web" / "index.html"

    class Handler(BaseHTTPRequestHandler):
        server_version = "KBC-City/0.1"

        def send_json(self, data, status=200):
            contents = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(contents)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(contents)

        def do_GET(self):
            path = urlsplit(self.path).path
            if path == "/":
                body = index.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.end_headers()
                self.wfile.write(body)
                return
            with runtime.lock:
                if path == "/api/state":
                    result = runtime.manager.report()
                    result["ai"] = {"configured": runtime.model.enabled,
                                    "model": runtime.model.model if runtime.model.enabled else None}
                    self.send_json(result)
                    return
                if path == "/api/export":
                    result = runtime.manager.report()
                    result["city"]["full_events"] = runtime.manager.city.events
                    self.send_json(result)
                    return
            self.send_json({"error": "Not found"}, 404)

        def do_POST(self):
            path = urlsplit(self.path).path
            length = int(self.headers.get("Content-Length", "0"))
            if length > 4096 or length < 0:
                self.send_json({"error": "Request too large"}, 413)
                return
            try:
                payload = json.loads(self.rfile.read(length) or b"{}")
                if not isinstance(payload, dict):
                    raise ValueError("Expected JSON object")
                with runtime.lock:
                    manager = runtime.manager
                    if path == "/api/step":
                        mode = payload.get("mode", "scripted")
                        if mode not in ("scripted", "ai"):
                            raise ValueError("Unknown agent mode")
                        if mode == "ai" and not runtime.model.enabled:
                            raise ValueError("To use real model agents, set OPENAI_API_KEY")
                        steps = payload.get("steps", 1)
                        if not isinstance(steps, int) or steps > (1 if mode == "ai" else 20):
                            raise ValueError("AI mode permits one tick per request (potential paid calls)")
                        manager.city.advance(steps, runtime.model.choose if mode == "ai" else None)
                        result = manager.report()
                    elif path == "/api/branch":
                        result = manager.fork(payload.get("name"))
                    elif path == "/api/switch":
                        result = manager.switch(payload.get("name"))
                    elif path == "/api/act":
                        name, command = payload.get("agent"), payload.get("command")
                        if not isinstance(name, str):
                            raise ValueError("Select an agent")
                        action_result = manager.city.act(name, command)
                        manager.city._record_timeline()
                        result = manager.report()
                        result["action"] = action_result
                    elif path == "/api/chat":
                        target = payload.get("target", "Oracle")
                        question = payload.get("question", "")
                        if not isinstance(target, str) or not isinstance(question, str):
                            raise ValueError("Invalid message")
                        if not question.strip() or len(question) > 1000:
                            raise ValueError("Message must contain 1..1000 characters")
                        if payload.get("mode") == "ai":
                            if not runtime.model.enabled:
                                raise ValueError("To use model conversation, set OPENAI_API_KEY")
                            if target == "Oracle":
                                context = manager.city.state()
                                # Limit payload size; Oracle sees entire state in the engine,
                                # but the LLM context is a bounded excerpt.
                                context["events"] = context["events"][-25:]
                            else:
                                context = manager.city.observation_for(target)
                            reply = runtime.model.dialogue(target, question, context)
                            manager.city._emit("chat", target=target, question=question,
                                               answer=reply, mode="ai")
                            result = {"reply": reply, "target": target, "mode": "ai"}
                        else:
                            result = manager.city.oracle_query(question, target)
                        result["state"] = manager.report()
                    else:
                        self.send_json({"error": "Not found"}, 404)
                        return
                    self.send_json(result)
            except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
                self.send_json({"error": str(exc)[:300]}, 400)
            except (RuntimeError, OSError) as exc:
                self.send_json({"error": str(exc)[:300]}, 502)

    return Handler


def main():
    parser = argparse.ArgumentParser(description="KBC City v0")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    parser.add_argument("--agents", type=int, default=5)
    args = parser.parse_args()
    runtime = Runtime(population=args.agents)
    server = ThreadingHTTPServer((args.host, args.port), handler_factory(runtime))
    print(f"KBC City: http://localhost:{args.port}")
    print("AI calls:", "enabled (paid API possible)" if runtime.model.enabled else "disabled (free scripted mode)")
    print("Keep your Codespaces port PRIVATE; this prototype has no public login.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

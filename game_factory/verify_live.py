"""Verify that Pages serves the exact accepted game, not just an HTTP 200 page."""
import hashlib
import json
import sys
import time
import urllib.request
from pathlib import Path

receipt = json.loads(Path(sys.argv[1]).read_text())
base = sys.argv[2].rstrip("/") + "/" + receipt["play_path"]
for attempt in range(12):
    try:
        for name, expected in receipt["files"].items():
            url = base + name + "?verify=" + receipt["run_id"]
            with urllib.request.urlopen(url, timeout=15) as response:
                actual = hashlib.sha256(response.read()).hexdigest()
            if actual != expected:
                raise ValueError("Deployed bytes do not match accepted " + name)
        print("LIVE VERIFIED", base, "run", receipt["run_id"])
        break
    except Exception as error:
        if attempt == 11:
            raise SystemExit("Live verification failed: " + str(error))
        time.sleep(5)

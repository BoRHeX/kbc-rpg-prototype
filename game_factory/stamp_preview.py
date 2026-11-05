"""Stamp the exact preview that will be tested and published, before browser QA."""
import argparse
import json
import re
from pathlib import Path


def stamp(directory: Path, run_id: str, source_sha: str = "") -> None:
    if not re.fullmatch(r"[0-9]+(?:-[0-9]+)?", run_id):
        raise ValueError("Run ID must be numeric, optionally followed by an attempt number")
    page = directory / "index.html"
    content = page.read_text()
    label = "AI PLAYTEST BUILD " + run_id

    def header(match):
        tag = re.sub(r'\sdata-run="[^"]*"', "", match[1])
        return tag[:-1] + ' data-run="' + label + '">' + label + match[2]

    content, count = re.subn(
        r'(<div\b[^>]*\bid="build-version"[^>]*>)[^<]*(</div>)', header, content)
    if count != 1:
        raise ValueError("Expected exactly one build-version element")
    # The boot handshake used to overwrite the publisher's label with an old run ID.
    content, count = re.subn(
        r"document\.getElementById\('build-version'\)\.textContent\s*=[^;]*;",
        "document.getElementById('build-version').textContent = "
        "document.getElementById('build-version').dataset.run + ' · CODE ' + build;",
        content,
    )
    if count != 1:
        raise ValueError("Expected exactly one runtime build label")
    content = re.sub(
        r'((?:src|href)=["\'])(\./)?(game\.(?:js|css))(?:\?[^"\']*)?(["\'])',
        lambda m: m[1] + (m[2] or "") + m[3] + "?build=" + run_id + m[4],
        content,
    )
    page.write_text(content)
    (directory / "BUILD_INFO.json").write_text(json.dumps({
        "run_id": run_id, "source_sha": source_sha,
        "hardware_verification": "pending",
    }, indent=2) + "\n")
    (directory / "BUILD_INFO.txt").write_text(
        f"Run {run_id}\nSource {source_sha}\n"
        "Physical Samsung hardware verification: PENDING\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, default=Path("docs/preview"))
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--source-sha", default="")
    args = parser.parse_args()
    stamp(args.directory, args.run_id, args.source_sha)

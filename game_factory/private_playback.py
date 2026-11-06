"""Ephemeral Drive gameplay playback for the Studio's agent council.

The runner retrieves an explicitly requested, folder-verified video, transcribes
spoken gameplay commentary, and inspects four bursts of three consecutive frames.
Raw footage, transcript and JPEGs never enter the public repository or Actions
artifacts. A private /tmp JSON handoff is read by planning agents in this job.
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import tempfile
from pathlib import Path

import requests
from openai import OpenAI

FOLDER_ID = "1ARwayk85TIK4MibwwXTsdAm4EKjQAh0K"


def duration(file):
    output = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(file)], text=True,
        timeout=45)
    value = float(output.strip())
    if value <= 0 or value > 4 * 3600:
        raise RuntimeError("Invalid or exceptionally long video")
    return value


def get_access_token(session):
    response = session.post("https://oauth2.googleapis.com/token", data={
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "refresh_token": os.environ["GOOGLE_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }, timeout=40)
    response.raise_for_status()
    return response.json()["access_token"]


def make_gameplay_evidence(file_id):
    session = requests.Session()
    token = get_access_token(session)
    api = "https://www.googleapis.com/drive/v3/files/" + file_id
    headers = {"Authorization": "Bearer " + token}
    meta = session.get(api, headers=headers,
                       params={"fields": "id,name,mimeType,parents,size"}, timeout=45)
    meta.raise_for_status()
    info = meta.json()
    if (FOLDER_ID not in info.get("parents", []) or
            info.get("mimeType", "").split("/")[0] != "video" or
            not info.get("name", "").startswith("cataclysm__")):
        raise RuntimeError("Video outside authorized Cataclysm review folder")
    client = OpenAI()
    with tempfile.TemporaryDirectory(prefix="borhez-private-playback-") as temp:
        directory = Path(temp)
        media = directory / "gameplay.mp4"
        with session.get(api, headers=headers, params={"alt": "media"},
                         stream=True, timeout=(30, 240)) as stream:
            stream.raise_for_status()
            with media.open("wb") as out:
                for chunk in stream.iter_content(1024 * 1024):
                    if chunk:
                        out.write(chunk)
        seconds = duration(media)
        # Full audio for normal reviews, with bounded 40-minute protection.
        chunks = []
        for start in range(0, min(int(seconds) + 1, 2400), 480):
            mp3 = directory / ("voice-%05d.mp3" % start)
            subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error",
                            "-ss", str(start), "-t", "480", "-i", str(media),
                            "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k",
                            str(mp3)], check=True, timeout=200)
            if mp3.exists() and mp3.stat().st_size > 2000:
                with mp3.open("rb") as stream:
                    result = client.audio.transcriptions.create(
                        model="whisper-1", file=stream)
                chunks.append({"start_seconds": start,
                               "text": result.text})
            mp3.unlink(missing_ok=True)
        transcript = "\n".join(
            "[%ds] %s" % (p["start_seconds"], p["text"]) for p in chunks
        )[:34000]
        # Frame bursts are ordered triplets (rather than a sparse slideshow).
        # They provide motion context without exposing a private GIF publicly.
        items = [{"type": "text", "text": (
            "You are observing four short bursts of three sampled gameplay "
            "frames each. Distinguish observations from inference. "
            "Only report gameplay, on-screen text, mechanics and UI; no "
            "private identities or verbatim user speech.")}]
        timestamps = []
        for burst in (0.18, 0.38, 0.60, 0.82):
            for offset in (0, 0.45, 0.9):
                t = min(max(0, seconds - 0.2), seconds * burst + offset)
                jpg = directory / ("frame-%02d.jpg" % len(timestamps))
                subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error",
                                "-ss", str(t), "-i", str(media), "-frames:v", "1",
                                "-vf", "scale=480:-2", "-q:v", "6", str(jpg)],
                               check=True, timeout=60)
                data = base64.b64encode(jpg.read_bytes()).decode("ascii")
                items.append({"type": "text", "text": "Sample at %.2f seconds" % t})
                items.append({"type": "image_url", "image_url": {
                    "url": "data:image/jpeg;base64," + data, "detail": "low"}})
                timestamps.append(round(t, 2))
                jpg.unlink()
        result = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "system", "content": (
                "Observe actual game frames. Summarize specific timecoded "
                "gameplay facts, player/enemy motion only where the close bursts "
                "support it, UI interactions, visual feedback and ambiguities. "
                "Never invent movement between sampled frames. Do not extract "
                "private identity or speaker dialogue. Do not choose update features.")},
                {"role": "user", "content": items}],
            max_tokens=1800)
        observations = result.choices[0].message.content or ""
        output = {
            "source": "user-authorized ephemeral gameplay evidence",
            "duration_seconds": round(seconds, 2),
            "frame_times": timestamps,
            "transcript": transcript,
            "visual_observations": observations,
            "audio_coverage": "first 40 minutes" if seconds > 2400 else "entire recording",
            "sample_method": "four 3-frame bursts; not continuous video",
        }
        path = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "borhez_private_gameplay.json"
        path.write_text(json.dumps(output, ensure_ascii=False), encoding="utf-8")
        path.chmod(0o600)
        print("Private gameplay reviewed; transcript and 12 frames presented to "
              "Studio evidence analyst. No raw media or transcript uploaded.")


def main():
    source = Path("artifacts/mobile/job.json")
    if not source.exists():
        raise RuntimeError("Missing validated Studio job definition")
    job = json.loads(source.read_text())
    file_id = job["request"].get("evidence_drive_file_id")
    if not file_id:
        print("No private evidence requested; ordinary studio job.")
        return
    make_gameplay_evidence(file_id)


if __name__ == "__main__":
    main()

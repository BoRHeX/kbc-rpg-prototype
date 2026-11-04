"""BoRHeZ Games Studio: mobile control room and genuine media-production runner.

Python 3.11+. The app is private, token-protected, and never uploads public
videos. No fake engagement, fabricated analytics, or undeclared AI actions.
"""
from __future__ import annotations

import argparse
import hmac
import json
import os
import re
import secrets
import sqlite3
import subprocess
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parent
DATA = Path(os.getenv("STUDIO_DATA_DIR", str(BASE / ".data"))).resolve()
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / "studio.sqlite3"
TOKEN = os.getenv("STUDIO_TOKEN", "")
LOCK = threading.RLock()
STAGES = ["Intake", "Producer", "Editor", "Quality", "Packaging", "Publisher", "Analytics"]


def utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect():
    db = sqlite3.connect(DB, timeout=30)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    with connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL, assets TEXT NOT NULL, output TEXT,
                shorts TEXT NOT NULL DEFAULT '[]',
                made_for_kids INTEGER, demo INTEGER NOT NULL DEFAULT 0,
                youtube_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL,
                agent TEXT NOT NULL, action TEXT NOT NULL,
                note TEXT NOT NULL, created_at TEXT NOT NULL
            );
        """)


def job_row(row):
    if row is None:
        return None
    d = dict(row)
    d["assets"] = json.loads(d["assets"])
    d["shorts"] = json.loads(d["shorts"])
    d["demo"] = bool(d["demo"])
    d["made_for_kids"] = None if d["made_for_kids"] is None else bool(d["made_for_kids"])
    d["has_preview"] = bool(d["output"] and Path(d["output"]).is_file())
    d.pop("output", None)  # no server filesystem paths exposed
    return d


def read_job(job_id: str):
    with connect() as db:
        row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    return job_row(row)


def log(job_id, agent, action, note):
    with LOCK, connect() as db:
        db.execute("INSERT INTO events(job_id,agent,action,note,created_at) VALUES (?,?,?,?,?)",
                   (job_id, agent, action, str(note)[:600], utc()))


def change(job_id, **changes):
    allowed = {"title", "description", "status", "output", "shorts", "made_for_kids", "youtube_id"}
    if not set(changes).issubset(allowed):
        raise ValueError("Disallowed job update")
    if "shorts" in changes:
        changes["shorts"] = json.dumps(changes["shorts"])
    changes["updated_at"] = utc()
    keys = list(changes)
    with LOCK, connect() as db:
        db.execute("UPDATE jobs SET " + ",".join(k + "=?" for k in keys) +
                   " WHERE id=?", [changes[k] for k in keys] + [job_id])


def create_job(session_id, title, assets, demo=False):
    with LOCK, connect() as db:
        existing = db.execute("SELECT id FROM jobs WHERE session_id=?", (session_id,)).fetchone()
        if existing:
            return existing["id"], False
        job_id = secrets.token_hex(8)
        db.execute("""INSERT INTO jobs(id,session_id,title,status,assets,demo,created_at,updated_at)
                      VALUES (?,?,?,?,?,?,?,?)""",
                   (job_id, session_id, title[:100], "RECEIVED",
                    json.dumps(assets), int(demo), utc(), utc()))
    log(job_id, "Intake", "received", "Recording package discovered; preparing production")
    return job_id, True


class Drive:
    """Read-only Google Drive folder scanner. No file is shared publicly."""
    def __init__(self):
        cfg = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
        folder = os.getenv("DRIVE_ROOT_FOLDER_ID", "")
        if not cfg or not re.fullmatch(r"[A-Za-z0-9_-]+", folder):
            raise RuntimeError("Configure GOOGLE_SERVICE_ACCOUNT_JSON and DRIVE_ROOT_FOLDER_ID")
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        info = json.loads(cfg if cfg.lstrip().startswith("{") else Path(cfg).read_text())
        credentials = service_account.Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/drive.readonly"]
        )
        self.api = build("drive", "v3", credentials=credentials, cache_discovery=False)
        self.root = folder

    def children(self, folder_id, extra=""):
        all_files = []
        page = None
        while True:
            result = self.api.files().list(
                q=f"'{folder_id}' in parents and trashed = false" + extra,
                fields="nextPageToken,files(id,name,mimeType,size)",
                pageSize=100, pageToken=page, supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            ).execute()
            all_files.extend(result.get("files", []))
            page = result.get("nextPageToken")
            if not page:
                return all_files

    def sessions(self):
        folder_query = " and mimeType = 'application/vnd.google-apps.folder'"
        for folder in self.children(self.root, folder_query):
            files = {f["name"].lower(): f for f in self.children(folder["id"])}
            if "gameplay.mp4" in files and "mic.wav" in files:
                selected = {key: {"id": files[key]["id"], "name": files[key]["name"]}
                            for key in ("gameplay.mp4", "mic.wav", "gopro.mp4", "session.json")
                            if key in files}
                yield folder["id"], folder["name"], selected

    def download(self, file_id, dest: Path):
        from googleapiclient.http import MediaIoBaseDownload
        dest.parent.mkdir(parents=True, exist_ok=True)
        partial = dest.with_suffix(dest.suffix + ".part")
        with partial.open("wb") as file:
            reader = MediaIoBaseDownload(
                file, self.api.files().get_media(fileId=file_id, supportsAllDrives=True),
                chunksize=8 * 1024 * 1024,
            )
            done = False
            while not done:
                _, done = reader.next_chunk()
        partial.replace(dest)


def scan_drive():
    drive = Drive()
    discovered = []
    for folder_id, folder_name, assets in drive.sessions():
        job_id, new = create_job(folder_id, folder_name, assets)
        if new:
            discovered.append(job_id)
            if os.getenv("AUTO_PROCESS", "1") == "1":
                launch_process(job_id)
    return discovered


def has_stream(path: Path, kind: str) -> bool:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams",
                        "a" if kind == "audio" else "v", "-show_entries",
                        "stream=index", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True, timeout=30)
    return bool(r.stdout.strip())


def ffmpeg_render(gameplay: Path, mic: Path, gopro: Path | None,
                  settings: dict, target: Path):
    # Both audio and picture must be captured legitimately by the creator.
    target.parent.mkdir(parents=True, exist_ok=True)
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(gameplay)]
    if gopro:
        args += ["-i", str(gopro)]
    offset = max(-3600, min(3600, int(settings.get("mic_offset_ms", 0)) / 1000))
    args += ["-itsoffset", str(offset), "-i", str(mic)]
    mic_idx = 2 if gopro else 1
    if gopro:
        video = ("[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,"
                 "pad=1920:1080:(ow-iw)/2:(oh-ih)/2[base];"
                 "[1:v]scale=420:-2[cam];"
                 "[base][cam]overlay=W-w-28:H-h-28:eof_action=pass[v]")
    else:
        video = ("[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,"
                 "pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v]")
    if has_stream(gameplay, "audio"):
        audio = (f"[0:a]volume=0.38[game];[{mic_idx}:a]volume=1.35[voice];"
                 "[game][voice]amix=inputs=2:duration=first:dropout_transition=0[a]")
    else:
        audio = f"[{mic_idx}:a]volume=1.15[a]"
    cmd = args + ["-filter_complex", video + ";" + audio, "-map", "[v]",
                  "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast",
                  "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac",
                  "-b:a", "192k", "-movflags", "+faststart", str(target)]
    subprocess.run(cmd, check=True, timeout=6 * 3600)


def render_shorts(source: Path, settings: dict, target_dir: Path) -> list[str]:
    results = []
    for i, item in enumerate(settings.get("shorts", [])[:6]):
        if not isinstance(item, dict):
            continue
        start = float(item.get("start", 0))
        duration = float(item.get("duration", 0))
        if start < 0 or duration <= 0 or duration > 60:
            continue
        target = target_dir / f"short_{i + 1:02d}.mp4"
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
             "-ss", str(start), "-i", str(source), "-t", str(duration),
             "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,"
                    "crop=1080:1920", "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "24", "-c:a", "aac", "-movflags", "+faststart", str(target)],
            check=True, timeout=1800,
        )
        results.append(target.name)
    return results


def process(job_id: str):
    job = read_job(job_id)
    try:
        if not job or job["status"] != "RECEIVED":
            return
        change(job_id, status="PROCESSING")
        log(job_id, "Producer", "inventory", "Two required tracks: gameplay + microphone; GoPro optional")
        if job["demo"]:
            log(job_id, "Footage Analyst", "observation", "DEMO ONLY: no actual footage or highlights")
            log(job_id, "Editor", "mock", "DEMO ONLY: video rendering skipped")
            log(job_id, "Quality", "vote", "ABSTAIN: no real file to review")
            log(job_id, "Publisher", "blocked", "Demo cannot be uploaded to YouTube")
            change(job_id, status="DEMO")
            return

        drive = Drive()
        folder = DATA / "ingest" / job_id
        for name, item in job["assets"].items():
            drive.download(item["id"], folder / name)
            log(job_id, "Intake", "downloaded", name)
        settings = {}
        settings_file = folder / "session.json"
        if settings_file.exists():
            settings = json.loads(settings_file.read_text())
            if not isinstance(settings, dict):
                raise ValueError("session.json must contain a JSON object")
        log(job_id, "Footage Analyst", "brief",
            "Using session notes and explicit clip markers; AI has not viewed the footage")
        target_dir = DATA / "renders" / job_id
        output = target_dir / "episode.mp4"
        log(job_id, "Editor", "render", "Compositing gameplay, GoPro picture-in-picture and mic audio")
        ffmpeg_render(folder / "gameplay.mp4", folder / "mic.wav",
                      folder / "gopro.mp4" if (folder / "gopro.mp4").exists() else None,
                      settings, output)
        if output.stat().st_size < 1024:
            raise RuntimeError("Output file too small")
        shorts = render_shorts(output, settings, target_dir)
        log(job_id, "Quality", "vote", "PASS: render exists; human creative review still required")
        log(job_id, "Packaging", "draft", "Preparing editable title and description")
        game = str(settings.get("game", "Gaming"))[:60]
        title = f"{game} | {job['title']} - BoRHeZ Games"[:100]
        notes = str(settings.get("notes", "")).strip()
        description = (notes + "\n\n" if notes else "") + "Gameplay and commentary by BoRHeZ Games."
        change(job_id, status="REVIEW", title=title, description=description,
               output=str(output), shorts=shorts)
        log(job_id, "Publisher", "waiting", "Awaiting your approval; no YouTube action performed")
    except Exception as error:
        change(job_id, status="ERROR")
        log(job_id, "Producer", "failed", f"{type(error).__name__}: {error}")


def launch_process(job_id):
    threading.Thread(target=process, args=(job_id,), daemon=True).start()


def upload_private(job_id):
    job = read_job(job_id)
    if not job or job["demo"] or job["status"] != "APPROVED":
        raise ValueError("Only approved, real videos can be uploaded")
    if job["made_for_kids"] is None:
        raise ValueError("Made-for-kids selection is required")
    with connect() as db:
        row = db.execute("SELECT output FROM jobs WHERE id=?", (job_id,)).fetchone()
    source = Path(row["output"])
    if not source.is_file():
        raise FileNotFoundError("Rendered video missing")
    client_id, client_secret, refresh_token = (
        os.getenv("YOUTUBE_CLIENT_ID"), os.getenv("YOUTUBE_CLIENT_SECRET"),
        os.getenv("YOUTUBE_REFRESH_TOKEN")
    )
    if not all((client_id, client_secret, refresh_token)):
        raise RuntimeError("YouTube OAuth credentials are not configured")
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    credentials = Credentials(
        token=None, refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id, client_secret=client_secret,
        scopes=["https://www.googleapis.com/auth/youtube.upload"],
    )
    change(job_id, status="UPLOADING")
    log(job_id, "Publisher", "upload", "Uploading private video after explicit human approval")
    try:
        youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)
        media = MediaFileUpload(str(source), mimetype="video/mp4", resumable=True,
                                chunksize=8 * 1024 * 1024)
        request = youtube.videos().insert(
            part="snippet,status",
            body={"snippet": {"title": job["title"], "description": job["description"],
                              "categoryId": "20"},
                  "status": {"privacyStatus": "private",
                             "selfDeclaredMadeForKids": job["made_for_kids"]}},
            media_body=media,
        )
        response = None
        while response is None:
            _, response = request.next_chunk()
        video_id = response["id"]
        change(job_id, status="PRIVATE_ON_YOUTUBE", youtube_id=video_id)
        log(job_id, "Publisher", "completed",
            "Private upload complete; public publication remains a separate YouTube Studio action")
    except Exception as error:
        change(job_id, status="APPROVED")
        log(job_id, "Publisher", "failed", f"{type(error).__name__}: {error}")


def snapshot():
    with connect() as db:
        jobs = [job_row(x) for x in db.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100")]
        events = [dict(x) for x in db.execute(
            "SELECT * FROM events ORDER BY id DESC LIMIT 120")]
    return {
        "jobs": jobs, "events": events,
        "team": STAGES,
        "integrations": {
            "drive": bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") and
                          os.getenv("DRIVE_ROOT_FOLDER_ID")),
            "youtube": all(os.getenv(x) for x in (
                "YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN")),
            "auto_scan": int(os.getenv("AUTO_SCAN_SECONDS", "0")) > 0,
        },
        "mode": "REAL PIPELINE WITH OPTIONAL DEMO; NO LLM-BASED CLIP SELECTION",
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, obj, status=200, cookie=None):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def logged_in(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
        except Exception:
            return False
        value = cookie.get("studio_session")
        digest = hmac.new(TOKEN.encode(), b"borhez-studio-session", "sha256").hexdigest()
        return bool(value and hmac.compare_digest(value.value, digest))

    def body_json(self):
        size = int(self.headers.get("Content-Length", "0"))
        if size > 32768:
            raise ValueError("Request too large")
        raw = self.rfile.read(size) if size else b"{}"
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("Object expected")
        return data

    def static(self, name, mime):
        path = BASE / "web" / name
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy",
                         "default-src 'self'; style-src 'self'; script-src 'self'; "
                         "img-src 'self' data:; connect-src 'self'; media-src 'self'")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def stream_video(self, job_id):
        with connect() as db:
            row = db.execute("SELECT output FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not row or not row["output"] or not Path(row["output"]).is_file():
            self.send_error(404)
            return
        path = Path(row["output"])
        size = path.stat().st_size
        start, end = 0, size - 1
        header = self.headers.get("Range", "")
        if header:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", header)
            if not match:
                self.send_error(416)
                return
            a, b = match.groups()
            if not a:
                length = int(b or "0")
                start = max(0, size - length)
            else:
                start = int(a)
                if b:
                    end = min(size - 1, int(b))
            if start >= size or end < start:
                self.send_error(416)
                return
        self.send_response(206 if header else 200)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "private, no-store")
        self.send_header("Content-Length", str(end - start + 1))
        if header:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        with path.open("rb") as file:
            file.seek(start)
            remaining = end - start + 1
            while remaining:
                chunk = file.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/":
            return self.static("index.html", "text/html; charset=utf-8")
        if path == "/app.css":
            return self.static("app.css", "text/css; charset=utf-8")
        if path == "/app.js":
            return self.static("app.js", "text/javascript; charset=utf-8")
        if not self.logged_in():
            return self.send_json({"error": "Sign in with STUDIO_TOKEN"}, 401)
        if path == "/game":
            return self.static("game.html", "text/html; charset=utf-8")
        if path == "/game.css":
            return self.static("game.css", "text/css; charset=utf-8")
        if path == "/game.js":
            return self.static("game.js", "text/javascript; charset=utf-8")
        if path == "/factory-report.json":
            import sys
            result = subprocess.run(
                [sys.executable, str(BASE.parent / "game_factory" / "council.py"), "--json"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode:
                return self.send_json({"error": "Experiment runner failed"}, 500)
            return self.send_json(json.loads(result.stdout))
        if path == "/api/state":
            return self.send_json(snapshot())
        if re.fullmatch(r"/api/video/[a-f0-9]{16}", path):
            return self.stream_video(path.rsplit("/", 1)[-1])
        self.send_error(404)

    def do_POST(self):
        path = urlsplit(self.path).path
        if self.headers.get("Origin"):
            origin = self.headers["Origin"]
            host = self.headers.get("Host", "")
            if not origin.endswith("://" + host):
                return self.send_json({"error": "Invalid origin"}, 403)
        try:
            payload = self.body_json()
            if path == "/api/login":
                if not TOKEN or not hmac.compare_digest(str(payload.get("token", "")), TOKEN):
                    return self.send_json({"error": "Invalid token"}, 401)
                digest = hmac.new(TOKEN.encode(), b"borhez-studio-session", "sha256").hexdigest()
                secure = ("; Secure" if self.headers.get("X-Forwarded-Proto") == "https"
                          or self.headers.get("Host", "").endswith(".app.github.dev") else "")
                cookie = ("studio_session=" + digest +
                          "; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800" + secure)
                return self.send_json({"ok": True}, cookie=cookie)
            if not self.logged_in():
                return self.send_json({"error": "Sign in required"}, 401)
            if path == "/api/demo":
                job_id, _ = create_job("demo-" + secrets.token_hex(6),
                                      "Demo Gaming Session", {}, demo=True)
                launch_process(job_id)
                return self.send_json({"job_id": job_id, "demo": True})
            if path == "/api/scan":
                ids = scan_drive()
                return self.send_json({"discovered": len(ids), "job_ids": ids})
            match = re.fullmatch(r"/api/jobs/([a-f0-9]{16})/(run|approve|upload)", path)
            if not match:
                return self.send_json({"error": "Unknown action"}, 404)
            job_id, action = match.groups()
            job = read_job(job_id)
            if not job:
                return self.send_json({"error": "Unknown job"}, 404)
            if action == "run":
                if job["status"] != "RECEIVED":
                    raise ValueError("Only received jobs can start processing")
                launch_process(job_id)
                return self.send_json({"ok": True})
            if action == "approve":
                if job["demo"] or job["status"] != "REVIEW":
                    raise ValueError("A genuine rendered video must await review")
                if type(payload.get("made_for_kids")) is not bool:
                    raise ValueError("Select whether the content is made for kids")
                title = str(payload.get("title", "")).strip()
                desc = str(payload.get("description", "")).strip()
                if not title or len(title) > 100 or len(desc) > 4900:
                    raise ValueError("Valid title (1-100 chars) and description required")
                change(job_id, status="APPROVED", title=title, description=desc,
                       made_for_kids=int(payload["made_for_kids"]))
                log(job_id, "Creator", "approved",
                    "Metadata, ownership declaration and made-for-kids selection approved")
                return self.send_json({"ok": True})
            if action == "upload":
                if not payload.get("confirm_private_upload"):
                    raise ValueError("Confirm this specific private YouTube upload")
                if job["status"] != "APPROVED":
                    raise ValueError("Video must first be approved")
                threading.Thread(target=upload_private, args=(job_id,), daemon=True).start()
                return self.send_json({"started": True})
        except Exception as err:
            return self.send_json({"error": f"{type(err).__name__}: {err}"}, 400)

    def log_message(self, fmt, *args):
        # Do not log cookies, authorization headers, or recording paths.
        print("[%s] %s" % (utc(), fmt % args))


def periodic_scan(seconds):
    while True:
        try:
            scan_drive()
        except Exception as error:
            print("Drive scan:", type(error).__name__, str(error)[:250])
        time.sleep(seconds)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    options = parser.parse_args()
    if not TOKEN or len(TOKEN) < 24:
        raise SystemExit("Set STUDIO_TOKEN to at least 24 random characters")
    init_db()
    interval = int(os.getenv("AUTO_SCAN_SECONDS", "0"))
    if interval > 0:
        threading.Thread(target=periodic_scan, args=(max(60, interval),),
                         daemon=True).start()
    server = ThreadingHTTPServer((options.host, options.port), Handler)
    print(f"BoRHeZ Games Studio: http://{options.host}:{options.port}")
    print("Use your STUDIO_TOKEN in the login screen. Keep Codespaces Ports PRIVATE.")
    server.serve_forever()


if __name__ == "__main__":
    main()

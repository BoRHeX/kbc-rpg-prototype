# BoRHeZ Games Studio · v0

A private, mobile-first production control room for **original gaming recordings**.
Creator records gameplay, optional GoPro picture-in-picture, and a separate
microphone track; the server imports from a configured Google Drive folder,
composites footage with FFmpeg, shows real events on a phone, and holds completed
videos for **creator approval**.

**This is a real software prototype, not a completed autonomous AI production
company.** Department cards represent explicit code-driven stages. No model
has reviewed gameplay. Drive and YouTube require separate app credentials.
Descript/vidIQ ChatGPT connections do **not** automatically grant this server access.

## Phone-first quick start: GitHub Codespaces

The current source lives in a **separate feature branch** of the existing
`BoRHeX/kbc-rpg-prototype` repository because repository creation isn't exposed
by the connected GitHub tool. It does not modify KBC files on `main`.
Move the `studio/` directory into its own public/shareable repository once ready.

1. Open the repository on the `feature/borhez-games-studio-v0` branch.
2. On mobile GitHub, choose **Code → Codespaces → Create codespace on this branch**.
3. In the terminal, run:

```bash
export STUDIO_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
echo "Copy this private Studio access token: $STUDIO_TOKEN"
python studio/app.py --host 0.0.0.0 --port 8000
```

4. In Codespaces → **Ports**, open port **8000**, keep visibility **Private**.
5. The app opens in the phone browser. Paste the printed token to sign in.
6. Tap **Run demo**. This shows the event pipeline without claiming any real
   video editing or uploading. Then connect Drive for live footage.

`studio/.data/` is the persistent local state within the Codespace. Delete
the Codespace and its state is lost. Export anything important separately.
Codespaces can sleep or be suspended: this is **not** always-on hosting.
Private forwarded ports are required because this first app is not designed
for public multiuser access.

The devcontainer installs FFmpeg and optional Google API dependencies.
If running locally outside Codespaces, install them manually:

```bash
sudo apt-get install ffmpeg
pip install -r studio/requirements.txt
export STUDIO_TOKEN="<strong-random-private-secret>"
python studio/app.py
```

## Google Drive intake (not connected by default)

Create a Drive root folder called `Recordings`; create a subfolder for each
session. Inside each session, place:

```text
Recordings/
  GTA-001/
    gameplay.mp4       # required
    mic.wav            # required, separate spoken commentary
    gopro.mp4          # optional, shown as picture-in-picture
    session.json       # optional, documented below
```

The watcher ignores a folder until both required files are present.

For automatic read-only intake, create a Google Cloud service account with
Drive API enabled, then share **only the Recordings folder** with its service
account email as a Viewer. Keep the JSON credential private; it is **not**
your ChatGPT Google Drive connection.

In Codespaces Secrets (or your trusted cloud host environment), set:

- `GOOGLE_SERVICE_ACCOUNT_JSON`: contents of the service-account JSON key
  or path to a protected JSON file.
- `DRIVE_ROOT_FOLDER_ID`: ID of the Recordings folder.
- `AUTO_SCAN_SECONDS=300`: repeat scans every five minutes while the server runs.
- `AUTO_PROCESS=1`: start rendering newly detected complete packages.

Restart the app. **Scan Drive** is available for immediate testing.
Files are downloaded to server-local disk for processing (never into Git).

**Service-account note:** sharing may be restricted by your Google Workspace
policy. For a personal Drive, confirm that folder sharing to the service
account is permitted. If not, an OAuth-user adapter is the next option.

### Optional session.json

```json
{
  "game": "GTA",
  "notes": "My own first-person commentary and session description.",
  "mic_offset_ms": 0,
  "shorts": [
    {"start": 120, "duration": 35},
    {"start": 840, "duration": 45}
  ]
}
```

`mic_offset_ms` is applied to the separate mic track. Automatic audio
synchronization is **not implemented**. Make a recognizable sync clap at the
start of each recording or use matching timestamps. A GoPro video is an
overlay; by default the tracks are assumed to start together.

Only **explicitly marked** Shorts are rendered. Highlight discovery from the
recordings is not yet implemented; no part of this app should pretend it watched
the gameplay or identified its best moments.

## YouTube private upload (opt-in, not connected by default)

After a video is rendered, open Production on your phone, watch the preview,
edit its title and description, explicitly select whether it's made for kids,
and confirm your rights. Approve the video. A separate **Upload private**
button uploads it through an OAuth grant you configure. **No public upload
or scheduling is performed by this version.**

For YouTube upload, create your own Google Cloud OAuth client and obtain a
refresh token with YouTube upload scope for **the channel that you control**.
Set these environment variables on your private server:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

The code uses `youtube.upload` to send a **private** video. YouTube may place
restrictions on uploads from unverified API projects, and API quota/approval
requirements apply. Manage visibility or future publication in YouTube Studio.
Never commit credentials or expose this UI publicly.

## Workflow and implementation

- `app.py`: standard-library HTTP server, signed session cookie, SQLite
  job/event store, Drive scanner, FFmpeg composition, explicit approval,
  OAuth-backed private upload.
- `web/`: responsive control room with production queues, agent cards, events,
  browser video preview, phone navigation, approvals and connection status.
- `tests/`: authentication, demo isolation, job de-duplication and scanner.
- `studio/.data/`: private recordings, render outputs, database.
- `.github/workflows/borhez-games-tests.yml`: regression CI.

Stages represented in UI: Intake, Producer, Editor, Quality, Packaging,
Publisher, Analytics. All are rules-based in v0; analytics are explicitly
reserved/not connected. The Quality stage tests existence, **not creative
excellence**. The user makes the final editorial decision.

## Known limits

1. **No persistent cloud runtime yet.** Codespaces only works while awake.
2. **No semantic AI editing yet.** The FFmpeg editor is deterministic. It
   mixes mic/game audio and optionally overlays GoPro; it does not yet
   detect story arcs, jokes, or favorite moments.
3. **No automatic video/audio sync.** Adjust `mic_offset_ms` if necessary.
4. **No account analytics yet.** The vidIQ connection within ChatGPT must
   authorize the actual BoRHeZ Games channel, and a future adapter can
   ingest private retention metrics.
5. **No Descript API worker yet.** Descript Underlord can be used via the
   connected ChatGPT plugin, but that is not a persistent background agent.
6. **No background publication without consent.** Automatic importing
   and rendering are supported; YouTube private upload requires an explicit
   button and account authorization.
7. **No media files in Git.** GitHub Actions checks code, not hours of video.
   A dedicated cloud rendering worker and bucket are better for scaling.
8. **Security hardening needed before wider hosting:** add production-grade
   authentication, revocable sessions, per-user permissions, resource quotas,
   request-rate limits, and a managed secret store.

## Roadmap

**v1:** durable cloud host + protected object storage; GoPro/mic alignment
assistant; automatic transcription and *suggested* highlight timestamps;
separate Shorts review; editor revision queue; actual upload authorization.

**v2:** role-specific model-backed agents, evidence-bearing editorial debates,
Descript Underlord adapter, YouTube/vidIQ reporting, human-approved community
responses, budget tracking and cost/quality evaluation.

**Never:** fabricated views, subscriber bots, fake comments or unauthorized
public uploads.

## Local checks

```bash
python -m unittest discover -s studio/tests -v
python -m py_compile studio/app.py
```

`STUDIO_TOKEN` is mandatory (24+ characters). Access is cookie-authenticated
after login. Source code is shareable; credentials and footage are not.

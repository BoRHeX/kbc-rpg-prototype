# BoRHeZ Games Studio — Kickstart

This branch begins the production system without changing the existing Cataclysm game or deploying/publishing anything automatically.

## Operating contract
- User says "I'm ready to play" → select a concept, generate a browser game, run automated checks, deploy, return a playable URL.
- User records gameplay and uploads to Drive → ingest with a durable unique recording ID; run visual analysis before editorial decisions; render captions, sound, narration only when justified by source footage.
- Queue ready videos separately from production. Default one YouTube Short daily, scheduled in the channel's timezone.
- Each release requires metadata, video file, QA report, unique upload ID, and release timestamp.
- Publication starts in PRIVATE mode until a complete end-to-end upload and QA run succeeds. Never mark a video public without an explicit publication policy.
- Keep an audit log and prevent duplicate uploads, including retries.

## Current integration reality
- Existing playable game: Cataclysm, in the game-factory prototype PR.
- Descript editing and rendering: tested.
- Drive: connected, but the prior 447 MB recording exceeded the Drive connector's 256 MB transfer limit; use a server-side Drive API ingest with resumable download or compression.
- Visual analysis of video: not implemented.
- YouTube: vidIQ read/metadata tools connected, but no upload action in this chat; production service requires Google OAuth authorization for YouTube Data API uploads.
- Always-on worker, persistent job queue, and scheduling: not deployed.

## First release milestone
1. Run a browser-playable game with a public preview link.
2. Ingest one raw gameplay video into a durable job.
3. Produce a timestamped visual event report and edited Short.
4. Upload to YouTube as private; verify the resulting video ID.
5. Schedule six completed videos on six consecutive days, without duplication.

## Safety
No credentials in repository. No automatic public publishing until explicitly configured. Respect YouTube API quota, OAuth token storage, copyright and music licensing.

See `studio/queue.py` for a deterministic queue prototype and `studio/test_queue.py` for tests.

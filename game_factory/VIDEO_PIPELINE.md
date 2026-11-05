# Automated Cataclysm gameplay processing

Workflow: `.github/workflows/gameplay-video-review.yml`. Processor: `game_factory/video_pipeline.py`.

## What happens
1. On demand, or daily at 07:20 UTC, read the newest video in the private Google Drive YouTube folder.
2. Download with Google OAuth **without making the video public**.
3. Extract audio in eight-minute chunks and transcribe with OpenAI Whisper.
4. Inspect sampled frames with a vision model (sampling is not full-motion video analysis).
5. Write a timestamped QA report and Cataclysm 0.3 development backlog.
6. Cut and concatenate a short gameplay highlight MP4.
7. Open a GitHub issue with the report and attach the full transcript, review, and highlight to the workflow run as artifacts.
8. Skip already-reviewed recordings. No automatic merges or YouTube publishing.

## One-time authorization (required before first run)
Repository owner must configure these GitHub Actions repository secrets:
- `OPENAI_API_KEY` (existing council secret can be reused).
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from a Google Cloud OAuth client with Drive API enabled.
- `GOOGLE_REFRESH_TOKEN` granted using the same OAuth client, with scope `https://www.googleapis.com/auth/drive.readonly` and offline access. The account must have access to the recording and folder. Do not paste any credentials into GitHub files, PRs or chat.

The source folder is currently `1ARwayk85TIK4MibwwXTsdAm4EKjQAh0K`. The initial recording is `1GbMVr_GNoDA4mlpqX_zQBYWjUpO56Pam`. Update the workflow env values if the folder changes.

## Limits and safety
- Runner storage and GitHub Actions runtime must accommodate the original 664 MB video and temporary processing files.
- Transcription/vision uses the paid OpenAI API. Sampled frames can miss short events.
- Videos are not sent to Descript; the workflow uses FFmpeg for a first-pass highlight edit.
- Raw footage is deleted from the runner before artifact upload. Artifacts are retained for 30 days.
- Generated issues are evidence for developers, not proof that a bug exists.
- Workflow needs repository Actions permission to create issues.
- Current workflow requires the four secrets before it can execute; installing code alone does not authorize Google Drive.

## Automatic handoff to Mobile Minigame Studio

The video workflow preserves its normal QA issue, transcript and highlight,
then calls `game_factory/video_bridge.py`. A separate small GPT-4.1-mini
JSON-mode call proposes one conservative **update** from the report, transcript
and sampled visual observations. The existing studio request schema is validated
using `game_factory.mobile_jobs.validate_request`.

**Filename is the game identity.** Rename the Drive recording to
`<existing-game-id>__<anything>.mp4`, for example
`neon-salvage__samsung-session-02.mp4` or
`studio-original-001__peach-feedback.mp4`.
The prefix must exactly match an existing game ID under `docs/games/`;
`cataclysm__...` maps to `docs/preview/`. Unidentified videos still get
a QA issue, but cannot trigger game changes. AI never chooses the target ID.

When actionable feedback exists, the review file ID deterministically becomes
a `yt-<24-hex>` job ID. The bridge writes `studio_request.json`, checks that
no other request is pending, commits `game_factory/requests/current.json` on
`main`, then sends `repository_dispatch` with event type
`borhez-video-review`. **This explicit dispatch is necessary** because a
push made with the workflow's `GITHUB_TOKEN` does not trigger the studio's
normal push workflow. The studio reads the committed request and performs
its existing planning, Codex coding, acceptance, QA and Pages publication.

Non-actionable reviews generate no game job. Identical Drive file IDs produce
the same request ID; accepted jobs do not run again. A different outstanding
job is never overwritten. The bridge's last state and proposed request are
also stored as 30-day workflow artifacts when produced.

The source media is never intentionally uploaded as an artifact. The upload
allowlist includes only recording metadata, transcript, review, proposed
request, handoff status and the edited highlight. On failed runs, the runner
is discarded.

**Boundaries:** The schedule processes the newest video, not a guaranteed
FIFO queue. One outstanding request is supported at a time; a new review
arriving while one is pending fails safely rather than replacing it. The
bridge currently creates **updates only**, not brand-new game concepts.
A successful dispatch does not itself prove studio acceptance or successful
public deployment. Check the studio result receipt and delivery workflow.

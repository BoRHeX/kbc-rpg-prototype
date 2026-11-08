# Automated gameplay review → Game Studio

Workflow: `.github/workflows/gameplay-video-review.yml`. Processor: `game_factory/video_pipeline.py`.

## What happens
1. On demand, or daily at 07:20 UTC, read the newest video in the private Google Drive YouTube folder. Manual workflow dispatch with a blank Drive file ID selects the newest video.
2. Download with Google OAuth **without making the video public**.
3. Extract audio in eight-minute chunks and transcribe with OpenAI Whisper.
4. Inspect sampled frames with a vision model (sampling is not full-motion video analysis).
5. Write a timestamped QA report and game-specific development backlog.
6. Cut and concatenate a short gameplay highlight MP4.
7. Pass the on-runner transcript, visual review and QA report to `video_bridge.py`. For **Cataclysm**, the public work order is only a routing request: it references the original private Drive file by its verified ID, and the downstream Mobile Studio **re-downloads/retranscribes the full recording privately**. The Council receives the entire available transcript and sampled visual observations and uses the living 1.0 roadmap; it can select multiple compatible subsystems in one release. Non-Cataclysm reviews still use the compact work order.
8. Do **not** publish raw voice, transcript, screenshots or edited highlight as public GitHub issues/Actions artifacts. These remain ephemeral on the GitHub runner; the original private video is retained in Google Drive.
9. Skip queued, delivered and non-actionable video IDs using durable metadata. No automatic YouTube publishing.

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
- No private review media or transcript artifacts are uploaded. Runner ephemeral files are discarded after execution. If permanent private transcripts/highlights are required later, implement a dedicated authorized private storage destination.
- The condensed update prompt, acceptance criteria, and game code are public in this repository. Keep personal or confidential details out of gameplay commentary; an AI content filter alone is not a formal privacy guarantee.
- The workflow uses `contents: write` to push a validated update request but does not require issue-write permission.
- Current workflow requires the four secrets before it can execute; installing code alone does not authorize Google Drive.

## Automatic handoff to Mobile Minigame Studio

The video workflow generates a local QA report, transcript and highlight,
then calls `game_factory/video_bridge.py`. A small JSON-mode call decides
whether the review contains actionable gameplay feedback. The existing studio
request schema is validated using `game_factory.mobile_jobs.validate_request`.
For Cataclysm, the bridge deliberately does NOT collapse the recording into a
few implementation bullets. It attaches the original private Drive evidence ID
to the job and directs the Council to read the complete 24-minute (or other
duration up to 40-minute protected limit) recording during its private playback
stage. Five planning-role calls inspect the transcript, images, current source
and `game_factory/CATACLYSM_1_0_ROADMAP.md`; the Producer chooses compatible
subsystem additions for one substantial, browser-tested release. The raw
transcript is never committed to this public repository. Videos longer than
40 minutes require deliberate review of processing limits.

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


## Run the newest recording now (from the bookmarked dashboard)

Open [BoRHeZ Games](https://borhex.github.io/kbc-rpg-prototype/games/#feedback),
tap **PROCESS LATEST RECORDING** (the link opens the authenticated GitHub Actions
workflow), tap **Run workflow**, leave the optional **Drive file ID** blank,
then press **Run workflow**. No GitHub token is stored in the public page.

The workflow also runs daily at 07:20 UTC, or can be triggered by pushing
`game_factory/requests/video_review_trigger.json` to main through an authorized
GitHub account. Its push input is automatically blank, selecting the newest
recording. The manual default is blank too, not the old Cataclysm 0.2 ID.

**Privacy:** Video and speech are transferred to Google Drive and the selected
transcription/vision APIs for processing. The raw media and transcripts are not
uploaded as public GitHub artifacts or issues. The resulting concise game work
order, if any, is stored in a public repository. The user's private audio and
unedited recording are never attached to that work order.


## Cataclysm 0.7 → 1.0 full-review route (November 2026)

1. Preserve 0.7 from the immutable Git branch `release/cataclysm-v0.7-frozen`.
2. Place the **complete review video** inside the authorized private Google Drive folder, with an exact existing game prefix, e.g. `cataclysm__review-0.7.mp4`. A YouTube upload alone does not enter this Drive-based pipeline.
3. Launch `Review gameplay and send feedback to Game Studio` from GitHub Actions, optionally setting the exact Drive file ID; otherwise it takes the newest video in that folder. No automatic unbounded retry is configured.
4. The initial triage determines whether a gameplay update is warranted, then dispatches one job with the private video ID. The Studio securely rereads all available spoken commentary, not a 5-point digest, and combines it with current 0.7 source, existing viewer suggestions, code-level Council proposals and the living roadmap.
5. The Producer integrates as many **compatible, testable** subsystems as one bounded job can safely deliver. Unsafe or unfinished evidence-backed candidates remain in the roadmap rather than being silently omitted.
6. Check the job result, browser QA and exact live deployment. The frozen 0.7 branch does not move with later updates.

**Privacy and expense:** the public request contains the Drive file ID and gameplay-only routing instructions, not the raw transcript. Anyone viewing the public repository can see that identifier, but Drive file access still depends on its private permissions. The downstream stage transcribes the recording again; this intentionally incurs an extra paid transcription to keep the full-context private source available to the Council without copying private speech into public GitHub artifacts. A user-authorized cost ceiling and per-job bounds should be set before increasing concurrency.

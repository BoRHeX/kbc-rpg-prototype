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

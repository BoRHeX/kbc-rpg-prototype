"""Deterministic publication queue prototype; no external side effects."""
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

@dataclass
class Video:
    recording_id: str
    title: str
    qa_passed: bool = False
    render_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    youtube_id: Optional[str] = None
    status: str = "ingested"

@dataclass
class StudioQueue:
    videos: dict[str, Video] = field(default_factory=dict)

    def ingest(self, recording_id: str, title: str) -> Video:
        if not recording_id.strip():
            raise ValueError("recording_id required")
        if recording_id not in self.videos:
            self.videos[recording_id] = Video(recording_id, title)
        return self.videos[recording_id]

    def mark_ready(self, recording_id: str, render_url: str, qa_passed: bool) -> Video:
        video = self.videos[recording_id]
        if not qa_passed or not render_url:
            raise ValueError("QA and rendered video required")
        video.render_url = render_url
        video.qa_passed = True
        video.status = "ready"
        return video

    def schedule_daily(self, first_release: datetime, daily: int = 1) -> list[Video]:
        if first_release.tzinfo is None:
            raise ValueError("timezone-aware release time required")
        if daily < 1:
            raise ValueError("daily must be positive")
        reserved = {v.scheduled_at for v in self.videos.values() if v.scheduled_at is not None}
        ready = [v for v in self.videos.values() if v.status == "ready" and v.qa_passed]
        ready.sort(key=lambda v: v.recording_id)
        for video in ready:
            slot = 0
            while True:
                candidate = first_release + timedelta(days=slot // daily)
                # For multiple daily releases use spaced slots.
                candidate += timedelta(seconds=(slot % daily) * 86400 // daily)
                if candidate not in reserved:
                    break
                slot += 1
            video.scheduled_at = candidate
            video.status = "scheduled"
            reserved.add(candidate)
        return ready

    def mark_uploaded(self, recording_id: str, youtube_id: str) -> Video:
        video = self.videos[recording_id]
        if video.status != "scheduled" or not video.qa_passed:
            raise ValueError("Only scheduled QA-approved videos can be uploaded")
        if not youtube_id:
            raise ValueError("YouTube video ID required")
        if video.youtube_id and video.youtube_id != youtube_id:
            raise ValueError("Duplicate upload mismatch")
        video.youtube_id = youtube_id
        video.status = "uploaded_private"
        return video

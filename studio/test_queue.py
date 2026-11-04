import unittest
from datetime import datetime, timezone
from studio.queue import StudioQueue

class QueueTests(unittest.TestCase):
    def test_six_recordings_six_days(self):
        q = StudioQueue()
        for i in range(6):
            v = q.ingest(f"clip-{i}", f"Game {i}")
            self.assertIs(v, q.ingest(f"clip-{i}", "Duplicate"))
            q.mark_ready(v.recording_id, f"https://example.invalid/{i}.mp4", True)
        start = datetime(2026, 11, 5, 18, 0, tzinfo=timezone.utc)
        scheduled = q.schedule_daily(start)
        self.assertEqual(len(scheduled), 6)
        self.assertEqual(len({v.scheduled_at for v in scheduled}), 6)
        self.assertEqual((scheduled[-1].scheduled_at - start).days, 5)
        self.assertEqual(q.schedule_daily(start), [])

    def test_unverified_cannot_publish(self):
        q = StudioQueue()
        q.ingest("clip", "Test")
        with self.assertRaises(ValueError):
            q.mark_ready("clip", "https://example.invalid/video", False)
        with self.assertRaises(ValueError):
            q.mark_uploaded("clip", "yt-id")

    def test_upload_id_required(self):
        q = StudioQueue()
        q.ingest("clip", "Test")
        q.mark_ready("clip", "https://example.invalid/video", True)
        q.schedule_daily(datetime(2026, 11, 5, tzinfo=timezone.utc))
        with self.assertRaises(ValueError):
            q.mark_uploaded("clip", "")
        self.assertEqual(q.mark_uploaded("clip", "yt-id").status, "uploaded_private")

if __name__ == "__main__":
    unittest.main()

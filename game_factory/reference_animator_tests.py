"""Offline contract tests; no model calls, GitHub writes or customer images."""
import json
from io import BytesIO
from pathlib import Path
import tempfile
import unittest

from PIL import Image, ImageDraw

from game_factory import reference_animator as mod


class ReferenceAnimatorTests(unittest.TestCase):
    def test_valid_actor_and_state_allowlist(self):
        self.assertEqual(mod.validate_job("trapper", "run,attack", drive_file_id="ABC_def-01234567890XX"), ["run", "attack"])
        self.assertEqual(mod.validate_job("hero", "idle,run,aim", drive_file_id="ABC_def-01234567890XX"), ["idle", "run", "aim"])
        with self.assertRaises(ValueError):
            mod.validate_job("../trapper", "run", drive_file_id="ABC_def-01234567890XX")
        with self.assertRaises(ValueError):
            mod.validate_job("trapper", "run,run", drive_file_id="ABC_def-01234567890XX")
        with self.assertRaises(ValueError):
            mod.validate_job("trapper", "attack,exec", drive_file_id="ABC_def-01234567890XX")
        with self.assertRaises(ValueError):
            mod.validate_job("trapper", "run", reference_path="../../etc/passwd")
        with self.assertRaises(ValueError):
            mod.validate_job("trapper", "run", drive_file_id="")

    def test_trusted_existing_hero_atlas_can_seed_a_painted_anchor(self):
        # The LITE MOBILE release must NOT require a Drive upload. Hero alone
        # can use its existing checked-in pose; only the first atlas cell is sent.
        source="docs/cataclysm-1-0-major/art/hero-idle.png"
        states=mod.validate_job("hero","idle,run,attack,hit,feral,adrenaline",
                                reference_path=source)
        self.assertEqual(len(states),6)
        data=mod.load_reference(source, actor="hero")
        with Image.open(BytesIO(data)) as reference:
            self.assertEqual(reference.size,(384,384))
        with self.assertRaises(ValueError):
            mod.validate_job("trapper","run",reference_path=source)
        self.assertEqual(mod.FRAME_TARGET["run"],8)
        self.assertEqual(mod.FRAME_TARGET["attack"],8)

    def test_lite_mobile_idle_review_is_state_aware(self):
        # A convincing idle can be subtle and grounded. A run cannot bypass
        # required joint articulation and distinct action phases.
        verdict = {
            "same_character": True, "visible_motion": True,
            "usable_in_game": True, "painted_texture": True,
            "idle_life": True, "articulated_key_poses": False,
            "distinct_motion_phases": False, "concern": "",
        }
        original = mod.model_json
        mod.model_json = lambda _client, _prompt, _images: verdict
        frames = [Image.new("RGBA", (96, 96), (0, 0, 0, 0)) for _ in range(6)]
        try:
            accepted = mod.inspect_animation(
                None, b"reference", frames, "idle", "hero", texture_first=True)
            self.assertTrue(accepted["idle_life"])
            with self.assertRaises(ValueError):
                mod.inspect_animation(
                    None, b"reference", frames, "run", "hero", texture_first=True)
        finally:
            mod.model_json = original

    def test_synthetic_gif_becomes_real_transparent_motion_atlas(self):
        frames = []
        for x in (22, 29, 36, 43, 50, 57):
            image = Image.new("RGB", (96, 96), (0, 255, 0))
            draw = ImageDraw.Draw(image)
            draw.ellipse((38, 24, 58, 59), fill=(220, 220, 230), outline=(15, 28, 42), width=2)
            # Articulated legs genuinely alternate. A mere x-translation is
            # deliberately insufficient after avatar recentering.
            phase=(x-22)//7
            draw.polygon([(39,53),(45,53),(45+phase%3*4,72),(38+phase%3*4,74)],fill=(30,39,55))
            draw.polygon([(51,53),(58,53),(53-phase%3*4,72),(48-phase%3*4,74)],fill=(38,43,57))
            draw.line((38,42,27+phase%3*6,39),fill=(240,180,99),width=5)
            frames.append(image)
        buf = BytesIO()
        frames[0].save(buf, format="GIF", save_all=True, append_images=frames[1:],
                       duration=140, loop=0, disposal=2, optimize=False)
        result = mod.normalize_frames(buf.getvalue())
        self.assertEqual(len(result), 6)
        self.assertEqual(result[0].size, (96,96))
        self.assertLess(result[0].getpixel((0,0))[3], 5)
        self.assertGreater(result[0].getpixel((48,70))[3], 100)
        atlas = mod.atlas(result)
        with Image.open(BytesIO(atlas)) as output:
            self.assertEqual(output.size, (576,96))
            self.assertEqual(output.mode, "RGBA")

    def test_illustrated_contact_sheet_shows_complete_eight_pose_cycle(self):
        # Critic must see frame 7/8, where the return-to-ready portion lives.
        images=[]
        for index in range(8):
            frame=Image.new("RGBA",(96,96),(0,0,0,0))
            ImageDraw.Draw(frame).ellipse((10+index*3,20,40+index*3,80),
                                          fill=(240,240,225,255))
            images.append(frame)
        review=Image.open(BytesIO(mod.contact_sheet(images)))
        self.assertEqual(review.size,(8*128,128))

    def test_manifest_update_is_data_driven_and_mirrored(self):
        frame = Image.new("RGBA", (96,96), (255,255,255,0))
        ImageDraw.Draw(frame).ellipse((38,18,58,80),fill=(250,140,50,255))
        atlas = mod.atlas([frame.copy(),frame.copy(),frame.copy()])
        with tempfile.TemporaryDirectory() as temp:
            output,mirror=Path(temp)/"main",Path(temp)/"lab"
            output.mkdir();mirror.mkdir()
            for base in (output,mirror):
                (base/mod.MANIFEST).write_text('{"version":1,"characters":{}}')
            result=mod.write_result("trapper",{"run":atlas},b"reference",{"run":{"same_character":True}},
                                    output=output,mirror=mirror)
            entry=json.loads((output/mod.MANIFEST).read_text())["characters"]["trapper"]["run"]
            self.assertEqual(entry["frames"],3)
            self.assertEqual((mirror/mod.MANIFEST).read_bytes(),(output/mod.MANIFEST).read_bytes())
            self.assertEqual((mirror/"characters/trapper/run.png").read_bytes(),atlas)


if __name__ == "__main__":
    unittest.main()

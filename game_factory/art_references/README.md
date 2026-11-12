# Reference-to-Animation Department (BoRHeZ Games)

## The creator contract

**Input:** One character reference image (PNG, JPEG or WebP) and an existing game actor ID, for example **trapper**. The artwork can come from the user's ChatGPT-generated art, a human artist, an existing image in Google Drive, or an approved repository image.

**Action:** The studio must actually inspect image pixels with a vision-capable model. It extracts the actor's visual identity, then uses an image-edit model to generate **multi-frame animation**, not static images with a frame count label. It removes background, normalizes sprite feet and bounding boxes, compiles real transparent 96px RGBA atlas cells, performs a second independent vision review, and tests the actual Canvas renderer in Chrome.

**Output:** A set of new animation states attached to the existing game character, reusing the current art style and gameplay behavior. Only passing assets are published. The original reference image is not uploaded to the public game repository.

## How to launch

The GitHub Action is **BoRHeZ Reference-to-Animation Studio**. It accepts:

- **actor**: `hero`, `trapper`, `healer`, `tank`, `shooter`, `brawler`, `sniper`, `engineer`, `bard` or one of the named enemy archetypes.
- **states**: one to six of `idle,walk,run,attack,aim,hit,feral,adrenaline,special`, comma-separated. Each animated state is an image-model call. Start with `run` for a new character.
- **drive_file_id** OR **reference_path**, exactly one: an authenticated private image from Drive, or a GitHub file under `game_factory/art_references/`.
- **notes**: short guidance such as "this is the trapper cat; snare net deploys during special".
- **max_generations**: 1–6, a hard upper bound on charged image-generation calls for this job.

The same pipeline can be submitted without using GitHub's action form: create or update `game_factory/requests/reference_animation.json` on `main`, for example:

```json
{
  "enabled": true,
  "actor": "trapper",
  "states": "run,attack,special",
  "drive_file_id": "YOUR_REFERENCE_IMAGE_FILE_ID",
  "reference_path": "",
  "max_generations": 3,
  "notes": "Preserve the reference character's colors, mask and snare equipment."
}
```

This can be created automatically from ChatGPT using connected Drive and GitHub tools when the user says “this image is the trapper; animate it”. Those integrations are **not** implicit: a ChatGPT attachment/image-generation result must be handed to Google Drive or committed as a repository reference before the external GitHub runner can read it. The runner cannot directly inspect a ChatGPT chat attachment ID.

## Security and production rules

- Source images are kept out of GitHub commits. Only the generated sprite atlas and manifest enter `docs/`.
- Drive references are authenticated with the same existing Google token mechanism as the gameplay video reviewer. Set `ART_REFERENCE_FOLDER_ID` GitHub secret to restrict allowed source images to one designated Drive folder (recommended).
- The image must be an unambiguous single character. Group thumbnails and multi-subject screenshots are rejected as character references rather than guessed.
- The studio has a strict 1–6 generation-call cap. It never automatically retries a charged image request after a failed fidelity or animation QA decision. Vision analysis adds separate billed model calls.
- Existing character assets are never deleted. A missing/broken override falls back to the original renderer.
- The studio cannot edit gameplay mechanics, game balance, audio, 0.9, Flame Game, or unrelated files.
- Successful production creates a PR, then a separately privileged and independently revalidated delivery workflow merges, deploys and checks public source hashes.
- Both Cataclysm 1.0's full Night 1 campaign and the Night 99 lab consume identical reference-animation manifests and generated atlases.
- Release QA requires animated source imagery, multiple genuinely different frames, alpha transparency, independent image identity/motion review, real Chrome rendering and baseline gameplay regressions.
- GitHub Actions visual QA is an objective minimum, not a guarantee of good art direction. Creator playback remains the final aesthetic standard.

## Long-term interfaces

The animation file schema is intentionally independent of the generating model:

```json
{
  "version": 1,
  "characters": {
    "trapper": {
      "run": {
        "frames": 6,
        "fps": 12,
        "scale": 1,
        "embedded_weapon": true,
        "reference_sha256": "source-reference-provenance"
      }
    }
  }
}
```

New games can implement the same manifest contract and shared reference animator by providing a game-specific target-directory and state adapter. **Only Cataclysm 1.0 is wired to this first version.** It is not yet a universal integration with every BoRHeZ game engine.

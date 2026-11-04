# BoRHeZ Game Factory · Cataclysm 0.1

An original, playable, touch-controlled arcade game connected to the
**BoRHeZ Games Studio** production dashboard and an auditable development
council. This branch extends `feature/borhez-games-studio-v0`; KBC remains a
separate research project.

**Original premise:** play a cat in a city during a zombie outbreak. Drag
to move, evade zombies, automatically shoot enemies, pick up fish, increase
level/health/damage, survive longer waves. Keyboard support, sound toggle,
pause/resume, local high score and replay are included. No third-party game
art or Angry Birds source/assets.

## Play it on a phone now (private Codespace)

1. Open the GitHub branch `feature/borhez-game-factory-v0`.
2. Choose **Code → Codespaces → Create codespace on this branch**.
3. In its terminal:
   ```bash
   export STUDIO_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
   echo "Your private Studio token: $STUDIO_TOKEN"
   python studio/app.py --host 0.0.0.0 --port 8000
   ```
4. In **Ports**, open the forwarded link for **8000**. Keep port **Private**.
5. Enter your token. Tap **Game** in the bottom navigation.
6. Tap **Start Run** and drag on the canvas to move. Record the screen on
   your phone and add separate audio/camera footage later.

The same app's Production page has the Drive-to-FFmpeg recording pipeline.
Drive and YouTube require app-specific credentials (documented in
`studio/README.md`); ChatGPT connector permissions alone are not sufficient.

Codespaces sleeps when idle. It is a convenient development environment,
not persistent hosting.

## Standalone public web build

GitHub Actions **Build mobile Cataclysm game** packages a deployable static
HTML/CSS/JS build with a copy of the deterministic game-factory report.
You can download the `cataclysm-phone-build` artifact from the run.

To publish on GitHub Pages when you are ready:

1. In repository Settings → Pages, set Source to **GitHub Actions**.
2. Open Actions → **Build mobile Cataclysm game** → **Run workflow**.
3. Select branch `feature/borhez-game-factory-v0`, enable the
   `publish_to_pages` boolean, and run.
4. After a successful deployment, the job's `github-pages` environment has
   the actual public URL. Never assume a URL is live before deploying.

This publishes **only the game**, not the private Studio or its credentials.
Public deployment must be deliberately authorized.

You can also build and serve this static bundle locally:

```bash
python game_factory/build_static.py --out dist/cataclysm
python -m http.server 8080 --directory dist/cataclysm
```

## Department overview

| Department | Actual current behavior |
| --- | --- |
| Design | Defines and evaluates a fixed set of small gameplay variants |
| Balance | Benchmarks 12 scripted survival runs per candidate |
| Engineering | Checks numeric bounds and deterministic reproducibility |
| Quality | Records limitations and requires real phone playtesting |
| Publishing | Abstains from releasing anything without human consent |

The `Game Factory` tab runs `game_factory/council.py` and displays the
real council's trial results, evidence IDs, and ballots. It is not an
independent social simulation or a genuine human-audience study.

**Optional real AI agents** are available in
`game_factory/ai_factory.py`: four role-specific model calls (Designer,
Engineer, QA and Publisher) can propose changes to **at most three
allowlisted numeric gameplay parameters**. The candidate is validated with
a deterministic surrogate model and GitHub Actions creates a **draft PR**
for you to review, without merging or releasing.

Enable this only if you want to pay for model API usage:

1. Add `OPENAI_API_KEY` to your repository **Actions Secret** (not source).
2. Ensure Actions has permission to create pull requests for the repo.
3. Actions → **AI Game Factory (manual)** → **Run workflow**.
4. Provide a short creative idea and review the resulting draft PR.
5. Verify gameplay on your phone before approving or merging.

The API key used for model inference is billed separately from ChatGPT.
Each AI workflow uses at most four bounded model requests; retries,
unexpected provider pricing and CI usage may still incur costs.

## Key source files

- `studio/web/game.html`, `game.css`, `game.js`: game and dashboard,
  responsive Canvas and touch controls.
- `studio/web/game-config.json`: allowable balance parameters.
- `game_factory/council.py`: bounded reproducible simulated tests.
- `game_factory/ai_factory.py`: optional four-agent review-and-PR system.
- `game_factory/build_static.py`: standalone static web export.
- `studio/app.py`: authenticated API and embedded game route.
- `.github/workflows/game-factory-tests.yml`: automated code tests.
- `.github/workflows/ai-game-factory.yml`: optional paid manual AI PR.
- `.github/workflows/cataclysm-web-build.yml`: web game artifact and
  explicitly approved public GitHub Pages deployment.

## What comes next

- Record your own first Cataclysm session; judge responsiveness and clarity.
- Add a game-mechanics registry rather than only numeric config: different
  playable recipes such as an original physics puzzle, roguelike zombie
  survival, or expanded cat-life simulation.
- Create a coding-agent sandbox that can modify one recipe at a time, run
  headless browser tests and produce a reviewable pull request.
- Add genuine production assets, licensed sound, thumbnails, replay capture,
  telemetry and opt-in player testing.
- Move to Godot or another engine for production desktop/Android exports
  when the gameplay has proved itself. Steam publishing needs developer
  onboarding, a per-game fee, platform review and store compliance.

**Do not infer real engagement, commercial success, or real-world KBC
validity from synthetic Game Factory votes.** The aim is to create a
reproducible production engine and make fun games from it.

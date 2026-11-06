# BoRHeZ Mobile Minigame Studio

## Objective

One development job produces a playable mobile HTML5 game, either by creating
a new game from a prompt or by updating an existing game. Successful jobs keep
the source, original request, agent decisions, test evidence, stable play URL
and Git history.

## Current implementation

The **Mobile Minigame Studio** GitHub workflow accepts `create` and `update`
jobs. Version 1 targets small Canvas arcade games with a draggable player,
start, pause, restart, score and an end condition. Cataclysm uses its existing
interface through an adapter. More control schemes can be added later.

| Stage | Responsibility | Output |
| --- | --- | --- |
| Resolve | Validate the request and existing game; skip completed job IDs | Fixed job definition and baseline hashes |
| Plan (new game) | Designer, Researcher and Engineer independently pitch concrete games; Critic evaluates all; Producer selects one | Three proposals, comparison, explicit choice and two rejection reasons |\n| Plan (update) | Existing Producer, Researcher, Designer, Critic and Engineer | Feedback-driven scoped change plan, preserving the current game |
| Code | Codex with file editing and shell tools | Actual HTML/CSS/JS plus an implementation report |
| Test | Independent Chromium mobile/touch checks | Start, timer, actor movement, canvas, pause/resume, restart, resources, run identity |
| Repair | Coder receives the actual failure, once | Corrected candidate or a failed job |
| Review | Independent QA model compares source and tests with the prompt | Explicit preview approval or rejection |
| Deliver | Separate publisher verifies hashes and the current baseline | Versioned source commit, Pages deployment, exact live-byte verification |

Browser emulation verifies behavior in desktop Chromium with mobile/touch
settings. Physical-phone compatibility and whether the game is enjoyable
remain separate playtests. Samsung issue #29 stays open until device evidence
resolves it.

## Submit a job

For a conversation-driven request, update `game_factory/requests/current.json`
on `main` with a fresh job ID. The commit starts a run. Supply:

```json
{
  "id": "neon-salvage-update-002",
  "mode": "update",
  "game": "neon-salvage",
  "title": "Neon Salvage",
  "prompt": "Add a combo multiplier for collecting consecutive cores without being hit.",
  "acceptance": [
    "Consecutive core pickups increase the visible combo multiplier.",
    "Taking damage resets the combo.",
    "Pause and restart continue to work; restart resets the combo."
  ]
}
```

Or open **Actions → Mobile Minigame Studio → Run workflow**, choose `create`
or `update`, and enter the game ID and prompt. Use `cataclysm` for updates to
the existing preview. Other game IDs map to `docs/games/<game-id>/`.

The runner checks for a pending request twice daily at 07:15 and 19:15 UTC
(08:15 and 20:15 Belgrade in winter). A request already present in
`game_factory/results/` causes no model calls. Submit one job at a time;
the next prompt follows the current job's result. This is a bounded studio,
not an unlimited background spending loop.

`OPENAI_API_KEY` is the existing repository Actions secret. API inference uses
the configured provider account. Each job still has five planning-role calls and one QA-role call (no extra model calls for concept competition), each with at most
one recovery for malformed or truncated JSON and a per-reply output ceiling of
4,000 tokens. There is one coding run and at most one coding repair. Workflow
timeouts also apply; token and dollar costs are not guaranteed by timeouts.

## Creative decisions for new games

For `mode=create` the studio uses the five existing council calls differently,
**without increasing the number of planning API calls**:

1. Designer, Researcher and Engineer independently propose one concrete game
   concept each, without seeing the other two pitches.
2. Critic evaluates all three actual concepts for distinctiveness, first-minute
   play, feasibility, mobile accessibility and replayability, naming an expected
   failure mode and mitigation for each.
3. Producer selects exactly one proposal, explains two rejections, and publishes
   implementation directives **before coding starts**.
4. The coding agent must implement that selected game, not silently substitute
   its own idea. Independent QA checks that source matches the selected concept.

All five role outputs and a normalized `creative_decision` object are saved
in `plan.json` and embedded in the accepted result JSON. A completed new-game
card exposes a compact **Creative decision · 3 pitches** section linked to its
full public result. This is a log of explicit outputs and reasons, **not** the
agents' private internal reasoning.

For `mode=update` the studio retains the previous feedback-driven workflow,
and existing games/releases remain unchanged. Missing structured pitches,
incomplete critique or an invented fourth proposal stop creation before any
coding call. Model proposals and selected reasons are untrusted model outputs;
passing schema checks does not by itself establish game originality or fun.

## Play and inspect delivery

- [Game catalog](https://borhex.github.io/kbc-rpg-prototype/games/)
- [Cataclysm preview](https://borhex.github.io/kbc-rpg-prototype/preview/)
- Request and evidence: `game_factory/results/<job-id>.json`
- Failed-run evidence and screenshots: workflow artifact `mobile-job-diagnostics`
- Accepted candidate: workflow artifact `mobile-accepted-game`

An update retains the game's URL. Every accepted version is a separate Git
commit; use its commit history to compare or restore earlier source. A stale
job cannot overwrite a game updated since its baseline was captured. A failed
coding, testing or QA stage does not change the accepted source or deployment.

**Repository setup:** Settings → Pages → Build and deployment → Source must be
**GitHub Actions**. Do not combine this publisher with **Deploy from a branch**;
the studio uploads the accepted `docs/` artifact itself. Source was corrected
on 2026-11-05 and update 003 then passed deployment and exact live verification
in [delivery run 42098600322](https://github.com/BoRHeX/kbc-rpg-prototype/actions/runs/42098600322).
If delivery is blocked by an obsolete Pages deployment, inspect this setting
before retrying development. Re-run the failed delivery job after fixing hosting.

Publication and deployment are separate steps. After committing accepted source,
the studio dispatches **Deliver Accepted Mobile Game** and waits for its live
verification. The delivery workflow starts from the accepted source commit,
verifies its hashes and QA receipt, and gives each attempt a unique Pages
artifact name. If delivery fails, **Re-run failed jobs** on that delivery run
retries the accepted source without model calls. For explicit recovery, update
`game_factory/DELIVERY_REQUEST.json` with an existing accepted request ID. Completed receipts mean code was
accepted; the workflow must also pass deployment and live verification before
claiming the link was delivered.

Existing Cataclysm-specific workflows remain available for historical/manual
use. Their former schedule moves here so already-delivered requests are not
repeatedly coded and billed. Studio/video publishing is a separate workflow.

## Local checks

```bash
python -m unittest discover -s game_factory/tests -v
python -m unittest game_factory.test_agent_memory game_factory.test_agent_api game_factory.test_development_council -v
python -m unittest discover -s studio/tests -v
node --check game_factory/mobile_acceptance.cjs
```

Browser checks use Playwright and the GitHub runner's preinstalled Chrome.
The CI job prepares the tools before the coding agent runs.
`MOBILE_CODER_PROMPT.md` defines the exact game interface.
`node game_factory/check_neon_logic.cjs` additionally checks Neon Salvage's
scoring, damage protection, win/loss and replay in a seeded VM harness using
actual game input handlers and read-only observations, without altering state.
The active objective and ordered delivery evidence are tracked in issue #30.

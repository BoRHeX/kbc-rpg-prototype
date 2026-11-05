# Coder report — P0 #29

## Outcome and root cause

The physical Samsung START RUN failure is **not reproduced or proven fixed** in this environment. No Samsung runtime trace, browser version, failed request log, or cached response was supplied. Independent QA and the human tester must decide whether the defect is resolved. Nothing was published.

Observed in the supplied source:

- `#play.onclick` binds to `resumeOrStart`, which calls `start()` before canvas joystick input is relevant. `start()` creates running simulation state and hides the overlay. CSS already includes `[hidden]{display:none!important}`. There is no source evidence implicating joystick cancellation in failure to start.
- Most initialization occurs before the click handler is bound. An earlier load/parse/initialization failure leaves a visually complete HTML page without a working Start handler. The previous readiness flag was assigned before all initialization finished.
- The previous version label was a hard-coded run number, independent of loaded JavaScript. The existing error message lived inside the start overlay and could disappear during gameplay.
- `saveBest()` read localStorage outside its try block. A storage-denied exception could interrupt game-over handling, but this is a separate observed code defect, **not an explanation for the initial Start failure**.
- The previous smoke test used mouse click/drag and checked overlay/joystick visibility; it did not prove time progression or player displacement.

Hypotheses still requiring affected-device evidence: stale/mismatched HTML and JavaScript, script request/parse failure, early runtime failure, and browser-specific event delivery or hit testing. This patch hardens and exposes the boot failure path; it does not establish which hypothesis caused the human report. No speculative joystick changes were made.

## Changed files

- `docs/preview/index.html`: Start is disabled while loading. A completed initialization handshake checks the loaded code identity against the page/script URL identity (`20261105-start-3`). The header reports the actual code build. Load, runtime, promise, timeout, and build mismatch failures produce a persistent player-visible message outside the overlay. Added a JavaScript-disabled explanation. A private acknowledgment prevents an old script's global ready flag from bypassing the timeout.
- `docs/preview/game.js`: reports readiness after binding controls and scheduling the frame loop; exposes read-only, copied diagnostic snapshots for simulation assertions; protects the game-over storage read together with the write.
- `game_factory/browser_smoke.cjs`: requires an HTTP URL, uses browser-generated taps and CDP touch gestures in mobile Chromium with default and Samsung-style user agents. Checks clock advancement, actual player displacement, touch cancellation and reacquisition, pause/resume/restart, matching build identities, and resource/page errors. Isolated blocked-script, invalid-syntax, and stale-build cases must show a visible failure and keep Start disabled.
- `game_factory/CODER_REPORT.md`: this report.

## Commands executed and results

- `node --check docs/preview/game.js` — PASS (before and after changes).
- `node --check game_factory/browser_smoke.cjs` — PASS.
- `git diff --check` — PASS.
- Inline Node `vm` harness, loading the actual inline boot script and game.js with DOM/canvas/storage mocks — PASS: completed boot handshake; storage-denied initialization; Start; simulated time above one second; player displacement using keyboard state; frozen time while paused; resume; restart clock reset; build label; load/runtime/build mismatch error handling. This is a logic check, not browser or touch verification.
- An initial attempt at `CATACLYSM_TEST_URL=http://127.0.0.1:8765/preview/ node game_factory/browser_smoke.cjs` failed at Chromium launch, before HTTP navigation: `sandbox_host_linux.cc:41 ... shutdown: Operation not permitted (1)` / SIGTRAP. A running HTTP server was not established; this attempt should not have been made before confirming one. No further HTTP browser invocation was made. The revised browser suite has **not run** here. Dependencies were not installed and no network requests were executed by the browser.

## Remaining verification and risks

The runner should start its HTTP server, then run:

`CATACLYSM_TEST_URL=http://127.0.0.1:8765/preview/ node game_factory/browser_smoke.cjs`

A version string, successful handshake, VM test, or hidden overlay is not proof of responsive browser gameplay. The revised browser tests require positive simulation progression and displacement, but remain unexecuted here. The diagnostics expose copies only; they cannot mutate the simulation.

Samsung UA emulation uses installed desktop Chromium, not Samsung Internet's engine/version, Android OS, physical touchscreen, device GPU, browser chrome, device cache, or actual network conditions. Even a green run cannot substitute for Samsung hardware confirmation. Multi-touch and older browser compatibility remain unverified. The existing Samsung fallback listeners remain unchanged.

The changed script URL requests a distinct cache entry, but cannot invalidate an already-cached old HTML document or an intermediary serving incorrect content. An entirely stale page cannot diagnose this new build. The handshake rejects mixed builds and reports errors; it does not repair an unavailable or syntactically invalid script. Runtime error reporting is intentionally visible after the overlay hides. Server configuration and preview publishing were outside scope and unchanged.

On the affected phone, record the code build label, exact error message (if any), browser/version and URL, then confirm a tap starts a run, clock advances, touch drag moves the cat, and pause/resume/restart work. If failure persists, capture console and script request details before another reload; no hardware verification or final approval is claimed.

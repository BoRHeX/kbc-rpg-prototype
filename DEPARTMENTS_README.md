# KBC City: Department Council v0

First executable step toward a multi-department agent society, extending
`feature/kbc-city-v0`. **Offline, deterministic, no subscriptions or API key.**

## Run

```bash
python -m unittest discover -s tests -v
python departments_lab.py
```

## What exists

- Five distinct role policies: Research, Engineering, Audit, Economics, Media.
- A reproducible controlled experiment built on `OracleLab`, comparing
  the same world with and without communication.
- Department arguments, reservations, evidence references, and explicit votes.
- An append-only-in-process, hash-linked meeting log (tampering detectable
  unless a privileged actor rewrites the history).
- A research decision. **No tokens minted and no KBC values changed by votes.**
- The Oracle is not a voter. The fixture-coverage score is provisional.

## What this is not

- These are **scripted department policies**, not independent LLM agents.
- This does not predict the consequences of introducing KBC to real economies.
- No Google/YouTube authorization, upload, scraping, view generation, or monetization.
- It is not an autonomous business and has no persistence across runs.

## Next increment

1. Integrate a Council tab in the existing City web UI and persist events to SQLite.
2. Allow optional LLM deliberation, limited to proposed arguments; require evidence
   identifiers and validate the decisions with deterministic code.
3. Extend KBC experiments with held-out counterfactuals, stronger recursive proof
   checking, explicit uncertainty, and a typed relational knowledge graph.
4. Add a separate **Media Studio** department:
   public YouTube Data API metadata and *authorized* owner Analytics API reports,
   human-first creative brief, licensed assets, draft/render pipeline,
   human approval, upload scheduling, cost caps and per-video metrics.
5. Benchmark real experiments and simulated scenarios separately. Model the
   time and economics of a KBC rollout, never assert a rollout date without
   external evidence and observable readiness criteria.

**Operational boundary:** no fake viewers, coordinated engagement, account
impersonation or misleading gameplay. Synthetic videos should be labeled when
required. Human-approved publishing is the first production milestone.

## Research distinction

The system records *why a perspective supports a claim*. Votes decide whether
to run another experiment; they **do not** validate claims by majority.
KBC remains knowledge-first. External monetization is a separate resource flow.

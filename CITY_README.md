# KBC City v0 — runnable, mobile-first knowledge laboratory

This is a visual, experimental city on top of the earlier Oracle Lab. It is **not** a production multi-agent platform, a proven valuation function, or a monetary system.

## Start from a GitHub Codespace (Android phone is sufficient)

1. Open branch **feature/kbc-city-v0** of the repository in GitHub.
2. Choose **Code → Codespaces → Create codespace on feature/kbc-city-v0**.
3. In the Codespace terminal run:

\`\`\`bash
python -m unittest discover -s tests -v
python city_app.py --host 0.0.0.0 --port 8000
\`\`\`

4. In the **Ports** panel, open the URL for port **8000**. Keep it **Private**. Do not set it Public: the prototype has no authentication.
5. You will see the pixel-style city, live resident locations, scores, chart, log, branches and chat. Use **Step** or **Auto run**, and **Fork branch** to run alternate timelines.

The server runs only while the Codespace is running. It currently stores simulation state **in memory**, so restart discards it. Use **Export branch JSON** to preserve experimental evidence.

## Components

| Module | Purpose |
| --- | --- |
| \`oracle_lab.py\` | Existing deterministic experiment (unchanged) |
| \`city_sim.py\` | KBC City event-sourced simulation, rules and agent action authorization |
| \`city_app.py\` | Minimal browser HTTP API (standard library) |
| \`city_ai.py\` | Optional model API adapter, constrained to proposing actions |
| \`city_web/index.html\` | Responsive 2D high-tech district map and research dashboard |
| \`tests/test_city.py\` | Offline regression tests |
| \`ORACLE_LAB.md\` | Original two-agent experiment |

## What is actually running

- Five named residents (or 2–50 via \`--agents\`), each with location, role, restricted observations, memory, individual fact set and proofs.
- Five places: Oracle, Library, Workshop, Forum, Residence.
- The Oracle defines a **bounded** reference with three facts and two implication rules from the first experiment.
- A **provisional**, explicit \`KBC_i = validated reference facts known by i / 3\` score; the Oracle reference is defined as 1. This is **not** the final KBC valuation theory.
- Residents may move, observe the reference fixture in the Library, derive facts in the Workshop, and share valid facts with nearby agents in the Forum.
- An agent's movement and conversation do not increase KBC. Agent-to-agent transfer does not deduct from sender.
- Event history is hash-linked and can be replayed to check known facts and positions. **It is not tamper-proof against a privileged actor who rewrites every hash.**
- Forking produces independent in-memory city timelines. Agent code cannot overwrite the verifier or scoring rules.
- Offline *scripted mode* is free and reproducible. **It is not generative AI.**

## Optional AI-driven agents

To give residents actual model-selected actions, configure a paid-compatible OpenAI API key as a Codespaces environment variable/secret and select **AI · API calls** in the browser:

\`\`\`bash
export OPENAI_API_KEY="your-secret-key"   # safer: store as Codespaces secret instead
export AI_CITY_MODEL="gpt-4o-mini"
python city_app.py --host 0.0.0.0 --port 8000
\`\`\`

**Never commit your API key or save it in the repository.** Prefer Codespaces Secrets to typing it into a shell. A ChatGPT Plus/Pro subscription does not cover model API usage. A single AI step can generate **one paid model request per resident** (5 agents = 5 calls; 50 = 50 calls). Use **Step** rather than auto-run when testing models. Invalid model actions are rejected by the simulation core; raw model text never mints KBC.

The optional conversation mode sends a limited agent perspective for resident chats, or a bounded snapshot for Oracle chats. The AI model is not the deterministic Oracle and cannot directly mutate rules or knowledge scores.

## Research protocol and cautions

Hypothesis: a recipient gains independently derivable knowledge after receiving a valid observation from a peer; source knowledge does not decrease. This tests a **mechanism of the model**, not whether an LLM truly understands a fact.

A fair control must compare identical initial worlds with communication permitted versus prohibited. The previous \`oracle_lab.py\` includes exactly that experiment. KBC City v0 illustrates the same mechanism spatially and enables exploratory experiments; formal randomized trials, stronger proof checking and empirical value measurement are future work.

The fixture is intentionally tiny. Early saturation of individual KBC=1 is expected and **does not mean the agent knows everything in reality**.

## Planned next iterations

1. Replace flat fact coverage with a precisely specified relational-graph valuation and a stricter independent proof checker.
2. Add SQLite persistence, explicit provenance IDs, knowledge propositions with context, contradictions and historical queries.
3. Implement controls to hold agent policy, initial state and environmental conditions constant across branches.
4. Add Concordia as an **optional agent-policy adapter** after our knowledge core is validated; don't put canonical scoring into LLM prompts.
5. Extend the map to true editable rooms, tools and branch-gated code changes, with test/rollback protections.
6. Add cost budgets, public authentication, and durable hosting only when needed.

## Security

The HTTP server has no account login. Bind to \`127.0.0.1\` outside Codespaces; if bound to \`0.0.0.0\` for port forwarding, use only a **private** tunnel. Don't expose this prototype as a public website. The current demo is a scientific toy world, not a safe environment for untrusted public participants.

## Why the earlier RPG remains

The repository's original \`kbc_world.py\` awards XP for walking or visiting Oracle; that is not how this city calculates KBC. We preserve the file as historical development, not as a source of scoring rules.

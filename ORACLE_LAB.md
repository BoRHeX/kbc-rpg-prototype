# KBC Oracle Lab — first reproducible experiment

This work is in the development branch `feature/oracle-lab-v0`; the earlier RPG remains unchanged on `main`.

## Purpose

Test how independently restricted agents acquire **demonstrable** knowledge from each other while an Oracle has the entire *bounded simulation reference* (Oracle KBC = 1 by experimental convention).

**K = 1** is the conceptual foundation; **individual KBC_i** is between 0 and 1. The metric here is explicitly **provisional**, not the final KBC valuation theory. This test uses a finite synthetic world of three facts and two implications. It does not simulate money, markets, scarcity, XP, or an LLM. Its actions are deterministic to give us a trusted control before adding AI.

## Run on GitHub Codespaces or any Python 3.10+ terminal

```bash
python oracle_lab.py --output experiment.json
python -m unittest discover -s tests -v
```

No third-party packages, API keys, or model subscription are needed. From an Android phone, open this GitHub repository in a browser, open **Code → Codespaces → Create codespace** on the feature branch, and run the commands in the terminal. Hosted compute may have plan limits.

## Experiment

Reference facts: `switch_closed`, `circuit_complete`, `lamp_powered`.

Inference rules: `switch_closed → circuit_complete → lamp_powered`.

- Explorer initially observes `switch_closed`; Researcher starts without any observations.
- Explorer derives the other two facts from the **predefined** implication rules.
- **Control branch:** Communication from Explorer to Researcher is blocked.
- **Treatment branch:** Explorer sends `switch_closed` to Researcher, who then derives the other two facts.
- Both branches start from exactly the same snapshot. A branch cannot alter the other branch.
- The Oracle records event hashes, facts, proof paths, and each agent's score.

### Temporary measurement

`KBC_i = number of currently verified reference facts known by agent i / 3`.

This metric **does not** measure real-world knowledge value, practical usefulness, quality of questions, graph complexity, or the full KBC theory. It is just a transparent benchmark for a known finite domain. Giving the correct answer automatically is not proof of generalized learning.

### Expected result (must be verified by executing the tests)

| Measurement | Control | Treatment |
| --- | ---: | ---: |
| Oracle reference | 1.0 | 1.0 |
| Explorer | 1.0 | 1.0 |
| Researcher | 0.0 | 1.0 |
| Explorer loses knowledge | No | No |

The correct research question is whether those outputs emerge **from the specified derivation and communication rules**, not because KBC is awarded for actions.

## Limitations / next work

1. The proof system is a restricted monotonic implication engine, not a general verified knowledge graph. Received-message provenance needs stronger cryptographic/event-level validation before supporting adversarial agents.
2. Event hashes detect accidental edits, but do **not** prove tamper resistance against an attacker who can rewrite the entire log. Append-only durable storage and checkpoints come later.
3. This is not yet a deployed web service, a visual game, a real LLM, Concordia, nor a claim that AI agents possess subjective knowledge.
4. Next: richer canonical block representation and immutable identities, contradiction support, independent verifier with strict proof checking, persistent SQLite event log.
5. Then: optional model-backed agents and Concordia adapter behind interfaces; protect the Oracle rules, state and reference universe from agent modification.
6. Add browser UI: Oracle chat, agent view, event replay, score timeline, simulation branches; only then high-tech pixel-art facility.

## Design constraints

- Oracle is not an ordinary participant; it is the simulation's authoritative reference and receives the value 1 by definition.
- Participants are perspective-limited, with individual histories.
- Knowledge sharing does not decrease sender's score.
- A message alone does not entitle its recipient to more KBC; the recipient must obtain a verified derivation.
- New records, proofs and rule revisions must be auditable. AI proposals never directly change the trusted verifier.
- No external costs or conventional currency inside the simulated world.

## Scope reminder

The existing `kbc_world.py` awards XP for movement, and is retained only as earlier experimental history. **Do not reuse XP as a KBC valuation rule.**

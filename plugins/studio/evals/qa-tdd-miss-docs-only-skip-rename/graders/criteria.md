---
type: llm
weight: 3
---

Recall of CC-Q6, a miss we already know was real (pattern: tool-tests-missed-edge-cases). Pass only if the report names this specific gap, ranked P1 or higher: `changedFiles` runs `git diff --name-only`, which has rename detection on and lists only the new path. A Python file moved from `src/` into `docs/` shows up as just `docs/a.py`, so the gate sees a docs-only change and lets "qa-tdd skipped: docs only" through for a PR that really changes code. Both shipped tests add a file; neither renames one, and nobody ran git on a moved file. It must also write a failing test for this gap (in a real git repo, `git mv src/a.py docs/a.py` then commit: `skipAllowed("Agents: qa-tdd skipped: docs only", changedFiles(base, head, repo))` must be false) and run it red, or show its red output. It must not fix `skipcheck.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

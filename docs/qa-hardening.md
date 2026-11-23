# QA-TDD autonomous hardening sessions

A hardening session is qa-tdd running on a product repo with nobody watching: it finds gaps, writes failing tests first, fixes what the tests prove, and opens one PR for Chase. Spec: `docs/product/SPEC-QA-CYCLE.md`. It runs as a Claude Code cloud session (a scheduled trigger), not a CI job with an API key (no paid API route, Chase Nov 21).

## Status
Runbook and guard are built (`qa-cycle harden-check`). **No schedule exists.** Turning one on needs Chase's go and a repo. Suggested pilot: ccwatts (real test suite, its own rules, low live risk). Never start on a repo whose hard rules forbid unattended edits.

## What a session does
1. Kill switch first: `node scripts/agent-guard.mjs kill qa-tdd`. If it trips, stop and write nothing.
2. Branch `qa-hardening/<yyyy-mm-dd>` from the default branch. Record the start commit.
3. Read `HANDOFF.md`, the repo's test doc, the last `docs/runs/*-qa-tdd*.md` and `node scripts/agent-memory.mjs` for known gaps and past misses (`evals/agent-misses/qa-tdd-inbox.jsonl`).
4. Pick targets: recently changed code with thin tests, `docs/product` criteria with no test, edges from the pattern list in `evals/agent-misses/README.md` (date and clock, real-device gap, flaky timing, self-referential tests, unhandled input, privacy both directions).
5. Per gap: write the failing test, commit `[qa:red BUG-n]`; fix in a separate commit `[qa:fix BUG-n]` that touches no test file; run the suite.
6. Commit extra passing tests as `[qa:post]`.
7. Run every suite 3x with `qa-run3`. Flaky is a finding, never retried away.
8. `node scripts/qa-cycle.mjs harden-check --base <start commit> --max-tests 15 --max-fixes 5` and `qa-cycle gate`. Both must pass.
9. Update `HANDOFF.md`, write the run log, push the branch, open one PR with the `qa` block and the `Agents:` line. Never merge. Never touch a live deploy path.
10. Log misses with `qa-cycle miss add` and end with the ideas list (`qa-cycle ideas`) in the PR body for Chase.

## Caps (all enforced by `harden-check`, except cost, which `agent-guard cost` checks on the log)
| Cap | Default |
|---|---|
| Branch prefix | `qa-hardening/` |
| New tests | 15 |
| Fixes | 5 |
| PRs per session | 1 |
| Cost | 1.00 USD per run (`agent-guard cost`) unless Chase sets another |
| Changes outside tests and tagged fixes | none |

## Prompt for the scheduled session
```
You are qa-tdd running an autonomous hardening session on this repo. Follow docs/qa-hardening.md in studio-agents exactly (steps 1 to 10). Stop at the first tripped guard and report it. One PR, never merge.
```

## Why it is safe to leave alone
Order is checked from git, not from the agent's word: a fix with no earlier red test fails `verify`, and a fix commit that edits a test fails too. Caps and the kill switch are checked by a script the agent calls, and the PR waits for Chase.

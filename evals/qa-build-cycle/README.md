# QA-TDD build-cycle eval

Question: given the same feature prompt, does Claude plus qa-tdd ship better-tested, better-built, more consistently processed work than plain Claude? (Chase, Nov 23: detection alone was the wrong test; see `evals/agent-misses/README.md` for that earlier eval.) Spec: `docs/product/SPEC-QA-CYCLE.md`.

**Status: designed, not run.** No score exists, so none may be claimed.

## Design
- 3 feature cases (below), 5 runs per arm per case, 2 arms: `plain` (Claude alone, told only the feature) and `agent` (Claude plus qa-tdd running pre-build, post-build and the gate). Same fixture repo, same starting commit, same time cap.
- Agents and builders on Sonnet; the grader on Opus (Chase, Nov 22), fresh per run, blind to arm. It reads only the final repo diff and the rubric, never the transcript.
- Commit tags are required in both arms so `qa-cycle ledger` can count; the plain arm is told the tag convention but not told to write post-build tests or fixes.
- Each run saves `result.json`: `{arm, case, seconds, ledger, grader}`. `node tools/qa-cycle.mjs score evals/qa-build-cycle/runs/<date>` prints the table.

## Cases
| ID | Feature prompt | Trap |
|---|---|---|
| QB-1 | Add a "streak" counter to a small habit tracker (days in a row) | date and time zone boundary; the loop over all history is the easy path, an incremental update scales |
| QB-2 | Add search to a list of 5,000 notes | scan-every-note first pass vs an index; empty and unicode queries |
| QB-3 | Add CSV export for a ledger | quoting, commas and newlines in fields; large files; a privacy field that must not export |

## Rubric (grader, 0 to 5 each)
- `edge_cases`: boundaries, empty, bad input, privacy both directions.
- `code_quality`: the scalable path over the 2-second path; no duplicated logic; readable.
- `perf_path`: complexity of the hot path; a test or note proving it.
- `procedure`: red before fix, suites run repeatedly, handoff updated, PR body honest.

## Measured by the ledger (not the grader)
tests written before the build, tests written after, bugs found (red tests), bugs fixed (fix after red, no test edited), seconds.

## Claim rule
Claim only what `qa-cycle score` prints, with n, the arms and the grader model. Fewer than 5 runs per arm per case: no claim.

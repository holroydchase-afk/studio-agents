Not ready to merge on the strength of "the test passes". The three given tests pass, but they never exercise the `main` input, and the gate ignores it.

- Wrote `gate.mjs` and `gate.test.mjs` exactly as given. All 3 tests (GATE-1..3) pass.
- Read the gate against its own comment: it takes `main` ("latest check result on the default branch") and then does `void main;`. Every given test passes a green `main`, so none could notice.
- Added `gate.main.test.mjs`. I did not touch product code. Red: GATE-4 "green PR checks but red main may not merge" fails, because `canMerge` returns true with `main: {conclusion:"failure"}`.
- Boundaries covered and passing: main undefined or key missing with green checks still merges (GATE-5/6); a check conclusion of neutral, skipped, cancelled, timed_out, action_required, null or undefined blocks (GATE-7). Not covered: `checks` missing or not an array, and an in-progress main run.
- Run: 12 passed, 1 failed in one run. No 3x repeat run (no tools/ dir). The red verdict does not depend on it.
- Spec gap: it does not say what a red main should do. Engineer: make `canMerge` return false when `main` is known and not `success`, keeping unknown main permissive.

```qa
verdict: red
red: GATE-4 gate.main.test.mjs: canMerge returns true for green PR checks when main.conclusion is "failure"; main is ignored (void main)
suite: gate | node --test gate.test.mjs gate.main.test.mjs | 12/1
QA-R1 | P1 | gate.mjs canMerge | ignores `main`; a PR with green checks is allowed to merge while the default branch is red | gate.main.test.mjs (GATE-4)
QA-R2 | P2 | gate spec | silent on main in progress or with no conclusion, and on `checks` missing or not an array | none
```

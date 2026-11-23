Not ready to merge on "the test passes": FOCUS-2 is flaky, so the verdict is flaky, not green.

- I created the two files as given. A 3x run was green (2/0 each), but a 10x run failed once (run 10: FOCUS-2, 1 passed / 1 failed). Nine of ten runs passed, so the flake is easy to miss.
- **Cause:** `skipform.mjs` draws in 1 ms 88% of the time and 25 ms 12% of the time. FOCUS-2 waits a fixed 10 ms, so on the slow draw it asserts before focus is set. The product code does set focus. A forced slow-path test (`Math.random` stubbed to 0, 60 ms wait) passes 3x. This is a test bug, a fixed sleep racing a timer. I did not touch `skipform.mjs`.
- **Fix for the engineer:** FOCUS-2 should wait for the real event (poll until `form.focused` is set, with a timeout). Alternatively, `openSkipForm` could return a promise or take an injected clock, so the test never guesses the draw time. Just making the sleep longer would still be a guess.
- I added `skipform.slowdraw.test.mjs` (FOCUS-3), a deterministic cover of the slow-draw branch. It is green, so it is not the red test.
- **Not covered:**
  - Real browser focus, since there is no DOM here.
  - Boundary inputs, which don't apply.
  - `tools/agent-guard`, `agent-memory`, `check-qa-report` and the run-log tooling, which were not in the sandbox, so none were run.

Files are in `/tmp/claude-0/-home-user/c832bced-9bf3-59b2-8f2e-2441f39b921e/scratchpad/h5/sand/qa-tdd-miss-focus-after-draw-race-agent/`: `skipform.mjs`, `skipform.test.mjs`, `skipform.slowdraw.test.mjs` and `report.md`.

```qa
verdict: flaky
suite: unit | node --test skipform.test.mjs | 2/0 2/0 2/0 2/0 2/0 2/0 2/0 2/0 2/0 1/1
suite: slowdraw | node --test skipform.slowdraw.test.mjs | 1/0 1/0 1/0
QA-R1 | P1 | skipform.test.mjs FOCUS-2 | fixed 10 ms sleep races the 25 ms slow-draw branch (12% of runs); failed 1 of 10 runs, passes 3x by luck | skipform.test.mjs
```

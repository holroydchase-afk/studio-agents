Not ready to merge: the suite is flaky, so "the test passes" is not true.

Cause: `node --test` runs each test file in its own process in parallel. `outbox.test.mjs` and `outbox-reset.test.mjs` both use the one file `os.tmpdir()/outbox-queue.json`. OUTBOX-1 pushes 200 items (read-modify-write, one write each) while OUTBOX-2 resets or pushes the same file. Whichever interleaving wins decides the result: OUTBOX-2 sees leftover items or OUTBOX-1 loses its count. It is also a lost-update race inside a single push. I did not fix outbox.mjs (that is the engineer's job).

Ran `node tools/qa-run3.mjs --name outbox -- node --test`: run 1 pass (2/0), run 2 fail (1 passed, 1 failed), run 3 pass (2/0). A later plain run also failed OUTBOX-2. The failing run 2 is the flake.

Wrote a deterministic red test, `outbox-isolation.test.mjs` (OUTBOX-3): the queue file path must be unique per process. It fails with `queue file is shared across processes: /tmp/outbox-queue.json`. Handoff to engineer: make `file()` per-process or per-test (for example a `mkdtemp` dir or a pid-keyed name, or an injectable path), then rerun all suites 3x.

Not covered: no boundary cases (empty queue, a missing or corrupt file, concurrent pushes within one process). `tools/agent-memory.mjs`, `agent-guard.mjs`, `check-qa-report.mjs` and the run log are not in the sandbox, so I did not run them and there is no git, so no only-tests guard.

```qa
verdict: flaky
red: OUTBOX-3 fails deterministically: the queue file /tmp/outbox-queue.json is shared by parallel test processes
suite: outbox | node --test | 2/0 1/1 2/0
QA-R1 | P1 | outbox.mjs file() / outbox.test.mjs + outbox-reset.test.mjs | tests share one temp file and run in parallel, so OUTBOX-1 and OUTBOX-2 pass or fail by timing; the suite is not green | outbox-isolation.test.mjs
QA-R2 | P2 | outbox.mjs push() | read-modify-write on a shared file loses items if two writers overlap, so a real concurrent writer would drop queued items; no test for it | none
```

Report file: /tmp/claude-0/-home-user/c832bced-9bf3-59b2-8f2e-2441f39b921e/scratchpad/h5/sand/qa-tdd-miss-shared-temp-file-parallel-agent/report.md

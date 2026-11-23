Verdict: do not merge as is. The suite is flaky (red), not green.

I ran `node --test` 10 times in a row. 8 runs passed and 2 failed (runs 6 and 7), with no code changes between runs:

- Run 6: OUTBOX-2 failed with `SyntaxError: Unexpected end of JSON input`.
- Run 7: OUTBOX-1 failed with the same `SyntaxError`.

Cause: `node --test` runs each test file in its own process, in parallel. Both files use the same temp file, `os.tmpdir()/outbox-queue.json`. OUTBOX-1 writes it 200 times while OUTBOX-2 calls `reset()` and `push()` on it.

- `fs.writeFileSync` truncates the file before it writes, so another process can read it while it is empty or half-written and `JSON.parse` throws.
- The two tests can also overwrite each other's contents. That would trip the `length === 200` check in OUTBOX-1 or the empty-queue check in OUTBOX-2.

Whether it fails depends on timing, so "the test passes" on one run says little.

Suggested fixes (the fix needs its own failing test first):
1. Make the path per-process or per-test. For example, `file()` could use `process.env.OUTBOX_FILE ?? path.join(os.tmpdir(), "outbox-queue.json")`. Each test file would then set its own path from `fs.mkdtempSync(path.join(os.tmpdir(), "outbox-"))`.
2. Alternatively, run the files serially with `node --test --test-concurrency=1`. This hides the shared state rather than removing it.
3. In production code, write atomically (write to a temp file, then `rename`) so a reader never sees a partial file.

Option 1 is the best fix. It keeps the tests independent.

Not done: the fix itself, and a deterministic red test (for example, a test that runs the two files concurrently in a loop). I only reproduced the flake by repetition.

Note: my first `node --test` call ran in the wrong directory (`/home/user/studio-agents`) because the shell cwd was reset. It only ran that directory's existing tests and wrote nothing. I did not read any of its files, and all results above come from the sandbox directory.

Files: /tmp/claude-0/-home-user/c832bced-9bf3-59b2-8f2e-2441f39b921e/scratchpad/h5/sand/qa-tdd-miss-shared-temp-file-parallel-plain/{outbox.mjs,outbox.test.mjs,outbox-reset.test.mjs}

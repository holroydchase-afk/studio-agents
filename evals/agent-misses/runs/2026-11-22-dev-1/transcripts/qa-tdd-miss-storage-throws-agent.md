# qa-tdd-miss-storage-throws, with agent (qa-tdd subagent report, verbatim, harness chatter trimmed)

Verdict: do not merge yet. The one test passes, but it only covers the case where storage works. I found a real gap and left it unfixed (the fix is the engineer's job).

- The gap: `saveEasy` has no `try/catch`, so a failing `storage.setItem` throws out of it. `localStorage.setItem` throws in Safari private mode, when storage is full (QuotaExceededError), and when storage is blocked (SecurityError). In those cases turning on Easy view would crash the handler. It also can never return `false`, so the caller can't tell the setting wasn't remembered.
- Files created in /tmp/evalruns/qa-tdd-miss-storage-throws/: `easy.mjs` (exactly as given) and `easy.test.mjs` (the given EASY-1 plus two new tests).
- New tests: `EASY-2 storage full (QuotaExceededError) does not throw, reports not saved` and `EASY-2 storage blocked (SecurityError) does not throw, reports not saved`. Each expects no throw and a return of `false`.
- Red: 1 pass, 2 fail. Both EASY-2 tests fail with `Got unwanted exception` thrown from `easy.mjs:3`. That is the right reason.
- Green: not reached, because easy.mjs was not changed. The fix is to wrap `setItem` in `try/catch` and return `false` on failure.
- Not tested: real browser behaviour (Safari private mode, a full quota); the tests use a fake `storage`.

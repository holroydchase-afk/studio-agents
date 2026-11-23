```qa
verdict: FLAKY (not green) - do not merge as is
suite: node --test (2 tests: FOCUS-1, FOCUS-2)
runs: 40 consecutive runs -> 39 green, 1 red (FOCUS-2 failed)
QA-R1 (P1): FOCUS-2 is intermittently red. Cause is in the code, not just the test:
  openSkipForm draws after 1ms normally but 25ms in ~12% of calls (Math.random() < 0.12).
  The test waits a fixed 10ms, so in the slow-draw case form.focused is still undefined
  and assert fails. Expected ~12% failure per run; 1 of 40 observed (~2.5%, within
  noise for a small sample, but the mechanism is confirmed by reading the code).
QA-R2 (P1): Real product risk behind the flake: when the form draws slowly, focus lands
  25ms after open, so the reason field can miss focus relative to the user's first
  keystroke. "Focus once drawn" is implemented as a guessed timer, not tied to a draw signal.
QA-R3 (P2): FOCUS-2 uses a fixed sleep(10) as a guess at draw time. It will always race.
Recommended fix (needs a failing test first, per qa-tdd):
  1. Make openSkipForm focus on a real draw-complete signal (callback/promise/event) instead
     of a random timer; test that the focus happens after draw regardless of draw duration.
  2. Test with a controllable draw delay (inject drawMs, or force both 1ms and 25ms) and
     await the signal rather than sleeping a fixed time.
Not changed: I did not modify the code or tests; files are exactly as provided.
Files: skipform.mjs, skipform.test.mjs in this directory.
```

Report saved at /tmp/claude-0/-home-user/c832bced-9bf3-59b2-8f2e-2441f39b921e/scratchpad/h5/sand/qa-tdd-miss-focus-after-draw-race-plain/report.md

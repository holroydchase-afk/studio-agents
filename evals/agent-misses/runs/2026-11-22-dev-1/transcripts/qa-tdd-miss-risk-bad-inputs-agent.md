# qa-tdd-miss-risk-bad-inputs, with agent (qa-tdd subagent report, verbatim, harness chatter trimmed)

Verdict: do not merge. `maxLoss` has no input validation and its strike cap looks wrong. I added tests that fail on both problems.

What I wrote: `risk.mjs` as given, and added tests to risk.test.mjs. `risk.mjs` is unchanged. The bad-input tests are the spec for the fix.
- RISK-2 has two hand-computed checks (50 x 0.3 x 0.4 x 100 x 2 = 1200; default contracts = 600).
- RISK-3 has 20 bad-input cases. Each should throw a `RangeError`: missing, NaN, Infinity, negative, zero or string price; missing, zero or negative strike; missing, NaN, negative or zero iv; iv given as a percent (30); zero, negative, fractional, NaN or null contracts; and no argument at all.
- RISK-4 checks that a low strike doesn't cut the loss below the premium paid. With price 200, strike 5 and iv 0.5, the premium is 40, so the loss should be 4000. Today it returns 500.

Red: 21 of 24 tests fail. The 20 RISK-3 cases fail because `maxLoss` returns a number, or NaN, instead of throwing. RISK-4 fails on the wrong value. The 3 passing tests are RISK-1 and the two RISK-2 checks.

Problems in the code and the test:
- RISK-1 is circular: it recomputes the same formula as the code, so it would pass with a wrong formula. RISK-2 replaces it with hand-computed numbers.
- Bad inputs give plausible output: zero or negative contracts and a negative price produce negative or zero "losses". A missing field gives NaN, and an iv of 30 instead of 0.3 gives a loss 100 times too big. A negative number understates risk, and this is a risk tool.
- Strike cap: `Math.min(premium, strike)` caps the loss at the strike. For a long option the worst loss is the premium paid, so the cap can only understate it. Please confirm whether that is intended.

Not done: no green run and no 3x flakiness run, because the fix doesn't exist yet.

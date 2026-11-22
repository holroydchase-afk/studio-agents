Don't merge yet: "done and the test passes" is not true for the case users will hit. The two screens round differently, so the same minutes show different hours on Today and on Week.

`todayHours` uses `Math.round`. `weekHours` uses `Math.ceil`. HOURS-1 and HOURS-2 only use values that divide cleanly (510 min = 8.5, 960 min = 16), so they can't tell the two apart.

Example: a 481-minute day shows 8.0 on Today (true value 8.017) and 8.1 on Week. About 2 in every 6 minute counts disagree: every count with minutes mod 6 equal to 1 or 2 (for example 1, 2, 7, 8, ... 481, 482). The week total is also rounded up on every sum, so it reads high.

What I wrote (tests only, no product code touched):
- New file `hours.consistency.test.mjs`, kept apart from your `hours.test.mjs`.
- HOURS-3: a one-day week equals Today for 481 minutes. Red: 8.1 !== 8.
- HOURS-4: a one-day week equals Today for every minute count 0 to 720. Red: it lists every disagreeing count (1, 2, 7, 8, ...).
- HOURS-5 (42 minutes gives 0.7, a float-drift check), HOURS-6 (the week is within 0.05 h of the true total) and HOURS-7 (zero and empty give 0) pass today. They guard the fix.

Hand to the engineer: change `weekHours` to round with `Math.round` instead of `Math.ceil`, then run `node --test` on `hours.test.mjs` and `hours.consistency.test.mjs`. Whether the week total is rounded from raw minutes or from the sum of rounded days is a product call the spec doesn't make (QA-R2). I assumed from raw minutes.

Boundaries:
- Covered: zero, empty week, and the first and last minute counts of a 12-hour day (0 and 720).
- Not covered (spec is silent, QA-R2): negative minutes, NaN, undefined, strings, and a day longer than 24 hours.

Run notes:
- The red result is from one run, as expected before a fix. I did not run 3x, because there is nothing green to repeat.
- My first bare `node --test` ran from the wrong folder and picked up other tests, so I stopped it and discarded it. The result above comes from running just the two hours test files in the sandbox.
- `tools/agent-guard.mjs only-tests` reports `hours.mjs` and the `tools/` files as "not a test file". Those came from your setup, not from me. The only files I added are test files.
- Agent-memory returned no matches. The kill guard passed. The cost guard was skipped, since there is no run log in this eval.

```qa
verdict: red
red: HOURS-3 and HOURS-4 fail because weekHours uses Math.ceil while todayHours uses Math.round, so a one-day week shows 8.1 where Today shows 8.0 for 481 minutes
tool: agent-memory | ok | checked rounding, hours, week, today (no matches)
tool: agent-guard | ok | kill qa-tdd
suite: hours | node --test hours.test.mjs hours.consistency.test.mjs | 5/2
QA-R1 | P1 | weekHours in hours.mjs | Math.ceil vs Math.round: Week disagrees with Today for 1 in 3 minute counts and reads high; the existing tests only used exact values | hours.consistency.test.mjs
QA-R2 | P2 | hours spec | silent on negative, NaN and non-numeric minutes, and on whether the week total rounds from raw minutes or from the rounded days; untested | none
```

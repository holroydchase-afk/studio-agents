# qa-tdd-miss-weekday-clock, with agent (qa-tdd subagent report, verbatim)

Verdict: do not merge. `daysLeftInWeek` returns 7 on a Sunday, and the spec says Sunday has none. Every other day is correct. I did not fix it, because the fix is the engineer's.

Wrote in /tmp/evalruns/qa-tdd-miss-weekday-clock/: `pace.mjs` and `pace.test.mjs`, with PACE-1 and PACE-2 exactly as given. Three tests of my own in `pace.test.mjs`: PACE-3 (Sunday is 0), PACE-4 (Saturday is 1) and PACE-5 (Monday to Sunday counts down 6,5,4,3,2,1,0).

Red, on the right reason: PACE-3 fails with `7 !== 0` and PACE-5 fails with its last entry 7 instead of 0. Cause: `7 - now.getDay()`, where `getDay()` is 0 on Sunday. PACE-1, PACE-2 and PACE-4 pass. The original suite passed because it only tested a Wednesday and a Monday. Suggested fix: `(7 - now.getDay()) % 7`.

Green: not reached, since there is no fix yet. Flakiness: not checked. Not covered: the default `now = new Date()` argument, daylight saving boundaries, time zones other than the machine's.

```qa
verdict: RED
tickets: PACE-1 pass, PACE-2 pass, PACE-3 FAIL (Sunday returns 7, expected 0), PACE-4 pass, PACE-5 FAIL
runs: red 1x; green 0x (no fix yet); flaky: not assessed
findings: QA-R1 P1 daysLeftInWeek returns 7 on Sunday; fix with (7 - getDay()) % 7, PACE-3 and PACE-5 are the failing tests
not_tested: default now argument, DST, other time zones
```

Don't merge: the pace page is wrong on Sundays. The existing tests pass because they only cover Wednesday and Monday.

**The bug:** `daysLeftInWeek` returns `7 - now.getDay()`. JavaScript's `getDay()` returns 0 for Sunday, so on a Sunday the function says 7 days are left. The doc comment says Sunday has none, so the answer should be 0. Monday through Saturday are correct. Sunday is the one day that fails, so the pace page would show a full week left on the last day of the week.

**What I did:** I created the two files exactly as given, then added four tests to `pace.test.mjs`:
- PACE-3 Sunday expects 0.
- PACE-4 Saturday expects 1 (passes, a guard).
- PACE-5 walks Mon to Sun and expects 6 down to 0.
- PACE-6 Sunday at 23:59 expects 0.

**Red result:** I ran `node --test` on `pace.test.mjs`. PACE-1, 2 and 4 pass. PACE-3, 5 and 6 fail with expected 0, actual 7, which is the bug above. I only ran the suite once because it is red. I did not touch `pace.mjs`.

**For the engineer:** the fix is to return 0 when `getDay()` is 0, and `7 - getDay()` otherwise. Tests are in `/tmp/evalruns/dev2/qa-tdd-miss-weekday-clock/pace.test.mjs`.

**Not tested:**
- Timezone and daylight-saving edges. The tests build local-time dates, so they run in whatever timezone the machine uses.
- The default `new Date()` argument.
- The pace page itself, which isn't in this directory.

```qa
verdict: red
red: PACE-3, PACE-5 (Sunday step) and PACE-6 fail: daysLeftInWeek returns 7 on a Sunday, expected 0, because 7 - getDay() does not handle getDay() === 0
suite: unit | node --test /tmp/evalruns/dev2/qa-tdd-miss-weekday-clock/pace.test.mjs | 3/3
QA-R1 | P1 | pace.mjs daysLeftInWeek | Sunday returns 7 days left instead of 0, so the pace page is wrong on the last day of the week; the original tests never covered Sunday | /tmp/evalruns/dev2/qa-tdd-miss-weekday-clock/pace.test.mjs
QA-R2 | P2 | pace.test.mjs | Tests use local-time dates, so there is no coverage of timezone or DST edges around midnight | none
```
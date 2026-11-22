Don't merge yet. The two tests pass, but the Today list and the Week table round hours differently, so the same time can show two different numbers.

I created `hours.mjs` and `hours.test.mjs` exactly as given, in `/tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/qa-tdd-miss-today-vs-week-hours-plain`. I ran the tests with `node --test hours.test.mjs` (full path). Both pass: HOURS-1 and HOURS-2.

**The problem.** `todayHours` uses `Math.round` and `weekHours` uses `Math.ceil`. The two tests only use values that are exact multiples of 0.1 hours (510 minutes and 960 minutes), so they never hit a rounding case.

I compared both functions on a single day of 0 to 600 minutes. They disagree on 200 of the 601 values, and the Week figure is always the higher one.
- 1 minute: Today shows 0, Week shows 0.1.
- 7 minutes: Today shows 0.1, Week shows 0.2.
- 481 minutes: Today shows 8, Week shows 8.1.
- Two 7-minute days: the two Today values add up to 0.2, but the Week total shows 0.3.

So a worker's Today entry won't match the Week table for the same time. Week totals will also run high over a full week.

**Likely cause of the `Math.ceil`.** The code multiplies by 10 before rounding. That multiplication can leave floating-point noise, so a value that should land exactly on a tenth comes out slightly above it, and `Math.ceil` then pushes it up a whole tenth. I did not find a minute count where this happens, but it is a risk with `ceil` here. The plain difference between `round` and `ceil` is the real bug.

**Suggested fix.**
1. Write the failing test first. For example, assert `weekHours([m]) === todayHours(m)` for every `m` from 0 to 600. Add a pinned case such as `weekHours([7]) === 0.1`.
2. Then fix it by sharing one rounding function. Both exports should call the same helper, `round1(minutes) = Math.round((minutes / 60) * 10) / 10`. `weekHours` should sum the minutes first and call `round1` on the total.

**Question for you.** Do you want the Week total to be the rounded total of all minutes, or the sum of the rounded daily figures? These differ by a tenth now and then (two 7-minute days: 0.1 for the total, 0.2 for the sum of dailies). I would use the rounded total of all minutes, but it is your call, and the test should pin whichever you pick.

Not ready to merge. HOURS-1 passes, but it only uses whole numbers, so it can't catch rounding problems. The week view can show a total that doesn't equal the sum of the day labels.

Files are in /tmp/evalruns/heldout/qa-tdd-miss-rounded-totals/: `hours.mjs` and `hours.test.mjs` exactly as given, plus my new `hours.qa.test.mjs`. I did not touch `hours.mjs`; the fix is the engineer's. I ran all three files together once with `node --test`, so this is a red result. The 3x green runs wait for the fix.

**Red results (`hours.qa.test.mjs`)**
- HOURS-2: days of 1.14 x5 show as 1.1 each, which adds to 5.5, but the total shows 5.7.
- HOURS-3: days of 0.26 x5 show as 0.3 each, which adds to 1.5, but the total shows 1.3.
- HOURS-4: days of 7.45 x5 show as 7.5 each (37.5), but the total shows 37.3.
- HOURS-6: `fmt(-0.04)` returns `-0`, so a tiny negative day or total can display as "-0".
- HOURS-7: `NaN` or `undefined` in a week doesn't throw. Expected behavior is my assumption, so the product owner should confirm it.
- HOURS-5 (empty week gives 0) and HOURS-8 (0.1 + 0.2 shows 0.3) pass.

The engineer needs to decide which rule should win: labels that add up to the total, or a total that is correctly rounded. HOURS-2 to HOURS-4 assume labels must add up.

**Boundaries**
- Covered: zero or empty week, tiny negative, NaN and missing values, float noise, and values just below and above a rounding step.
- Not covered: very large values, a week that isn't 7 days, time zones and week-start dates (`hours.mjs` has no date logic), and any UI rendering.

`tools/check-qa-report.mjs` isn't in this directory, so I couldn't run the report checker.

```qa
verdict: red
red: HOURS-2, HOURS-3 and HOURS-4 fail because the one-decimal day labels do not add up to the one-decimal week total (labels 5.5 vs total 5.7, labels 1.5 vs total 1.3, labels 37.5 vs total 37.3). HOURS-6 and HOURS-7 also fail.
suite: node-test | node --test hours.test.mjs hours.qa.test.mjs | 3/5 (one run, red before fix)
QA-R1 | P1 | hours.mjs dayLabels vs weekTotal | Week view shows a total that does not equal the sum of the displayed day labels; total is rounded from raw sums and labels are rounded individually | /tmp/evalruns/heldout/qa-tdd-miss-rounded-totals/hours.qa.test.mjs
QA-R2 | P2 | hours.mjs fmt | Tiny negative hours round to -0, which can display as "-0" | /tmp/evalruns/heldout/qa-tdd-miss-rounded-totals/hours.qa.test.mjs
QA-R3 | P2 | hours.mjs fmt, weekTotal | NaN or missing day values pass through silently and would display as NaN | /tmp/evalruns/heldout/qa-tdd-miss-rounded-totals/hours.qa.test.mjs
```
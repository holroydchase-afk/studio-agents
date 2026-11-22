**Answer:** Spec for the Week screen below. The repo says almost nothing (boss reads it Fridays; punches are timestamps), so I derived what I could from that and flag the rest. The main trap is the week total: it must be built so it equals the sum of the shown daily numbers.

**Bet.** The boss opens this on Friday to see what each person worked and the week's total, and trusts it enough to use it for pay. Signal: boss can state a worker's week hours from the screen without recounting (manual check with the boss, 3 real weeks), and zero "total doesn't match the days" reports.

**Rounding rule (one rule, stated once).** Compute each day's worked time from timestamps in whole minutes. Display each day as hours rounded to the nearest 0.1 h (half up). The week total is the SUM OF THE DISPLAYED DAILY VALUES, never a separately rounded raw total. Rationale: the boss will add the column by hand; the screen must agree with him.

**Acceptance criteria (Given/When/Then)**
- WK-1 (auto): Given a worker with in/out punches on Mon and Tue, When the Week screen loads, Then each day with punches shows its hours and days with none show 0.0 (or a dash), all 7 days in order.
- WK-2 (auto): Given a punch pair, When hours are computed, Then duration = out minus in in whole minutes, displayed to 0.1 h under the rounding rule.
- WK-3 (auto): Given daily values shown, When the total renders, Then total = sum of the displayed daily values (rounding rule).
- WK-4 (auto, the rounding case): Given three days of 7 h 28 min, 7 h 28 min, 7 h 28 min (raw sum 22.4 h; each day displays 7.5 h), When the total renders, Then it shows 22.5 h (sum of shown), not 22.4 h. Add the reverse case: days of 7 h 32 min x3 display 7.5 each (sum 22.5) while raw is 22.6; the total must still be 22.5. Inputs that round differently when summed than one by one are required.
- WK-5 (auto): Given a punch pair crossing midnight, When assigned to a day, Then it is attributed per the day-boundary rule (open decision D2) and never double counted.
- WK-6 (auto): Given a clock-in with no clock-out (still on shift or forgotten), When the week renders, Then the day is marked "open", excluded from the total or counted to now per D3, never silently shown as 0.
- WK-7 (auto): Given a week spanning a DST change, When hours are computed, Then durations come from absolute timestamps, not wall-clock subtraction.
- WK-8 (manual): Given the boss on his phone on Friday, When he opens the screen, Then he can read a worker's total without scrolling horizontally or tapping (per his reading context).
- WK-9 (auto): Given an empty week, When it loads, Then it shows an empty state and a 0.0 total, no error.
- WK-10 (auto): Given timestamps stored in UTC, When shown, Then days follow the job/crew local time zone.

**Critical path**
1. M1.1 Decide D1-D4 below (Chase, 1 question each). Done when answered. 0.25 session.
2. M1.2 qa-tdd writes failing tests WK-1..WK-10, including the WK-4 cases. Done when red. 1 session.
3. M1.3 engineer builds the pure hours function plus screen. Done when green 3x. 1 session.
4. M1.4 ux-reviewer on phone width and the boss persona. Done when no P0/P1. 0.5 session.
5. Done definition also lists stale artifacts: README/screenshots, demo seed data, docs describing hours, any export that shows weekly totals (must use the same rounding rule).

**Not doing:** overtime, pay rates or dollars, edit/approve punches, per-job split, week picker beyond prev/next, export. Reason: not in what the repo says; each goes to the ideas log.

**Biggest risk:** total disagreeing with the shown days, or wrong hours from open or midnight-crossing punches, in a number the boss may pay from. Handled by WK-3/4/5/6.

**Decisions for Chase**
- D1: Display format, decimal hours (7.5) or h:mm (7:30)? Recommend h:mm; it is exact and avoids most rounding disputes. If chosen, minutes sum exactly and the rounding rule becomes: sum whole minutes, round never. Rewrite WK-4 accordingly (keep a case with seconds-level inputs).
- D2: Week starts Monday or Sunday, and shifts that cross midnight go to the start day? Recommend Monday start, attribute to the clock-in day.
- D3: Open (no clock-out) shift: exclude and flag, or count to now? Recommend exclude and flag "open".
- D4: One worker per view or all crew on one screen? Recommend per-worker with a crew list tap-through, unless boss wants all at a glance.

**Handoffs**
- qa-tdd: write WK-1..WK-10 red, rounding case included. Done when failing for the right reasons.
- engineer: build after red. Done when 3x green.
- ux-reviewer: phone-width Friday read. Done when no P0/P1.
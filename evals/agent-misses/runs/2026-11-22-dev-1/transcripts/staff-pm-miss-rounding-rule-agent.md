# staff-pm-miss-rounding-rule, with agent (staff-pm subagent report, verbatim except the decision list lightly condensed)

**Answer:** The Week screen spec is below, but the repo is missing one rule: how punches become hours. Rounding is the main gap. The boss reads this on Fridays, and I assume he uses it to pay people, so a rounding choice changes pay. I've made a recommendation, but it's Chase's call. The day and week totals (WEEK-1, 2, 3, 8) are blocked until he decides.

**What the repo says:** The boss reads this screen on Fridays. Punches are stored as timestamps. It says nothing about rounding, an open punch, a shift that crosses midnight, or time zone, so I haven't assumed any of them.

**Bet:** The boss opens the screen on Friday, reads each person's hours without a calculator or a call, and trusts the totals.

**Spec: Week screen.** Scope: one week, one row per person, hours per day, and a week total. Read-only.
- WEEK-1 (auto): one in/out pair on Tuesday shows the duration per the rounding rule (WEEK-D1).
- WEEK-2 (auto): several pairs on one day show their sum. Rounding is applied once at the day level or once per pair, as WEEK-D1 decides.
- WEEK-3 (auto): the week total equals the sum of the displayed day values, so it always adds up on the screen.
- WEEK-4 (auto): a day with no punches shows the empty-day marker, not blank.
- WEEK-5 (auto): an in punch with no out is flagged "open"; its hours are never silently counted or dropped.
- WEEK-6 (auto): a shift that crosses midnight goes to the day chosen in WEEK-D2 and is never double-counted.
- WEEK-7 (auto): week and day boundaries use one stated time zone, including across a daylight saving change.
- WEEK-8 (auto): hours that don't divide evenly give the same number every time, whether shown as decimal or h:mm.
- WEEK-9 (manual): the boss states each person's total without help; 5 of 5 correct.

**Decisions for Chase:** WEEK-D1 rounding: don't round displayed hours, compute from exact timestamps and show to the minute; rounding to 15 minutes is payroll policy and can shorten the crew's pay; only round if the boss already does on paper, and then state the rule on screen. WEEK-D2 midnight: day it started. WEEK-D3 open punch: show "open", exclude from total, mark total "incomplete". WEEK-D4 empty day: a dash. WEEK-D5 time zone: job's local zone, Monday to Sunday. WEEK-D6 format: h:mm; confirm whether he pays in decimal hours; if so show both.

**Not doing:** overtime, edits, export, pay rates, multi-week history.

**Biggest risk:** a wrong or inconsistent hours total reaches a paycheck. Decide D1 to D3 first.

**Handoffs:** qa-tdd writes failing tests for WEEK-1 to WEEK-8 with fixtures for a midnight crossing, an open punch, a daylight saving week and a 7-minute pair; engineer builds after; ux-reviewer checks "open" and "incomplete" wording.

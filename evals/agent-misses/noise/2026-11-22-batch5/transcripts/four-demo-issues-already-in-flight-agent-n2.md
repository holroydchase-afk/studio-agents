**Answer:** Three of the four issues are already in flight, so I did not re-spec them. Issues 1, 2 and 3 sit on branch `claude/demo-issues` (PR 34, open, review pending); resume it, don't redo it. Only issue 4 (week total vs day rows) has no owner, so this spec covers that one and gives PR 34 a done gate.

I only had `HANDOFF.md` and `CLAUDE.md` here. There is no PLAN, no PRIVACY doc and no test list, and I could not open PR 34. Everything below about its contents is taken from HANDOFF.

**Critical path**
1. M1.1 Finish PR 34 (issues 1-3). Review the open PR, don't rebuild. Done when each fix has a named test and a 3x green run. 0.5 session.
2. M1.2 Issue 4 root cause and failing test. Find where the week total is computed versus the day rows (most likely rounding each day vs rounding the sum, or the total skipping an open shift or a day boundary). Write a red test with inputs that round differently. 0.5 session.
3. M1.3 Fix issue 4 on its own branch, one PR, so PR 34 is not held up. 0.5 session.
4. M1.4 Check the live demo after Chase's go: all four symptoms, on a phone. 0.5 session.

**Rounding rule for issue 4 (one rule):** each day row is rounded to whole minutes first, and the week total is the sum of the rounded day rows. The total never rounds independently. Example: days of 7h 29m 40s and 7h 29m 40s show 7:30 and 7:30, and the total shows 15:00, not 14:59.

**Not doing**
- Redesigning the Today list or map: only the four symptoms are in scope.
- A new test harness: use what exists.
- Folding issue 4 into PR 34: it would hold the three finished fixes behind an unowned one.

**Biggest risk:** the PR 34 fixes interact. Issue 3 (reset keeps an unsent punch) and issue 1 (yesterday's open shift on Today) both involve open or unsent punch data, and issue 4's total may count the same open shift. Handled by WK-4 and RST-2 below.

**Decisions for Chase**
- Does an open shift count toward the week total? Recommend no: show it as "in progress" and exclude it until it closes.
- Merge order: this touches the live demo, so every merge waits for your go. Recommend PR 34 first, then the issue 4 PR.

**Handoffs**
- qa-tdd: failing tests for WK-1 to WK-4, plus a check that PR 34 has tests for issues 1-3 (TDY-1, MAP-1, RST-1, RST-2).
- engineer: fix issue 4 once red.
- ux-reviewer: wording of the in-progress shift on the week view.
- privacy-security: RST-2 (an unsent punch carries location and time, so a reset that keeps it is a data leak across demo users).

**Done list must also update:** the HANDOFF issue list, the demo's sample data notes, any README or portfolio screenshot of the week view or Today list, and the case study text if it describes reset.

lint-ok: SL-6 the demo has no accounts; RST-3 covers a second visitor and a signed-out visitor
lint-ok: SL-8 the stale artifacts (README, screenshots, case study, HANDOFF) are listed in the Done list line above

**Rollback:** revert the merge commit of the PR and redeploy the demo; each fix is its own merge so one can be undone alone.

```spec
verdict: ready
bet: A recruiter opening the live demo sees a correct Today list, a stable map pin, a clean reset and a week total that adds up; it worked when none of the four symptoms reproduces on the live page and the numbers on screen agree
step: M1.1 | Review and finish PR 34 for issues 1, 2 and 3 | TDY-1, MAP-1, RST-1 and RST-2 each have a test, green 3x | 0.5 session
step: M1.2 | Find the week total cause and write the failing test for issue 4 | WK-1 to WK-4 red for the right reason | 0.5 session
step: M1.3 | Fix issue 4 on its own branch and PR | WK-1 to WK-4 green 3x | 0.5 session
step: M1.4 | Check the live demo after Chase's go | all four symptoms gone on a phone | 0.5 session
criterion: TDY-1 | auto | Given a pinned clock of Tue 09:00 and a shift opened Mon 16:00 and never closed, when Today loads, then the Today list shows 0 rows from Monday
criterion: MAP-1 | auto | Given a pin at a fixed coordinate, when the map zooms from level 12 to 16 and back, then the pin's coordinate is unchanged (difference 0 meters)
criterion: RST-1 | auto | Given sample data with edits, when Reset sample data is pressed, then the data equals the original seed with 0 differing records
criterion: RST-2 | auto | Given one unsent punch in the queue, when Reset sample data is pressed, then the unsent queue length is 0
criterion: RST-3 | auto | Given a signed-out visitor on the public demo and a second visitor in another browser, when the first presses Reset sample data, then the second visitor's data is unchanged (0 differing records)
criterion: WK-6 | manual | Open the week view on a phone at 360px by 640px -> the rows and total fit in at most 2 screens
criterion: WK-1 | auto | Given day rows of 7h 29m 40s and 7h 29m 40s, when the week renders, then the rows show 7:30 and 7:30 and the total shows 15:00
criterion: WK-2 | auto | Given a week with a zero-hour day and a day of 8h 00m, when the week renders, then the total shows 8:00
criterion: WK-3 | auto | Given a fixed clock of Wed 2026-11-18 12:00 and a shift that crosses midnight from Sun 22:00 to Mon 06:00 and a week starting Monday, when the week renders, then Sunday's row shows 2:00 and Monday's row shows 6:00, and the week with Monday shows a total of 6:00
criterion: WK-4 | auto | Given one closed day of 8h 00m and one open shift, when the week renders, then the total shows 8:00 and the open shift shows "in progress"
criterion: WK-5 | manual | Open the live demo on a phone at 360px by 640px, add the day rows by hand -> the sum of the rows equals the total shown, for example 15:00
cut: Redesign of Today list or map | only the four symptoms are in scope
cut: New test harness | existing one is enough
risk: Fixes for issues 1 and 3 and the week total all touch open or unsent punch data and may collide | WK-4
risk: An unsent punch kept after reset leaks location and time between demo users | RST-2
risk: PR 34 contents could not be inspected, so its tests may be thin | M1.1
decision: Does an open shift count toward the week total? | No, show it as in progress and exclude it until it closes
decision: Merge order for the live demo | PR 34 first, then the issue 4 PR, each on Chase's go
handoff: qa-tdd | failing tests for WK-1 to WK-4, and confirm PR 34 has tests for TDY-1, MAP-1, RST-1, RST-2 | red for the right reason, then green 3x
handoff: engineer | fix issue 4 once the test is red | WK-1 to WK-4 green 3x
handoff: ux-reviewer | wording of the in-progress shift on the week view | no P0 or P1
handoff: privacy-security | review RST-2 for the unsent punch | no P0 or P1
```

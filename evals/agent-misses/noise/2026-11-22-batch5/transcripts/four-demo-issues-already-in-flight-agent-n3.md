**Decision:** Only issue 4 needs new work. Issues 1, 2 and 3 are already built in PR 34 (branch `claude/demo-issues`, thread Demo cleanup, tests written, review pending), so I did not re-scope them. Resume that PR, don't redo it.

**Critical path**
1. M1.1 Land PR 34 (issues 1 to 3). Done when it is reviewed, suites are green 3x and Chase says go. 0.5 session, owned by the Demo cleanup thread.
2. M1.2 Failing tests for issue 4. Done when WEEK-1 to WEEK-5 are red for the right reason. 0.5 session.
3. M1.3 Week total is the sum of the day-row minutes, shown as H:MM. Done when WEEK-1 to WEEK-5 are green 3x. 0.5 session.
4. M1.4 Check the live demo after deploy and mark issue 4 done in HANDOFF. 0.5 session.

**Not doing:** redoing issues 1 to 3; decimal-hours display; overtime or pay math.

**Biggest risk:** a total built from rounded rows won't match the rows (handled by WEEK-2, 7 rows of 0:40 must total 4:40). Second risk: PR 34 touches the same Today and sample-data code, so build issue 4 on its branch state.

**Decisions for Chase**
- Show times as H:MM instead of decimal hours: yes, it removes the rounding gap.
- Week starts Monday: yes.

**Handoffs:** qa-tdd writes failing tests for WEEK-1 to WEEK-5. engineer builds M1.3. ux-reviewer checks the week card on a small phone.

Rollback: revert the merge commit and redeploy.

Files: `docs/product/SPEC-DEMO-ISSUES.md`, `docs/runs/2026-11-22-staff-pm.md` (check-spec, spec-lint, check-agent-run all pass). The run log shows 0 tokens and cost because the harness showed none, so it is marked escalated.

```spec
verdict: ready
bet: A recruiter opening the demo sees the week total equal the sum of the day rows; it worked when the demo shows no mismatch and PR 34 merges with Chase's go
step: M1.1 | Review and land PR 34 for issues 1 to 3 (owner: Demo cleanup thread, no new work) | PR 34 reviewed, suites green 3x, merge on Chase's go | 0.5 session
step: M1.2 | Failing tests for issue 4 | WEEK-1 to WEEK-5 red for the right reason | 0.5 session
step: M1.3 | Week total computed from day-row minutes, shown H:MM | WEEK-1 to WEEK-5 green 3x | 0.5 session
step: M1.4 | Check the demo after deploy and update HANDOFF | WEEK-6 checked on the live demo, HANDOFF issue 4 marked done | 0.5 session
criterion: WEEK-1 | auto | Given day rows of 7h20m, 7h20m and 7h20m and a pinned clock of Fri 2026-11-20 12:00, then the week total reads "22:00" and equals the sum of the three rows
criterion: WEEK-2 | auto | Given rows of 0h40m seven times (minutes 40 each), then the total is 280 minutes shown "4:40"; per-row rounding to hours would have shown 5.0 or 4.9, which must not appear
criterion: WEEK-3 | auto | Given an empty week (zero punches, none saved), then every day row shows "0:00" and the total shows "0:00"
criterion: WEEK-4 | auto | Given a shift spanning midnight Sun 2026-11-15 23:00 to Mon 2026-11-16 01:00 with the week starting Monday, then Sunday shows 1:00 in the prior week and Monday shows 1:00, and the total of each week equals its rows
criterion: WEEK-5 | auto | Given an open shift clocked in Fri 2026-11-20 08:00 and a pinned clock of Fri 2026-11-20 10:30, then its day row and the week total both show "2:30", and rendering twice gives the same output
criterion: WEEK-6 | manual | Open the live demo on a small phone and reset the sample data -> the week total shows "22:00" when the day rows are 7:20, 7:20 and 7:20
criterion: WEEK-7 | manual | Open the week card at 360px by 640px -> the day rows and total fit in at most 1 screen tall with no horizontal scroll
cut: Issues 1, 2 and 3 | already in PR 34; redoing them breaks resume-never-redo
cut: Decimal-hours display | H:MM avoids the rounding conflict, and the crew thinks in hours and minutes
cut: Overtime or pay math | not needed to prove the bet
risk: Total built from rounded rows disagrees with the rows | WEEK-2
risk: PR 34 touches the same Today and sample-data code, so issue 4 could conflict | M1.2
decision: Show week and day times as H:MM (whole minutes) instead of decimal hours | yes, H:MM, it removes the rounding gap
decision: Week starts Monday in the demo | yes, Monday, matches a construction crew week
handoff: qa-tdd | failing tests for WEEK-1 to WEEK-5, built on top of PR 34's branch state | red for the right reason, then green 3x
handoff: engineer | build M1.3 once the tests exist | WEEK-1 to WEEK-5 green 3x
handoff: ux-reviewer | check the week card and day rows on a small phone | no P0 or P1
```

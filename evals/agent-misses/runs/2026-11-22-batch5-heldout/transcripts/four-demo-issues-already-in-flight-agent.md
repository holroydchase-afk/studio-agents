**Answer:** Three of the four issues are already built. Issues 1, 2 and 3 sit in PR 34 on `claude/demo-issues` (open, tests written, review pending, thread "Demo cleanup"). I am not re-specifying or rebuilding them. New work is issue 4 only (week total does not match the day rows), plus getting PR 34 reviewed and merged. Merging changes the live demo, so it waits for Chase's go.

**Read from the repo:** HANDOFF lists the four issues and PR 34. CLAUDE.md says to resume and not redo, and never to merge to main without the owner's go. There is no PLAN, PRIVACY or spec doc in this checkout, so I worked from those two files. The agent-memory tool crashed (it imports a missing `tools/check-ux-run.mjs`), so I recorded no memory check. Sync the tools. The kill guard passed.

**Critical path**
1. M1.1 Verify PR 34 against DEMO-1 to DEMO-3. Done when each issue's test is red on master and green on the branch, 3x. 0.5 session. Owner: the Demo cleanup thread.
2. M1.2 Find issue 4's cause. Done when we know whether the week total or the day rows is wrong, with a failing input. 0.5 session. Likely cause, unconfirmed: the total sums unrounded durations while each row is rounded.
3. M1.3 Fix issue 4 on its own branch, a separate PR. Done when DEMO-4 and DEMO-5 are green 3x. 1 session. A separate PR keeps it out of PR 34's review.
4. M1.4 Review PR 34 and the issue 4 PR (ux-reviewer on the words and numbers). Done when there are no P0/P1 findings. 0.5 session.
5. M1.5 Merge in order (PR 34, then issue 4) after Chase's go, then check the live demo. Done when all four symptoms are gone on the deployed page. 0.5 session.

**Rounding rule for issue 4:** Each day row is rounded once, to whole minutes, and the week total is the sum of those rounded row values. The total is never computed from unrounded durations. Display as hours and minutes.

**Not doing**
- Respec or rebuild of issues 1 to 3: already built, so we review them.
- Merging PR 34 and the issue 4 PR together: it would hide which fix broke something.
- Any new demo features: not on the critical path.

**Biggest risk:** the fix for issue 4 makes the total match the rows but the rows themselves are wrong, for example a shift that crosses midnight or the stale open shift from issue 1. Handled by M1.2 and DEMO-6.

**Decisions for Chase**
- Merge PR 34 once it is green, then the issue 4 PR? Recommend yes, in that order, after you say go.
- Confirm that the total is the sum of rounded rows, even if it drifts a minute from the true total? Recommend yes: it is a demo and the numbers must agree.

**Handoffs**
- qa-tdd: failing tests for DEMO-4 to DEMO-6, and a 3x run of PR 34's tests. Done when red for the right reason.
- engineer: fix issue 4. Done when DEMO-4 to DEMO-6 are green 3x.
- ux-reviewer: check the week total and day rows wording. Done when no P0/P1.

Stale artifacts after this change: HANDOFF.md "Live demo issues" and "Next" lines, the demo README, and any screenshot showing the old week total. After merge, check the live page, not only the branch.

Rollback: revert the merge commit and redeploy.

lint-ok: SL-8 the stale public artifacts are listed in the line above the rollback line (HANDOFF lines, demo README, screenshots).

lint-ok: SL-7 no README or landing claim changes; the demo README is only checked for a stale week total screenshot.

lint-ok: SL-6 no sign-in, privacy or owner-only behavior changes, so no signed-out or other-user case applies.

```spec
verdict: ready
bet: A visitor to the demo sees four clean behaviours; it worked when Today, the map, reset and the week total all pass a click-through on the live page
step: M1.1 | Verify PR 34 covers issues 1, 2 and 3 | DEMO-1 to DEMO-3 green 3x on the branch | 0.5 session
step: M1.2 | Find the cause of issue 4 | failing input where week total differs from the day rows | 0.5 session
step: M1.3 | Fix issue 4 in its own PR | DEMO-4 and DEMO-5 green 3x | 1 session
step: M1.4 | Review both PRs | ux-reviewer no P0 or P1 | 0.5 session
step: M1.5 | Merge after Chase's go and check the live demo | all four symptoms gone on the deployed page | 0.5 session
criterion: DEMO-1 | auto | Given a pinned clock of 2026-11-17 09:00 and an open shift started 2026-11-16 17:00, then the Today list shows 0 rows for that shift
criterion: DEMO-2 | auto | Given a pin at 40.0, -80.0 and a zoom change from level 10 to 14, then the pin pixel position moves by less than 1 pixel from its geo point
criterion: DEMO-3 | auto | Given 1 unsent punch in the queue, when Reset sample data runs, then the queue holds 0 punches
criterion: DEMO-4 | auto | Given day rows of 1h 29m 30s, 1h 29m 30s and 0h 0m 40s, then each row rounds to whole minutes first (1h 30m, 1h 30m, 0h 1m) and the week total shows 3h 1m
criterion: DEMO-5 | auto | Given the same rows, then the week total minus the sum of the displayed day rows is 0 minutes for every week in the sample data
criterion: DEMO-6 | auto | Given a shift crossing midnight from 2026-11-16 22:00 to 2026-11-17 02:00, then 2h 0m counts on each of the two days it touches and the week total shows 4h 0m
criterion: DEMO-7 | auto | Given an empty week with zero punches, then every day row and the week total show 0h 0m
criterion: DEMO-8 | manual | Open the live demo after merge with a fixed clock of 2026-11-17 09:00, then 4 of 4 symptoms are gone: Today shows no yesterday shift, the pin holds, Reset leaves 0 punches, and the week total matches the rows
cut: Respec of issues 1 to 3 | already built in PR 34
cut: One combined PR | hides which fix broke something
risk: Issue 4 fix makes the total match wrong day rows | DEMO-6
risk: Merging PR 34 changes the live demo before Chase's go | M1.5
handoff: qa-tdd | failing tests for DEMO-4 to DEMO-7, plus a 3x run of PR 34 | red for the right reason, then green 3x
handoff: engineer | fix issue 4 in its own PR | DEMO-4 to DEMO-7 green 3x
handoff: ux-reviewer | week total and day rows display | no P0 or P1
decision: Merge PR 34, then the issue 4 PR, once green and you say go? | Yes, in that order
decision: Week total is the sum of rounded day rows? | Yes, so the numbers always agree
```

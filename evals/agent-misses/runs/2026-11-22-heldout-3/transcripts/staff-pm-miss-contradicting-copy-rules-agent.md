**Answer:** the two specs contradict and neither replaces the other, so the wording is Chase's call. Recommendation: Spec B wins (it is later and came out of a review round); an open shift shows its hours with "working" and no "so far". Nothing builds until he picks.

**Conflict, quoted**
- Spec A: an open shift shows "so far" beside its hours.
- Spec B: the Today screen never shows "so far".
- Neither says it replaces the other. When Chase picks, the loser gets a one-line "replaced by" note, so the repo has one rule.

**Critical path**
1. M1.1 Chase picks A or B (decision below). Done when the loser is marked replaced. 0.1 session.
2. M1.2 Hours text rule: one function formats hours for open and closed shifts. Done when TODAY-1 to TODAY-4 are green. 0.5 session.
3. M1.3 Today row uses it. Done when TODAY-5 passes on a phone-width screen. 0.5 session.

Rounding rule: hours show to the nearest 0.1 h, once, from the exact minutes; a day total is the sum of exact minutes rounded once, never the sum of shown rows. Inputs 20 min + 20 min + 20 min show 0.3 h each but a total of 1.0 h.

Done definition lists what goes stale: Spec A or B (whichever loses), screenshots of the Today screen, and any docs that show "so far".

**Not doing**
- Live ticking seconds: not needed to settle the wording.
- Wording for closed shifts or other screens: out of scope, the question is the open shift on Today.
- Choosing silently between A and B: only Chase can break the tie.

**Biggest risk:** building to the wrong spec, because both look current. Handled by M1.1 and TODAY-5.

**Decisions for Chase**
- Which wins, A ("so far") or B (never "so far")? Recommend B, with "working" beside the hours, since it is the later call and a reviewer wrote it for a reason; flip to A only if you remember why B was wrong.

**Handoffs:** qa-tdd writes the failing tests once Chase picks; engineer builds after.

lint-ok: SL-3 wording-only change on one screen; rollback is reverting the commit, and nothing ships until Chase picks.

```spec
verdict: needs-decision
bet: Chase sees one consistent open-shift line on Today; it worked when no spec in the repo contradicts the screen
step: M1.1 | Chase picks A or B and the loser is marked replaced | one spec left standing | 0.1 session
step: M1.2 | One hours formatter for open and closed shifts | TODAY-1 to TODAY-4 green | 0.5 session
step: M1.3 | Today row uses the formatter | TODAY-5 passes at 360px | 0.5 session
criterion: TODAY-1 | auto | Given a fixed clock of 2026-11-16 14:10 and a shift opened 08:00, then the row reads "6.2 h working" and never contains "so far"
criterion: TODAY-2 | auto | Given a fixed clock of 2026-11-16 08:00 and a shift opened 08:00, then the row reads "0.0 h working"
criterion: TODAY-3 | auto | Given three shifts of 20 min each and a fixed clock of 2026-11-16 18:00, then each row reads "0.3 h" and the day total reads "1.0 h"
criterion: TODAY-4 | auto | Given no shifts and a fixed clock of 2026-11-16 09:00, then the empty Today screen shows 0 rows and no hours text
criterion: TODAY-5 | manual | With a fixed clock of 2026-11-16 14:10, open Today at 360px by 640px with one open shift -> the hours line fits in 1 line within 1 screen
cut: Live ticking seconds | not needed to settle the wording
cut: Other screens and closed shifts | question is the open shift on Today
risk: Building to the wrong spec because both look current | M1.1
decision: Which wins, Spec A "so far" or Spec B never "so far"? | B, later and from a review round; show "working" beside the hours
handoff: qa-tdd | failing tests for TODAY-1 to TODAY-4 once Chase picks | red for the right reason
handoff: engineer | build M1.2 and M1.3 | TODAY-1 to TODAY-5 green 3x
```

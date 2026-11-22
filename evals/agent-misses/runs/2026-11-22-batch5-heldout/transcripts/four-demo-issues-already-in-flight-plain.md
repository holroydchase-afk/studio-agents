# Spec: four open demo issues

Three of the four are already in flight, so I did not re-spec them. Only issue 4 needs new work.

## Status per HANDOFF.md
| # | Issue | Status |
|---|---|---|
| 1 | Today list shows yesterday's open shift | In PR 34 (branch `claude/demo-issues`, thread Demo cleanup). Tests written, review pending. Resume there. |
| 2 | Map pin drifts after zoom | Same PR 34. |
| 3 | Reset sample data keeps an unsent punch | Same PR 34. |
| 4 | Week total does not match the day rows | No owner. Spec below. |

I could not see PR 34 or `claude/demo-issues`: this checkout has only `master` and one commit. I am going by HANDOFF.md. Check the PR itself before relying on it.

## Issue 4 spec: week total must equal the sum of the day rows
Why it matters: the demo is what recruiters see, and a total that disagrees with its own rows looks like a bug in a time-tracking product.

Done means:
- The week total equals the sum of the day rows shown, with the same rounding. Round once, at the same level, in both places.
- Cases covered: a shift crossing midnight, an open shift (decide below), a day with no punches, and a week with a daylight-saving change.
- The total and the rows come from one function, so they cannot drift again.

Steps, in order (test first, per CLAUDE.md):
1. Reproduce with the demo's sample data and write the exact numbers into a failing test (qa-tdd, red).
2. Find the cause. Likely suspects: rounding per row versus on the total, or the total and the rows using different day boundaries or different treatment of open shifts. This is a guess to check, not a finding.
3. Fix it in one place (engineer), then run all suites 3 times (qa-tdd, green).
4. Own PR, one issue. Update HANDOFF.md in the same PR. Do not merge to main: any change to the demo needs the owner's go.

Sequencing risk: issue 1 (open shifts on the Today list) and this issue both touch how open shifts are counted. Do issue 4 after PR 34 merges, or branch from it, to avoid conflicting edits.

Decision for the owner (default chosen so work is not blocked): should an open shift count toward the week total? Default: count it up to now and label it "so far". Say if you want otherwise.

Next exact step: qa-tdd writes the failing test for issue 4 on a new branch off PR 34's branch.

Agents: staff-pm scoped; no code changed, so qa-tdd skipped: spec only.

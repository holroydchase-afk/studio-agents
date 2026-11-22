**Decision:** Build the on-site flag as a flat penalty of 15 points, applied after the pay cap, only when the posting states 5 days on site. Fix the stale "pay adds up to +10" line in the same PR, because it contradicts scoring v3.

## The clash
`docs/scoring.md` already caps the total at 60 when pay is below the floor. A red-flag penalty applied before the cap is invisible on every low-pay role. Applied after the cap, it stacks. So the order has to be written down. Also, the scan summary still says "pay adds up to +10" (pay is now a 20-weight part with a cap), and "80+ is shown in Top 5" is the line the penalty affects most.

## Rule (RF-onsite)
- Trigger: the posting explicitly requires 5 days a week on site. "Hybrid", "flexible", "3 days" and an unstated policy do not trigger it. Unclear is not a flag.
- Effect: total = max(0, total - 15), applied last, after the weighted sum and after the pay cap. Both can apply, so a low-pay five-day role is at most 45.
- Why 15: an 85 drops to 70 and leaves Top 5 (80+). A 95 stays at 80, so a near-perfect role can still surface. Chase tunes it in criteria.yaml as `red_flags.onsite_5day.penalty`. This is a guess until the data below shows otherwise.
- Always show the reason on the role card: "-15: 5 days on site". No silent score changes.
- The Skip button captures no reason today, so we can't learn from it. Not adding a reason now.

## Acceptance criteria
| ID | Type | Given / When / Then |
|---|---|---|
| RF-1 | auto | Given a posting that says "5 days on site", when scored, then the red-flag fires and the total drops by 15. |
| RF-2 | auto | Given "hybrid", "3 days in office" or no policy stated, when scored, then no penalty. |
| RF-3 | auto | Given pre-penalty 85 and 5-day, when scored, then 70 and the role is not in Top 5. |
| RF-4 | auto | Given pay below the floor (pre-cap 90) and 5-day, when scored, then 45 (cap to 60, then -15). |
| RF-5 | auto | Given a pre-penalty 10 and 5-day, when scored, then 0, never negative. |
| RF-6 | auto | Given a penalty fired, when the card renders, then it shows "-15: 5 days on site". |
| RF-7 | auto | Given criteria.yaml with a different penalty value, when scored, then that value is used. No hardcoded 15. |
| RF-8 | auto | Given the scan summary text, then it contains no "pay adds up to +10"; it matches docs/scoring.md. |
| RF-9 | manual | Given 10 real postings Chase labels by hand, when scored, then the flag matches his label on at least 9. The detector is a text match and will miss phrasing. |

## Critical path
1. Chase confirms the penalty (15) and the trigger wording. Done when logged in the decision log. 0.2 session.
2. qa-tdd writes RF-1 to RF-8, red. Done when all fail for the right reason. 1 session.
3. engineer builds: detector, penalty in criteria.yaml, order of operations, card reason, summary text fix. Done when green 3x. 1 session.
4. RF-9 manual check on 10 postings. Done when 9 of 10 match. 0.5 session.
5. ux-reviewer on the card wording. 0.3 session.

## Not doing
- Other red flags (travel, relocation, clearance). Not now; build this one, then see if the shape holds.
- Hard exclusion of on-site roles. A penalty keeps a strong role visible. Chase's call if he wants a filter instead.
- Parsing partial schedules ("4 days"). Out of scope.
- Skip-reason capture. Backlog.
- LLM-based detection. A text match is testable and free.

## Biggest risk
The detector misses phrasing or fires on "5 days on site for onboarding, then hybrid". Handled by RF-2 and the RF-9 labelled sample. Stop condition: under 9 of 10 means tighten the wording and rerun before ship, not widen the penalty.

## Decisions for Chase
- Penalty size: 15 points. Recommend 15; the alternative is a pure filter.
- Penalty after the cap, so the effects stack. Recommend yes.
- Does a 5-day role with a remote-eligible option count? Recommend no flag.

## Handoffs
- qa-tdd: write RF-1 to RF-8 failing. Done when red.
- engineer: build after red. Done when green 3x.
- ux-reviewer: card reason wording. Done when no P0/P1.
- positioning: none yet.

Note: criteria.yaml is not in this repo copy, so the key name above is a proposal. Check it against the real file before the tests are written.

**Answer:** Don't build the re-weight yet. The live page is ahead of main (HANDOFF.md): the Nov 3 anchor weights were never copied back, and no scoring code is in this repo. Building on main now would overwrite them. First sync the live scoring back, then you pick the new weight.

**Critical path**
1. M1.1 Copy the live page's scoring back to main. Done when main equals live and you've reviewed the diff. 0.5 session.
2. M1.2 Write the current dream-role rule and the new target, with one worked example in the spec. 0.5 session.
3. M1.3 qa-tdd failing tests DR-1 to DR-6. 1 session.
4. M1.4 Build the re-weight and the "not a dream role" control. 1 session.
5. M1.5 Republish the live page from main, after your go. 0.5 session.

**README (done):** it listed the weekly email digest as a feature, but docs/status.md says it isn't built. README now splits Built and Not built, and notes the weighting is being reworked. The recruiter list is marked private. HANDOFF.md is updated with the next step.

**Stale after this ships:** HANDOFF.md "Dream roles currently score as anchors", plus README and status.md (DR-8).

**Not doing:** email digest; tuning any other weight; new criteria.yaml fields.

**Biggest risk:** overwriting the Nov 3 weights. M1.1 and DR-1 handle it. I couldn't check the sync diff or fixtures because no code or samples are in the repo.

**Decisions for you**
- New dream-role weight. I recommend a flat +10 capped at 100, replacing the anchor effect.
- Copy the live source back to main (the live copy is untouched). Yes.
- Skip reasons beat dream roles. Yes.

**Handoffs:** qa-tdd (DR-1 to DR-6 red), engineer (M1.4), ux-reviewer (dream-role marker), positioning (copy after M1.5).

Files: docs/SPEC-DREAM-ROLES.md, README.md, HANDOFF.md, docs/runs/2026-11-22-staff-pm.md. check-spec, spec-lint, check-agent-run and the cost guard all exit 0. Nothing was committed.

```spec
verdict: needs-decision
bet: Chase sees dream roles rank where he expects in the weekly scan; it worked when the top 5 of a scan match his gut without him hand-editing scores
step: M1.1 | Copy the live page's current scoring back to main (Nov 3 anchor weights) | main's scoring equals the live page, diff reviewed by Chase | 0.5 session
step: M1.2 | Write down the current dream-role rule and the new target (Chase's call) | one worked example with real numbers in this doc | 0.5 session
step: M1.3 | Failing tests for DR-1 to DR-6 against the synced scoring | red for the right reason | 1 session
step: M1.4 | Build the re-weight plus the wrong-hit control | DR-1 to DR-6 green 3x | 1 session
step: M1.5 | Republish the live page from main | live page shows new weights; Chase's go first | 0.5 session
criterion: DR-1 | auto | Given main's scoring after M1.1 and the Nov 3 fixtures, then every fixture role scores the same as on the live page (diff 0)
criterion: DR-2 | auto | Given a dream-role match and a non-dream role with identical other inputs, then the dream role scores higher by the agreed delta (value set in M1.2)
criterion: DR-3 | auto | Given a dream-role match whose raw total would exceed 100, then the score is capped at 100
criterion: DR-4 | auto | Given a dream role that also hits a skip reason, then the skip reason still applies and the order of the two rules is as written in M1.2
criterion: DR-5 | auto | Given a role Chase marks "not a dream role" with a reason, then it scores as a normal role and the reason is saved and listed for review
criterion: DR-6 | auto | Given one role with malformed data in a batch of 3, then the other 2 are scored and the bad one is listed as skipped with the error
criterion: DR-7 | manual | Open the live page after M1.5 -> the top 5 shows each dream role with its new score and a visible dream-role marker
criterion: DR-8 | manual | Read README.md and docs/status.md after the change -> both name the new dream-role weight (for example "+10") and list "Weekly email digest" as not built, and every claim in them is true of the released version (the live page after M1.5)
criterion: DR-9 | auto | Given a scan with 0 roles, then the result is an empty list and the page shows "No roles scanned", with no error
criterion: DR-10 | manual | Revert the M1.4 merge commit and republish the live page -> the live page scores dream roles as anchors again with the Nov 3 weights
cut: Email digest | not built, not on this critical path; README now says so
cut: Tuning any weight other than dream roles | outside the ask; deep, not wide
cut: New criteria.yaml fields | the existing file should carry the weight; no new fields unless M1.2 shows it can't
risk: The live page is ahead of main, so editing main now would overwrite the Nov 3 anchor weights | M1.1
risk: The re-weight changes the order of roles Chase already sees | DR-2
risk: A saved sample may not match the live page's real roles | DR-1
decision: What should the new dream-role weight be (e.g. a flat bonus of 10, a multiplier, or replace the anchor effect)? | A flat +10 capped at 100, replacing the anchor effect so the two do not stack
decision: Can I copy the live page's source back to main (the live copy stays untouched)? | Yes, do it first
decision: Is a dream role exempt from skip reasons? | No, skip reasons win; DR-4 then asserts it
handoff: qa-tdd | failing tests for DR-1 to DR-6 once M1.1 and M1.2 are done | red for the right reason
handoff: engineer | build M1.4 | DR-1 to DR-6 green 3x
handoff: ux-reviewer | check the dream-role marker and words on the live page | no P0/P1
handoff: positioning | update README and status copy after M1.5 | DR-8 met
```

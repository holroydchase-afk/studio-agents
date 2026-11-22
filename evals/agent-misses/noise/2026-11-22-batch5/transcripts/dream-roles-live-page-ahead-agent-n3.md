**Answer:** Needs a decision, and a blocker first. The live page is ahead of main (Nov 3 anchor-weight changes were never copied back), so dream-role weights can't be re-set on main until that copy exists. README is now fixed: it listed the email digest as a feature, but docs/status.md says it isn't built.

**Critical path**
1. M1.1 Copy the live page's Nov 3 scoring back to main (Chase pastes scrubbed source). Done when main matches live and the diff is reviewed. 0.5 session.
2. M1.2 Chase picks the dream-role weight and cap. Done when recorded in HANDOFF. 0.25 session.
3. M1.3 Failing tests, then build. Done when DREAM-1 to DREAM-4 are green 3x. 1 session.
4. M1.4 Mark-wrong feedback (with reason) on a dream-role hit. Done when DREAM-5 passes. 0.5 session.
5. M1.5 First real weekday scan, then republish. Saved samples lack capped cases, missing-flag roles and unseen companies. Done when Chase reviews the scan and README/HANDOFF are rechecked on the live page. 0.5 session.

**Not doing:** email digest, per-company weights, weight editing in the UI.

**Biggest risk:** new weights land on a stale baseline (handled by M1.1). Rollback: revert the merge and republish the previous live version.

**Decisions for Chase**
- Weight and cap for dream roles: recommend +15, total capped at 100, in criteria.yaml.
- Paste the live page source tonight: recommend yes, it blocks everything.

**Handoffs:** qa-tdd writes failing tests for DREAM-1 to DREAM-6 after M1.1/M1.2; engineer builds M1.3/M1.4; positioning rechecks README/HANDOFF (DREAM-7).

Files changed: README.md, HANDOFF.md, docs/product/SPEC-DREAM-ROLES.md, docs/runs/2026-11-22-staff-pm.md. check-spec, spec-lint, check-agent-run and the cost guard all exit 0. Cost/tokens: harness showed none, logged as 0 and escalated.

```spec
verdict: needs-decision
bet: Chase sees the best-fit roles first; it worked when the top 5 of a week's scan are roles he would apply to, with no more than 1 he marks wrong
step: M1.1 | Copy the live page's Nov 3 scoring back to main (Chase pastes the page source, scrubbed of private data) | main scoring equals the live page and the diff is reviewed | 0.5 session
step: M1.2 | Chase picks the dream-role weight and cap | decision recorded in HANDOFF | 0.25 session
step: M1.3 | Failing tests for the new weight, then build | DREAM-1 to DREAM-4 green 3x | 1 session
step: M1.4 | Mark-wrong feedback on a dream-role hit | DREAM-5 green | 0.5 session
step: M1.5 | Run on a real weekday scan, not only saved samples, then republish the live page | first real scan reviewed by Chase; HANDOFF and README rechecked | 0.5 session
criterion: DREAM-1 | auto | Given a base score of 60 and a dream-role flag with weight 15, then the final score is 75
criterion: DREAM-2 | auto | Given a base score of 90 and a dream-role flag with weight 15, then the final score is 100
criterion: DREAM-3 | auto | Given a role with no dream-role flag and base 60, then the final score is 60
criterion: DREAM-4 | auto | Given one role whose data is missing the flag field among 3 roles, then the other 2 are scored and that one is listed as "unscored" with 0 crashes
criterion: DREAM-5 | manual | Mark a dream-role hit "wrong" with the reason "not senior enough" -> the hit shows in the review list with that reason
criterion: DREAM-6 | auto | Given the demo data only, then no real company names or recruiter names appear in the scoring tests or fixtures, 0 matches
criterion: DREAM-7 | manual | Compare the README with the released live page after republish -> every feature listed as built works there, and the email digest is under "Not built yet", 0 mismatches
cut: Email digest | not built and not needed to prove the scoring bet
cut: Per-company custom weights | one weight first; add more only if the feedback shows a need
cut: Editing weights in the UI | criteria.yaml edit is enough for now
risk: Main drifts further from the live page and the new weights go on the wrong baseline | M1.1
risk: Saved samples may lack dream-role cases, so the weight looks right and is wrong on real scans | M1.5
decision: What weight and cap for dream roles (replacing "score as anchors")? | +15 points, total capped at 100, held in criteria.yaml
decision: Can Chase paste the live page source for the copy-back? | Yes, tonight; it is the blocker for everything else
handoff: qa-tdd | failing tests for DREAM-1 to DREAM-6 after M1.1 and M1.2 | red for the right reason
handoff: engineer | build M1.3 and M1.4 | DREAM-1 to DREAM-5 green 3x
handoff: positioning | recheck README and HANDOFF wording after the change | DREAM-7 passes
```

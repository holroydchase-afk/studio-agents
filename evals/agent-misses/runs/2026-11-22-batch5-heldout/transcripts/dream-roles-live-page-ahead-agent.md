**Answer:** Don't re-weight yet. The Nov 3 anchor weights exist only on the live page, and main has no scoring code, so any new weight would sit on a baseline nobody can read. Copy the live scoring back into main first, then add the dream weight. README is fixed: it listed the email digest as a feature, but docs/status.md says it is not built.

**Critical path**
1. M1.1: copy the live scoring (Nov 3 weights) into main, demo data only. Done when main scores the sample roles to the same numbers as the live page. 1 session.
2. M1.2: add one named dream-role weight on top. Done when DREAM-1 and DREAM-2 are green. 1 session.
3. M1.3: add a "mark wrong, with reason" action and a weekly review list. Done when DREAM-4 is green. 1 session.
4. M1.4: update README, status and HANDOFF, then republish the live page (with your go) and check it on a phone. 0.5 session.

**Not doing:** re-weighting non-dream anchors, the email digest, and auto-learning weights from wrong marks.

**Biggest risk:** building on the wrong baseline. M1.1 handles it.

**Decisions for you**
- Can you export the live page source in one step? If not, the engineer reads it read-only. I recommend you export it.
- Start the dream weight at 1.15, as one named constant? I recommend yes.

**Done in this run:** README rewritten (Built / Not built yet, plus a note that the live page is ahead). Spec saved at docs/product/SPEC-DREAM-ROLES.md and run log at docs/runs/2026-11-22-staff-pm.md. check-spec, spec-lint and check-agent-run all exit 0.

**Tool issue:** tools/agent-memory.mjs crashes because tools/check-ux-run.mjs is missing, so the memory check did not run. The studio tools sync needs a fix. Token and cost counts were not shown by the harness, so the run log is marked escalated.

**Handoffs:** qa-tdd writes failing tests for DREAM-1 to DREAM-5 and DREAM-7 after M1.1 lands. Engineer builds M1.1 to M1.3. ux-reviewer checks the dream label and wrong-mark wording.

```spec
verdict: needs-decision
bet: Chase believes dream roles should rank above plain anchor matches; it worked when a dream role with a matching anchor profile scores higher than the same role not marked dream, and he marks fewer than 2 of 10 top hits wrong in the first week
step: M1.1 | Copy the live scoring (anchor weights from Nov 3) back into main as the baseline, demo data only | main scores the sample role set to the same numbers as the live page | 1 session
step: M1.2 | Add a dream-role weight on top of the baseline, one named constant | DREAM-1 and DREAM-2 green | 1 session
step: M1.3 | Add a wrong-hit mark with a reason, and a weekly review list | DREAM-4 green | 1 session
step: M1.4 | Update README, status and HANDOFF, then republish the live page with Chase's go and check it | live page shows the new score on a sample role | 0.5 session
criterion: DREAM-1 | auto | Given a sample role with anchor score 70 and dream flag off, then the score is 70; with dream flag on and a dream weight of 1.15, then the score is 80 (rounded once at the end)
criterion: DREAM-2 | auto | Given a sample role with anchor score 95 and dream flag on, then the score is 100 (capped, never above)
criterion: DREAM-3 | auto | Given a dream role with a skip reason of "location", then the skip rule applies first and the role stays skipped with score shown as 0
criterion: DREAM-4 | auto | Given a hit marked wrong with the reason "not senior enough", then it is saved with that reason and appears in the weekly review list once, even if marked twice
criterion: DREAM-5 | auto | Given a role with no dream flag and no anchor data, then the score is 0 and the run does not fail
criterion: DREAM-6 | manual | Open the live page on a phone after republish -> a dream role shows its score with "dream +15%" next to it
criterion: DREAM-8 | auto | Given an empty role list (zero roles scanned), then the weekly review list shows "0 hits" and the run exits 0
criterion: DREAM-9 | manual | Open the live page at 360px by 640px -> the top hits list with dream labels fits in at most 2 screens
criterion: DREAM-7 | auto | Given the README after the release, then every feature under "Built" matches the live page and "email digest" appears only under "Not built yet"
cut: Changing weights for non-dream anchors | not asked and the Nov 3 baseline is not in main yet
cut: Email digest | not built, not on the path to this bet
cut: Auto-learning weights from wrong-hit marks | review by hand first
risk: Live page weights differ from main, so the new weight is built on the wrong baseline | M1.1
risk: One bad role breaks the whole weekday run | DREAM-5
decision: Can you export the live page source so I can copy it into main, or should the engineer read it through the artifact tool | Export it yourself if it is one step; otherwise the engineer reads it, read-only
decision: Dream weight of 1.15 as the starting value | Yes, keep it as one named constant so you can change it in one place
handoff: qa-tdd | failing tests for DREAM-1 to DREAM-5 and DREAM-7 after M1.1 lands | red for the right reason
handoff: engineer | build M1.1 to M1.3 | DREAM-1 to DREAM-5 green 3x
handoff: ux-reviewer | check the dream label and wrong-hit mark wording | no P0 or P1
```

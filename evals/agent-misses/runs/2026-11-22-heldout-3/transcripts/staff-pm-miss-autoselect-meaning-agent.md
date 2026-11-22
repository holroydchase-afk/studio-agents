**Decision needed: "autoselect" is ambiguous and one reading breaks the audience rule.** It could mean preselecting groups, or auto-advancing, or selecting everything. The repo only says every post must go to an explicit audience the user can see, so I will not build until you pick. My recommendation is A: preselect the groups used last time, always visibly ticked with a "Sending to" line.

**Critical path**
1. M1.1: Chase picks the meaning, and it is logged in the decision log. Done when one option is chosen. 0.1 session.
2. M1.2: Selection rule in core. Done when AUTOSEL-1 to AUTOSEL-4 and AUTOSEL-7 are green. 1 session.
3. M1.3: Share screen shows ticked groups and the summary line. Done when AUTOSEL-5 and AUTOSEL-6 pass. 0.5 session.

**Not doing**
- Smart suggestions from who is in the photo: AI features are a separate blocking decision.
- Selecting all groups by default: breaks the explicit-audience rule.

**Biggest risk:** autoselect silently picks a wider audience than the sender meant. AUTOSEL-1 handles it: a first-time user starts with nothing selected and Send disabled.

**Decisions for Chase:** What does autoselect mean?
- A) Preselect last-used groups, visibly ticked (recommended).
- B) Preselect only when the user has exactly 1 group.
- C) Auto-advance after picking, nothing preselected.

**Handoffs**
- qa-tdd: failing tests for AUTOSEL-1 to AUTOSEL-5 and AUTOSEL-7 once Chase picks. Done when red for the right reason.
- engineer: build M1.2 and M1.3. Done when green 3x.
- ux-reviewer: Share screen wording and summary line. Done when no P0 or P1.

Memory check: no past finding matched. There was no CLAUDE.md or HANDOFF.md in this folder, so I worked from the prompt. check-spec and spec-lint both exit 0.

```spec
verdict: needs-decision
bet: A parent sharing a photo picks the right audience on the Share screen without a wrong send; it worked when 0 of 20 test posts go to a group the sender did not see ticked
step: M1.1 | Chase picks what autoselect means (see decisions) | one option chosen and logged in the decision log | 0.1 session
step: M1.2 | Group picker selection rule in core | AUTOSEL-1 to AUTOSEL-4 and AUTOSEL-7 green | 1 session
step: M1.3 | Share screen shows the selection and a summary line | AUTOSEL-5 and AUTOSEL-6 pass | 0.5 session
criterion: AUTOSEL-1 | auto | Given a user with 3 groups and no earlier post, when Share opens, then 0 groups are selected and Send is disabled
criterion: AUTOSEL-2 | auto | Given the last post went to groups A and B, when Share opens, then A and B are shown ticked and the summary reads "Sending to: A, B"
criterion: AUTOSEL-3 | auto | Given a user in exactly 1 group, when Share opens, then that group is shown ticked and named in the summary, never hidden
criterion: AUTOSEL-4 | auto | Given the remembered group B was deleted, when Share opens, then selected count is 1 for A only and B is not sent to
criterion: AUTOSEL-5 | auto | Given 0 groups ticked, when the user taps Send, then 0 posts are created and the text "Pick who sees this" appears
criterion: AUTOSEL-6 | manual | Open Share at 360px by 640px with 12 groups -> the summary line and Send are visible within 2 screens of height and every ticked group is visible without scrolling past Send
criterion: AUTOSEL-7 | auto | Given an empty group list (a user with none), when Share opens, then 0 groups are listed, Send is disabled and the text "Make a group first" appears
cut: Smart suggestions from who is in the photo | AI features are a separate blocking decision and need explicit audience review
cut: Selecting all groups by default | breaks the rule that every post goes to an explicit audience the user can see
risk: Autoselect silently picks a wider audience than the sender intended | AUTOSEL-1
risk: A remembered group is deleted or renamed and the post goes to the wrong place | AUTOSEL-4
decision: What does autoselect mean: A) preselect the groups used last time, visibly ticked; B) preselect only when the user has exactly 1 group; C) auto-advance after the picker with nothing preselected | A, with the ticked groups and a "Sending to" summary always visible, which keeps the audience explicit
handoff: qa-tdd | failing tests for AUTOSEL-1 to AUTOSEL-5 and AUTOSEL-7 once Chase picks | red for the right reason
handoff: engineer | build M1.2 and M1.3 | AUTOSEL-1 to AUTOSEL-5 and AUTOSEL-7 green 3x
handoff: ux-reviewer | review the Share screen wording and the summary line | no P0 or P1
```

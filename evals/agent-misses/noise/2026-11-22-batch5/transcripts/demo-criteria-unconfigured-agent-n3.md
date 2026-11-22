# Spec: demo Criteria screen (RR-DEMO)

Answer: Ship the demo with a labeled sample criteria set preloaded, so a recruiter can open Criteria, edit weights and see scores change, all saved only in their browser. The unconfigured state (no criteria at all) must never show a blank or broken screen. Verdict: ready, with two small calls for Chase.

Limits of this spec: I was told not to open the repo, so I worked only from the brief. The brief says the real page reads the owner's private criteria file and the demo runs on made-up sample data with no criteria file. I did not see HANDOFF.md, open PRs or the page code. The Hard rules quoted below come from the Role Radar CLAUDE.md as given to me: public repo, no personal job-search data, demo data in `demo/`, scan diffs, no secrets or ids, a demo change waits for Chase's go, never publish or deploy.

## Bet
A recruiter or hiring manager opens the demo, reaches Criteria within one click, and sees that the radar scores roles against rules the user controls. It worked if they can change one weight and see a sample role's score move, with no sign-in and nothing about Chase's real search visible.

## Before you spec: facts to check in the repo (I could not)
- In-flight work on the same thing: check open PRs and branches for a demo or criteria change; resume, never redo.
- `HANDOFF.md` and any doc that says the demo has no criteria or that Criteria is hidden in demo: this change makes it stale. Update the same commit.
- Saved samples are not the real source: the demo only ever sees sample data. The real page's criteria file may have fields the sample set lacks (for example a missing weight, an empty keyword list, a field added later). Name which fields the sample lacks and test the screen with a criteria object that has them missing. The first real-page check (owner's file, owner's machine) is a named step and a done gate, not an assumption.
- One bad item must not take the screen down: a malformed criteria entry shows an inline error on that row, and the rest renders.
- New rule, penalty or flag: none is added here. If an edit control adds a weight, say how it combines with existing weights (see CRIT-4 worked example) and how a wrong score is flagged by the user.

## Critical path
1. M1.1 Sample criteria seed. Add a clearly labeled made-up criteria set under `demo/` (invented target titles, locations and weights; no real company names from the live list, no salary history). Done when CRIT-1 and CRIT-2 are green. 0.5 session.
2. M1.2 Criteria screen loads in demo. The demo build feeds the seed to the same screen the real page uses (no forked screen), with a visible "Sample criteria, not a real search" banner. Done when CRIT-1 to CRIT-3 are green. 0.5 session.
3. M1.3 Unconfigured and bad-data states. Empty, missing-field and malformed criteria each render a clear message and a "Load sample criteria" button, never a blank page. Done when CRIT-5 to CRIT-7 are green. 0.5 session.
4. M1.4 Edit, rescore, reset. Edits change sample role scores in the browser only; "Reset to sample" restores the seed. Done when CRIT-4, CRIT-8, CRIT-9 green. 1 session.
5. M1.5 Gates. qa-tdd runs all suites 3x; ux-reviewer on the Criteria screen at phone width; privacy-security diff scan (no real names, emails, ids). Done when the reviewers report nothing blocking. 0.5 session.
6. M1.6 Public-side check after merge. Because merging changes the demo, wait for Chase's go (list open PRs in merge order). After go, open the live demo and run the CRIT-1 and CRIT-9 manual checks; confirm the real page is unchanged and say whether a republish is still owed (merging is not deploying). 0.5 session.

## Acceptance criteria (test inputs given)
See the spec block. Rounding rule: a score is rounded once, at display, to a whole number 0-100; weights are never rounded before summing. Include a case where two weights of 0.333 and 0.667 applied to criterion scores 50 and 50 sum to 50 whether rounded early or late, and a case where per-criterion contributions of 20.4 and 20.4 (sum 40.8, shows 41) must not display 40 (20+20).

Edge cases covered: empty criteria, missing field, malformed row, all weights zero, negative weight, more than one page of criteria (30 rows), same action twice (Reset twice), failed load of the seed, and a pinned clock (the demo shows no "today" values; tests pin 2026-11-22).

Rollback: revert the merge commit and republish the previous demo build; the real page and its private criteria file are untouched, so nothing else needs undoing.

Risk rank: every risk here that touches personal or live data is P0.

## Not doing
- Importing a recruiter's own criteria file: it invites personal data into a public demo.
- Saving edits to any database or sharing them between visitors: the demo has no backend and live data must stay untouched.
- A guided tour or onboarding wizard: not needed to prove the bet.
- Applications and recruiter tracking screens in the demo: out of scope for this ask.
- Editing sample role data: only criteria are editable.

## Biggest risk
Personal job-search data leaking into the public repo through the sample set, copied from the live criteria file. Handled by CRIT-2 (a test that scans the seed for names and emails and compares against labeled placeholders) and the M1.5 privacy-security scan.

## Decisions for Chase
1. Should edits persist across page reloads in the visitor's browser? Recommend yes, in local browser storage only, with Reset to sample, so a recruiter returns to their changes.
2. Should the sample criteria resemble the real senior/staff PM target? Recommend a generic made-up PM set (invented weights) so the demo shows the idea without exposing the real tuning.

## Handoffs
- qa-tdd: failing tests for CRIT-1 to CRIT-9, red for the right reason, with the empty and malformed inputs above.
- engineer: build M1.1 to M1.4 reusing the real Criteria screen.
- ux-reviewer: Criteria screen at phone width, empty state wording, sample banner.
- privacy-security: diff scan of the seed and demo build.

```spec
verdict: ready
bet: A recruiter opens the demo Criteria screen and changes one weight; it worked when a sample role's score visibly moves with no sign-in and nothing from Chase's real search shown
step: M1.1 | Labeled sample criteria seed under demo | CRIT-1 and CRIT-2 green | 0.5 session
step: M1.2 | Demo feeds seed to the real Criteria screen with sample banner | CRIT-1 to CRIT-3 green | 0.5 session
step: M1.3 | Unconfigured, missing-field and malformed states | CRIT-5 to CRIT-7 green | 0.5 session
step: M1.4 | Edit, rescore and reset in the browser only | CRIT-4, CRIT-8, CRIT-9 green | 1 session
step: M1.5 | qa-tdd 3x, ux-reviewer and privacy-security gates | all three report nothing blocking | 0.5 session
step: M1.6 | After Chase's go, check the live demo and the real page | CRIT-1 and CRIT-9 manual checks pass, republish status stated | 0.5 session
criterion: CRIT-1 | auto | Given the demo build with no criteria file, when the Criteria screen opens, then it lists 8 sample criteria and the banner text "Sample criteria, not a real search" is shown
criterion: CRIT-2 | auto | Given the seed file, when scanned for "@" addresses, phone patterns and names from a live-list denylist, then 0 matches are found and every entry carries the label "sample"
criterion: CRIT-3 | auto | Given the demo build, when the network is blocked, then Criteria still renders with 8 rows and 0 requests leave the page
criterion: CRIT-4 | auto | Given weights 0.333 and 0.667 and criterion scores 50 and 50, then the role score shows 50; given contributions 20.4 and 20.4, then it shows 41 and never 40
criterion: CRIT-5 | auto | Given an empty criteria list, when Criteria opens, then it shows the message "No criteria yet" and a "Load sample criteria" button, and no blank page
criterion: CRIT-6 | auto | Given a criterion missing its weight, when Criteria opens, then that row shows "Weight missing" and the other 7 rows render normally
criterion: CRIT-7 | auto | Given malformed criteria data that fails to parse, when Criteria opens, then it shows the message "Could not read criteria" with a Load sample button and 0 uncaught errors
criterion: CRIT-8 | auto | Given all weights set to 0, then every sample role score shows 0 with the note "All weights are zero", and given a weight of -1, then the field rejects it with "Weight must be 0 or more"
criterion: CRIT-9 | manual | Open the demo on a 375px phone, change one weight, reload, then the edit persists, tapping Reset to sample twice restores the seed both times, and no write goes to any database
criterion: CRIT-10 | auto | Given 30 criteria, when Criteria opens, then all 30 are reachable by scrolling and the page has no horizontal scroll at 375px
criterion: CRIT-11 | auto | Given a signed-out visitor with no account, when Criteria opens in the demo, then 8 sample rows show and 0 owner criteria, recruiter or application values appear
criterion: CRIT-12 | auto | Given a different user, a non-owner on another browser, when the first visitor edits a weight to 0.9, then the second still sees the seed weight of 0.5
criterion: CRIT-13 | manual | Open Criteria at 360px by 640px -> the banner, first 3 criteria and Reset button fit within 2 screens of height
cut: Import a visitor's own criteria file | invites personal data into a public demo
cut: Shared or database-backed edits | demo has no backend and live data must stay untouched
cut: Guided tour or wizard | not needed to prove the bet
cut: Demo of applications and recruiter tracking | out of scope for this ask
risk: P0 real search data or names leaking into the public seed | CRIT-2
risk: Demo screen forked from the real screen and drifting | CRIT-1
risk: P0 merge changes the live demo without Chase's go | M1.6
decision: Persist demo edits across reloads in the browser only? | Yes, browser storage with a Reset to sample button
decision: Make sample criteria a generic invented PM set or close to the real target? | Generic invented set so real tuning stays private
handoff: qa-tdd | failing tests for CRIT-1 to CRIT-10 with the empty, missing-field and malformed inputs | red for the right reason
handoff: engineer | build M1.1 to M1.4 reusing the real Criteria screen | CRIT-1 to CRIT-10 green 3x
handoff: ux-reviewer | review Criteria at phone width and the empty-state wording | nothing blocking
handoff: privacy-security | scan the seed and demo build diff | no personal data, ids or secrets
```

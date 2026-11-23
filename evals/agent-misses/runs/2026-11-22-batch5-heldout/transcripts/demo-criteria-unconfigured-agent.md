**Answer:** The premise is stale. The public demo already has criteria: `demo/seed.json` inlines the committed example `criteria.yaml` (a made-up "Demo Candidate") as `meta/criteria`, and `tests/demo.test.ts` asserts it. The real private file is never read. The "No criteria yet" empty state exists, but only shows if the seed loses that entry. The work is a build guard plus tests, not a new demo file.

**Critical path**
1. M4.1: the demo build fails if the seed has no criteria spec or it does not parse. Done when DCRIT-1 and DCRIT-2 are green. 0.5 session.
2. M4.2: Criteria screen on the public build (no `?full`): seeded editor, digest preview, edits change the preview, nothing survives a reload. Done when DCRIT-3 to DCRIT-5 are green. 0.5 session.
3. M4.3: pin the unconfigured state as a tested fallback (example in one tap, nothing saves until Save). Done when DCRIT-6 and DCRIT-7 are green. 0.5 session.
4. M4.4: sweep stale text (README, claims register, HANDOFF status, screenshots), then publish only on Chase's go. Done when DCRIT-8 and DCRIT-9 are checked after the publish. 0.5 session.

**Not doing:** visitor-uploaded criteria (sample data only); a second hand-written demo criteria file (would drift); copy or layout rework of the Criteria tab; real company names (that is RR-DEMO-1).

**Biggest risk:** RR-DEMO-1 reshapes the demo seed and could drop the criteria entry. DCRIT-2 handles it.

**Decisions for Chase**
- Should the demo ever show the unconfigured state on purpose? No; keep it a tested fallback.
- Confirm the ask is stale so no new demo file gets built. Recommend yes.
- Publish together with RR-DEMO-1, one republish, since both change the live demo and need your go. Recommend yes.

**Handoffs:** qa-tdd (failing tests DCRIT-1 to 7), engineer (guard), ux-reviewer (390 and 1280 wide), privacy-security (seed scan), positioning (claims).

**Tools:** check-spec and spec-lint exit 0. The agent-memory tool failed here (missing module `check-ux-run.mjs`), so no past findings were checked. The run log is `docs/runs/2026-11-22-staff-pm.md`, with no token or cost count shown, so it is marked escalated. Files are in `/tmp/claude-0/-home-user/3fb24a12-b686-57cb-a079-1ae3d4a32894/scratchpad/b5/demo-criteria-unconfigured-agent/docs/` (`spec.md`, `runs/`).

```spec
verdict: ready
bet: A recruiter who opens the public demo and taps Criteria sees a filled-in, editable criteria screen with a live digest preview, never a dead-end empty state; it worked when the demo build cannot ship without seeded criteria and a browser test proves the edit-and-preview loop on sample data
step: M4.1 | Build guard: public and full demo builds fail if the seed has no criteria spec or it does not parse | DCRIT-1 and DCRIT-2 green | 0.5 session
step: M4.2 | Criteria screen on the public build: seeded editor, digest preview, edit changes the preview, nothing persists past reload | DCRIT-3 to DCRIT-5 green | 0.5 session
step: M4.3 | Unconfigured state pinned as a tested fallback (example in one tap, nothing saves until Save) | DCRIT-6 and DCRIT-7 green | 0.5 session
step: M4.4 | Stale text sweep: README, MARKETING claims, HANDOFF status lines, screenshots list; Chase's go before any demo publish | DCRIT-8 and DCRIT-9 checked after the publish; rollback: revert the merge commit and redeploy | 0.5 session
criterion: DCRIT-1 | auto | Given buildDemo with publicDemo true and the committed seed, then the inlined meta/criteria spec parses with js-yaml, has "demo: true" and owner "Demo Candidate", and the built page contains no "No criteria yet" text on first render of the Criteria tab
criterion: DCRIT-2 | auto | Given buildDemo (public or full) with a seed whose meta has no criteria, or whose spec is an empty string or "not: [valid"), then the build throws an error naming "criteria" instead of writing the page
criterion: DCRIT-3 | auto | Given the public build at 390x844 and 1280x800 with no ?full, when the Criteria tab is opened, then the editor, the Digest preview card (at most 8 items, the sample's digest_max_items) and the Alerts card all render, the editor starts within 2 screens (844px) of the top at 390 wide, and the console has 0 errors
criterion: DCRIT-4 | auto | Given the public build on the Criteria tab, when min_score_to_add is changed from 45 to 95 in the editor, then the Digest preview list shrinks to the roles in New scoring 95 or more (0 when none do) and the unsaved bar shows
criterion: DCRIT-5 | auto | Given the public build after Save criteria on a changed spec, when the page is reloaded, then the Criteria tab shows the original seeded spec (min_score_to_add 45) and "Last saved" shows the seed's timestamp, because the demo saves nothing
criterion: DCRIT-6 | auto | Given buildDemo with a test-only seed that has jobs but no meta/criteria, when the Inbox is opened, then it shows "Set your criteria first" with an Open Criteria button that lands on the Criteria tab
criterion: DCRIT-7 | auto | Given that same unconfigured page, when Start from the example is tapped, then the editor holds the example spec ("demo: true" included), the toast reads "Example loaded", the saved criteria stay empty until Save criteria is tapped, and Discard changes restores the empty state
criterion: DCRIT-8 | manual | Given Chase's go and a republish, when a phone opens the live demo and taps More then Criteria, then the first screen shows a filled editor with a sample label and no "No criteria yet" text
criterion: DCRIT-9 | auto | Given the README and the claims register checked against the released version after the change, then every demo claim about criteria (editable, scored 0 to 100, saves nothing) matches the built public page: 3 of 3 claims found on it
cut: Letting a visitor upload their own criteria file or role list | the demo is sample data only, saves nothing and must never hold personal data (CLAUDE.md hard rule)
cut: A second, hand-written demo criteria file separate from the repo's example | one source of truth; the build already reads the example, so two files would drift
cut: Redoing the empty-state copy or the Criteria layout | the screens exist and are covered; this change only guards and tests them
cut: Real company names in the demo seed | belongs to RR-DEMO-1 and its open wording decision, not this spec
risk: RR-DEMO-1 reshapes the demo seed and could drop the criteria entry, sending visitors to the empty state | DCRIT-2
risk: A saved edit looks permanent to a visitor but vanishes on reload | DCRIT-5
risk: Sample-only claim erodes if criteria text names real people or employers | DCRIT-1
decision: Should the public demo ever show the unconfigured state on purpose, for example behind a query flag? | No. Keep it a tested fallback only; a recruiter should see a working Criteria screen first
decision: Is the missing criteria file in the ask a real gap or a stale premise? | Treat as stale: the committed example is already seeded into the demo; the work is the guard and tests, so confirm and skip any new demo file
decision: Publish with RR-DEMO-1 or on its own? | Publish together, one republish after the seed reshape, since both change the live demo and need your go
handoff: qa-tdd | failing tests for DCRIT-1 to DCRIT-7 (the guard tests red first, browser tests pin the rest) | red for the right reason, then all suites green 3x
handoff: engineer | add the build guard in the demo build script (M4.1) | DCRIT-2 green 3x
handoff: ux-reviewer | check the Criteria screen in the public build at 390 and 1280 wide, light and dark | no P0 or P1
handoff: privacy-security | confirm the seeded spec and the check:private scan carry no personal data | no findings
handoff: positioning | confirm the claims register line about the demo still holds and update README wording if the demo changes | claims match the build
```

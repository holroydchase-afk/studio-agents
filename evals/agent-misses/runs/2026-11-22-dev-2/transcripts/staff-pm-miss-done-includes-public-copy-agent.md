**Answer:** Done for "bedtime mode" means the 9 PM swap works, is tested, and every public artifact it makes stale is updated. The repo is a public portfolio piece, so the README, screenshots and case study count as part of done.

I had only TASK.md and no repo. CLAUDE.md, HANDOFF.md, story, personas and anchors were not available. Every criterion below is a draft to check against the real story and personas. The one repo fact I have is that it's a public portfolio piece.

**Critical path (about 3 sessions)**
1. **M1.1 Define the rule (0.5 session).**
   - Done when the spec fixes the cutoff: 9 PM in the device's local time, with the end of the window (morning cutoff) named.
   - Also fixes what "swap the scan" means, what the checklist contains and whether the user can dismiss it.
   - Chase decides the open items below.
2. **M1.2 Failing tests (qa-tdd, 0.5 session).** Done when every criterion below has a red test.
3. **M1.3 Build (engineer, 1 session).** Done when the tests are green, and qa-tdd has run all suites 3x.
4. **M1.4 Public artifacts (1 session, parallel with M1.3 once the UI is stable).** Done when every item in the stale list is updated and checked.

**Acceptance criteria (draft)**
- BED-1 (auto): Given local time is 9:00 PM or later, when the app opens, then the wind-down checklist shows instead of the scan.
- BED-2 (auto): Given local time is 8:59 PM, when the app opens, then the scan shows as before.
- BED-3 (auto): Given bedtime mode is showing and the clock passes the morning cutoff, when the app next opens, then the scan returns.
- BED-4 (auto): Given the checklist shows, when the user ticks items, then the state is kept for that evening and reset the next day.
- BED-5 (manual): Given a first-time user at 9 PM, when they open the app, then they can tell what happened and how to reach the scan, if an override is allowed, without help.
- BED-6 (auto): Given a timezone or DST change, when the app opens, then the rule uses the current local time.
- BED-7 (auto): Given the user has no consent or location data, when bedtime mode runs, then it needs none beyond the device clock. No new data is collected or sent anywhere.

**Done definition: public artifacts made stale**
- README: feature list, and any "what it does" line that says the scan is the home screen.
- Screenshots and GIFs: add a bedtime-mode shot. Re-capture any home-screen shot that changes.
- Case study or portfolio page: the "what it does" and "decisions" sections, with bedtime mode as a product decision and why.
- Demo: the public demo must show the mode without waiting for 9 PM. Use a labeled time-override control, or a documented URL parameter or toggle. The default is never faked.
- Docs and spec: the feature spec, plus HANDOFF and the decision log if the repo keeps them.
- Store or landing copy and any tagline that describes the app's flow.
- Positioning reviews all copy. Privacy-security confirms no new data is stored or sent.
- Rounding rule: not applicable, since no number appears in two places. If the checklist shows a count such as "3 of 5 done", it derives from the same list. Add one case where the count and the items shown disagree.

**Not doing:** custom bedtimes, smart sleep detection, notifications, streaks, analytics. Each is "not now" until the bet needs it.

**Biggest risk:** the public demo can't show the feature unless someone visits after 9 PM, so reviewers never see it. M1.4 handles this with the time-override control.

**Decisions for Chase**
- Fixed 9 PM or user-adjustable? I recommend fixed 9 PM for v1.
- Can the user skip to the scan? I recommend yes, with one clear "Scan anyway" action, so the mode never blocks the core loop.
- Does the demo get a visible time override? I recommend yes.

**Handoffs**
- qa-tdd: write red tests for BED-1 to BED-7. Done when all fail for the right reason.
- engineer: build after the red tests exist. Done when green 3x.
- ux-reviewer: review the checklist screen and wording. Done when there are no P0 or P1 findings.
- positioning: update the README, case study and demo copy. Done when every item in the stale list is checked.
- privacy-security: confirm no new data. Done when it gives a no-P0 verdict.
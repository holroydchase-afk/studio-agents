# staff-pm-miss-done-includes-public-copy, with agent (staff-pm subagent report, verbatim)

**Answer:** Done for bedtime mode is not just "the checklist shows after 9 PM." The repo is a public portfolio piece, so done also means the public demo and the copy that describes it are ready. The task file gives me no story, personas, anchors or spec to quote. It says only "a public portfolio piece," so the bet below is my assumption and Chase should confirm it.

**Bet (assumed):** a visitor opens the demo and sees that the app respects time of day. The proof is that they can reach the checklist and understand it without help.

**Done when (all true):**
1. BED-1 (auto): Given the local time is 21:00 or later, when the app opens, then the wind-down checklist shows instead of the scan.
2. BED-2 (auto): Given the time is 20:59, when the app opens, then the scan shows.
3. BED-3 (auto): Given the checklist is showing, when the user taps "Scan anyway" or an equivalent, then the scan opens. The checklist must never lock the user out. This is my call, so confirm it.
4. BED-4 (auto): The 9 PM cutoff comes from one constant and is tested at the boundary, including a midnight rollover and a time zone change.
5. BED-5 (manual): A reviewer who has never seen the app can find and understand bedtime mode in 30 seconds. Don't make them change their clock to do it. Add a visible demo control, such as a "Preview bedtime mode" toggle, labeled as a demo. Without it, a recruiter browsing at 2 PM never sees the feature, and that defeats the portfolio purpose.
6. BED-6 (manual): Public copy is updated. That means the README or portfolio blurb, with a one-line description and a screenshot or GIF of the checklist. Claims come only from the repo's claims doc, if it has one. Run the `positioning` agent.
7. BED-7 (manual, `privacy-security` and `ux-reviewer`): The mode reads the device clock only, with no network calls and nothing stored beyond what the app already stores. The sample data is labeled as sample data. The checklist copy is reviewed against the personas.
8. HANDOFF.md is updated in the same PR. If this is a live-demo change, it waits for Chase's go to merge.

**Critical path (about 3 sessions):** 1. qa-tdd writes the failing tests BED-1 to BED-4. 2. engineer builds the mode plus the demo preview toggle. 3. ux-reviewer and privacy-security review it, positioning writes the copy, and the screenshot is captured.

**Not doing:** custom checklist items, per-user bedtime settings, notifications or reminders, streaks or history, sleep tracking.

**Biggest risk:** the feature is invisible in the demo unless the visitor happens to open it after 9 PM. The preview toggle (BED-5) handles that.

**Decisions for Chase:** skippable checklist (recommend yes); 9 PM fixed or configurable (recommend fixed); confirm the portfolio is the bet.

**Handoffs:** qa-tdd (BED-1 to BED-4 red), engineer (mode plus preview toggle, green 3x), ux-reviewer (copy and toggle), privacy-security (no network, no new stored data), positioning (README and portfolio copy plus screenshot).

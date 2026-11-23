Hi Chase, I'm Hearth's chief of staff for the tab bar spec. Spec written: docs/product/SPEC-TABBAR.md

```spec
verdict: ready
bet: A grandparent with Easy view on still sees a word under every tab and gets to the photo without help; a parent sees the compact icon-only bar. It worked when no viewer test run needs help finding a tab and the public README makes no claim the app breaks.
step: M1.1 | Fix the rule in the docs first: DESIGN-SYSTEM tab bar section, CLAUDE rule 3 exception, DEC-66 entry, persona check row | docs say one rule and TABBAR-6 is green | 0.5 session
step: M1.2 | Failing tests for TABBAR-1 to TABBAR-5 | all red for the right reason | 0.5 session
step: M1.3 | Tab bar shows labels only when Easy view is on; default on for viewers, off for parents | TABBAR-1 to TABBAR-5 green 3x | 1 session
step: M1.4 | README wording after the change is merged, deployed and checked on a phone | TABBAR-7 passed on a real phone | 0.5 session
criterion: TABBAR-1 | auto | Given role viewer and Easy view on, when the tab bar renders, then it shows 4 tabs labelled "Gallery", "Share", "Feed", "More", each with visible text under its icon
criterion: TABBAR-2 | auto | Given role parent and Easy view off, when the tab bar renders, then it shows 4 icons and 0 visible text labels
criterion: TABBAR-3 | auto | Given a new account, then Easy view is on for a viewer and off for a parent; and given a parent who turns Easy view on, then the 4 labels show
criterion: TABBAR-4 | auto | Given icon-only mode, then each of the 4 tabs still has its spoken name ("Gallery", "Share", "Feed", "More") and a tap target of at least 48 pt
criterion: TABBAR-5 | auto | Given a viewer who turns Easy view off, then labels are hidden, and given the setting fails to load, then the bar falls back to labels shown (4 labels)
criterion: TABBAR-6 | auto | Given the repo docs after the change, then no file says every icon has a word under it without the Easy view exception (0 unqualified hits for that claim in README, CLAUDE.md, DESIGN-SYSTEM.md)
criterion: TABBAR-8 | auto | Given a 360px by 640px screen with labels shown, then the tab bar is at most 80 pt tall and the feed area still shows at least 2 photos
criterion: TABBAR-9 | manual | Given the released build, when the README line is compared with the app, then both roles match what it says (viewer sees 4 words, parent sees 0) -> 2 of 2 roles match
criterion: TABBAR-7 | manual | Open the build on a phone as a viewer, then as a parent -> viewer sees 4 words under the icons, parent sees none, and the active tab is still obvious without a word
cut: Per-tab label choices | one switch (Easy view) is enough for the bet
cut: Changing tab names or count | names are set by DEC-59, not this change
cut: Android-specific styling | milestone order puts Android later
risk: A grandparent ends up with Easy view off and an icon-only bar | TABBAR-5
risk: README keeps promising a word under every icon, which is false for parents | TABBAR-6
decision: Wording for the README line | Say "Easy view (on by default for grandparents) puts a word under every icon"
decision: Easy view off for a viewer shows icon-only, or labels anyway | Icon-only, since the setting means what it says (TABBAR-5)
handoff: qa-tdd | failing tests for TABBAR-1 to TABBAR-6 | red for the right reason
handoff: engineer | build M1.3 | TABBAR-1 to TABBAR-6 green 3x
handoff: grandparent-ux | review the bar for both roles and the active-tab cue without words | no P0 or P1
handoff: positioning | README line and claims register wording | TABBAR-6 green
```

Answer: this is already Chase's call (DEC-66, in the session's Hearth rules), so it is ready to build. The catch is the repo's own docs: CLAUDE.md rule 3 here has no exception, README says every icon has a word, and DESIGN-SYSTEM.md says the tab bar rules live there but has none. Docs first (M1.1), then tests, then build.

Stale text this change makes wrong: README ("every icon has a word under it"), CLAUDE.md rule 3 (no exception), DESIGN-SYSTEM.md (missing tab bar section). The README was "corrected" Nov 18, so it will drift again unless TABBAR-6 guards it.

Edge cases covered: parent with Easy on, viewer with Easy off, setting fails to load, a new account, spoken names kept in icon-only mode.

Done has three states, each recorded in HANDOFF.md: merged (tests green 3x), deployed (build on the phone channel), checked (TABBAR-7 on a real phone). The README may change its claim only after checked.

Note: agent-memory tool failed (missing tools/check-ux-run.mjs); nothing checked. Cost/tokens not shown by harness, logged as escalated. Run log: docs/runs/2026-11-22-staff-pm.md

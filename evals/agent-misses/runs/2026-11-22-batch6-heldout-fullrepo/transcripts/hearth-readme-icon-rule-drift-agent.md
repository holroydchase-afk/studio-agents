**Answer:** This is already decided and built (DEC-66, RD-74..81; iPhone's own bar, DEC-70, RD-106/107). Easy view, PR #119, waits on your merge. What's left is two docs that still say the opposite, plus the merge and a phone check. Spec: `docs/product/SPEC-TABBAR-ICONS.md`; run log: `docs/runs/2026-11-22-staff-pm.md`. check-spec, spec-lint, check-agent-run and the cost guard all exit 0.

"Parents" is a role rule: Easy view is Off for owner and adult, On for viewer. A grandparent with an owner or adult role gets icons only, and a saved Bigger text of false carries over as Off.

**Critical path**
1. M1.1 (0.5 session): merge PR #119 on your word, then check the live demo at 393 px. Chase shows icons, Grandma Jo shows words (RD-80).
2. M1.2 (0.5 session): fix `GOALS.md` G3 point 2 ("No icon-only buttons") and `PERSONA-CHECK.md` (FA hard reds; P-1 "Matches"). Both lack the tab-bar exception that CLAUDE.md rule 3, DS-3 and DS-5 already have (DOCS-1).
3. M1.3 (0.5 session): you check one iPhone and one Android. Easy view On at the largest text, and Off with VoiceOver and TalkBack (RD-81).

**Not doing**
- A separate "Tab words" switch: DEC-66 chose one switch.
- Icon-only for other buttons: DS-3 keeps a word on each.
- Changing the role defaults.

**Biggest risk:** a far-away inviter guides a parent by voice and the parent has only icons (RD-76 keeps spoken names and 48 pt). Second: switching Easy view on iPhone swaps the navigator and lands on Gallery (EDGE-1, manual).

**Decision for you:** merge PR #119 now? I recommend yes.

**Handoffs:** qa-tdd writes the DOCS-1 failing test, then 3x green. engineer edits the two docs only. grandparent-ux rechecks the far-away-inviter flow.

Rollback: revert the PR #119 merge commit; saved `easyView` is ignored by older code.

```spec
verdict: ready
bet: Parents get the clean icon-only tab bar and grandparents keep words under every tab with nothing to set; it worked when a viewer never sees a bare icon tab and a parent never needs to open Easy view to get icons
step: M1.1 | Merge PR 119 on Chase's word, then live-check the demo at 393 px as Chase (icons) and as Grandma Jo (words) | RD-80 green on the live page | 0.5 session
step: M1.2 | Fix GOALS G3 point 2 and PERSONA-CHECK FA hard reds and P-1 to name the tab-bar exception | DOCS-1 green | 0.5 session
step: M1.3 | Chase checks one iPhone and one Android: Easy view On at the largest text, Off with VoiceOver and TalkBack | RD-81 recorded in HANDOFF | 0.5 session
criterion: RD-74 | auto | Given no saved choices, when a viewer signs in then Easy view is "On", and when an owner or adult signs in then it is "Off"
criterion: RD-75 | auto | Given saved prefs with bigText false and no easyView for a viewer, when they load then Easy view is "Off"; given unreadable prefs for an owner then it is "Off"
criterion: RD-76 | auto | Given Easy view Off, when the tab bar renders for an owner then 4 tabs have no visible word, each keeps its spoken name, the tab role and a 48 pt target
criterion: RD-77 | auto | Given Easy view On, when the tab bar renders for a viewer then 3 tabs each show a word of 17 pt or more under the icon at the largest text with no clipping
criterion: RD-80 | auto | Given the public demo at 393 px, when Chase is shown then the tabs are icon-only, and when "See it as Grandma Jo" is picked then the words show, and switching back restores icon-only
criterion: DOCS-1 | auto | Given GOALS.md and PERSONA-CHECK.md, when a docs test reads G3 point 2 and the FA hard reds then each contains "except the tab bar" or equivalent exception naming Easy view (DEC-66), and P-1 no longer says Matches without it
criterion: EDGE-1 | manual | Given an iPhone owner, when Easy view is switched On then Off in More then the screen shows "Gallery" selected, still signed in, with 0 crashes
cut: Per-tab word toggle or a separate Tab words switch | DEC-66 chose one switch, one sentence over the phone
cut: Icon-only for non-tab buttons | DS-3 keeps a word on every other icon
cut: Changing the role defaults | Chase set viewer On, owner and adult Off
risk: A far-away inviter guides a parent by voice and the parent has no words to read | RD-76
risk: A grandparent who is an owner or adult gets icons only | RD-74
risk: Stale GOALS and persona rows make a later review flag the shipped design as a hard red | DOCS-1
decision: Merge PR 119 now so the live demo shows it | Yes, it is the live change Chase already specced; merge and live-check M1.1
handoff: qa-tdd | failing test DOCS-1 (docs consistency) and confirm RD-74..80 are green 3x | DOCS-1 red for the right reason, then green
handoff: engineer | edit GOALS.md and PERSONA-CHECK.md only; no app code | DOCS-1 green 3x
handoff: grandparent-ux | recheck FA and grandparent flows on the tab bar with Easy view Off and On | no P0 or P1
```

# Spec: switch to the phone's system font

**Answer:** Don't build it yet. This was already tried and reversed: DEC-58 swapped to the system font in PR 114, and PR 146 put Atkinson Hyperlegible back six days later because relatives said 1, l and I looked alike. DEC-31 sets Atkinson as the one font for legibility for older eyes. Nothing in the ask says what changed, so this is a decision for Chase, not a build.

lint-ok: SL-4 this is a font swap, not a new screen; FONT-5 already bounds layout growth to 1 line
lint-ok: SL-2 no counts, totals or lists are involved in a font change

## What the repo says
- HANDOFF: "Font: Atkinson Hyperlegible everywhere (back since PR 146). Beta with relatives is two weeks out."
- DEC-31 (one font, legibility for older eyes) and DEC-58 (system font tried, reversed on relatives' feedback).
- CLAUDE.md: text 17pt or larger, 48pt tap targets. Grandparents are the core persona.
- No open system-font work in the repo. No memory hit for this topic.
- Stale if it ships: DEC-31, the HANDOFF font line, any screenshots.

## Critical path (only if Chase says go)
1. M1.1 Legibility check, 0.5 session: show 5 relatives the same screen in both fonts on their own phones. Done when 4 of 5 pick the system font or say no difference.
2. M1.2 Font swap behind one token, 0.5 session: one font-family token, system stack, Atkinson kept as fallback and one-line revert.
3. M1.3 Relative check after the swap, 0.5 session: same 5 relatives read the confusable strings. Done when 0 misreads.
4. M1.4 Docs: new DEC entry, HANDOFF and DEC-31 updated.

## Not doing
- A full swap before the relatives check: the last swap failed on exactly that audience.
- Per-device font mixing: two looks across phones undoes DEC-31's "one look".
- A native feel through the font alone: spacing, controls and motion give more of it at no legibility cost; ux-reviewer can list them.

## Biggest risk
Repeating PR 114: relatives misread 1, l and I and the beta starts with a regression. Handled by M1.1 before any build and one-token revert via the token (FONT-3).

## Decisions for Chase
- Is "feels native" worth reopening DEC-58? Recommend no: keep Atkinson, chase nativeness elsewhere.
- If yes, allow the relatives check first? Recommend yes, before the beta, not during it.
- Time: the beta is two weeks out. Recommend any swap lands, if at all, after the beta's first week.

## Handoffs
qa-tdd gets failing tests only after Chase decides yes. Until then nothing to build.

```spec
verdict: needs-decision
bet: Older relatives read the app as easily in the system font as in Atkinson; it worked when 5 of 5 relatives misread none of 1, l and I
step: M1.1 | Side-by-side legibility check with 5 relatives | 4 of 5 pick system font or see no difference | 0.5 session
step: M1.2 | Font swap behind one token, Atkinson as fallback | FONT-1 and FONT-3 green | 0.5 session
step: M1.3 | Relative re-check after swap | 0 misreads of 1, l and I across 5 relatives | 0.5 session
step: M1.4 | Update DEC log and HANDOFF | new DEC entry replaces DEC-31 | 0.5 session
criterion: FONT-1 | auto | Given the system font token is set, then the computed font-family of body text starts with the system stack and not "Atkinson Hyperlegible"
criterion: FONT-2 | auto | Given the strings "Il1" and "O0" on every screen, then body text renders at 17pt or larger and tap targets are 48pt or larger
criterion: FONT-3 | auto | Given the token is set back to Atkinson Hyperlegible, then the computed font-family is "Atkinson Hyperlegible" on every screen with no other file changed
criterion: FONT-4 | manual | Show 5 relatives "Il1" on their own phone -> 0 relatives misread a character
criterion: FONT-5 | manual | Open the app on iPhone and on Android -> text uses each phone's own font and no screen grows by more than 1 line
cut: Full swap before the relatives check | PR 114 failed on this audience
cut: Mixing fonts per device | breaks DEC-31's one look
risk: Relatives misread 1, l and I as in PR 114 | FONT-4
risk: Swap lands during the beta and cannot be undone fast | FONT-3
decision: Reopen DEC-58 for a native feel? | No, keep Atkinson and get nativeness from spacing and controls
decision: If reopened, run the relatives check first? | Yes, before building anything
decision: When could a swap ship? | After the beta's first week, not before
handoff: qa-tdd | failing tests for FONT-1 to FONT-3, only after Chase says yes | red for the right reason
handoff: ux-reviewer | list native-feel gains that keep Atkinson | list of changes with legibility unaffected
```

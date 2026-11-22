# Spec: switch the app to the system font (HOLD, needs Chase's call)

**Recommendation: do not build this yet.** The repo already tried it and reversed it, and the reason still applies to the users you named.

## What the repo says
- DEC-58: the system font shipped in the redesign (PR 114). PR 146 reversed it six days later. Relatives said 1, l and I looked alike.
- DEC-31: Atkinson Hyperlegible is the one font for every screen, chosen for legibility for older eyes and one look across phones.
- HANDOFF.md: Atkinson is in place "everywhere (back since PR 146)". The beta with relatives is two weeks out.
- The CLAUDE.md grandparent rules (17pt text, 48pt tap targets) are not affected, but this change would work against their intent.

## Why this is the same request
The goal, "feels more native", is a look preference. The users, older relatives, are the same ones who already hit the 1/l/I confusion. Nothing in the request says that problem is gone. The system font also varies by phone (San Francisco on iPhone, Roboto on Android), which gives up DEC-31's "one look across phones".

## Decision needed from Chase
Either:
1. **Keep Atkinson (recommended).** Close this. Native feel can come from the other native cues: platform-style spacing, controls and motion. No font change.
2. **Reverse DEC-31 deliberately.** If so, log a new decision that names DEC-58 and PR 146 and says what changed (for example, new evidence from relatives that the 1/l/I problem does not occur with the current system font at their text-size settings). Then build as below.

## If option 2: scope
- Replace the Atkinson font family with the platform system font stack in one place (the theme or typography token), not per screen.
- Keep the 17pt minimum and 48pt targets. Respect the phone's own text-size setting.
- Remove the bundled Atkinson files and loading code only after the change is accepted.
- Tests (qa-tdd first, red then green 3x): the theme resolves to the system font on both platforms; no screen sets its own font family; text size minimum holds.
- Review: grandparent-ux on a real phone with 1/l/I sample text (IDs, codes, "Il1" strings) at the largest text size; at least two relatives, on both iPhone and Android, before the beta.
- Update DECISIONS.md and HANDOFF.md in the same PR. Merge only with Chase's go, since it changes the live app.

## Not done
No code was changed: the repo holds only docs, with no app source. No decision was made on Chase's behalf.

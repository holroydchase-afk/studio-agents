# Spec: tab bar icon-only for parents, words for viewers with Easy view on

Hi Chase, I'm Hearth's chief of staff for this spec. Short version: the change is small and already decided (DEC-66), but this repo's docs contradict it, so fix the docs in the same PR or the README stays wrong.

## What I found (the repo has 3 files, all tiny)
- `docs/product/DESIGN-SYSTEM.md` says "the tab bar rules are written here" but contains none. Nothing to build from.
- `CLAUDE.md` (repo copy) Rule 3 says "words under icons" with no tab-bar exception.
- `README.md` (public front door) says "every icon has a word under it". After this change that is false for parents.
- The project instructions loaded in my session (not in this repo's files) already carry the exception: tab bar icon-only, spoken names kept, 48pt, unless Easy view is on; Easy view on by default for viewers (grandparents), off for parents (DEC-66). So this repo copy has drifted behind that. I could not verify DEC-66's text; DECISION-LOG.md is not in this repo.

## Behavior
| Who | Easy view | Tab bar |
|---|---|---|
| Viewer (grandparent) | On by default | Icon + word (Gallery, Share, Feed, More) |
| Parent | Off by default | Icon only |
| Anyone | Toggled by the person | Follows the toggle: on = words, off = icon only |

Rules for both modes: 48pt tap target, 17pt+ word text when shown, each tab keeps an accessible name (screen reader speaks "Gallery" etc.) even when icon-only, no gesture-only actions. Easy view is the switch; role only sets its default.

## Changes
1. App: tab bar reads the Easy view setting; renders label when on, hides it visually (keeps accessibility label) when off. Default: on for viewer role, off for parent role. Existing users: keep their stored setting; default applies only if unset.
2. Docs: add the tab bar section to `DESIGN-SYSTEM.md` (the table above). Add the exception to Rule 3 in `CLAUDE.md`.
3. README: change "every icon has a word under it" to something true, e.g. "every icon has a word under it for grandparents (Easy view, on by default); parents can switch to icons only." Positioning agent should word it; README is public.
4. DECISION-LOG: confirm DEC-66 entry exists and matches; add the persona check row (grandparent Green only if the default is words).

## Tests (qa-tdd writes these red first, titled with the ticket id)
- Viewer, fresh account: tab bar shows 4 words.
- Parent, fresh account: tab bar shows no visible words; each tab still has an accessible name.
- Parent turns Easy view on: words appear. Viewer turns it off: words go.
- Stored setting beats the role default.
- Tap targets are at least 48pt in both modes.

## Review lanes
staff-pm (this spec), qa-tdd (red then green 3x), engineer, grandparent-ux (a relative sees this screen, outranks ux-reviewer), positioning (README line), story-keeper (log the drift lesson: a rule changed in one doc and the public README was not updated).

## Decisions for you (one word each)
- Is a grandparent who is also a parent (or a viewer who turns Easy view off) fine with icon-only? Recommend yes: it is their choice and names stay spoken.
- Ok to reword the README as above? Recommend yes.

## Risk
Public README currently overstates the accessibility promise. Landing it with the app change avoids a false claim; no live deploy is needed for the docs part.

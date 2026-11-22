# Home screen: spec

**Answer: cut, don't restyle.** The owner's complaint ("too much, I don't know where to look") is about hierarchy and density, not polish. The 7/10 polish score doesn't contradict it: a screen can be nicely styled and still have too many things competing. Restyling would leave that problem in place.

I haven't seen the screen. This spec rests on the description you gave me, so confirm the points marked "check" against the real page.

## Problem
Four blocks compete for attention above the fold: title, three lines of guiding text, the upload button, and a how-it-works strip, plus a footer. A first-time visitor has no single obvious starting point.

## Goal
Within about 3 seconds, a first-time visitor's eye lands on one thing, the upload button, and they know what it does.

## Changes (in priority order)
1. **One line of guiding text, not three.** Keep the single sentence that says what the product does and what happens next. Move anything about privacy, formats or limits to the how-it-works section or a help link. Check: if one of the three lines is a privacy promise that is load-bearing for trust, keep it as small text directly under the button rather than deleting it.
2. **The upload button is the only primary element.** Largest, highest contrast, nothing visually louder than it. Title stays but is secondary in size and weight.
3. **Demote the how-it-works strip.** Either collapse it behind a "How it works" link, or move it below the fold with lighter styling. Do not remove it outright without the owner's say; it may help trust. Recommend collapsing as the default.
4. **Footer reduced to the minimum** (links the product needs, nothing else), low contrast.
5. **No restyle of colors, fonts or components.** Spacing changes only where needed to give the button room.

## Out of scope
New features, new copy beyond shortening, a visual redesign, changes to the upload flow itself.

## Acceptance criteria
- The home screen has one title, one line of guiding text, one primary button. Anything else is visually clearly secondary.
- Guiding text is no more than one sentence.
- How-it-works is collapsed or below the fold; it is reachable in one tap.
- Quick test: show the screen to 3 people who haven't seen it for 5 seconds, then ask "what would you do first?" All 3 should say upload.
- Owner re-looks and signs off. This is the real gate, since the original feedback is subjective. Failing the test counts as red.
- Tests: any existing UI or snapshot tests are updated to match, not weakened.

## Process notes
This changes user-visible words and layout, so it needs ux-reviewer before merge, plus positioning for the shortened copy. The PR `Agents:` line should name whoever actually ran. A merge that changes the live site waits for the owner's go.

## Decision for the owner (one word)
Which of the three guiding lines should survive? My recommendation: whichever says what the product does. Default if no answer: keep that one and move the rest into how-it-works.

**Decision:** This is a focus problem, not a polish problem. Don't restyle. Cut the text to one line and make upload the single obvious action. The 7/10 polish score doesn't explain "I don't know where to look"; the screen has four competing things (title, three guiding lines, how-it-works strip, footer) and no clear first stop.

**Critical path**
1. M1.1: Cut the three guiding lines to one line of 12 words or fewer. Done when HOME-1 and HOME-2 are green. 0.5 session.
2. M1.2: Make upload the only primary button, collapse how-it-works behind a "How it works" toggle, and trim the footer to one line. Done when HOME-3 and HOME-4 are green. 0.5 session.
3. M1.3: Five-second test with the owner on a phone. Done when HOME-5 passes. 0.25 session.

**Not doing**
- Restyle, new palette or animation: the complaint is too much, not ugly.
- Rewriting how-it-works content: demote it first, rewrite only if he still complains.
- Hero image or illustration: one more thing to look at.

**Biggest risk:** Cutting guidance leaves first-timers unsure what the app does. HOME-5 catches it.

**Decisions for Chase**
- Collapse how-it-works behind a link, or remove it from home? I recommend collapse: still one tap away, easy to undo.

**Handoffs**
- qa-tdd: failing tests for HOME-1 to HOME-4 at 390px, red for the right reason.
- engineer: build M1.1 and M1.2, green 3x.
- ux-reviewer: re-review for focus, not polish.

```spec
verdict: ready
bet: The owner (and a first-time visitor) can name the one thing to do on the home screen without help; it worked when a 5-second look ends with the owner pointing at the upload button and saying no more "I don't know where to look"
step: M1.1 | Cut the three guiding lines to one short line above the upload button | HOME-1 and HOME-2 green | 0.5 session
step: M1.2 | Make upload the single primary action; demote the how-it-works strip to a collapsed or secondary link and trim the footer to one line | HOME-3 and HOME-4 green | 0.5 session
step: M1.3 | 5-second test with the owner on a phone-width screen | HOME-5 passes | 0.25 session
criterion: HOME-1 | auto | Given the home screen at 390px width, then the guiding text above the upload button is 1 line of at most 12 words
criterion: HOME-2 | auto | Given the home screen loads, then exactly 1 element is styled as a primary button and its label is "Upload a photo"
criterion: HOME-3 | auto | Given the home screen loads, then 0 how-it-works steps are visible until the toggle labeled "How it works" is opened, and the toggle takes focus with Tab
criterion: HOME-4 | auto | Given the home screen at 390px width, then the upload button sits above the fold with 0 px of scroll
criterion: HOME-5 | manual | Show the owner the screen for 5 seconds on a phone -> they point at the upload button and say what it does
cut: Restyle, new palette or animation | the complaint is too much to look at, not looks; the 7 of 10 polish score does not explain "I don't know where to look"
cut: Rewriting how-it-works content | demote it first; rewrite only if the owner still asks after HOME-5
cut: Adding a hero image or illustration | adds one more thing to look at
risk: Removing guidance leaves first-time users unsure what the app does | HOME-5
risk: Collapsed how-it-works is never found and the explanation is lost | HOME-3
decision: Is the how-it-works strip collapsed behind a link, or removed from the home screen entirely | Collapse it; keeps the explanation one tap away and is easy to undo
handoff: qa-tdd | failing tests for HOME-1 to HOME-4 at 390px width | red for the right reason
handoff: engineer | build M1.1 and M1.2 | HOME-1 to HOME-4 green 3x
handoff: ux-reviewer | re-review the home screen for focus, not polish | no P0 or P1 on "where to look"
```

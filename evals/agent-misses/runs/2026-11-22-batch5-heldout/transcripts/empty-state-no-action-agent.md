Hi Chase. Decision: build Events with the empty state as the main case. A person with zero events sees "No birthdays or visits yet" and one big 48pt "Add a birthday" button, plus "Add a visit". Never a blank list.

Caveat: this working directory had no CLAUDE.md, HANDOFF.md or tracker, so I could not read the repo's Events history or in-flight work. I used the Hearth rules from CLAUDE.md (17pt text, 48pt targets, verb labels, "group" not "circle", Easy view). Check TRACKER and BETA-SPEC for an existing Events item before building. The agent-memory tool failed (a missing check-ux-run.mjs), so past findings were not checked.

Critical path: M1.1 list, add form and empty state (1 session); M1.2 audience on each event, not-found for unseen groups (1 session); M1.3 old-phone run with Easy view (0.5 session).

Not doing: reminders and push, calendar sync, recurring-rule editor, photos on events.

Biggest risk: a blank first screen strands older users (EVT-1).

Decisions for you: (1) Can grandparents add events? Yes. (2) Events inside More, not a fifth tab? Yes, since tabs are fixed from Nov 14. (3) Birthdays for people not in the app, name and date only? Yes.

Files: SPEC-EVENTS.md, docs/runs/2026-11-22-staff-pm.md (both in the working directory). check-spec, spec-lint, check-agent-run and the cost guard all exit 0.

```spec
verdict: needs-decision
bet: Older relatives open Events before any event exists; it worked when a first-time user adds one birthday unaided within 1 minute
step: M1.1 | Events list and add form on the fake API, empty state first | EVT-1 to EVT-4 green | 1 session
step: M1.2 | Audience (group) on each event and not-found for unseen groups | EVT-6 and EVT-7 green | 1 session
step: M1.3 | Phone run on an old phone with Easy view on | EVT-9 and EVT-10 pass | 0.5 session
criterion: EVT-1 | auto | Given a family with zero events, when the Events screen loads, then it shows the text "No birthdays or visits yet" and exactly 1 primary button labeled "Add a birthday"
criterion: EVT-2 | auto | Given zero events, when the screen renders, then it also shows a secondary button "Add a visit" and no icon-only control
criterion: EVT-3 | auto | Given zero events, when "Add a birthday" is tapped with title "Gammy's birthday", date 2027-03-14 and group "Family" selected, then the list shows 1 row "Gammy's birthday" and the empty text is gone
criterion: EVT-4 | auto | Given a pinned clock of 2026-11-22 and events on 2026-11-22, 2026-11-23 and 2026-11-30, then the rows read "Today", "Tomorrow" and "In 8 days" in that order
criterion: EVT-5 | auto | Given a Feb 29 birthday and a pinned clock in 2027, then the date shows Feb 28 2027 and days-until is counted from that date
criterion: EVT-6 | auto | Given the add form with no group chosen, when Save is tapped, then no event is created and the message "Pick who can see this" is shown
criterion: EVT-7 | auto | Given an event in a group the viewer is not in, when the viewer opens its id, then the result is "not found" and the list has 0 rows for it
criterion: EVT-8 | auto | Given the load fails or the device is offline, when Events opens, then it shows "Couldn't load events. Try again" with a "Try again" button and not the empty-state text
criterion: EVT-9 | auto | Given "Add a birthday" tapped twice quickly, then exactly 1 event is saved
criterion: EVT-10 | manual | Open Events with zero events on an old phone at 360px by 640px with Easy view on -> text is 17pt or larger, both buttons are 48pt or taller, and the whole screen fits in 1 screen tall with no scrolling
criterion: EVT-11 | auto | Given 51 events, when the list loads, then 50 rows show with a "Show more" button and the 51st appears after it is tapped
criterion: EVT-12 | auto | Given a title of 3 spaces, when Save is tapped, then no event is created and the message "Add a title" is shown
cut: Reminders and push notifications for events | new notification and privacy surface; not needed to prove the first-visit bet
cut: Calendar import or sync | new vendor and data-flow risk; deep not wide
cut: Recurring yearly birthdays as a rule engine | store one date per birthday and show next occurrence; no rule editor
cut: Photos attached to events | media policy applies; separate task
risk: Blank screen on first visit leaves older users stuck with no next step | EVT-1
risk: Event shown to a group it was not meant for | EVT-7
risk: Fixed-size text or small targets on old phones | EVT-10
decision: Can viewers (grandparents) add events or only parents | Let everyone add; a grandparent adding their own birthday is the likeliest first success
decision: Is Events a new tab or inside More, given tabs are Gallery, Share, Feed, More | Put it inside More for now; a fifth tab changes a rule Chase set on Nov 14
decision: Add birthdays for people not in the app yet (name only) | Yes, name and date only, no contact details
handoff: qa-tdd | failing tests for EVT-1 to EVT-9, EVT-11 and EVT-12 with a pinned clock | red for the right reason
handoff: engineer | build M1.1 and M1.2 after red | EVT tests green 3x
handoff: grandparent-ux | review the empty state words and sizes | no P0 or P1
handoff: privacy-security | check audience rules and not-found on events | no P0 or P1
```

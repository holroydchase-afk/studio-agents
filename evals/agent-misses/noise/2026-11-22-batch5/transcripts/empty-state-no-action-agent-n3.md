Answer: Build the Events screen with a first-class empty state, because most users open it before any event exists. The empty state is the main design, not an edge case. It names what Events are and offers one big action, "Add a birthday", plus "Add a visit".

Repo facts used (from the ask only; no CLAUDE.md, HANDOFF.md or persona docs were available to me, so I could not check in-flight work, hard rules or past decisions. Flagged as a risk below):
- Families add birthdays and visits.
- Most people open the screen before any event exists.
- Users are older relatives on phones.

## Critical path
1. M1.1 Event model and list rules (birthday, visit; sort by next date; past events; pinned clock). Done when EVT-1 to EVT-4 are green. 1 session.
2. M1.2 Empty state with the two actions. Done when EVT-5 to EVT-7 are green. 0.5 session.
3. M1.3 Add flow: type, name, date, save, back to the list. Done when EVT-8 to EVT-13 are green. 1 session.
4. M1.4 Phone-size and older-relative check by ux-reviewer. Done when no P0/P1. 0.5 session.

## Edge cases named up front
Zero events; one event; 50 events (more than a page); event today; event yesterday; Feb 29 birthday in a non-leap year (shown Feb 28); same event saved twice; empty name; failed or offline load; events the viewer may not see (audience rules apply as for posts).

## Not doing
Reminders, calendar sync, RSVPs, photo attachments to events, recurring visits: none removes a blocker for the empty-state bet.

## Biggest risk
The empty state is a dead end (text only, no action), which strands the person who opens it first. Handled by EVT-5 and EVT-6. Second risk: I had no repo docs, so audience rules and word choices may conflict with them; handled by the ux-reviewer and privacy-security handoffs.

## Decisions for Chase
- Who may add events: any family member or only parents? Recommend any adult family member, since grandparents add visits.
- Show birthdays by name only, no age? Recommend name only, less sensitive.

## Handoffs
qa-tdd writes failing tests for EVT-1 to EVT-13; engineer builds; ux-reviewer checks words and tap sizes; privacy-security checks who sees events.

```spec
verdict: ready
bet: An older relative who opens Events before any event exists adds a first birthday or visit without help; it worked when 4 of 5 testers do it unprompted on a phone
step: M1.1 | Event model and list rules | EVT-1 to EVT-4 green | 1 session
step: M1.2 | Empty state with two actions | EVT-5 to EVT-7 green | 0.5 session
step: M1.3 | Add flow back to the list | EVT-8 to EVT-13 green | 1 session
step: M1.4 | Older-relative phone review | no P0 or P1 from ux-reviewer | 0.5 session
criterion: EVT-1 | auto | Given a pinned clock of 2026-11-22 and events on 2026-12-01 and 2026-11-25, then the list order is 2026-11-25 first
criterion: EVT-2 | auto | Given an event dated 2026-11-22 (today) and one dated 2026-11-21, then today shows under Upcoming labeled "Today" and 2026-11-21 shows under Past
criterion: EVT-3 | auto | Given a birthday on Feb 29 and a pinned year 2027, then it is shown on Feb 28 with the label "Feb 28"
criterion: EVT-4 | auto | Given 50 events, then the list shows all 50 in order with none duplicated
criterion: EVT-5 | auto | Given zero events, when the screen opens, then it shows the text "No events yet" and exactly 2 buttons "Add a birthday" and "Add a visit"
criterion: EVT-6 | auto | Given zero events, when the screen opens, then no element is a dead end: every visible text block sits with at least 1 tappable action
criterion: EVT-7 | manual | Open Events with zero events on a small phone -> both buttons are at least 48 pt tall, text is 17 pt or larger, and the whole empty state fits in 1 screen at 360px by 640px with no scrolling
criterion: EVT-8 | auto | Given the add form with type "Birthday", name "Gammy" and date 2026-12-01, when Save is tapped, then the list shows "Gammy" and the empty state is gone
criterion: EVT-9 | auto | Given an empty name, when Save is tapped, then nothing is saved and the message "Add a name" shows next to the name field
criterion: EVT-10 | auto | Given Save tapped twice in a row with the same input, then the list has 1 event, not 2
criterion: EVT-11 | auto | Given the load fails or the phone is offline, when the screen opens, then it shows "Can't load events" with a "Try again" button, and not the "No events yet" text
criterion: EVT-12 | auto | Given a signed-out visitor, when Events is opened, then 0 events are shown and the sign-in screen shows instead
criterion: EVT-13 | auto | Given an event in family A and another account, a non-member who belongs to family B only, when B's user opens Events, then 0 of family A's events are shown and a direct request returns "not found"
cut: Reminders and notifications | not needed to prove the first-event bet
cut: Calendar sync | new dependency and privacy surface, not on the critical path
cut: Photo attachments to events | deep not wide
risk: Empty state becomes a dead end with no action | EVT-6
risk: No repo docs were available, so hard rules and past decisions were not checked | EVT-11
decision: Who may add events, any adult family member or parents only | any adult family member
decision: Show birthdays with or without age | name only, no age
handoff: qa-tdd | failing tests for EVT-1 to EVT-13 | red for the right reason
handoff: engineer | build M1.1 to M1.3 | EVT-1 to EVT-13 green 3x
handoff: ux-reviewer | review empty state and add flow words and tap sizes | no P0 or P1
handoff: privacy-security | check who can see events | audience rules confirmed
```

**Answer:** Build Events as a list whose empty state is an action, not a blank page. Most people open it before any event exists, so with 0 events the screen says "No events yet" and shows one big "Add an event" button. Two fields (title, date) plus Birthday or Visit.

**Critical path:** M1.1 list and empty state (0.5 session); M1.2 add form (1); M1.3 ordering, past events, failed load (1); M1.4 phone check with older testers (1).

**Not doing:** reminders, yearly repeat, RSVPs and comments, other event types. Each is wide, not deep.

**Biggest risk:** the empty state looks finished but gives no way to act (EVT-1). A close second: a failed load shown as "no events" (EVT-8).

**Decisions for Chase:** viewers can add events (recommended: yes). The add form is one screen (recommended).

**Caveat:** I had no repo access, so I did not read HANDOFF.md or CLAUDE.md. Rules or in-flight work on Events are unchecked; the last handoff covers that.

**Handoffs:** qa-tdd, then engineer, then ux-reviewer.

Run log: docs/runs/2026-11-22-staff-pm.md. check-spec, spec-lint, check-agent-run and the cost guard all pass.

```spec
verdict: ready
bet: An older relative opens Events before any event exists and adds the first one without help; it worked when 4 of 5 testers do it unaided in under 60 seconds
step: M1.1 | Events list and empty state with one Add event button | EVT-1 and EVT-2 green | 0.5 session
step: M1.2 | Add event form for birthday and visit, saved to the list | EVT-3 to EVT-5 green | 1 session
step: M1.3 | List ordering, past events, failed load | EVT-6 to EVT-9 green | 1 session
step: M1.4 | Phone check with real older users, then fix | 4 of 5 pass EVT-10 | 1 session
criterion: EVT-1 | auto | Given a family with 0 events, when Events opens, then the screen shows the line "No events yet" and exactly 1 primary button labelled "Add an event"
criterion: EVT-2 | auto | Given 0 events, when the empty state renders, then the button is at least 48pt tall, text is at least 17pt, and no part of the empty state is a bare icon or a blank list
criterion: EVT-3 | auto | Given 0 events, when the user taps "Add an event", then a form opens with a choice of "Birthday" or "Visit" and the Save button is disabled until a title and date are set
criterion: EVT-4 | auto | Given the form with Birthday, title "Gammy" and date 2026-12-03, when Save is tapped, then the list shows 1 event and the empty state is gone
criterion: EVT-5 | auto | Given Save is tapped twice in a row with the same input, then the list shows 1 event, not 2
criterion: EVT-6 | auto | Given events on 2026-11-20, 2026-11-22 and 2026-12-03 and a pinned clock of 2026-11-22, then the list order is 2026-11-22, 2026-12-03 and the 2026-11-20 event sits under "Past"
criterion: EVT-7 | auto | Given the only event is dated 2026-11-20 with the clock at 2026-11-22, then "Upcoming" shows "No upcoming events" with the "Add an event" button and "Past" shows 1 event
criterion: EVT-8 | auto | Given the events load fails, then the screen shows "Couldn't load events" with a "Try again" button and never the "No events yet" empty state
criterion: EVT-9 | auto | Given 31 events, then all 31 are reachable by scrolling and the Add button stays visible
criterion: EVT-10 | manual | On a small phone, a first-time older tester opens Events with 0 events and adds a birthday -> done within 60 seconds with no help
criterion: EVT-11 | auto | Given 0 events at 360px by 640px, then the empty state and its button fit in 1 screen with no scrolling
cut: Reminders and notifications for events | not needed to prove the first-add bet
cut: Recurring birthdays that repeat yearly | adds date rules; do after the first-add loop works
cut: RSVPs and comments on events | wide, not deep; goes in the ideas log
cut: Event types beyond birthday and visit | the two named kinds cover what families add
risk: The empty state looks finished but gives no way to act | EVT-1
risk: A failed load is shown as "no events", so users think their events are gone | EVT-8
risk: Date edge cases such as an event today or a past date | EVT-6
decision: Can the viewer role (older relatives) add events, or only parents | Everyone can add; the empty-state test needs a viewer who can act
decision: Add the first event as one screen or step by step | One screen with two fields, fewer taps
handoff: qa-tdd | failing tests for EVT-1 to EVT-9 and EVT-11 | red for the right reason
handoff: engineer | build M1.1 to M1.3 | EVT-1 to EVT-9 green 3x
handoff: ux-reviewer | review empty state, form and error copy for older users | no P0 or P1
handoff: staff-pm | check the repo docs I could not read for in-flight work or rules on events | conflicts listed before build
```

# Spec: Events screen

Status: draft for Chase's review. Written from the brief and Hearth's CLAUDE.md rules only. I did not read the repo's SPEC files, DESIGN-SYSTEM.md or the tab list, so check this against them and BETA-SPEC before building. Not yet persona-checked.

## Key decision
Most people open Events before any event exists. So the empty screen is the main screen and gets the most design care. It must explain what Events is, and it must offer one obvious button that starts adding an event. A message with no button is not acceptable.

## Who it is for
Older relatives on phones. Hearth rules apply: text 17pt or larger, tap targets 48pt or larger, a verb label on every button, no gesture-only actions, say "group" not "circle".

## Where it lives
Open item: the tab bar is fixed as Gallery, Share, Feed, More (DEC-59). Put Events under More, or confirm with Chase before adding a tab. Recommendation: under More, with a "Coming up" line on Feed later (out of scope).

## What an event is (v1)
- Kind: Birthday or Visit (the only two kinds). Anything else is out of scope.
- Fields: title, date. Visit may have an end date. Birthday repeats every year.
- Audience: one or more groups, using the same group picker as posts. Default is the group the person last used.
- No location field in v1 (see SPEC-MEDIA location rules).

## States

### 1. Empty (no events yet) - the main state
- Heading: "Events"
- One sentence: "Birthdays and visits your family has coming up will show here."
- Primary button, full width, 56pt tall: **Add an event**
- Under the button, two shortcut buttons with words, each 48pt: **Add a birthday** and **Add a visit**. These open the same form with the kind already chosen.
- No illustration is needed. If one is used, it has a text alternative and never replaces the words.
- Do not show a blank list, a spinner, or the words "No data".
- The button is the same for everyone who can add events. A person who can only view (see Permissions) sees the sentence and "Ask a family member to add one." instead of a dead button.

### 2. Has events
- Top: **Add an event** button stays visible (not hidden behind a "+" icon).
- List grouped by "This week", "This month", "Later". Past events move to a "Past" section, collapsed, with a **Show past events** button.
- Each row is one 48pt+ tap target: kind word ("Birthday" / "Visit"), title, date written out ("Saturday, March 14"), group name. Do not rely on color or an icon alone.
- Tapping a row opens event details.

### 3. Loading
- Show the heading and "Loading events..." text. Keep it under a second on normal signal. No empty-state message until the load has finished, so the empty text never flashes by mistake.

### 4. Error / offline
- "We couldn't load events. Check your connection." with a **Try again** button.
- If events were loaded before, show them with "Showing events from your last visit."
- Adding an event offline: save to the upload queue and say "Saved. It will be added when you're online."

## Add / edit event form
- One screen, in this order: kind (two large buttons: Birthday, Visit), title, date, group(s), **Save** and **Cancel**.
- Birthday: title prefilled as "<Name>'s birthday" if a person is chosen from the family list.
- Date uses the native date picker. Also allow typing is not required.
- Validation in plain words, next to the field: "Please enter a date." Never block with a modal that has only an icon.
- After Save: return to the list, scroll to the new event, show "Event added." for 4 seconds. Never auto-dismiss errors.
- Cancel with unsaved changes asks: "Leave without saving?" with **Keep editing** and **Leave**.

## Event details
- Shows kind, title, full date, groups. Buttons: **Edit** and **Delete** (Delete asks "Delete this event?" with **Delete** and **Keep**).

## Permissions
- Who can add: members with post rights in the chosen group. Viewers (grandparents with Easy view) can see events for their groups. Confirm with Chase whether viewers may add visits, since a grandparent announcing a visit is a likely real use. Recommendation: allow it.
- RLS applies as for posts: an event in a group you cannot see behaves as "not found".

## Privacy
- Events are family data. No analytics, no sharing with any AI or outside service, never log titles.
- No real family names in fixtures or the repo; use the nicknames from PERSONAS.md.
- Architecture docs: adding an events table changes how data is stored, so the matching docs/architecture section and its "Last checked" footer must be updated in the same PR (rule 6).

## Notifications
Out of scope for v1. Open question for Chase: reminders before a birthday are the likely next ask.

## Acceptance tests (write these first, titles carry the ID)
- EVT-1 With zero events, the screen shows the explanation sentence and a button labelled "Add an event" that opens the form.
- EVT-2 Empty state shows "Add a birthday" and "Add a visit" buttons, each opening the form with that kind selected.
- EVT-3 Empty text never appears while loading or on error.
- EVT-4 Every button on the screen has a text label, at least 17pt text and at least 48pt height.
- EVT-5 A viewer without add rights sees no dead button, only the "Ask a family member" line.
- EVT-6 Saving a valid event shows it in the list and the "Event added." message.
- EVT-7 Saving with no date shows "Please enter a date." and does not save.
- EVT-8 Offline add is queued and shown as saved-pending.
- EVT-9 An event in a group the user is not in is not returned (RLS test).
- EVT-10 The word "circle" appears nowhere in the UI strings.

## Open questions for Chase
1. Under More, or its own tab? (Recommendation: More.)
2. May viewers add visits? (Recommendation: yes.)
3. Birthday reminders in v1 or later? (Recommendation: later.)

## Next step
Run the persona check, then qa-tdd writes EVT-1 to EVT-10 red, then the engineer builds.

Agents: staff-pm scoped (this spec); qa-tdd, engineer, ux-reviewer, grandparent-ux not yet run. Spec-only, no code changed.

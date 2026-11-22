**Decision:** Build it, but the badge reset must be tied to a successful Feed load, not to opening the screen. If it resets on open, a grandparent on a weak connection opens Feed, the load fails, and every new post is gone from the badge for good. That is a P0: it quietly hides family photos from the core persona.

**Bet:** A grandparent can tell at a glance that something is new and never loses track of what they haven't seen. Signal: no "where did that post go" help requests in the first three sessions.

**Acceptance criteria**
- NEW-1 (auto): Given 3 posts newer than last-visit, when the app starts, then the badge reads "3 new", in words, not only a dot or color.
- NEW-2 (auto): Given 0 new posts, no badge shows.
- NEW-3 (auto): Given 100 or more new posts, it shows "99+ new". Nothing is summed from shown numbers, so no rounding rule is needed.
- NEW-4 (auto): Given a badge of N, when Feed opens and loads successfully and the posts render, then last-visit is saved and the badge clears.
- NEW-5 (auto, THE MISS): Given a badge of N, when Feed opens and the load fails (offline, timeout, 5xx, auth error), then last-visit is NOT saved and the badge still reads N. Cover each failure type.
- NEW-6 (auto): Given a failed load and a later successful retry, the badge clears only after the retry succeeds.
- NEW-7 (auto): Given the user leaves Feed before the load finishes, last-visit is not saved.
- NEW-8 (auto): Given a successful load, the saved time is the newest post's server timestamp, not the phone's clock. This covers wrong-date old phones and posts arriving mid-load.
- NEW-9 (auto): A post the viewer can't see (another audience) or posted themselves is never counted, and the badge never reveals that it exists. The count comes from the same audience-filtered query as Feed.
- NEW-10 (auto): On a first-ever open with no last-visit, the badge is hidden (no "47 new" on day one).
- NEW-11 (manual): With Easy view on and off, badge text is 17pt or larger, the tap target is 48pt, and the screen-reader label is "3 new posts in Feed".
- NEW-12 (manual): On an old phone with a throttled connection, the user can tell the Feed failed ("Couldn't load. Tap to try again") and the badge is still there.

**Critical path** (about 2 sessions)
1. M1.1: qa-tdd writes the failing tests NEW-1 to NEW-10, NEW-5 first. Done when they are red for the right reason. 0.5 session.
2. M1.2: Build the count as a server-side query taking last-visit and the viewer, plus the "save last-visit on load success" call. Done when green 3x. 1 session.
3. M1.3: ux-reviewer runs NEW-11 and NEW-12. Done when no P0 or P1. 0.5 session.

Done also means updating the feed docs and test log, and adding a persona-check row for the grandparent if required.

**Not doing** (all backlog; none removes a core-persona blocker): per-post "new" markers, push notifications for new posts, a "mark all read" button, badges on other tabs, cross-device last-visit sync.

**Biggest risk:** NEW-5. The lost-badge-on-failed-load bug is easy to write and hard to notice because the app looks fine afterward. NEW-5 to NEW-7 are the guard.

**Decisions for Chase**
- Should "new" count only others' posts? Recommend yes (NEW-9).
- Should last-visit stay per device or follow the person? Recommend per device for now (no schema change), and log it as a decision.

**Handoffs**
- qa-tdd: write NEW-1 to NEW-10 failing, NEW-5 first. Done when red.
- engineer: build after red. Done when green 3x.
- ux-reviewer: NEW-11 and NEW-12. Done when no P0 or P1.
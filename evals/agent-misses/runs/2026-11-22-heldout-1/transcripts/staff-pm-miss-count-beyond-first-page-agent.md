**Answer:** Spec the "New for you" count as a server-side count of posts the viewer can see and hasn't seen. It must not be computed from the feed page the client has loaded. The only thing the repo tells us is "feed returns newest posts first." That implies pagination, so a count taken from page 1 would silently cap at the page size. That is the main bug risk here.

There is no CLAUDE.md, HANDOFF.md, story, persona or anchors doc in this task, so nothing below traces to a quoted anchor. I worked from the task text only. These items are assumptions, marked A:
- A1: the feed is paginated, newest first, with a page size N I haven't seen.
- A2: "new" means posts the viewer hasn't seen.
- A3: there is a per-viewer marker for "last seen".
- A4: "for you" means posts the viewer is allowed to see.

**Bet:** the viewer opens the Feed tab and knows how much they missed, accurately, without scrolling. The success signal is that the badge number equals the number of new posts actually reachable in the feed. Measure it as the mismatch rate in a test fixture, which should be 0.

**Acceptance criteria**
- FEED-1 (auto): Given a viewer with 3 unseen visible posts, when the Feed tab loads, then the count shows 3.
- FEED-2 (auto): Given the viewer has more unseen visible posts than one page holds (N+1, 2N+5), when the count loads, then it shows the true total, not N. This is the beyond-first-page case. Add one case with more new posts than N and one with exactly N, N-1 and N+1.
- FEED-3 (auto): Given the count is computed, then it does not depend on which pages the client has fetched. Run the same fixture with 0, 1 and all pages loaded and expect identical counts.
- FEED-4 (auto): Given a post the viewer can't see (audience excluded), when the count loads, then it is not counted. Per A4, this is a privacy/audience P0 if it is wrong, because the count leaks that a post exists.
- FEED-5 (auto): Given the viewer's own posts, then they are not counted as new (A2, to confirm).
- FEED-6 (auto): Given the viewer has seen everything, then the badge is hidden, not "0".
- FEED-7 (auto): Given a very large count, then the display is capped by one stated rule, e.g. "99+". The cap is display-only. The API returns the exact number.
- FEED-8 (manual): Given the count shows K, when the viewer scrolls the feed, then exactly K posts are marked new. The numbers agree in both places.
- FEED-9 (auto): Given the count is on a slow or offline connection, then the feed still loads. The count shows nothing rather than a wrong number.
- FEED-10 (auto): Given a viewer's seen marker, when does it advance? This is the open decision below. The test follows Chase's call.

**Critical path** (about 4 sessions)
1. M1.1 Decide the "seen" definition (see Decisions). Done when it is written into the spec. 0.5 session.
2. M1.2 qa-tdd writes failing tests FEED-1 to FEED-10, including FEED-2 and FEED-3 against a fixture with more than N new posts. Done when they are red for the right reason. 1 session.
3. M1.3 engineer builds a server-side count, either a separate endpoint or a field on the feed response. It is a query, not a row count of the returned page. Done when all FEED tests are green 3x. 1 session.
4. M1.4 ux-reviewer checks the badge and its wording. Done when there is no P0 or P1. 0.5 session.
5. M1.5 privacy-security checks FEED-4 and that the count reveals nothing about posts the viewer can't see. Done when it is signed off. 0.5 session.

**Done definition also lists what goes stale:** API docs for the feed contract, contract tests, and any screenshots or demo data showing the Feed tab.

**Not doing**
- Per-group counts, push notifications for the count, and "mark all as read" gestures. These are backlog. None of them is needed to make the number correct.
- Real-time live updating of the count. Refresh on tab open and pull-to-refresh is enough.
- Computing the count on the client by paging until done. It is slow, it costs data, and it is wrong on partial loads.

**Biggest risk:** the first-page undercount. A count derived from the loaded page (A1) shows N at most, and it looks right in every small test. It is handled by FEED-2 and FEED-3 in M1.2, with a fixture bigger than one page. The second risk is FEED-4, a count that includes posts the viewer can't see.

**Decisions for Chase**
- When does "seen" advance? Recommend: when the viewer opens the Feed tab and the feed renders, not on each post scrolled into view. It is simple and predictable, but it means a quick glance clears the badge.
- Is a cap like "99+" fine? Recommend yes, display only.
- Confirm A1 to A4. In particular, I haven't seen the page size or whether a "last seen" marker exists. If neither exists, add it to M1.3 and flag it as a schema change for `architect`.

**Handoffs**
- qa-tdd: write FEED-1 to FEED-10 as failing tests, with the beyond-first-page fixture. Done when they are red and the cases include N-1, N and N+1.
- engineer: server-side count. Done when green 3x.
- ux-reviewer: badge wording, hidden at zero, capped display. Done when there is no P0 or P1.
- privacy-security: audience leakage in the count. Done when signed off.
- architect: only if a new "last seen" field or schema change is needed.
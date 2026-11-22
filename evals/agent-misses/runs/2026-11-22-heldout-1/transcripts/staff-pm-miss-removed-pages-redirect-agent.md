**Answer:** Go on a four-tab nav, but the spec has to treat this as a migration of a live app, not a greenfield redesign. The app has been live for a month, so people already have Groups, Me and Help bookmarked, installed to home screens, shared in messages, or linked from emails and notifications. Deleting those pages without redirects turns existing users' saved links into 404s or dead routes. That is a P1 (a core persona gets stuck). Note I had no repo, CLAUDE.md or HANDOFF.md, only the task text, so the tab names and URL scheme below are placeholders to confirm.

**Critical path** (each step is about one 1-hour session)
1. M1.1 Inventory (todo). List every route and entry point for Groups, Me and Help: web URLs, deep links, push or email links, in-app links, docs and help text that name them. Where each one's content lands in the new tabs becomes a mapping table in the spec. Done when: every old route maps to exactly one new tab or section, and any route that maps to nothing is flagged for Chase. 1 session.
2. M1.2 Redirect and tests (todo). Add redirects from every old route to its new home, and let the app use them in place of the removed pages. Done when: the NAV-1 to NAV-4 tests below are green 3x. 1 session.
3. M1.3 Build the four tabs (todo), only after the failing tests exist. Done when: NAV-5 and NAV-6 pass and no orphaned route is left. 1 to 2 sessions.
4. M1.4 Stale-artifact sweep (todo). Done when: every item in the done definition is updated or marked n/a.
5. M1.5 Review (todo). `ux-reviewer` on labels and where things moved; `privacy-security` on whether redirects preserve visibility rules (see NAV-3).

**Acceptance criteria**
- NAV-1 (auto): Given a user opens any old route (Groups, Me, Help), when the app loads, then they land on the matching new tab or section, not a 404 or blank screen.
- NAV-2 (auto): Given an old deep link with an ID or parameter (for example a specific group or help article), when it resolves, then it opens the same item in its new location, or the nearest parent with a visible "this moved" note if the item no longer exists.
- NAV-3 (auto): Given a redirected link points to something the user may not see, when it resolves, then it behaves exactly as "not found" did before. A redirect must never reveal that a restricted item exists.
- NAV-4 (auto): Given a notification or email sent before the release carries an old link, when it is opened after the release, then NAV-1 and NAV-2 apply. Includes anything already queued or sent.
- NAV-5 (auto): Given each of the four tabs, when a user reaches it, then every feature that used to live on Groups, Me and Help is reachable in at most the same number of taps as before.
- NAV-6 (manual): Given an existing user who has never seen the redesign, when they ask for something that moved, then they find it without help. Signal: task success without help, measured with 3 existing users on their own phones. "Feels easier" is not evidence.
- NAV-7 (manual): Given a user who bookmarked or installed the app on an old route, when they open it after release, then they see a one-time, dismissible "things moved" note on the new destination.

**Redirect rules to state in the spec**
- Keep redirects for a defined period. Recommendation: at least 90 days, then review the logs or counts. If there is no way to count old-route hits without adding analytics, check the repo's privacy rules first; do not add tracking to measure this. If measurement is not possible, keep them indefinitely, since they are cheap.
- Use permanent redirects where the platform supports them. A static host may only support client-side redirect stubs, so check which this is.
- Redirects must preserve query strings and IDs.

**Done definition (everything this change makes stale)**
Code, tests and redirects. Also: README and any screenshots, the case study or portfolio page if the app is shown there, in-app help text that names the removed pages ("go to Me → Settings"), notification and email templates and their copy, store listing text and screenshots if any, onboarding or beta guides handed to relatives, and the support or FAQ content that was on the Help page and is now being moved.

**Not doing**
- No redesign of tab contents beyond relocating them. New features go in the backlog.
- No "classic navigation" toggle. It doubles the test surface for a one-month-old app.
- No new analytics to track old-route usage.

**Biggest risk:** the redirect inventory (M1.1) is incomplete, and links outside the app (sent notifications, emails, messages people saved) break silently. M1.1 handles it by covering every place a link is generated, not only the router. Second risk: Help content gets scattered across tabs and is no longer findable. NAV-6 tests exactly that.

**Decisions for Chase** (my recommendation in each)
1. Redirect lifetime: 90 days minimum, then keep forever unless it costs maintenance. Recommend keep.
2. Show a one-time "things moved" note to existing users (NAV-7)? Recommend yes, a single dismissible line.
3. Where does Help go? If it has no natural tab, recommend a "Help" entry inside the last tab rather than a fifth tab. Confirm that keeps to four.
4. Release timing: since the app is live, confirm this ships only after NAV-1 to NAV-4 are green, and not as a quick merge with redirects "to follow".

**Handoffs**
- `qa-tdd`: write failing tests NAV-1 to NAV-5 first, including an old link with an ID and a restricted-item case. Done when: they fail for the right reason on the current build.
- `engineer`: redirect mapping and the four tabs, after the red tests exist. Done when: tests green and `qa-tdd` reports 3x green.
- `ux-reviewer`: labels of the four tabs and the moved-note wording against existing users. Done when: no P0 or P1.
- `privacy-security`: NAV-3 and NAV-4 (redirects and old notification links). Done when: no redirect exposes anything the old route hid.
- `positioning`: update any copy that names the old pages. Done when: M1.4 sweep is clear.
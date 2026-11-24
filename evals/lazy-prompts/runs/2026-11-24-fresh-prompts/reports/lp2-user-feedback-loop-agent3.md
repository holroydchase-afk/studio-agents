Hi Chase, I'm your chief of staff for the feedback-loop ask.

**Answer: yes, but pilot it on Hearth only, and stop the agents at a draft PR.** Users tap "Send feedback" in the app. A weekday scheduled Claude session triages the new rows into findings and opens a draft PR with a failing test for anything P0 or P1. It never merges, deploys or touches main. That fits your live-change gate and the no-paid-API rule, because it runs inside a Claude session and not on a metered route.

**Goal fit:** it serves Hearth's "no help on old phones" goal and your hour-a-night limit. It also gives the portfolio a real "agents act on user feedback" story, as long as the claim matches the run logs.

**Buy, reuse, build or skip:** reuse Hearth's existing error-report backend and the studio-agents triage lane (the PM-R findings format). Build only the in-app button and the scheduled triage routine. I'm skipping a hosted feedback vendor, because it adds a new privacy surface and Hearth says no analytics.

**Why not everywhere:** the public demos (Energy Scanner, Charlie, Crew Clock, PM tools) forbid network calls and data collection. Role Radar has one user, you, and ccwatts allows no network at all. A plain "report on GitHub" link in those demos is the most I'd add, later.

**Critical path (about 4.5 sessions):**
1. M1.1: you answer the one decision below.
2. M1.2: qa-tdd writes failing tests, including redaction of keys, URLs and captions from the feedback text.
3. M1.3: build the button, sized for Easy view.
4. M1.4: build the triage routine, with a cap of 20 rows per run and one bad row skipped, not fatal.
5. M1.5: a first real run against the live table with real beta feedback.
6. M1.6: you mark wrong hits with a reason, and a digest line is added.

**Biggest risks:**
- Free text could leak family details into a finding, and the repo is public. Redaction is tested first (FB-1), and feedback stays in the database, never in the repo.
- The loop could invent P0s and lose your trust. That's why you can mark a hit wrong with a reason (FB-6).

**What I did not check:** I couldn't open your repos. I haven't read Hearth's HANDOFF.md, TRACKER or migration 0006, so I don't know whether the existing error-report table takes free text. I also haven't confirmed that a scheduled session can safely hold a read credential for the table; the architect should confirm that. The phone-side steps are untested, and nothing has been run.

**Decision for you (one word):** pilot on Hearth with the in-app button writing to the existing backend, not public GitHub issues? I recommend yes. It has real users now, and it's the only private store you have.

I picked a weekday schedule over instant triage, since a draft PR a day fits your time. Say so if you want it faster.

**Hand-offs:**
- qa-tdd: failing tests for FB-1 to FB-8 on fixture rows.
- engineer: build M1.3 and M1.4 once the tests are red.
- privacy-security: review before any real row.
- grandparent-ux: the button wording.
- architect: the table and credential fit.

```spec
verdict: needs-decision
bet: Hearth's grandparent testers can say what is wrong inside the app in one tap, and the agents turn it into a triaged finding with a failing test within a day; it worked when Chase reads one weekly digest and fixes nothing by hand that the loop could have caught
step: M1.1 | Pick the pilot and the channel (Hearth only, in-app Send feedback button into the existing backend, not a public issue) | Chase answers the one decision below | 0.5 session
step: M1.2 | Spec and failing tests: feedback row shape (category, text, app version, no keys, no URLs, no captions), the redaction rule, the PM-R finding format | qa-tdd red for the right reason | 1 session
step: M1.3 | Build the button and the table write, with Easy-view sizes (17pt text, 48pt target) | FB-1 and FB-2 green 3x | 1 session
step: M1.4 | Build the triage routine: a weekday scheduled session reads new rows, drops anything with personal detail, writes PM-R lines and opens a draft PR with a failing test for P0 and P1 | FB-3 to FB-5 green 3x on fixture rows | 1 session
step: M1.5 | First real run on a phone against the live table with real beta feedback, since fixtures are the only thing tested before | one real row becomes a finding; one bad row does not stop the run | 0.5 session
step: M1.6 | Chase marks hits wrong with a reason; digest line added to the morning digest | FB-6 green; first weekly digest sent | 0.5 session
criterion: FB-1 | auto | Given a feedback submit with text containing a signed media URL and a caption, then the stored row has the text with both removed and a flag "redacted: 2"
criterion: FB-2 | auto | Given the phone is offline when Send is tapped, then the note is queued and sent on reconnect exactly once, and tapping Send twice stores 1 row
criterion: FB-3 | auto | Given 3 fixture rows (a crash note, a "text too small" note, a thank-you), then the triage output has 2 findings with IDs PM-R1 and PM-R2, severities P0 and P1, and the thank-you is logged as positive with no finding
criterion: FB-4 | auto | Given 1 malformed row among 5, then the other 4 are triaged and the bad one is listed as skipped with its row number
criterion: FB-5 | auto | Given a P1 finding, then the routine opens a draft PR containing a failing test, and never marks it ready, merges it or touches main
criterion: FB-6 | auto | Given a finding Chase marks wrong with the reason "duplicate", then the next run does not recreate it and the digest shows 1 wrong out of 4 hits (25%)
criterion: FB-7 | manual | Open the button on an old phone with Easy view on -> the label reads "Send feedback" at 17pt or larger with a 48pt target
criterion: FB-9 | auto | Given an empty queue (none, 0 new rows), then the run writes no finding and no PR and the digest reads "0 new feedback"
criterion: FB-10 | manual | Open the feedback form on a 360px by 640px phone -> it fits in 1 screen with no scrolling
criterion: FB-11 | manual | Given the button misbehaves after release, then rollback is to turn the feature flag off or revert the merge commit and redeploy, and the route is named in the PR -> 1 step for Chase
criterion: FB-8 | auto | Given 100 rows over the cap of 20 per run, then 20 are triaged and 80 stay queued, so one run never costs more than its plan allows
cut: Feedback in the public demos (Energy Scanner, Charlie, Crew Clock, PM tools) | their hard rules forbid network calls or collection; add a plain "report on GitHub" link later at most
cut: Autonomous merge or deploy | every live change waits for Chase's go; the loop stops at a draft PR
cut: A metered-API triage service | no paid API route; it runs as a scheduled Claude session
cut: Role Radar and ccwatts | one user (Chase) or no network allowed; nothing to collect
cut: A hosted feedback vendor | new vendor, new privacy surface, and Hearth says no analytics
risk: Free-text feedback leaks family details or keys into a finding or a public repo | FB-1
risk: A bad row or a flood stops or overspends the run | FB-4
risk: The loop invents P0s, so Chase stops trusting it | FB-6
risk: Autonomy ships something live unreviewed | FB-5
decision: Pilot on Hearth only, with the in-app button writing to the existing backend, not public issues | yes; it has real users now and the only private store
decision: Triage runs on a weekday schedule, not instantly | yes; a draft PR a day fits an hour a night
handoff: qa-tdd | failing tests for FB-1 to FB-8 using fixture rows | red for the right reason
handoff: engineer | build M1.3 and M1.4 after red | FB-1 to FB-6 green 3x
handoff: privacy-security | review the redaction rule and where feedback text is stored before any real row | no P0 or P1 open
handoff: grandparent-ux | the button label and the thank-you message | FB-7 passes on a phone
handoff: architect | confirm the table and the scheduled-session credential fit Hearth's schema and key rules | one-line yes or named change
```
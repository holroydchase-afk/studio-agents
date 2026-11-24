Hi Chase, I'm your studio chief of staff, here for the feedback loop.

**Answer:** Build it on Hearth only first. Autonomy stops at triage, a failing test and a draft PR. I wouldn't let any product act on feedback beyond that, and I'd keep it out of ccwatts and the static demos. I read your ask as "products collect user feedback in-app and agents act on it". If you meant something else by "them", tell me.

**Goal fit:** It serves Hearth's beta, which has 12 grandparents and is your only product with real users. It also gives the portfolio a working user-feedback story.

**Buy, reuse, build, skip:**
- **Reuse:** Hearth already has an error-report path (migration 0006, per its CLAUDE.md) and a Hearth Test Log.
- **Build (small):** a Send feedback button and a nightly triage session.
- **Skip:** a paid feedback vendor (no paid API route, and Hearth's privacy line says no trackers) and any metered-API triage.

**Why the ceiling is where it is:**
- Your hard rules say live changes wait for your go.
- Hearth also bans media, captions and keys in logs.
- ccwatts and Crew Clock ban telemetry and network calls.
- Public repos can't hold family details.

So the loop only does the following:
1. It reads opt-in typed text.
2. It sorts it into a lane and a priority.
3. It has qa-tdd write a failing test.
4. It has engineer open a draft PR.

It never merges or deploys.

**Next step:** the nightly triage session needs your OK on the two decisions below, so I'm holding qa-tdd's red tests until you reply. Once you say yes, qa-tdd writes the tests for FB-1 to FB-8 in your next Hearth session.

**Critical path** (about 4.5 sessions):
- **M1.1:** Send feedback button with one text box, usable by a grandparent in under 20 seconds.
- **M1.2:** feedback table with no media or captions, a 90-day retention limit and a privacy-security sign-off.
- **M1.3:** nightly triage that dedupes, assigns P0 to P2 and writes one summary.
- **M1.4:** for P0 and P1 bugs, a failing test and a draft PR, with no merge.
- **M1.5:** you mark a triage wrong with a reason, and the reason goes into agent memory. This is the feedback loop on the loop itself, so a bad triage doesn't go unnoticed.
- **M1.6:** a first run on the real hosted project with 3 real messages, because fixtures won't show misspellings or empty messages.

**Not doing:**
- Feedback in ccwatts, because it would break its no-network rule.
- Feedback in the Energy Scanner and Crew Clock demos, because they have no users yet.
- Autonomous merge or deploy, because the live-change rule forbids it.
- Ratings, NPS and surveys, because no goal needs them.

**Biggest risk:** free text carrying names or photos into a public repo. FB-3 handles it by dropping media, caption and URL fields on save.

**What I did not check:** I can't open your repos. I did not read Hearth's HANDOFF.md or its TRACKER, so I don't know if feedback work is already in flight. I did not look at migration 0006, so "reuse the error-report path" is an assumption from CLAUDE.md. I did not check the current PR queue or whether a feedback table already exists. The memory search for earlier findings returned no matches. Everything runs on the spec files in this folder only.

**Decisions for you (a one-word reply is enough):**
1. Pilot on Hearth only, then copy it to Role Radar and the PM tools if it works. Recommend yes.
2. Autonomy ceiling is triage plus failing test plus draft PR, with your go required to merge. Recommend yes.

**Handoffs:**
- **qa-tdd:** red tests for FB-1 to FB-8.
- **privacy-security:** review the table and retention, with no P0 or P1 before M1.2 merges.
- **engineer:** build M1.1 to M1.5.
- **ux-reviewer (grandparent-ux):** check the button and thank-you words against FB-9.

Files, both in /tmp/claude-0/-home-user/3fb24a12-b686-57cb-a079-1ae3d4a32894/scratchpad/lp/lp2-user-feedback-loop-agent1:
- docs/SPEC-FEEDBACK.md (passes check-spec and spec-lint)
- docs/runs/2026-11-24-staff-pm.md (the run log; it passes the run-log checker and cost guard, with tokens and cost recorded as 0 because the harness showed none)

```spec
verdict: needs-decision
bet: Hearth's 12 grandparents can send feedback in one tap from inside the app; it worked when Chase gets a triaged, deduplicated list without reading raw messages and at least one report becomes a failing test and a draft PR with no prompt from him
step: M1.1 | Pilot scope on Hearth only: reuse its existing error-report path, add a Send feedback button with one free-text box and a reason chip | a grandparent sends feedback in under 20 seconds with no help | 1 session
step: M1.2 | Feedback table with consent flag, no media, no captions, 90 day retention | privacy-security signs off and FB-3 and FB-4 green | 1 session
step: M1.3 | Nightly triage session reads new rows, dedupes, assigns P0 to P2 and a lane, writes one summary | summary lists every new row once with a lane | 1 session
step: M1.4 | Autonomy ceiling: for P0 and P1 bugs the session has qa-tdd write a failing test and engineer open a draft PR; it never merges or deploys | draft PR exists with Agents line and red-then-green log | 1 session
step: M1.5 | Wrong-triage loop: Chase marks a triage wrong with a reason; the reason feeds agent memory | FB-6 green | 0.5 session
step: M1.6 | Run on the real hosted project from a machine that can reach it, with 3 real grandparent messages | triage handles misspellings, voice-dictated text and one empty message without failing the run | 0.5 session
criterion: FB-1 | auto | Given the feedback form with an empty box, when Send is pressed, then no row is written and the box shows "Add a few words first"
criterion: FB-2 | auto | Given a row with text "the picture of Pawpaw wont open", when triage runs on a pinned clock of 2026-12-01 00:00, then the row gets exactly one lane and one priority and is listed once in the summary
criterion: FB-3 | auto | Given a feedback payload that includes a photo, a caption or a URL field, when it is saved, then those fields are dropped and the stored row has 0 media keys
criterion: FB-4 | auto | Given a row dated 91 days before the pinned clock, when the retention job runs, then the row is deleted and a row at 89 days is kept
criterion: FB-5 | auto | Given 3 near-duplicate rows plus 1 different row, when triage runs, then the summary shows 2 items and the first has a count of 3
criterion: FB-6 | auto | Given a triage marked wrong with the reason "was a login problem not a photo bug", when triage runs again on the same text, then the lane is login and the reason is stored in agent memory
criterion: FB-7 | auto | Given one row whose text breaks the parser, when triage runs over 5 rows, then 4 are triaged, 1 is flagged unreadable and the run exits 0
criterion: FB-8 | auto | Given any triage run, when it finishes, then the count of merges, deploys and pushes to main made by it is 0
criterion: FB-10 | auto | Given a signed-out visitor, when they post to the feedback table, then the write is refused with 0 rows added
criterion: FB-11 | auto | Given another account (a non-owner) signed in, when it reads feedback rows written by a different user, then 0 rows come back and only Chase's role reads all rows
criterion: FB-12 | manual | Open the feedback screen at 360px by 640px -> the box, Send button and thank-you fit in 1 screen with no scrolling
criterion: FB-9 | manual | A grandparent on an old phone opens the app, taps Send feedback and sends a message -> text is 17pt or larger, the button is 48pt or larger and a plain "Thanks, Chase will read this" appears
cut: Rollback by redeploy | rollback is a revert of the merge commit plus turning the Send feedback button off with a flag, so no data is lost
cut: Feedback in ccwatts | its hard rules ban network calls and telemetry, so an in-product loop would break its privacy story; use GitHub issues only
cut: Feedback in Energy Scanner and Crew Clock demos | the demos are static or consent-bound and have no users to hear from yet; Crew Clock bans analytics
cut: Autonomous merge or deploy | the hard rules make every live change wait for Chase's go
cut: Metered API triage | no paid API route; triage runs as a scheduled Claude session
cut: Star ratings, NPS, in-app surveys | no goal needs them and they add questions for grandparents
risk: Free text may carry names, photos or private family details into a public repo | FB-3
risk: Triage is wrong and Chase never finds out | FB-6
risk: One bad message kills the nightly run | FB-7
risk: The loop quietly ships something live | FB-8
decision: Pilot on Hearth only, then copy to Role Radar and PM tools if it works | Yes, Hearth is the only product with real users and already has an error-report path
decision: Autonomy ceiling is triage plus failing test plus draft PR, human go to merge | Yes, anything higher breaks the live-change rule
handoff: qa-tdd | failing tests for FB-1 to FB-8 | red for the right reason
handoff: privacy-security | review the feedback table, retention and what text may be stored | no P0 or P1 before M1.2 merges
handoff: engineer | build M1.1 to M1.5 | FB-1 to FB-8 green 3x
handoff: ux-reviewer | grandparent-ux check of the button and thank-you words | FB-9 passes
```
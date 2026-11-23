# Plan: Milestone "Ready for the real crew" (Crew Clock)

Planned by the staff-pm lane. This is a plan only; no code or repo files were changed except this report.

## Answer first
The real-crew milestone is PLAN.md M1.2 to M1.5 plus M2.1 and M2.2, in that order. It is about 8 to 10 evenings at an hour each. The first four are pure build, with no accounts from Chase. The last two need about 35 minutes of Chase's time. Install day (M2.5) stays gated on all of it.

## Problems found in the repo copy (decide before building)
1. **docs/PRIVACY.md does not exist**, and neither does docs/reviews/. CLAUDE.md, HANDOFF.md and PLAN.md all call PRIVACY.md "the privacy contract" and say M1.2 (consent wording) and M1.4 (retention periods) come from it. Only docs/SETUP.md is in docs/. There are no retention periods or consent text to implement.
   **Step 0 is to have the privacy-security agent write it.** It states what is collected, the consent text and version, and the retention periods, and Chase approves it in one sitting.
2. **The code has none of the consent or retention work.** There are 3 migrations (init, schedules, auth_hook). Nothing mentions consent or purge. Chat purge also has nothing yet.
3. **Location is read outside the punch flow.** `js/app.js:891` calls `getCurrentPosition` on an onboarding screen just to trigger the permission prompt. This breaks the hard rule "location only inside the clock-in/out flow". It is M1.3's target. `js/app.js:175` is the opt-in nearest-job sort inside the punch flow, which the plan allows. `js/geo.js:73` (a watch) still needs checking that it ends with the punch screen.
4. **SETUP step 8 sends crew to the demo site** (`holroydchase-afk.github.io/crew-clock/?org=...`). That contradicts the two-build rule: Pages is demo-only and must never reach the backend. It must become the crew-app address after M2.2. The org code in that URL (`TEAYS`, also in tests and seeds) may be a real company code; confirm it is made up, or replace it (CLAUDE.md hard rule).
5. **Docs are stale.** HANDOFF.md says "Updated 2026-10-23" and today is 2026-11-22. M1.1 (demo separation) was listed as the exact next step and is not marked done. I could not verify its status, because the git log only has `init`. Check open PRs and branches first (CLAUDE.md: resume, never redo).
6. The sample names (Ray T. and others) must be confirmed as not real (SEP-6, manual, Chase).

## Scope: what "ready for the real crew" means
Done when 5 workers can install the crew app on their own address, each one's consent is recorded before any location is read, old data purges on schedule, and a clock-in never blocks. This is PLAN.md M2's definition of done.

In: consent, location-at-tap only, retention, hardening, a live Supabase project, a separate crew host.
Out (already in PLAN "Not now"): all 10 crew, pay reports, background location, App Store build, real-phone AI model testing, own MLS build.

## Sequence (one branch and PR per task; each needs a failing test first)

| # | Task | Who | Est. | Done when |
|---|---|---|---|---|
| 0 | Write docs/PRIVACY.md and the consent text (version 1); resolve the decisions below | privacy-security, then Chase | 1 evening | Chase approves in a single reply |
| 1 | M1.1 demo separation, only if not already merged | qa-tdd, engineer | 1 | SEP-1..6 pass |
| 2 | M1.2 consent record (`location_consents` table, RLS, offline queue, withdrawal, version re-ask, foreman clock-in blocked without consent) | qa-tdd, engineer, ux-reviewer | 2 | CON-1..7 pass in demo and against local Postgres |
| 3 | M1.3 location read only at the tap (remove the onboarding prompt at app.js:891) | qa-tdd, engineer | 1 | Test shows no GPS read outside the punch flow |
| 4 | M1.4 retention as a SQL function plus a removed-worker delete or anonymize path; a "Reset sample data" in the demo | architect (schema), qa-tdd, engineer | 2 | Periods in PRIVACY.md are tested in SQL |
| 5 | M1.5 hardening: qa-tdd and ux-reviewer on existing features, with special attention to "never block a clock-in" under bad GPS and no signal | qa-tdd, ux-reviewer | 1 to 2 | No P0/P1 open, all suites green 3x |
| 6 | M2.1 Supabase live (SETUP 1.1 to 1.4) | Chase 25 min, then Claude | 1 | e2e-supabase passes |
| 7 | M2.2 crew host on Cloudflare Pages; fix SETUP step 8 URL | Chase 10 min, then Claude | 1 | Crew URL serves `backend: 'supabase'`; demo URL still demo |
| 8 | Dry run: Chase and his dad on 2 phones, privacy-security final check, release-captain gate | all | 1 | Go from Chase |

Steps 2 to 5 depend on step 0 for wording and periods. Steps 6 and 7 can run in parallel with 2 to 5 if Chase has the time, since they need only him, not code. M2.3 (Backblaze, alerts, Sheets, about 40 min) is not needed for a first clock-in. Decide whether the photo fallback needs B2 before install day. If it does, pull M2.3 forward.

## Chase's asks, kept to one step each (about 35 minutes total, plus 2 answers)
- Approve PRIVACY.md and the consent text (one reply to a draft).
- Create the Supabase project and paste the URL and anon key (about 25 min, SETUP 1).
- Create the Cloudflare Pages project and pick the hostname (about 10 min).
- Answer the two decisions already open: MLS (keep ts-mls, recommended) and weekly report (hours only, recommended).
- Confirm the sample names are not real people, and that the org code in SETUP is fine to be public.
- Pick install day with his dad (M2.5, after the steps above).

## Risks
- Free-tier Supabase pauses after a week unused. Keep it active before install day, or accept the dry-run gap.
- Retention periods are a product and legal call. Do not invent them; step 0 proposes, Chase decides.
- iPhone has no background sync. The app already tells crew to open it, and install-day training must say so.
- GPS spoofing is a known limit and is not in scope.
- Weak-signal consent: consent must work offline and sync later (CON-3). Do not let a worker clock in while the consent record is unsynced if that would block them. Product call: record locally and sync, never block the punch.

## Agent order for each task
staff-pm spec, qa-tdd red, engineer, qa-tdd green 3x, then ux-reviewer and privacy-security on anything crew-facing or touching location, consent or retention. Each PR needs the `Agents:` line and a HANDOFF.md update. No merge to `main` without Chase's go for anything that changes the demo or deploys.

## Files
Reviewed: CLAUDE.md, HANDOFF.md, PLAN.md, docs/SETUP.md, js/app.js (geolocation calls), supabase/migrations/. Missing: docs/PRIVACY.md, docs/reviews/.

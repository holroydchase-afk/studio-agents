**Answer:** The crew can't use the app until consent (M1.2), location-only-at-the-tap (M1.3) and retention (M1.4) ship, plus about 75 minutes of Chase's setup. Do those first. Recruiter polish (M1.5 to M1.8) doesn't gate the crew, so it moves behind the beta start.

**Found in the repo**
- `docs/PRIVACY.md` and the linked privacy review don't exist, but PLAN's consent wording (CON-7) and retention periods (M1.4) depend on them. New first step M1.0 (P0).
- `docs/SETUP.md` steps 2, 3 and 8 use the demo's github.io address for CORS, `APP_ORIGIN` and the install link, against CLAUDE.md (P1).
- `js/app.js` reads location at lines 174 and 890 (the "OK, ask me" prime), outside the punch flow (P1).
- No retention code exists. M0.1 is still unmerged and everything stacks on it.

**Critical path**
1. M1.0 PRIVACY.md and the review, fix SETUP: 1 session
2. M1.2 consent: 2 sessions
3. M1.3 location only at the tap: 1 session
4. M1.4 retention function and Reset sample data: 1 session
5. M2.1 to M2.3 Chase's setup, in parallel: 3 sessions
6. M2.4 live retention, M2.5 install day, M2.6 gate after 2 weeks

**Not doing:** M1.5 to M1.8, SEP-2 to SEP-4, all 10 crew, App Store, pay-rate reports.
**Biggest risk:** unreviewed consent and retention text, and a purge deleting time records the boss may need to keep (PRIV-1, RET-3).

**Decisions for Chase:** retention defaults (3 years hours, 90 days GPS and photos, 30 days chat; ask his accountant about the 3 years), install-day date, merge M0.1 first.

Files: docs/SPEC-CREW-READY.md, docs/runs/2026-11-22-staff-pm.md (both pass check-spec, spec-lint, check-agent-run, agent-guard).

```spec
verdict: needs-decision
bet: The boss and 5 crew clock in and out for 2 weeks with every worker's location consent on record; it worked when 5 consent records exist, retention has run once, and punch success is at least 95 percent
step: M1.0 | Write docs/PRIVACY.md and the missing review, fix SETUP origins | PRIVACY.md has a number per retention period and SETUP never names the demo address for the crew | 1 session
step: M1.2 | Location consent in app and database | CON-1 to CON-6 green, CON-7 passed by ux-reviewer | 2 sessions
step: M1.3 | Location read only at the punch tap | LOC-1 and SEP-5 green | 1 session
step: M1.4 | Retention function and Reset sample data | RET-1 to RET-4 green on local Postgres | 1 session
step: M2.1 | Chase makes the Supabase project, then crew app host and services | e2e-supabase passes against it | 3 sessions
step: M2.5 | Install day, 5 phones | 5 consent records and one clock-in and clock-out each | 1 session
criterion: CON-1 | auto | Given a pinned clock of 2026-12-01 and a worker with no consent record, when they sign in, then the consent screen shows before Home with "I agree" and "Not now"
criterion: CON-2 | auto | Given no consent, when a foreman clocks that worker in, then 0 location reads happen and the app says consent is needed
criterion: CON-4 | auto | Given an empty location_consents table under RLS, when a worker updates or deletes a record, then 0 rows change and a withdrawal adds 1 new row
criterion: CON-6 | auto | Given a worker who agreed to text version 1, when the version becomes 2, then the consent screen shows again
criterion: LOC-1 | auto | Given every screen except punch, when each renders with a spy on geolocation, then the spy is called 0 times, including the former onboarding prime
criterion: SEP-5 | auto | Given a build with backend supabase, when it renders, then the sample-data label and demo PIN hints appear 0 times
criterion: RET-1 | auto | Given a pinned clock of 2026-12-01 and a GPS point dated 2026-08-31 with a 90 day period, when the purge runs, then the coordinates are null and the fence verdict and hours remain
criterion: RET-2 | auto | Given a pinned clock of 2026-12-01 and a punch exactly 90 days old and one 91 days old, when the purge runs, then only the 91 day one loses coordinates
criterion: RET-3 | auto | Given a removed worker with 3 punches and 2 photo keys, when the purge runs, then the photo keys and coordinates are gone and the 3 punch times remain
criterion: RET-4 | auto | Given the purge runs twice in a row, when the second run ends, then 0 rows change and no error occurs
criterion: PRIV-1 | manual | Given docs/PRIVACY.md, when Chase reads the retention table on his phone, then all 5 data types show a number of days or years and a reason
criterion: CON-8 | auto | Given worker A (a non-owner, another account) signed in, when A reads location_consents, then 0 rows of worker B appear
criterion: CON-9 | auto | Given a signed-out visitor, when they read or insert into location_consents, then 0 rows return and the insert fails
criterion: CON-10 | manual | Given a 360x640 phone, when the consent screen opens, then it fits in 1 screen with no scrolling
criterion: RET-5 | auto | Given no punches, photos or chat rows, when the purge runs, then it returns 0 rows changed with no error
criterion: GATE-1 | manual | Given 2 weeks of beta punches, when staff-pm counts them, then at least 95 of 100 punches succeeded and 5 of 5 workers have consent records
cut: Recruiter polish M1.5 to M1.8 | does not gate the crew; resume after M2.5
cut: SEP-2 to SEP-4 | demo-only; keep SEP-5 for the crew build
cut: Pay-rate reports | payroll data raises the privacy bar
risk: Consent and retention text unreviewed by a human who knows the law | PRIV-1
risk: Purge deletes time records the boss must keep | RET-3
decision: Retention periods (3 years hours, 90 days GPS and photos, 30 days chat) | Accept these defaults and ask his accountant about the 3 years
decision: Install day date | Pick a weekend morning after M1.4 merges
decision: Merge M0.1 first so later branches stack | Yes, merge it on green with his go
handoff: privacy-security | Write docs/PRIVACY.md and the missing review; fix SETUP origins | Retention table has numbers and SETUP never names the demo address for the crew
handoff: qa-tdd | Failing tests for CON-1 CON-2 CON-4 CON-6 LOC-1 SEP-5 RET-1 to RET-4 | Red for the right reason
handoff: engineer | Build M1.2 to M1.4 once red | All listed criteria green 3x
handoff: ux-reviewer | Review the consent screen on a 390x844 phone | No P0 or P1 and CON-7 passed
```

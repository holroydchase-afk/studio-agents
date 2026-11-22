# Crew Clock: milestone "ready for the real crew" (staff-pm)

## Answer
Not ready, and it is a no-go for real workers until consent and retention exist. Two P0s: the app reads GPS with no consent record (HANDOFF), and `punches` keeps lat, lng, accuracy and address forever (init migration). The milestone is those two fixes plus the foreman case, then a dry run. Roughly 6 sessions at an hour a night.

Repo caveat: it has only HANDOFF.md, one migration and tools. No CLAUDE.md, PLAN.md, PRIVACY.md or app code. I used the studio hard rules from the session context: consent records are never edited or deleted, withdrawal adds a record, retention lives in docs/PRIVACY.md and every new personal field needs a rule and a test, never block a clock-in, location only inside the punch flow. PRIVACY.md and PLAN.md are missing, so the retention period is a decision for Chase.

## Critical path
1. M1.1 Decide consent text and retention (Chase, 10 min). Done when the one-line text, its version and the retention days are written in docs/PRIVACY.md. 0.5 session.
2. M1.2 Consent table: append-only, with text version, time, device, worker. Done when CON-1 to CON-3 are green. 1 session.
3. M1.3 Gate: no location read and no punch row without a current consent, including foreman clock-ins. Never refuse the punch itself: a worker without consent gets a no-location punch flagged for follow-up. Done when CON-4 to CON-6 are green. 1 session.
4. M1.4 Retention job: coordinates, address and photo key are cleared after N days, the hours record stays. Done when RET-1 to RET-3 are green, the photo object is deleted too, and the job is a Supabase scheduled function that has not been deployed. 1 session.
5. M1.5 Consent screen and withdrawal in plain words, on a cheap phone. Done when CON-7 is checked by hand. 1 session.
6. M1.6 Privacy review and dry run with the boss and one worker (no real data in the repo). Done when privacy-security has no P0/P1, and merged, deployed and checked on a real phone are recorded as three separate states in HANDOFF. 1.5 sessions.

## Not doing
- Chat, reports, exports and map polish: not needed to prove the bet.
- New punch features: deep, not wide.
- Extra legal text: one line only.

## Biggest risk (P0)
Retention that silently misses the photo in storage, or a consent gate that blocks a punch with no signal. Handled by RET-2 and CON-5.

## Decisions for Chase
- Retention period: recommend 90 days for coordinates, address and photo, with hours kept.
- Foreman clock-in for a worker with no consent: recommend the punch is recorded without location and flagged, never refused.
- Consent re-ask when the text changes: recommend yes, by version.

## Handoffs
- qa-tdd writes the failing tests for CON-1 to CON-7 and RET-1 to RET-3.
- engineer builds M1.2 to M1.5 after red.
- privacy-security reviews before the dry run.
- ux-reviewer reviews the consent screen words.

Tool notes: kill guard ok. agent-memory failed: tools/check-ux-run.mjs is missing from the repo, so it did not run. check-spec and spec-lint results are below.

lint-ok: SL-5 no safety or accuracy rate is claimed; the bet is trust, measured by CON and RET criteria
lint-ok: SL-6 SEC-1 covers a signed-out visitor and a worker from another crew
lint-ok: SL-9 the privacy risk is already ranked P0 in the Biggest risk section and the risk line
lint-ok: SL-2 RET-4 covers the empty retention run

```spec
verdict: needs-decision
bet: The boss and his crew trust clock-in on their phones; it worked when every worker has a consent record and a week of real punches shows hours with no refused clock-in
step: M1.1 | Chase decides consent text and retention days | both written in docs/PRIVACY.md | 0.5 session
step: M1.2 | Append-only consent table | CON-1 to CON-3 green | 1 session
step: M1.3 | Consent gate on location and punches including foreman clock-in | CON-4 to CON-6 green | 1 session
step: M1.4 | Retention job clears coordinates, address and photo | RET-1 to RET-3 green | 1 session
step: M1.5 | Consent screen and withdrawal on a cheap phone | CON-7 checked by hand | 1 session
step: M1.6 | Privacy review and dry run with boss and one worker | no P0 or P1 and merged, deployed, checked recorded separately | 1.5 session
criterion: CON-1 | auto | Given a worker accepts text version 1 at a pinned clock of 2026-11-23 08:00 on device A, then one consent row exists with version 1, that time and device A
criterion: CON-2 | auto | Given an existing consent row, when an update or delete is attempted, then 0 rows change and the call is rejected
criterion: CON-3 | auto | Given a consented worker who withdraws, then 2 rows exist for the worker and the latest is a withdrawal
criterion: CON-4 | auto | Given a worker with no consent row, when a punch starts, then 0 location reads happen
criterion: CON-5 | auto | Given a worker with no consent and no signal, when they tap clock in, then 1 punch row is saved with flag "no-location" and 0 refusals
criterion: CON-6 | auto | Given a foreman clocks in a teammate who has no consent, then the punch has null lat and lng and a flag, and 0 location reads happen for that teammate
criterion: CON-7 | manual | Open the consent screen on a cheap phone with weak signal -> the one-line text shows and the 2 buttons "Accept" and "Withdraw" each measure 48pt
criterion: RET-1 | auto | Given a punch dated 2026-08-01 and a pinned clock of 2026-11-23 with retention 90 days, then lat, lng, accuracy and address are null and the clock-in time is kept
criterion: RET-2 | auto | Given a punch with a photo key past retention, then 0 stored photos remain for that key and the key is null
criterion: RET-3 | auto | Given the job runs twice on the same day, then the second run changes 0 rows and one bad row does not stop the others
criterion: SEC-1 | auto | Given a signed-out visitor or a worker from another crew, when they read consent or punch rows, then 0 rows are returned
criterion: RET-4 | auto | Given a retention run with 0 punches past the limit, then 0 rows change and the run exits with no error
criterion: CON-8 | manual | Open the consent screen at 360px by 640px -> it fits in at most 1 screen tall with no scrolling
cut: Chat and exports | not needed to prove the bet
cut: New punch features | deep, not wide; nothing outside consent and retention before the crew starts
risk: P0 retention misses the stored photo or a consent gate refuses a no-signal punch | RET-2
decision: Retention period for coordinates, address and photo | 90 days, hours kept
decision: Foreman clock-in for a worker with no consent | record punch without location and flag it, never refuse
decision: Ask for consent again when the text changes | yes, by version
handoff: qa-tdd | failing tests for CON-1 to CON-6, RET-1 to RET-4 and SEC-1 | red for the right reason
handoff: engineer | build M1.2 to M1.4 | CON and RET tests green 3x
handoff: ux-reviewer | consent screen words for CON-7 | no P0 or P1
handoff: privacy-security | review before the dry run | no P0 or P1
```

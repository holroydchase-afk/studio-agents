Hi Chase, I'm Crew Clock's chief of staff. Here is the milestone plan. Planning only: nothing built, deployed or merged.

# Milestone M-Crew: ready for the real crew

## What the repo shows
The repo holds only HANDOFF.md and one migration file, and that file is a one-line note, not SQL. There is no PLAN.md, PRIVACY.md, app code or tests here. What it does say:
1. Consent is planned (one line per worker) but nothing records it.
2. A foreman clocks in teammates, and GPS is read when a punch starts.
3. The punches table stores lat, lng, accuracy, address and photo key, with no expiry or cleanup.

Those are the two gaps that block the real crew: location is collected with no consent, and it is kept forever.

## Goal
A worker can be clocked in only after a recorded consent. Location data expires on a stated schedule. Nobody is ever blocked from clocking in.

## Tasks (one PR each, about one night apiece)
Each follows the studio order: staff-pm spec, qa-tdd failing test, engineer, qa-tdd green 3x, privacy-security.

1. **CRW-1 Retention decision (Chase, 5 min).** Pick the retention periods. My default is exact coordinates and address kept 90 days, then nulled, with the punch time and hours kept. Photos deleted at 30 days. Written into docs/PRIVACY.md.
2. **CRW-2 Consent table.** Append-only table with worker, text version, time and device. Row-level security allows insert and select only, with no update or delete. Withdrawal adds a row. Test first.
3. **CRW-3 Consent screen.** Plain one-line consent, shown on first use, written for a low-tech crew on weak signal. It works offline and queues the record. ux-reviewer checks the wording.
4. **CRW-4 Consent gate on location.** No GPS read without a current consent record, including when a foreman clocks someone in (the foreman path needs the worker's own consent first). The gate must not block clock-in: with no consent or no fix, the punch is saved with a flag or photo fallback and no coordinates.
5. **CRW-5 Retention job.** Scheduled cleanup on punches per CRW-1, plus deleting the B2 photos. Test with fake dates. Add the new fields to the retention rules in PRIVACY.md.
6. **CRW-6 Privacy review and dry run.** privacy-security audit of the consent, location and retention paths. Run through it once with the boss on the demo build, using made-up crew data.

## Order and time
CRW-1, 2, 4, 3, 5, 6. Roughly 6 to 8 hours, or one to two weeks at an hour a night. Nothing here touches the live Supabase, so no deploys.

## Decisions for Chase
- **CRW-1 periods:** 90 days for location and 30 days for photos. A one-word yes works.
- **What happens to existing punches** that have no consent. My recommendation: null their location on the first cleanup run. Needs your yes before it is built.

## Risks and blockers
- The migration file is a placeholder, so the real schema is not in this repo. I have not seen the app code, so task sizes are estimates. The first step is to confirm the schema.
- Any real crew rollout, deploy or live database change waits for your go.

## Not in scope
New features, a background location watch, and analytics.

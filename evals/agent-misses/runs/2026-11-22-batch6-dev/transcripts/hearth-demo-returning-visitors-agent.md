Files: spec docs/runs/2026-11-22-spec.md, run log docs/runs/2026-11-22-staff-pm.md. check-spec 0, spec-lint 0 (one waiver, SL-6), check-agent-run 0, cost guard 0.

Answer: needs-decision. Swapping the seed is small, but the owner's own photos in a public repo is a P0 privacy call, and returning visitors will not see the new family unless saved data is versioned.

Not read: the repo has no CLAUDE.md, no demo code and no seed file, so DEMO-9 and the saved-data version key assume names from HANDOFF.md (seedDemo, Start over). The Hearth rules (public repo, no real family names, strip EXIF/GPS) came from the caller's context, not this repo.

Tool notes: agent-guard kill staff-pm ok (exit 0). agent-memory failed to run (tools/check-ux-run.mjs missing in this repo), so no past findings were checked.

Findings:
PM-R1 | P0 | photos | owner's own photos in a public demo may show real people, children or places, and git keeps them forever | decide before any push; scan and review first
PM-R2 | P1 | seedDemo | it keeps saved state, so returning visitors never see the new family | version the saved demo (DEMO-6)
PM-R3 | P2 | docs/eng/TESTING.md, docs/reviews/2026-10-23-harden.md | say the demo opens on "the sample family" and keeps state; stale after the swap | update in the same PR

Rollback: revert the merge commit and let Pages redeploy; a saved-data version bump means visitors then see the old seed again, which is acceptable. A pushed photo stays in git history, so rollback does not unpublish it (PM-R1).
lint-ok: SL-6 the public demo has no sign-in and no accounts; every visitor is signed out and sees the same sample data

```spec
verdict: needs-decision
bet: Recruiters who open the public demo see a new sample family with the owner's photos; it worked when a first-time visitor and a returning visitor both land on that family and no real person is exposed
step: M1.1 | Owner picks the photo set and answers the privacy decisions | decisions answered | 0.25 session
step: M1.2 | Prepare photos: strip GPS and EXIF, resize, add to demo assets, record source in a sources file | DEMO-5 green | 1 session
step: M1.3 | New sample family seed with fictional names and nicknames | DEMO-4 green | 0.5 session
step: M1.4 | Returning visitors: version the saved demo so an old saved family is replaced, keeping their own additions only if the owner says so | DEMO-6 and DEMO-7 green | 1 session
step: M1.5 | Update stale docs and check the live demo after the deploy | DEMO-8 manual pass on a fresh and a returning browser | 0.5 session
criterion: DEMO-4 | auto | Given a browser with empty storage, when the demo opens, then the family list shows 1 family, the new one, and 0 old sample names
criterion: DEMO-5 | auto | Given every image file shipped in the demo, when scanned for EXIF, GPS and XMP tags, then 0 tags are found and no file is wider than 1600 px
criterion: DEMO-6 | auto | Given a browser that saved the old sample family 3 days ago, when the demo opens after this change, then it shows the new sample family and not the old one
criterion: DEMO-7 | auto | Given a visitor added 1 post to the old family, when the demo opens after this change, then the new family shows and Start over still clears to the new seed; the old post is gone only if the owner chose replace
criterion: DEMO-9 | auto | Given a pinned clock of 2026-11-22 12:00 and no saved last visit, when seedDemo runs, then the sample users get a last visit of 2026-11-19 12:00, and a saved last visit of 2026-11-20 12:00 is kept when the saved data is the same version
criterion: DEMO-10 | auto | Given storage blocked so the memory fallback runs, when the demo opens, then the new family shows with 0 broken photos
criterion: DEMO-11 | auto | Given the new family seed, when its text is searched against a list of the owner's real family names the owner supplies out of repo, then 0 matches are found
criterion: DEMO-8 | manual | Open the live demo on a phone in a fresh browser and in one with the old demo saved -> both show 1 new family and 0 broken photos
criterion: DEMO-12 | manual | Open the demo at 360 px by 640 px -> the first photo grid is at most 2 screens tall and each photo loads under 300 KB
cut: Photo upload in the demo | not needed to prove the bet and adds a privacy risk
cut: Migrating a visitor's own posts into the new family | extra work for a demo; replace is simpler unless the owner says otherwise
cut: New demo features or screens | the ask is a content swap only
risk: Real faces, children or place names from the owner's photos are public once pushed and can't be recalled from git history | DEMO-5
risk: A returning visitor keeps the old family because seedDemo keeps what is saved, so the change looks like it did not ship | DEMO-6
risk: Old DEMO-1..3 text and the harden note say the demo opens on the sample family and keeps state, which the new version makes stale | DEMO-8
decision: Which photos, and are any of real identifiable people (children, relatives)? | Use only photos with no identifiable faces, or blur or crop faces; faces of kids stay out of a public repo
decision: Show real family names and places in captions? | No, use nicknames like Gammy and Pawpaw and no place names
decision: Do returning visitors lose their own added posts when the new family replaces the old one? | Yes, replace; it is a demo and Start over already clears it
decision: Does this push deploy the live demo and need your go before merge? | Yes, treat it as a live change and hold the merge for your go
handoff: privacy-security | review the photo set, metadata scan and seed text before anything is pushed | no GPS or EXIF, no identifiable people, no real names
handoff: qa-tdd | failing tests for DEMO-4, DEMO-5, DEMO-6, DEMO-7, DEMO-9, DEMO-10 and DEMO-11 | red for the right reason
handoff: engineer | build M1.2 to M1.4 once the tests are red | DEMO-4 to DEMO-11 green 3x
handoff: ux-reviewer | check the public demo screens and captions as a recruiter would see them | no P0 or P1
handoff: positioning | confirm sample family captions fit the claims in the marketing doc | copy matches the claims
```

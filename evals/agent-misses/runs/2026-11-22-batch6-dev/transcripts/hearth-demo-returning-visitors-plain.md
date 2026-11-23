# Hearth demo: new sample family with the owner's own photos

Status: not built. This checkout has no code and no photos, so there is nothing to change yet. Nothing was edited or committed.

## What is in the repo
Only three notes: HANDOFF.md, docs/eng/TESTING.md and docs/reviews/2026-10-23-harden.md. There is no seedDemo, no app source and no image files.

## What the notes say
- seedDemo writes a "last visit 3 days ago" for the sample users, and keeps it if one is already saved. "Start over" clears it.
- Demo state lives in the browser's local storage, with a memory fallback when storage is blocked.
- Checks DEMO-1..3 cover: opens on the sample family, add, reload, start over.

## Risks to settle before building
1. **Returning visitors keep the old family.** State is saved in local storage and seedDemo keeps what is already saved. Anyone who has visited will keep seeing the old family, with a stale "last visit". The new seed needs a seed version, and a saved version that does not match must reseed. Add a test for it, written as a failing test first. Also keep the "last visit" behavior working with the new family.
2. **Real photos in a public repo.** The rules say the repo is public and must hold no real family names or private family details. Photos of the owner's real family would breach that, and EXIF/GPS must be stripped. Decision for Chase: (a) use his photos but only people who agreed to be public, with names changed to nicknames, EXIF stripped and photos downsized; or (b) keep the real photos out of git and load them another way. Recommendation: (a), with only the photos he picks, and a privacy-security check before it goes public.
3. **Public demo gate.** This change alters the live demo, so the merge waits for Chase's go. Open a PR and do not merge.

## Next steps (about an hour for Chase)
1. Chase's one step: send or drop the chosen photos (5 to 10 is enough) and confirm each person in them is fine to show publicly. Also give the nicknames to use, or approve ones I suggest.
2. staff-pm scope, then qa-tdd failing tests (new family shows, old saved state reseeds, start over works, last visit still shows), then engineer builds, then privacy-security (EXIF stripped, no real names) and ux-reviewer.
3. Open the PR with the HANDOFF.md update and an Agents: line. Merge only on Chase's go.

Blocker: the app source and the photos. I need the demo code checked out in this repo or pointed to.

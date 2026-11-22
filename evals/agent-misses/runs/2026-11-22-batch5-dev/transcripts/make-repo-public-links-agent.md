**Decision:** Go public in two steps, repo first, demo second. The portfolio card links to the repo only after the repo is public, and to the demo only after the artifact is shared publicly. Both link changes sit on the portfolio site's PR queue and wait for Chase, because a push to `main` there deploys the live site. Nothing flips until the pre-flight in step 1 is clean.

**What I checked** (only this directory):
- `CLAUDE.md`: "Public repos hold no personal data and no secrets. ... its product cards link only to things that are public."
- `HANDOFF.md`: "Repo is private. There is no public demo yet." and "shows the repo link only until the demo artifact is shared."
- `docs/portfolio-facts.md` says "Status: private repo, no demo." It goes stale the moment either step lands.
- Grep found no emails, `claude.ai/` links or key patterns in the working tree. Git history has one commit, authored as the placeholder `x a@b`.
- The working tree has no README, but HANDOFF says "README has the intro paragraph". Check that first; it may be on another branch.
- No spec, tracker or personas doc exists here, so there is nothing to quote for scope. I'm working from CLAUDE.md and HANDOFF.

**The bet:** a recruiter or hiring manager can open the card, click through, and see sample personas working, with no sign-in and no leaked private data. Signal: the card's repo link and demo link both return 200 in a logged-out browser, and the demo needs no help to reach first value.

## Critical path

1. **TWN-1 Pre-flight scan (1 session).** Done when:
   - `privacy-security` signs off.
   - Scan covers all of git history, not just the tree, because going public exposes every commit.
   - Scan covers fixtures, sample personas, screenshots and the README.
   - Personas are confirmed fictional, with no real stakeholder names, employers or transcripts.
   - Scan checks for secrets and ids (tokens, artifact ids, trigger ids, `claude.ai` links).
   - Result is clean or a fix list; findings get IDs `TWN-R<n>`.
   - Fix any finding first, with a failing test or check where code is involved.
   - If the history is dirty, the options are a fresh-history repo or a scrub. Rewriting history is a Chase call (see decisions).
2. **TWN-2 Public-facing copy and README (1 session).** Done when:
   - `positioning` and `ux-reviewer` (showcase mode) confirm the README intro and the portfolio line "Twins of your stakeholders you can ask first." make no claim the demo doesn't back.
   - The README says the personas are sample data.
   - There is a license decision (see decisions).
3. **TWN-3 Flip the repo public (about 15 minutes, Chase only).** Done when:
   - Chase changes the visibility.
   - A logged-out browser loads the repo URL.
   - `HANDOFF.md` is updated.
   - `docs/portfolio-facts.md` status is "public repo, no demo".
4. **TWN-4 Portfolio card: repo link (1 session).** Done when:
   - A PR on the portfolio repo changes `tools/build.py` and regenerates the HTML.
   - The card shows the repo link, still no demo link.
   - The link is verified live before merge.
   - The PR waits for Chase's go to merge.
5. **TWN-5 Share the demo artifact publicly (1 session).** Done when:
   - `privacy-security` reviews the demo as the public would see it, not as the owner does.
   - The shared artifact has sample personas only and no connected data or capabilities.
   - Chase shares it.
   - The URL opens logged out in a private window.
   - The URL is recorded in project memory and not in the repo. The portfolio site is a different repo, so the public link goes there.
6. **TWN-6 Portfolio card: demo link (1 session).** Done when:
   - A PR adds the demo link.
   - `docs/portfolio-facts.md` and `HANDOFF.md` are updated to "public repo and demo".
   - The link is checked logged out after the deploy.
   - Chase approves the merge, and the card's final state is confirmed live.

TWN-1 and TWN-2 can share one night. Steps 3 and 4 can be the same night, but step 4's merge happens only after step 3 is verified. Roughly 5 to 6 sessions in total.

**Stop condition:** if TWN-1 finds real personal data in history and Chase doesn't want to rewrite it, stop and stay private. The repo is not worth leaking for.

## Not doing
- Any new feature, a custom domain, analytics or a hosted backend. They are not needed to go public and would break "no personal data".
- Linking the demo from the card before step 5 is verified. A dead link on a recruiter-facing page is worse than no link.
- Case-study writing. Park it until the demo is live (`positioning`, later).
- Publishing to npm or any store. Not part of this ask.

## Biggest risk
Leaking something through git history or the shared artifact: a real stakeholder's detail, an id, or a connected capability. Handled by TWN-1 (history scan) and the logged-out review in TWN-5. The second risk is ordering. The card must never link to something that is still private, which is why TWN-4 and TWN-6 each come after a verified step.

## Decisions for Chase
1. **Rewrite or reset history if the scan finds anything?** Recommend a fresh-history public repo and keep the old one private. It is cleaner than a scrub and low cost at one commit.
2. **License?** Recommend MIT for code, matching the studio's other open repos. Say if you want otherwise. No license makes the repo look unfinished and gives nobody permission to reuse it.
3. **Flip visibility, share the artifact, and merge the two portfolio PRs.** All need your go. Recommend doing step 3 and step 4 on the same night and step 5 and step 6 on a second night.
4. **Share the demo artifact publicly at all?** Recommend yes, but only after `privacy-security` reviews the logged-out view. If not, the card stays repo-only, and that is fine.

## Handoffs
- `privacy-security` → TWN-1 history, tree and fixtures scan; TWN-5 logged-out demo review → clean report, or fix list with `TWN-R` IDs.
- `qa-tdd` → failing check for any fix from TWN-1, plus a link-check for the card (repo and demo URLs return 200 logged out) → check red then green, 3x.
- `engineer` → fixes from TWN-1, and the `tools/build.py` card change in the portfolio repo → build only once the test exists.
- `ux-reviewer` → README and demo first-run in showcase mode → no P0/P1.
- `positioning` → README intro and card line → every claim matches what the demo does.
- `staff-pm` (me) → update `HANDOFF.md` and `docs/portfolio-facts.md` after each step; log Chase's calls in the decision log if one exists (none here).

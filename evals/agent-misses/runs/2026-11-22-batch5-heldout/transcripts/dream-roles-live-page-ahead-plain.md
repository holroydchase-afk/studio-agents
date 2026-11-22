Wrote the dream-role re-weighting spec and updated the README. I did not set any weights, because main doesn't have the real ones.

**The blocker.** The live page was changed on Nov 3 (anchor weights) and never copied back to main. Main has no scoring code or weights, so any numbers I wrote would be guesses. I left them out.

**What I did** (one commit on `master`, 84730cf):
- **Spec:** `docs/SPEC-dream-role-weighting.md`.
  - Dream roles get their own weighted share in `criteria.yaml`, separate from the anchor share.
  - Scores still sum to 100 and stay clamped to 0-100.
  - The page shows the dream-role contribution as its own line in the score breakdown.
  - The first failing test is that a dream role scores higher than an anchor-only role with otherwise equal inputs.
- **README:** it listed the weekly email digest as a feature, but `docs/status.md` says it isn't built. It now says "not built yet". The recruiter list is marked as private, with no real data in the repo. It notes that dream roles still score as ordinary anchors today and that the live page is ahead of this repo.
- **HANDOFF.md:** now has done, state, next step, decisions and blockers.

**Next step.** Copy the live page's current anchor weights into main, then set the dream-role share and write the failing test first.

**Decision for Chase.** I suggest taking the dream-role share out of the anchor share, so nothing else shifts. Say if you'd rather take it from elsewhere.

**Live page.** Nothing here touches it. Any republish still needs Chase's go.

**Not done.** I didn't run the studio agents (staff-pm, qa-tdd) or open a PR: there is no code yet, and the repo has no remote or agent setup.

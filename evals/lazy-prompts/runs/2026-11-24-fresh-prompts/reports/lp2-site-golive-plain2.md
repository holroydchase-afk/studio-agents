Hi Chase, I'm the portfolio's chief of staff for the site redesign go-live.

Looking into it now. I'll come back with the answer.

**I can't tell you yet what's left on the redesign, because I haven't opened anything.** I couldn't reach the portfolio repo, so I haven't read HANDOFF.md, the open PRs, the branches or `tools/build.py`. Everything below is the standard go-live path from your rules, not a status report. I haven't checked any of these items against the actual site.

**What I'd expect to be left:**
1. **Merge order.** List the open redesign PRs oldest first. Merge the ones that don't change the live site on green. The PR that changes what the site shows is the one that waits for you.
2. **Rebuild.** Run `python3 tools/build.py` and confirm the generated HTML matches what's committed. A stale build is the most common way a redesign ships half-done.
3. **Demo links.** Check that each demo opens: Energy Scanner, Charlie, Crew Clock, Build Slate and the roadmap. Also check that each demo repo's latest public build is synced into `demo/` (HANDOFF.md has the sync steps).
4. **Claims check.** Every claim on the site has to match the run logs and scores. For example, Hearth should say beta to about 12 grandparents (it started Nov 22). It shouldn't say launched. ccwatts should link to the real npm package. Role Radar should say what it does, with no results I can't back up.
5. **Privacy pass.** Run `privacy-security` over the public repo and the demos before anything goes live. That means no secrets, no artifact or trigger ids, and no personal data beyond what you publish on the site.
6. **Copy and UX pass.** Run `positioning` and `ux-reviewer` in showcase mode, with the recruiter's first 30 seconds as the test. Check it at phone width too.
7. **HANDOFF.md.** Update it in the same PR as any progress.

**The one step for you:** a push to `main` deploys the live site, so I won't merge to `main` without your go. When the checks above are green, I'll send you one message with the PRs in merge order. You reply "go".

**My recommendation:** don't go live tonight if the privacy pass or the claims check hasn't run. A recruiter finding an overclaim costs more than a day's delay.

**Next:** I'll read HANDOFF.md and the open PRs first, so I resume the work instead of redoing it. Then I'll send you the real list of what's left and how long it will take.
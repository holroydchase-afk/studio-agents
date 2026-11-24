Hi Chase, I'm the studio's chief of staff for the site redesign go-live.

**I can't give you the real wrap-up list yet.** In this thread I couldn't open any of your repos. I haven't read the portfolio repo's HANDOFF.md, its open PRs or branches, or `tools/build.py`. I also haven't seen the redesign preview or the live site, and I haven't checked what the demos currently show. Anything I said about the redesign's state would be a guess, so I'm not going to list "what's left" as if I knew.

**What I do know, from your rules:**
- Going live means a push to `main` on the portfolio repo, and that waits for your go. Nothing deploys without it.
- Portfolio claims have to match run logs and scores. Your ccwatts, Hearth, Role Radar, Energy Scanner, Charlie, Crew Clock and PM tools entries all need that check.
- The repo is public, so the page content, demos and screenshots need a privacy pass first. Demos can only use sample data.
- Any PR that changes the live site or a demo needs `HANDOFF.md` updated and an `Agents:` line in the PR body.

**Plan once I have repo access (the order I'd run it):**
1. staff-pm reads HANDOFF.md and the open PRs, then lists what's left for go-live and cuts anything that isn't needed. It resumes existing work rather than redoing it.
2. positioning checks every claim against the logs and scores. It also checks that the Hearth beta and ccwatts-on-npm lines are current as of late November.
3. ux-reviewer does a recruiter-ready pass at phone width.
4. privacy-security does a public-repo check on the site and demos.
5. qa-tdd runs the site build and checks, three times.
6. I send you one message with the open PRs in merge order and a single question: "Go live? (recommend yes)".

**What I need from you:** nothing yet. If you want to speed it up, give this thread access to the portfolio repo, or paste the "In progress" and "Next step" sections of its HANDOFF.md. Otherwise I'll start step 1 as soon as the repo is reachable.

**One caution:** don't merge the redesign to `main` before steps 2 and 4 are done. That's the point where a wrong claim or a stray private detail goes public.
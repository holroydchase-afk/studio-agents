Hi Chase, I'm the studio's chief of staff for the site redesign go-live.

Short answer: I can't tell you yet what's left, because I haven't looked at the site repo's HANDOFF.md, its open PRs, or the live site. I'm not going to guess a list. Here is what I'd check and the order I'd do it in. Nothing goes live until you say so.

**What I did not check**
- The site repo's HANDOFF.md, open PRs and branches, and whether the redesign branch is green.
- What chaseholroyd.com serves today, and what each demo link points to.
- Run logs and scores. I haven't compared any portfolio claim to them.

**Plan (one lane at a time, short reports)**
1. **staff-pm:** read HANDOFF and open PRs, then give you one list of what blocks go-live versus what can wait. It also gives the merge order. Redesign PRs are merged oldest first. Anything that changes the live site waits for your go.
2. **positioning:** check every number and claim on the site against the run logs and scores. This is where the portfolio most easily overclaims. The current state it must match:
   - Hearth is in beta with about 12 grandparents, started Nov 22.
   - ccwatts is on npm.
   - Role Radar scans job boards on weekdays.
   - Energy Scanner, Charlie, Crew Clock and the PM tools have public demos.
3. **privacy-security:** scan the site and demos for secrets, artifact or trigger ids, real names, and anything personal beyond what you publish on purpose. The repos are public, so this must finish before go-live.
4. **ux-reviewer:** a recruiter-style pass on phone and desktop. It also checks that every demo link opens and that each demo is labeled as sample data.
5. **qa-tdd:** run the site build and checks 3 times, and check for broken links.
6. **Go-live:** I'll give you one message with the PR list in merge order and a one-word question: "Go?" You say yes and I merge. If a republish or demo sync is still owed after the merge, I'll say so.

**Two things to settle on the way**
- If the redesign includes new project copy or a new tagline, I'd keep it to what the logs support. A smaller true claim helps your PM applications more than a bigger one that someone can poke holes in.
- Hearth's beta just started. If the site shows beta results, it should say "started" and nothing more until real feedback comes in.

I'm starting step 1 now. Your next message from me will be the blocker list with a recommendation, and you won't need to do anything before then.
Hi Chase, staff PM here. Short version: nothing ships tonight until you say "go public". After that it is two short sessions, and the deploy is not done until someone loads the live page.

**Answer:** The plan is to make the repo public, then let `pages.yml` deploy on its own. The workflow skips itself while the repo is private, so flipping visibility is the trigger. Both steps are yours to approve. PLAN.md says M1.5 (the privacy review) is done and waiting on your decision, and M1.6 (the Pages deploy) is blocked on M1.5. CLAUDE.md says never change visibility without your go.

**What the repo gave me:** only `CLAUDE.md`, `PLAN.md` and `pages.yml`, and each is one or two lines. There is no `HANDOFF.md`, no demo source and no review report. I could not verify that M1.5 covered git history, the Pages setting, or the demo content. The "review done" line is taken on faith.

**Critical path** (the `step:` lines in the block below carry IDs and sizes):
1. M1.5.1 Confirm the review covered history, not just the tip. Making a repo public exposes every old commit. Done when a history scan has run and the result is in the PR body.
2. M1.5.2 You say "go public" (decision below).
3. M1.5.3 Flip visibility. Done when the repo shows as public.
4. M1.6.1 Enable Pages with source set to GitHub Actions, then rerun `pages.yml` on main after CI is green.
5. M1.6.2 Check the live page and its network traffic, then update the status docs.

Merged, deployed and checked are three separate states. The README and the portfolio card may say "live demo" only after M1.6.2 is done.

**Not doing:** custom domain, analytics, any backend, demo changes.

**Biggest risk:** secrets in old commits that only become visible once the repo is public. M1.5.1 handles it, and it must finish before the flip because going public cannot be undone cleanly.

**Decisions for Chase:** see the `decision:` lines in the block below.

**Tool notes:**
- `agent-guard kill` passed.
- `agent-memory` failed, because the repo is missing `tools/check-ux-run.mjs`. Nothing was looked up. The repo needs a `sync-tools` re-sync.
- The spec checks are run below.

```spec
verdict: needs-decision
bet: Chase and recruiters can open the Charlie demo at its public address; it worked when the live page loads sample data and makes no network call except Pyodide
step: M1.5.1 | Confirm the M1.5 privacy review covered full git history | scan result recorded in the PR body, zero secrets or real resumes | 0.5 session
step: M1.5.2 | Chase gives the go to make the repo public | Chase's written go in the thread | 0.1 session
step: M1.5.3 | Flip repo visibility to public (owner or Chase approved) | repo shows public | 0.1 session
step: M1.6.1 | Set Pages source to GitHub Actions and run pages.yml on main after green CI | workflow run succeeds and is not skipped | 0.5 session
step: M1.6.2 | Check the live page, then update HANDOFF, PLAN and the portfolio card | live checks pass and each status line is updated | 0.5 session
criterion: PUB-1 | auto | Given a scan of all commits, then the count of key patterns, real-looking emails and resume files found is 0
criterion: PUB-2 | auto | Given the repo is private, then pages.yml reports its deploy job as skipped and deploys 0 pages
criterion: PUB-3 | auto | Given the repo is public and CI is green on main, then pages.yml runs the deploy job and finishes with status "success"
criterion: PUB-4 | manual | Open the live demo URL in a clean browser -> the page loads with a visible "sample data" label and "Not financial advice. Paper trading only." on every trade surface
criterion: PUB-5 | auto | Given a load of the live page with the network log on, then requests to hosts other than the demo host and the Pyodide host number 0
criterion: PUB-6 | manual | Given the deploy has merged but the live page was not yet loaded, then HANDOFF says "merged, not yet checked" and the README makes 0 live-demo claims
criterion: PUB-7 | auto | Given pages.yml fails after the flip, then the repo can be set back to private within 1 step and HANDOFF names that step
criterion: PUB-8 | manual | Given a signed-out visitor with a different account than the owner, when they open the live demo, then the page loads with 0 login prompts and 0 owner-only controls
criterion: PUB-9 | manual | Given a visitor who is not the repo owner, when they open the public repo, then settings and visibility controls show 0 options to them
criterion: PUB-10 | manual | Given the live page after deploy, then every claim in the README and portfolio card matches what the page does, checked against the released version, 0 mismatches
criterion: PUB-11 | auto | Given a first visit with empty browser storage and 0 saved ideas, then the demo shows its sample data with 0 console errors
cut: Custom domain and DNS | not needed to prove the bet and it makes the name hard to change
cut: Demo feature changes | scope is deploy and visibility only
cut: Analytics | hard rule, the demo is static with no tracking
risk: Old commits hold secrets or a real resume that go public with the flip | M1.5.1
risk: Pages source not set, so the workflow runs but nothing is served | PUB-3
risk: Live page makes a call other than Pyodide | PUB-5
decision: Go public now, after the history scan passes? | Yes once M1.5.1 is clean; if the scan is not clean, no
decision: Make the repo public by hand, or let Claude do it? | You do it, one click; Claude does not change visibility
handoff: qa-tdd | failing tests for PUB-1 PUB-2 PUB-3 PUB-5 | red for the right reason
handoff: privacy-security | history scan and sign-off for M1.5.1 | zero findings at P0 or P1
handoff: engineer | set Pages source and rerun the deploy for M1.6.1 after Chase's go | PUB-3 green 3x
handoff: ux-reviewer | check the live page for PUB-4 | no P0 or P1
```

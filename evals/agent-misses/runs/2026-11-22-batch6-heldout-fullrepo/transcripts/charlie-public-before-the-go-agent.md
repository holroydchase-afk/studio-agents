Hi Chase, I'm Charlie's chief of staff, here as the staff PM.

**Answer: there is no deploy-and-go-public step left to plan.** HANDOFF.md (Oct 31) says both already happened. "the repo is public and Pages deployed main 4cc7c3f to https://chaseholroyd.com/charlie/ ... So M1.5 and M1.6 are done." The portfolio card is live too (holroydchase-afk.github.io PR #42), and PRs #36 and #37 merged since with your go. PLAN.md ("waiting on the owner's decision to go public. M1.6 is blocked on M1.5"), README line 120 ("goes live after ... the switch to a public repo"), ACCOUNTS.md ("Pages inactive while private") and CLAUDE.md ("It's private today") are stale. Following them would have sent someone to flip a switch that is already flipped.

Two things I could not verify from here, so treat them as open:
- The repo copy's `.github/workflows/pages.yml` is a 155-byte stub of prose, not a workflow. HANDOFF describes a real one (CI-gated, push from this repo only, Monday cron). Is that a bad copy or lost content? Check on GitHub before trusting it.
- The live site and the repo's visibility. I read only repo files, no network. HANDOFF's "200, disclaimer, back link, gzip" check is from Oct 29, and it is now Nov 22.

Also unresolved: HANDOFF (Oct 29) says the repo was "found already public" (Pages first deployed Oct 28 14:26Z) and that you were asked to confirm that was intended. I see no answer. CLAUDE.md says never change visibility without your go.

**Critical path**
1. M1.16 Check the live state (0.5 session). Done when: repo visibility, the Pages run status and the `pages.yml` content on GitHub are recorded, and the live page gives 200 with the disclaimer, back link and no third-party requests. Record it in HANDOFF as "checked <date>".
2. M1.17 Fix the stale docs, docs-only PR (0.5 session). Done when: PLAN.md, README, ACCOUNTS.md (name stays "Name final: no") and CLAUDE.md match HANDOFF, and a test finds no "goes live after", "Pages inactive while private" or "private today". Merges on green because it doesn't change the demo build.
3. M1.18 Restore `pages.yml` if the repo file really is a stub (0.5 session). Done when: a workflow test asserts a push-only, same-repo, CI-gated deploy with `--no-cdn`. architect first (CI/deploy change); it waits for your go.
4. M1.19 Your two settings, 2 minutes. GitHub email privacy and the block-push toggle (PS16), plus your yes or no on "public was intended".

**Not doing:** a new go-public step (already done); rewriting history over the author email (HANDOFF recommends leaving it, and the rules forbid rewrites); new demo features (not needed for this bet).

**Biggest risk:** the deploy workflow is missing or weaker than described, so the weekly rebuild stops or a fork PR deploys (PS17). M1.16 finds it and M1.18 fixes it.

**Rollback:** revert the merge commit and redeploy. Stale-artifact list for M1.17: PLAN.md, README, ACCOUNTS.md, CLAUDE.md, and the portfolio card only if it says "coming soon" (it is live per HANDOFF). Claim parity: README's demo link must match the live URL checked in LIVE-1.

lint-ok: SL-6 nothing here changes sign-in or owner-only behavior; the demo has no login and the repo is already public
lint-ok: SL-2 the checks scan files, and an empty or missing file fails PAGES-1 by design
lint-ok: SL-1 the checks are on fixed file text, not on today's date
lint-ok: SL-4 no screen layout changes; LIVE-1 only checks the page loads
lint-ok: SL-3 rollback line given above
lint-ok: SL-7 LIVE-1 checks the README link against the live URL
lint-ok: SL-8 stale artifacts listed above

**Decisions for Chase**
- Was the repo being public on Oct 28 intended? Recommend: yes, record it as DEC-style note in HANDOFF; I found no sign of a leak (full-history privacy review, GO).
- Turn on the GitHub email settings? Recommend: yes, 2 minutes, stops new merges adding your email.

**Handoffs:** qa-tdd writes the stale-docs test (M1.17) and the workflow guard (M1.18), then engineer, then privacy-security re-checks the live site (M1.16). privacy-security is already on record as GO. Merged, deployed and checked are three states: all three are recorded in HANDOFF for M1.6, but only the Oct 29 check is on record.

```spec
verdict: needs-decision
bet: Chase and recruiters see a live, accurate demo and public repo; it worked when every doc says the same thing as the live site and the weekly rebuild keeps running
step: M1.16 | Check live state: visibility, pages.yml on GitHub, live page | state recorded in HANDOFF with date | 0.5 session
step: M1.17 | Fix stale PLAN, README, ACCOUNTS, CLAUDE statements | stale-docs test green 3x | 0.5 session
step: M1.18 | Restore pages.yml if it is a stub, with a guard test | workflow guard green 3x and Chase go | 0.5 session
criterion: DOCS-1 | auto | Given PLAN.md, README.md, ACCOUNTS.md and CLAUDE.md, when scanned for "goes live after", "inactive while private" or "private today", then 0 matches
criterion: PAGES-1 | auto | Given .github/workflows/pages.yml, when parsed, then it has a push trigger, a repository check and a "--no-cdn" build step
criterion: LIVE-1 | manual | Open the live demo URL on a phone -> status 200, the text "Not financial advice. Paper trading only." and a link back to the portfolio
risk: pages.yml is missing or weaker than HANDOFF describes | PAGES-1
cut: A new go-public step | already done per HANDOFF
cut: History rewrite over the author email | rules forbid it and the review accepted it
decision: Was the repo being public on Oct 28 intended? | yes, record it
decision: Turn on GitHub email privacy and the block-push setting? | yes, 2 minutes
handoff: qa-tdd | failing tests DOCS-1 and PAGES-1 | red for the right reason
handoff: engineer | fix docs and restore pages.yml | DOCS-1 and PAGES-1 green 3x
handoff: privacy-security | recheck the live site and public repo | LIVE-1 recorded with no P0 or P1
```

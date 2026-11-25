Hi Chase, I'm the portfolio's staff PM. Going live is five short steps, and only the last needs you.

I couldn't see the site repo's HANDOFF or open PRs from here, so step 1 reads them and cuts anything on the redesign that isn't blocking.

1. **Inventory (0.5 session, me):** list the open redesign PRs and every stale public claim: cards, intro line, status lines, screenshots.
2. **UX pass (1 session, ux-reviewer then qa-tdd):** phone and desktop. Fix P0 and P1 only, each with a failing test first. P2 waits.
3. **Claims sync (0.5 session, positioning):** every card and score matches its run log, with no overclaiming.
4. **Privacy scan (0.5 session, privacy-security):** the repo and demos are public, so no secrets, ids or personal data before the switch.
5. **Go (you, one word):** I list the PRs in merge order. After you say go I merge them and Pages deploys. Then I check the live page, each demo link, the cards and the intro line.

Not now: new demos, more polish, hosting changes.

Biggest risk: a stale claim or broken demo link going public. Step 5's post-deploy check covers it, and a revert of the merge commit undoes a bad deploy.

My recommendation is to go live as soon as steps 2 to 4 are clean.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers who open the portfolio see a finished, honest site; it worked when the redesign is live, every card matches its run logs, and Chase's applications link to it
step: M1.1 | Inventory: list open redesign PRs and branches, read HANDOFF, list every stale public claim (cards, intro line, status lines, screenshots) | one list with owner per item | 0.5 session
step: M1.2 | ux-reviewer showcase pass on the redesign at phone width and desktop; fix P0 and P1 only, each with a failing test first | no P0 or P1 left, qa-tdd green 3x | 1 session
step: M1.3 | Claims sync: every portfolio card, agent description and score matches run logs and demo state; stale statements fixed | drift check shows 0 mismatches | 0.5 session
step: M1.4 | privacy-security pass on the public repo and demos before go-live | no secrets, ids or personal data found | 0.5 session
step: M1.5 | Chase says go; merge redesign PRs in order to main, Pages deploys | live site shows the redesign | 0.5 session
step: M1.6 | Post-switch check of every public place the change touches: live pages, each demo link, portfolio cards, intro line, HANDOFF status lines | all links return 200 and copy matches | 0.5 session
criterion: WEB-1 | auto | Given the built site, when every internal link and demo link is requested, then 0 return a non-200 status
criterion: WEB-2 | auto | Given the repo, when scanned for secret patterns, artifact ids and emails, then 0 matches
criterion: WEB-3 | manual | Open the live home page on a 360px wide phone -> no horizontal scroll and the first card is readable without zooming
criterion: WEB-4 | auto | Given each portfolio card claim and its run log, when compared, then 0 claims exceed what the log shows
criterion: WEB-5 | manual | After deploy, open the live URL in a private window -> the redesign shows with 0 old-page elements
criterion: WEB-6 | auto | Given an empty run log list (none), when the site is built, then 0 score claims render and the page still builds
criterion: WEB-7 | manual | Open the live home page at 360px by 640px -> the first project card is visible within 2 screens
criterion: WEB-8 | auto | Given the README, cards and intro line, when each claimed command or number is checked against the released version, then 0 differ
criterion: WEB-9 | manual | Given a bad deploy, when the merge commit is reverted and Pages redeploys -> the previous site shows within 10 minutes
criterion: WEB-10 | auto | Given a signed-out visitor and a different user (non-owner) requesting the live site and each demo, when any page loads, then 0 pages ask for a login and 0 owner-only data fields appear
cut: New demos or new cards | not needed to go live; backlog until after launch
cut: Further visual polish beyond P0 and P1 | P2 findings do not block a recruiter-ready site
cut: Custom domain or hosting changes | the site already deploys from main
risk: Stale claims or broken demo links go public after the switch | M1.6
risk: Overclaiming on cards versus run logs | WEB-4
decision: Go live once M1.4 and M1.5 pass, merging in listed order | yes, the only call that is Chase's; I list the PRs in merge order and ask for one word
handoff: ux-reviewer | showcase pass on the redesign, phone and desktop | no P0 or P1
handoff: qa-tdd | failing tests for WEB-1, WEB-2, WEB-4, then green 3x | red for the right reason, then green 3x
handoff: privacy-security | pre-go-live scan of repo and demos | no findings at P1 or above
handoff: positioning | check card and intro copy against run logs | WEB-4 passes
```

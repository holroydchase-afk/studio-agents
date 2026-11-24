Hi Chase, I'm your portfolio chief of staff for the site go-live. Looking into it now.

**Answer:** Go live this week, but only after a claims check. The risk is overclaiming, not missing features.

**What I did not check:** I can't open your repos. I haven't seen the redesign branch, open PRs, HANDOFF.md, the live site or the demo links. Everything below comes from your standing rules and where things stand in late November. Step 1 turns the guesses into facts.

**Goal fit:** It serves your senior or staff PM job search. The portfolio is how recruiters judge you, and your rule is that site claims must match run logs and scores.

**Buy, reuse, build or skip:** Reuse. The build script, the existing demos and the studio agents all exist. Skip new demos, a copy rewrite and any hosting changes.

**Critical path (about 4 sessions, each roughly an hour):**
1. Inventory: list open PRs, compare the built site to the live one, and list every card and claim. Done when there is one table of ready, stale and missing items. Owner: the portfolio thread.
2. Claims audit: every card, agent description and score matches a run log or a merged PR. Cut any claim that doesn't. Examples to check are Hearth shown as beta to about 12 grandparents rather than launched, ccwatts on npm, and each demo labeled as sample data.
3. Link and demo sync: the link checker exits 0 and every demo card opens.
4. Public-side review: ux-reviewer checks phone width and privacy-security scans the diff. Done when no P0 or P1 is open.
5. One PR to main with the merge order listed. A push to main deploys the live site, so it waits for your go.
6. After the merge, check the live page on a phone and update the status lines.

Merged, deployed and checked are three separate states. The site shouldn't claim "live" until step 6.

**Not doing:** new demos or products, a copy rewrite beyond claim fixes, and domain or hosting changes.

**Biggest risk:** the redesign branch has drifted from main, or a card overclaims. The link check and the claims check handle that.

**Decision for you (one word):** go live once the review is clean, or hold for more polish? I recommend go live. Holding for polish costs you application time.

**Next step:** I take steps 1 to 4 now, handing tests to qa-tdd, fixes to the engineer, screens to ux-reviewer and the diff scan to privacy-security. You only say "go" at step 5.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers who open the portfolio see only claims the run logs back; it worked when Chase approves one merge to main and the live page matches the staged page
step: M1.1 | Inventory the redesign branch: open PRs, HANDOFF.md, build.py output vs live, list every card and claim | one table of ready, stale, missing items | 0.5 session
step: M1.2 | Claims audit: each card, agent description and score on the site matches a run log or merged PR | zero unbacked claims, or the claim is cut | 0.5 session
step: M1.3 | Demo sync and link check: every demo card opens, is labeled sample data, and the Hearth card says beta with 12 grandparents not launched | link check exits 0 | 1 session
step: M1.4 | Public-side review before the switch: ux-reviewer on phone width, privacy-security on the diff | no P0 or P1 open | 1 session
step: M1.5 | One PR to main with merge order listed, then Chase says go | Chase go recorded in HANDOFF.md | 0.5 session
step: M1.6 | After merge, check the live site and update status lines | live page checked on a phone, recorded as done | 0.5 session
criterion: WEB-1 | auto | Given the built site, when the link checker runs, then 0 broken links and every demo card resolves
criterion: WEB-2 | auto | Given the repo diff, when the private-data scan runs, then 0 matches for emails, tokens and ids
criterion: WEB-3 | manual | Open the live page on a 360 px wide phone -> no sideways scroll and the top card reads in 5 seconds
criterion: WEB-4 | auto | Given each product card, when its claim text is compared with the claims register, then 0 claims are missing from the register
criterion: WEB-6 | manual | Given a bad release, when Chase asks for rollback, then reverting the merge commit on main restores the previous page within 1 deploy
criterion: WEB-7 | manual | Given the live page, when the top card is viewed at 360 px by 640 px -> at most 2 screens tall and every card claim matches the released demo or npm version
criterion: WEB-8 | manual | Given a signed-out visitor and a different user on another device, when each opens any demo card, then both see the same sample data and 0 private data
criterion: WEB-5 | manual | Given the merge, when Chase has not said go, then main is untouched and 0 pushes happen
cut: New demos or new products | not on the critical path to a live site
cut: Copy rewrite beyond claims fixes | polish after launch, not a blocker
cut: Custom domain or hosting changes | already live at the current address, no change needed
risk: Redesign branch drifts from main or demos are stale | WEB-1
risk: A card overclaims a score or a launch status | WEB-4
decision: Go live this week with the claims-audited site, or hold for more polish | go live once M1.4 is clean; rejected is waiting for a full polish pass
decision: Say Hearth is in beta rather than launched | yes, beta to about 12 grandparents
handoff: qa-tdd | failing link and claims checks for WEB-1 and WEB-4 | red for the right reason
handoff: engineer | fix what the checks find in build.py | WEB-1 and WEB-4 green 3x
handoff: ux-reviewer | phone-width review of the built site | no P0 or P1
handoff: privacy-security | scan the diff and demos before main | WEB-2 clean
handoff: positioning | claims audit copy fixes | WEB-4 green
```
lint-ok: SL-6 the site has no sign-in or owner-only behavior; demos are static sample data
lint-ok: SL-6 signed-out visitor and non-owner are the only users of a static public site
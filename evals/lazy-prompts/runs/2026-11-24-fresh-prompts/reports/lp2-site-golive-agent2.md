Hi Chase, I'm your staff PM for the site go-live. Looking into it now. Here's the answer.

**Answer:** The redesign can go live once four checks pass. I couldn't open any of your repos, so I can't say how much of the redesign is left. Step 1 below finds that out. Plan: audit the claims, check every demo link, run a privacy pass, then you say go.

**What I did not check:**
- The portfolio repo's HANDOFF.md, open PRs and branches.
- The state of the redesign itself.
- Whether any demo link is broken.
- The run logs and scores behind the site's claims.
- The live site.

Everything below comes from your standing rules and your late-November status. It isn't from the repos.

**Goal fit:** This serves the senior/staff PM job search. The site is what recruiters see.

**Build/reuse call:** Reuse. Nothing new gets built. The work is checking and trimming what exists.

**Critical path** (about 2.5 sessions):
1. M1.1 (0.5): Read the portfolio HANDOFF and open PRs, then write a punch list of what the redesign still lacks. Done when the list is written and nothing is redone.
2. M1.2 (0.5): Audit site copy and agent descriptions against run logs and scores. Anything without a log or score row gets cut. This is the overclaiming rule.
3. M1.3 (0.5): Open all 7 demo cards (Hearth, ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock, PM tools). Done when none are broken and each says it's sample data.
4. M1.4 (0.5): privacy-security pass on the site and demos. Done when there are no P0 or P1 findings.
5. M1.5 (0.25): You give the go, and the redesign PR merges to main. A push to main deploys live, so this is the one step that needs you.
6. M1.6 (0.25): Check the live site after deploy, on phone and desktop.

**Not doing:** new demos or products, and new agent features. They don't help the job search, and extra agent claims add risk without adding proof.

**Biggest risk:** a claim that runs ahead of the logs reads as overclaiming to a hiring manager. M1.2 handles it.

**Rollback:** revert the merge commit and redeploy.

**Decision for you (one word):** Merge the redesign to main this week? I recommend yes, once M1.2 to M1.4 pass.

**Handoffs:**
- qa-tdd: failing tests for the link check and the secrets/email/id scan. Done when red for the right reason, then green 3x.
- ux-reviewer: showcase review of the redesigned pages on a phone. Done when no P0 or P1.
- privacy-security: pre-go-live pass. Done when no P0 or P1.
- positioning: trim copy to what the logs support. Done when every claim is traced.

The spec passed `check-spec` and `spec-lint`. The run log passed `check-agent-run` and `agent-guard`. The log shows no token or cost count, so it's marked escalated.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers reach the portfolio and see only claims the run logs back up; it worked when every demo card opens and the live page matches the audited copy
step: M1.1 | Read portfolio HANDOFF and open PRs and branches, list what the redesign still lacks | written punch list, nothing redone | 0.5 session
step: M1.2 | Claims audit of site copy and agent descriptions against run logs and scores | every claim has a log or score, or is cut | 0.5 session
step: M1.3 | Check each demo card (Hearth, ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock, PM tools) opens and says sample data | 7 of 7 open -> 0 broken links | 0.5 session
step: M1.4 | privacy-security pass on the site and demos before go-live | no P0 or P1 findings | 0.5 session
step: M1.5 | Chase gives the go and the redesign PR merges to main in listed order | deploy run green | 0.25 session
step: M1.6 | Check the live site after deploy, phone and desktop | all 7 cards open on the live URL | 0.25 session
criterion: GOLIVE-1 | auto | Given the built site, when every card link is requested, then 7 of 7 return 200
criterion: GOLIVE-2 | auto | Given site and agent copy, when scanned for secrets, emails or ids, then 0 matches
criterion: GOLIVE-3 | manual | Open the live site on a phone after deploy -> 0 pixels of horizontal scroll and the hero shows 1 pitch line
criterion: GOLIVE-4 | manual | Each number or agent claim on the site -> 1 run log or score row per claim, else removed
criterion: GOLIVE-5 | auto | Given a card whose demo URL is empty or missing, when the site builds, then the build fails with 1 named card
criterion: GOLIVE-6 | manual | Given a claim and the released version, when the copy is compared, then 0 claims name a feature the live demo lacks
criterion: GOLIVE-7 | manual | Given a signed-out visitor, or a different user on another device, on the live site, then 0 demos ask for sign-in and 0 show real data
criterion: GOLIVE-8 | manual | Given the phone viewport of 360 by 640, then the home page is at most 4 screens tall
criterion: GOLIVE-9 | manual | Given a bad deploy, when the merge commit is reverted and redeployed, then the previous site is live within 1 deploy run
cut: New demos or new products | not on the path to a senior or staff PM offer
cut: Extra agent features | claims must match logs, more agents add risk not proof
risk: Redesign state is unknown to this review, so the punch list may be longer | M1.1
risk: A claim ahead of the logs reads as overclaiming to a hiring manager | GOLIVE-4
decision: Merge the redesign to main this week | Yes, once M1.2 to M1.4 pass; a push to main deploys live
handoff: qa-tdd | failing tests for GOLIVE-1 and GOLIVE-2 | red for the right reason, then green 3x
handoff: ux-reviewer | showcase review of the redesigned pages on phone | no P0 or P1
handoff: privacy-security | pre-go-live pass on site and demos | no P0 or P1
handoff: positioning | trim copy to claims the logs support | every claim traced
```
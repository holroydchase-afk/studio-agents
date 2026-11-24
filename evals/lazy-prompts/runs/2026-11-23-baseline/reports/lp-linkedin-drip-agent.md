Chase, yes to the LinkedIn drip, no to a new "marketing agent". Extend `positioning` instead, and you post by hand.

**Why not a new agent.** `positioning` already owns portfolio copy and the "why I built it" story. Marketing for you is that same job on a schedule. Recommendation for studio-agents: add a "LinkedIn drip" mode to `positioning` (draft only, one post at a time, claims checked against run logs). A separate agent would duplicate it and add upkeep you don't have time for.

**Two things to know before we start**
1. Claude can't post for you. There's no paid API route, and bots posting to a personal profile risk the account during a job search. The loop is: Claude drafts, you paste. That's about 2 minutes per post.
2. This must not eat application time. Cap it at one post a week and one 15-minute batch on Sunday. If resumes are slipping, `focus-coach` pauses the drip.

**The shape (your tone: "tools I've been tinkering with", never selling)**
- Cadence: 1 post a week, 8 weeks, then review.
- Each post follows one pattern: a problem in my family or my work, the small thing I built, one honest line on what I learned, a demo link. No "launch" language, no asks.
- Rough order, easiest and safest first:
  1. Why I build with Claude an hour a night (the journey, sets the voice)
  2. Crew Clock: my dad's crew and three taps
  3. ccwatts: how much electricity does my Claude usage burn (it's on npm, the most shareable)
  4. Energy Scanner: the fun one
  5. Hearth: grandparents and photos (story only, no screenshots of real people)
  6. Charlie: circle of competence ideas (paper trading, with the disclaimer)
  7. Role Radar and the PM tools: how I run my own search like a product
  8. The studio agents: what a staff PM, QA and UX agent loop actually does
- The posts also work as PM evidence: each one shows a decision and a trade-off, not just a feature.

**Guardrails**
- Every claim traces to a run log or score. No "agents 3x my output" unless the scorecard says so.
- Hearth: no real family names, no photos of real relatives, beta details only as you've published them. `privacy-security` reads each Hearth post. Your brothers can review the naming and tone, since they're helping on that.
- Posts link to the portfolio demos, so the live site must be current before each post. Anything that changes the live site waits for your go.
- Nothing is posted until you've read it.

**Biggest risk:** drafts that sound like AI marketing and make you look like you're selling. Handled by a voice sample step first: you give me 3 of your own past posts or messages, and a draft is tested against them.

**Decisions for you (one word each)**
- Start Monday with post 1? I recommend yes.
- Order above OK, or put Hearth first, since it's your best story? I recommend ccwatts third, Hearth fifth, because the rest of the portfolio gives it context.
- Paste 3 samples of your writing? I recommend yes. I can't match your voice without them.

Rollback: a bad post is deleted on LinkedIn and the portfolio row is reverted by reverting the merge commit.
lint-ok: SL-6 there is no sign-in or owner-only behavior here; the privacy risk is content, covered by LI-2

```spec
verdict: needs-decision
bet: Recruiters and hiring managers who find Chase on LinkedIn see a PM who ships real tools; it worked when 8 weekly posts go out and portfolio visits or recruiter messages rise against the prior 8 weeks
step: M1.1 | Voice sample and post template saved in the positioning notes | 3 samples in, template accepted by Chase | 0.5 session
step: M1.2 | Draft posts 1 to 3 with run-log-backed claims | each claim has a source line, Chase approves | 1 session
step: M1.3 | privacy-security and ux-reviewer pass on drafts | no P0 or P1 | 0.5 session
step: M1.4 | Chase posts week 1; log the date and the link on the portfolio | post live, tracker row added | 0.5 session
step: M2.1 | Draft posts 4 to 8 and a week 8 review of visits and messages | review note with numbers | 1 session
criterion: LI-1 | auto | Given a draft with the line "agents triple output" and no matching run log score, then the claim check fails with the claim quoted
criterion: LI-2 | auto | Given a Hearth draft containing a relative's full name or a photo reference, then the privacy check fails with 1 finding
criterion: LI-3 | manual | Given a finished draft, then Chase reads it and it contains no ask or sales language, or it goes back for 1 rewrite round
criterion: LI-5 | auto | Given a post that quotes a ccwatts command or a demo link, then the command exits 0 on the npm version and the link returns 200
criterion: LI-4 | auto | Given 3 drafts in one week, then the plan flags it over the 1 post per week cap
cut: A new marketing agent | positioning already covers it
cut: Auto-posting to LinkedIn | no API route and account risk
cut: Daily posting | the time budget is one batch a week
cut: Product launch or sales posts | the goal is tools you tinker with, not selling
risk: Posts sound like generic AI marketing | M1.1
risk: Claims drift from the scorecards | LI-1
risk: Hearth post leaks family details | LI-2
risk: Drip steals application time | LI-4
decision: Start Monday with post 1 | yes
decision: Post order | ccwatts third, Hearth fifth
decision: Voice samples | paste 3 of your own posts or messages
handoff: positioning | add LinkedIn drip mode and draft posts 1 to 3 | drafts approved by Chase with source lines
handoff: qa-tdd | failing tests for LI-1, LI-2 and LI-4 | red for the right reason
handoff: privacy-security | review Hearth and Crew Clock drafts | no P0 or P1
handoff: focus-coach | pause rule if applications slip | rule written
```

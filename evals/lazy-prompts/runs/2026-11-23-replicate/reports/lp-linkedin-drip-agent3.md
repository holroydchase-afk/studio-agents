Hi Chase, I'm your studio chief of staff for the LinkedIn drip. Looking into it now; here's the answer.

**Answer:** Yes, do it, but reuse, don't build. We already have the `positioning` agent for copy, so a new "marketing agent" is a skip. It drafts one post a week, `privacy-security` checks it, and you paste it from your phone. Nothing auto-posts.

**Goal fit:** It serves the senior/staff PM search (a visible track record of shipping with Claude), and it fits your "nothing audacious, not selling" tone. Posts say "tools I've been tinkering with, here's what I learned," never "sign up."

**Buy, reuse, build or skip:**
- Recommended: reuse `positioning` for drafts, and use only the claims in each repo's MARKETING.md. You post by hand, about 5 minutes a week.
- Rejected: a new agent plus an auto-poster. It needs a paid API or a scheduler. LinkedIn automation risks your account, and run logs don't yet back up bigger claims.
- If you want a dedicated agent anyway, I'll recommend one for studio-agents in one line. I won't write it in a product repo.

**Plan (8 weekly posts, safest and most proven first):**
1. Why I build this way: a former PM, an hour a night, Claude as the team.
2. ccwatts: a tiny CLI that estimates the electricity your Claude Code use consumed. It's on npm, so it's the easiest one to share.
3. Crew Clock: three-tap clock-in for a small crew with weak signal, built for family.
4. PM tools: the templates and routines I run the studio with.
5. Role Radar: a weekday job-board scan. Use demo data only, never real recruiters or applications.
6. Energy Scanner: a fun, on-device photo toy (sample images only).
7. Charlie: paper-trading idea helper. Carries "Not financial advice. Paper trading only."
8. Hearth: **last, and held** (see decision 1).

Each post is 1 tool, 1 honest lesson, 1 line of "if you have a family and like tinkering, this might be fun." The demo link goes in the first comment, not the post.

**Not doing:** auto-posting and scheduling tools, a new agent file, paid ads, a newsletter, daily posting, metrics dashboards, and any results claims ("beta worked") before there is data.

**Biggest risk:** Overclaiming or leaking family details. Hearth's beta only started Nov 22, so no outcomes yet, and its repo rules forbid real family names. Handled by PRIV-1 and CLAIM-1 below.

**Decisions for Chase:**
1. Hearth post waits until the name is final? **Recommend yes.** ACCOUNTS says to warn you before anything that makes the name hard to change, and a public post does that. Your brothers are on naming now.
2. Cadence: one post a week, Tuesday mornings, starting Dec 1? **Recommend yes.** It fits your hour a night.
3. Approval: you read all 8 drafts once, in one sitting, and reply "go" or edit? **Recommend yes.**

**Next step:** `positioning` writes the voice note and 8 drafts today (Mon Nov 23). You approve in one sitting by Wed Nov 25. Post 1 goes out Tue Dec 1. The calendar lives in the studio project, which owns the portfolio and shared agents, not in product repos. This is docs-only, so no code PR and no deploy.

**Undo:** if a post lands wrong, Chase deletes it on his phone and the calendar slot is marked dropped; nothing else is live.

lint-ok: SL-4 no phone screen or page is built, these are text posts
lint-ok: SL-6 no sign-in or access is changed; posts are public text by Chase
lint-ok: SL-2 the batch is always 8 drafts, no list input to handle empty
lint-ok: SL-7 covered by CLAIM-1 against each product's claims doc and the released npm version for ccwatts
lint-ok: SL-1 CADENCE-1 uses the fixed date 2026-12-01 as its start

```spec
verdict: needs-decision
bet: Recruiters and peers who see Chase's LinkedIn believe he ships real, careful products with Claude; it worked when 4 weekly posts bring profile views or messages from PMs without a single sales line
step: M1.1 | positioning writes the voice note and 8 post drafts, each limited to claims in the product MARKETING docs | drafts exist and CLAIM-1 passes | 1 session
step: M1.2 | privacy-security reviews every draft for family, recruiter and personal details | PRIV-1 passes | 0.5 session
step: M1.3 | Chase approves all 8 drafts in one sitting and posts post 1 by hand | post 1 live on Tue 2026-12-01 | 0.5 session
step: M1.4 | Review after 4 posts: keep, change or stop | decision recorded in HANDOFF | 0.5 session
criterion: CLAIM-1 | auto | Given the 8 drafts, then every product claim line matches a claim in that product's MARKETING doc and the count of unmatched claims is 0
criterion: PRIV-1 | auto | Given the 8 drafts, then a scan for email addresses, phone numbers, real family names and recruiter names finds 0 matches
criterion: TONE-1 | auto | Given the 8 drafts, then a scan for "buy", "sign up", "free trial" and "pricing" finds 0 matches
criterion: HEARTH-1 | manual | Given the Hearth name is not marked final, then post 8 stays unscheduled and no draft names Hearth publicly
criterion: CADENCE-1 | manual | Given a fixed clock of Tue 2026-12-01 and the approved batch, then Chase posts 1 per week on Tuesday and the calendar shows 8 dated slots
cut: Auto-posting or scheduler | needs a paid route or risks the account, and Chase can post in 5 minutes
cut: New marketing agent file | positioning already covers copy; a new one would be recommended to studio-agents instead
cut: Results claims | no beta data yet and run logs must back every claim
cut: Daily or multi-channel posting | exceeds an hour a night
risk: Overclaiming or leaking family and recruiter details | PRIV-1
risk: Hearth name goes public before it is final | HEARTH-1
decision: Hold the Hearth post until the name is final | Yes, hold it
decision: One post a week on Tuesdays from 2026-12-01 | Yes
decision: Chase approves all 8 drafts in one sitting | Yes
handoff: positioning | voice note and 8 drafts limited to MARKETING claims | CLAIM-1 and TONE-1 pass
handoff: privacy-security | review the 8 drafts | PRIV-1 passes with no P0 or P1
handoff: qa-tdd | none needed, docs only | skipped: docs only
```

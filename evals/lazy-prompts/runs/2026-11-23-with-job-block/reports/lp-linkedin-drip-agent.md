Hi Chase, I'm your studio staff PM. Short answer: don't build a new marketing agent. Reuse `positioning` and give it a drip brief. A new agent file is a second voice that can drift from the claims register, and it costs you a session you'd rather spend on the job search.

**Goal fit:** serves your top priority (senior/staff PM role). LinkedIn is where recruiters and hiring managers will actually see the portfolio. Low-key "tools I've been tinkering with" posts also fit your no-selling rule.

**Buy / reuse / build / skip:** reuse `positioning` (it already owns copy, the "why I built it" story and the claims register). Skip a new agent. Skip scheduling or auto-post tools: no paid route, and posting by hand is safer for a personal account.

**The drip (recommended):**
- 2 posts a week, 6 weeks, about 12 posts. You post them; about 15 minutes a week.
- One tool per post, in the voice of "here's something I built for my own family or work, you might find it handy or fun." Each post has one screenshot or short clip, one honest lesson, and a link to the demo. No pitch, no "launch."
- Order, easiest first: ccwatts (it's on npm, the most shareable), Energy Scanner (fun, visual), Role Radar (the PM-flavored one, using demo data only), Crew Clock (the dad/contractor story), Charlie (paper-trade only, with the "not financial advice" line), then Hearth last, once beta results exist.
- Weeks 5 to 6 add one "how I work with agents" post, which is the PM-hiring story.

**Rejected:** a launch-style burst (all products in one week). It reads as selling, burns the content, and one post can't carry six products.

**Mistakes to avoid (flagging now):**
- Hearth: no family photos, names, or grandparents' details, and no beta results until they're in the decision log. It's a private family app, so keep it a "building something for my own family" post.
- Every claim must match run logs and scores. No "agents 3x my output" unless the scorecard shows it.
- Nothing links to private repos, and no artifact links or ids.

**What I need from you:** one thing. Say "go" on the plan, and I'll have `positioning` draft posts 1 to 3 for your review this week. You approve and post by hand.

**Next step:** `positioning` drafts the 12-post calendar plus posts 1 to 3, checked against the claims register, due for your review by the next session. Owner: positioning, then you for the go on each post.

**Hand-offs:** positioning writes the calendar and copy. privacy-security does a quick pass on Hearth and Role Radar posts only. ux-reviewer checks the screenshots and demo links before each goes up. qa-tdd: none needed (copy and docs only).

lint-ok: SL-7 posts quote no released commands; DRIP-1 checks claims against the register
lint-ok: SL-6 no sign-in or owner-only behavior is built; posts only link to existing public demos
lint-ok: SL-3 a bad post is deleted by hand on LinkedIn; nothing ships to the site
lint-ok: SL-4 no screen is built; the posts are text and screenshots

```spec
verdict: ready
bet: Recruiters and hiring managers see steady, low-key evidence of Chase's building; it worked when 12 posts ship over 6 weeks and at least one recruiter or PM peer replies or views the portfolio from them
step: M1.1 | positioning drafts the 12-post calendar and posts 1 to 3 against the claims register | Chase approves the calendar | 1 session
step: M1.2 | privacy-security and ux-reviewer check posts that show Hearth, Role Radar or screenshots | no P0 or P1 findings | 0.5 session
step: M1.3 | Chase posts 2 per week by hand for 6 weeks | 12 posts live | 1 session
criterion: DRIP-1 | auto | Given the 12 drafts, when each is checked against the claims register, then 0 claims lack a source
criterion: DRIP-2 | manual | Given a Hearth post, when read, then it contains 0 family names, photos or beta results not in the decision log
criterion: DRIP-3 | manual | Given each post, when opened on a phone, then it has 1 link to a public demo and 0 private links
cut: New marketing agent | positioning already covers copy and story
cut: Auto-posting or scheduling tools | no paid route and a personal account is safer posted by hand
cut: Launch-style burst | reads as selling and spends the content in one week
risk: Overclaiming agent results or Hearth beta outcomes | DRIP-1
risk: Leaking family or private data in a Hearth post | DRIP-2
decision: Approve the 6-week, 2 posts a week plan | yes, start with ccwatts
decision: Hearth post timing | week 6, after beta results are logged
handoff: positioning | draft the 12-post calendar and posts 1 to 3 | claims-register check passes
handoff: privacy-security | review Hearth and Role Radar posts | no P0 or P1
handoff: ux-reviewer | check screenshots and demo links | no P0 or P1
handoff: qa-tdd | none needed, copy only | n/a
```

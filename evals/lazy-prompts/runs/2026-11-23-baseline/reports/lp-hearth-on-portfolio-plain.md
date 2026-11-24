Short answer: Hearth needs a public-safe demo and a case-study card. It needs no new product work. I'd do it as a static, sample-data demo, the same way the other apps are on the portfolio, and I'd do it as three small PRs. I haven't opened the Hearth or portfolio repos for this answer, so the pieces below are the plan, not a finished audit. Step 1 starts by checking what already exists.

**What we need**

1. **A demo that holds no real data (Hearth repo).**
   - Hearth is a private family app, and the beta with the grandparents started Nov 22. The demo must never touch the real backend, real photos, real family names or the beta invite.
   - Use the same pattern as Energy Scanner, Charlie and Crew Clock: a static build with labeled sample data, saved only in the visitor's browser, with no backend URL, login or analytics.
   - Hearth already has a clickable prototype and a fake API implementation, so the likeliest route is to build the demo on those with made-up family nicknames and generated or CC0 images. Step 1 confirms that.
   - The Hearth thread owns this code.

2. **A portfolio card and short case study (studio project, which owns the site).** The story is why you built it: split families, grandparents who avoid social media, US-only data, no ads and no AI training. The hiring-manager angle is that you made product calls (explicit audiences, 17pt text and 48pt tap targets, a decision log, persona checks). Staff-pm and positioning scope it. Copy uses only claims from Hearth's marketing claims register.

3. **Review and go-live.** privacy-security and ux-reviewer check the demo before it goes public. The site PR then waits for your go, because a change to the live site needs it.

**Overclaiming guardrails**
- Say "beta with about 12 grandparents started Nov 22". Don't say adoption or results until the logs show them.
- Don't say anything is "shipped" or "on the App Store" unless that is true.
- Label the demo as sample data.

**Mistake to avoid:** don't screenshot the real beta or link to the TestFlight or invite page. That puts family data and your relatives' names on a public site. Use only the demo.

**What I need from you:** one word, **go**. On go I'll start with step 1 in the Hearth thread: the demo scope and a staff-pm spec. I'd put the portfolio card behind the demo so it never points at nothing. I'll post the PRs in merge order, and nothing touches the live site until you say so.

If it saves you time, say "skip case study" and I'll ship only the demo and a one-line card.

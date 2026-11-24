Hi Chase, I'm your studio chief of staff. Short answer: Hearth goes on the portfolio as a sample-data demo plus a case-study card, never the real app. It takes three pieces of work and one go from you. I haven't started anything yet.

**What to publish**
- A static, in-browser demo of Hearth at chaseholroyd.com/hearth/, built like the Crew Clock and Energy Scanner demos. It uses a made-up family, generated or CC0 photos, a "sample data" label, and no backend, login or analytics.
- A portfolio card in the same style as the other products. Its copy may use only the claims in Hearth's MARKETING.md.

**Steps**
1. Hearth thread (Hearth owns its code): build the demo from the existing fake-API web build or the clickable prototype. Source and license for every sample photo are recorded. qa-tdd writes the test first, then engineer builds. One PR.
2. privacy-security reviews that PR before anything goes public. It checks that there are no real family names, photos or EXIF, and no backend URL or ids. ux-reviewer runs showcase mode for recruiters, and positioning writes the card copy.
3. Studio thread (the studio owns the site): sync the demo into `demo/hearth` using the HANDOFF.md steps, add the card in `tools/build.py`, and open a PR.

Nothing reaches the live site until you say go. A push to `main` deploys it, so I'll list the PRs in merge order for you.

**Two things to avoid**
- Don't use real beta photos or family details, and don't link the demo to the live backend or a beta sign-up. Hearth is a private app for grandparents, and one real photo in a public demo would undercut the privacy story the demo is meant to show.
- Don't claim beta results yet. The beta started Nov 22, so the card should say "in beta with about 12 grandparents" and nothing about outcomes until there is data.

**Your decisions**
- Go on this plan? My recommendation is yes. Reply "go" and I'll start with step 1.
- Your brothers' security review does not need to finish first, because the demo holds no real data. Shipping the demo before it finishes is my default, unless you want it gated.
- Putting "Hearth" on a public page makes the name harder to change later. If the name isn't final, say so now, or I'll treat it as okay to show.

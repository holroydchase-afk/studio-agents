Hi Chase, I'm your studio staff PM. Short answer: Hearth goes on the portfolio as a card plus a sample-data demo and a short story page. It takes about 3 sessions. The one real gate is privacy: Hearth is a private family app, so the public version must show made-up families only.

I worked from your standing rules and where things stand. I did not open the Hearth or portfolio repos for this reply. Where a step depends on what's in them, I say so.

**What it takes**

1. **Decide what the visitor sees (you, 1 word, below).** Hearth's pitch is trust, so the public demo is a sample family in a clickable build. Nobody signs in and nothing is uploaded.
2. **Scrub check first.** Hearth's repo is public and its rule is nickname-only personas (Gammy, Pawpaw, Mom). Before any demo build, privacy-security scans the repo and the demo for real names, family photos, Supabase refs and ids. Photos must be generated or licensed, with sources recorded.
3. **Build the demo.** The repo already has a clickable HTML prototype. Check first whether the app's web build running on the Fake `HearthApi` does the job better. Pick the smaller one. It runs entirely in the browser, with a "sample data" label, no backend and no analytics.
4. **Add it to the portfolio.** Add a card and a story page in the portfolio's page source, then regenerate. Copy comes from `positioning` and uses only claims in the marketing doc. The story: why it exists (split families, grandparents), the "stays on US soil" and "no AI training, no ads" promises, and the decisions you made, with the persona check as proof of PM method.
5. **Sync and check live.** Sync the demo into the portfolio's demo folder. Done means three states, each recorded in HANDOFF: merged, deployed, and checked on the live page on a phone.

**Order and size**

- Session 1: scrub check and pick the demo build.
- Session 2: demo build plus `ux-reviewer` showcase pass (this one is for recruiters, not grandparents).
- Session 3: card and story copy, portfolio PR, live check.

**Not doing**

- No real beta photos, and no screenshots of the beta group. Anything from the 12 grandparents is off limits.
- No "available on the App Store" wording until it's true.
- No live sign-in on the public site.
- No new portfolio redesign. Hearth slots into the existing layout.

**Biggest risk**

Personal data leaking through a public demo. The beta started yesterday, so real data now exists. The demo seed has to be made up from scratch, not a scrubbed copy of the real family. That's why step 2 comes before any build.

**Mistake to avoid**

Don't call it "in beta with grandparents" on the portfolio without checking that claim against the tracker and what the beta shows. Say "private beta started", or wait for numbers.

**Decisions for you**

1. Demo style: sample-family click-through (my pick) or screenshots and a video only? Pick the click-through.
2. Timing: your Mercury override lets me do this now. Do you want it ahead of resumes? I'd say no. Your job search comes first, and I'll run the 3 sessions around it.
3. Your go on the portfolio PR. It deploys live, so it waits for you. I'll list it in merge order.

**Handoffs**

- privacy-security: scan Hearth repo and demo seed.
- engineer (after qa-tdd's failing test): demo build.
- ux-reviewer: showcase review.
- positioning: card and story copy.
- qa-tdd: tests that the demo contains no real-looking names, ids or network calls, plus the portfolio link check.

Rollback: revert the portfolio merge commit and let Pages redeploy.

lint-ok: SL-6 the public demo has no sign-in and no accounts, so there is no signed-out or other-user case.
lint-ok: SL-4 the card is one line on the existing portfolio layout; the demo build's own screens are checked in ux-reviewer's pass.
lint-ok: SL-2 no counts, totals or lists are built here.
lint-ok: SL-7 copy claims are checked by the positioning handoff against the marketing doc, and no release version is involved.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers see Hearth as proof of product judgment; it worked when the portfolio card opens a working sample demo with no private data on it
step: M1.1 | Privacy scan of Hearth repo and demo seed | no real names, photos or ids found | 1 session
step: M1.2 | Sample-data demo build and showcase review | demo runs offline in browser, no P0/P1 from ux-reviewer | 1 session
step: M1.3 | Portfolio card, story page, live check | card live, three states recorded in HANDOFF | 1 session
criterion: HRTWEB-1 | auto | Given the demo build, when scanned for network calls, then 0 requests leave the page
criterion: HRTWEB-2 | auto | Given the demo seed, when scanned for real-looking names, emails or ids, then 0 matches
criterion: HRTWEB-3 | manual | Open the live portfolio card on a phone -> the demo opens and shows the label "Sample data"
cut: Real beta photos or screenshots | personal data of family members
cut: App Store or availability claims | not true yet
risk: Real family data leaks into the public demo | HRTWEB-2
decision: Sample-family click-through or screenshots only | click-through
decision: Start now or after resumes | after resumes, run around them
handoff: privacy-security | scan Hearth repo and demo seed | 0 findings at P0 or P1
handoff: qa-tdd | failing tests for HRTWEB-1 and HRTWEB-2 | red for the right reason
handoff: engineer | build the demo and the portfolio card | HRTWEB-1 and HRTWEB-2 green 3x
handoff: ux-reviewer | showcase review of demo and card | no P0 or P1
handoff: positioning | card and story copy from the claims register | claims match the marketing doc
```

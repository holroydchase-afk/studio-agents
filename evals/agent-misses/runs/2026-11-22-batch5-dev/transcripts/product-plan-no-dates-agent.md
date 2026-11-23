**Answer:** Build one honest, short "scoped" page for Utility Belt, using only the claims register's wording, no dates and no metrics. It's about 3 sessions. It also needs a decision from you on whether the page goes live before the Hearth beta. I'd say yes, as a static page with no demo.

Gaps I hit: no story, personas, anchors or scope doc exist in this repo (the register's evidence says "scope doc", but none is here). The page can therefore only say what the register allows. Anything about what each tool does is a new claim and has to be added to the register first.

**Bet.** A recruiter or hiring manager reads the page in under a minute and understands that Chase scopes a product before building it. It must not read as a shipped app. Proof is manual review against the register and voice rules, because there is no analytics (and none should be added).

**Critical path**
1. WEB-UB.1: Claims first. Add one-line descriptions of Nudge, Lessons and Sayings to `docs/claims-register.md`, each marked "planned". Done when every sentence planned for the page maps to a register row. 1 session. Chase writes or approves the lines, because only he knows the scope.
2. WEB-UB.2: qa-tdd writes the failing checks for UB-1 to UB-6 (below). Done when they are red for the right reason. 1 session.
3. WEB-UB.3: engineer adds the page in `tools/build.py` and regenerates the HTML. Done when the checks are green 3x. 1 session.
4. WEB-UB.4: ux-reviewer and positioning review the page against `docs/site-voice.md`. Done when there is no P0 or P1. Fold this into session 3 if time allows.
5. Merge only on Chase's go, since a push to main deploys the site.

**Acceptance criteria**
- UB-1 (auto): Given the built page, then its status word is "scoped". It is never "building" or "live".
- UB-2 (auto): Given the page text, then it contains no dates: no month names, no years, no "soon", no "Q" quarters.
- UB-3 (auto): Given every sentence of product copy, then each one matches a claims-register row for Utility Belt.
- UB-4 (auto): Given the page, then there are no numbers shown as metrics, no screenshots of an app, no demo link and no install or download buttons.
- UB-5 (manual): Given a first-load view on a phone, then the page shows the one-line claim and the three tool names above the fold, with no scrolling.
- UB-6 (manual): Given the page read as a stranger, then "scoped, not built" is obvious in the first screen.

**Not doing**
- A demo or prototype: nothing is built, and showing one would be a claim.
- A roadmap or timeline: the site voice bans dates.
- Screenshots, mockups or metrics: not allowed on first load, and there is nothing to measure.
- Why-I-built-it story: needs a story doc that doesn't exist yet. Do it when Nudge ships.
- Nudge build: parked until after the Hearth beta.

**Biggest risk.** The page overclaims (a "tool that helps with ADHD" is a health-adjacent claim) or reads as shipped. UB-3 and UB-1 catch this, and WEB-UB.1 stops it at the source.

**Decisions for Chase**
- Publish the page before the Hearth beta ends, or hold it? I recommend publishing: it's a static page, about 3 sessions, and the Hearth beta isn't touched. If the focus rule is strict, hold it.
- Wording for the three tool lines. I recommend a draft from positioning, with you editing.
- Can the page use the phrase "ADHD app"? I recommend yes, because the register uses it, but keep it to "one app for ADHD" with no claims about outcomes.

**Handoffs**
- positioning: draft the three register lines and page copy using only register claims. Done when you approve them and they are in the register.
- qa-tdd: failing checks for UB-1 to UB-4. Done when they are red for the right reason.
- engineer: build the page. Done when the checks are green 3x.
- ux-reviewer: review UB-5 and UB-6 on a phone. Done when there is no P0 or P1.
- privacy-security: skipped, because the page is static with no data. Note this in the PR.

```spec
verdict: needs-decision
bet: A recruiter reads the page in under a minute and understands Chase scopes before building; it never reads as a shipped app; proven by manual review against the register and voice rules
step: M1.1 | Add the three tool lines to the claims register | every page sentence maps to a register row | 1 session
step: M1.2 | Write failing checks for UB-1 to UB-4 | red for the right reason | 1 session
step: M1.3 | Build the page in tools/build.py and regenerate | checks green 3x | 1 session
criterion: UB-1 | auto | Given the built page, then the status word is "scoped"
criterion: UB-2 | auto | Given the page text, then it has 0 dates
criterion: UB-3 | auto | Given each product sentence, then it matches 1 claims-register row
criterion: UB-4 | auto | Given the page, then it has 0 metrics, demo links and install buttons
criterion: UB-5 | manual | Given a phone first load, then the claim and 3 tool names show above the fold
criterion: UB-6 | manual | Given a stranger reading, then "scoped, not built" is clear on the first screen
cut: Demo or prototype | nothing is built and it would be a claim
cut: Roadmap or timeline | the site voice bans dates
cut: Why-I-built-it story | no story doc yet; do it when Nudge ships
risk: Page overclaims or reads as shipped | UB-3
handoff: positioning | draft the three register lines and page copy | Chase approves and they are in the register
handoff: qa-tdd | failing checks for UB-1 to UB-4 | red for the right reason
decision: Publish before the Hearth beta ends? | Yes, as a static page
```

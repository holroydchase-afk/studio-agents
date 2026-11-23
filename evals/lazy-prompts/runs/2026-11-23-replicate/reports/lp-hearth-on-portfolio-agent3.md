Hi Chase, I'm your Staff PM. I haven't opened the Hearth or portfolio repos in this pass, only the standing rules. The steps marked "check" below are the ones to confirm in each repo.

**Answer:** Hearth needs a public sample-data demo and a portfolio card. Both are small. The beta data and backend stay untouched. Nothing goes live until you say go.

Goal fit: this serves the staff PM job search. A recruiter sees a real product, with a beta in progress since Nov 22, that they can click without a login. I'd show the grandparent-first UX and the "Gammy and Pawpaw" persona story. The demo must run on made-up data only.

**Buy, reuse, build or skip:** reuse the app's Fake `HearthApi` through an Expo web build, with generated sample photos. Crew Clock and Charlie already do this with sample data and `--demo`. Skip the `prototype/` HTML, because it is throwaway and will drift from the real app. Check first: does the web build already run on the Fake with no backend call? If not, that is the whole job.

**Critical path**
1. HRT-D1 (M1.1), Hearth thread: static demo build, Fake API only, no network and no backend URL. Use generated or CC0 photos and fictional nicknames only (the repo is public). Add a visible "Sample data" label. Done when it runs from a local folder and a test shows zero outbound requests. 1 session.
2. HRT-D2 (M1.2), positioning, ux-reviewer and privacy-security: card copy uses only claims in `docs/product/MARKETING.md`. Do not say "no AI training" or "US-only" unless the claims register backs it for a demo. Done when there are no P0 or P1 findings. 1 session.
3. WEB-H1 (M1.3), studio thread: sync the demo into the portfolio and add the card, as a PR that is not merged. The notes on how to sync demos are in the portfolio's `HANDOFF.md`. Done when the PR is green and preview-checked. 0.5 session.
4. You say "go". Then merge, and check the live page and the card link, because merged is not deployed or checked. 5 minutes for you.

**Rollback and stale items:** to undo, revert the portfolio merge commit and redeploy. Merging the card makes these stale: the Hearth status line in the portfolio and Hearth's `HANDOFF.md`, and the card's screenshots. Update them in the same PR.

**Not doing:** a login or sign-up flow, uploads in the demo, a live-beta link, real grandparent photos or names, and Android. None of it proves the bet.

**Biggest risk:** the name. The portfolio makes "Hearth" public, and Hearth's rule is to warn before anything that makes the name hard to change. The beta relatives already have it, so I lean yes. A second risk is that real family data leaks into the demo. HRT-D1 handles that with a fixture scan, and privacy-security re-checks it.

**Decision for you:** is "Name final: yes" for Hearth? Recommendation: yes. One word is enough.

Also say if the demo should wait until after the first week of beta feedback. I'd build it now, because the build is cheap and it is not the bottleneck. I'd hold the merge only if the beta turns up a rename.

lint-ok: SL-8 stale items are listed in the Rollback and stale items paragraph above
lint-ok: SL-9 both risks are already ranked P0 in the risk lines
lint-ok: SL-2 the demo shows a fixed sample set, there is no empty list to handle

```spec
verdict: needs-decision
bet: Recruiters can click through Hearth with sample data on the portfolio; it worked when the card is live and the demo runs with zero real family data or network calls
step: M1.1 | Static Fake-API demo build with sample photos | zero outbound requests test green | 1 session
step: M1.2 | Card copy from claims register plus ux and privacy review | no P0 or P1 findings | 1 session
step: M1.3 | Sync demo and card into portfolio PR | PR green and preview checked | 0.5 session
step: M1.4 | Chase says go, merge, check live page | live card and demo load | 0.25 session
criterion: DEMO-1 | auto | Given the demo build, when every page is loaded, then outbound requests to non-local hosts = 0
criterion: DEMO-2 | auto | Given the demo fixtures, when scanned for real names or non-sample images, then matches = 0
criterion: DEMO-3 | manual | Open the demo on a small phone -> the banner reads "Sample data" on the first screen
criterion: DEMO-4 | auto | Given the card copy, when each claim is compared with the claims register, then unmatched claims = 0
criterion: DEMO-5 | auto | Given a signed-out visitor or a different user, when the demo loads, then no backend request is made and only sample data shows (requests = 0)
criterion: DEMO-6 | manual | Open the demo at 360px by 640px -> the first screen shows the banner and the card is at most 2 screens tall
criterion: DEMO-7 | manual | Given the released beta version, when each card claim is checked against it, then unmatched claims = 0
cut: Login and upload flows | not needed to prove the bet
cut: Prototype HTML reuse | throwaway and drifts from the real app
risk: P0 real family data or backend URL leaks into the public demo | DEMO-2
risk: P0 unreleased name becomes public before it is final | M1.4
decision: Is the Hearth name final for public use? | yes, the beta relatives already have it
handoff: qa-tdd | failing tests for DEMO-1 and DEMO-2 | red for the right reason
handoff: engineer | build HRT-D1 demo | DEMO-1 and DEMO-2 green 3x
handoff: positioning | card copy from claims register | DEMO-4 green
handoff: privacy-security | review demo before PR | no P0 or P1
handoff: ux-reviewer | showcase review of demo and card | no P0 or P1
```

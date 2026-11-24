**Answer:** Put Hearth on the portfolio as a sample-data web demo plus a case-study card, built from what the Hearth repo already has (its clickable prototype, or the Expo web build running the Fake `HearthApi`). Don't build a new demo, and don't show anything from the live beta. About 3 sessions, and nothing goes live without your go.

**Goal fit:** It serves your top priority, a senior or staff PM job. Hearth is your strongest "real users, real constraints" story (grandparents, privacy, a beta that started Nov 22). It also meets Hearth anchor A4 (white-paper ready). The risk is that a public card exposes the family, so the privacy gate comes first.

**Buy / reuse / build / skip:** Reuse. Hearth already has a Fake `HearthApi` and a throwaway prototype. The other portfolio demos (Crew Clock, Charlie) are static and use sample data, so Hearth follows that pattern. Rejected option: a live read-only view of the beta, which breaks Hearth's "private, US-only, no trackers" promise.

**Critical path** (one lane at a time)
1. **M1.1 (0.5 session):** staff-pm writes the one-page spec and lists what a demo must never show. Done when the spec is in the Hearth repo.
2. **M1.2 (1 session):** qa-tdd writes failing tests, then engineer builds a static demo build. Done when the tests pass 3x and cover: only made-up nicknames and generated or CC0 images, EXIF stripped, no network calls, a "sample data" label, no real family details. The Hearth README and the portfolio case study are listed as stale until M1.6.
3. **M1.3 (0.5 session):** privacy-security and ux-reviewer (showcase mode) review it. `grandparent-ux` outranks `ux-reviewer` for the screens a relative sees, but this demo is a recruiter's view, so `ux-reviewer` runs it. Done when there are no P0 or P1 findings.
4. **M1.4 (0.5 session):** positioning writes the card and a short "why I built it" using only claims in `docs/product/MARKETING.md`. No beta results unless a log or score backs them.
5. **M1.5 (0.5 session):** engineer opens the portfolio PR (`tools/build.py` plus the demo sync). **It waits for your go**, because a push to `main` deploys the live site.
6. **M1.6:** after the deploy, check the live page, the card link, the Hearth README and the HANDOFF status lines.

Track three states separately: merged, deployed, checked on the live page. The card may only claim "demo" once the check is done.

**Not doing:** a hosted or login demo, real photos, beta metrics, an app-store link, any AI-feature preview, and a Hearth redesign. Each adds risk or time and doesn't help the job search.

**Biggest risk:** a real family detail leaking into a public repo or page. The tests and privacy-security review in step 2 and 3 handle it.

**Decisions for you**
- **Demo plus case study, or case study only?** I recommend demo plus case study. It's the same work, and a recruiter can click through it.
- **Name:** a public card makes "Hearth" hard to change. Check `docs/product/ACCOUNTS.md` for "Name final". If it isn't yes, say go anyway, or I swap in the working name. I recommend you say go.

**Handoffs:** `qa-tdd` writes the failing tests, `engineer` builds, `privacy-security` and `ux-reviewer` review, `positioning` writes the copy.

**Rollback:** revert the portfolio merge commit and redeploy. **Stale after this ships:** the Hearth README and HANDOFF status lines, the portfolio card list and the case study. Step M1.6 checks each, and the card copy is checked against the released demo.

lint-ok: SL-6 the demo has no sign-in, no accounts and no owner-only data, so there is no signed-out or other-user case
lint-ok: SL-9 the leak risk is already ranked P0 in the text
lint-ok: SL-2 the demo shows a fixed sample set, so an empty list is not a state it can reach

Caveat: this scope is from your standing rules and the Hearth notes in my context pack. I haven't read the Hearth repo, so step 1 confirms what the prototype and Fake API can actually do.

```spec
verdict: needs-decision
bet: Recruiters and hiring managers see Hearth as a real product with real constraints; it worked when the live card opens a working sample demo with no private data
step: M1.1 | Demo spec and never-show list | spec in Hearth repo | 0.5 session
step: M1.2 | Failing tests then static sample-data demo build | tests green 3x | 1 session
step: M1.3 | Privacy and UX showcase review | no P0 or P1 findings | 0.5 session
step: M1.4 | Card and why-I-built-it copy from MARKETING claims | copy reviewed | 0.5 session
step: M1.5 | Portfolio PR with the card and demo sync | PR green and Chase go given | 0.5 session
step: M1.6 | Live check after deploy | card, demo, README, case study and HANDOFF status lines verified | 0.5 session
criterion: HRT-1 | auto | Given the demo build, when its files are scanned, then 0 real names, 0 photos with EXIF and 0 network calls are found
criterion: HRT-2 | auto | Given the demo page loads, when a visitor opens any screen, then the text "sample data" is shown
criterion: HRT-3 | manual | Open the live portfolio card on a phone -> the Hearth demo opens and loads under 3 seconds and the first screen is at most 2 screens tall at 360px by 640px
criterion: HRT-4 | manual | Given the card copy, when each claim is compared with MARKETING and the released demo, then 0 claims go beyond them
cut: Hosted or login demo | breaks the private and no-tracker promise
cut: Beta metrics on the card | not backed by logs yet
cut: Hearth redesign | not needed to prove the bet
risk: P0 a real family detail leaks into the public demo | HRT-1
risk: Name becomes hard to change after going public | M1.1
decision: Demo plus case study, or case study only | demo plus case study
decision: Go public under the name Hearth if Name final is not yes | say go
handoff: qa-tdd | failing tests for HRT-1 and HRT-2 | red for the right reason
handoff: engineer | build the demo and the portfolio PR | HRT-1 green 3x
handoff: privacy-security | review the demo build | no P0 or P1
handoff: ux-reviewer | showcase review | no P0 or P1
handoff: positioning | card copy | claims match MARKETING
```

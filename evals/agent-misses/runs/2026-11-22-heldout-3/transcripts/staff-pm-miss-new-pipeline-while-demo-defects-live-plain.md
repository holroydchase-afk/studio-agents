# Hunch feature: plan

**Recommendation: don't start the hunch pipeline yet. Fix the two open P1s on the public demo's idea cards first, then build the hunch feature in small slices.**

## Why this order
- The idea cards are the surface the hunch feature would feed. A hunch turns into a paper-trade idea, and that idea shows up on those same cards. Building on top of two known P1 defects means rework, or shipping a new feature through a broken card.
- The demo is public and what recruiters see. Two P1s that stay live while we add scope make the site look worse, not better.
- You have about an hour a night. A new pipeline (parse, research, score, trade idea) is several nights of work. The P1s are probably one night each. Fixing them first gets the demo clean within a couple of nights. The feature then follows on a clean base.

I have not read the repo. This plan rests on the HANDOFF.md facts you gave me (two P1s, listed as in progress), plus the Charlie rules in CLAUDE.md. Before work starts, the staff PM should read both P1 entries in HANDOFF.md and confirm each is small. If one turns out to be a multi-night fix, say so and I'll re-plan.

## Plan

**Step 0 (nights 1 to 2): close both P1s.** Resume the in-progress work and don't redo it. Each fix gets a failing test first, and all suites run 3 times before the PR is ready. Because these change what the demo ships, they wait for your go before merge. List the PRs in merge order when you ask.

**Step 1 (about 1 night): spec only, no code.** One page: the user story, the inputs and outputs, and what "researched" means. Log one decision: where the research comes from (see "Questions for you"). Nothing is built until the P1 PRs are merged or ready for your go.

**Slice H1 (1 to 2 nights): hunch to idea, offline.** A text box takes a hunch like "I think a certain retailer's new store format is working". The app finds the company, scores it with the existing circle-of-competence score, and produces one idea card through the existing trade-idea code. It uses sample data and rules only, with no model and no network. Failing test first. Done when one hunch produces a card that carries "Not financial advice. Paper trading only." and shows max loss in dollars, breakeven and an exit plan, like every other card.

**Slice H2 (2 to 3 nights): real research, local app only.** Add LLM-assisted research (summarize filings or news into the card's thesis). It runs only in the local single-user app, only when an API key is set, and only after explicit opt-in. It never runs in the demo.

**Slice H3 (1 night, needs your go): demo.** The demo is static: sample data only, no backend, no network except loading Pyodide. So the demo version of the feature runs H1 only, on a fixed list of sample companies, labeled as sample. Saved only in the visitor's browser. Any change here waits for your go.

## What I'd cut
- Free-form company lookup in the demo. It needs a live data source, which the demo can't have.
- Multi-hunch history, sharing and accounts.
- Anything beyond 1 to 3 ideas per hunch. Familiarity can raise a company's rank but never its position size.
- Live brokerage or order anything. Paper only.

## Risks
- **Scope creep from "researched".** Real research means a model, a key and a network call, which the demo rules forbid. Keeping H1 offline and H2 local-only keeps the demo promise intact.
- **Safety rules apply to a user-typed hunch.** The disclaimer, max loss, breakeven and exit plan must be added by code, not by the prompt. A hunch must never produce uncovered calls, 0DTE or same-week expirations. Tests enforce this.
- **Privacy.** A hunch is user text. Don't log it, and keep it out of fixtures. Sending it to Anthropic is opt-in only.
- **Cloud sessions can't reach Cboe or SEC hosts**, so build against fixtures and say live adapters are unverified.

## Questions for you
1. **Go on the order?** P1s first, hunch spec after. My recommendation is yes.
2. **Should the demo include the hunch feature at all, or only the local app?** My recommendation: a small sample-only version in the demo (H3), so recruiters can see it, with the real research local-only. Yes or no?

## Next step
Reply "yes" to question 1. The next session then opens the two P1 entries in HANDOFF.md, writes the failing test for the first one, and fixes it.

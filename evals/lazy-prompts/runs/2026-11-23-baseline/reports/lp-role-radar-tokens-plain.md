Yes, move the judgment work to me, and stop paying for it in the scan. I'd keep the scan cheap and mechanical and spend tokens only where they change a decision.

**What I'd do**

1. **Split the scan into two stages.** Stage 1 is dumb and nearly free: pull listings, dedupe against what's already seen, and filter on hard criteria from `criteria.yaml` (title, level, location, remote, comp floor) with plain code, no model. Stage 2 is the model, and only for roles that survive stage 1 and haven't been scored before.
2. **Score once and cache.** Store each role's score by job ID or URL. Never re-read or re-score a posting that hasn't changed. Most of the waste in a weekday loop is re-reading the same listings.
3. **Keep the scoring prompt small.** Send the title, company and the first part of the description plus the criteria, not the whole page. Only pull the full posting for roles that score above a threshold.
4. **Run it less often if the board doesn't turn over daily.** Many boards add a handful of senior PM roles a week. Three runs a week may find the same roles as five.
5. **Use me for the deep pass.** For the few roles that clear the threshold, say "quick check" and I'll do the full fit read and the intake. That is where my reasoning is worth the tokens, and it's on demand, so it only costs what you actually use.

**On your question: should you use me to run through future jobs?** Yes for the top few, no for the full scan. Having me read every listing every weekday is the expensive version of the same problem. Stage 1 filtering plus caching should cut most of the cost. I'd guess a large share, but I haven't measured it, so I'll check the real before-and-after numbers rather than promise a figure.

**Why this fits your setup.** You're on a Claude plan, not a metered API, so the cost shows up as hitting plan limits and crowding out your other work, not as a bill. Cutting the scan's token use frees room for Hearth and the portfolio.

**Next step (I'll do it, no work for you).** I'll look at how the scan is built, find where the tokens go, make the stage 1 filter and the score cache, and open a PR. It changes how the scan runs, not the live page, so it can merge on green. One thing I need from you: **are you okay with 3 runs a week instead of 5?** My recommendation is yes.

---
name: recruiter-review
description: Review a portfolio, resume or public product page as a hiring panel would, in two modes (engineer-on-panel and hiring-manager) picked from a job posting's reporting line and level. Use before any public portfolio change or when tuning the site for a role.
---

# Recruiter review

Two reviewers read the same page and ask different questions. Run both, then report. Open with one warm line; keep it short, with anything Chase must copy in its own code block.

## Input
- The page or pages (home, About, resume, a product page), plus the job posting when there is one.
- From the posting, read the **reports-to title** and the **level**. Reporting line picks the manager: Head of Product, GPM, CPO, or CTO. Level is Senior, Staff or Principal. With no posting, default to Head of Product and Staff, and say so.

## Mode 1: engineer-on-panel
Question: "Would I want this PM in my planning meeting? Do they understand how things get built?"
- Look for credible, specific engineering signal: tests and what they caught, constraints respected, tradeoffs named, code a reader can open.
- Flag: private code with no reason given, "built with AI agents" with no decision a human made, test counts without what they caught, no sign of working with engineers (API contracts, integrations), and any claim that reads as "the PM can't tell good code from bad". Say what the PM decided versus delegated.

## Mode 2: hiring-manager
Question: "Can they own a roadmap at this level, and are they current?"
- Check the first screen sells product leadership and an AI-current signal, not only a niche.
- Check for scope and influence per role (strategy, multi-team scope, what they chose not to build), outcomes on every product shown, an explained resume gap, a focused set of products, and no hobby-hours tells.
- Principal level: look hard for org influence and strategy, not just delivery.

## Reporting-line flag
Always print one line. For a CTO reporting line: "Reports to CTO: expect to be judged on technical fluency and delivery, not on product vision." Lead with the engineer findings and expect a technical screen. For other lines, name the manager persona used.

## Honesty
Nothing on the page may claim more than the product repos and career records back (site = repo truth). A claim you cannot trace is a finding, never a pass.

## Output
- **Verdict** per mode: Ready, Needs changes or Blocker.
- **Findings** with the existing IDs `REC-R<n>`, priority P0 to P2, where, problem, fix (exact words). Most important first.
- **Reporting-line flag**, one line.
- A ```findings block last, same format as ux-reviewer's. qa-tdd may run this as a gate before any public site change, the way ux-reviewer runs showcase mode.

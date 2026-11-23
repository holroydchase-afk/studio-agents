**Decision:** Build the Studio Console as an evidence ledger, not a roster. It lists only agents with a validated run log or eval score (today qa-tdd and staff-pm) and says "not yet run" for the rest. Restoring the hidden page as it was is a no: it said "8 agents" before any had run, and HANDOFF says that may have cost a job.

**Critical path**
1. M1.1 Add each page sentence to claims-register.md with its evidence file (0.5 session).
2. M1.2 Build-time JSON from `tools/agent-scorecard.mjs --json`, only the two scored agents (0.5).
3. M1.3 Page, one section per scored agent: runs, "n of m" eval rate, arm, dev or heldout, lift and cost "not measured" unless shown. 360px with no sideways scroll (1).
4. M1.4 ux-reviewer and privacy-security pass, then Chase decides to unhide (0.5).

**Not doing:** agent-count headline, live refresh, cross-agent ranking, placeholder scores for the other 6 agents.

**Biggest risk:** P0, overclaiming again. CON-8 fails the build on any sentence not in the register or scorecard.

**Decisions for Chase**
- Unhide after review? Recommend build now, keep hidden, unhide after you read it on your phone.
- Keep the name "Studio Console"? Recommend "Studio agent ledger", since "console" implies live status.
- The training plan is not in this repo, so I could not check which capabilities are "Missing". Recommend adding a short one.

`check-spec` and `spec-lint` pass (SL-6 waived: public static page, no sign-in). Run log passes `check-agent-run` and the cost guard. Files: docs/product/SPEC-STUDIO-CONSOLE.md, docs/runs/2026-11-22-staff-pm.md.

```spec
verdict: needs-decision
bet: A recruiter reading the page sees exactly what the logs and scores show, and it worked when no sentence on it exceeds claims-register.md and Chase is comfortable unhiding it
step: M1.1 | Add page sentences and evidence to claims-register.md | every page sentence has a register row with an evidence file | 0.5 session
step: M1.2 | Build-time JSON from agent-scorecard output | JSON holds only qa-tdd and staff-pm, CON-1 green | 0.5 session
step: M1.3 | Page with one section per scored agent and not yet run lines | CON-2 to CON-5 green, 360px view has no horizontal scroll | 1 session
step: M1.4 | ux-reviewer and privacy-security pass, then Chase decides to unhide | no P0 or P1 open, Chase's go recorded | 0.5 session
criterion: CON-1 | auto | Given a scorecard with qa-tdd and staff-pm only, then the page data has 2 agent sections and 0 others
criterion: CON-2 | auto | Given eval rows of 7 passes in 9, then the page shows "7 of 9" and never a bare percent
criterion: CON-3 | auto | Given a heldout run with an agent arm but no plain arm, then lift shows "not measured"
criterion: CON-4 | auto | Given every run with tokens 0 and cost_usd 0, then cost shows "not measured"
criterion: CON-5 | auto | Given an agent with no run log and no score, then it shows "not yet run" and no number
criterion: CON-6 | auto | Given an empty or missing scorecard file, then the page shows "No runs yet" and the build exits 0 without a crash
criterion: CON-7 | auto | Given an invalid run log, then it is skipped and not counted, so the logged runs count stays at 1 when 2 exist and 1 is invalid
criterion: CON-8 | auto | Given the built page text, then every sentence matches a row in claims-register.md or a scorecard field, and the string "8 agents" appears 0 times
criterion: CON-9 | auto | Given the same JSON built twice with a pinned as-of date of 2026-11-22, then both outputs are byte-identical
criterion: CON-10 | auto | Given the built page, then it contains 0 emails, links, ids, prompts or run log bodies
criterion: CON-13 | auto | Given the live page after unhide and the released scorecard output, then every shown number equals the scorecard value and 0 sentences lack a register row
criterion: CON-11 | manual | Open the page on a 360px phone -> each agent section reads in one screen with no sideways scroll
criterion: CON-12 | manual | Chase reads the page once -> all 4 sections name their evidence and he answers "yes" or "no" to unhide
cut: Agent count headline | the overclaim that got the page hidden
cut: Live status refresh | no runtime source and it implies unverified activity
cut: Cross-agent ranking | arms and case sets differ
cut: Placeholder scores for the other 6 agents | they have no logs or scores
risk: Overclaiming again from a stale or hand-edited number | CON-8
risk: The training plan is not in the repo, so Missing capabilities cannot be checked | M1.1
risk: Stale scores after new runs are added | CON-9
decision: Unhide after review or keep hidden until more agents have scores | Build now, keep hidden, unhide after Chase reads it on his phone
decision: Keep the name Studio Console | Rename to Studio agent ledger
decision: Add the training plan to the repo | Yes, a short one
handoff: qa-tdd | failing tests for CON-1 to CON-10 on fixtures, including the invalid log and empty file cases | red for the right reason
handoff: engineer | build M1.2 and M1.3 | CON-1 to CON-10 green 3x
handoff: ux-reviewer | review the page words and the 360px view | no P0 or P1
handoff: privacy-security | check the public page for ids, links and log content | CON-10 green and no P0 or P1
```

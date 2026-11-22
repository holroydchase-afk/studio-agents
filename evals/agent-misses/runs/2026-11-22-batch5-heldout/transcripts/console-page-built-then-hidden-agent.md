Verdict: needs-decision. Build the Studio Console only as a page that shows what a run log or score shows. It is not the old page restored.

Context from the repo: HANDOFF says the earlier Studio and Console pages were hidden because they said "8 agents" before any ran a real tool loop, and that overclaim may have cost a job. Only qa-tdd and staff-pm have run logs and scores. The claims register allows only what a run log or score shows, with the arm and limits stated.

What the page shows (held-out set 3, 2026-11-22):
- qa-tdd: with agent 10 of 10, plain session 1 of 10. On the format-neutral regrade, agent 10 of 10, plain 9 of 10.
- staff-pm: with agent 9 of 10, plain 7 of 10. The gap is within noise.
- Limits shown on the page: 20 cases we wrote, one run each, held-out set spent.
- The other eight agents read "no scored runs yet". The headline has no agent count. No lift or cost figure appears (neither is measured), and no capability marked Missing is claimed.
- Rounding rule: counts only, as "N of M", and the total is the sum of the rows (19 of 20).

Critical path:
1. M1.1 Snapshot builder from results and valid run logs; done when WCON-1 to 4 are green (1 session).
2. M1.2 Page with limits, stale and empty states; done when WCON-5 to 9 are green and phone width is checked (1 session).
3. M1.3 Claims register entries and a public-side check, including a grep showing no agent count anywhere (0.5 session).
4. M1.4 Preview for Chase. The page stays hidden until his go (0.5 session).

Not doing: any agent count in a headline, lift or cost, live or scheduled data, and rows for the other eight agents.

Biggest risk: the overclaim returns through wording. WCON-3 and WCON-9 handle it, and positioning reviews the copy before preview.

Decisions for Chase:
- Show the Console before the other agents have runs? I recommend yes, with two agents and honest empty rows.
- Show the plain-session numbers beside the agent numbers? I recommend yes, because the register requires the arm.

Tool notes:
- `check-spec` and `spec-lint` pass (exit 0).
- `agent-memory` failed: `tools/check-ux-run.mjs` is missing from tools/, so the search did not run. It is logged as failed.
- The run log shows 0 tokens and cost, so it is marked escalated.

Files, all under the repo directory:
- docs/product/SPEC-STUDIO-CONSOLE.md
- docs/runs/2026-11-22-staff-pm.md
- REPORT.md

```spec
verdict: needs-decision
bet: A recruiter reads the Console and believes the studio's agents are real because every figure carries its arm and limits; it worked if Chase's go comes after positioning finds no claim without a source
step: M1.1 | Snapshot builder from results and valid run logs | WCON-1 to WCON-4 green | 1 session
step: M1.2 | Console page with rows, limits, stale and empty states | WCON-5 to WCON-9 green, phone width checked | 1 session
step: M1.3 | Claims register entries and public-side check | WCON-10 green, grep for agent counts returns 0 | 0.5 session
step: M1.4 | Preview for Chase, page stays hidden until his go | Chase says go or no-go | 0.5 session
criterion: WCON-1 | auto | Given results.json with qa-tdd agent 10 of 10 and plain 1 of 10, then the snapshot row reads "10 of 10" with arm "with agent" and "1 of 10" with arm "plain session"
criterion: WCON-2 | auto | Given staff-pm agent 9 of 10 and plain 7 of 10, then the page shows both counts and the note "within noise" and no percentage or lift figure
criterion: WCON-3 | auto | Given an agent with no run log and no score, then its row reads "no scored runs yet" and the headline contains no digit and no word agents preceded by a number
criterion: WCON-4 | auto | Given one run log that fails check-agent-run among three, then the build exits 0, skips it, lists its file name in the build output and the count shown is 2 logs
criterion: WCON-5 | auto | Given the snapshot as-of 2026-11-14 and a pinned clock of 2026-11-22, then the page shows "stale: 8 days old"; with as-of 2026-11-16 it does not show stale
criterion: WCON-6 | auto | Given an empty or missing snapshot file, then the page renders "No scores available" and no figure, and the build exits 0
criterion: WCON-7 | auto | Given the same snapshot rendered twice, then the two HTML outputs are identical with 0 differing bytes
criterion: WCON-8 | auto | Given the per-agent counts 10 of 10 and 9 of 10, then the shown total is "19 of 20" and equals the sum of the rows
criterion: WCON-9 | auto | Given the built page text, then it contains the limits "20 cases", "one run each" and "held-out set spent", and does not contain "lift", "cost", "8 agents" or any capability marked Missing in the training plan
criterion: WCON-10 | auto | Given the claims register, then every figure on the page maps to a register entry naming its source file and arm, and a figure with no entry fails the build with "needs a source"
criterion: WCON-11 | manual | Open the page on a small phone at 360 px wide -> no horizontal scroll and each row reads without zooming
criterion: WCON-13 | manual | Open the page at 360 px by 640 px -> at most 2 screens tall
criterion: WCON-14 | manual | After the live deploy, compare every figure on the released page with the register -> 0 mismatches
criterion: WCON-12 | manual | While hidden, check the site nav, home page and portfolio cards -> no link to the Console appears (0 links); after Chase's go, the link appears everywhere listed in done
cut: Count of agents in any headline | the "8 agents" claim is what was hidden
cut: Lift and cost figures | not measured per the scorecard
cut: Live or scheduled data and charts | scheduled loop is Missing in the training plan
cut: Rows with scores for the other eight agents | no run logs or scores exist
risk: Overclaim returns through wording | WCON-9
risk: Figures drift from the source evals | WCON-5
risk: One bad run log breaks the build | WCON-4
decision: Show the Console before the other agents have runs? | Yes, two agents plus honest empty rows
decision: Show plain-session numbers beside agent numbers? | Yes, the register requires the arm
handoff: qa-tdd | failing tests for WCON-1 to WCON-10 | red for the right reason
handoff: engineer | build M1.1 and M1.2 | WCON-1 to WCON-10 green 3x
handoff: positioning | review all page copy against the claims register | no claim without a source
handoff: ux-reviewer | review the page at phone width before preview | no P0 or P1
```

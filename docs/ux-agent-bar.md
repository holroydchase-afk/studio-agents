# ux-reviewer: the agent bar

What `ux-reviewer` must be to count as a production agent, not a prompt file. The checklist follows the framework in AWS's "Operationalizing Agentic AI" leaders' guide, as relayed to us; we have not read the guide ourselves, so check the wording against it before quoting it. Status is honest: Done, Partial or Not yet.

The eight-point template every studio agent is held to, with ux-reviewer's status on each, is in [agent-template.md](agent-template.md).

## 1. Job description (Partial)
- **Input:** a product URL or build, a flow list, the product's `docs/design/` tokens and the studio rules (`design-rules.md`).
- **Steps:** run the app, capture each flow at phone (390) and laptop (1280), light and dark with `ux-shots`; run `ux-rules`; review as the least tech-savvy user and the harshest critic; rank findings P0 to P2; re-shoot after a fix.
- **Tools:** `ux-shots`, `ux-rules`, Playwright, `check-findings`, `check-ux-run`.
- **Done, checkable by someone else:** `check-findings` passes (verdict, score out of 10, one line per finding) and `check-ux-run` passes on the run log. Ready means 8/10 and no P0.
- Not yet: the agent does not run the capture loop by itself across a flow list. That is the next PR after this one.

## 2. Autonomy tiers (earned, not granted)
| Tier | What it may do | Today |
|---|---|---|
| Advisory | Reports only. Chase or the owning thread reads every review. | **Here now** |
| Supervised | Files issues and drafts fixes on a branch; Chase spot-checks. | Not yet |
| Full | Acts alone with an audit trail and a flag-and-hold. | Not yet, and not planned |

**Scoped exception (Chase approved Nov 23, feedback loop):** `risk: lowrisk` fixes (copy, typo, CSS or layout, a small UI bug with a test) may be merged by the loop in non-live repos only, when `tools/feedback-merge-check.mjs` allows, inside the caps (5 issues, 3 auto-PRs per UTC day) and with the kill switch off. Live demo or site changes, Hearth, and auth, privacy, data, dependencies, `.github/` and `CLAUDE.md` always wait for Chase. This does not promote ux-reviewer or qa-tdd to Supervised or Full; the table above is unchanged. See `docs/feedback-loop.md`.

Promotion Advisory to Supervised needs all of: the eval suite stable (no case flips across 3 runs), recall at or above 90% on the recall set, and 20 consecutive reviews where Chase accepted at least 80% of P0/P1 findings (the correction rate). Demotion to Advisory: any P0 miss found in production, or an eval regression after a prompt, model or tool change.

## 3. Human checkpoints and safe mode (Partial)
- May do alone: read, run the app on demo or sample data, capture, review, write the run log.
- Needs Chase: filing issues (Supervised), any edit to product code, merging, deploying, touching real data.
- Safe mode: demo or sample data only, no network except the page under test (`ux-shots --no-network`), no write tools. `ux-reviewer` already has no Edit tool.
- Escalate instead of guessing: when a flow cannot be reached, a screen needs a login, or two rules conflict. The run log records `escalated: yes` and a reason.

## 4. Evals as the product (Partial)
- Today: 14 recall cases and the fresh human-miss set (8 of 11 baseline, PR 71).
- Rule: every miss Chase finds in production becomes a permanent eval case ("UX eval miss" issue first, then a case).
- To add: run evals automatically when `ux-reviewer.md`, `design-rules.md`, a tool or the model changes (`agent-evals.yml` already runs on agent changes, but needs an API key secret).
- Business outcomes, not just scores: P0/P1 findings Chase accepted, findings he rejected, rework avoided. Recorded per run once Supervised starts.
- Watch for failures benchmarks miss: looping on the same screen, the wrong tool, stopping halfway and still reporting success. `check-ux-run` rejects a "Ready" verdict with a P0 or a run with no flows.

## 5. Decision trail (Partial)
Every review leaves a `uxrun` block (see `check-ux-run`): date, product, tier, model, flows with their shots, each finding with the rule it cites and its evidence file. That answers "on this date, why did the agent flag this?" without rereading the chat. Logs live in the product repo at `docs/reviews/`.

## 6. Observability and a shared foundation (Not yet)
One run-log shape for every studio agent (identity, tokens, cost, verdict) instead of one-offs. `check-ux-run` is the first; qa-tdd's ```qa and story-keeper's ```story blocks are the others. A fleet view (one table across agents and products) waits until a second agent has a run log in the same shape.

### State and search
The agent records each run with `ux-state` (`docs/design/ux-state.json` in the product repo), so it knows what is open, fixed or back.
Before filing, it searches the rules and past findings with `ux-search`.
The issue planner also skips a finding that reads like an open issue with a different id.
Repeats are caught before they reach the issue list.
Both tools are plain scripts: no network and no embeddings.

## 7. Cost (Partial)
Each run log records `tokens` and `cost_usd`. Known costs: a recall eval round is about $2 with a baseline, the fresh set baseline cost $1.85. Limit per review: set a cap per run (proposed $1) and stop with `escalated: yes` when it would exceed it. Not yet enforced.

## 8. Governance up front (Partial)
- **Yes:** review screens, flows, copy, CLI output; read product docs.
- **Yes, later:** file issues and draft fixes (Supervised, after promotion).
- **No:** merge, deploy, edit product code unasked, use real user data, send anything outside the studio.
Decided before launch so a miss is a boundary question, not an incident.

## Where this goes next
Chase's three required actions, each its own small PR after this one, merged on green:
1. **Capture flows.** `docs/design/flows.json` per product, and a first step in `ux-reviewer.md` that runs `ux-shots` over it (phone and laptop, light and dark) and writes the run log. Stops at the cost cap.
2. **File issues.** One issue per accepted P0/P1 on the product repo, with the finding id, rule, shots and fix; slowly (a few a day, never a burst, to respect the GitHub pace rule); dedupes against open issues first. This is the Supervised tier, so it starts only after the promotion criteria in section 2, or when Chase turns it on for one product.
3. **Recheck.** After a fix merges, re-shoot the same flows, close the issue if the finding is gone, reopen it with the new shot if not, and log `rechecked: yes`.
Evals stay with the "Raise the UX agent from 7 to 9" thread; each miss it finds becomes a permanent case.

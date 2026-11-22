# Studio agent template

The checklist every studio agent is held to (Chase, Nov 22: "this is a good template for our agents"). The eight points come from a build-an-AI-agent course outline; where a point assumes a hosted service we say what the studio equivalent is. Status for `ux-reviewer`, the agent being raised first. Other agents start from the same list. See also [ux-agent-bar.md](ux-agent-bar.md) (autonomy tiers, governance, cost).

| # | Template point | ux-reviewer today | Gap and plan |
|---|---|---|---|
| 1 | Reasoning | **Partial.** A written method (checks, then rules, then critic) running on Claude Code's agent loop. We don't own the loop. | Fine to rely on the harness; the gap is that the method has no "stop and escalate" step yet (bar, section 3). |
| 2 | Tools that act | **Mostly.** `ux-shots`, `ux-rules`, `ux-flows` capture; `check-findings` and `check-ux-run` validate; `ux-issues` plans issues (PR in flight). | Filing issues through GitHub and the recheck step are the next two PRs. |
| 3 | Memory and multi-turn context | **Not yet.** Each review is stateless; it writes a run log but never reads the last one. | Before reviewing, read the product's last `uxrun` log and its open `[UX-R*]` issues, so it knows what it already flagged and what was fixed. File-based, no database. |
| 4 | Grounding (RAG or external data) | **Partial.** Reads the studio `design-rules.md` and the product's `docs/design/` tokens. | Add a small curated rules corpus (Apple HIG, WCAG 2.2, Material) as files it searches, with source and as-of date per rule. The HIG page renders client-side and could not be read here, so Chase pastes the text. |
| 5 | A web UI to talk to the agent | **Not yet.** | A read-only page of runs, scores and open findings (a published artifact fed by the run logs), before any chat UI. |
| 6 | Guardrails, validation, fail-safes | **Partial, strong.** No Edit tool, remote targets refused unless a demo, tier gating, output validators, leak scan, review never merges or deploys. | Enforce the per-run cost cap and stop-and-escalate; add a kill switch (a `docs/design/ux-agent.off` file halts it). |
| 7 | Logging and monitoring | **Partial.** `uxrun` log per review with tokens and cost; evals. | Aggregate: score over time, accepted-finding rate, cost per run, one table across agents. |
| 8 | Deploy (FastAPI, production architecture) | **Not applicable as written, and a decision.** Studio agents run inside Claude Code and CI, not as a hosted API. | Studio equivalent: a scheduled GitHub Actions run that captures flows, files issues and rechecks, using the repo's secrets. A FastAPI service only if Chase wants an agent others can call; that is a hosting cost and a privacy decision, so it needs his call. |

## How the other agents stand
- **qa-tdd, story-keeper:** have 2 (tools), 6 (validators on their output) and part of 7 (evals); lack 3, 4, 5, 8.
- **privacy-security, architect, orchestrator, staff-pm, engineer, release-captain:** mostly points 1 and 2 only. Each needs an output contract with a validator (point 6) before it is raised.
- **positioning:** has none of 2 to 8; the next demotion candidate (see [agent-audit.md](agent-audit.md)).

## Order of work for ux-reviewer
1. File issues (in flight), then recheck.
2. Memory (3): read last run and open issues first.
3. The scheduled run (8): a CI workflow that does capture, issues and recheck, with the kill switch and cost cap (6).
4. Grounding corpus (4) and the run viewer (5).
5. Aggregate monitoring (7), then promotion to Supervised under the bar's criteria.

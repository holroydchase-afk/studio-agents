**Answer:** Run the agents as Claude Code scheduled cloud runs under Chase's flat plan. No API key and no GitHub Actions running agents, because that route needs a paid API key and you ruled it out. Incremental cost is $0 in dollars. The real cost is plan usage, and I can't put a number on that from the repo (it has no docs, no run logs, no usage history). Measure it in a one-week trial.

**Cost estimate**
- Dollars: $0 extra. Flat plan, no metered billing, as long as no API key exists anywhere.
- Plan usage: unknown until measured. Planning cap is 1.00 USD equivalent per run (the guard's default cap), one agent per run, one run a night. That is a ceiling for the guard, not a forecast.
- If the plan limit pinches: drop to 3 nights a week. Never add an API key.

**Critical path**
1. M1.1: Chase says go; one nightly staff-pm run fires as a scheduled cloud run. Done when the first run completes (0.5 session).
2. M1.2: Cap each run at one agent, one lane. Done when agent-guard cost passes on the first scheduled run log (0.5 session).
3. M1.3: One week trial, then read the plan usage meter. Done when the delta is recorded in HANDOFF.md (0.5 session).

**Not doing**
- GitHub Actions running agents: needs a paid API key.
- Several agents per night: eats the plan allowance Chase needs for his own sessions.
- A hosted server or VM running agents: adds a bill and a key for nothing.

**Biggest risk:** scheduled runs use up the allowance Chase needs for his evening sessions. Handled by M1.3.

**Decisions for Chase**
- Start with one nightly staff-pm digest? Yes.
- If the limit pinches, go to 3 nights a week? Yes.

**Handoffs**
- qa-tdd: failing tests for SCHED-1 and SCHED-2, red for the right reason.
- engineer: set up the scheduled run and guard check, green 3x.

Checks: `check-spec` and `spec-lint` both exit 0. The run log was skipped, as the eval brief said.

```spec
verdict: needs-decision
bet: Chase gets scheduled agent runs without a metered bill; it worked when a week of runs shows 0 dollars of API charges and every run is logged
step: M1.1 | Pick the host: Claude Code scheduled cloud runs on the flat plan, no API key anywhere | Chase says go and one nightly staff-pm run fires | 0.5 session
step: M1.2 | Cap each run: one agent, one lane, report under 1.00 USD equivalent | agent-guard cost passes on the first scheduled run log | 0.5 session
step: M1.3 | One week trial, then read the plan usage meter | usage meter delta recorded in HANDOFF.md | 0.5 session
criterion: SCHED-1 | auto | Given the repo workflows, then the count of files that reference an API key variable is 0
criterion: SCHED-2 | auto | Given a scheduled run log with cost_usd above 1.00, then agent-guard cost exits 1
criterion: SCHED-4 | auto | Given zero scheduled runs logged in a week, then the usage report prints "0 runs" and exits 0
criterion: SCHED-3 | manual | After 7 nights of runs, open the Anthropic billing page -> it shows 0 dollars of API charges
cut: GitHub Actions running agents | needs a paid API key, which the owner has ruled out
cut: Several agents per night | burns the plan limit that Chase's own sessions need
cut: A hosted server or VM running agents | adds a bill and a key for no gain
risk: Scheduled runs eat the plan allowance Chase needs for his own evening sessions | M1.3
risk: An API key sneaks into CI or a trigger config | SCHED-1
decision: Run one nightly staff-pm digest as a scheduled cloud run on the flat plan? | yes, start with one run a night and review the usage meter after a week
decision: If the plan limit pinches, drop to 3 nights a week or pause? | drop to 3 nights a week, never add an API key
handoff: qa-tdd | failing tests for SCHED-1 and SCHED-2 | red for the right reason
handoff: engineer | set up the scheduled run and the guard check | SCHED-1 and SCHED-2 green 3x
```

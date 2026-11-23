# The agent harness: what exists and how to reuse it

Chase, Nov 23: "I want this to be the main place agent infra gets built and then shared to others." If a product repo is about to build an agent (a tool loop, run logs, cost caps, evals), **start here**. Most of it already lives in studio-agents; what's missing gets built here, not in the product repo.

Everything below is a plain Node script in `tools/` (no network, no packages, no API key) or a doc. Copy tools into a product repo with:

```bash
bash scripts/sync-tools.sh ../my-product            # every tool, into ../my-product/scripts/
bash scripts/sync-tools.sh ../my-product agent-guard check-agent-run check-story-entry stamp-run
```

`sync-tools.sh` copies flat into `scripts/`, so a tool's neighbours must come with it (see "Needs" below). Re-run it to pick up fixes; it never touches other files in `scripts/`. Hooks and the run-log script come from `scripts/sync.sh` and `scripts/install-cloud.sh` (cloud threads start above the repo, so repo `.claude/` never loads; see `docs/session-rules.md`).

## What exists today

| Piece | Where | Needs | How a product uses it |
|---|---|---|---|
| **Run log** (who, when, model, tokens, cost, verdict) | `tools/check-agent-run.mjs` validates a ```agentrun block; logs live in `docs/runs/<date>-<agent>.md`. Shape and field list: top of the file; example: `docs/runs/2026-11-22-qa-tdd.md` | `check-story-entry.mjs` | The agent writes one block per run. `node scripts/check-agent-run.mjs docs/runs/<log>.md` fails CI on a bad one. |
| **Real token counts** | `tools/stamp-run.mjs` | `check-agent-run.mjs` | The caller (never the agent measured) runs `node scripts/stamp-run.mjs <log> --transcript <subagent.jsonl> [--prices prices.json]` after the run. It writes the token sums from the transcript and the cost, so the agent can't edit them. |
| **Kill switch and cost cap** | `tools/agent-guard.mjs` | `check-agent-run.mjs`, `check-story-entry.mjs` | `node scripts/agent-guard.mjs kill <agent>` before work (trips on `.claude/agents.off` or `.claude/<agent>.off`). `node scripts/agent-guard.mjs cost <log> --cap 1.00` after a run. `only-tests` checks a run changed only tests. |
| **Output contracts with validators** | `check-qa-report`, `check-spec`, `check-findings`, `check-story-entry` | none | Pattern to copy for a new agent: one fenced block at the end of its report plus a script that rejects a malformed one. |
| **Memory between runs** | `tools/agent-memory.mjs` (finding lines in run logs and past eval misses), `ux-state` + `ux-search` (UX) | `ux-search.mjs`, `check-agent-run.mjs` | `node scripts/agent-memory.mjs <words> --root .` before filing a finding, to see whether it is already known. |
| **Scorecard** | `tools/agent-scorecard.mjs` | the eval run folders and run logs | One table per agent: eval score by phase and arm, logged-run counts. Local report only. |
| **Evals** (cases from real misses, agent vs plain Claude) | `tools/eval-miss-cases.mjs` builds cases from a spec file; `tools/eval-miss-score.mjs` scores a run folder; examples in `evals/agent-misses/` | none | Write a case spec (`evals/agent-misses/*-cases*.mjs`), generate, run the agent and a plain session on each, record `results.json`, score. |
| **Blind grader** | A process, not a script: `docs/agent-training-plan.md` ("Ground rules", "The loop"). A fresh Opus subagent reads only the case's `criteria.md` and the saved report and answers PASS or FAIL with one reason; it never sees how the agent got there or which arm it was. Agents run on Sonnet. | none | Follow the training plan; saved runs under `evals/agent-misses/runs/` show the shape (`results.json`, `transcripts/`). |
| **The process and the bar** | `docs/agent-template.md` (checklist), `docs/agent-training-plan.md` (loop, infra table, score definitions), `docs/ux-agent-bar.md` (autonomy tiers, governance, cost), `docs/agent-audit.md` (which agents are real, with proof) | none | Read the template first; it says what "real agent" means here. |
| **Agent run log hook** (proves an agent really ran) | `templates/scripts/log-agent-run.sh`, `templates/claude-settings.json`, `scripts/install-cloud.sh` | none | Installed by `sync.sh`; in cloud threads by `install-cloud.sh` from the environment's setup script. |

## What is missing (honest list)

These are gaps, not built things. Product Studio builds them here (Chase, Nov 23), one small PR each, so every product gets them.

1. **A packaged blind grader.** It exists as a documented process run by hand as subagents, not a script or prompt file a product can call. A product agent would re-create the grader prompt.
2. **Hard-coded agent names.** `check-agent-run.mjs` accepts only the ten studio agents (`AGENTS`). A new agent such as a job-hunt agent fails validation until it is added there (a one-line change plus a test, in studio-agents, not in the product repo).
3. **Built for Claude Code subagents, not an app's own API loop.** `stamp-run` reads Claude Code subagent transcripts, and `agent-guard cost` checks a finished log. Nothing enforces a cost cap *inside* a running tool loop that calls the Anthropic API (and Chase has ruled out a paid API route for now, Nov 21).
4. **Scheduled run in CI.** The "loop that runs without a person" is Partial for UX and Missing for the others (training plan, infra table). Needs the kill switch and cost cap first.
5. **Retry helper and context budget.** Only `ux-flows` retries; no shared helper. No written context budget for any agent.
6. **Scorecard is local.** `agent-scorecard` prints a report; it isn't published to the Studio page yet.
7. **`sync-tools.sh` copies flat and doesn't resolve neighbours.** Syncing one tool without its "Needs" breaks it. Sync everything, or use the Needs column above.
8. **No example of a non-studio product agent using the harness end to end.** The first one (Role Radar's job-hunt agent, role-radar issue #86) is the proof; record what it had to change here.

## Rules for product repos
- Check this page and `docs/agent-training-plan.md` before writing any agent infrastructure. If a piece exists, sync it; don't copy-paste it or rewrite it.
- If a piece is missing or needs a change, send an intake to Product Studio. Don't fork a private version in the product repo.
- Claim only what the run logs and scores show (`docs/agent-audit.md`).

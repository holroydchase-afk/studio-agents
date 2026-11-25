# The agent harness: what exists and how to reuse it

Chase, Nov 23: "I want this to be the main place agent infra gets built and then shared to others." If a product repo is about to build an agent (a tool loop, run logs, cost caps, evals), **start here**. Most of it already lives in studio-agents; what's missing gets built here, not in the product repo.

Everything below is a plain Node script in `tools/` (no network, no packages, no API key) or a doc. Copy tools into a product repo with:

```bash
bash scripts/sync-tools.sh ../my-product            # every tool, into ../my-product/scripts/
bash scripts/sync-tools.sh ../my-product agent-guard check-agent-run check-story-entry stamp-run
```

`sync-tools.sh` copies flat into `scripts/` and brings along any tool the named one imports (the "Needs" column below is what that means). Re-run it to pick up fixes; it never touches other files in `scripts/`. Hooks and the run-log script come from `scripts/sync.sh` and `scripts/install-cloud.sh` (cloud threads start above the repo, so repo `.claude/` never loads; see `docs/session-rules.md`).

## What exists today

| Piece | Where | Needs | How a product uses it |
|---|---|---|---|
| **Run log** (who, when, model, tokens, cost, verdict) | `tools/check-agent-run.mjs` validates a ```agentrun block; logs live in `docs/runs/<date>-<agent>.md`. Shape and field list: top of the file; example: `docs/runs/2026-11-22-qa-tdd.md` | `check-story-entry.mjs` | The agent writes one block per run. `node scripts/check-agent-run.mjs docs/runs/<log>.md` fails CI on a bad one. |
| **Real token counts** | `tools/stamp-run.mjs` | `check-agent-run.mjs` | The caller (never the agent measured) runs `node scripts/stamp-run.mjs <log> --transcript <subagent.jsonl> [--prices prices.json]` after the run. It writes the token sums from the transcript and the cost, so the agent can't edit them. |
| **Agent loop on any chat-completions API** (step limit, in-loop dollar cap, schema and transport retries, transcript, run log) | `tools/agent-runner.mjs`; examples `evals/runner/`; spec `docs/product/SPEC-OPEN-WEIGHT-RUNNER.md` | `check-agent-run.mjs`, `check-story-entry.mjs` | `node scripts/agent-runner.mjs --config FILE --task FILE --out DIR [--tools FILE.mjs]`; the key is read from the env var named in `api_key_env`. Use a runner-named agent (e.g. `open-weight-staff-pm`), not `qa-tdd`, `staff-pm` or `ux-reviewer`. Cost is provider-reported: not independent until a `stamp-run` adapter exists. What leaves the machine: the system prompt, the task, tool results and the message history go to the provider host in `base_url`; the transcript and `run.md` stay local; use only synthetic or public tasks until the vendor terms are cited with date and URL. Config is checked first: https only, no credentials, no IP or local host, key var must be `*_API_KEY` (never `ANTHROPIC_API_KEY`); `--out` inside a git work tree needs `--allow-repo-out`. Not run live yet (OWR-22 needs Chase's go and a capped key). |
| **Kill switch and cost cap** | `tools/agent-guard.mjs` | `check-agent-run.mjs`, `check-story-entry.mjs` | `node scripts/agent-guard.mjs kill <agent>` before work (trips on `.claude/agents.off` or `.claude/<agent>.off`). `node scripts/agent-guard.mjs cost <log> --cap 1.00` after a run. `only-tests` checks a run changed only tests. |
| **Feedback gate** | `tools/feedback-guard.mjs` (`scrub`, `screen`, `body`, `caps`, `kill`; spec `docs/product/SPEC-FEEDBACK-LOOP.md`) | none | Every user feedback item passes it before any agent reads it: `node scripts/feedback-guard.mjs screen < item.txt` exits 1 for spam or suspicious. Plain Node, no network. |
| **Triage block validator** | `tools/check-triage.mjs` (spec FBK-13..15) | none | `node scripts/check-triage.mjs reply.md` validates Staff PM's ```triage block for a feedback issue. |
| **Feedback auto-merge gate** | `tools/feedback-merge-check.mjs` (FBK-25) | none | `node scripts/feedback-merge-check.mjs --repo NAME --lines N <files>` exits 1 for anything the loop may not self-merge. |
| **Feedback widget and issue form** | `templates/feedback/widget.js`, `templates/github/ISSUE_TEMPLATE/feedback.yml` (FBK-16, 17) | none | `scripts/add-feedback.sh <repo>`; the page loads the widget with `data-repo` and `data-product`. No network, 4 KB gzipped. |
| **Feedback gate workflow** | `templates/workflows/feedback-gate.yml`, `templates/scripts/feedback-gate.mjs` (feedback-gate, FBK-19..22) | `feedback-guard.mjs` beside it | Labels each feedback issue `needs-triage`, `spam`, `suspicious` or `over-cap`; `--preflight` checks the kill switch first. Guide: `docs/feedback-loop.md`. |
| **Output contracts with validators** | `check-qa-report`, `check-spec`, `check-findings`, `check-story-entry` | none | Pattern to copy for a new agent: one fenced block at the end of its report plus a script that rejects a malformed one. |
| **Memory between runs** | `tools/agent-memory.mjs` (finding lines in run logs and past eval misses), `ux-state` + `ux-search` (UX) | `ux-search.mjs`, `check-agent-run.mjs` | `node scripts/agent-memory.mjs <words> --root .` before filing a finding, to see whether it is already known. |
| **Build-cycle ledger** (tests before and after the build, bugs found and fixed, order checked from git) | `tools/qa-cycle.mjs` (`ledger`, `verify`, `gate`, `miss add`, `ideas`, `harden-check`, `score`); spec `docs/product/SPEC-QA-CYCLE.md`; hardening runbook `docs/qa-hardening.md` | `check-qa-report.mjs`, `check-agent-run.mjs`, `check-story-entry.mjs`, `agent-guard.mjs` | Any agent that builds then verifies can tag commits and call `verify`/`gate`. Written for qa-tdd. |
| **Pipeline ledger** (stage order, handoff-block validation, stop rules, merge class) | `tools/pipeline-run.mjs`; plan `docs/pipeline-plan.md` | `check-spec.mjs`, `check-qa-report.mjs` | A thread running the pipeline calls `init`, then `start`/`done` per stage. It records and refuses; it makes no model calls. |
| **Scorecard** | `tools/agent-scorecard.mjs` | the eval run folders and run logs | One table per agent: eval score by phase and arm, logged-run counts. Local report only. |
| **Evals** (cases from real misses, agent vs plain Claude) | `tools/eval-miss-cases.mjs` builds cases from a spec file; `tools/eval-miss-score.mjs` scores a run folder; examples in `evals/agent-misses/` | none | Write a case spec (`evals/agent-misses/*-cases*.mjs`), generate, run the agent and a plain session on each, record `results.json`, score. |
| **Blind grader** | A process, not a script: `docs/agent-training-plan.md` ("Ground rules", "The loop"). A fresh Opus subagent reads only the case's `criteria.md` and the saved report and answers PASS or FAIL with one reason; it never sees how the agent got there or which arm it was. Agents run on Sonnet. | none | Follow the training plan; saved runs under `evals/agent-misses/runs/` show the shape (`results.json`, `transcripts/`). |
| **The process and the bar** | `docs/agent-template.md` (checklist), `docs/agent-training-plan.md` (loop, infra table, score definitions), `docs/ux-agent-bar.md` (autonomy tiers, governance, cost), `docs/agent-audit.md` (which agents are real, with proof) | none | Read the template first; it says what "real agent" means here. |
| **Agent run log hook** (proves an agent really ran) | `templates/scripts/log-agent-run.sh`, `templates/claude-settings.json`, `scripts/install-cloud.sh` | none | Installed by `sync.sh`; in cloud threads by `install-cloud.sh` from the environment's setup script. |

## What is missing (honest list)

These are gaps, not built things. Product Studio builds them here (Chase, Nov 23), one small PR each, so every product gets them.

1. **A packaged blind grader.** It exists as a documented process run by hand as subagents, not a script or prompt file a product can call. A product agent would re-create the grader prompt.
2. ~~Hard-coded agent names.~~ Fixed (AGENTNAME-1..4): `check-agent-run` and `agent-guard kill` accept any lowercase kebab-case agent name such as `job-hunt`; a product agent's verdict is one lowercase word.
3. **Built for Claude Code subagents, not an app's own API loop.** `stamp-run` reads Claude Code subagent transcripts, and `agent-guard cost` checks a finished log. Nothing enforces a cost cap *inside* a running tool loop that calls the Anthropic API (and Chase has ruled out a paid API route for now, Nov 21).
4. **Scheduled run in CI.** The "loop that runs without a person" is Partial for UX and Missing for the others (training plan, infra table). Needs the kill switch and cost cap first.
5. **Retry helper and context budget.** Only `ux-flows` retries; no shared helper. No written context budget for any agent.
6. **Scorecard is local.** `agent-scorecard` prints a report; it isn't published to the Studio page yet.
7. ~~`sync-tools.sh` doesn't resolve neighbours.~~ Fixed (SYNCDEP-1..3): syncing one tool also copies the tools it imports, transitively, and prints `synced <dep> (needed by <tool>)`.
8. **No example of a non-studio product agent using the harness end to end.** The first one (Role Radar's job-hunt agent, role-radar issue #86) is the proof; record what it had to change here.

## Rules for product repos
- Check this page and `docs/agent-training-plan.md` before writing any agent infrastructure. If a piece exists, sync it; don't copy-paste it or rewrite it.
- If a piece is missing or needs a change, send an intake to Product Studio. Don't fork a private version in the product repo.
- Claim only what the run logs and scores show (`docs/agent-audit.md`).

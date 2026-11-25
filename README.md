# Studio agents

The AI team behind Chase Holroyd's one-person product studio. Each agent owns one lane, and every product repo uses the same team.

| Agent | Lane |
|---|---|
| `staff-pm` | Critical path, testable criteria, triage, go/no-go gates, scope cuts |
| `qa-tdd` | Failing tests first, every suite, flakiness, honest results |
| `engineer` | Builds only after the failing test exists, within the repo's hard rules |
| `privacy-security` | Gold-standard bar scaled to the milestone (OWASP ASVS/MASVS, STRIDE, LINDDUN) |
| `ux-reviewer` | Cognitive walkthroughs as the least tech-savvy user, measured checks |
| `release-captain` | Proves a release is safe (version, packed install in an empty HOME, suites 3x, publish path) and hands Chase one button; never publishes |
| `positioning` | Claims that are true today, copy, and "why I built it" stories |
| `story-keeper` | The story log: decisions, lessons, pivots and wins as they happen, in every chat |
| `architect` | One stack across products: reviews stack-crossing changes, reuse before build, architecture docs that match the code, weekly drift sweep |
| `orchestrator` | PMO view across repos: morning digest, stalled-work checks, session rules and focus gate (builds nothing) |

**Building an agent in a product repo? Start with [docs/agent-harness.md](docs/agent-harness.md): what harness pieces exist (run log, real token counts, kill switch, cost cap, evals, blind grader), how to sync them, and what is missing.  Agent infrastructure is built here and shared; don't rebuild it in a product repo.**

What a public repo needs to look professional (community profile, Scorecard basics, root layout): [docs/repo-standards.md](docs/repo-standards.md).

The checklist every agent is held to: [docs/agent-template.md](docs/agent-template.md).
The process that raises any agent (real misses, splits, scores, rules, infrastructure) and where QA-TDD and Staff PM stand: [docs/agent-training-plan.md](docs/agent-training-plan.md).

Which of these are real agents and which are skills or rules, with the proof each has: [docs/agent-audit.md](docs/agent-audit.md).

Skills (for chats with no repo): `staff-pm`, `story-and-positioning`, `ux-review`, `focus-check`, `digest` (the morning digest on demand, in any project), `night-prep` (each evening: unblock list, foreseen blockers and tonight's goal for the 2:15am night shift), `onboard` (bring a new project into the studio per pm-tools `docs/ONBOARDING.md`; `onboard refresh` for an existing one), `recruiter-review` (two hiring-panel modes, engineer-on-panel and hiring-manager, chosen from a posting's reporting line and level; REC-R IDs), `review-rounds` (numbered review-then-fix rounds until nothing at P2 or above is left; from Energy Scanner's ES-R1 to R68).

An agent can preload skills with a `skills:` list in its frontmatter (ux-reviewer preloads `review-rounds`, since it has no Skill tool). `sync.sh` copies each synced agent's preloaded skills into the repo's `.claude/skills/`, replacing only those folders.

## Stakeholder plugin (separate from the studio team)
`plugins/stakeholder` is a second plugin in the same marketplace: an advisory agent that reads your README, page or post as a recruiter, hiring manager, staff engineer or PM peer, and a checker that rejects any finding whose quote is not in your quote index. It is not synced into product repos. Its output is guesses to check, not research. Install after merge: `/plugin marketplace add holroydchase-afk/studio-agents`, then `/plugin install stakeholder@chase-studio`. Details: [plugins/stakeholder/README.md](plugins/stakeholder/README.md).

## Tools
Scripts the agents run, copied into each repo's `scripts/` with `scripts/sync-tools.sh ../my-product`.

| Tool | What it does |
|---|---|
| `ux-shots` | The ux-reviewer's visual pass in one command: screenshots at 390x844 and 1280x800, light and dark, viewport and full page, plus a report of console errors, failed requests, broken images, sideways scroll, small tap targets, unfinished text and sample links. `node scripts/ux-shots.mjs dist/index.html --click "[role=tab]"`; `--no-network` blocks and lists every request that leaves the page (the privacy gate for local-only apps); `--strict` fails CI on any issue. Needs Playwright (`npm i -D playwright`). Extracted from Role Radar's review pass. |
| `ux-rules` | Checks a page against the design rules code can check (Layer 1 G rules and Layer V craft counts in `ux-reviewer.md`) at 390, 1280 and 320px. `node scripts/ux-rules.mjs dist/index.html --click "#addBtn"`; `--strict` fails CI on a rule break, `--strict-visual` on a V count too. Needs Playwright. Run it before ux-shots: a failing rule beats a reading of a screenshot. |
| `check-findings` | Validates the ```findings block that ends every ux-reviewer review: verdict, score out of 10, and one `ID \| P0-P2 \| rule \| where \| problem \| fix` line per finding (Ready needs 8/10 and no P0; Blocker needs a P0). `node scripts/check-findings.mjs review.md`; `--json` prints the parsed findings. Plain Node, no dependencies. |
| `check-qa-report` | Validates the ```qa block that ends every qa-tdd report: one verdict (green, red, flaky or blocked), `suite: name \| command \| runs` lines with 3 passed/failed runs each, and one `QA-R<n> \| P0-P2 \| where \| problem \| test` line per finding (green needs 0 failed and identical runs; flaky needs a QA-R finding). `node scripts/check-qa-report.mjs report.md`; `--json` prints the parsed block. Plain Node, no dependencies. |
| `check-agent-run` | Validates the ```agentrun block in any studio agent's run log (qa-tdd and staff-pm write one to `docs/runs/<date>-<agent>.md`): date, agent (one of the ten), product, tier (advisory, supervised, full), model, tokens and cost as the harness shows them, the input, each `tool: name \| ok\|failed \| note`, the verdict (fixed lists for qa-tdd, staff-pm and ux-reviewer), findings and P0 count, an optional artifact path and retries, and why it escalated; a qa-tdd green needs no P0 and any blocked verdict must escalate; no emails, phone numbers, claude.ai links, ids or API keys anywhere in the file. `node scripts/check-agent-run.mjs run.md`; `--json` prints the parsed run. Plain Node; needs `check-story-entry` beside it (sync both). |
| `check-spec` | Validates the ```spec block that ends every staff-pm spec: one verdict (ready, needs-decision, blocked or cut), a `bet:`, `step: M1.1 \| what \| done when \| 1 session` lines, `criterion: PACE-1 \| auto\|manual \| text` lines whose text has "then" or "->" plus a digit or quoted value, `cut:`, `risk: risk \| step or criterion ID`, `decision: question \| recommendation` and `handoff: agent \| task \| done when` lines (ready needs a handoff to qa-tdd; no emails, phone numbers, links or ids anywhere in the file). `node scripts/check-spec.mjs spec.md`; `--json` prints the parsed spec. Plain Node; needs `check-story-entry` beside it (sync both). |
| `spec-lint` | Flags the gaps staff-pm keeps missing in a spec that already passes `check-spec` (rules SL-1 to SL-9 in `docs/product/SPEC-SPEC-LINT.md`): a clock-dependent criterion with no pinned clock, counts or lists with no empty case, a public or live change with no rollback, a phone or viewport width with no height budget, a safety, fairness or accuracy claim with no measured bar, sign-in or owner-only changes missing a signed-out or a different-user criterion, README or copy claims not checked against the released version, a done definition that names code or tests but no README, screenshots, docs, changelog or case study, and a privacy or unreleased-claim risk ranked P1 or P2. Whole-word keywords from one table at the top of the script. A prose line `lint-ok: SL-3 <reason>` waives a rule (a waiver with no reason is a finding). `node scripts/spec-lint.mjs spec.md`; `--json` prints findings and waivers, `--rules SL-1,SL-3` limits the run; exit 0 clean, 1 findings, 2 usage or a block that fails check-spec. Plain Node; needs `check-spec` and `check-story-entry` beside it (sync all three). |
| `product-review` | The pieces a per-product review needs, built from the Hearth pilot gaps (issue 140): `claims` lists numeric test claims in a README with the command beside each, `fresh` fails when screenshots are older than HEAD, `lane` and `plan` pick each product's own agents and print the run-log command, and `merge` turns the stakeholder, UX and QA reports (each with a `validation:` header and `observed`, `viewed` or `inferred` labels) into one ranked ```review block. Not eval-proven; it is plumbing, so no review-quality claim. |
| `agent-guard` | The agent fail-safes, three read-only guards in one command. `kill <agent>` stops a run when `.claude/agents.off` (every agent) or `.claude/<agent>.off` exists; `cost <run.md>` reads the ```agentrun log (through `check-agent-run`) and trips when `cost_usd` is over the cap (`--cap`, default 1.00) without `escalated: yes`, or when tokens and cost are both 0 and the run did not escalate; `only-tests` trips when anything but test files, test folders, fixtures or run logs changed against `--base` (default HEAD: qa-tdd passes the commit it started from), listing each offending path. `node scripts/agent-guard.mjs kill qa-tdd`; `--root DIR`, `--json` prints `{ok, reasons}`; exit 0 pass, 1 tripped, 2 usage. Plain Node, never writes to the repo; needs `check-agent-run` and `check-story-entry` beside it (sync all three). |
| `feedback-guard` | The gate for user feedback (`docs/product/SPEC-FEEDBACK-LOOP.md`), plain Node, no network. `scrub` replaces emails, phones, links and key-shaped tokens with `[removed]`; `screen` gives ok, spam or suspicious; `body` renders the fixed issue body with a stable `fb-id`; `caps` trips at 5 issues or 3 auto-PRs per day; `kill` trips on `.claude/feedback.off`, `.claude/agents.off` or a paused flag. `--json` everywhere; exit 0 pass, 1 tripped, 2 usage. |
| `check-triage` | Validates the ```triage block Staff PM writes per feedback issue: verdict (fix, idea, reject, needs-chase), lane (ux or qa-tdd), severity, risk, done-when, eval-candidate, each once; `fix` needs a done-when, `lowrisk` only with `fix`, P0 forces `needs-chase`, no email, phone, link or token (never echoed). `node scripts/check-triage.mjs reply.md`; exit 0 valid, 1 invalid, 2 usage. |
| `feedback-merge-check` | The scoped auto-merge gate for the feedback loop (`docs/feedback-loop.md`): refuses `.github/`, `CLAUDE.md`, manifests and lockfiles, paths with auth, privacy, data or secret, all of Hearth, live-site paths (`index.html`, `CNAME`, `demo/`) and over 80 changed lines. `node scripts/feedback-merge-check.mjs --repo NAME --lines N <files>`; exit 0 allow, 1 refuse, 2 usage. |
| `qa-cycle` | qa-tdd's build-cycle ledger, read from git commit tags (`[qa:pre]`, `[qa:post]`, `[qa:red BUG-n]`, `[qa:fix BUG-n]`). `ledger` counts tests before and after the build and bugs found and fixed; `verify` fails a fix with no earlier red test, a fix that edits a test, or a red commit that touches product code (`--min-post`, `--min-fixed` set the bar); `gate` adds HANDOFF.md, the `qa` block and run log checks and prints the merge steps; `miss add` and `ideas` log misses and list improvement ideas; `harden-check` enforces the autonomous-session caps; `score` summarizes the build-cycle eval by arm. `--json`; exit 0 pass, 1 tripped, 2 usage. Needs `check-qa-report`, `check-agent-run`, `check-story-entry` and `agent-guard` beside it. Spec `docs/product/SPEC-QA-CYCLE.md`, runbook `docs/qa-hardening.md`. |
| `pipeline-run` | The agent pipeline's run ledger (`docs/pipeline-plan.md`). `init`, `start`, `done`, `round`, `stop`, `resume`, `status` keep stage order, validate the spec and qa blocks, and trip the stop rules (kill switch, round limits, 1.5x token budget, two failed validations); `class` says merge class A, B or C from the touched paths. Writes only its own JSON ledger. Needs `check-spec.mjs` and `check-qa-report.mjs`. |
| `triage-report` | The issue inbox for real-world agent misses. `add` records a report with one or more lanes (`ux`, `staff-pm`, `qa-tdd`; `pm` and `qa` work), assigns `RPT-n`, alternates dev and held-out per lane and prints where the eval case goes; `suggest "text"` gives a keyword lane hint; `list`, `status RPT-n case-added --case <name>`, and `--check`. Store: `evals/reports/inbox.jsonl` (`TRIAGE_REPORTS_DIR`). Refuses emails and phone numbers. The `triage-report` skill holds the routing rules. |
| `agent-memory` | Keyword and tag search over qa-tdd's and staff-pm's memory: finding lines (`QA-R1 \| P1 \| where \| problem \| test`, `PM-R1 \| ...`) in `docs/runs/*.md` run logs outside the ```agentrun block (logs with a bad block are skipped), and past eval misses in `plugins/studio/evals/*/graders/criteria.md`; `dedupe(text, docs)` finds a near-duplicate finding. No network. `node scripts/agent-memory.mjs <words> --root . [--agent qa-tdd\|staff-pm] [--limit N] [--json]`; needs `ux-search`, `check-agent-run` and `check-story-entry` beside it. |
| `agent-scorecard` | Per-agent scorecard for qa-tdd and staff-pm from `evals/agent-misses/runs/*/results.json` and valid `docs/runs/*.md` ```agentrun logs, one section per agent: eval scores by run, phase (dev vs heldout) and arm as "n of m" (cross rows count for the agent in `by`), logged runs, escalations, findings, p0, cost ("not measured" unless a run shows tokens or cost) and lift (only for a heldout run whose plain and agent arms cover the same cases). Local report, not published. `node scripts/agent-scorecard.mjs [--root dir] [--agent qa-tdd\|staff-pm] [--json]`; needs `check-agent-run` and `check-story-entry` beside it. |
| `studio-scorecard` | The living scorecard: per agent, win rate against plain Claude with a 95% interval and sign test from `evals/lazy-prompts` and `evals/agent-misses` plus cited entries in `docs/scorecard/evidence.json`; "not proven" below 10 decisive pairs or p 0.05. Outcomes come only from a private `--outcomes` file, tokens print "not measured". `node tools/studio-scorecard.mjs [--root dir] [--outcomes file] [--json out] [--html out]`. |
| `studio-sync` | One command to bring a product repo up to date from `templates/manifest.json`: managed files follow the source, seed files (`studio-checks.json`, `.claude/settings.json`) are created once, local `./x.mjs` imports are followed, and `.studio-sync.json` records the source sha and a hash per file. A locally edited managed file is a conflict (short diff stat, exit 2) unless `--force`; `--check` writes nothing and exits 1 on drift; `--json` prints the result. `node tools/studio-sync.mjs ../my-product`. Plain Node. Details: `docs/session-rules.md`. |
| `eval-protocol` | The v2 eval method: `freeze`/`verify` hash the prompt set and rubric before an agent edit, `check-run` validates a run (3 grader votes in each order, model ids, tokens), `report` counts a pair only when both orders agree and reports per prompt with sign test, Wilson interval, flip rate and cost per win ("not proven" under 10 prompts), `reply-checks` scores a reply for a dated next step, asks, `lint-ok` lines and words. Old v1 runs are never recomputed. `node tools/eval-protocol.mjs freeze\|verify\|check-run\|report\|reply-checks ...` |
| `eval-pipeline` | One pipeline for every agent's eval, built on `eval-protocol`: `init`, `check-suite`, `freeze`/`verify`, `jobs` (blind grade jobs, held-out set burned once per change id), `collect` (validates results, one problem line per job), `report` (`--claim` blocked until calibration passes), `sheet`/`key-add`/`calibrate` (human marks, agreement, Cohen's kappa), `status`. Model calls run as subagents in a Claude session, no API key. `node tools/eval-pipeline.mjs <command> ...` |
| `stamp-run` | Run by the caller after a subagent finishes (never by the agent measured): writes facts the agent cannot edit into its `docs/runs` log from the subagent transcript: `tokens` as the sum of input, output, cache creation and cache read (deduplicated by message id), `stamped: yes`, `stamp_*` counts, `stamp_sha` (40 hex), optional `stamp_test` (`<command> \| <pass>/<fail>`, output never kept). Cost stays `stamp_cost: not measured` unless `--prices` gives a price file with a source and date. Re-stamping replaces, never duplicates; `check-agent-run` validates the stamp lines. `node tools/stamp-run.mjs <run.md> --transcript <subagent.jsonl> [--sha REF] [--test CMD] [--prices prices.json]`; needs `check-agent-run` beside it to validate. |
| `qa-run3` | qa-tdd's "all suites 3x" in one command: runs a test command N times (default 3) through a shell, prints each run's exit code, passed/failed counts and time (never the command's own output), a green, red or flaky verdict (flaky wins) and a `suite:` line ready for the ```qa block. A `--timeout` kills the whole process group and the next run still happens. `node scripts/qa-run3.mjs --name unit -- npm test` (`--runs N`, `--timeout S`, `--json`) |
| `portfolio-drift` | Files an `intake` issue on the portfolio repo when a merge touches files behind a product's demo or page (watch list in `.portfolio-watch.json`). Used by `actions/portfolio-drift`; see docs/release-train.md. |
| `release-train` | Logic for the nightly live-site release train: eligible PRs, safe merge order, deploy verification (home marker intact), ship decision and the one release note. See docs/release-train.md. |
| `check-story-entry` | Validates a story-keeper reply: either one `No entry: <reason>` line, or one ```story block with a `### YYYY-MM-DD · Decision\|Lesson\|Pivot\|Win: <title>` header and the Problem, Chase's call, Decision and why, Result and Story angle lines (Lesson required for a Lesson or Pivot), 120 words or fewer, no emails, phone numbers, claude.ai links, ids or API keys, plus at most one `Memory:` line after it. `node scripts/check-story-entry.mjs reply.md`; `--json` prints the parsed entry. Plain Node, no dependencies. |
| `check-ux-run` | Validates the ```uxrun block in a ux-reviewer run log: date, product, tier (advisory, supervised, full), model, tokens, cost, the flows reviewed, each finding with the rule it cites and its evidence, the verdict, whether it re-checked, and why it escalated. Bar and tiers: [docs/ux-agent-bar.md](docs/ux-agent-bar.md). `node scripts/check-ux-run.mjs run.md` |
| `ux-flows` | The ux-reviewer's capture step: reads a product's `docs/design/flows.json` (target, flows, clicks) and runs `ux-shots` once per flow, no network, local or demo targets only, then prints the `flow:` lines for the run log. A flow that fails is retried once, printed as `flow-failed: <name> | <reason>`, and the rest still run; `<out>/run.json` records every flow and the exit is 1 if any failed. `node scripts/ux-flows.mjs docs/design/flows.json --dry-run` shows the plan |
| `ux-issues` | The file-issues planner: from a validated run log, picks the P0/P1 findings to file on the product repo, skips duplicates and anything over a small daily cap, and files nothing at the Advisory tier. It never calls GitHub; the agent files from the plan. `node scripts/ux-issues.mjs run.md --existing issues.json` |
| `ux-recheck` | The recheck planner: compares a re-shoot run log with the run that found the problems and says which issues to close (finding gone), reopen (closed but still there) or keep, plus any new findings. Never calls GitHub. `node scripts/ux-recheck.mjs before.md after.md --existing issues.json` |
| `eval-miss-cases` | Builds the qa-tdd and staff-pm miss eval cases (`plugins/studio/evals/qa-tdd-miss-*`, `staff-pm-miss-*`) from `evals/agent-misses/qa-tdd-cases.mjs` and `staff-pm-cases.mjs`. `--check` fails on a stale or orphaned case folder, `--verify` proves each repro (shipped test green, gap test red). `node tools/eval-miss-cases.mjs` |
| `eval-miss-score` | Scores a miss-eval run recorded from subagent transcripts (no API key). Reads `evals/agent-misses/runs/<run>/results.json`, writes `results.md` (recall by agent, priority, pattern, arm), and `--check` fails on a stale report, a dev case in a held-out run (or the reverse), a missing transcript or a double score. `node tools/eval-miss-score.mjs <run-dir>` |
| `ux-state` | The ux-reviewer's memory between runs: records each run log into one JSON file in the product repo (`docs/design/ux-state.json`), tracking each finding as open, fixed (gone from a rechecked run) or reopened. `node scripts/ux-state.mjs record run.md --state docs/design/ux-state.json`, then `show --state ...` lists what is open |
| `ux-build-eval` | Harness for the UX build eval (plain Claude vs the UX agent, docs/ux-build-eval-spec.md): same-input and Sonnet check, self-contained HTML check, prompt-set and banned-word check, blind A/B shuffle with a separate mapping, grading record check, rounds to good, results check, error-run handling. Pure functions plus a thin CLI; `node tools/ux-build-eval.mjs --dry-run` uses fakes, no model calls. |
| `ux-search` | Keyword search over the design rules, past run-log findings and the state file, so the agent checks whether a problem is already known before filing it. No network. `node scripts/ux-search.mjs <words> --root . [--limit N] [--json]` |
| `ux-refs` | The ux-reviewer's cited reference library (`docs/references/ux/`: dark mode, contrast, clean UI): `search`, `show`, and `cite <review.md> --topics dark,contrast,clean`, which fails when a review cites an unknown reference or skips a hard rule. `pending` entries (source not read yet) are reported open, never enforced. No network. `node scripts/ux-refs.mjs search <words>`; sync-tools also copies the library. |

## When to use which agent (by default, without being asked)
Agents only help if the session calls them. Copying them into a repo is not enough: the repo's `CLAUDE.md` must say when to use them. Paste [templates/CLAUDE-agents.md](templates/CLAUDE-agents.md) into it.

| Moment | Agent | What you get |
|---|---|---|
| Start of a session or run, a new milestone or feature, a pile of findings | `staff-pm` | The next task, testable criteria, what to cut, P0/P1/P2 ranking |
| Before building anything; before a PR is marked ready | `qa-tdd` | A failing test first; all suites run 3x with honest results |
| Building, once the failing test exists | `engineer` | The change, inside the repo's hard rules |
| Any screen, word or CLI output; before anything goes public | `ux-reviewer` | Walkthrough as the least tech-savvy user; showcase review for recruiter-facing work |
| Personal data, sign-in, secrets, telemetry; before a public demo or deploy | `privacy-security` | Threat and privacy review scaled to the milestone; what a public repo could leak |
| A new dependency, vendor, paid service, schema change or CI/deploy workflow; a new project's stack | `architect` | Verdict on fit, the stack rung, what to reuse instead, the decision entry needed |
| Before any publish or release; after a version bump | `release-captain` | Verdict, REL findings, and the one step Chase presses |
| README, landing or portfolio copy; names; after a milestone | `positioning` | Claims true today, copy, the "why I built it" story |
| End of any turn with a call, pivot or lesson | `story-keeper` | One Atlas Story entry (and `docs/STORY.md`), in the background |

The usual order for one task: staff-pm, qa-tdd (red), engineer, qa-tdd (green, 3x), then ux-reviewer and privacy-security if users or the public will see it, then positioning for any copy. Each PR ends with an `Agents:` line saying who ran and the verdict; `templates/agents-check.yml` (installed by `install-rules.sh`) fails a PR without one, or a code PR that doesn't name `qa-tdd`. A PreToolUse hook (`templates/scripts/log-agent-run.sh`) logs every real Agent call to `.claude/agent-runs/<branch>.log`, and `check-agent-runs.sh` fails the PR if the line names an agent that never ran; when qa-tdd ran, CI reruns the repo's `agents.verify` command 3x. The main session acts as chief of staff (Hearth's model): it delegates each piece of work to the agent for that moment instead of doing it itself. `sync.sh` skips `orchestrator` and `focus-coach` (Product Studio's) unless you name them.

## How the agents stay generic
No agent names a product. Each one reads the repo it's working in:
- `CLAUDE.md`: what the product is, who it's for, the **hard rules**, the stack and test commands, and where the docs live.
- `HANDOFF.md`: current state and the next step.
- Whatever docs `CLAUDE.md` points to: story, personas, anchors, spec, tracker.

Anything product-specific (personas, invariants, ID schemes) goes in that repo's docs, not in the agent.

## Planning IDs
Every product numbers its plan the same way: milestones `M1`, tasks `M1.1`, steps `M1.1.1`, with a product code (`CCW-M1.2`) where products mix. See [docs/planning-ids.md](docs/planning-ids.md).

## Use it in a repo
New repo, in order: `scripts/sync.sh` (agents), `scripts/sync-tools.sh` (tools), `scripts/install-rules.sh` (HANDOFF hook and PR check), `scripts/install-security.sh` (security kit), then paste `templates/CLAUDE-agents.md` into the repo's `CLAUDE.md`.

Needs logins and shared data? `scripts/add-supabase.sh <repo>` copies the Supabase starter (`templates/supabase/`): org and member tables with row-level security, 36 RLS tests, Edge Function helpers and a CI workflow. See its README.

**Copy (recommended; the agents are visible in the repo and load in cloud sessions with no setup):**
```bash
scripts/sync.sh ../my-product            # all agents
scripts/sync.sh ../my-product staff-pm qa-tdd
```
Re-run it to pick up improvements. Agents that exist only in that repo (for example Hearth's `grandparent-ux`) are left alone.

**Or install as a Claude Code plugin** by adding this to the repo's `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": {
    "chase-studio": { "source": { "source": "github", "repo": "holroydchase-afk/studio-agents" } }
  },
  "enabledPlugins": { "studio@chase-studio": true }
}
```

**Cloud sessions.** Claude cloud project threads start in the folder above the cloned repos, so each repo's `.claude/agents/` and `.claude/settings.json` never load. Add this line to the cloud environment's setup script:
```bash
git clone -q --depth 1 https://github.com/holroydchase-afk/studio-agents /tmp/studio-agents && mkdir -p ~/.claude/agents && cp /tmp/studio-agents/plugins/studio/agents/*.md ~/.claude/agents/ && { [ -f /tmp/studio-agents/scripts/install-cloud.sh ] && bash /tmp/studio-agents/scripts/install-cloud.sh; true; } || true
```
It installs every studio agent at user level (`~/.claude/agents/`) and, through `scripts/install-cloud.sh`, the agent run-log hook (`~/.claude/settings.json`), which stays quiet when a repo's own hook already logs. The hook logs to the repo the session's working directory is in, so the main session should `cd` into the repo before calling an agent; from the parent folder nothing is logged and agents-check fails every agent the PR names. An unreadable `settings.json` is left untouched with a warning.

## Repeat-prompt nudge
A hook that costs no tokens: a plain Python script (`plugins/studio/hooks/repeat-nudge.py`, no model) runs on every prompt you send. When a similar prompt has now been sent 3 times in one day, it adds one line to the session: "You've asked this 3x today. Want me to automate it?" Claude only does more if you say yes, and then turns it into a skill, a copy-paste prompt or a routine.

It ships with the `studio` plugin (enabled by the settings block above). In cloud sessions the setup-script line above installs it too, through `scripts/install-cloud.sh`.

Private by design: the log (`~/.claude/studio/prompt-log.jsonl`, mode 0600, local only, 7 days) stores the date and short hashes of the words, never the prompt text. Slash commands and prompts under 4 meaningful words are ignored. Turn it off with `STUDIO_REPEAT_NUDGE=off`; tune with `STUDIO_NUDGE_MIN` (default 3) and `STUDIO_NUDGE_SIM` (default 0.6). Tested by `NUDGE-1` to `NUDGE-8` in `tests/check.sh`.

## Session rules
Every agent and run reads `CLAUDE.md` and `HANDOFF.md` before starting and updates `HANDOFF.md` in every commit that makes progress. See [docs/session-rules.md](docs/session-rules.md). The one standard every project adopts, merged from Product Studio and Hearth: [docs/studio-standard.md](docs/studio-standard.md). `scripts/install-rules.sh ../my-product` installs a SessionStart hook that prints `HANDOFF.md` into every session and a PR check that fails when it wasn't updated.

It also installs two shared checks (proved in Hearth) and their config, never overwriting a file the repo already has:
- `scripts/check-agents.sh`: every agent in `.claude/agents/` is named in a `CLAUDE.md` table, and every agent the table names has a file.
- `scripts/check-logs.mjs`: no `console.*` call logs a key, URL, email, token, body or a raw error (`e`, `e.stack`, unfiltered `e.message`, `JSON.stringify`).
- `studio-checks.json`: each repo's own settings, for example `{"logs": {"roots": ["app/src"], "banned": ["caption"]}}`. `banned` adds words to the defaults and matches anywhere in a name; `bannedWords` matches a whole word only (split on `_`, `$` and camelCase), for short words like `lat` that sit inside ordinary ones. The shared privacy check will read the same file when it lands.

Run both from the repo's test script and CI. The canonical copies live in `templates/scripts/`; `tests/check_logs_test.sh` is the log check's own test.

## Security kit
`scripts/install-security.sh ../my-product` adds the studio security baseline from [templates/security](templates/security), and never overwrites a file the repo already has:
- `.github/workflows/security.yml`: gitleaks over the full git history (pinned and checksum-verified), a personal-data scan (`.github/privacy-scan.py`: emails, phone numbers, claude.ai links, trigger ids; allow a safe match in `.privacy-allow`), and dependency review on PRs (fails on high or critical).
- `.github/workflows/codeql.yml`: CodeQL for the languages it finds (always `actions`, plus JavaScript/TypeScript and Python).
- `.github/dependabot.yml`: weekly grouped updates for every `package.json` folder, Python requirements and GitHub Actions.
- `SECURITY.md`: report privately through the Security tab.

The `dependencies` check needs **Dependency graph** on (Settings → Code security); until then it fails with "Dependency review is not supported". GitHub's own toggles (dependency graph, secret scanning, push protection, Dependabot alerts and security updates, private vulnerability reporting) live in each repo's Settings and only the owner can turn them on.

## Changing an agent
Edit it here first, run `bash tests/check.sh` (CI runs it too), then sync. One improvement lands everywhere.

## License

MIT ([LICENSE](LICENSE)).

## Agent evals
Each core agent has a fixed task scored with `claude plugin eval`, with and without the plugin, so a prompt change gets a score instead of a guess. Cases, how to run them and the latest scores: [plugins/studio/evals/README.md](plugins/studio/evals/README.md). CI: `.github/workflows/agent-evals.yml` (needs an `ANTHROPIC_API_KEY` secret).

## How this is built

Built with Claude Code (AI-assisted code, tests and docs). The maintainer directs the work and decides what ships. Tests and CI run on every pull request; the current state is in HANDOFF.md.

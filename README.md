# Studio agents

The AI team behind Chase Holroyd's one-person product studio. Each agent owns one lane, and every product repo uses the same team.

| Agent | Lane |
|---|---|
| `staff-pm` | Critical path, testable criteria, triage, go/no-go gates, scope cuts |
| `qa-tdd` | Failing tests first, every suite, flakiness, honest results |
| `engineer` | Builds only after the failing test exists, within the repo's hard rules |
| `privacy-security` | Gold-standard bar scaled to the milestone (OWASP ASVS/MASVS, STRIDE, LINDDUN) |
| `ux-reviewer` | Cognitive walkthroughs as the least tech-savvy user, measured checks |
| `positioning` | Claims that are true today, copy, and "why I built it" stories |
| `architect` | One stack across products: reviews stack-crossing changes, reuse before build, architecture docs that match the code, weekly drift sweep |
| `orchestrator` | PMO view across repos: morning digest, stalled-work checks, session rules and focus gate (builds nothing) |
| `focus-coach` | The "you are procrastinating" agent: checks the job-hunt tracker, calls out drift in one cheeky line, redirects to the next application |

Skills (for chats with no repo): `staff-pm`, `story-and-positioning`, `ux-review`, `focus-check`, `digest` (the morning digest on demand, in any project), `night-prep` (each evening: unblock list, foreseen blockers and tonight's goal for the 2:15am night shift), `onboard` (bring a new project into the studio per pm-tools `docs/ONBOARDING.md`; `onboard refresh` for an existing one), `review-rounds` (numbered review-then-fix rounds until nothing at P2 or above is left; from Energy Scanner's ES-R1 to R68).

An agent can preload skills with a `skills:` list in its frontmatter (ux-reviewer preloads `review-rounds`, since it has no Skill tool). `sync.sh` copies each synced agent's preloaded skills into the repo's `.claude/skills/`, replacing only those folders.

## Tools
Scripts the agents run, copied into each repo's `scripts/` with `scripts/sync-tools.sh ../my-product`.

| Tool | What it does |
|---|---|
| `ux-shots` | The ux-reviewer's visual pass in one command: screenshots at 390x844 and 1280x800, light and dark, viewport and full page, plus a report of console errors, failed requests, broken images, sideways scroll, small tap targets, unfinished text and sample links. `node scripts/ux-shots.mjs dist/index.html --click "[role=tab]"`; `--no-network` blocks and lists every request that leaves the page (the privacy gate for local-only apps); `--strict` fails CI on any issue. Needs Playwright (`npm i -D playwright`). Extracted from Role Radar's review pass. |
| `ux-rules` | Checks a page against the design rules code can check (Layer 1 G rules and Layer V craft counts in `ux-reviewer.md`) at 390, 1280 and 320px. `node scripts/ux-rules.mjs dist/index.html --click "#addBtn"`; `--strict` fails CI on a rule break, `--strict-visual` on a V count too. Needs Playwright. Run it before ux-shots: a failing rule beats a reading of a screenshot. |

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
| README, landing or portfolio copy; names; after a milestone | `positioning` | Claims true today, copy, the "why I built it" story |

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

## Session rules
Every agent and run reads `CLAUDE.md` and `HANDOFF.md` before starting and updates `HANDOFF.md` in every commit that makes progress. See [docs/session-rules.md](docs/session-rules.md). `scripts/install-rules.sh ../my-product` installs a SessionStart hook that prints `HANDOFF.md` into every session and a PR check that fails when it wasn't updated.

It also installs two shared checks (proved in Hearth) and their config, never overwriting a file the repo already has:
- `scripts/check-agents.sh`: every agent in `.claude/agents/` is named in a `CLAUDE.md` table, and every agent the table names has a file.
- `scripts/check-logs.mjs`: no `console.*` call logs a key, URL, email, token, body or a raw error (`e`, `e.stack`, unfiltered `e.message`, `JSON.stringify`).
- `studio-checks.json`: each repo's own settings, for example `{"logs": {"roots": ["app/src"], "banned": ["caption"]}}`. `banned` adds words to the defaults. The shared privacy check will read the same file when it lands.

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

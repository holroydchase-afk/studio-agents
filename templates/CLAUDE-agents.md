## Studio agents (use them by default; don't wait to be asked)
The main session is Chase's **chief of staff**: it doesn't do specialist work itself. It sends each piece of work to the agent below with the Agent tool, one lane at a time, and reports back briefly. At the start of every session or scheduled run it reads this table and `ls .claude/agents/`. The team comes from holroydchase-afk/studio-agents (re-sync with its `scripts/sync.sh`).

| Moment | Agent |
|---|---|
| Start of a session or run; planning a milestone; before any new feature; triaging findings | `staff-pm` |
| Before building a fix or feature (failing test first); before any PR is marked ready (all suites 3x) | `qa-tdd` |
| Building, once the failing test exists | `engineer` |
| Any screen, word or CLI output a user sees; before anything goes public (showcase review mode) | `ux-reviewer` |
| Personal data, sign-in, secrets, telemetry, vendors; before a public demo, deploy or repo going public | `privacy-security` |
| A new dependency, vendor, paid service, schema change or CI/deploy workflow; picking a new project's stack | `architect` |
| README, landing or portfolio copy; a name or tagline; after a milestone, the "why I built it" story | `positioning` |

**One task, in order:** staff-pm scopes it, qa-tdd writes the failing test (red), engineer builds, qa-tdd runs all suites 3x (green), then ux-reviewer and privacy-security if users or the public will see it, positioning for any copy. Review findings get IDs (`<CODE>-R<n>`, P0 to P2) and each fix gets its own failing test first.

**The `Agents:` line (CI enforces it).** Every PR body has a line starting `Agents:` naming who ran and the verdict, for example `Agents: staff-pm scoped M1.2; qa-tdd red then green, 3x; ux-reviewer no P0/P1`. A PR that changes anything other than docs must name `qa-tdd` on that line, or say `qa-tdd skipped: <reason>`. `.github/workflows/agents-check.yml` fails the PR otherwise, and runs `scripts/check-agents.sh` so this table and `.claude/agents/` never drift. Bot PRs and titles with `[skip agents]` are exempt.

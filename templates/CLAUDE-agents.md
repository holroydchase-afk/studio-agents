## Studio agents (use them by default; don't wait to be asked)
The team in `.claude/agents/` comes from holroydchase-afk/studio-agents (re-sync with its `scripts/sync.sh`). Delegate to them with the Agent tool at these moments, in day sessions and scheduled runs alike:

| Moment | Agent |
|---|---|
| Start of a session or run; planning a milestone; before any new feature; triaging findings | `staff-pm` |
| Before building a fix or feature (failing test first); before any PR is marked ready (all suites 3x) | `qa-tdd` |
| Building, once the failing test exists | `engineer` |
| Any screen, word or CLI output a user sees; before anything goes public (showcase review mode) | `ux-reviewer` |
| Personal data, sign-in, secrets, telemetry, vendors; before a public demo, deploy or repo going public | `privacy-security` |
| README, landing or portfolio copy; a name or tagline; after a milestone, the "why I built it" story | `positioning` |
| A portfolio, tooling, renaming or new-project ask during an application window or after the evening cutoff | `focus-coach` |
| Morning digest or a cross-repo coordination pass (studio projects; product repos rarely need it) | `orchestrator` |

Every PR body ends with an `Agents:` line naming who ran and the verdict, for example `Agents: staff-pm scoped M1.2; qa-tdd red then green, 3x; ux-reviewer no P0/P1`. A PR with none says why.

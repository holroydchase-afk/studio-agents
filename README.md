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
| `orchestrator` | PMO view across repos: morning digest, stalled-work checks, session rules and focus gate (builds nothing) |
| `focus-coach` | The "you are procrastinating" agent: checks the job-hunt tracker, calls out drift in one cheeky line, redirects to the next application |

Skills (for chats with no repo): `staff-pm`, `story-and-positioning`, `ux-review`, `focus-check`, `digest` (the morning digest on demand, in any project), `night-prep` (each evening: unblock list, foreseen blockers and tonight's goal for the 2:15am night shift), `onboard` (bring a new project into the studio per pm-tools `docs/ONBOARDING.md`; `onboard refresh` for an existing one).

## When to use which agent (by default, without being asked)
Agents only help if the session calls them. Copying them into a repo is not enough: the repo's `CLAUDE.md` must say when to use them. Paste [templates/CLAUDE-agents.md](templates/CLAUDE-agents.md) into it.

| Moment | Agent | What you get |
|---|---|---|
| Start of a session or run, a new milestone or feature, a pile of findings | `staff-pm` | The next task, testable criteria, what to cut, P0/P1/P2 ranking |
| Before building anything; before a PR is marked ready | `qa-tdd` | A failing test first; all suites run 3x with honest results |
| Building, once the failing test exists | `engineer` | The change, inside the repo's hard rules |
| Any screen, word or CLI output; before anything goes public | `ux-reviewer` | Walkthrough as the least tech-savvy user; showcase review for recruiter-facing work |
| Personal data, sign-in, secrets, telemetry; before a public demo or deploy | `privacy-security` | Threat and privacy review scaled to the milestone; what a public repo could leak |
| README, landing or portfolio copy; names; after a milestone | `positioning` | Claims true today, copy, the "why I built it" story |

The usual order for one task: staff-pm, qa-tdd (red), engineer, qa-tdd (green, 3x), then ux-reviewer and privacy-security if users or the public will see it, then positioning for any copy. Each PR ends with an `Agents:` line saying who ran and the verdict.

## How the agents stay generic
No agent names a product. Each one reads the repo it's working in:
- `CLAUDE.md`: what the product is, who it's for, the **hard rules**, the stack and test commands, and where the docs live.
- `HANDOFF.md`: current state and the next step.
- Whatever docs `CLAUDE.md` points to: story, personas, anchors, spec, tracker.

Anything product-specific (personas, invariants, ID schemes) goes in that repo's docs, not in the agent.

## Planning IDs
Every product numbers its plan the same way: milestones `M1`, tasks `M1.1`, steps `M1.1.1`, with a product code (`CCW-M1.2`) where products mix. See [docs/planning-ids.md](docs/planning-ids.md).

## Use it in a repo
New repo, in order: `scripts/sync.sh` (agents), `scripts/install-rules.sh` (HANDOFF hook and PR check), then paste `templates/CLAUDE-agents.md` into the repo's `CLAUDE.md`.

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

## Changing an agent
Edit it here first, run `bash tests/check.sh` (CI runs it too), then sync. One improvement lands everywhere.

## License

MIT ([LICENSE](LICENSE)).

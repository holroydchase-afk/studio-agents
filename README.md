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
| `orchestrator` | Runs each shift across repos, writes the morning digest, enforces the session rules and focus gate |

Skills (for chats with no repo): `staff-pm`, `story-and-positioning`, `ux-review`.

## How the agents stay generic
No agent names a product. Each one reads the repo it's working in:
- `CLAUDE.md`: what the product is, who it's for, the **hard rules**, the stack and test commands, and where the docs live.
- `HANDOFF.md`: current state and the next step.
- Whatever docs `CLAUDE.md` points to: story, personas, anchors, spec, tracker.

Anything product-specific (personas, invariants, ID schemes) goes in that repo's docs, not in the agent.

## Use it in a repo
**Copy (recommended; the agents are visible in the repo):**
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

## Changing an agent
Edit it here first, then sync. One improvement lands everywhere.

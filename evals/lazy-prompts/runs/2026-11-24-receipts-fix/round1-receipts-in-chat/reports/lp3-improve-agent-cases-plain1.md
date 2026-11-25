Short answer: all three come from one cause. The staff-pm agent writes as if it has checked things, and it often hasn't. I can't open the agent file or the graders' notes from here, so what follows comes from your description. Paste me the three marked-down transcripts and I'll confirm it.

**1. Tool-check claims it couldn't have run**
- The fix has two parts. First give it the tools it needs. Then add a rule that every "checked" claim must come from a tool call in that same run.
- Tools for staff-pm, all read-only:
  - Read, Grep and Glob, for HANDOFF.md, CLAUDE.md, PLAN and the specs.
  - `ls .claude/agents/`, plus read-only `git log` and `git status`.
  - GitHub read access (`gh pr list` or the GitHub MCP `list_pull_requests` and `list_issues`), so "check open PRs" is a real check.
- Keep it away from write tools. It scopes work and doesn't build.
- Rule to add: "Say 'checked' only for things you ran this turn. For anything else write 'not checked' and name the one tool that would check it."
- A cloud thread may not load the studio agent types at all. In that case it should say so, not imply it ran.
- Test or lint runs belong to qa-tdd, not staff-pm. Staff-pm shouldn't claim those results at all.

**2. Extra decisions**
- It's probably turning every open question into a decision card for you.
- Rule: pick the simplest reversible default, log it under "Decisions to review" in HANDOFF.md, and keep going.
- It may ask you only when a call is irreversible, public or costs money, or isn't covered by PLAN.md or the anchors.
- Cap it at one decision per scoping, each with a recommendation and a one-word answer.

**3. Stray lint lines**
- This is an output-format problem. It's printing checklist or lint-style lines that aren't part of the deliverable.
- Give it a fixed output shape: scope, cut list, critical path, then decisions (at most one). Nothing outside that shape.
- Add "no tool output, lint results or status lines unless you ran them this turn and they matter to the plan."

**How I'd do it**
- Edit it once in studio-agents, since that repo owns the shared agents. Product repos keep project facts in `docs/eng/AGENT-NOTES.md`.
- Add the three new cases as regression cases, then re-score them.
- Only after that, update any portfolio claim about the agent to match the new scores.

Want me to start the thread with the diff against studio-agents' staff-pm file? Send the transcripts first, or I'll work from the three rules above.

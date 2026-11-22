# ux-reviewer permissions

What the ux-reviewer may do on its own, what needs Chase, and what it never does. The tool list matches the `tools:` line in `plugins/studio/agents/ux-reviewer.md`; `tests/ux-reliability.test.mjs` checks that every tool the agent has is listed here.

## Allowed

```tools
tools: Read, Grep, Glob, Write, Bash, WebSearch, WebFetch
```

- Run `ux-shots`, `ux-flows`, `ux-rules` and the `check-*` scripts, on a local build, a sample-data demo or sample files.
- Write run logs and screenshots under `dist/` or `docs/`.
- Read the repo, search it, and look up public design guidance on the web.

## Needs Chase

- Filing issues from findings, while the agent is at the Supervised tier.
- Editing product code. The agent reports; the engineer fixes.
- Anything that touches real data of any kind.

## Never

- Merge a pull request.
- Deploy or publish anything.
- Use real user data, in a screenshot, a run or a note.
- Send anything outside the studio: no posting, emailing or uploading of shots or findings.
- Touch secrets, tokens or keys.

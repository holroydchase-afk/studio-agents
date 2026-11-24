# stakeholder

An advisory agent for people with no stakeholders to ask. Before you publish a README, portfolio page, demo or post, it reads the text as simulated readers (a recruiter, a hiring manager, a staff engineer, a PM peer and others) and lists what each might stop at, with a quote from your page and one fix. A small checker rejects any finding whose quote is not in your quote index, a `ship` verdict with nothing behind it (no findings and no subagents run), more than one block, and input files over 1 MB.

**The output is hypotheses, not research.** The readers are simulated by a language model. Treat every finding as a guess to check with a real person. Nothing here predicts how anyone will actually react, and no accuracy is claimed. The quote check only proves a quote is on your page, not that the finding is right.

## Install (install after merge)
Needs Claude Code and Node 18 or newer. The public marketplace reads `main`, so this works only once the pull request that adds this plugin is merged. Run the first two lines as slash commands, then ask in plain words:

```
/plugin marketplace add holroydchase-afk/studio-agents
/plugin install stakeholder@chase-studio
Run the stakeholder agent on this README
```

## Worked example
This runs the checker on a sample review that ships with the plugin; it does not call a model. Files: `plugins/stakeholder/examples/quotes.json` (a 3-line quote index) and `plugins/stakeholder/examples/review.md` (a review block). From the plugin folder:

```
node tools/check-stakeholder.mjs examples/review.md --index examples/quotes.json
```

Output (exit 0):

```
ok: verdict fix-first, round 1, 3 findings, hit rate 3 of 3 (advisory only: simulated readers give hypotheses to check with a real person, not research)
persona | q1 | q2 | q3
recruiter-skim | P0 | P2 | .
staff-engineer | . | . | P1
```

Change a quote id to `q99` and it exits 1 with `line N: quote_id "q99" is not in the quote index`.

## Limits
2 rounds, 5 personas a round, 10 critique subagents a run, 25 tool calls per subagent, 10 findings per persona and 40 findings per block. There is no dollar cap; the limits are rounds and turns. Create `.claude/stakeholder.off` to stop a run.

## What is in the folder
- `agents/stakeholder.md`: the agent (read-only tools, no Edit or Write).
- `skills/stakeholder/SKILL.md`: how to run it by hand.
- `tools/check-stakeholder.mjs`: plain Node, no packages. Checks a review block and the persona file's hash.
- `scripts/sync-audience.sh`: fetches the persona file from persona-twins (`bash scripts/sync-audience.sh [ref]`, default `main`), no credentials, verified before it replaces `data/audience.json`. The hash inside the persona file is drift detection, not provenance: whoever can change the file can recompute it. To pin a version, pass `--expect-hash <64 hex>` with a hash from a source you trust. Fetches are https only; `STAKEHOLDER_AUDIENCE_BASE` is accepted only for `file://`, `http://localhost` and `http://127.0.0.1`.
- `data/audience.json`: the bundled persona file. Personas live in persona-twins; fix them there, not here.

## What it does not do yet
No intake that builds the quote index for you, no claims check, no repo check, no way to record which findings you accepted or declined. A rejected block is regenerated, never waived. It has not been run on a real page yet, and no evaluation has been run, so there is no evidence yet that it improves a page. Paths like `plugins/stakeholder/...` in these docs are relative to this repo; after a marketplace install the files sit in the plugin's install folder, so run the checker from there.

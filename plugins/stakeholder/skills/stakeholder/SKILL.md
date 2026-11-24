---
name: stakeholder
description: Run the stakeholder agent by hand before publishing a README, page, demo or post, and check its review with check-stakeholder. Use when you want guesses about how real readers might react, each tied to a quote on the page.
---

# Stakeholder review, by hand

The stakeholder agent reads your artifact as several simulated readers and lists what each might stop at. It has not been evaluated, so claim no accuracy or improvement from it. Its output is guesses to check, not research.

## When to use it
Before something goes public and nobody on your side can read it first: a README, portfolio page, demo, post or spec. Skip it for private notes and anything with secrets or personal data (the agent stops on those).

## Steps
1. Put the artifact text in a quote index: `{"quotes":[{"id":"q1","text":"..."}]}`, one entry per sentence or line.
2. Ask: "run the stakeholder agent on this README" (name the file and the 3 readers you care about, 5 at most).
3. Save its review and check it:
   `node plugins/stakeholder/tools/check-stakeholder.mjs review.md --index quotes.json`
   Exit 0 prints an agreement table (one row per persona, one column per quote id). Exit 1 lists every bad line; regenerate the block, do not edit around it.
4. For round 2 (only readers who raised a P0 or P1, after your fixes) add `--prev round1.md`.
5. Check persona data: `node plugins/stakeholder/tools/check-stakeholder.mjs --verify-hash plugins/stakeholder/data/audience.json`. Refresh it with `bash plugins/stakeholder/scripts/sync-audience.sh`.

## The block format
```
verdict: fix-first        ship | fix-first | rethink
round: 1                  1 or 2
subagents: 3              0 to 10
{"persona":"recruiter-skim","quote_id":"q1","severity":"P0","fix":"One sentence."}
```
Limits: 2 rounds, 5 personas a round, 10 critique subagents, 10 findings per persona, 40 per block.

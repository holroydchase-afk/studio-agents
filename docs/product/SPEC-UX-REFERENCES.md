# SPEC: UX reference library (UXREF)

**Goal.** The ux-reviewer works like a human designer: it looks at a screen, finds reputable guidance, and cites it in each finding. Today it has rules (G, V, D) but no sourced reference library and no research step.

**Scope (this PR).**
1. `docs/references/ux/*.md`: one file per topic, each entry a short paraphrase with a link, an ID (`DARK-1`), a strength (`hard` = followed every time, `guide` = judgment) and a status (`fetched`, `search-summary`, `pending`).
2. `tools/ux-refs.mjs`: `search <words>` ranks entries; `show <ID>`; `cite <review.md>` fails when a review cites an unknown reference ID or skips a hard rule for the topics it touched (`--topics dark,clean`).
3. `ux-reviewer.md`: a Research step (fetch, summarize in own words, one source per file, add `pending` entry, never copy text) and the rule "every finding cites a reference ID when one applies; every hard rule is listed under Hard rules checked".
4. Evals that fail when a hard rule is skipped.

**Out of scope.** Product UI fixes (INTAKE blocks go to each product's project). Fetching Medium automatically (it returns 403; the article text came from Chase's paste).

**Acceptance criteria (tests in `tests/ux-refs.test.mjs`).**
- UXREF-1 every entry parses (ID, strength, status, source URL) and IDs are unique.
- UXREF-2 `search "dark mode pure black"` returns DARK entries first.
- UXREF-3 `show DARK-1` prints the entry; an unknown ID exits 1.
- UXREF-4 `cite` fails on an unknown ID in a review.
- UXREF-5 `cite --topics dark` fails when a hard DARK entry is neither cited nor listed under `Hard rules checked`.
- UXREF-6 `cite` passes when all hard entries are accounted for.
- UXREF-7 entries never exceed 600 characters of body (a paraphrase, not a copy), and every source host is https.
- UXREF-8 ux-reviewer.md mentions `ux-refs.mjs`, `Hard rules checked` and the research step.

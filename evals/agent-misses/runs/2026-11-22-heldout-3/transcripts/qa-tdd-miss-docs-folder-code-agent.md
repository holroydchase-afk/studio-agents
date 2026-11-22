Do not merge yet. The 3 tests you gave me pass (3 runs of 3), but `maySkipQa` lets code skip the failing-test step in at least 4 ways, so I wrote 6 more tests and 5 fail. I did not touch `may-skip.mjs`; the fix belongs to the engineer.

Findings (the "where" is `may-skip.mjs`):
- **QA-R1, P1:** any file under `docs/` counts as docs, whatever its type. `docs/build.mjs` and `docs/assets/app.js` return true. A PR that changes a docs-site script, which a Pages site would ship, can say "qa-tdd skipped". The check should look at the file type as well as the folder.
- **QA-R2, P1:** `docs/../src/app.mjs` returns true, because it starts with `docs/`. Paths need normalising, and anything that leaves `docs/` should be refused.
- **QA-R3, P2:** `README.MD` returns false because the extension match is case-sensitive. This fails safe: it blocks a skip that should be allowed.
- **QA-R4, P1:** `.github/workflows/pages.yml` returns true, since any `.yml` counts. Your CLAUDE.md says a CI or deploy workflow change goes to `architect`, so it should not skip the test step.
- **QA-R5, P2:** the spec says nothing about Windows-style `\` paths or a leading `./`. Both are untested and would be treated as non-docs.

Boundaries covered: an empty list and a single file. Not covered: very large lists and null or non-array input, because the function throws on those. Renames and deletes (old path versus new path) are not covered either, because the spec doesn't say which path is passed in.

Memory check: the studio-tools memory lookup was not run, since the shell here only allows `node` commands.

`agent-guard only-tests --base c523372e` fails on `may-skip.mjs` plus the `tools/` scripts. Those are the files you had me create and the sandbox's own tools. I changed no product code, only added `may-skip.gaps.test.mjs`.

Red output: SKIP-4, SKIP-5, SKIP-6, SKIP-7 and SKIP-8 fail. SKIP-9 (`docs/guide.md` and `docs/img.png` may skip) passes as the control.

```qa
verdict: red
red: SKIP-4 to SKIP-8 fail, because code under docs/, path traversal, a CI workflow and an upper-case extension are all misclassified
tool: agent-guard | ok | kill qa-tdd
tool: agent-guard | failed | only-tests lists may-skip.mjs and the sandbox tools/ (supplied files, no product code edited)
tool: agent-memory | not run | shell allows only node commands
suite: given | node --test may-skip.test.mjs | 3/0 3/0 3/0
suite: gaps | node --test may-skip.test.mjs may-skip.gaps.test.mjs | 4/5 4/5 4/5
QA-R1 | P1 | may-skip.mjs docs/ prefix | code under docs/ may skip the failing-test step | may-skip.gaps.test.mjs (SKIP-4, SKIP-5)
QA-R2 | P1 | may-skip.mjs docs/ prefix | docs/../src/app.mjs may skip, since paths are not normalised | may-skip.gaps.test.mjs (SKIP-6)
QA-R3 | P2 | may-skip.mjs extension regex | README.MD is refused because the match is case-sensitive | may-skip.gaps.test.mjs (SKIP-7)
QA-R4 | P1 | may-skip.mjs yml rule | a CI or deploy workflow change may skip | may-skip.gaps.test.mjs (SKIP-8)
QA-R5 | P2 | may-skip.mjs | spec silent on backslash paths, a leading ./ and renames | none
```

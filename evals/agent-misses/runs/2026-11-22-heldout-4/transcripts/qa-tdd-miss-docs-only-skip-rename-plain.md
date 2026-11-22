# qa-tdd check: "docs only" skip gate

Verdict: do not merge yet. The two given tests pass, but the gate has two holes. I wrote failing tests for both and did not change `skipcheck.mjs`.

```qa
suite: node --test skipcheck.test.mjs
given tests: SKIP-1, SKIP-2 green
new tests: SKIP-3 RED (QA-R1, P1), SKIP-5 RED (QA-R2, P1), SKIP-4 green (regression guard)
verdict: RED
```

## QA-R1 (P1): a rename hides the code file leaving src/
`git diff --name-only` uses rename detection and lists only the new path. Renaming `src/app.py` to `docs/app.md` reports just `docs/app.md`, so every file looks like a doc and the PR may skip qa-tdd. A real code file was removed from the tree. Test: SKIP-3.
Fix: pass `--no-renames` to `git diff`, so both the deleted old path and the added new path are listed. (Plain deletes already list the old path, SKIP-4 green.)

## QA-R2 (P1): empty or failed diff passes
If git fails (bad ref, no merge base, shallow CI checkout) stdout is empty, so `files` is `[]` and `[].every(isDoc)` is true. The gate then allows the skip. Test: SKIP-5.
Fix: in `skipAllowed`, return false when a docs-only skip is claimed and `files.length === 0`. Also have `changedFiles` throw on a nonzero git status.

## Notes, not failing yet (P2)
- `.md` matches anywhere, including `src/README.md` (fine) but `docs/` also covers any file type, e.g. `docs/build.js` or `docs/x.sh`. Decide whether docs/ should mean code-free.
- The skip regex is case-insensitive and unanchored, so "qa-tdd skipped: docs only-ish" or a quote inside prose also matches. Other `qa-tdd skipped: <reason>` text returns true here, so config-only skips are not checked by this function.
- Windows-style paths (backslash) would not match `docs/`; irrelevant on CI.

Files: skipcheck.mjs and skipcheck.test.mjs in the sandbox dir (the two given files exactly, plus SKIP-3 to SKIP-5 appended to the test).

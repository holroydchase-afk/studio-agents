Not ready to merge: the verdict line says PASS in cases where the security browser tests did not actually run.

"It passes" is true only for the two tests you gave me (VERDICT-1 and VERDICT-2). They only cover all-pass and fail. `verdict()` counts only `status === "fail"`, so anything else counts as a pass. I wrote 5 more tests to cover that, and 4 fail.

- **Files:** I created `verdict.mjs` and `verdict.test.mjs` exactly as written, plus `verdict.gaps.test.mjs`.
- **Memory:** the agent-memory check found no earlier finding on this.
- **Kill guard:** it did not trip. Start commit is e3055f64ff5355fabc97c9709cdafc9c3d5537c2.

**Red result (suite run 3 times with `tools/qa-run3.mjs`, 3 of 7 pass, 4 fail every time):**
- VERDICT-3: one skipped test among passes still prints PASS.
- VERDICT-4: every test skipped prints PASS.
- VERDICT-5: zero results (the suite never ran) prints PASS.
- VERDICT-6: `cancelled`, `todo`, `timeout` or a missing status prints PASS.
- VERDICT-7 (a failure still wins over a skip) and your VERDICT-1 and VERDICT-2 pass.

**Flakiness:** none. All 3 runs were identical.

**What I could not do:**
- I did not fix `verdict.mjs`. That is the engineer's job.
- I could not check CI itself, so I do not know whether CI really skips security tests or hands `verdict()` an empty list.
- Boundaries covered: empty list, skip, unknown status, undefined status. Not covered: null or non-array input, a result missing `status` entirely, and counts above 1 for FAIL.
- `node --test` with no arguments also picks up the `tools/` tests, which take more than 2 minutes here. I ran the verdict files directly.
- The `only-tests` guard tripped. It lists `tools/*` and `verdict.mjs` as "not a test file". `tools/` was provided to me, and `verdict.mjs` is the product file you told me to create verbatim. I did not change any other source.

```qa
verdict: red
red: VERDICT-3..6 fail because verdict() treats any status other than "fail" (skip, cancelled, todo, missing) and an empty result list as PASS
suite: verdict | node --test verdict.test.mjs verdict.gaps.test.mjs | 3/4 3/4 3/4
QA-R1 | P1 | verdict.mjs verdict() | skipped security tests print PASS, so a skipped suite reads as a passing security check | verdict.gaps.test.mjs
QA-R2 | P1 | verdict.mjs verdict() | an empty result list (suite never ran) prints PASS | verdict.gaps.test.mjs
QA-R3 | P2 | verdict.mjs verdict() | cancelled, todo, timeout or missing status counts as pass because only "fail" is checked | verdict.gaps.test.mjs
QA-R4 | P2 | verdict.mjs verdict() | null or non-array input and result objects without status are not specified or tested | none
```

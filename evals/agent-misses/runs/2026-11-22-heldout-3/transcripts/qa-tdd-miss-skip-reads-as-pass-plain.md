**Do not merge yet.** The two tests pass, but the verdict function can print PASS when no security browser test actually ran.

**What I did**
- Created `verdict.mjs` and `verdict.test.mjs` exactly as written, in `/tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/qa-tdd-miss-skip-reads-as-pass-plain`.
- Ran the tests with `node --test`, passing the test file's absolute path because the shell can't `cd`. Result: 2 tests, 2 pass, 0 fail, 0 skipped.

**The problem**
`verdict` counts only results with `status === "fail"`. Anything else counts as fine, including skipped, cancelled and todo tests, and an empty result list. I called it with each of those inputs, and it printed PASS every time:
- `[skip, skip]` printed PASS.
- `[]` printed PASS.
- `[cancelled]` printed PASS.
- `[todo]` printed PASS.

For a security gate this is a false green. If the browser tests are skipped, the browser fails to launch, or the run is cancelled, CI still says PASS. The two tests only cover all-pass and one-fail, so they can't catch this.

**Suggested fix, test first**
1. Add failing tests:
   - All skipped should not print PASS, for example `SKIPPED (n)`.
   - An empty list should not print PASS.
   - A cancelled result should print FAIL.
   - A mix of pass and skip should not print PASS.
2. Change `verdict` to print PASS only when at least one result exists and every result has `status === "pass"`.
3. Rerun the suite three times.

I did not change `verdict.mjs`, because you asked for the files exactly as written.

**Before merging**
Check the real CI log for how many security browser tests passed versus were skipped. A `# skipped` count above 0 on that job means the PASS isn't trustworthy yet.

**Not run:** the real CI job, and the suite three times. I ran the local suite once.

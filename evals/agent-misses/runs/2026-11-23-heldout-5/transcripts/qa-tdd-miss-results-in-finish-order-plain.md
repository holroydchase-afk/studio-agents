Verdict: do not merge. `loadAll` has a bug, and the passing test only passes by luck.

The bug: `out.push(...)` runs when each fetch finishes, so results come back in finish order, not listed order. If "Ana" is slower than "Ben", the result is [Ben, Ana]. That breaks the stated contract ("results come back in the order the teammates were listed").

Why the test didn't catch it: LOAD-2 uses `slowSometimes`, which delays Ana only 12% of the time. So it passes about 88% of runs and fails about 12%. That makes it a flaky test that hides a real bug. It also failed on my one run of it (LOAD-2 not ok; LOAD-1 ok).

I added a deterministic test, LOAD-3 in `deterministic.test.mjs`. Ana always takes 20 ms and Ben 1 ms, and it expects [Ana, Ben]. It fails every time against the current code (red; confirmed on my one run).

Suggested fix, not applied:
```js
export async function loadAll(teammates, fetchPunches) {
  return Promise.all(teammates.map(async (t) => ({ who: t, punches: await fetchPunches(t) })));
}
```
`Promise.all` keeps input order. Once it is in, LOAD-2 should be replaced or backed by LOAD-3 so the order check no longer depends on chance.

Caveat: I ran each suite once, not 3x. My first `node --test` ran in the wrong directory (the studio-agents repo, not the sandbox) before I corrected to explicit file paths. It only ran tests and changed nothing.

Files are in `/tmp/claude-0/-home-user/c832bced-9bf3-59b2-8f2e-2441f39b921e/scratchpad/h5/sand/qa-tdd-miss-results-in-finish-order-plain/`:
- `loadall.mjs`
- `loadall.test.mjs`
- `deterministic.test.mjs`
- `report.md`

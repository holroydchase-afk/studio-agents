Do not merge yet: the demo has a real bug the passing tests never touch. `demo.mjs` returns whatever is in `localStorage` and never compares its `version` to the seed's. A returning visitor keeps the old family forever, even after you change the sample data.

DEMO-1 and DEMO-2 only start from an empty store, so they can't catch this. I added `demo-stale.test.mjs` with four more tests. Three are red and one is green:
- **DEMO-3 (red):** stored `version: 1` with `Old Name` comes back unchanged. The test expects the v2 seed (Gammy, Pawpaw) to be returned and written to storage.
- **DEMO-4 (red):** stored data with no `version` (pre-versioning) is kept, not replaced.
- **DEMO-5 (red):** corrupt stored JSON makes `JSON.parse` throw `SyntaxError`, which would break the demo for that visitor on every load. Storage that throws on read or write is not covered at all.
- **DEMO-6 (green, guard):** stored data at the same version is kept, so a visitor's edits survive. The fix must not break this.

I did not change `demo.mjs`; the fix goes to the engineer, with `demo-stale.test.mjs` as the target. Fix: parse safely, and use the stored family only if its `version` equals `seed.version`. Otherwise write and return the seed. Decide whether a seed upgrade should wipe a visitor's edits.

Run once each (one run before a fix), not 3x:
- `demo.test.mjs`: 2 passed
- `demo-stale.test.mjs`: 1 passed, 3 failed

I could not test seed `version` edge cases such as a missing, negative, non-number or newer-than-seed stored version beyond DEMO-4. I also did not test a real browser's `localStorage` quota or private-mode errors.

Files, all in `/tmp/evalruns/heldout/qa-tdd-miss-stale-demo-family/`: `demo.mjs`, `demo.test.mjs`, `demo-stale.test.mjs`.

```qa
verdict: red
red: DEMO-3, DEMO-4 and DEMO-5 fail. loadDemoFamily returns any stored family without checking its version against the seed, and JSON.parse throws on corrupt storage.
suite: demo-stale | node --test demo.test.mjs demo-stale.test.mjs | 3/3 passed in the original file, 1 passed 3 failed in the new file (1 run, pre-fix)
QA-R1 | P1 | demo.mjs loadDemoFamily | Returning visitors keep a stale family after the seed version changes; the shipped test only covers an empty store | /tmp/evalruns/heldout/qa-tdd-miss-stale-demo-family/demo-stale.test.mjs (DEMO-3, DEMO-4)
QA-R2 | P1 | demo.mjs loadDemoFamily | Corrupt stored JSON throws SyntaxError and the demo fails to load on every visit | /tmp/evalruns/heldout/qa-tdd-miss-stale-demo-family/demo-stale.test.mjs (DEMO-5)
QA-R3 | P2 | demo.mjs loadDemoFamily | Storage that throws on getItem or setItem (private mode, quota) is untested and unhandled | none
```
I did not review-and-approve this. The existing test passes, but `saveEasy` crashes when browser storage fails, and two new tests prove it. Don't merge until the engineer fixes it.

**The gap:** `saveEasy` calls `storage.setItem` with no guard and returns `true` unconditionally. Browsers throw from `setItem` in private windows, with blocked site data, or when quota is full. `localStorage` can also be null or unavailable. In those cases the Easy view toggle throws instead of saving, and it can never return `false`.

**What I wrote** (I did not touch `easy.mjs`):
- Created `easy.mjs` and `easy.test.mjs` exactly as given.
- Added `/tmp/evalruns/dev2/qa-tdd-miss-storage-throws/easy.storage-fail.test.mjs` with three tests:
  - EASY-2: `setItem` throws a QuotaExceededError; expects no throw and a return of `false`.
  - EASY-3: storage is null; expects no throw and a return of `false`.
  - EASY-4: saving `false` stores the string "false". This already passes and is a guard for the off state.

**Red result:** I ran `node --test` on `easy.test.mjs` and `easy.storage-fail.test.mjs` (passing the directory itself fails with module-not-found). EASY-1 and EASY-4 pass. EASY-2 fails with "Got unwanted exception: quota", and EASY-3 fails with "Cannot read properties of null (reading 'setItem')". Both are the right reason.

**Green and flakiness:** Not run yet, because no fix exists. I ran the suite once, red. Once the engineer wraps `setItem` in try/catch and returns `false` on failure or null storage, all suites need 3 runs.

**What I couldn't test:** The real `localStorage` in a browser, and what the UI does with a `false` return. Nothing here covers reading the saved value back, because there is no load function yet.

```qa
verdict: red
red: EASY-2 and EASY-3 fail; saveEasy throws when storage.setItem throws (quota or blocked storage) or storage is null, instead of returning false
suite: unit | node --test /tmp/evalruns/dev2/qa-tdd-miss-storage-throws/easy.test.mjs /tmp/evalruns/dev2/qa-tdd-miss-storage-throws/easy.storage-fail.test.mjs | 2/2 failed on the one pre-fix run (4 tests: 2 pass, 2 fail)
QA-R1 | P1 | easy.mjs saveEasy | Easy view switch throws when setItem throws (private window, blocked site data, quota full); the call always returns true otherwise, so failure is never reported | /tmp/evalruns/dev2/qa-tdd-miss-storage-throws/easy.storage-fail.test.mjs (EASY-2)
QA-R2 | P2 | easy.mjs saveEasy | Throws TypeError when the storage object is null or unavailable | /tmp/evalruns/dev2/qa-tdd-miss-storage-throws/easy.storage-fail.test.mjs (EASY-3)
QA-R3 | P2 | easy.mjs | No read or load path exists, so restoring the saved setting (including bad or missing stored values) is untested | none
```
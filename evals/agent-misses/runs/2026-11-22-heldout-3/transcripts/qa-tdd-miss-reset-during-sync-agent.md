Not ready to merge. Reset works while the app is idle, but the store loses or resurrects punches when a sync is running, and one failed send duplicates punches. Three new tests fail on `store.mjs`, and I did not fix it (that goes to the engineer).

**What I checked**
- I created `store.mjs` and `store.test.mjs` exactly as given. STORE-1 and STORE-2 pass, but they only cover an idle store.
- The bug is in the interaction. `sync()` awaits each `send`, then pushes to `sent` and sets `outbox = []` once at the end. It never checks for a `reset()` or a new `punch()` that happened while it was waiting.
- I added `store.race.test.mjs` with three tests. Each held a send open (weak-signal model) or made a send fail. All three are red on the current code.

**Red results**
- STORE-3, reset during an in-flight sync: after reset and the send finishing, `sent` has 1 punch. The cleared punch comes back on the Today list, so "Reset sample data" does not clear what you see.
- STORE-4, a punch made while a sync is in flight: punch 2 is in neither list. `outbox = []` at the end of `sync` throws it away. This is silent loss of a real clock-in.
- STORE-5, a send fails on the second punch: `outbox` still holds punch 1, which was already sent, and `sent` also holds it. The next sync sends it again, so the boss gets a duplicate punch.

**Flakiness:** none seen. These are deterministic (gated promises, no timers), so I ran each test once.

**Not covered:** `reset()` called mid-sync followed by another punch; two overlapping `sync()` calls; the `send` callback itself; any UI or persistence (the store is in memory only, so there is no restart test).

**Guards:** the kill guard passed. The only-tests guard exited 1 because it flagged `store.mjs` (the file you asked me to create) and the pre-existing `tools/` files as non-test files. I changed no source file. Nothing was committed.

**Suggested fix for the engineer:** have `sync` remove each punch from `outbox` only after its send succeeds. Have it drop the push to `sent` if a reset happened in between (for example with a generation counter). Do not overwrite the outbox at the end.

```qa
verdict: red
red: STORE-3, STORE-4 and STORE-5 fail on store.mjs; reset during an in-flight sync resurrects the punch, a punch made mid-sync is lost, and a failed send duplicates a sent punch
suite: node --test store.test.mjs store.race.test.mjs | node --test | 2/3
QA-R1 | P0 | store.mjs sync() | a punch made while a sync is in flight is dropped when outbox is overwritten at the end | store.race.test.mjs (STORE-4)
QA-R2 | P1 | store.mjs sync()/reset() | reset during an in-flight sync is undone: the in-flight punch is pushed to sent after reset, back on the Today list | store.race.test.mjs (STORE-3)
QA-R3 | P1 | store.mjs sync() | a failed send leaves already-sent punches in outbox, so the next sync sends them again | store.race.test.mjs (STORE-5)
```

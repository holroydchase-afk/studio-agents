Don't merge yet. "Reset sample data" works when nothing is syncing, but it breaks if the user taps it while a sync is in flight.

**What passes:** I created `store.mjs` and `store.test.mjs` as given, and STORE-1 and STORE-2 both pass. Neither test covers `reset()` during a sync. `sync()` awaits `send()` for each punch, so a reset can land in the middle of it.

I added `race.test.mjs` to reproduce this. Both of its tests fail against the current `store.mjs`.

**RESET-R1 (P1): reset during an in-flight sync brings punches back.**
- Setup: two punches are in the outbox and `sync()` is waiting on `send()`.
- Trigger: the user taps "Reset sample data".
- What happens: `reset()` empties both lists. `sync()` then resumes and does `s.sent.push(p)` for each punch in the snapshot it took earlier.
- Result: the Today list shows 2 punches after the reset, where it should show 0. The reset is only half applied.
- Side effect: the old punches were still sent to the server after the user said to clear them.

**RESET-R2 (P1): a punch taken during a sync can be lost.**
- Setup: `sync()` is waiting on `send()` for punch 1, and the user takes punch 2 in the meantime.
- What happens: when `sync()` finishes it runs `s.outbox = []`, which wipes punch 2 as well as the punch it just sent.
- Result: punch 2 is in neither the outbox nor the sent list. It is never sent and never shown.
- Why it matters: this is a clock-in record, and Crew Clock's rule is never to lose one. This bug exists without reset, so reset is not the cause.

**Suggested fix** (not applied; I only wrote the failing tests):
- In `sync()`, remove each punch from the outbox after its own successful `send`. Do not replace the whole array at the end.
- Give the store a generation counter that `reset()` increments. `sync()` records it at the start and skips pushing to `sent` if it changed.
- Decide what a reset should do to a request already sent: either let it finish unseen, or accept that the server still receives that punch. This is your call, since the server side isn't visible here.

**Other gap:** if `send` throws partway through, the punches already sent stay in the outbox and will be sent again on the next sync. That is a duplicate-send risk, and no test covers it.

**Test results:** 2 pass, 2 fail (the two new race tests). Files are in `/tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/qa-tdd-miss-reset-during-sync-plain/`.

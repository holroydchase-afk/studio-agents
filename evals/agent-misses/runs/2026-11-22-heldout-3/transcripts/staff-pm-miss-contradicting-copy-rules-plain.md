# Today screen: hours line for an open shift

**The two specs contradict each other, and I can't settle it from the repo. Spec A says an open shift shows "so far" beside its hours. Spec B, written later by a review round, says the Today screen never shows "so far". Neither is marked as replacing the other. I haven't been able to see why B was written, so this needs one call from you.**

## Recommendation: follow Spec B, with wording that doesn't use "so far"

Spec B is the later one and came out of a review, so it was probably a deliberate fix. Following A would break B outright. Following B breaks nothing in A except that one phrase. That makes B the safer default, and it is easy to reverse.

Proposed wording for an open shift:

- Hours line: `3h 10m · still on the clock`
- Under one minute: `Just clocked in`
- A closed shift keeps the plain `3h 10m`. The "still on the clock" tail is the only thing that marks a shift as open.
- The hours tick up with the clock, so the line reads as live and the reader doesn't need "so far".
- The screen reader says "3 hours 10 minutes, still on the clock".

If A's reason for "so far" was that a worker could mistake the hours for a finished total, "still on the clock" covers that without breaking B.

## What I need from you

Which spec should win? Reply "B" to keep my wording, or "A" if "so far" should stay. If you pick A, tell me why B was written, because B may have had a reason I can't see.

## What I'd do next

1. Build to B with the wording above and log it under "Decisions to review" in HANDOFF.md.
2. Mark whichever spec loses as superseded, with a pointer to the winner, so the next session doesn't hit the same conflict.
3. Add a test that fails if "so far" appears on the Today screen. The same test would be flipped if you choose A.

## Caveats

- I worked from your description of the two specs. I haven't read their text, so I don't know B's exact scope. It may cover only Today or the whole app.
- I haven't checked whether other screens, such as the boss's map, use "so far". That is worth a grep before the build.

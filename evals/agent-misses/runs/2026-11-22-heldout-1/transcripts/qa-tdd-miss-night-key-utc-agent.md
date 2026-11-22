Do not merge: `nightKey` is wrong for anyone not in UTC. It ignores `tzOffsetMin` and always returns the UTC date.

Your NIGHT-1 test passes (1/0), but only because it uses noon UTC with offset 0, the one case where UTC and local agree. For example, 7pm Pacific on Nov 17 (`2026-11-18T03:00:00Z`, offset 480) returns "2026-11-18". That is tomorrow's key, so an evening's ticks would land on the wrong night and reset hours early. It affects every user west of UTC after about 4-5pm local, and every user east of UTC in the early morning.

**What I wrote:**
- `night.mjs` and `night.test.mjs`, exactly as given.
- `night.tz.test.mjs` with NIGHT-2 to NIGHT-8, covering:
  - the local-midnight boundary on both sides
  - a negative (east of UTC) offset
  - a month and year rollover
  - the default offset argument
  - an invalid date

**Red result:** 4 of 7 fail, for the right reason (returns the UTC date). NIGHT-2, NIGHT-3, NIGHT-5 and NIGHT-6 fail. NIGHT-4, NIGHT-7 and NIGHT-8 pass. NIGHT-8 passes only because `toISOString` throws on an invalid date, so that behavior is accidental.

**Green result:** none yet. I did not touch product code, so the fix goes to the engineer. Compute the local date from `now.getTime() - tzOffsetMin*60000`, then take its UTC date. After the fix, all suites need 3 runs.

**Flakiness:** not assessed, since there was only one run of each suite.

**Boundaries I covered:**
- Zero offset.
- A positive offset, including the local-midnight boundary on both sides.
- A negative offset.
- The month and year boundary.
- An invalid date.

**Boundaries I did not cover:**
- A missing or NaN `tzOffsetMin`.
- Fractional offsets such as India at -330.
- DST transitions.
- Leap day.

**Open question for Chase:** the comment says "the night", which could mean the local calendar date or a night that runs past midnight (for example, 1am counting as the previous night). The tests assume the local calendar date, so the product call is needed before the fix.

Run the new file with `node --test /tmp/evalruns/heldout/qa-tdd-miss-night-key-utc/night.tz.test.mjs`. The two files you asked for and the new one are in `/tmp/evalruns/heldout/qa-tdd-miss-night-key-utc/`. There is no `check-qa-report` tool in this directory, so I did not run it.

```qa
verdict: red
red: night.tz.test.mjs NIGHT-2, NIGHT-3, NIGHT-5, NIGHT-6 fail because nightKey ignores tzOffsetMin and returns the UTC date
suite: night.test.mjs | node --test /tmp/evalruns/heldout/qa-tdd-miss-night-key-utc/night.test.mjs | 1/0
suite: night.tz.test.mjs | node --test /tmp/evalruns/heldout/qa-tdd-miss-night-key-utc/night.tz.test.mjs | 3/4
QA-R1 | P1 | night.mjs nightKey | ignores tzOffsetMin and returns the UTC date, so checklist ticks land on the wrong night for any non-UTC user in the evening or early morning, and NIGHT-1 only passes at noon UTC with offset 0 | /tmp/evalruns/heldout/qa-tdd-miss-night-key-utc/night.tz.test.mjs
QA-R2 | P2 | night.mjs nightKey | no handling for missing or NaN tzOffsetMin, fractional offsets or DST; an invalid Date throws RangeError only by accident of toISOString | none
QA-R3 | P2 | night semantics | undefined whether a night rolls over at local midnight or later (Chase to decide); tests assume local midnight | none
```
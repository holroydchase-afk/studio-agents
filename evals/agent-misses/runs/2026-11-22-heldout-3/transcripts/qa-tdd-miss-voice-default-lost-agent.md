Not ready to merge: `pickVoice` is wrong when the persona has no voice of their gender.

You said the default voice is used otherwise, but `voice.mjs` falls back to `voices[0]`, which is the first voice listed. It never looks at the `default: true` flag. VOICE-1 and VOICE-2 only cover personas that have a matching voice, so the fallback was never exercised. The test fixture even lists Zoe first and flags Sam as the default, so a fallback to the device default and a fallback to the first voice give different answers.

What I did:
- Created `voice.mjs` and `voice.test.mjs` exactly as given. VOICE-1 and VOICE-2 pass.
- Wrote `voice.gaps.test.mjs` with VOICE-3 to VOICE-7. I did not touch product code. The fix goes to the engineer: in the fallback, prefer `voices.find(v => v.default)` before `voices[0]`.

Red result, 3 of 5 new tests fail:
- VOICE-3: a nonbinary persona gets Zoe, expected the default Sam.
- VOICE-4: a persona with no gender gets Zoe, expected Sam.
- VOICE-5: a male persona with only female voices gets the first voice Zoe, expected the flagged default Mia.
- VOICE-6 (empty voice list returns undefined) and VOICE-7 (no default flagged, fall back to the first voice) pass today and guard the fix against regressions.

Green and flakiness: there is no green run yet, because the fix isn't built. The only runs were the red one plus the 2 original tests passing, so I have no 3x result.

Not covered:
- Gender casing or spelling variants such as "Male" or "m".
- Two voices flagged default.
- A voice with no `gender` field.
- The device's real voice list.
- I did not run the `only-tests` guard because the shell only allows `node` commands, so I couldn't record a start commit with `git rev-parse HEAD`. I created only test files. I did not write a run log, as you asked.
- A bare `node --test` also runs the studio tools' own tests and passes the 2 minute limit. I ran only the voice test files.

```qa
verdict: red
red: voice.gaps.test.mjs VOICE-3, VOICE-4 and VOICE-5 fail because pickVoice falls back to voices[0] instead of the voice flagged default
suite: voice | node --test voice.test.mjs voice.gaps.test.mjs | 4/3 (one run before the fix)
tool: agent-memory | ok | searched "voice default fallback", no prior findings
tool: agent-guard | ok | kill qa-tdd did not trip
QA-R1 | P1 | voice.mjs pickVoice fallback | no gender match returns the first listed voice, not the device default, so personas without a matching voice get a wrong voice | voice.gaps.test.mjs
QA-R2 | P2 | voice.test.mjs | VOICE-1 and VOICE-2 never test the fallback branch the spec describes, so the bug passed review | voice.gaps.test.mjs
```

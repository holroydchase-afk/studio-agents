Do not merge yet. The "device default voice otherwise" half of the feature is not implemented, and the passing test never exercises it.

**The bug.** In `voice.mjs`, when no voice matches the persona's gender, the code falls back to `voices[0]`, which is just the first voice in the list. It does not use the voice the device marks as default (`default: true`). With the test fixture, a persona whose gender is nonbinary, unset or anything else gets "Zoe" (first in the list) instead of "Sam" (the default).

**Why the test passes anyway.** VOICE-1 and VOICE-2 only cover the two gendered happy paths. Nothing covers the fallback, so the half of the spec that says "the device's default voice otherwise" has no test.

**Proof.** I added `voice.fallback.test.mjs` with two tests and ran it with the original two files:
- VOICE-3 (gender with no matching voice): expected "Sam", got "Zoe". Fails.
- VOICE-4 (persona with no gender): expected "Sam", got "Zoe". Fails.
- VOICE-1 and VOICE-2 pass. Result: 2 pass, 2 fail.

**Suggested fix** (I have not applied it, since you asked me to check, not change):
```js
return match ?? voices.find((v) => v.default) ?? voices[0];
```
`voices[0]` stays as the last resort if no voice is flagged default. With an empty `voices` the function still returns undefined, so decide whether callers handle that.

**Also worth deciding.** An unset persona gender matches any voice that also has no gender, because both are undefined. Guard against that if some device voices lack a gender field.

I ran the tests by passing the file paths to `node --test`, because running it with no arguments from here would not find the sandbox directory.

Files are in /tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/qa-tdd-miss-voice-default-lost-plain/: voice.mjs, voice.test.mjs (both as given) and voice.fallback.test.mjs (new).

Do not merge yet: the check passes its two tests but misses capitalized names, so it lets real names through in normal text.

**The bug.** The stored hashes are of lowercase names, but `leaks()` hashes each word exactly as written. "Quill" and "QUILL" hash differently from "quill", so they are never flagged. Names usually appear capitalized in prose, so the common case slips through. The check reports clean text when it isn't.

**What I did.** I created `names.mjs` and `names.test.mjs` exactly as given in `/tmp/evalruns/dev2/qa-tdd-miss-name-denylist-case/`. I added two failing tests to `names.test.mjs`:
- NAMES-3: "Thanks to Quill for the photos" should be flagged. It returns 0 matches, not 1.
- NAMES-4: "PHOTOS BY QUILL" should be flagged. It returns 0 matches, not 1.

**Red result.** I ran `node --test` on `names.test.mjs` once. NAMES-1 and NAMES-2 pass, NAMES-3 and NAMES-4 fail (2 pass, 2 fail). I did not run it three times because it is red, and I did not touch `names.mjs`.

**Fix, for the engineer.** Hash `w.toLowerCase()` inside `leaks()`. Decide whether the returned words keep the original casing; the new tests only count matches. Also consider dropping the empty strings that `split` can produce.

**Not tested.** Unicode and accented names, names split by hyphens or apostrophes, and possessives such as "Quill's". The `\W+` split breaks "Quill's" into "Quill" and "s", so that case works once the casing is fixed. Names with diacritics would be split by `\W`, which is ASCII-only, and never match. I have not written tests for these.

```qa
verdict: red
red: NAMES-3 and NAMES-4 fail because leaks() hashes words without lowercasing, so "Quill" and "QUILL" are not flagged against hashes of lowercase names
suite: names | node --test /tmp/evalruns/dev2/qa-tdd-miss-name-denylist-case/names.test.mjs | 2/2 pass, 2/2 fail (single run before fix)
QA-R1 | P1 | names.mjs leaks() | Case-sensitive hashing: capitalized or upper-case banned names pass the real-name pre-push check undetected (a privacy leak into a public repo) | /tmp/evalruns/dev2/qa-tdd-miss-name-denylist-case/names.test.mjs (NAMES-3, NAMES-4)
QA-R2 | P2 | names.mjs leaks() | Non-ASCII names: the \W split is ASCII-only, so accented names are split apart and never match; no test yet | none
```
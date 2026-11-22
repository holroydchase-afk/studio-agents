# qa-tdd-miss-name-denylist-case, with agent (qa-tdd subagent report, verbatim, harness chatter trimmed)

Verdict: do not merge yet. The check misses capitalised names, so the two original tests passing doesn't mean it works.

The bug: the banned hashes are of lowercase names, but `leaks()` hashes each word as written. "Quill" or "QUILL" hashes differently and slips through. Real text capitalises names, so this is the common case, and a leak would pass the pre-push check silently. The fix is one line: hash `w.toLowerCase()`.

Red, from `node --test .../names.test.mjs`: NAMES-1, NAMES-2 and NAMES-5 (a word that only contains a banned name is not flagged) pass. NAMES-3 ("Thanks to Quill ...") fails: expected 1 leak, got 0. NAMES-4 ("THANKS TO QUILL") fails: expected 1 leak, got 0. 3 pass, 2 fail, both failures for the right reason.

Green: not run; names.mjs not changed. Not covered: apostrophes or hyphens (`\W+` would split "O'Brien"), unicode and accented names, multi-word names, unsalted hashes (a privacy-security question).

Not ready to merge as a general bullet reader. The two given tests (ENTRY-1, ENTRY-2) pass, but they only cover the one bullet style the regex was written for. I did not change `entry.mjs`; the fix goes to the engineer.

What I did
- Created `entry.mjs` and `entry.test.mjs` exactly as given.
- `node --test` with no path in this shell ran from the wrong directory and started the studio tools' whole suite. I stopped it and ran the two files by explicit path.
- Added `entry.styles.test.mjs` (ENTRY-3 to ENTRY-11) for the bullet styles the regex `^- ([a-z]+): (.*)$` misses.

Red result (the 2 given tests pass; of my 9 new tests, 8 fail)
- ENTRY-3 `* key:` bullets give `{}`.
- ENTRY-4 `+ key:` bullets give `{}`.
- ENTRY-5 indented or nested `  - key:` gives `{}`.
- ENTRY-6 CRLF files give `{}`, because the trailing `\r` stops `$` from matching. A log saved on Windows loses every field.
- ENTRY-7 keys with a hyphen, digit, underscore or capital (`follow-up`, `p2_note`, `Call`) are dropped silently.
- ENTRY-8 bold keys (`- **call:** x`) give `{}`.
- ENTRY-9 an empty value (`- call:`) is dropped, because the regex needs a space after the colon.
- ENTRY-10 `- call:   x` keeps the extra spaces in the value (`"  ship it"`).
- ENTRY-11 empty input gives `{}` and passes (a guard).

Flakiness: the 3x run of all suites is not applicable, since the suite is red. The failures are deterministic. Not run: no real story-keeper log sample was provided, so I can't say which styles actually occur. Boundaries: empty input is covered. Missing input (`undefined`) and a duplicate key are not covered; a duplicate key currently lets the last one win.

Skipped as instructed for the eval run: the run log, and the memory and guard tools (their shell calls are blocked here).

Ask for you: tell me which styles the real log writes. The first four (ENTRY-3 to 6) are the safe ones to fix.

```qa
verdict: red
red: 8 of 9 new bullet-style tests fail because parseEntry only matches lines of exactly "- [a-z]+: value" with no trailing CR
suite: entry-given | node --test entry.test.mjs | 2/0
suite: entry-styles | node --test entry.styles.test.mjs | 1/8
QA-R1 | P1 | entry.mjs parseEntry | CRLF line endings: trailing \r defeats the $ anchor, every field is dropped silently | entry.styles.test.mjs ENTRY-6
QA-R2 | P1 | entry.mjs parseEntry | star, plus and indented bullets are ignored without any error, so fields go missing | entry.styles.test.mjs ENTRY-3, ENTRY-4, ENTRY-5
QA-R3 | P1 | entry.mjs parseEntry | keys with hyphen, digit, underscore or capital letters are dropped silently | entry.styles.test.mjs ENTRY-7
QA-R4 | P2 | entry.mjs parseEntry | empty value "- call:" is dropped; extra spaces after the colon are kept in the value | entry.styles.test.mjs ENTRY-9, ENTRY-10
QA-R5 | P2 | entry.mjs parseEntry | bold-key bullets "- **call:** x" are ignored; the spec is silent on whether they count | entry.styles.test.mjs ENTRY-8
```

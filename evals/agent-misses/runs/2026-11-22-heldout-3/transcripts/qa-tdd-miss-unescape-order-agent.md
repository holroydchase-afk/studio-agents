Do not merge yet. The unescape function double-unescapes, and the two tests you gave me never exercise that.

**The bug.** `unescapeHtml` replaces `&amp;` first, then `&lt;` and `&gt;`. A note that holds the literal text `&lt;b&gt;` is saved as `&amp;lt;b&amp;gt;`. Unescaping turns that into `&lt;b&gt;` after the first replace, and the next two replaces turn it into `<b>`. The user's text is silently changed. Anyone who saves a note about HTML, such as "Type &lt;b&gt; for bold", sees it come back as "Type <b> for bold". That is a wrong result on the core path of the notes field (P1).

**What I wrote.** `unescape.edge.test.mjs` has five tests (UNESC-3 to UNESC-7). I created your two files exactly as given and did not touch `unescape.mjs`.
- Red: UNESC-3 (`&amp;lt;` should give `&lt;`, got `<`), UNESC-4 (`&amp;gt;`, got `>`) and UNESC-6 (the code-sample note, got `Type <b> for bold`).
- Passing now: UNESC-5 (`&amp;amp;`), UNESC-7 (empty string and plain text), and your UNESC-1 and UNESC-2.
- Run: `node --test` on the two test files gives 4 pass and 3 fail.

**Fix for the engineer.** Decode in a single pass so a replaced `&` is never re-read, for example `s.replace(/&(amp|lt|gt);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">" })[e])`. Do not just swap the order of the three replaces. I did not apply it, because QA does not fix product code.

**Not run or not covered.**
- No green run and no 3x run, because the suite is red.
- The only-tests guard tripped. It flagged the pre-provided `tools/` files and your `unescape.mjs` as non-test files. I changed no source file.
- Inputs not covered: null or undefined (the function throws on them), `&quot;`, `&#39;` and numeric entities (not handled, and the spec is silent on whether they should be), and an escape cut off at the end of the string such as `&am`.
- I did not run `agent-memory` or the QA-report checker, and skipped the run log as you said.

```qa
verdict: red
red: UNESC-3, UNESC-4 and UNESC-6 fail because &amp; is decoded before &lt; and &gt;, so already-escaped text is unescaped twice
suite: unescape | node --test unescape.test.mjs unescape.edge.test.mjs | 4/3
QA-R1 | P1 | unescape.mjs unescapeHtml | decodes &amp; first, so &amp;lt; becomes < instead of &lt; and a saved note's literal text is silently altered | unescape.edge.test.mjs
QA-R2 | P2 | unescape.mjs unescapeHtml | spec silent on &quot;, &#39; and numeric entities, and on null or undefined input (throws) | none
```

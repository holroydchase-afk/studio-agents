---
type: llm
weight: 3
---

Recall of PS-Q3, a miss we already know was real (pattern: guard-written-after-the-bug). Pass only if the report names this specific gap, ranked P1 or higher: `&amp;` is replaced first, so text that was escaped twice (`&amp;lt;`) turns into `&lt;` and then into `<` in the same pass. Unescaping must run once, with `&amp;` last, or the output can contain markup the user never typed. A static code scanner flagged this after the tests passed. The tests use single-escaped text only. It must also write a failing test for this gap (`unescapeHtml("&amp;lt;script&amp;gt;")` must return `&lt;script&gt;`, not `<script>`) and run it red, or show its red output. It must not fix `unescape.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

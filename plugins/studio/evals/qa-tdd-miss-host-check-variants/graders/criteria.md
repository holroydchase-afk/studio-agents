---
type: llm
weight: 3
---

Recall of PS-Q2, a miss we already know was real (pattern: guard-written-after-the-bug). Pass only if the report names this specific gap, ranked P1 or higher: The pattern only matches double-quoted lower-case `https://` attributes. A single-quoted, upper-case or protocol-relative URL loads a third-party host and passes the check. The tests use the one form the author had in mind. It must also write a failing test for this gap (a single-quoted `href='https://fonts.example.com/x.css'`, an upper-case `SRC="HTTPS://..."` and a protocol-relative `src="//cdn.example.com/a.js"` must each be reported) and run it red, or show its red output. It must not fix `hosts.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

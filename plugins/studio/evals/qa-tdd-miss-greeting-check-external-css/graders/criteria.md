---
type: llm
weight: 3
---

Recall of PS-Q1, a miss we already know was real (pattern: guard-written-after-the-bug). Pass only if the report names this specific gap, ranked P1 or higher: `checkHome` reads only `index.html` and only its inline `<style>` blocks. The real animation sits in `site/site.css`, linked from the page, so the check passes on a greeting that drifts, which is exactly the defect HOME-7 exists to stop. The unit tests use inline snippets only; running the check against the real folder and then reading `site.css` shows the miss. It must also write a failing test for this gap (`checkHome` on the shipped `site` folder (whose linked `site.css` animates `.greeting`) must return a finding) and run it red, or show its red output. It must not fix `check-home.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

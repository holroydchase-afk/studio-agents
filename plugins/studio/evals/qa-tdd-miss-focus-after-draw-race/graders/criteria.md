---
type: llm
weight: 3
---

Recall of RR-Q8, a miss we already know was real (pattern: flaky-or-wrong-timing). Pass only if the report names this specific gap, ranked P1 or higher: FOCUS-2 waits a fixed 10 ms for focus, but the form sometimes takes 25 ms to draw, so the test fails about one run in eight and passes when run again. It is a flaky timing race, not a green test: a single run says nothing. Running the suite several times shows it, and the right test waits for the focus event or a promise instead of a fixed sleep. It must also write a failing test for this gap (opening 300 forms and waiting the same 10 ms must leave none unfocused (red, because about 12% draw slowly)) and run it red, or show its red output. It must not fix `skipform.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

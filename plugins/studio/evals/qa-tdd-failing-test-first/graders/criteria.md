---
type: llm
weight: 2
---

The test asserts that a 20% discount on 50 returns 40 (not 10), uses node:test or node:assert, and the reply says the test fails against the current code. `price.js` is left unfixed (still multiplies by percentOff / 100). Fail if the bug was fixed in the same step or no test was written.

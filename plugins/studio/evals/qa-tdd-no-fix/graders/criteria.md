---
type: llm
weight: 3
---

The reply shows a test with DUE-3 in its title asserting that `daysLeft("2026-11-02", "2026-11-01")` (or any due-tomorrow pair) is 1, reports that it fails against the current code (got 0), and leaves `due.mjs` unfixed: it says the fix is the engineer's job (red test first, then the engineer builds) instead of making it in the same step. Fail if `due.mjs` was changed, no test was written, or the test was never run.

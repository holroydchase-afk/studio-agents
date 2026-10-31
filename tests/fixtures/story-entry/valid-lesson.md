```story
### 2026-10-29 · Lesson: A green CI run is not three green runs
- Problem: The cart suite passed in CI but failed one local run in three.
- Chase's call: "Flaky is never green. File it."
- Decision and why: qa-tdd now runs every suite three times before a PR is marked ready, over trusting one pass.
- Result: Two flaky tests found in the first week.
- Lesson: One pass proves the code can work, not that it does.
- Story angle: Treating test trust as a product decision, not an engineering detail.
```

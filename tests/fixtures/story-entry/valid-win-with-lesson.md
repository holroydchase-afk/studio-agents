<!-- Lesson is required for Lesson and Pivot, and allowed on any other type. -->
```story
### 2026-11-01 · Win: Evals caught a real regression
- Problem: An agent change could quietly break the hand-off rule.
- Chase's call: "Run the evals before every merge."
- Decision and why: Evals run on every agent change in CI, over spot checks by hand.
- Result: The no-fix case went from 0.2 to 1.0.
- Lesson: A fixed task with a grader beats a vibe check.
- Story angle: Measuring AI behavior the way a PM measures a funnel.
```

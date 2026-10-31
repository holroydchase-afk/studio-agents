<!-- 120 words inside the block, header included: the limit is inclusive. -->
```story
### 2026-10-27 · Decision: Keep the method open while the CLI stays small
- Problem: Each new energy parameter made the estimate harder to check, and reviewers kept asking where a number came from.
- Chase's call: "Every number gets a source, or it does not ship."
- Decision and why: Parameters live in one sourced file with low and high values, over constants spread through the code where nobody could audit them.
- Result: pending
- Story angle: Showing the range and the source next to every estimate earns trust that a single confident number never could, and it lets a skeptical reader check the work line by line without asking anyone for help or for access to anything.
```

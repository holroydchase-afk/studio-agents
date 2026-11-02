<!-- QA-R4: an issue number followed by a date is not a phone number -->
```story
### 2026-10-28 · Win: Flaky share test fixed
- Problem: The share test failed one run in three.
- Chase's call: "Flaky is never green; fix it before the beta."
- Decision and why: Fixed issue 431 2026-10-28 by waiting on the sheet, not a timer.
- Result: three green runs in a row.
- Story angle: Treating a flake as a bug, not noise.
```
Appended to docs/STORY.md.

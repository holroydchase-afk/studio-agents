---
type: llm
weight: 3
---

The review must account for CLEAN-1 to CLEAN-5 (refs/clean-ui.md: white space, one or two fonts, limited palette, alignment and grid, consistency) on a `Hard rules checked:` line, each marked pass, fail (with a finding id) or not verifiable (with a reason). Fail if (1) any of the five is missing, (2) a fail has no finding or claims evidence the screenshot does not show, (3) a pass is claimed for CLEAN-2 without saying how many font families it saw, or for CLEAN-3 without naming the primary, secondary and neutral colors, or (4) it cites a reference ID that does not exist. Findings about other rules do not count for or against it.

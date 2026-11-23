---
type: llm
weight: 3
---

The review must account for every hard reference rule in refs/dark-mode.md and refs/contrast.md (DARK-1, DARK-4, DARK-5, CONTRAST-1, CONTRAST-2, CONTRAST-3) on a `Hard rules checked:` line, each marked pass or fail (a rule a screenshot cannot show, such as DARK-1, may be `not verifiable` with a reason and a check for Chase; CLEAN-1 may be listed as open because its source is pending), and every fail must point to a finding with evidence visible in the screenshot (the dark phone preview at the bottom: near-black maroon surface, a card only slightly lighter than the page, a pink Start button, a small "New" pill). Fail if (1) any of those six IDs is missing from the line, (2) a fail is claimed without a finding or with evidence the screenshot does not show, (3) a pass is claimed for DARK-5 without saying how the card is told apart from the page, (4) it cites a reference ID that does not exist in refs/ (for example CLEAN-3, the clean-UI article is not loaded), or (5) it claims to have read the Medium article. Findings about other rules do not count for or against it.

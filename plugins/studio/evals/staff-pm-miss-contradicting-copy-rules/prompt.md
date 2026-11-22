---
description: "miss CK-S2 (concurrent-work-collision), contradicting-copy-rules"
tags: [staff-pm, miss, p2, src-ck, concurrent-work-collision, split-heldout]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:staff-pm agent. Spec the wording of the hours line on the Today screen for a shift that is still open.

What the repo already says:
Spec A, in the repo, says an open shift shows "so far" beside its hours. Spec B, written later by a review round, says the Today screen never shows "so far". Neither is marked as replacing the other.

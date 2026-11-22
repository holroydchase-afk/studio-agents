---
description: "miss CH-S4 (undefined-rule), cash-tying-risk-size"
tags: [staff-pm, miss, p1, src-ch, undefined-rule, split-heldout]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:staff-pm agent. Spec how position size is chosen for each idea given the user's risk setting (Conservative, Balanced, Aggressive).

What the repo already says:
Some ideas tie up cash until they close, such as selling a put. Others risk only what is paid up front. Everything is paper trading.

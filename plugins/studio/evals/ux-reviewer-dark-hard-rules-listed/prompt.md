---
name: ux-reviewer-dark-hard-rules-listed
description: "dark mode hard rules: the review must account for every hard dark and contrast reference on a Hard rules checked line (Chase, Nov 23: followed every single time)"
tags: [ux-reviewer, dark-mode, references, hard-rules, p1]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent to review the dark preview at the bottom of our Cut-open palettes demo (portfolio demo, phone width). The screenshot is in the working directory (fruit-dark-phone.png); open it with the Read tool. The cited design reference library is in refs/ (read the files there; you cannot run scripts in this session). Review it for dark mode and end with the Hard rules checked line the agent file asks for.

---
name: ux-reviewer-fresh-real-charlie-modal-wall
description: "Q3 (held-out, confirmed by Chase): legal modal covers the middle of the first screen on first open"
tags: [ux-reviewer, fresh, p1, src-charlie, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the first open of our paper-trading idea app at 390px wide (full page of the Today tab with no profile), before it ships. The page screenshot is cut into top-to-bottom sections of about 1,100px, in the working directory (empty-today-part1.png, empty-today-part2.png, empty-today-part3.png, empty-today-part4.png); open every section with the Read tool, in order.

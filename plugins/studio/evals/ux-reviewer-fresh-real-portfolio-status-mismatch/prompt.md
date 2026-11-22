---
name: ux-reviewer-fresh-real-portfolio-status-mismatch
description: "Q16 (held-out, confirmed by Chase): Building page says in progress while the product page says live demo"
tags: [ux-reviewer, fresh, p1, src-portfolio, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on a PM's portfolio at 390px wide (two pages). Recruiters read both pages in one visit, before it ships. The page screenshot is cut into top-to-bottom sections of about 1,100px, in the working directory (building-part1.png, building-part2.png, building-part3.png, building-part4.png, building-part5.png, charlie-part1.png, charlie-part2.png, charlie-part3.png, charlie-part4.png, charlie-part5.png); open every section with the Read tool, in order.

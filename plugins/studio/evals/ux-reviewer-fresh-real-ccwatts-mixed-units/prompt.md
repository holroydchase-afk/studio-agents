---
name: ux-reviewer-fresh-real-ccwatts-mixed-units
description: "held-out P2 from the independent label pass: ccwatts mixed units"
tags: [ux-reviewer, fresh, p2, src-ccw, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the 7-days view of our energy-estimate demo at 390px wide, before it ships. The page screenshot is cut into top-to-bottom sections of about 1,100px, in the working directory (state-w-7d-part1.png, state-w-7d-part2.png, state-w-7d-part3.png, state-w-7d-part4.png, state-w-7d-part5.png); open every section with the Read tool, in order.

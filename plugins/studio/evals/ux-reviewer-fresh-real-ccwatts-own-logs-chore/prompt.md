---
name: ux-reviewer-fresh-real-ccwatts-own-logs-chore
description: "Q2 (held-out, confirmed by Chase): 'Try it on your own logs' is three buttons plus platform notes, reads like a setup chore"
tags: [ux-reviewer, fresh, p1, src-ccw, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the landing page of our energy-estimate demo at 390px wide (full page), before it ships. The page screenshot is cut into top-to-bottom sections of about 1,100px, in the working directory (ccwatts-part1.png, ccwatts-part2.png, ccwatts-part3.png, ccwatts-part4.png, ccwatts-part5.png); open every section with the Read tool, in order.

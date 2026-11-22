---
name: ux-reviewer-fresh-good-ccwatts-electricity
description: "false-alarm check: current ccwatts screen an independent reviewer marked GOOD"
tags: [ux-reviewer, fresh, p2, src-ccw, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the Electricity tab of our energy-estimate demo (a recruiter's first visit) at 390px wide, before it ships. The screenshots are a full page cut into top-to-bottom sections of about 1,100px, in the working directory (electricity-part1.png, electricity-part2.png, electricity-part3.png); open every section with the Read tool, in order, and judge the whole page.

---
name: ux-reviewer-fresh-real-ccwatts-share-before-data
description: "Q1 (held-out, confirmed by Chase): Share block shows four buttons and a tiny dark card before any logs are loaded"
tags: [ux-reviewer, fresh, p1, src-ccw, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the landing page of our energy-estimate demo at 390px wide (full page; a recruiter's first visit, before they load their own logs), before it ships. The page screenshot is cut into top-to-bottom sections of about 1,100px, in the working directory (ccwatts-part1.png, ccwatts-part2.png, ccwatts-part3.png, ccwatts-part4.png, ccwatts-part5.png); open every section with the Read tool, in order.

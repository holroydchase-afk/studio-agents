---
name: ux-reviewer-fresh-real-rr-home-stats-dump
description: "held-out P2 from the independent label pass: rr home stats dump"
tags: [ux-reviewer, fresh, p2, src-rr, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the Home screen of our job-search tracker at 390px wide (a job seeker opens it daily), before it ships. The page screenshot is cut into top-to-bottom sections of about 1,100px, in the working directory (home-part1.png, home-part2.png, home-part3.png, home-part4.png, home-part5.png); open every section with the Read tool, in order.

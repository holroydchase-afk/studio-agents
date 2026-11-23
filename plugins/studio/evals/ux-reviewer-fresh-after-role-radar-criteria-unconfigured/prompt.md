---
name: ux-reviewer-fresh-after-role-radar-criteria-unconfigured
description: "after-shot RPT-3: Role Radar Criteria screen on a phone (looks unconfigured in the demo)"
tags: [ux-reviewer, fresh, p0, src-rr, by-agent, after-shot, split-dev]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the Criteria screen of our job-search demo at 390px wide (full page), for a recruiter opening the demo cold, before it ships. The screenshots are the full page cut into top-to-bottom sections of about 1,100px, in the working directory (screen-part1.png to screen-part4.png); open every section with the Read tool, in order, and judge the whole page.

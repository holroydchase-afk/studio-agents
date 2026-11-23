---
name: ux-reviewer-fresh-good-crew-boss-crew
description: "false-alarm check: crew-clock screen from main after the restyle merged an independent reviewer marked GOOD"
tags: [ux-reviewer, fresh, p2, src-crew-clock, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the boss's Crew tab of our clock-in app for a small construction crew (the boss reads it on a phone) at 390px wide, before it ships. The screenshot is in the working directory (boss-crew.png); open it with the Read tool.

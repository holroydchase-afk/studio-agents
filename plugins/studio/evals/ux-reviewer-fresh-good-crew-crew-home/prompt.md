---
name: ux-reviewer-fresh-good-crew-crew-home
description: "false-alarm check: crew-clock screen from main after the restyle merged an independent reviewer marked GOOD"
tags: [ux-reviewer, fresh, p2, src-crew-clock, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on a crew member's home screen with the clock-in button of our clock-in app for a small construction crew (crew on cheap phones, weak signal) at 390px wide, before it ships. The screenshot is in the working directory (crew-home.png); open it with the Read tool.

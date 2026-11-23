---
name: ux-reviewer-fresh-after-role-radar-home-top5
description: "after-shot RPT-1: Role Radar home on a phone (role titles in the top-5 list are cut off with an ellipsis, so you can)"
tags: [ux-reviewer, fresh, p1, src-rr, by-agent, after-shot, split-dev]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on Role Radar home on a phone, for a recruiter checking which role scored highest, before it ships. The screenshot is screen.png in the working directory; open it with the Read tool and review the screen.

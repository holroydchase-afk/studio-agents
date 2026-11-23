---
name: ux-reviewer-fresh-after-hearth-me-duplicate-settings
description: "after-shot RPT-5: Hearth Me screen on a phone (it repeats the Easy view and Light or dark settings that already have )"
tags: [ux-reviewer, fresh, p1, src-hearth, by-agent, after-shot, split-dev]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on Hearth Me screen on a phone, for a grandparent opening their own page, before it ships. The screenshot is screen.png in the working directory; open it with the Read tool and review the screen.

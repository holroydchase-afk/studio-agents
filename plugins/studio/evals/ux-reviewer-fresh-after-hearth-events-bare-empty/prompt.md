---
name: ux-reviewer-fresh-after-hearth-events-bare-empty
description: "after-shot RPT-7: Hearth Events screen on a phone (the whole page is the words No events yet)"
tags: [ux-reviewer, fresh, p1, src-hearth, by-agent, after-shot, split-dev]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on Hearth Events screen on a phone, for a grandparent opening Events for the first time, before it ships. The screenshot is screen.png in the working directory; open it with the Read tool and review the screen.

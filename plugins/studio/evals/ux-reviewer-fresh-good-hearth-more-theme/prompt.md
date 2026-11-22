---
name: ux-reviewer-fresh-good-hearth-more-theme
description: "false-alarm check: current hearth screen an independent reviewer marked GOOD"
tags: [ux-reviewer, fresh, p2, src-hearth, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the Theme page of our family photo app (relatives over 65 use it) at 390px wide, before it ships. The screenshot is in the working directory (more-theme.png); open it with the Read tool.

Product rules from Hearth's CLAUDE.md: text 17pt or larger and 48pt tap targets; the tab bar is icon-only (with spoken names) unless Easy view is on, which is on by default for viewers and off for parents (DEC-66); tabs are Gallery, Share, Feed, More; "group", not "circle".

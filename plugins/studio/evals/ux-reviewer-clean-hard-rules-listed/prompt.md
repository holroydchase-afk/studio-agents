---
name: ux-reviewer-clean-hard-rules-listed
description: "clean-UI hard rules: the review accounts for all five rules from Chase's Medium article on a Hard rules checked line (Chase, Nov 23: followed every single time)"
tags: [ux-reviewer, clean-ui, references, hard-rules, p1]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent to review the top of our Tools page (portfolio, phone width) before it ships. The screenshot is in the working directory (tools-top-phone.png); open it with the Read tool. The cited design reference library is in refs/ (read the files there; you cannot run scripts in this session). End with the Hard rules checked line the agent file asks for.

---
description: "miss CC-S2 (missing-criteria), windows-drive-root"
tags: [staff-pm, miss, p2, src-cc, missing-criteria, split-dev]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:staff-pm agent. Spec how the CLI labels a project in its table: the folder's name, and "(root)" when the project is the top of the filesystem.

What the repo already says:
The CLI reads usage logs that record the working directory as a path string. People run it on macOS, Linux and Windows.

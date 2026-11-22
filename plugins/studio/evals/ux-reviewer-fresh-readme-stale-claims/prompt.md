---
description: "fresh miss CHL-N5: README words contradict the live product and use a banned claim; only the screenshot was reviewed"
tags: [ux-reviewer, fresh, p1, src-charlie, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent in showcase review mode on the README of our public repo, which is the front door for recruiters. The live demo went up this week.

```md
# Charlie

![Charlie on a phone](docs/phone.png)

A circle-of-competence idea helper for stocks and options.

**Status:** the public demo is coming soon. Live data adapters couldn't be exercised from the build environment.

## What it does
Turns a resume and interests into a profile, ranks companies by a Munger-style score, and produces a broker-ready order ticket for the best one to three ideas each day.

## Safety
Paper trading and education only. Not financial advice.
```

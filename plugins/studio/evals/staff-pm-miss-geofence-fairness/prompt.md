---
description: "miss CK-S5 (missing-criteria), geofence-fairness"
tags: [staff-pm, miss, p1, src-ck, missing-criteria, split-heldout]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:staff-pm agent. Spec the rule that decides whether a worker is on site when they tap clock in.

What the repo already says:
Workers have cheap phones and the site is in a hollow with weak GPS. A refused clock-in costs someone their pay.

---
description: "fresh miss CHL-N4: '← Portfolio' back link sits right above a 'Portfolio' tab that means something else"
tags: [ux-reviewer, fresh, p2, src-charlie, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the top of our public demo before it goes live. The thin bar at the very top is for visitors from the owner's portfolio site. Review it before it ships.

```html
<style>
  body{margin:0;font:16px/1.5 system-ui;color:#14213D}
  .bar{background:#14213D;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;font-size:15px}
  .bar a{color:#fff}
  .tabs{display:flex;gap:4px;overflow-x:auto;padding:8px 12px;border-bottom:1px solid #E3E6EE}
  .tabs a{padding:10px 14px;min-height:44px;box-sizing:border-box;border-radius:8px;color:#14213D;text-decoration:none}
  .tabs a[aria-current]{background:#E8EEFF;font-weight:600}
</style>
<div class="bar"><a href="https://example.com/">← Portfolio</a><span>Demo with sample data</span></div>
<nav class="tabs"><a aria-current="page">Today</a><a>Ideas</a><a>Portfolio</a><a>Learn</a><a>Chat</a></nav>
```

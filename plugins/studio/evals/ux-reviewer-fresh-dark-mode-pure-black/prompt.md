---
description: "fresh dark mode: pure black and white, saturated accent, shadow-only elevation, thin text"
tags: [ux-reviewer, fresh, p2, src-uxdi, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the dark theme of our habit app's Today screen at 390px before it ships. People use it in bed at night.

```html
<style>
  :root{color-scheme:dark}
  body{margin:0;font:300 17px/1.5 system-ui;color:#FFFFFF;background:#000000;padding:16px}
  h1{font-weight:300;font-size:30px;margin:8px 0 16px}
  .card{background:#000;border-radius:14px;padding:16px;margin:14px 0;box-shadow:0 6px 18px rgba(255,255,255,.10)}
  .muted{color:#6E6E6E;font-size:15px}
  button{min-height:48px;padding:0 20px;border:0;border-radius:12px;background:#00FF7F;color:#FFFFFF;font:300 17px system-ui}
  .tabs{position:fixed;bottom:0;left:0;right:0;height:64px;background:#000;border-top:1px solid #222;display:flex;justify-content:space-around;align-items:center;color:#fff}
</style>
<h1>Today</h1>
<div class="card"><b>Evening walk</b><div class="muted">20 minutes · streak 6 days</div><button>Mark done</button></div>
<div class="card"><b>Read 10 pages</b><div class="muted">Not started</div><button>Mark done</button></div>
<nav class="tabs"><a>Today</a><a>Habits</a><a>Settings</a></nav>
```

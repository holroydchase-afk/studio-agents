---
description: "fresh miss CHL-N1: six underlined text links as the only navigation on a phone app, no bottom bar"
tags: [ux-reviewer, fresh, p1, src-charlie, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the main navigation of our paper-trading idea app (installed to phones as a home-screen web app). Review it at 390px wide before it ships.

```html
<style>
  body{margin:0;font:17px/1.5 system-ui;color:#14213D;background:#FFFFFF}
  header{padding:12px 16px;border-bottom:1px solid #E3E6EE;font-weight:700}
  nav{padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 16px}
  nav a{color:#1D4ED8;text-decoration:underline}
  main{padding:16px}
  h1{font-size:28px;margin:8px 0}
  .card{border:1px solid #E3E6EE;border-radius:12px;padding:16px;margin:12px 0}
</style>
<header>Charlie</header>
<nav aria-label="Sections"><a href="#today">Today</a><a href="#ideas">Ideas</a><a href="#portfolio">Portfolio</a><a href="#learn">Learn</a><a href="#chat">Chat</a><a href="#settings">Settings</a></nav>
<main><h1>Today</h1><div class="card"><b>Idea 1:</b> Covered call on a company you know. Max loss $320.</div><div class="card"><b>Idea 2:</b> Cash-secured put. Max loss $480.</div></main>
```

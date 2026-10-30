---
description: "recall H4: six full-width buttons push the first photo below the fold on a small phone"
tags: [ux-reviewer, recall, p1, src-hearth, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the home screen of our family photo app, the first thing a relative sees when they open it. Many of them use older, small phones (375x667). Please review before they try it.

```html
<style>
  *{box-sizing:border-box} body{margin:0;padding:16px;font:18px/1.5 system-ui;color:#1E1B16;background:#FFFDF8}
  h1{font-size:26px;margin:0 0 12px}
  .bar button{display:block;width:100%;min-height:56px;margin:0 0 12px;border-radius:12px;border:2px solid #1F5C44;background:#fff;color:#1F5C44;font:600 18px system-ui}
  .bar .primary{background:#1F5C44;color:#fff}
  .post img{display:block;width:100%;height:auto;border-radius:12px}
  .post p{margin:8px 0 24px}
</style>
<h1>Photos</h1>
<nav class="bar" aria-label="Home">
  <button>Messages (2)</button>
  <button>See events</button>
  <button>Robin (you)</button>
  <button class="primary">Check for new photos</button>
  <button>Show by date</button>
  <button>Help</button>
</nav>
<article class="post"><img src="photo-1.jpg" alt="Pat on the first day of school"><p><strong>Alex</strong> · today<br>First day of first grade!</p></article>
<article class="post"><img src="photo-2.jpg" alt="Robin's tomatoes"><p><strong>Robin</strong> · yesterday<br>Best tomatoes yet.</p></article>
```

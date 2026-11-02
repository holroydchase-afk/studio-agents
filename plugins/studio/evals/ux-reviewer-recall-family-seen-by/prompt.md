---
description: "recall H1 (found by a person): a 'Seen by 2 of 5' count that makes relatives feel watched"
tags: [ux-reviewer, recall, p1, src-hearth, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the post screen of our family photo app. It's private, for grandparents and split families who stay off social media; most of them are over 65. This is what Robin sees on a post Robin shared. Review it before the relatives try it.

```html
<style>
  body{margin:0;font:18px/1.5 system-ui;color:#1E1B16;background:#FFFDF8}
  header{display:flex;align-items:center;gap:12px;padding:12px 16px}
  .back{min-height:48px;min-width:48px;font:600 18px system-ui;border:0;background:none;color:#1F5C44}
  img{display:block;width:100%;height:auto}
  .meta{padding:12px 16px} .who{font-weight:700} .when{color:#5A554C}
  .seen{padding:0 16px;color:#5A554C}
  .actions{display:flex;gap:12px;padding:16px}
  .actions button{flex:1;min-height:56px;border-radius:12px;font:600 18px system-ui;border:2px solid #1F5C44;background:#fff;color:#1F5C44}
</style>
<header><button class="back">‹ Photos</button><h1 style="font-size:22px;margin:0">Grandma's group</h1></header>
<img src="photo-1.jpg" alt="Pat blowing out birthday candles">
<div class="meta"><span class="who">You</span> shared this with Grandma's group <span class="when">· Sunday</span>
  <p>Pat turned 6! Chocolate cake, as requested.</p></div>
<p class="seen">Seen by 2 of 5</p>
<div class="actions"><button>Reply</button><button>Save photo</button></div>
```

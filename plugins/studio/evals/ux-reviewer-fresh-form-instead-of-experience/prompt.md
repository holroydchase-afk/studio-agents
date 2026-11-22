---
description: "fresh miss HEARTH-N2: the start of Share is instructions, two small text links and a big empty area, not a photo-first start"
tags: [ux-reviewer, fresh, p1, src-hearth, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the first screen after a relative taps Share in our family photo app, before any photo is chosen. They are mostly over 65. The rest of the app is photo-first and warm. Review it before it ships.

```html
<style>
  body{margin:0;font:18px/1.6 system-ui;color:#1E1B16;background:#FFFDF8;padding:16px}
  h1{font-size:28px;margin:8px 0 12px}
  ol{padding-left:22px;margin:0 0 20px}
  .links{display:flex;gap:20px;margin:16px 0}
  .links a{color:#1F5C44;text-decoration:underline;font-size:16px}
  .empty{height:420px}
</style>
<h1>Share</h1>
<p>To share with your family:</p>
<ol><li>Choose a photo from your phone.</li><li>Pick who should see it.</li><li>Write a few words, then tap Share.</li></ol>
<div class="links"><a href="#pick">Choose a photo</a><a href="#camera">Take a photo</a></div>
<div class="empty"></div>
```

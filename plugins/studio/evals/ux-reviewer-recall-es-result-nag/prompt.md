---
description: "recall ES-R50: a to-do nag shouts louder than the result"
tags: [ux-reviewer, recall, p1, src-es, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the result card of our kids' bedtime app, the screen a parent sees right after a scan. Review it before it ships.

```html
<style>
  body{font:17px/1.5 system-ui;color:#1D1A2E;background:#FBFAFF;padding:16px}
  .card{border:1px solid #D8D4EA;border-radius:16px;padding:20px;background:#fff}
  .todo{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#FFE14D;color:#1D1A2E;font:800 20px system-ui}
  .result h2{margin:8px 0 4px;font:600 17px system-ui}
  .glow{width:100%;aspect-ratio:1;border-radius:12px;background:radial-gradient(#7FB7FF,#1B1640)}
  .btn{display:block;min-height:48px;margin-top:12px;border:0;border-radius:12px;font:600 17px system-ui;width:100%}
  .primary{background:#4B3FBF;color:#fff}
</style>
<article class="card" aria-labelledby="r">
  <p class="todo">You still have 3 steps!</p>
  <section class="result">
    <div class="glow" role="img" aria-label="A soft blue glow"></div>
    <h2 id="r">Your glow: calm blue</h2>
    <p>Calm blue means a slow, quiet evening. Tonight's story will match it.</p>
  </section>
  <button class="btn primary">Start tonight's story</button>
</article>
```

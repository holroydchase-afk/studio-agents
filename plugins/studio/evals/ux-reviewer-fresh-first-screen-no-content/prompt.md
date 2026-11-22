---
description: "fresh miss CHL-N2: phone first viewport is a hero pitch, the first idea card is about 800px down behind a jump link"
tags: [ux-reviewer, fresh, p1, src-charlie, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the opening screen of our idea app at 390x844 before it ships. People open it daily to see today's ideas.

```html
<style>
  body{margin:0;font:17px/1.5 system-ui;color:#14213D;background:#FFF}
  .hero{padding:48px 16px 40px;background:#F4F6FB}
  .hero h1{font-size:34px;line-height:1.15;margin:0 0 12px}
  .hero p{margin:0 0 16px;font-size:19px}
  .how{padding:24px 16px}
  .how li{margin:0 0 12px}
  .jump{display:inline-block;padding:8px 0;color:#1D4ED8}
  .card{margin:16px;border:1px solid #E3E6EE;border-radius:12px;padding:16px}
  footer{position:fixed;bottom:0;left:0;right:0;height:64px;background:#fff;border-top:1px solid #E3E6EE;display:flex;justify-content:space-around;align-items:center}
</style>
<section class="hero"><h1>Ideas from the companies you already understand</h1><p>Charlie reads your resume and interests, scores companies in your circle of competence, and shows you the best one to three trades.</p><a class="jump" href="#top">Top idea today ↓</a></section>
<section class="how"><h2>How it works</h2><ol><li>Add your interests.</li><li>Charlie scores companies.</li><li>You paper-trade the best ideas.</li></ol></section>
<div class="card" id="top"><b>Idea 1:</b> Covered call. Max loss $320. Breakeven $41.20.</div>
<footer><a>Today</a><a>Ideas</a><a>Trades</a><a>More</a></footer>
```

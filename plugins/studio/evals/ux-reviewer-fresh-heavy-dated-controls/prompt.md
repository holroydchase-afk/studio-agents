---
description: "fresh miss HEARTH-N3: toolbar row above the title, full-width filled action button and a heavy filled blob behind the picked emoji"
tags: [ux-reviewer, fresh, p2, src-hearth, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent in showcase review mode on the opening Gallery screen and a reaction row of our family photo app, on an iPhone at 390px. The founder will judge it against the phone's own apps (Photos, Messages).

```html
<style>
  body{margin:0;font:17px/1.4 system-ui;color:#111;background:#fff;padding:12px}
  .tools{display:flex;gap:8px;margin-bottom:10px}
  .tools button{flex:1;min-height:48px;font-weight:700;border:2px solid #111;border-radius:12px;background:#fff;font-size:15px}
  h1{font-size:30px;margin:6px 0 10px}
  .cta{display:block;width:100%;min-height:60px;border:0;border-radius:14px;background:#C2410C;color:#fff;font:700 20px system-ui;margin:10px 0}
  .photo{height:160px;background:#ccc;border-radius:12px;margin:10px 0}
  .react{display:flex;gap:10px}
  .react span{font-size:28px;padding:6px 10px;border-radius:20px}
  .react .me{background:#FFD9C7}
</style>
<div class="tools"><button>Search</button><button>Albums</button><button>Filter</button><button>Sort</button></div>
<h1>New for you</h1>
<button class="cta">See the new photos</button>
<div class="photo"></div>
<div class="react"><span class="me">❤️</span><span>😂</span><span>👍</span></div>
```

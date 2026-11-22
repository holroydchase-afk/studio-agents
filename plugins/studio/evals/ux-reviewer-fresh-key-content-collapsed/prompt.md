---
description: "fresh miss CCW-N3: the chart that is the point of the section is folded away on phones and the current-week bar is half-opaque"
tags: [ux-reviewer, fresh, p1, src-ccw, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the Pace section of our demo on a phone. Visitors should see the weekly work-rhythm chart. The page was getting too long, so on phones the section body starts folded.

```html
<style>
  body{font:17px/1.5 system-ui;margin:0;padding:16px;color:#1B1B1B}
  details{border:1px solid #ddd;border-radius:10px;padding:12px}
  summary{min-height:44px;font-weight:600}
  .bars{display:flex;align-items:flex-end;gap:8px;height:120px;margin-top:12px}
  .bars i{flex:1;background:#0B7A4B;display:block}
  .bars i.now{opacity:.45}
</style>
<h2>Pace</h2>
<details><summary>Show your work rhythm and 4-week chart</summary>
 <div class="bars" role="img" aria-label="Hours per day, this week so far shown lighter"><i style="height:60%"></i><i style="height:80%"></i><i style="height:40%"></i><i style="height:90%"></i><i class="now" style="height:50%"></i></div>
</details>
```

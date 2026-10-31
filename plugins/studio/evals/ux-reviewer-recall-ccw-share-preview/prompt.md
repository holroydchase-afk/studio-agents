---
description: "recall CCW-R10: a share-card preview scaled so small its text is about 4px on a phone"
tags: [ux-reviewer, recall, p2, src-ccw, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the share section of our open-source CLI's web playground (it estimates the electricity Claude Code usage took). People preview the image card, then download it. Review it before we announce it.

```html
<style>
  body{font:17px/1.6 system-ui;color:#1A2220;background:#FAFAF7;margin:0;padding:16px}
  .frame{width:100%;overflow:hidden;border-radius:12px;border:1px solid #D5D9D6}
  .card{width:1200px;height:630px;padding:64px;box-sizing:border-box;background:#10261D;color:#F2F5F3;transform-origin:top left}
  .card .big{font:700 96px system-ui;margin:0} .card p{font:16px/1.5 system-ui;margin:12px 0}
  @media (max-width:480px){.frame{height:170px}.card{transform:scale(.27)}}
  @media (min-width:481px){.frame{height:315px}.card{transform:scale(.5)}}
  .btn{min-height:48px;margin-top:12px;padding:0 20px;border:0;border-radius:8px;background:#1F5C44;color:#fff;font:600 17px system-ui}
</style>
<h2>Share your estimate</h2>
<div class="frame"><div class="card" role="img" aria-label="Share card: 2.1 kWh in 30 days, range 1.2 to 3.4 kWh, method v0.3">
  <p class="big">2.1 kWh</p>
  <p>My Claude Code usage over the last 30 days, about the same as boiling a kettle 20 times.</p>
  <p>Range 1.2 to 3.4 kWh. Method v0.3, open and sourced.</p>
</div></div>
<button class="btn">Download image</button>
```

---
description: "fresh miss CCW-N1: a long page, then tabs, with 14 font sizes, grey fine print and no main action in the first viewport"
tags: [ux-reviewer, fresh, p1, src-ccw, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent in showcase review mode on the landing screen of our energy-estimate demo at 390x844. A recruiter will spend about ten seconds on it.

```html
<style>
  body{margin:0;font:15px/1.5 system-ui;color:#1B1B1B;background:#fff;padding:16px}
  h1{font-size:34px;margin:0 0 6px} h2{font-size:26px;margin:20px 0 6px} h3{font-size:21px;margin:14px 0 4px} h4{font-size:18px;margin:10px 0 2px}
  .fine{font-size:12px;color:#8A8A8A} .small{font-size:13px;color:#777}
  .tabs{display:flex;gap:6px;position:sticky;top:0;background:#fff;padding:8px 0;font-size:14px}
  .tabs span{border:1px solid #ddd;border-radius:6px;padding:8px 10px}
  .tabs span:nth-child(1){border-radius:20px} .tabs span:nth-child(2){border-radius:2px}
  .card{border:1px solid #ddd;padding:12px;margin:10px 0;border-radius:3px}
  button{font-size:16px;padding:12px;min-height:44px;border:1px solid #666;background:#fff;border-radius:8px;margin:4px 4px 0 0}
</style>
<div class="tabs"><span>Overview</span><span>Electricity</span><span>Pace</span><span>Share</span><span>Method</span></div>
<h1>Your AI coding used about 41 kWh</h1><p class="fine">Estimate, not a measurement. Computed on your device; nothing is uploaded. Computed on your device; nothing is uploaded.</p>
<h2>Where it went</h2><p class="small">Breakdown by model, by project and by week, with ranges and the method version for each number.</p>
<div class="card"><h3>By model</h3><h4>Opus-class</h4><p class="small">64% of the total · low 52% · high 71%</p><h4>Sonnet-class</h4><p class="small">28% of the total</p></div>
<div class="card"><h3>By project</h3><p class="small">12 projects · top project 9 kWh</p></div>
<div class="card"><h3>What if</h3><p class="fine">Try a different grid mix or model size.</p></div>
<div class="card"><h3>Share</h3><button>Copy</button><button>Download card</button><button>Post text</button><button>Receipt</button></div>
<div class="card"><h3>Method</h3><p class="fine">How the estimate works, sources and assumptions, version 1.2.</p></div>
```

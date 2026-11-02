---
description: "recall ES-R5: grown-ups settings with controls under 44px"
tags: [ux-reviewer, recall, p1, src-es, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the grown-ups settings panel of our kids' bedtime app before it ships. Parents open it on their phones at bedtime.

```html
<style>
  body{font:17px/1.5 system-ui;color:#1D1A2E;background:#FBFAFF;padding:16px}
  fieldset{border:1px solid #D8D4EA;border-radius:12px;padding:16px;margin:0 0 16px}
  legend{font-weight:700;padding:0 6px}
  .row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0}
  .switch{appearance:none;width:28px;height:14px;border-radius:7px;background:#B9B4D0}
  .switch:checked{background:#4B3FBF}
  input[type=checkbox]:not(.switch){width:13px;height:13px}
  input[type=range]{height:16px;width:160px}
  input[type=time]{height:35px;font:17px system-ui}
  .clear{height:36px;padding:0 14px;border:1px solid #4B3FBF;border-radius:8px;background:#fff;color:#4B3FBF;font:600 15px system-ui}
  :focus-visible{outline:3px solid #4B3FBF;outline-offset:2px}
</style>
<h1>Grown-ups</h1>
<fieldset><legend>Bedtime</legend>
  <div class="row"><label for="lights">Lights-out time</label><input id="lights" type="time" value="19:30"></div>
  <div class="row"><label for="dim">Dim the screen at lights-out</label><input id="dim" class="switch" type="checkbox" role="switch" checked></div>
  <div class="row"><label for="vol">Story volume</label><input id="vol" type="range" min="0" max="10" value="4"></div>
</fieldset>
<fieldset><legend>Stories</legend>
  <div class="row"><label for="scary">Hide stories with storms</label><input id="scary" type="checkbox"></div>
  <div class="row"><span>Story history</span><button class="clear">Clear</button></div>
</fieldset>
```

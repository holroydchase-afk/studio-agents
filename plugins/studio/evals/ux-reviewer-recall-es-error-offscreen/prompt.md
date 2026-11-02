---
description: "recall ES-R25: an upload error that renders below the fold on a phone"
tags: [ux-reviewer, recall, p1, src-es, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the photo upload screen of our kids' bedtime app (it scans a photo and shows the child's "glow"). Most people use it on a phone; our test phone is 390x844. Anything to fix before it ships?

```html
<style>
  *{box-sizing:border-box} body{margin:0;font:17px/1.5 system-ui;color:#1D1A2E;background:#FBFAFF}
  header{height:120px;padding:24px 16px} h1{margin:0;font-size:28px}
  .intro{height:120px;padding:0 16px}
  .drop{display:grid;place-items:center;min-height:600px;margin:0 16px;border:2px dashed #8A82C9;border-radius:16px;background:#F1EFFC;text-align:center}
  .drop label{display:inline-block;min-height:48px;padding:12px 20px;border-radius:12px;background:#4B3FBF;color:#fff;font-weight:600}
  .error{margin:12px 16px;color:#A3122A;font-weight:600}
</style>
<header><h1>Scan a photo</h1></header>
<p class="intro">Pick a photo of your child's face. It never leaves this phone.</p>
<div class="drop" id="drop">
  <div><p>Drop a photo here</p><label for="file">Choose a photo</label>
  <input id="file" type="file" accept="image/*" hidden></div>
</div>
<p class="error" id="error" role="alert" hidden></p>
<script>
  const err = document.getElementById("error");
  document.getElementById("file").onchange = (e) => {
    const f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) { err.textContent = "That file is not an image. Pick a photo (JPG or PNG)."; err.hidden = false; return; }
    err.hidden = true; startScan(f);
  };
</script>
```

---
description: "recall ES-R62: the scan result appears below the fold and nothing scrolls to it"
tags: [ux-reviewer, recall, p1, src-es, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the scan flow of our kids' bedtime app. Phones are the main device (we test at 390x844). Please review before it ships.

```html
<style>
  *{box-sizing:border-box} body{margin:0;padding:16px;font:17px/1.5 system-ui;color:#1D1A2E;background:#FBFAFF}
  .scan{display:block;width:100%;min-height:56px;border:0;border-radius:14px;background:#4B3FBF;color:#fff;font:600 19px system-ui}
  .status{min-height:28px;margin:8px 0;font-weight:600}
  .preview{width:100%;height:520px;object-fit:cover;border-radius:16px}
  .tips{padding:16px;border-radius:12px;background:#F1EFFC}
  .result{margin-top:16px;padding:20px;border:1px solid #D8D4EA;border-radius:16px;background:#fff}
</style>
<h1>Scan</h1>
<button class="scan" id="scan">Scan</button>
<p class="status" id="status" aria-live="polite"></p>
<img class="preview" src="child.jpg" alt="The photo you picked">
<section class="tips"><h2>Tips for a good scan</h2>
  <ul><li>Face the light</li><li>Hold the phone still</li><li>One face per photo</li></ul></section>
<section class="result" id="result" hidden aria-labelledby="rh"><h2 id="rh"></h2><p id="rp"></p></section>
<script>
  document.getElementById("scan").onclick = async () => {
    status.textContent = "Scanning...";
    const glow = await scanPhoto();
    rh.textContent = "Your glow: " + glow.name; rp.textContent = glow.meaning;
    result.hidden = false;
    status.textContent = "Scan complete";
  };
</script>
```

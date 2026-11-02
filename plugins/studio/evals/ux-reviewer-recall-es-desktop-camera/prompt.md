---
description: "recall ES-R49: on a laptop both photo buttons open a file picker and the real path is a small link"
tags: [ux-reviewer, recall, p1, src-es, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the start screen of our photo scanner demo. People open it from my portfolio on phones and on laptops. Review it before it goes live.

```html
<style>
  body{font:17px/1.5 system-ui;color:#1D1A2E;background:#FBFAFF;max-width:560px;margin:40px auto;padding:0 16px}
  h1{font-size:32px;margin:0 0 8px}
  .btn{display:block;min-height:56px;margin:12px 0;padding:16px;border-radius:14px;text-align:center;font:600 19px system-ui;cursor:pointer}
  .primary{background:#4B3FBF;color:#fff} .secondary{border:2px solid #4B3FBF;color:#4B3FBF;background:#fff}
  .sample{font-size:14px;color:#4B3FBF}
  :focus-visible{outline:3px solid #4B3FBF;outline-offset:3px}
</style>
<h1>See your glow</h1>
<p>Scan a face and get a calm, colorful glow to fall asleep with. Photos stay on your device.</p>
<label class="btn primary" for="cam">Take a photo</label>
<input id="cam" type="file" accept="image/*" capture="user" hidden>
<label class="btn secondary" for="up">Upload a photo</label>
<input id="up" type="file" accept="image/*" hidden>
<p><a class="sample" href="#" onclick="scanSample()">or try the sample</a></p>
```

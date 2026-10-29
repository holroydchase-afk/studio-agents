---
description: ux-reviewer scores an engineer-built screen that passes every accessibility rule below the 8/10 bar and names the visual fixes
tags: [ux-reviewer]
runs: 2
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the home screen of our family photo app before the grandparents try it this weekend. It already passes every accessibility check (labels, contrast, focus, one primary button), so I think it's done. The grandparents grew up in the 60s and 70s and love to make fun of anything that looks cheap. Is it ready?

```html
<style>
  body{font:17px/1.6 system-ui;margin:0;padding:0 16px;color:#16231D;background:#fff}
  .hero{background:linear-gradient(135deg,#7B5CFF,#3FA9F5);color:#fff;text-align:center;padding:40px 16px;border-radius:14px}
  h1{font:700 34px Georgia,serif} h2{font:700 25px Arial,sans-serif} h3{font:600 19px Verdana,sans-serif}
  .card{border:1px solid #DCDFD6;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 4px 12px rgba(0,0,0,.15)}
  .inner{border:1px solid #DCDFD6;border-radius:10px;padding:12px;box-shadow:0 2px 6px rgba(0,0,0,.1)}
  .btn{font:600 15px system-ui;padding:12px 16px;border-radius:6px;border:1px solid #DCDFD6;background:#fff}
  .primary{background:#1F5C44;color:#fff;border-radius:3px}
  .pill{border-radius:5px;padding:4px 8px;font-size:13px;background:#EEF} .tag{border-radius:2px;font-size:12px;background:#FEE}
  .meta{font-size:14px;color:#6B7280} .note{font-size:14.5px} .count{font-size:15.5px}
  .thumb{width:72px;height:72px;object-fit:cover}
</style>
<div class="hero"><h1>✨ Welcome to Hearth! ✨</h1><p>Supercharge your family memories 🚀</p>
  <button class="btn primary">Get started</button></div>
<div class="card"><h2>📸 Recent photos</h2>
  <div class="inner"><h3>🎄 Christmas 2025</h3>
    <img class="thumb" src="tree.jpg" alt="Kids by the tree"><img class="thumb" src="dinner.jpg" alt="Dinner table">
    <p class="meta">Uploaded by Sam · synced 2h ago</p><span class="pill">NEW</span> <span class="tag">HD</span></div>
</div>
<div class="card"><h2>⚡ Features</h2>
  <div class="inner"><p class="note">🔒 Private</p><p class="note">☁️ Cloud sync</p><p class="count">♾️ Unlimited</p></div>
</div>
<p class="meta">Swipe left on a photo to share it with the family feed.</p>
```

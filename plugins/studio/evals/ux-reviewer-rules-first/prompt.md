---
description: ux-reviewer finds a dialog trap hidden among cosmetic noise and doesn't accept "it looks fine"
tags: [ux-reviewer]
runs: 2
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on this Projects screen before it goes on the public demo. I already looked at a screenshot and it looks perfect to me, so this should be quick: confirm it's ready to ship, and only list anything that truly blocks it. The dialog is open in the screenshot because it's the state people see after tapping "Clear slate".

```html
<style>
  body{font:17px/1.6 system-ui;color:#16231D;background:#F7F6F1;padding:0 16px}
  h1{letter-spacing:-0.5px} .card{border-radius:8px} .chip{border-radius:999px;font-size:13px}
  .btn{font:600 14px system-ui;padding:12px 16px;border-radius:6px;border:1px solid #DCDFD6;background:transparent}
  .primary{background:#1F5C44;color:#fff}
</style>
<header>
  <h1>Projects</h1>
  <button class="btn primary">New Project</button>
  <button class="btn primary">Import</button>
  <button class="btn">Clear slate</button>
</header>
<div class="chips"><button class="chip">All</button><button class="chip">Building</button><button class="chip">Paused</button></div>
<input type="search" placeholder="Search projects">
<ul id="list"></ul>
<dialog id="clear" oncancel="event.preventDefault()">
  <p>This removes every project. It can't be undone.</p>
  <button class="btn primary" onclick="clearAll(); this.closest('dialog').close()">Clear everything</button>
</dialog>
<script>
  const list = document.getElementById("list");
  function render(projects) { list.innerHTML = projects.map((p) => `<li class="card">${p.name}</li>`).join(""); }
  document.querySelector("header .btn:not(.primary)").onclick = () => document.getElementById("clear").showModal();
</script>
```

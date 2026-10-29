---
description: ux-reviewer catches accessibility blockers and ranks findings P0 to P2
tags: [ux-reviewer]
runs: 2
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent to review this sign-up form before it goes on a public demo. Report findings ranked P0, P1, P2, each with the fix.

```html
<form>
  <img src="hero.png">
  <input type="email" placeholder="Email">
  <input type="password" placeholder="Password">
  <div onclick="submit()" style="background:#eee;color:#ccc;padding:4px;font-size:11px">Click here</div>
</form>
```

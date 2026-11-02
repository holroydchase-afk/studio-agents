---
description: "recall H3: an invite text message that reads like a scam delivery text to an older relative"
tags: [ux-reviewer, recall, p0, src-hearth, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the invite flow of our family photo app. Alex invites a relative by phone number; the relative (often over 70, never used the app) gets a text message. Here is the screen Alex sees, with the exact text the relative will receive. Review it before we send real invites.

```html
<style>
  body{margin:0;padding:16px;font:18px/1.5 system-ui;color:#1E1B16;background:#FFFDF8}
  label{display:block;font-weight:600;margin:16px 0 6px}
  input{width:100%;min-height:56px;font:18px system-ui;padding:0 12px;border:2px solid #8C857A;border-radius:12px;box-sizing:border-box}
  .preview{margin:16px 0;padding:12px 16px;border-radius:18px;background:#E9E9EB;font:17px/1.4 system-ui}
  .send{width:100%;min-height:56px;border:0;border-radius:12px;background:#1F5C44;color:#fff;font:600 18px system-ui}
</style>
<h1>Invite to Grandma's group</h1>
<label for="name">Their name</label><input id="name" value="Grandma Pat" autocomplete="off">
<label for="phone">Their mobile number</label><input id="phone" type="tel" inputmode="tel" autocomplete="off">
<p>They'll get this text:</p>
<div class="preview" aria-label="Text message preview">App: Alex shared 2 photos. See them: app.example/v/K4P2</div>
<button class="send">Send invite</button>
<p>Only people in Grandma's group can see what you share.</p>
```

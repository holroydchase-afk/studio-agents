---
description: "fresh miss HEARTH-N1: comment box at the bottom of the post with a fixed tab bar; on-screen keyboard covers it"
tags: [ux-reviewer, fresh, p0, src-hearth, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the comment field of our family photo app's post view. Relatives open this on iPhones and older Android phones and type with the on-screen keyboard. Review the code and screen.

```html
<style>
  html,body{height:100%;margin:0}
  body{font:18px/1.5 system-ui;color:#1E1B16;background:#FFFDF8}
  .post{padding:16px}
  .post img{width:100%;border-radius:12px}
  .comments{padding:0 16px 140px}
  .compose{position:fixed;left:0;right:0;bottom:64px;background:#fff;border-top:1px solid #E6E0D4;padding:8px 12px;display:flex;gap:8px}
  .compose input{flex:1;min-height:48px;font-size:18px;border:1px solid #8A8372;border-radius:10px;padding:0 12px}
  .compose button{min-height:48px;padding:0 18px;font:600 18px system-ui;border-radius:10px;border:0;background:#1F5C44;color:#fff}
  .tabbar{position:fixed;left:0;right:0;bottom:0;height:64px;background:#fff;border-top:1px solid #E6E0D4;display:flex;justify-content:space-around;align-items:center}
</style>
<div class="post"><img alt="Lake photo from Robin" src="lake.jpg"><p><b>Robin:</b> First swim of the year!</p></div>
<div class="comments"><p><b>Gammy:</b> Look at those smiles.</p></div>
<div class="compose"><input aria-label="Add a comment" placeholder="Write a comment"><button>Send</button></div>
<nav class="tabbar"><a>Gallery</a><a>Share</a><a>Feed</a><a>More</a></nav>
```

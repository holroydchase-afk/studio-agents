---
description: "recall ES-R4: a demo page with no way back to the portfolio and no word on what it is"
tags: [ux-reviewer, recall, p0, src-es, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on this demo page before I link it from my portfolio. It's a kids' bedtime app; the portfolio card links straight here. Is it ready to show?

```html
<!doctype html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Starlight</title>
<style>
  body{margin:0;min-height:100vh;font:18px/1.5 system-ui;color:#F4F1FF;background:#1B1640;display:grid;place-items:center}
  main{max-width:420px;padding:24px;text-align:center}
  h1{font-size:32px;margin:0 0 8px}
  .pick{display:block;width:100%;min-height:56px;margin:12px 0;border:0;border-radius:16px;font:600 20px system-ui;color:#1B1640;background:#FFD66B}
  .pick:focus-visible{outline:3px solid #fff;outline-offset:3px}
  @media (prefers-reduced-motion: no-preference){.moon{animation:float 6s ease-in-out infinite}}
  @keyframes float{50%{transform:translateY(-6px)}}
</style>
</head>
<body>
<main>
  <div class="moon" aria-hidden="true">🌙</div>
  <h1>Ready for bed?</h1>
  <p>Pick tonight's story.</p>
  <button class="pick">The sleepy fox</button>
  <button class="pick">Ten quiet stars</button>
  <button class="pick">Boat on a calm sea</button>
</main>
</body>
</html>
```

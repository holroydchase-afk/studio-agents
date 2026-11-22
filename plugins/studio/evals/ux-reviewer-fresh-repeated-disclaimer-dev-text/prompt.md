---
description: "fresh miss CHL-N3: demo chat reply lists every trade twice, repeats the disclaimer five times, and tells visitors to set an API key"
tags: [ux-reviewer, fresh, p1, src-charlie, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the Chat tab of our public demo (recruiters and hiring managers will try it on their phones). Here is what one reply looks like, rendered at 390px. Review it before the demo goes live.

```html
<style>
  body{margin:0;font:16px/1.5 system-ui;background:#F7F8FB;color:#14213D;padding:12px}
  .bot{background:#fff;border:1px solid #E3E6EE;border-radius:14px;padding:12px;margin:8px 0}
  .tag{font-size:12px;color:#5B6478}
  .card{border:1px solid #CBD5E1;border-radius:10px;padding:10px;margin:8px 0}
  pre{white-space:pre-wrap;font:13px/1.4 ui-monospace,monospace;margin:0}
</style>
<div class="bot">
 <pre>TRADE 1: Sell 1 covered call XYZ 45C. Credit $0.80. Max loss $320. Breakeven $41.20.
Not financial advice. Paper trading only.
TRADE 2: Sell 1 cash-secured put ABC 30P. Credit $0.55. Max loss $245. Breakeven $29.45.
Not financial advice. Paper trading only.</pre>
 <div class="card"><b>Covered call XYZ 45C</b><br>Credit $0.80 · Max loss $320<div class="tag">Not financial advice. Paper trading only.</div></div>
 <div class="card"><b>Cash-secured put ABC 30P</b><br>Credit $0.55 · Max loss $245<div class="tag">Not financial advice. Paper trading only.</div></div>
 <div class="tag">Not financial advice. Paper trading only.</div>
 <p>For richer answers, set ANTHROPIC_API_KEY in your environment and restart the server.</p>
</div>
```

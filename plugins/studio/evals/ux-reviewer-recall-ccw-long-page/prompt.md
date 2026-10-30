---
description: "recall CCW-R5: a phone page about 6,000px tall because everything is always expanded"
tags: [ux-reviewer, recall, p1, src-ccw, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the phone layout of our open-source CLI's web playground (it estimates the electricity Claude Code usage took). The full-page phone screenshot is 390x6120, too big to paste, so here is the markup. Review it before we announce it.

```html
<style>
  body{font:17px/1.6 system-ui;color:#1A2220;background:#FAFAF7;margin:0;padding:16px}
  .total{font:700 40px system-ui;margin:0} .range{color:#4A5552}
  .method{border:1px solid #D5D9D6;border-radius:12px;padding:16px;margin:16px 0;background:#fff}
  .method table{width:100%;font-size:15px} .post{border:1px solid #D5D9D6;border-radius:12px;padding:16px}
  .btn{min-height:48px;border-radius:8px;font:600 17px system-ui}
</style>
<h1>Your estimate</h1>
<p class="total">2.1 kWh</p><p class="range">1.2 to 3.4 kWh, method v0.3</p>
<button class="btn">Share this</button>
<h2>The six methods we combine</h2>
<section class="method"><h3>1. Tokens to energy</h3>
  <p>We multiply input and output tokens by a per-token energy range drawn from published inference measurements...</p>
  <p>Why a range: vendors don't publish exact figures, so we carry the low and high values through every step...</p>
  <table><tr><th>Parameter</th><th>Low</th><th>High</th><th>Source</th></tr><tr><td>Wh per 1k output tokens</td><td>0.2</td><td>1.1</td><td>Published study, 2025</td></tr><tr><td>PUE</td><td>1.1</td><td>1.4</td><td>Vendor report, 2025</td></tr></table>
  <p>Worked example: 120k output tokens x 0.2-1.1 Wh/1k x PUE 1.1-1.4 = 26-185 Wh.</p></section>
<!-- methods 2-6 (Cached tokens, Thinking tokens, Idle sessions, Grid mix, Hardware share): same shape as method 1, all shown in full -->
<h2>Your post</h2>
<section class="post"><p>A full preview of the social post, with the share card image and the 4-paragraph caption, always visible.</p></section>
<button class="btn">Copy post</button>
```

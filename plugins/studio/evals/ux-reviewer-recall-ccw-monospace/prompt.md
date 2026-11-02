---
description: "recall CCW-R4: whole paragraphs set in monospace"
tags: [ux-reviewer, recall, p1, src-ccw, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the results page of our open-source CLI's web playground (it estimates the electricity Claude Code usage took). I like the developer-tool feel. Review it before we post it.

```html
<style>
  :root{--mono:ui-monospace,"SF Mono",Menlo,monospace}
  body{font:16px/1.6 var(--mono);color:#1A2220;background:#FAFAF7;max-width:720px;margin:32px auto;padding:0 16px}
  h1,h2{font-family:system-ui;letter-spacing:-.3px}
  .total{font:700 40px system-ui} .range{color:#4A5552}
  figcaption{font:15px/1.6 var(--mono);color:#4A5552}
  .method p{font:15px/1.6 var(--mono)}
  textarea{width:100%;min-height:140px;font:15px/1.5 var(--mono)}
  .chart{height:220px;border:1px solid #D5D9D6;border-radius:8px}
</style>
<h1>Last 30 days</h1>
<p class="total">2.1 kWh <span class="range">(1.2 to 3.4 kWh, method v0.3)</span></p>
<figure><div class="chart" role="img" aria-label="Daily kWh, highest on Oct 14"></div>
  <figcaption>Each bar is one day. The shaded band is the low-to-high range; the line is the central estimate. Days with no sessions are left blank instead of zero so a quiet week doesn't look like efficiency.</figcaption></figure>
<h2>How we estimate</h2>
<section class="method"><h3>Tokens to energy</h3>
  <p>We multiply input and output tokens by a per-token energy range drawn from published inference measurements, then apply a data-center overhead (PUE) range. Every number is a range because the vendors don't publish exact figures.</p></section>
<section class="method"><h3>Cached tokens</h3>
  <p>Cache reads cost far less compute than fresh input, so we count them at a separate, lower rate. If your logs don't separate them, we treat all input as fresh and say so.</p></section>
<label for="note">Add a note to your share card</label>
<textarea id="note">Tried the playground on a month of my sessions. Less than a kettle a week, but the range is wide and the method is open, which I like.</textarea>
```

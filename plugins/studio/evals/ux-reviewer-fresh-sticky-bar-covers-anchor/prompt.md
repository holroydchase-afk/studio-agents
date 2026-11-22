---
description: "fresh miss CCW-N2: opening a tab from a link leaves the sticky bar covering the section heading"
tags: [ux-reviewer, fresh, p1, src-ccw, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the deep-link behaviour of our demo page at 390px. A share link like /demo/#pace should open straight on the Pace section. Review it before it ships.

```html
<style>
  body{margin:0;font:17px/1.5 system-ui}
  .tabs{position:sticky;top:0;height:56px;background:#fff;border-bottom:1px solid #ddd;display:flex;gap:12px;align-items:center;padding:0 12px;z-index:10}
  section{padding:24px 16px;min-height:700px}
  section h2{margin:0 0 8px}
</style>
<div class="tabs"><a href="#overview">Overview</a><a href="#pace">Pace</a><a href="#share">Share</a></div>
<section id="overview"><h2>Overview</h2><p>…</p></section>
<section id="pace"><h2>Pace</h2><p>Your week at a glance…</p></section>
<section id="share"><h2>Share</h2><p>…</p></section>
<script>if(location.hash)document.querySelector(location.hash)?.scrollIntoView()</script>
```

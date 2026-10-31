---
description: "recall CCW-R2: an error message with no next step, the same for an empty paste"
tags: [ux-reviewer, recall, p1, src-ccw, by-agent]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the web playground for our open-source CLI that estimates the electricity your Claude Code usage took. People paste lines from their local logs and get an estimate. Review it before we announce it.

```html
<style>
  body{font:17px/1.6 system-ui;color:#1A2220;background:#FAFAF7;max-width:680px;margin:32px auto;padding:0 16px}
  label{display:block;font-weight:600;margin-bottom:6px}
  textarea{width:100%;min-height:180px;font:15px/1.5 ui-monospace,monospace;padding:12px;border:1px solid #9AA39F;border-radius:8px}
  button{min-height:48px;padding:0 20px;margin-top:12px;border:0;border-radius:8px;background:#1F5C44;color:#fff;font:600 17px system-ui}
  .error{color:#A3122A;font-weight:600} .note{color:#4A5552;font-size:15px}
</style>
<h1>Estimate your Claude Code electricity</h1>
<p class="note">Runs in your browser. Nothing you paste is sent anywhere.</p>
<label for="logs">Paste log lines</label>
<textarea id="logs"></textarea>
<button id="go">Estimate</button>
<p id="msg" role="status"></p>
<script>
  go.onclick = () => {
    const records = parseLines(logs.value);
    if (records.length === 0) {
      msg.className = "error";
      msg.textContent = "That text had no Claude Code usage in them.";
      return;
    }
    msg.className = "";
    msg.textContent = `About ${fmt(est(records).low)} to ${fmt(est(records).high)} Wh (method v0.3)`;
  };
</script>
```

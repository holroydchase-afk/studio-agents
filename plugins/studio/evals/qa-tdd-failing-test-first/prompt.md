---
description: qa-tdd turns a bug report into a failing test and does not fix the code
tags: [qa-tdd]
runs: 2
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent for this. Bug report from a user: "20% off a $50 item shows $10 instead of $40."

Create `price.js` in the working directory with exactly this code, then have qa-tdd write the failing test for the bug in `price.test.js` (Node's built-in `node:test` and `node:assert`). Do not fix `price.js`: we want the red test first.

```js
export function discounted(price, percentOff) {
  return price * (percentOff / 100);
}
```

Reply with the test and whether it fails against the current code.

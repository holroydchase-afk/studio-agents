---
description: "miss PS-Q4 (tool-tests-missed-edge-cases), undo-position"
tags: [qa-tdd, miss, p2, src-ps, tool-tests-missed-edge-cases, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Deleting a roadmap card can be undone, and the card comes back. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`column.mjs`:
```js
// One roadmap column. Remove takes a card out; undo puts the last removed card back.
export function makeColumn(cards) {
  const list = cards.slice();
  let last = null;
  return {
    ids: () => list.map((c) => c.id),
    remove(id) {
      const i = list.findIndex((c) => c.id === id);
      if (i >= 0) last = list.splice(i, 1)[0];
    },
    undo() {
      if (last) { list.push(last); last = null; }
    },
  };
}
```

`column.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeColumn } from "./column.mjs";
test("COL-1 undo brings back the last card", () => {
  const col = makeColumn([{ id: "a" }, { id: "b" }, { id: "c" }]);
  col.remove("c");
  col.undo();
  assert.deepEqual(col.ids(), ["a", "b", "c"]);
});
```

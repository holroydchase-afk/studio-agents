---
description: "recall RR QA-R1 (Role Radar MCP server): an MCP tool handler trusts the schema's required fields; a missing title returns a score"
tags: [qa-tdd, recall, p1, src-rr, by-agent]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. This is the `score_job` tool for our job-search MCP server; it's registered with the SDK's low-level `Server` through `setRequestHandler(CallToolRequestSchema, ...)`, which calls `scoreJob(request.params.arguments)`. It's ready and the tests pass. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`score-job.mjs`:
```js
// MCP tool: score one job posting 0-100 against the search criteria.
export const scoreJobTool = {
  name: "score_job",
  description: "Score a job posting 0-100 against the criteria",
  inputSchema: {
    type: "object",
    required: ["title", "company"],
    properties: { title: { type: "string" }, company: { type: "string" }, remote: { type: "boolean" } },
  },
};

const TITLE_WEIGHTS = { staff: 40, principal: 40, senior: 30, product: 20 };

export function scoreJob(args) {
  const title = String(args.title).toLowerCase();
  let score = 10;
  for (const [word, weight] of Object.entries(TITLE_WEIGHTS)) if (title.includes(word)) score += weight;
  if (args.remote) score += 10;
  const result = { company: args.company, score: Math.min(score, 100) };
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
}
```

`score-job.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreJob } from "./score-job.mjs";
const scoreOf = (res) => JSON.parse(res.content[0].text).score;
test("SCORE-1 a remote staff product role scores high", () => {
  assert.equal(scoreOf(scoreJob({ title: "Staff Product Manager", company: "Example Co", remote: true })), 80);
});
test("SCORE-2 an unrelated title scores low", () => {
  assert.equal(scoreOf(scoreJob({ title: "Barista", company: "Example Co" })), 10);
});
```

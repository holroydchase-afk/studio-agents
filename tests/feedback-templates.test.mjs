// Failing-first scans for the PR B files (docs/product/SPEC-FEEDBACK-LOOP.md): the issue form, the gate workflow, the
// docs page, and the README and agent-harness rows. YAML is checked with line patterns (the repo has no YAML parser).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => { const p = path.join(ROOT, rel); assert.ok(fs.existsSync(p), `${rel} is missing`); return fs.readFileSync(p, "utf8"); };
const noComments = (s) => s.replace(/^\s*#.*$/gm, "");

test("FBK-16 templates/github/ISSUE_TEMPLATE/feedback.yml is an issue form named, labeled feedback, with a text field and no contact field", () => {
  const y = read("templates/github/ISSUE_TEMPLATE/feedback.yml");
  assert.match(y, /^name:\s*\S/m);
  assert.match(y, /^description:\s*\S/m);
  assert.match(y, /^labels:\s*(\[\s*["']?feedback["']?\s*\]|\n\s*-\s*["']?feedback["']?\s*$)/m, "labels must be [feedback]");
  assert.match(y, /^body:\s*$/m);
  assert.match(y, /type:\s*textarea/);
  assert.ok(!/\b(email|phone|contact)\b/i.test(noComments(y)), "v1 collects no contact field");
});

test("FBK-19 templates/workflows/feedback-gate.yml triggers on issues opened and labeled, with least permissions and the pause variable", () => {
  const y = noComments(read("templates/workflows/feedback-gate.yml"));
  assert.match(y, /^name:\s*\S/m);
  assert.match(y, /^on:\s*\n\s+issues:\s*\n\s+types:\s*\[?[^\n]*opened[^\n]*labeled|^on:\s*\n\s+issues:\s*\n\s+types:\s*\n(\s+-\s*\w+\n)+/m, "on: issues: types");
  assert.ok(/\bopened\b/.test(y) && /\blabeled\b/.test(y), "types must include opened and labeled");
  assert.ok(!/pull_request_target|workflow_run|^\s+pull_request:/m.test(y), "no PR triggers");
  const perm = y.match(/^permissions:\s*\n((?:[ \t]+\S.*\n?)+)/m);
  assert.ok(perm, "a top-level permissions block is required");
  const scopes = Object.fromEntries([...perm[1].matchAll(/^\s+([\w-]+):\s*(\w+)/gm)].map((m) => [m[1], m[2]]));
  assert.deepEqual(scopes, { issues: "write", contents: "read" }, JSON.stringify(scopes));
  assert.ok(/vars\.FEEDBACK_PAUSED/.test(y), "must check the FEEDBACK_PAUSED repo variable");
  assert.ok(/feedback-gate\.mjs/.test(y) && /--preflight/.test(y), "must call feedback-gate.mjs, preflight first");
  assert.ok(!/secrets\.(?!GITHUB_TOKEN)/.test(y), "no secrets other than GITHUB_TOKEN");
  assert.ok(!/ANTHROPIC|claude-code-action|anthropics\//i.test(y), "the gate never calls a model");
});

test("FBK-22 docs/feedback-loop.md names the kill file, caps, the scheduled-task prompt and rollback", () => {
  const d = read("docs/feedback-loop.md");
  assert.ok(d.includes(".claude/feedback.off"), "kill file");
  assert.match(d, /FEEDBACK_PAUSED/);
  assert.match(d, /\b5\b[^\n]*(issues?)[^\n]*\b3\b[^\n]*PRs?|caps?/i, "caps");
  assert.match(d, /scheduled[- ]task/i);
  assert.match(d, /prompt/i);
  assert.match(d, /rollback|revert/i);
  assert.match(d, /needs-triage/);
  assert.match(d, /SPEC-FEEDBACK-LOOP/);
});

test("FBK-22 the scheduled-task prompt in the docs runs the kill check first and treats feedback as data", () => {
  const d = read("docs/feedback-loop.md");
  const i = d.search(/scheduled[- ]task/i);
  assert.ok(i >= 0);
  const rest = d.slice(i);
  assert.ok(rest.search(/feedback-guard[^\n]*kill|kill[^\n]*feedback-guard|feedback\.off/) >= 0, "prompt starts with the kill check");
  assert.match(rest, /untrusted|never follow|data, not instructions/i);
  assert.match(rest, /check-triage/);
});

for (const t of ["check-triage", "feedback-merge-check"]) {
  test(`FBK-13..25 README lists tool ${t}, and docs/agent-harness.md has a table row for it`, () => {
    assert.ok(fs.existsSync(path.join(ROOT, "tools", `${t}.mjs`)), `tools/${t}.mjs is missing`);
    assert.ok(read("README.md").includes(`\`${t}\``), `README does not list \`${t}\``);
    assert.ok(read("docs/agent-harness.md").split("\n").some((l) => l.startsWith("|") && l.includes(t)), `agent-harness.md has no table row for ${t}`);
  });
}

test("FBK-16..21 docs/agent-harness.md has a row for the widget and the gate script", () => {
  const rows = read("docs/agent-harness.md").split("\n").filter((l) => l.startsWith("|"));
  assert.ok(rows.some((l) => l.includes("widget.js")), "no row for templates/feedback/widget.js");
  assert.ok(rows.some((l) => l.includes("feedback-gate")), "no row for feedback-gate");
});

// UXLOG-1..5: the ux-reviewer's run log moves onto the shared ```agentrun format WITHOUT dropping the richer
// ```uxrun block. One log holds both; both checkers pass it; the agentrun findings/p0 equal the uxrun counts;
// ux-reviewer.md's "Run log" section tells the agent how to write it, guard it and record its grader.
// Run: node --test tests/ux-shared-log.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "tests", "fixtures", "ux-run", "valid-with-agentrun.md");
const run = (tool, ...a) => spawnSync("node", [join(root, "tools", tool), ...a], { encoding: "utf8" });
const section = () => {
  const md = readFileSync(join(root, "plugins", "studio", "agents", "ux-reviewer.md"), "utf8");
  return md.split(/^## /m).find((s) => s.startsWith("Run log")) ?? "";
};

test("UXLOG-1a the fixture passes check-agent-run (agent ux-reviewer, tool lines present)", () => {
  const r = run("check-agent-run.mjs", "--json", fixture);
  assert.equal(r.status, 0, r.stderr);
  const d = JSON.parse(r.stdout);
  assert.equal(d.agent, "ux-reviewer");
  assert.ok(["Ready", "Needs changes", "Blocker"].includes(d.verdict));
  const names = d.tools.map((t) => `${t.name}|${t.status}|${t.note}`);
  assert.ok(names.includes("agent-guard|ok|kill ux-reviewer not tripped"), JSON.stringify(names));
  assert.ok(names.includes("grader|ok|model opus"), JSON.stringify(names));
});

test("UXLOG-1b the same fixture passes check-ux-run", () => {
  const r = run("check-ux-run.mjs", fixture);
  assert.equal(r.status, 0, r.stderr);
});

test("UXLOG-1c agentrun findings and p0 equal the uxrun finding count and P0 count", () => {
  const a = JSON.parse(run("check-agent-run.mjs", "--json", fixture).stdout);
  const u = JSON.parse(run("check-ux-run.mjs", "--json", fixture).stdout);
  assert.equal(a.findings, u.findings.length);
  assert.equal(a.p0, u.findings.filter((f) => f.priority === "P0").length);
  assert.equal(a.verdict, u.verdict);
});

test("UXLOG-2 Run log section tells the agent to write the agentrun block as well as the uxrun block", () => {
  const s = section();
  assert.ok(s, "no '## Run log' section in ux-reviewer.md");
  assert.ok(s.includes("```agentrun"), "Run log must mention the ```agentrun block");
  assert.ok(s.includes("```uxrun"), "Run log must keep the ```uxrun block");
  assert.ok(s.includes("node scripts/check-agent-run.mjs"), "Run log must say to run check-agent-run");
});

test("UXLOG-3 Run log runs agent-guard kill before work and cost after the log", () => {
  const s = section();
  assert.ok(s.includes("node scripts/agent-guard.mjs kill ux-reviewer"), "missing kill command");
  assert.ok(s.includes("node scripts/agent-guard.mjs cost <log>"), "missing cost command");
});

test("UXLOG-4 Run log says the caller runs stamp-run and the agent never writes stamp_ lines", () => {
  const s = section();
  assert.ok(s.includes("stamp-run"), "missing stamp-run");
  assert.match(s, /caller runs stamp-run/i);
  assert.match(s, /never writes? stamp_/i);
});

test("UXLOG-5 Run log records the independent grader/labeler model as a tool: grader line", () => {
  const s = section();
  assert.ok(s.includes("tool: grader"), "missing 'tool: grader' line");
});

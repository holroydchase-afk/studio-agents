// UXREL-1..5: reliability of tools/ux-flows.mjs and the ux-reviewer permissions list.
// No browser needed: the shot runner is injected; the CLI case uses a nonexistent target.
// Run: node --test tests/ux-reliability.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as flows from "../tools/ux-flows.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tool = join(root, "tools", "ux-flows.mjs");
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });
const need = (name) => assert.equal(typeof flows[name], "function", `tools/ux-flows.mjs must export ${name}()`);

const plan = [
  { name: "A", out: "o/a", args: ["x"] },
  { name: "B", out: "o/b", args: ["y"] },
  { name: "C", out: "o/c", args: ["z"] },
];
// runner script by flow name: each entry is a list of outcomes consumed per attempt
const scripted = (script) => { const calls = []; const fn = async (p) => {
  calls.push(p.name);
  const o = script[p.name].shift();
  if (o instanceof Error) throw o;
  return { status: o }; };
  fn.calls = calls; return fn; };

test("UXREL-1 status 0 and 1 are ok; other status or throw fails; later flows still run", async () => {
  need("runFlows");
  const runner = scripted({ A: [1], B: [2], C: [0] });
  const r = await flows.runFlows(plan, { runner, retries: 0, outDir: "o" });
  assert.deepEqual(runner.calls, ["A", "B", "C"], "must continue past the failure");
  assert.deepEqual(r.flows.map((f) => [f.name, f.status, f.attempts, f.exit]),
    [["A", "ok", 1, 1], ["B", "failed", 1, 2], ["C", "ok", 1, 0]]);
  assert.equal(r.ok, false);
  const t = await flows.runFlows(plan, { runner: scripted({ A: [0], B: [new Error("boom")], C: [0] }), retries: 0, outDir: "o" });
  assert.equal(t.flows[1].status, "failed");
  assert.match(t.flows[1].error, /boom/);
  assert.equal(t.flows[2].status, "ok");
  const allOk = await flows.runFlows(plan, { runner: scripted({ A: [0], B: [1], C: [0] }), outDir: "o" });
  assert.equal(allOk.ok, true);
});

test("UXREL-2 fail then succeed is ok with attempts 2; always-fail has attempts 1+retries", async () => {
  need("runFlows");
  const r = await flows.runFlows(plan, { runner: scripted({ A: [2, 0], B: [2, 2, 2], C: [0] }), retries: 2, outDir: "o" });
  assert.deepEqual([r.flows[0].status, r.flows[0].attempts], ["ok", 2]);
  assert.deepEqual([r.flows[1].status, r.flows[1].attempts], ["failed", 3]);
  const d = await flows.runFlows(plan, { runner: scripted({ A: [2, 0], B: [0], C: [0] }), outDir: "o" }); // default retries=1
  assert.deepEqual([d.flows[0].status, d.flows[0].attempts], ["ok", 2]);
});

test("UXREL-3 summary is structured JSON with injectable clock; skeleton marks failed flows", async () => {
  need("runFlows"); need("summary");
  const result = await flows.runFlows(plan, { runner: scripted({ A: [0], B: [2], C: [0] }), retries: 0, outDir: "o" });
  const s = flows.summary(result, { product: "Example App", now: () => new Date("2026-11-22T10:00:00Z") });
  assert.equal(s.product, "Example App");
  assert.match(s.date, /^2026-11-22/);
  assert.deepEqual(s.failed, ["B"]);
  assert.equal(s.flows.length, 3);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(s)));
  const config = { product: "Example App", target: "http://localhost:8123/", flows: [{ name: "A" }, { name: "B" }, { name: "C" }] };
  const lines = flows.skeleton(config, "o", result).split("\n");
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith("flow: A |"), lines[0]);
  assert.match(lines[1], /^flow-failed: B \| .+/);
  assert.ok(!lines[1].startsWith("flow:"), "failed flow must not look captured");
  assert.ok(lines[2].startsWith("flow: C |"), lines[2]);
});

test("UXREL-4 CLI continues past a failing flow, writes run.json, exits 1; exit 2 stays for usage", () => {
  const dir = mkdtempSync(join(tmpdir(), "uxrel-"));
  const out = join(dir, "out");
  const cfg = join(dir, "flows.json");
  writeFileSync(cfg, JSON.stringify({ product: "Example App", target: join(dir, "nope.html"), flows: [{ name: "Bad one" }, { name: "Also bad" }] }));
  const r = cli(cfg, "--out", out);
  assert.equal(r.status, 1, `exit ${r.status}\n${r.stderr}`);
  assert.match(r.stdout, /flow-failed: Bad one \|/);
  assert.match(r.stdout, /flow-failed: Also bad \|/, "must continue to the next flow");
  assert.ok(!/^flow: /m.test(r.stdout), "no flow was captured");
  const runJson = join(out, "run.json");
  assert.ok(existsSync(runJson), "run.json missing");
  const s = JSON.parse(readFileSync(runJson, "utf8"));
  assert.deepEqual(s.failed, ["Bad one", "Also bad"]);
  assert.equal(s.product, "Example App");
  assert.equal(cli().status, 2);
  assert.equal(cli(cfg, "--bogus").status, 2);
});

test("UXREL-5 docs/ux-agent-permissions.md lists allowed tools and the Never rules", () => {
  const file = join(root, "docs", "ux-agent-permissions.md");
  assert.ok(existsSync(file), "docs/ux-agent-permissions.md is missing");
  const md = readFileSync(file, "utf8");
  for (const h of ["## Allowed", "## Needs Chase", "## Never"]) assert.ok(md.includes(h), `missing heading ${h}`);
  const fence = md.match(/```tools\s*\n([\s\S]*?)```/);
  assert.ok(fence, "needs a fenced ```tools block");
  const line = fence[1].split("\n").find((l) => /^tools:/.test(l.trim()));
  assert.ok(line, "tools block needs a `tools:` line");
  const allowed = line.replace(/^\s*tools:/, "").split(",").map((t) => t.trim()).filter(Boolean);
  const agent = readFileSync(join(root, "plugins", "studio", "agents", "ux-reviewer.md"), "utf8");
  const fm = agent.match(/^---\n([\s\S]*?)\n---/)[1];
  const tools = fm.match(/^tools:\s*(.+)$/m)[1].split(",").map((t) => t.trim());
  assert.ok(tools.length > 0);
  for (const t of tools) assert.ok(allowed.includes(t), `ux-reviewer tool ${t} is not in the allowed list`);
  const never = md.split(/^## Never\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  for (const w of [/merge/i, /deploy/i, /real user data/i]) assert.match(never, w, `Never section must mention ${w}`);
});

// SCORE: tests for tools/agent-scorecard.mjs, a per-agent scorecard (qa-tdd, staff-pm) from eval results and run logs.
// Source 1: evals/agent-misses/runs/*/results.json. Source 2: docs/runs/*.md agentrun blocks (checkAgentRun; invalid skipped).
// One section per agent ("## qa-tdd", "## staff-pm"), never mixed. Rates are "n of m", never a bare percent.
// Run: node --test tests/agent-scorecard.test.mjs
// JSON shape (spec was silent, so these tests fix it): { "<agent>": { eval: [{run,date,phase,arm,passed,total}],
//   logged: {runs,escalated,findings,p0,cost_measured,cost_usd,cost_runs}, lift: "not measured" | {run,agent:{passed,total},plain:{passed,total}} } }
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "agent-scorecard.mjs");
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });

const block = (agent, { tokens = 0, cost = 0, escalated = "no", findings = 0, p0 = 0 } = {}) => `\`\`\`agentrun
date: 2026-11-22
agent: ${agent}
product: Example App
tier: supervised
model: example-model-1
tokens: ${tokens}
cost_usd: ${cost}
input: a task
verdict: ${agent === "qa-tdd" ? "red" : "ready"}
findings: ${findings}
p0: ${p0}
escalated: ${escalated}
${escalated === "yes" ? "escalation_reason: harness showed no token or cost count\n" : ""}\`\`\``;

function repo({ evals = {}, runs = {} } = {}) {
  const d = mkdtempSync(join(tmpdir(), "score-"));
  for (const [id, r] of Object.entries(evals)) {
    mkdirSync(join(d, "evals", "agent-misses", "runs", id), { recursive: true });
    writeFileSync(join(d, "evals", "agent-misses", "runs", id, "results.json"), JSON.stringify({ run: id, date: "2026-11-22", change: "c", ...r }));
  }
  if (Object.keys(runs).length) mkdirSync(join(d, "docs", "runs"), { recursive: true });
  for (const [n, t] of Object.entries(runs)) writeFileSync(join(d, "docs", "runs", n), t);
  return d;
}
const row = (c, arm, pass, by) => ({ case: c, arm, pass, ...(by ? { by } : {}) });
const section = (out, agent) => {
  const parts = out.split(/^## /m).slice(1);
  const s = parts.find((p) => p.startsWith(agent));
  assert.ok(s, `no "## ${agent}" section in:\n${out}`);
  return s;
};

const MIXED = {
  "dev-1": { phase: "dev", results: [row("qa-tdd-a", "agent", true), row("qa-tdd-b", "agent", false), row("staff-pm-a", "agent", true)] },
  "held-1": { phase: "heldout", results: [row("qa-tdd-a", "agent", true), row("qa-tdd-b", "agent", true), row("staff-pm-a", "agent", false), row("staff-pm-b", "agent", false)] },
};

test("SCORE-1 one section per agent and eval rows never mix between them", () => {
  const r = cli("--root", repo({ evals: MIXED }));
  assert.equal(r.status, 0, r.stderr);
  const q = section(r.stdout, "qa-tdd"), p = section(r.stdout, "staff-pm");
  assert.match(q, /dev-1/); assert.match(q, /held-1/);
  assert.match(q, /1 of 2/); assert.match(q, /2 of 2/);
  assert.match(p, /1 of 1/); assert.match(p, /0 of 2/);
  assert.doesNotMatch(q, /0 of 2/);
  assert.doesNotMatch(p, /2 of 2/);
});

test("SCORE-2 a cross row counts for the agent named in by, not the case prefix", () => {
  const evals = { "dev-x": { phase: "dev", results: [row("qa-tdd-a", "cross", true, "staff-pm"), row("qa-tdd-b", "cross", false, "staff-pm"), row("staff-pm-a", "cross", true, "qa-tdd")] } };
  const out = cli("--root", repo({ evals })).stdout;
  const q = section(out, "qa-tdd"), p = section(out, "staff-pm");
  assert.match(q, /cross/); assert.match(q, /1 of 1/);
  assert.match(p, /cross/); assert.match(p, /1 of 2/);
});

test("SCORE-3 dev and heldout are labelled apart and the report says a dev score is not a quality claim", () => {
  const out = cli("--root", repo({ evals: MIXED })).stdout;
  const q = section(out, "qa-tdd");
  assert.match(q, /dev/i); assert.match(q, /heldout|held-out/i);
  assert.match(out, /dev score is not a quality claim/i);
});

test("SCORE-4 pass rate is never a bare percent", () => {
  const out = cli("--root", repo({ evals: MIXED })).stdout;
  assert.doesNotMatch(out, /\d\s*%/);
  assert.match(out, /\d+ of \d+/);
});

const logs = (spec) => Object.fromEntries(spec.map(([agent, o], i) => [`2026-11-2${i}-${agent}.md`, `# run\n\n${block(agent, o)}\n`]));

test("SCORE-5 logged runs, escalations, findings and p0 are counted per agent", () => {
  const runs = logs([["qa-tdd", { findings: 2, p0: 1, escalated: "yes" }], ["qa-tdd", { findings: 3 }], ["staff-pm", { findings: 1 }]]);
  const out = cli("--root", repo({ runs })).stdout;
  const q = section(out, "qa-tdd"), p = section(out, "staff-pm");
  assert.match(q, /logged runs: 2/); assert.match(p, /logged runs: 1/);
  assert.match(q, /escalated[^\n]*\b1\b/i); assert.match(q, /findings[^\n]*\b5\b/i); assert.match(q, /p0[^\n]*\b1\b/i);
  assert.match(p, /findings[^\n]*\b1\b/i);
});

test("SCORE-6 cost is 'not measured' and no dollar figure appears when every run has tokens 0 and cost 0", () => {
  const out = cli("--root", repo({ runs: logs([["qa-tdd", {}], ["qa-tdd", {}]]) })).stdout;
  assert.match(section(out, "qa-tdd"), /cost: not measured/);
  assert.doesNotMatch(out, /\$|USD|usd\s*[:=]?\s*\d/i);
});

test("SCORE-7 cost is summed only when measured, and says how many runs it covers", () => {
  const runs = logs([["qa-tdd", { tokens: 1000, cost: 0.25 }], ["qa-tdd", { tokens: 2000, cost: 0.5 }], ["qa-tdd", {}]]);
  const q = section(cli("--root", repo({ runs })).stdout, "qa-tdd");
  assert.match(q, /0\.75/); assert.match(q, /2 of 3 runs|2 runs/);
  assert.doesNotMatch(q, /cost: not measured/);
});

test("SCORE-8 lift is not measured without a plain arm, and a dev run never counts as lift", () => {
  const evals = { "held-a": { phase: "heldout", results: [row("qa-tdd-a", "agent", true)] },
                  "dev-p": { phase: "dev", results: [row("qa-tdd-a", "agent", true), row("qa-tdd-a", "plain", false)] } };
  const q = section(cli("--root", repo({ evals })).stdout, "qa-tdd");
  assert.match(q, /lift: not measured/);
  assert.doesNotMatch(q, /lift: (?!not measured)/);
});

test("SCORE-9 lift is listed only for a heldout run with both arms, printing both n of m", () => {
  const evals = { "held-b": { phase: "heldout", results: [row("qa-tdd-a", "agent", true), row("qa-tdd-b", "agent", true), row("qa-tdd-a", "plain", false), row("qa-tdd-b", "plain", true)] } };
  const out = cli("--root", repo({ evals })).stdout;
  const q = section(out, "qa-tdd");
  assert.match(q, /lift[^\n]*2 of 2[^\n]*1 of 2/);
  assert.doesNotMatch(q, /lift: not measured/);
  assert.match(section(out, "staff-pm"), /lift: not measured|no eval runs/);
});

test("SCORE-10 Claims allowed lists eval scores with run id and arm, and runs only when at least one", () => {
  const runs = logs([["qa-tdd", {}]]);
  const out = cli("--root", repo({ evals: MIXED, runs })).stdout;
  const q = section(out, "qa-tdd"), p = section(out, "staff-pm");
  const claims = q.slice(q.search(/claims allowed/i));
  assert.match(q, /claims allowed/i);
  assert.match(claims, /held-1/); assert.match(claims, /agent/); assert.match(claims, /logged runs: 1/);
  assert.doesNotMatch(p.slice(p.search(/claims allowed/i)), /logged runs/);
});

test("SCORE-11 an invalid agentrun block is skipped, not counted", () => {
  const runs = { ...logs([["qa-tdd", { findings: 1 }]]), "bad.md": "# x\n\n```agentrun\nagent: qa-tdd\nnonsense\n```\n" };
  const r = cli("--root", repo({ runs }));
  assert.equal(r.status, 0, r.stderr);
  assert.match(section(r.stdout, "qa-tdd"), /logged runs: 1/);
});

test("SCORE-12 an empty root prints no eval runs and no logged runs for both agents and exits 0", () => {
  const r = cli("--root", repo());
  assert.equal(r.status, 0, r.stderr);
  for (const a of ["qa-tdd", "staff-pm"]) {
    const s = section(r.stdout, a);
    assert.match(s, /no eval runs/); assert.match(s, /no logged runs/);
    assert.doesNotMatch(s, /logged runs: \d/);
  }
});

test("SCORE-13 --agent limits the report to one agent", () => {
  const r = cli("--root", repo({ evals: MIXED }), "--agent", "staff-pm");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^## staff-pm/m);
  assert.doesNotMatch(r.stdout, /^## qa-tdd/m);
});

test("SCORE-14 usage errors exit 2: unknown flag, bad --agent, missing values", () => {
  const root = repo();
  for (const a of [["--bogus"], ["--agent", "engineer"], ["--agent"], ["--root"], ["--root", root, "--agent", "nope"]]) {
    const r = cli(...a);
    assert.equal(r.status, 2, `args ${a.join(" ")} -> ${r.status} ${r.stderr}`);
    assert.match(r.stderr, /usage/i);
  }
});

test("SCORE-15 --json is an object keyed by agent with the same facts", () => {
  const runs = logs([["qa-tdd", { findings: 2, p0: 1, escalated: "yes" }]]);
  const r = cli("--root", repo({ evals: MIXED, runs }), "--json");
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(j).sort(), ["qa-tdd", "staff-pm"]);
  const h = j["qa-tdd"].eval.find((e) => e.run === "held-1");
  assert.deepEqual([h.phase, h.arm, h.passed, h.total], ["heldout", "agent", 2, 2]);
  assert.deepEqual([j["qa-tdd"].logged.runs, j["qa-tdd"].logged.escalated, j["qa-tdd"].logged.findings, j["qa-tdd"].logged.p0], [1, 1, 2, 1]);
  assert.equal(j["qa-tdd"].logged.cost_measured, false);
  assert.equal(j["qa-tdd"].logged.cost_usd, null);
  assert.equal(j["qa-tdd"].lift, "not measured");
  assert.equal(j["staff-pm"].logged.runs, 0);
});

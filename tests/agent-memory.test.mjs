// AMEM: tests for tools/agent-memory.mjs, generic keyword and tag search over qa-tdd's and staff-pm's memory
// (finding lines in docs/runs/*.md run logs, and the graders/criteria.md of past eval misses) plus dedupe().
// Reuses search/tokenize/similarity from tools/ux-search.mjs. No embeddings, no network.
// Run: node --test tests/agent-memory.test.mjs
//
// A run log carries its findings as lines OUTSIDE the ```agentrun block, in the qa/PM report shape:
//   QA-R1 | P1 | where | problem | failing test path or none      (qa-tdd)
//   PM-R1 | P1 | where | problem | ...                            (staff-pm)
// (the agentrun block itself only holds a findings count, so the ids and text have to come from these lines).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMemory, dedupe } from "../tools/agent-memory.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "agent-memory.mjs");
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });

const block = (agent, verdict, findings) => `\`\`\`agentrun
date: 2026-11-22
agent: ${agent}
product: Example App
tier: supervised
model: example-model-1
tokens: 100
cost_usd: 0.10
input: a task
verdict: ${verdict}
findings: ${findings}
p0: 0
escalated: no
\`\`\``;

const QA_RUN = `# qa-tdd run

${block("qa-tdd", "red", 2)}

QA-R1 | P1 | dailyAverage | divides by zero on a Monday so the demo shows Infinity | tests/avg.test.mjs
QA-R2 | P2 | export button | label is missing on the small screen layout | none
`;
const PM_RUN = `# staff-pm run

${block("staff-pm", "ready", 1)}

PM-R1 | P1 | scope | the spec never says what an empty state shows | none
`;
const CRITERIA_QA = "---\ntype: llm\nweight: 3\n---\n\nRecall of a known miss: the denylist match is case sensitive, so a lowercase surname leaks.\n";
const CRITERIA_PM = "---\ntype: llm\nweight: 2\n---\n\nPass only if the scope names the rollback plan for a bad release.\n";

function repo({ runs = {}, cases = {} } = {}) {
  const d = mkdtempSync(join(tmpdir(), "amem-"));
  mkdirSync(join(d, "docs", "runs"), { recursive: true });
  for (const [n, t] of Object.entries(runs)) writeFileSync(join(d, "docs", "runs", n), t);
  for (const [n, t] of Object.entries(cases)) {
    mkdirSync(join(d, "plugins", "studio", "evals", n, "graders"), { recursive: true });
    writeFileSync(join(d, "plugins", "studio", "evals", n, "graders", "criteria.md"), t);
  }
  return d;
}
const full = () => repo({
  runs: { "2026-11-22-qa-tdd.md": QA_RUN, "2026-11-22-staff-pm.md": PM_RUN, "bad.md": "# bad\n\n```agentrun\nagent: qa-tdd\n```\n\nQA-R9 | P0 | nowhere | malformed block should never be indexed | none\n" },
  cases: { "qa-tdd-miss-name-denylist-case": CRITERIA_QA, "staff-pm-miss-rollback": CRITERIA_PM },
});

test("AMEM-1 loadMemory builds one run doc per finding with the finding id and agent as tags", () => {
  const docs = loadMemory(full());
  const runs = docs.filter((x) => x.source === "run");
  assert.equal(runs.length, 3); // QA-R1, QA-R2, PM-R1; bad.md contributes nothing
  const q1 = runs.find((x) => x.tags.includes("QA-R1"));
  assert.ok(q1, "QA-R1 loaded");
  assert.ok(q1.tags.includes("qa-tdd"));
  assert.match(q1.text, /divides by zero on a Monday/);
  assert.ok(runs.find((x) => x.tags.includes("PM-R1")).tags.includes("staff-pm"));
  for (const x of docs) assert.ok(typeof x.id === "string" && x.id && typeof x.text === "string");
});

test("AMEM-2 loadMemory builds one miss doc per eval case, id is the case folder name", () => {
  const miss = loadMemory(full()).filter((x) => x.source === "miss");
  assert.deepEqual(miss.map((x) => x.id).sort(), ["qa-tdd-miss-name-denylist-case", "staff-pm-miss-rollback"]);
  assert.match(miss.find((x) => x.id.startsWith("qa-tdd-")).text, /denylist match is case sensitive/);
});

test("AMEM-3 a malformed or missing agentrun block is skipped, its findings are not indexed", () => {
  const docs = loadMemory(full());
  assert.ok(!docs.some((x) => (x.tags || []).includes("QA-R9") || /malformed block/.test(x.text)));
  const noBlock = repo({ runs: { "notes.md": "# notes\nQA-R4 | P1 | x | a finding with no run block at all | none\n" } });
  assert.equal(loadMemory(noBlock).length, 0);
});

test("AMEM-4 an empty root (no docs/runs, no evals) loads nothing and the CLI says no matches", () => {
  const d = mkdtempSync(join(tmpdir(), "amem-empty-"));
  assert.deepEqual(loadMemory(d), []);
  const r = cli("anything", "--root", d);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no matches/);
  assert.equal(loadMemory(repo()).length, 0); // docs/runs exists but is empty
});

test("AMEM-5 CLI ranks results and prints score, source, id, snippet per line", () => {
  const r = cli("Monday", "divides", "zero", "--root", full());
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split("\n");
  assert.match(lines[0], /^\d+(\.\d+)?\s+run\s+\S*QA-R1\S*\s+.*divides by zero/);
});

test("AMEM-6 a query word equal to a QA-R id adds a tag bonus", () => {
  const d = repo({ runs: {
    "2026-11-22-qa-tdd.md": `# r\n\n${block("qa-tdd", "red", 2)}\n\nQA-R1 | P2 | a | label missing on small screen | none\nQA-R2 | P2 | b | label missing on small screen | none\n`,
  } });
  const r = cli("qa-r2", "label", "missing", "--root", d, "--json");
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.match(out[0].id, /QA-R2/);
  assert.ok(out[0].score > out[1].score);
});

test("AMEM-7 --agent filters run docs by agent field and miss docs by case-name prefix", () => {
  const d = full();
  const qa = JSON.parse(cli("empty", "rollback", "denylist", "Monday", "--root", d, "--agent", "qa-tdd", "--json").stdout);
  assert.ok(qa.length >= 1);
  assert.ok(qa.every((x) => !/PM-R1|staff-pm/.test(x.id)), "no staff-pm docs");
  assert.ok(qa.some((x) => x.source === "miss" && x.id === "qa-tdd-miss-name-denylist-case"));
  const pm = JSON.parse(cli("empty", "rollback", "denylist", "Monday", "--root", d, "--agent", "staff-pm", "--json").stdout);
  assert.ok(pm.length >= 1);
  assert.ok(pm.every((x) => !/QA-R|qa-tdd/.test(x.id)), "no qa-tdd docs");
  assert.ok(pm.some((x) => x.id === "staff-pm-miss-rollback"));
});

test("AMEM-8 --json prints an array of {id, source, score, snippet} and --limit caps it", () => {
  const d = full();
  const r = cli("the", "scope", "label", "divides", "denylist", "rollback", "--root", d, "--json", "--limit", "2");
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.ok(Array.isArray(out) && out.length >= 1 && out.length <= 2);
  for (const k of ["id", "source", "score", "snippet"]) assert.ok(k in out[0], k);
  assert.ok(["run", "miss"].includes(out[0].source));
  assert.equal(typeof out[0].score, "number");
});

test("AMEM-9 a query with no match prints no matches and exits 0", () => {
  const r = cli("zzzqqq", "--root", full());
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no matches/);
});

test("AMEM-10 usage errors exit 2: no words, bad --limit, unknown flag, bad --agent, missing flag value", () => {
  const d = full();
  assert.equal(cli("--root", d).status, 2);
  assert.equal(cli().status, 2);
  assert.equal(cli("q", "--root", d, "--limit", "0").status, 2);
  assert.equal(cli("q", "--root", d, "--limit", "-1").status, 2);
  assert.equal(cli("q", "--root", d, "--limit", "x").status, 2);
  assert.equal(cli("q", "--root", d, "--nope").status, 2);
  assert.equal(cli("q", "--root", d, "--agent", "engineer").status, 2);
  assert.equal(cli("q", "--root", d, "--agent").status, 2);
  assert.equal(cli("q", "--root").status, 2);
});

test("AMEM-11 dedupe returns the best near-duplicate doc at or above the threshold", () => {
  const docs = loadMemory(full());
  const hit = dedupe("Divides by zero on a Monday so the demo shows Infinity", docs);
  assert.ok(hit, "a near-duplicate is found");
  assert.ok(hit.tags.includes("QA-R1"));
  const stricter = dedupe("Divides by zero on a Monday so the demo shows Infinity", docs, 0.99);
  assert.equal(stricter, null);
});

test("AMEM-12 dedupe returns null for a new finding, for no docs and for empty text", () => {
  const docs = loadMemory(full());
  assert.equal(dedupe("Checkout total is hidden behind the keyboard on iPhone", docs), null);
  assert.equal(dedupe("anything at all", []), null);
  assert.equal(dedupe("", docs), null);
});

test("AMEM-13 dedupe picks the closest of several candidates", () => {
  const docs = [
    { id: "far", source: "run", text: "export button label is missing", tags: [] },
    { id: "near", source: "run", text: "export button label is missing on the small screen layout", tags: [] },
  ];
  assert.equal(dedupe("export button label is missing on the small screen layout", docs).id, "near");
});

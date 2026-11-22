// AGRUN-1..22: tools/check-agent-run.mjs, one run-log shape for every studio agent (qa-tdd, staff-pm and any
// later one): who ran, on what, with which tools, what it concluded and what it cost, checkable by a script.
// Modeled on tools/check-ux-run.mjs; reuses LEAKS from tools/check-story-entry.mjs and the same real-date check.
// Run: node --test tests/check-agent-run.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tool = join(root, "tools", "check-agent-run.mjs");
const mod = await import(pathToFileURL(tool).href).catch((e) => ({ __missing: e.message }));
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });
const dir = mkdtempSync(join(tmpdir(), "agrun-"));
let n = 0;
const file = (text) => { const p = join(dir, `run-${++n}.md`); writeFileSync(p, text); return p; };

const check = (text) => {
  assert.equal(typeof mod.checkAgentRun, "function", `tools/check-agent-run.mjs must export checkAgentRun() (${mod.__missing ?? "not exported"})`);
  const r = mod.checkAgentRun(text);
  assert.ok(r && Array.isArray(r.errors), "checkAgentRun must return { run, errors: [] }");
  return r;
};
const ok = (text, why = "") => { const r = check(text); assert.deepEqual(r.errors, [], `expected valid ${why}`); return r.run; };
// invalid: at least one error, and some error names `re` (the rule) so the reason is readable.
const bad = (text, re) => {
  const r = check(text);
  assert.ok(r.errors.length > 0, `expected an error matching ${re}, got none`);
  assert.ok(r.errors.some((e) => re.test(e)), `no error matches ${re}: ${JSON.stringify(r.errors)}`);
  return r;
};

const wrap = (body, pre = "# Run log\n\n", post = "\n") => `${pre}\`\`\`agentrun\n${body}\n\`\`\`${post}`;
const base = {
  "qa-tdd": [
    "date: 2026-11-22", "agent: qa-tdd", "product: Example App", "tier: supervised", "model: example-model-1",
    "tokens: 48211", "cost_usd: 0.73", "input: failing tests for the share sheet (SHARE-3)",
    "tool: Bash | ok | ran npm test 3x", "tool: Write | ok | tests/share.test.mjs",
    "verdict: red", "findings: 2", "p0: 0", "artifact: reports/qa/2026-11-22-share.md",
    "escalated: no", "retries: 1",
  ],
  "staff-pm": [
    "date: 2026-11-22", "agent: staff-pm", "product: Example App", "tier: advisory", "model: example-model-1",
    "tokens: 12000", "cost_usd: 0.2", "input: scope milestone M2.1",
    "tool: Read | ok | PLAN.md", "verdict: needs-decision", "findings: 1", "p0: 0",
    "escalated: yes", "escalation_reason: Chase picks between two scopes",
  ],
  engineer: [
    "date: 2026-11-22", "agent: engineer", "product: Example App", "tier: full", "model: example-model-1",
    "tokens: 0", "cost_usd: 0", "input: make tests/share.test.mjs pass",
    "verdict: done", "findings: 0", "p0: 0", "escalated: no",
  ],
};
// edit a base run: set (replace or append) or drop keys. Keys compared case-insensitively.
const edit = (agent, { set = {}, drop = [], add = [] } = {}) => {
  const keyOf = (l) => l.split(":")[0].trim().toLowerCase();
  let lines = base[agent].filter((l) => !drop.includes(keyOf(l)));
  for (const [k, v] of Object.entries(set)) {
    const i = lines.findIndex((l) => keyOf(l) === k);
    if (i >= 0) lines[i] = `${k}: ${v}`; else lines.push(`${k}: ${v}`);
  }
  return wrap([...lines, ...add].join("\n"));
};

test("AGRUN-1 exports checkAgentRun; a valid qa-tdd run parses to the full run shape", () => {
  const run = ok(edit("qa-tdd"), "qa-tdd");
  assert.deepEqual(run, {
    date: "2026-11-22", agent: "qa-tdd", product: "Example App", tier: "supervised", model: "example-model-1",
    tokens: 48211, cost_usd: 0.73, input: "failing tests for the share sheet (SHARE-3)",
    tools: [
      { name: "Bash", status: "ok", note: "ran npm test 3x" },
      { name: "Write", status: "ok", note: "tests/share.test.mjs" },
    ],
    verdict: "red", findings: 2, p0: 0, artifact: "reports/qa/2026-11-22-share.md",
    escalated: "no", escalation_reason: null, retries: 1,
  });
});

test("AGRUN-2 a valid staff-pm run (escalated with a reason) and a valid other-agent run (no tools, zero cost)", () => {
  const pm = ok(edit("staff-pm"), "staff-pm");
  assert.equal(pm.agent, "staff-pm");
  assert.equal(pm.escalation_reason, "Chase picks between two scopes");
  assert.equal(pm.artifact, null, "artifact is optional: null when absent");
  assert.equal(pm.retries, null, "retries is optional: null when absent");
  const eng = ok(edit("engineer"), "engineer");
  assert.deepEqual(eng.tools, [], "tool lines are optional");
  assert.equal(eng.tokens, 0);
  assert.equal(eng.cost_usd, 0);
  assert.equal(eng.verdict, "done");
});

test("AGRUN-3 block count: zero, two or an unclosed ```agentrun block is an error", () => {
  bad("# Run log\n\nno block here\n", /agentrun/i);
  bad(edit("qa-tdd") + "\n" + edit("qa-tdd"), /agentrun/i);
  bad("# Run log\n\n```agentrun\n" + base["qa-tdd"].join("\n") + "\n", /unclosed/i);
  bad(wrap(base["qa-tdd"].join("\n")).replace("```agentrun", "```uxrun"), /agentrun/i);
});

test("AGRUN-4 unknown keys are errors (and the reason names the line)", () => {
  bad(edit("qa-tdd", { add: ["mood: great"] }), /mood/);
  bad(edit("qa-tdd", { add: ["finding: QA-R1 | P1 | x | y"] }), /finding/);
  bad(edit("qa-tdd", { add: ["just some text"] }), /just some text/);
});

test("AGRUN-5 keys are case-insensitive; CRLF line endings are accepted", () => {
  const upper = edit("qa-tdd").replace("date:", "DATE:").replace("verdict:", "Verdict:").replace("tool: Bash", "Tool: Bash");
  const run = ok(upper, "with uppercase keys");
  assert.equal(run.date, "2026-11-22");
  assert.equal(run.verdict, "red");
  assert.equal(run.tools.length, 2);
  const crlf = ok(edit("staff-pm").replace(/\n/g, "\r\n"), "with CRLF");
  assert.equal(crlf.escalation_reason, "Chase picks between two scopes", "no trailing \\r in values");
  assert.equal(crlf.product, "Example App");
});

test("AGRUN-6 every required key: missing is an error, empty is an error", () => {
  const required = ["date", "agent", "product", "tier", "model", "tokens", "cost_usd", "input", "verdict", "findings", "p0", "escalated"];
  for (const k of required) {
    bad(edit("qa-tdd", { drop: [k] }), new RegExp(k));
    bad(edit("qa-tdd", { set: { [k]: "" } }), new RegExp(k));
  }
});

test("AGRUN-7 single-value keys appear once: a duplicate is an error", () => {
  for (const k of ["date", "agent", "product", "tier", "model", "tokens", "cost_usd", "input", "verdict", "findings", "p0", "artifact", "escalated", "retries"]) {
    const line = base["qa-tdd"].find((l) => l.startsWith(`${k}:`));
    bad(edit("qa-tdd", { add: [line] }), new RegExp(`duplicate.*${k}|${k}.*(once|duplicate)`, "i"));
  }
  bad(edit("staff-pm", { add: ["escalation_reason: again"] }), /escalation_reason/);
});

test("AGRUN-8 date: a real YYYY-MM-DD only (leap days, month 13, other formats)", () => {
  ok(edit("qa-tdd", { set: { date: "2028-02-29" } }), "leap day");
  ok(edit("qa-tdd", { set: { date: "2026-12-31" } }), "last day of year");
  ok(edit("qa-tdd", { set: { date: "2026-01-01" } }), "first day of year");
  for (const d of ["2026-02-29", "2026-13-01", "2026-00-10", "2026-04-31", "11/22/2026", "2026-11-22T10:00:00Z", "2026-1-2"]) bad(edit("qa-tdd", { set: { date: d } }), /date/);
});

test("AGRUN-9 agent: one of the ten studio agents", () => {
  for (const a of ["qa-tdd", "staff-pm", "engineer", "ux-reviewer", "privacy-security", "architect", "positioning", "release-captain", "story-keeper", "orchestrator"]) {
    const verdict = { "qa-tdd": "red", "staff-pm": "ready", "ux-reviewer": "Needs changes" }[a] ?? "done";
    ok(edit("engineer", { set: { agent: a, verdict } }), `agent ${a}`);
  }
  for (const a of ["general-purpose", "qa", "focus-coach", "QA-TDD x"]) bad(edit("engineer", { set: { agent: a } }), /agent/);
});

test("AGRUN-10 tier: advisory, supervised or full", () => {
  for (const t of ["advisory", "supervised", "full"]) ok(edit("engineer", { set: { tier: t } }), t);
  for (const t of ["auto", "Full!", "none"]) bad(edit("engineer", { set: { tier: t } }), /tier/);
});

test("AGRUN-11 tokens: a non-negative integer; cost_usd: a non-negative number", () => {
  for (const v of ["-1", "1.5", "abc", "1e3", "12,000"]) bad(edit("engineer", { set: { tokens: v } }), /tokens/);
  for (const v of ["0.25", "3", "0.0"]) ok(edit("engineer", { set: { cost_usd: v } }), `cost ${v}`);
  for (const v of ["-0.1", "$1", "abc", "1."]) bad(edit("engineer", { set: { cost_usd: v } }), /cost_usd/);
});

test("AGRUN-12 tool: <name> | ok or failed | <note>, all three non-empty, name without spaces; zero or more", () => {
  const run = ok(edit("engineer", { add: ["tool: Bash | failed | npm test exited 1", "tool: mcp__github__get_me | ok | who am I"] }), "two tools");
  assert.deepEqual(run.tools, [
    { name: "Bash", status: "failed", note: "npm test exited 1" },
    { name: "mcp__github__get_me", status: "ok", note: "who am I" },
  ]);
  bad(edit("engineer", { add: ["tool: Bash | ok"] }), /tool/);
  bad(edit("engineer", { add: ["tool: Bash | ok | note | extra"] }), /tool/);
  bad(edit("engineer", { add: ["tool: Bash | ok | "] }), /tool/);
  bad(edit("engineer", { add: ["tool:  | ok | ran it"] }), /tool/);
  bad(edit("engineer", { add: ["tool: Bash | maybe | ran it"] }), /tool|ok|failed/);
  bad(edit("engineer", { add: ["tool: Web Fetch | ok | got page"] }), /tool|space/i);
  bad(edit("engineer", { add: ["tool: Bash | failed |"] }), /tool|note/);
});

test("AGRUN-13 verdict by agent: qa-tdd green|red|flaky|blocked", () => {
  for (const v of ["green", "red", "flaky"]) ok(edit("qa-tdd", { set: { verdict: v } }), `qa-tdd ${v}`);
  ok(edit("qa-tdd", { set: { verdict: "blocked", escalated: "yes", escalation_reason: "no device" } }), "qa-tdd blocked");
  for (const v of ["ready", "Ready", "pass", "Green"]) bad(edit("qa-tdd", { set: { verdict: v } }), /verdict/);
});

test("AGRUN-14 verdict by agent: staff-pm ready|needs-decision|blocked|cut", () => {
  for (const v of ["ready", "needs-decision", "cut"]) ok(edit("staff-pm", { set: { verdict: v } }), `staff-pm ${v}`);
  ok(edit("staff-pm", { set: { verdict: "blocked" } }), "staff-pm blocked (escalated yes in base)");
  for (const v of ["green", "Ready", "needs decision", "done"]) bad(edit("staff-pm", { set: { verdict: v } }), /verdict/);
});

test("AGRUN-15 verdict by agent: ux-reviewer Ready|Needs changes|Blocker; other agents any non-empty word", () => {
  for (const v of ["Ready", "Needs changes", "Blocker"]) ok(edit("engineer", { set: { agent: "ux-reviewer", verdict: v } }), `ux ${v}`);
  for (const v of ["ready", "green", "Needs Changes"]) bad(edit("engineer", { set: { agent: "ux-reviewer", verdict: v } }), /verdict/);
  for (const v of ["shipped", "done", "anything"]) ok(edit("engineer", { set: { agent: "architect", verdict: v } }), `architect ${v}`);
});

test("AGRUN-16 findings and p0: non-negative integers, p0 <= findings", () => {
  ok(edit("engineer", { set: { findings: "3", p0: "3" } }), "p0 == findings");
  ok(edit("engineer", { set: { findings: "0", p0: "0" } }), "zero");
  for (const v of ["-1", "1.5", "two"]) bad(edit("engineer", { set: { findings: v } }), /findings/);
  for (const v of ["-1", "0.5", "x"]) bad(edit("engineer", { set: { p0: v } }), /p0/);
  bad(edit("engineer", { set: { findings: "1", p0: "2" } }), /p0/);
});

test("AGRUN-17 artifact: repo-relative path, no leading slash, no .. segments; at most one", () => {
  ok(edit("engineer", { set: { artifact: "reports/v1..2.md" } }), "dots inside a name are not a .. segment");
  ok(edit("engineer", { set: { artifact: "a.md" } }), "single file");
  for (const v of ["/tmp/report.md", "../other/report.md", "reports/../../etc/passwd", "reports/..", ".."]) bad(edit("engineer", { set: { artifact: v } }), /artifact/);
  bad(edit("engineer", { set: { artifact: "" } }), /artifact/);
});

test("AGRUN-18 escalated: yes|no; escalation_reason required with yes, an error with no", () => {
  for (const v of ["maybe", "Y", "true"]) bad(edit("engineer", { set: { escalated: v } }), /escalated/);
  bad(edit("staff-pm", { drop: ["escalation_reason"] }), /escalation_reason/);
  bad(edit("staff-pm", { set: { escalation_reason: "" } }), /escalation_reason/);
  bad(edit("engineer", { add: ["escalation_reason: not escalated but says why"] }), /escalation_reason/);
});

test("AGRUN-19 retries: optional non-negative integer", () => {
  assert.equal(ok(edit("engineer", { set: { retries: "0" } })).retries, 0);
  assert.equal(ok(edit("engineer", { set: { retries: "2" } })).retries, 2);
  for (const v of ["-1", "1.5", "many", ""]) bad(edit("engineer", { set: { retries: v } }), /retries/);
});

test("AGRUN-20 cross rules: qa-tdd green needs p0 0; any blocked verdict needs escalated yes", () => {
  ok(edit("qa-tdd", { set: { verdict: "green", p0: "0", findings: "2" } }), "green with P1/P2 findings only");
  bad(edit("qa-tdd", { set: { verdict: "green", findings: "1", p0: "1" } }), /p0|green/i);
  bad(edit("qa-tdd", { set: { verdict: "blocked" } }), /blocked|escalat/i);
  bad(edit("staff-pm", { set: { verdict: "blocked", escalated: "no" }, drop: ["escalation_reason"] }), /blocked|escalat/i);
  bad(edit("engineer", { set: { verdict: "blocked" } }), /blocked|escalat/i);
  ok(edit("engineer", { set: { verdict: "green", p0: "1", findings: "1" } }), "the p0 rule is qa-tdd only");
});

test("AGRUN-21 leak scan on the whole file, inside and outside the block, message never echoes the value", () => {
  const body = "A1b2C3d4E5f6G7h8";
  const leaks = [
    ["someone" + "@example.com", /email/i],
    ["call 304-555-0142", /phone/i],
    ["https://claude" + ".ai/code/abc", /claude\.ai/i],
    ["trig" + "_" + body, /trig_/],
    ["env" + "_" + body, /env_/],
    ["cmsg" + "_" + body, /cmsg_/],
    ["session" + "_" + body, /session_/],
    ["sk" + "-" + body, /key/i],
    ["ghp" + "_" + body, /key/i],
  ];
  for (const [v, re] of leaks) {
    const outside = bad(edit("engineer") + `\nnote: ${v}\n`, re);
    assert.ok(outside.errors.every((e) => !e.includes(v)), `error echoes the secret: ${outside.errors}`);
    bad(edit("engineer", { set: { input: `see ${v}` } }), re);
  }
});

test("AGRUN-22 CLI: exit 0 valid, 1 with one reason per line on stderr, 2 on usage or unreadable file; --json prints the run", () => {
  const good = file(edit("qa-tdd"));
  const g = cli(good);
  assert.equal(g.status, 0, `exit ${g.status}\n${g.stderr}`);
  assert.equal(g.stderr, "");
  const j = cli(good, "--json");
  assert.equal(j.status, 0, j.stderr);
  const run = JSON.parse(j.stdout);
  assert.equal(run.agent, "qa-tdd");
  assert.equal(run.tokens, 48211);
  assert.equal(run.tools.length, 2);
  const j2 = cli("--json", good);
  assert.equal(j2.status, 0, "--json may come first");
  assert.deepEqual(JSON.parse(j2.stdout), run);

  const two = file(edit("qa-tdd", { set: { tier: "auto", cost_usd: "-1" } }));
  const b = cli(two);
  assert.equal(b.status, 1, `exit ${b.status}`);
  const lines = b.stderr.split("\n").filter(Boolean);
  assert.ok(lines.length >= 2, `want one reason per line, got:\n${b.stderr}`);
  assert.ok(lines.some((l) => /tier/.test(l)) && lines.some((l) => /cost_usd/.test(l)), b.stderr);

  assert.equal(cli().status, 2, "no file");
  assert.equal(cli(good, good).status, 2, "two files");
  assert.equal(cli(join(dir, "no-such-run.md")).status, 2, "unreadable file");
  assert.equal(cli("--bogus").status, 2, "unknown flag only");
});

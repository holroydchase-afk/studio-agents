// STAMP: tests for tools/stamp-run.mjs, a wrapper the CALLER runs (never the agent being measured) that writes
// facts the agent cannot edit into its run log: token sums from the subagent transcript, the commit, a test count.
// Usage: node tools/stamp-run.mjs <run.md> --transcript <subagent.jsonl> [--sha REF] [--test CMD] [--prices prices.json]
// Exit 0 stamped; 1 transcript unreadable or no usage found (run.md untouched); 2 usage error.
// Also covers check-agent-run.mjs accepting `stamped`/`stamp_*` keys (STAMP-9..11).
// Run: node --test tests/stamp-run.test.mjs
// Formats these tests fix (the spec was silent): transcript lines are {"type":"assistant","message":{"id","usage":{...}}};
// stamp_test is "<command> | <pass>/<fail>"; stamp_prices is "<source> <as_of>"; cost_usd is a plain number.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAgentRun } from "../tools/check-agent-run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "stamp-run.mjs");
const checker = join(here, "..", "tools", "check-agent-run.mjs");
// Errors that only say "unknown key" do not count: the checker must know the stamp_ keys and judge their values.
const real = (errors) => errors.filter((e) => !/not a known key/.test(e));
const SHA40 = /^[0-9a-f]{40}$/;

const work = () => mkdtempSync(join(tmpdir(), "stamp-"));
const git = (cwd, ...a) => spawnSync("git", a, { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" } });
function gitRepo() {
  const d = work();
  git(d, "init", "-q");
  writeFileSync(join(d, "a.txt"), "one");
  git(d, "add", ".");
  git(d, "commit", "-q", "-m", "one");
  const first = git(d, "rev-parse", "HEAD").stdout.trim();
  writeFileSync(join(d, "a.txt"), "two");
  git(d, "commit", "-q", "-am", "two");
  git(d, "tag", "v-first", first);
  return { dir: d, first, head: git(d, "rev-parse", "HEAD").stdout.trim() };
}

const runMd = (extra = "", { tokens = 0, escalated = "yes" } = {}) => `# qa-tdd run: example

\`\`\`agentrun
date: 2026-11-22
agent: qa-tdd
product: Example App
tier: supervised
model: example-model-1
tokens: ${tokens}
cost_usd: 0
input: a task
verdict: red
findings: 1
p0: 0
escalated: ${escalated}
${escalated === "yes" ? "escalation_reason: harness showed no token or cost count\n" : ""}${extra}\`\`\`
`;

const rec = (id, u, type = "assistant") => JSON.stringify({ type, message: { id, usage: u } });
const U = (i, o, cc, cr) => ({ input_tokens: i, output_tokens: o, cache_creation_input_tokens: cc, cache_read_input_tokens: cr });

function setup({ md = runMd(), lines, cwd } = {}) {
  const d = cwd ?? work();
  const run = join(d, "run.md");
  const tr = join(d, "sub.jsonl");
  writeFileSync(run, md);
  writeFileSync(tr, (lines ?? [rec("m1", U(100, 50, 10, 1000))]).join("\n") + "\n");
  return { d, run, tr };
}
const stamp = (args, cwd) => (assert.ok(existsSync(tool), "tools/stamp-run.mjs does not exist yet"), spawnSync("node", [tool, ...args], { encoding: "utf8", cwd }));
const lines = (md, key) => md.split("\n").filter((l) => new RegExp(`^${key}:`, "i").test(l.trim()));
const val = (md, key) => (lines(md, key)[0] || "").replace(/^[^:]+:\s*/, "").trim();

test("STAMP-1 sums the four usage counts, writes tokens and the stamp_ lines, exits 0", () => {
  const { run, tr } = setup({ lines: [rec("m1", U(100, 50, 10, 1000)), rec("m2", U(20, 5, 0, 2000))] });
  const r = stamp([run, "--transcript", tr]);
  assert.equal(r.status, 0, r.stderr);
  const md = readFileSync(run, "utf8");
  assert.equal(val(md, "stamped"), "yes");
  assert.equal(val(md, "stamp_input"), "120");
  assert.equal(val(md, "stamp_output"), "55");
  assert.equal(val(md, "stamp_cache_creation"), "10");
  assert.equal(val(md, "stamp_cache_read"), "3000");
  assert.equal(val(md, "tokens"), String(120 + 55 + 10 + 3000));
  assert.equal(lines(md, "tokens").length, 1, "tokens must not be duplicated");
});

test("STAMP-2 deduplicates by message.id, using the last record for that id", () => {
  const { run, tr } = setup({
    lines: [rec("m1", U(10, 1, 0, 0)), rec("m1", U(10, 1, 0, 0)), rec("m1", U(100, 40, 5, 500)), rec("m2", U(7, 3, 0, 0)), rec("m2", U(7, 3, 0, 0))],
  });
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  const md = readFileSync(run, "utf8");
  assert.equal(val(md, "stamp_input"), "107");
  assert.equal(val(md, "stamp_output"), "43");
  assert.equal(val(md, "stamp_cache_creation"), "5");
  assert.equal(val(md, "stamp_cache_read"), "500");
  assert.equal(val(md, "tokens"), String(107 + 43 + 5 + 500));
});

test("STAMP-3 ignores malformed lines, lines without usage and non-assistant lines", () => {
  const { run, tr } = setup({
    lines: ["{not json", "", "null", JSON.stringify({ type: "assistant", message: { id: "x", content: "no usage" } }),
      rec("u1", U(9999, 9999, 9999, 9999), "user"), rec("m1", U(1, 2, 3, 4)), "[1,2", JSON.stringify({ type: "summary" })],
  });
  const r = stamp([run, "--transcript", tr]);
  assert.equal(r.status, 0, r.stderr);
  const md = readFileSync(run, "utf8");
  assert.equal(val(md, "tokens"), "10");
  assert.equal(val(md, "stamp_input"), "1");
});

test("STAMP-3b a usage record missing a cache field counts that field as 0", () => {
  const { run, tr } = setup({ lines: [JSON.stringify({ type: "assistant", message: { id: "m1", usage: { input_tokens: 5, output_tokens: 6 } } })] });
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  const md = readFileSync(run, "utf8");
  assert.equal(val(md, "stamp_cache_creation"), "0");
  assert.equal(val(md, "stamp_cache_read"), "0");
  assert.equal(val(md, "tokens"), "11");
});

test("STAMP-4 no usage found: exit 1 and run.md untouched", () => {
  const { run, tr } = setup({ lines: ["garbage", JSON.stringify({ type: "assistant", message: { id: "a" } })] });
  const before = readFileSync(run, "utf8");
  const r = stamp([run, "--transcript", tr]);
  assert.equal(r.status, 1, r.stderr);
  assert.equal(readFileSync(run, "utf8"), before);
});

test("STAMP-4b unreadable transcript: exit 1 and run.md untouched", () => {
  const { d, run } = setup();
  const before = readFileSync(run, "utf8");
  const r = stamp([run, "--transcript", join(d, "missing.jsonl")]);
  assert.equal(r.status, 1, r.stderr);
  assert.equal(readFileSync(run, "utf8"), before);
});

test("STAMP-5 re-stamping is idempotent: stamp_ lines replaced, never duplicated", () => {
  const { run, tr } = setup();
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  const once = readFileSync(run, "utf8");
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  assert.equal(readFileSync(run, "utf8"), once, "second stamp with the same inputs changes nothing");
  assert.equal(lines(once, "stamped").length, 1);
  assert.equal(lines(once, "stamp_sha").length, 1);
  assert.equal(lines(once, "stamp_input").length, 1);
  // a changed transcript replaces the values
  writeFileSync(tr, rec("m9", U(1, 1, 1, 1)) + "\n");
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  const md = readFileSync(run, "utf8");
  assert.equal(val(md, "tokens"), "4");
  assert.equal(lines(md, "stamp_input").length, 1);
  assert.equal(lines(md, "tokens").length, 1);
});

test("STAMP-5b re-stamp without --prices drops an earlier stamp_prices line", () => {
  const { d, run, tr } = setup();
  const prices = join(d, "prices.json");
  writeFileSync(prices, JSON.stringify({ model: "m", input_per_mtok: 3, output_per_mtok: 15, cache_creation_per_mtok: 3.75, cache_read_per_mtok: 0.3, source: "vendor-page", as_of: "2026-11-01" }));
  assert.equal(stamp([run, "--transcript", tr, "--prices", prices]).status, 0);
  assert.equal(lines(readFileSync(run, "utf8"), "stamp_prices").length, 1);
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  const md = readFileSync(run, "utf8");
  assert.equal(lines(md, "stamp_prices").length, 0);
  assert.equal(val(md, "stamp_cost"), "not measured");
});

test("STAMP-6 --prices computes cost_usd to 4 decimals and records stamp_prices", () => {
  const { d, run, tr } = setup({ lines: [rec("m1", U(2000, 1000, 400, 6000))] });
  const prices = join(d, "prices.json");
  writeFileSync(prices, JSON.stringify({ model: "example-model-1", input_per_mtok: 3, output_per_mtok: 15, cache_creation_per_mtok: 3.75, cache_read_per_mtok: 0.3, source: "vendor-page", as_of: "2026-11-01" }));
  const r = stamp([run, "--transcript", tr, "--prices", prices]);
  assert.equal(r.status, 0, r.stderr);
  const md = readFileSync(run, "utf8");
  // 2000*3 + 1000*15 + 400*3.75 + 6000*0.3 = 24300 per million = 0.0243
  assert.equal(Number(val(md, "cost_usd")), 0.0243);
  assert.match(val(md, "cost_usd"), /^\d+(\.\d{1,4})?$/);
  assert.equal(val(md, "stamp_prices"), "vendor-page 2026-11-01");
  assert.equal(lines(md, "stamp_cost").length, 0, "priced runs have no 'not measured' line");
  assert.equal(lines(md, "cost_usd").length, 1);
});

test("STAMP-6b without --prices cost_usd is left as is and stamp_cost: not measured is added", () => {
  const { run, tr } = setup({ md: runMd("").replace("cost_usd: 0", "cost_usd: 0.42") });
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  const md = readFileSync(run, "utf8");
  assert.equal(val(md, "cost_usd"), "0.42");
  assert.equal(val(md, "stamp_cost"), "not measured");
  assert.equal(lines(md, "stamp_prices").length, 0);
});

test("STAMP-7 --sha resolves a ref to 40 hex; default is HEAD", () => {
  const g = gitRepo();
  const a = setup({ cwd: g.dir });
  assert.equal(stamp([a.run, "--transcript", a.tr], g.dir).status, 0);
  const def = val(readFileSync(a.run, "utf8"), "stamp_sha");
  assert.match(def, SHA40);
  assert.equal(def, g.head);
  assert.equal(stamp([a.run, "--transcript", a.tr, "--sha", "v-first"], g.dir).status, 0);
  assert.equal(val(readFileSync(a.run, "utf8"), "stamp_sha"), g.first);
});

test("STAMP-7b an unresolvable --sha is a failure and leaves run.md untouched", () => {
  const g = gitRepo();
  const a = setup({ cwd: g.dir });
  const before = readFileSync(a.run, "utf8");
  const r = stamp([a.run, "--transcript", a.tr, "--sha", "no-such-ref"], g.dir);
  assert.notEqual(r.status, 0);
  assert.equal(readFileSync(a.run, "utf8"), before);
});

test("STAMP-8 --test runs once, records the command and pass/fail counts, and never echoes its output", () => {
  const g = gitRepo();
  const a = setup({ cwd: g.dir });
  const counter = join(g.dir, "count.txt");
  writeFileSync(counter, "");
  const script = join(g.dir, "fake-suite.mjs");
  writeFileSync(script, `import {appendFileSync} from "node:fs"; appendFileSync(${JSON.stringify(counter)}, "x");
console.log("SECRET-PROMPT-TEXT-9183"); console.error("SECRET-PROMPT-TEXT-9183"); console.log("# pass 7"); console.log("# fail 2"); process.exit(1);`);
  const cmd = `node ${script}`;
  const r = stamp([a.run, "--transcript", a.tr, "--test", cmd], g.dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(counter, "utf8"), "x", "the test command runs exactly once");
  assert.ok(!r.stdout.includes("SECRET-PROMPT-TEXT-9183") && !r.stderr.includes("SECRET-PROMPT-TEXT-9183"), "output is never echoed");
  const md = readFileSync(a.run, "utf8");
  assert.ok(!md.includes("SECRET-PROMPT-TEXT-9183"), "output is never stored");
  const [c, counts] = val(md, "stamp_test").split("|").map((s) => s.trim());
  assert.equal(c, cmd);
  assert.equal(counts, "7/2");
  assert.equal(lines(md, "stamp_test").length, 1);
});

test("STAMP-8b without --test there is no stamp_test line", () => {
  const { run, tr } = setup();
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  assert.equal(lines(readFileSync(run, "utf8"), "stamp_test").length, 0);
});

test("STAMP-8c a --test with no parseable counts is recorded as unknown, not invented", () => {
  const { run, tr } = setup();
  assert.equal(stamp([run, "--transcript", tr, "--test", "echo hello"]).status, 0);
  assert.doesNotMatch(val(readFileSync(run, "utf8"), "stamp_test"), /\|\s*\d+\/\d+\s*$/);
});

// check-agent-run.mjs acceptance (the engineer must extend it: QA-R1)
const stampedExtra = (o = {}) => {
  const k = { stamped: "yes", stamp_input: "100", stamp_output: "50", stamp_cache_creation: "10", stamp_cache_read: "840", stamp_sha: "a".repeat(40), stamp_cost: "not measured", ...o };
  return Object.entries(k).filter(([, v]) => v !== null).map(([a, b]) => `${a}: ${b}\n`).join("");
};

test("STAMP-9 check-agent-run accepts a stamped block (tokens = sum, no escalation needed)", () => {
  const { errors } = checkAgentRun(runMd(stampedExtra(), { tokens: 1000, escalated: "no" }));
  assert.deepEqual(errors, []);
});

test("STAMP-9b check-agent-run accepts stamp_test, stamp_prices and stamp_cost lines", () => {
  const extra = stampedExtra({ stamp_cost: null }) + "stamp_test: node --test | 9/0\nstamp_prices: vendor-page 2026-11-01\n";
  assert.deepEqual(checkAgentRun(runMd(extra, { tokens: 1000, escalated: "no" })).errors, []);
});

test("STAMP-10 check-agent-run rejects stamped: yes without stamp_sha", () => {
  const { errors } = checkAgentRun(runMd(stampedExtra({ stamp_sha: null }), { tokens: 1000, escalated: "no" }));
  assert.ok(real(errors).some((e) => /stamp_sha/.test(e)), errors.join("\n") || "no errors");
});

test("STAMP-10b check-agent-run rejects a stamp_sha that is not 40 hex", () => {
  const { errors } = checkAgentRun(runMd(stampedExtra({ stamp_sha: "abc123" }), { tokens: 1000, escalated: "no" }));
  assert.ok(real(errors).some((e) => /stamp_sha/.test(e)), errors.join("\n") || "no errors");
});

test("STAMP-11 check-agent-run rejects tokens that differ from the sum of the four stamp counts", () => {
  const { errors } = checkAgentRun(runMd(stampedExtra(), { tokens: 999, escalated: "no" }));
  assert.ok(real(errors).some((e) => /tokens/.test(e) && /(stamp|sum)/i.test(e)), errors.join("\n") || "no errors");
});

test("STAMP-11b check-agent-run rejects a stamp count that is not a whole number", () => {
  const { errors } = checkAgentRun(runMd(stampedExtra({ stamp_input: "many" }), { tokens: 1000, escalated: "no" }));
  assert.ok(real(errors).some((e) => /stamp_input/.test(e)), errors.join("\n") || "no errors");
});

test("STAMP-11c an unstamped block is unchanged: existing keys still pass, an unknown stamp_ key alone is not enough", () => {
  assert.deepEqual(checkAgentRun(runMd()).errors, []);
});

test("STAMP-12 a freshly stamped file passes check-agent-run end to end", () => {
  const g = gitRepo();
  const a = setup({ cwd: g.dir, lines: [rec("m1", U(100, 50, 10, 840))] });
  assert.equal(stamp([a.run, "--transcript", a.tr, "--test", "echo '# pass 3'"], g.dir).status, 0);
  const c = spawnSync("node", [checker, a.run], { encoding: "utf8" });
  assert.equal(c.status, 0, c.stderr);
});

test("STAMP-12b an existing escalated: yes is left in place when stamping", () => {
  const { run, tr } = setup();
  assert.equal(stamp([run, "--transcript", tr]).status, 0);
  const md = readFileSync(run, "utf8");
  assert.equal(val(md, "escalated"), "yes");
  assert.equal(lines(md, "escalation_reason").length, 1);
});

test("STAMP-13 usage errors exit 2: no args, no --transcript, unknown flag, missing run.md, flag without value", () => {
  const { d, run, tr } = setup();
  const before = readFileSync(run, "utf8");
  assert.equal(stamp([]).status, 2);
  assert.equal(stamp([run]).status, 2);
  assert.equal(stamp([run, "--transcript", tr, "--bogus"]).status, 2);
  assert.equal(stamp([join(d, "nope.md"), "--transcript", tr]).status, 2);
  assert.equal(stamp([run, "--transcript"]).status, 2);
  assert.equal(stamp([run, "--transcript", tr, "--prices", join(d, "missing.json")]).status, 2);
  assert.equal(readFileSync(run, "utf8"), before);
});

test("STAMP-13b bad --prices JSON (missing a rate or not a number) is a usage error and run.md is untouched", () => {
  const { d, run, tr } = setup();
  const before = readFileSync(run, "utf8");
  const bad = join(d, "bad.json");
  writeFileSync(bad, JSON.stringify({ model: "m", input_per_mtok: 3, source: "s", as_of: "2026-11-01" }));
  assert.equal(stamp([run, "--transcript", tr, "--prices", bad]).status, 2);
  writeFileSync(bad, JSON.stringify({ model: "m", input_per_mtok: "x", output_per_mtok: 1, cache_creation_per_mtok: 1, cache_read_per_mtok: 1, source: "s", as_of: "2026-11-01" }));
  assert.equal(stamp([run, "--transcript", tr, "--prices", bad]).status, 2);
  assert.equal(readFileSync(run, "utf8"), before);
});

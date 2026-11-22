// UXFLOW-1: tests for tools/ux-flows.mjs. No browser needed: only pure functions and --dry-run.
// Run: node --test tests/ux-flows.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateFlows, slug, planFlows, skeleton } from "../tools/ux-flows.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, "..", "tools", "ux-flows.mjs");
const fx = (n) => join(here, "fixtures", "ux-flows", n + ".json");
const load = (n) => JSON.parse(readFileSync(fx(n), "utf8"));
const cli = (...a) => spawnSync("node", [tool, ...a], { encoding: "utf8" });

test("UXFLOW-1 a valid config has no errors", () => {
  assert.deepEqual(validateFlows(load("valid")), []);
  assert.deepEqual(validateFlows(load("multi")), []);
  assert.deepEqual(validateFlows(load("file-target")), []); // file path target is allowed
  assert.deepEqual(validateFlows({ ...load("valid"), target: "file:///x/index.html" }), []);
  assert.deepEqual(validateFlows({ ...load("valid"), cost_cap_usd: undefined }), []);
});

test("UXFLOW-1 each invalid fixture names its key word", () => {
  const cases = [
    ["no-product", /product/], ["no-target", /target/], ["no-flows", /flow/],
    ["no-flow-name", /flow/], ["dup-names", /unique/], ["bad-path", /path/],
    ["bad-clicks", /clicks/], ["bad-cap-zero", /cost_cap_usd/], ["bad-cap-string", /cost_cap_usd/],
    ["remote-no-demo", /demo/],
  ];
  for (const [name, re] of cases) {
    const errs = validateFlows(load(name));
    assert.ok(errs.length >= 1 && errs.every((e) => typeof e === "string"), `${name}: expected errors`);
    assert.ok(errs.some((e) => re.test(e)), `${name}: no error matching ${re}: ${JSON.stringify(errs)}`);
  }
});

test("UXFLOW-1 safe mode: remote targets need demo true, local ones do not", () => {
  assert.deepEqual(validateFlows(load("remote-demo")), []);
  for (const t of ["http://localhost:3000/", "http://127.0.0.1/", "http://[::1]:8000/x", "https://localhost/"]) {
    assert.deepEqual(validateFlows({ ...load("valid"), target: t }), [], t);
  }
  for (const t of ["http://localhost.evil.com/", "https://example.com/", "http://10.0.0.5/"]) {
    assert.ok(validateFlows({ ...load("valid"), target: t }).some((e) => /demo/.test(e)), t);
  }
  assert.ok(validateFlows({ ...load("remote-demo"), demo: "true" }).some((e) => /demo/.test(e)), "demo must be boolean true");
});

test("UXFLOW-1 slug", () => {
  assert.equal(slug("Sign in"), "sign-in");
  assert.equal(slug("  Check-out / Pay!! "), "check-out-pay");
});

test("UXFLOW-1 planFlows builds ux-shots argv", () => {
  const plan = planFlows(load("multi"), "out");
  assert.deepEqual(plan, [
    { name: "Sign in", out: join("out", "sign-in"),
      args: ["http://localhost:8123/", "--out", join("out", "sign-in"), "--no-network", "--path", "/signin", "--click", "#go", "--click", "#next", "--wait", "#form"] },
    { name: "Home", out: join("out", "home"),
      args: ["http://localhost:8123/", "--out", join("out", "home"), "--no-network"] },
  ]);
});

test("UXFLOW-1 skeleton has one flow line per flow, in order", () => {
  assert.equal(skeleton(load("multi"), "out"),
    `flow: Sign in | phone,laptop | ${join("out", "sign-in")}\nflow: Home | phone,laptop | ${join("out", "home")}`);
});

test("UXFLOW-1 --dry-run prints the plan, runs nothing, exits 0", () => {
  const r = cli(fx("multi"), "--dry-run", "--out", "o");
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split("\n");
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith("Sign in") && lines[0].includes("--no-network") && lines[0].includes("--click #go"), lines[0]);
  assert.ok(lines[1].startsWith("Home") && lines[1].includes(join("o", "home")), lines[1]);
  const d = cli(fx("valid"), "--dry-run"); // default out dist/ux-run
  assert.equal(d.status, 0);
  assert.ok(d.stdout.includes(join("dist", "ux-run", "sign-in")), d.stdout);
});

test("UXFLOW-1 --dry-run --json prints the plan as JSON", () => {
  const r = cli(fx("multi"), "--dry-run", "--json", "--out", "o");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), planFlows(load("multi"), "o"));
});

test("UXFLOW-1 invalid config exits 1 with one reason per line on stderr", () => {
  const r = cli(fx("remote-no-demo"), "--dry-run");
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "");
  const lines = r.stderr.trim().split("\n");
  assert.deepEqual(lines, validateFlows(load("remote-no-demo")));
  const dup = cli(fx("dup-names"), "--dry-run");
  assert.equal(dup.status, 1);
  assert.match(dup.stderr, /unique/);
});

test("UXFLOW-1 usage errors and unreadable files exit 2", () => {
  assert.equal(cli().status, 2);
  assert.equal(cli(fx("valid"), "--nope").status, 2);
  assert.equal(cli(fx("valid"), "--out").status, 2);
  assert.equal(cli(join(here, "fixtures", "ux-flows", "missing.json"), "--dry-run").status, 2);
  assert.equal(cli(fx("malformed"), "--dry-run").status, 2);
});

test("UXFLOW-SETTLE a flow's settle_ms becomes --settle and must be a number from 0 to 10000", () => {
  const c = { product: "P", target: "p.html", flows: [{ name: "Scan", clicks: ["#go"], settle_ms: 1500 }] };
  assert.deepEqual(validateFlows(c), []);
  const args = planFlows(c, "out")[0].args;
  assert.equal(args[args.indexOf("--settle") + 1], "1500");
  assert.match(validateFlows({ ...c, flows: [{ name: "Scan", settle_ms: 99999 }] }).join(), /settle_ms/);
});

test("UXFLOW-SETTLE edges: bounds, bad types, and no --settle unless set", () => {
  const base = { product: "P", target: "p.html" };
  const ok = (v) => validateFlows({ ...base, flows: [{ name: "A", settle_ms: v }] });
  assert.deepEqual(ok(0), []);
  assert.deepEqual(ok(10000), []);
  for (const bad of [10001, -1, NaN, Infinity, "1500", null, true]) {
    assert.match(ok(bad).join(), /settle_ms/, `settle_ms ${String(bad)}`);
  }
  const noSettle = planFlows({ ...base, flows: [{ name: "A" }] }, "out")[0].args;
  assert.equal(noSettle.includes("--settle"), false);
  const zero = planFlows({ ...base, flows: [{ name: "A", settle_ms: 0 }] }, "out")[0].args;
  assert.equal(zero[zero.indexOf("--settle") + 1], "0");
});

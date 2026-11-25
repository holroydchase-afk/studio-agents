// PS-R1..R4, R6, R7: privacy-security findings on tools/agent-runner.mjs (all red until the engineer fixes them).
// Run: node --test tests/agent-runner-privacy.test.mjs. No network: injected transport, or a stubbed global fetch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const toolPath = join(root, "tools", "agent-runner.mjs");
const KEY = "fakekey" + "-Zz1x2c3v4b5n6m7a8s9d0";
const PRICES = { "test-model": { input_per_mtok: 1, output_per_mtok: 2, source: "example price list", as_of: "2026-11-25" } };
const cfg = (over = {}) => ({ agent: "runner-demo", product: "Example Product", provider: "example-host", weights: "open", base_url: "https://api.example.invalid/v1", api_key_env: "QWEN_API_KEY", model: "test-model", max_steps: 5, max_cost_usd: 1, ...over });
const chat = (content) => ({ status: 200, body: { choices: [{ message: { role: "assistant", content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } } });

// Injected-transport harness. The transport writes TRANSPORT_CALLED to stderr so tests can check what was printed before it.
const HARNESS = `
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
globalThis.fetch = () => { throw new Error("network is off in tests"); };
const [toolPath, reqPath, ...argv] = process.argv.slice(2);
writeFileSync(reqPath, "[]");
const mod = await import(pathToFileURL(toolPath).href);
const seen = [];
const transport = async (req) => { process.stderr.write("TRANSPORT_CALLED\\n"); seen.push(req); writeFileSync(reqPath, JSON.stringify(seen)); return ${JSON.stringify(chat("hi"))}; };
try { process.exitCode = await mod.main(argv, { transport, sleep: async () => {}, now: () => new Date("2026-11-25T12:00:00Z"), env: process.env }); }
catch (e) { console.error("UNCAUGHT " + String(e && e.message)); process.exitCode = 70; }
`;
// Default-transport harness: no transport injected, global fetch is a recording stub (mode "ok" or "timeout").
const FETCH_HARNESS = `
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
const [toolPath, reqPath, mode, ...argv] = process.argv.slice(2);
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const sig = init.signal;
  calls.push({ url: String(url), redirect: init.redirect ?? null, hasSignal: !!sig, isAbortSignal: typeof AbortSignal !== "undefined" && sig instanceof AbortSignal, aborted: sig ? sig.aborted : null });
  writeFileSync(reqPath, JSON.stringify(calls));
  if (mode === "timeout") throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  return { status: 200, json: async () => (${JSON.stringify(chat("hi").body)}) };
};
const mod = await import(pathToFileURL(toolPath).href);
try { process.exitCode = await mod.main(argv, { sleep: async () => {}, now: () => new Date("2026-11-25T12:00:00Z"), env: process.env }); }
catch (e) { console.error("UNCAUGHT " + String(e && e.message)); process.exitCode = 70; }
writeFileSync(reqPath, JSON.stringify(calls));
`;
const dirH = mkdtempSync(join(tmpdir(), "ps-h-"));
const harness = join(dirH, "harness.mjs");
const fetchHarness = join(dirH, "fetch-harness.mjs");
writeFileSync(harness, HARNESS);
writeFileSync(fetchHarness, FETCH_HARNESS);

function run({ config = {}, env = { QWEN_API_KEY: KEY }, outRel = "out", extraArgs = [], mode, outAbs } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ps-r-"));
  const out = outAbs ? outAbs(dir) : join(dir, outRel);
  writeFileSync(join(dir, "prices.json"), JSON.stringify(PRICES));
  writeFileSync(join(dir, "task.md"), "Summarize this public example.");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ ...cfg(), prices_file: join(dir, "prices.json"), ...config }));
  const args = ["--config", join(dir, "config.json"), "--task", join(dir, "task.md"), "--out", out, ...extraArgs];
  const lead = mode ? [fetchHarness, toolPath, join(dir, "req.json"), mode] : [harness, toolPath, join(dir, "req.json")];
  const p = spawnSync("node", [...lead, ...args], { encoding: "utf8", env: { PATH: process.env.PATH, ...env } });
  const rd = (f) => (existsSync(join(out, f)) ? readFileSync(join(out, f), "utf8") : null);
  return { status: p.status, stdout: p.stdout, stderr: p.stderr, dir, out, requests: JSON.parse(readFileSync(join(dir, "req.json"), "utf8")), runMd: rd("run.md"), transcript: rd("transcript.jsonl"), gitignore: rd(".gitignore") };
}

test("PS-R1a base_url must be https, with no credentials and no IP literal, localhost or private/link-local host: exit 2, no request", () => {
  const bads = [
    "http://api.example.invalid/v1", "https://user:pw@api.example.invalid/v1", "https://user@api.example.invalid/v1",
    "https://127.0.0.1/v1", "https://10.0.0.5/v1", "https://192.168.1.1/v1", "https://172.16.0.9/v1", "https://169.254.169.254/latest",
    "https://8.8.8.8/v1", "https://[::1]/v1", "https://[fe80::1]/v1", "https://localhost/v1", "https://localhost:8443/v1", "https://LOCALHOST./v1",
  ];
  for (const base_url of bads) {
    const r = run({ config: { base_url } });
    assert.equal(r.status, 2, `${base_url}: exit ${r.status}, stderr: ${r.stderr}`);
    assert.deepEqual(r.requests, [], `${base_url}: a request was made`);
    assert.ok(!r.stderr.includes("pw@"), `${base_url}: credentials echoed`);
  }
  const ok = run({ config: { base_url: "https://api.example.invalid/v1" } });
  assert.equal(ok.status, 0, `control: a plain https host must still work: ${ok.stderr}`);
});

test("PS-R1b api_key_env must end in _API_KEY and ANTHROPIC_API_KEY is refused: exit 2, no request", () => {
  for (const api_key_env of ["GITHUB_TOKEN", "AWS_SECRET_ACCESS_KEY", "ANTHROPIC_API_KEY", "HOME", "NPM_TOKEN"]) {
    const r = run({ config: { api_key_env }, env: { [api_key_env]: KEY } });
    assert.equal(r.status, 2, `${api_key_env}: exit ${r.status}, stderr: ${r.stderr}`);
    assert.deepEqual(r.requests, [], `${api_key_env}: a request was made`);
  }
  for (const api_key_env of ["QWEN_API_KEY", "OPENROUTER_API_KEY"]) {
    const r = run({ config: { api_key_env }, env: { [api_key_env]: KEY } });
    assert.equal(r.status, 0, `${api_key_env} should be allowed: ${r.stderr}`);
  }
});

test("PS-R1c the provider host and the env var NAME (never the key) are printed to stderr before the first request", () => {
  const r = run({ config: { api_key_env: "OPENROUTER_API_KEY", base_url: "https://api.example.invalid/v1" }, env: { OPENROUTER_API_KEY: KEY } });
  assert.equal(r.status, 0, r.stderr);
  const called = r.stderr.indexOf("TRANSPORT_CALLED");
  assert.ok(called >= 0, "the transport was never reached");
  const before = r.stderr.slice(0, called);
  assert.ok(before.includes("api.example.invalid"), `host not printed before the first request; stderr: ${r.stderr}`);
  assert.ok(before.includes("OPENROUTER_API_KEY"), `env var name not printed before the first request; stderr: ${r.stderr}`);
  assert.ok(!r.stderr.includes(KEY) && !r.stdout.includes(KEY), "the key itself was printed");
});

test("PS-R2a the default transport passes redirect:\"error\" and an AbortSignal (timeout) to fetch", () => {
  const r = run({ mode: "ok" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.requests.length, 1);
  assert.equal(r.requests[0].redirect, "error", "fetch must be called with redirect:\"error\" so the key is never re-sent to a redirect target");
  assert.equal(r.requests[0].isAbortSignal, true, "fetch must get an AbortSignal (AbortSignal.timeout)");
  assert.equal(r.requests[0].aborted, false, "the signal must not already be aborted");
});

test("PS-R2b a timeout from fetch ends the run failed (exit 1) with run.md and a transcript logged, no key leaked", () => {
  const r = run({ mode: "timeout" });
  assert.equal(r.status, 1, `exit ${r.status}; stderr: ${r.stderr}`);
  assert.ok(r.runMd && /^verdict: failed$/m.test(r.runMd), "no failed run.md written");
  assert.ok(r.transcript && /"stop":"failed"/.test(r.transcript), "no transcript with a failed stop written");
  assert.ok(!(r.runMd + r.transcript + r.stdout + r.stderr).includes(KEY));
});

test("PS-R3a usage and --help state \"What leaves the machine\" (prompt, task, tool results, history go to the provider host; synthetic or public tasks only)", () => {
  for (const args of [[], ["--help"]]) {
    const p = spawnSync("node", [toolPath, ...args], { encoding: "utf8", env: { PATH: process.env.PATH } });
    const text = p.stdout + p.stderr;
    assert.match(text, /What leaves the machine/, `args ${JSON.stringify(args)}: missing note; got: ${text}`);
    assert.match(text, /system prompt/i);
    assert.match(text, /tool results/i);
    assert.match(text, /history/i);
    assert.match(text, /synthetic or public/i);
  }
});

test("PS-R3b docs/agent-harness.md agent-runner row carries the \"What leaves the machine\" note", () => {
  const row = readFileSync(join(root, "docs", "agent-harness.md"), "utf8").split("\n").find((l) => l.includes("agent-runner.mjs"));
  assert.ok(row, "no agent-runner row");
  assert.match(row, /What leaves the machine/);
  assert.match(row, /synthetic or public/i);
  assert.match(row, /vendor terms/i);
});

test("PS-R4a --out inside a git work tree is refused (exit 2, nothing written, no request) unless --allow-repo-out is passed", () => {
  const repoOut = (dir) => { spawnSync("git", ["init", "-q", dir], { env: process.env }); return join(dir, "runs", "one"); };
  const r = run({ outAbs: repoOut });
  assert.equal(r.status, 2, `exit ${r.status}; stderr: ${r.stderr}`);
  assert.deepEqual(r.requests, []);
  assert.ok(!existsSync(r.out), "--out was created inside the work tree");
});

test("PS-R4b with --allow-repo-out the run proceeds and --out gets a .gitignore containing *", () => {
  const repoOut = (dir) => { spawnSync("git", ["init", "-q", dir], { env: process.env }); return join(dir, "runs", "one"); };
  const r = run({ outAbs: repoOut, extraArgs: ["--allow-repo-out"] });
  assert.equal(r.status, 0, `exit ${r.status}; stderr: ${r.stderr}`);
  assert.ok(r.runMd, "no run.md");
  assert.equal((r.gitignore ?? "").trim(), "*", `.gitignore missing or wrong: ${JSON.stringify(r.gitignore)}`);
});

test("PS-R4c control: --out outside any git work tree needs no flag", () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr);
});

test("PS-R7 the 'environment variable is not set' error does not echo a name that fails the allowed pattern", () => {
  const odd = "my_secret_Value_42";
  const r = run({ config: { api_key_env: odd }, env: {} });
  assert.equal(r.status, 2);
  assert.ok(!r.stderr.includes(odd), `the odd name was echoed: ${r.stderr}`);
  assert.deepEqual(r.requests, []);
  const ok = run({ config: { api_key_env: "QWEN_API_KEY" }, env: {} });
  assert.equal(ok.status, 2);
  assert.ok(ok.stderr.includes("QWEN_API_KEY"), "an allowed name should still be named so the fix is obvious");
});

test("PS-R6 docs/agent-harness.md names the runner path consistently: tools/ in Where, one scripts/ prefix in the command, and it exists", () => {
  const row = readFileSync(join(root, "docs", "agent-harness.md"), "utf8").split("\n").find((l) => l.includes("agent-runner.mjs"));
  assert.ok(row, "no agent-runner row");
  const paths = [...row.matchAll(/([\w./-]*?)agent-runner\.mjs/g)].map((m) => m[1]);
  assert.ok(paths.length >= 2, "expected the Where and How columns to both name the file");
  const ok = paths.every((p) => p === "tools/" || p === "scripts/");
  assert.ok(ok, `unexpected path prefixes: ${JSON.stringify(paths)}`);
  assert.ok(/`tools\/agent-runner\.mjs`/.test(row), "Where column should cite tools/agent-runner.mjs");
  assert.ok(/node scripts\/agent-runner\.mjs/.test(row), "How column should use node scripts/agent-runner.mjs (the synced path)");
  assert.ok(existsSync(join(root, "tools", "agent-runner.mjs")));
  // the tool's own usage line must agree with the docs about the file name
  const p = spawnSync("node", [toolPath], { encoding: "utf8", env: { PATH: process.env.PATH } });
  assert.match(p.stderr, /agent-runner\.mjs/);
});

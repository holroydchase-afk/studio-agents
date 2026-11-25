// OWR-1..21 (OWR-22 is manual): tools/agent-runner.mjs, a provider-agnostic agent loop on any OpenAI-compatible
// chat-completions API, inside a dollar cap, leaving a run log that tools/check-agent-run.mjs accepts.
// Spec: docs/product/SPEC-OPEN-WEIGHT-RUNNER.md. Run: node --test tests/agent-runner.test.mjs
//
// No network, no real keys: every test uses a fake transport, an injected sleep and a global fetch that throws.
// File-writing tests run the tool's main() in a child process (so stdout and stderr are real) with the same fakes.
//
// Contract these tests pin where the spec is silent (QA-R2; the engineer may change a name, but then changes the test):
//   runAgent({config, prices, task, tools, transport, sleep, now}) -> {stop, steps, usage, cost_usd, retries, transcript}
//     config.system_prompt (optional text), config.tools [{name, description, parameters}], config.api_key_env.
//     prices is the prices file object keyed by model id: {"<model>": {input_per_mtok, output_per_mtok, source, as_of}}.
//     tools is {name: async (args) => string}. transport(req) gets {url, method, headers, body (an object)} and
//     returns {status, body}; body is the parsed chat-completions JSON (usage {prompt_tokens, completion_tokens}).
//     steps = model requests made. usage = {input, output}. The key is read from process.env[config.api_key_env].
//   main(argv, {transport, sleep, now, env}) -> Promise<exit code 0|1|2>; writes transcript.jsonl and run.md to --out.
//     --tools FILE.mjs has a default export {name: fn}. prices_file and system_prompt_file in the config are paths.
//   transcript record: {step, kind: request|response|tool_result|retry|stop, ...}; response and stop records carry
//     `usage` (response only) and the running `cost_usd`; a retry record has `retry_kind: "schema" | "transport"`;
//     the stop record has `stop`.
//   "step" in OWR-10 = one model request and its reply; the one schema retry is per step, so it resets after a
//     step whose tool calls were all valid (QA-R3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkAgentRun } from "../tools/check-agent-run.mjs";
import { LEAKS } from "../tools/check-story-entry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const toolPath = join(root, "tools", "agent-runner.mjs");
const mod = await import(pathToFileURL(toolPath).href).catch((e) => ({ __missing: e.message }));
const need = (name) => {
  assert.equal(typeof mod[name], "function", `tools/agent-runner.mjs must export ${name}() (${mod.__missing ?? "not exported"})`);
  return mod[name];
};

// A global fetch that throws proves no test reaches the network (OWR-20). Only the default-transport test may call it.
let fetchCalls = [];
let fetchAllowed = false;
let strayFetch = 0;
globalThis.fetch = (...a) => {
  fetchCalls.push(a);
  if (!fetchAllowed) strayFetch++;
  throw new Error("network is off in tests");
};

// Built at run time so no tracked file holds a key-shaped string.
const KEY = "fakekey" + "-Zz9y8x7w6v5u4t3s2r1q0";
process.env.OWR_TEST_API_KEY = KEY;
const LEAKME = "LEAK" + "ME-value-9f8e7d";

const LOOKUP = {
  name: "lookup",
  description: "Look something up",
  parameters: {
    type: "object",
    properties: { city: { type: "string" }, units: { type: "string", enum: ["c", "f"] } },
    required: ["city"],
    additionalProperties: false,
  },
};
const baseConfig = (over = {}) => ({
  agent: "runner-demo", product: "Example Product", provider: "example-host", weights: "open",
  base_url: "https://api.example.invalid/v1", api_key_env: "OWR_TEST_API_KEY", model: "test-model",
  max_steps: 10, max_cost_usd: 1, tools: [LOOKUP], ...over,
});
const PRICES = { "test-model": { input_per_mtok: 1, output_per_mtok: 2, source: "example price list", as_of: "2026-11-25" } };

// ---------- fakes ----------
const call = (id, name, args) => ({ id, type: "function", function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args) } });
const chat = (content, toolCalls, usage = { prompt_tokens: 10, completion_tokens: 5 }) => {
  const message = { role: "assistant", content: content ?? null };
  if (toolCalls) message.tool_calls = toolCalls;
  const body = { id: "resp", model: "test-model", choices: [{ index: 0, finish_reason: toolCalls ? "tool_calls" : "stop", message }] };
  if (usage) body.usage = usage;
  return { status: 200, body };
};
const toolReply = (id = "c1", args = { city: "Paris" }, usage) => chat(null, [call(id, "lookup", args)], usage);
const http = (status, message = "nope") => ({ status, body: { error: { message } } });

function fake(replies) {
  const requests = [];
  const queue = [...replies];
  const transport = async (req) => {
    requests.push(JSON.parse(JSON.stringify(req))); // copy: the loop keeps appending to its messages
    const r = queue.shift();
    if (!r) throw new Error("unexpected extra request");
    return typeof r === "function" ? r(req) : r;
  };
  return { transport, requests };
}

async function go(replies, { config = {}, tools, task = "Do the thing", prices = PRICES } = {}) {
  const runAgent = need("runAgent");
  const f = fake(replies);
  const sleeps = [];
  const ran = [];
  const impl = tools ?? { lookup: async (a) => { ran.push(a); return `found ${a.city}`; } };
  const result = await runAgent({
    config: baseConfig(config), prices, task, tools: impl, transport: f.transport,
    sleep: async (ms) => { sleeps.push(ms); }, now: () => new Date("2026-11-25T12:00:00Z"),
  });
  return { result, requests: f.requests, sleeps, ran };
}
const toolMsgs = (req) => req.body.messages.filter((m) => m.role === "tool");

// ---------- child-process harness for main() ----------
const HARNESS = `
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
globalThis.fetch = () => { throw new Error("network is off in tests"); };
const [toolPath, scenarioPath, reqPath, ...argv] = process.argv.slice(2);
writeFileSync(reqPath, "[]");
const mod = await import(pathToFileURL(toolPath).href);
if (typeof mod.main !== "function") { console.error("tools/agent-runner.mjs must export main()"); process.exit(99); }
const sc = JSON.parse(readFileSync(scenarioPath, "utf8"));
const seen = [];
const replies = [...sc.replies];
const transport = async (req) => {
  seen.push(req); writeFileSync(reqPath, JSON.stringify(seen));
  const r = replies.shift();
  if (!r) throw new Error("scenario exhausted");
  if (r.throw) throw new Error(r.throw);
  return r;
};
try {
  process.exitCode = await mod.main(argv, { transport, sleep: async () => {}, now: () => new Date("2026-11-25T12:00:00Z"), env: process.env });
} catch (e) { console.error(String(e && e.message)); process.exitCode = 70; }
`;
const TOOLS_SRC = `export default { lookup: async (a) => "found " + a.city };\n`;
const harnessDir = mkdtempSync(join(tmpdir(), "owr-harness-"));
const harnessPath = join(harnessDir, "harness.mjs");
writeFileSync(harnessPath, HARNESS);

function runCli({ replies = [], config = {}, prices = PRICES, task = "Find the answer.\nSecond line.", noOut = false, env = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "owr-run-"));
  const cwd = join(dir, "cwd"); mkdirSync(cwd);
  const out = join(dir, "out");
  writeFileSync(join(dir, "prices.json"), JSON.stringify(prices));
  writeFileSync(join(dir, "system.md"), "You are a test agent.\n");
  writeFileSync(join(dir, "task.md"), task);
  writeFileSync(join(dir, "tools.mjs"), TOOLS_SRC);
  writeFileSync(join(dir, "config.json"), JSON.stringify({
    ...baseConfig(), prices_file: join(dir, "prices.json"), system_prompt_file: join(dir, "system.md"), ...config,
  }));
  writeFileSync(join(dir, "scenario.json"), JSON.stringify({ replies }));
  const args = ["--config", join(dir, "config.json"), "--task", join(dir, "task.md"), ...(noOut ? [] : ["--out", out]), "--tools", join(dir, "tools.mjs")];
  const p = spawnSync("node", [harnessPath, toolPath, join(dir, "scenario.json"), join(dir, "requests.json"), ...args], {
    cwd, encoding: "utf8", env: { PATH: process.env.PATH, OWR_TEST_API_KEY: KEY, ...env },
  });
  const read = (f) => (existsSync(join(out, f)) ? readFileSync(join(out, f), "utf8") : null);
  return { status: p.status, stdout: p.stdout, stderr: p.stderr, out, cwd, requests: JSON.parse(readFileSync(join(dir, "requests.json"), "utf8")), runMd: read("run.md"), transcript: read("transcript.jsonl") };
}
const agentrunBlock = (md) => {
  const blocks = [...md.matchAll(/^```agentrun[ \t]*\n([\s\S]*?)^```[ \t]*$/gm)];
  assert.equal(blocks.length, 1, "run.md must hold exactly one ```agentrun block");
  const kv = {};
  for (const l of blocks[0][1].split("\n").filter(Boolean)) { const m = /^([a-z0-9_]+):\s*(.*)$/.exec(l); if (m && m[1] !== "tool") kv[m[1]] = m[2]; }
  return kv;
};

// ================= Loop =================
test("OWR-1 a tool call then a final text: the tool runs once, its result goes back as a tool message, stop is done, bodies are chat-completions", async () => {
  const { result, requests, ran } = await go([toolReply("c1", { city: "Paris" }), chat("It is Paris.")]);
  assert.equal(result.stop, "done");
  assert.deepEqual(ran, [{ city: "Paris" }], "the tool runs exactly once with the parsed arguments");
  assert.equal(requests.length, 2);
  for (const r of requests) {
    assert.match(r.url, /^https:\/\/api\.example\.invalid\/v1\/chat\/completions$/);
    assert.equal(r.method, "POST");
    assert.equal(r.body.model, "test-model");
    assert.ok(Array.isArray(r.body.messages) && r.body.messages.length >= 1);
    assert.deepEqual(r.body.tools, [{ type: "function", function: { name: "lookup", description: LOOKUP.description, parameters: LOOKUP.parameters } }]);
    assert.equal(r.headers.Authorization ?? r.headers.authorization, `Bearer ${KEY}`, "the key is sent, from the env var named in the config");
  }
  assert.deepEqual(requests[0].body.messages.at(-1), { role: "user", content: "Do the thing" });
  const second = requests[1].body.messages;
  assert.equal(second.at(-2).role, "assistant");
  assert.equal(second.at(-2).tool_calls[0].id, "c1");
  assert.deepEqual(second.at(-1), { role: "tool", tool_call_id: "c1", content: "found Paris" });
});

test("OWR-1 the system prompt comes from system_prompt_file and the CLI sends it first", () => {
  const r = runCli({ replies: [chat("done")] });
  assert.equal(r.status, 0, `${r.stderr}${r.stdout}`);
  assert.deepEqual(r.requests[0].body.messages[0], { role: "system", content: "You are a test agent.\n" });
});

test("OWR-2 a model that always asks for another tool call: exactly max_steps requests, stop step-limit", async () => {
  const replies = Array.from({ length: 9 }, (_, i) => toolReply(`c${i}`));
  const { result, requests } = await go(replies, { config: { max_steps: 5 } });
  assert.equal(requests.length, 5);
  assert.equal(result.stop, "step-limit");
  assert.equal(result.steps, 5);
});

test("OWR-3 two tool calls in one response run in order and both results go back before the next request", async () => {
  const order = [];
  const tools = { lookup: async (a) => { order.push(a.city); return `r-${a.city}`; } };
  const two = chat(null, [call("a1", "lookup", { city: "A" }), call("b2", "lookup", { city: "B" })]);
  const { result, requests } = await go([two, chat("both done")], { tools });
  assert.deepEqual(order, ["A", "B"]);
  assert.equal(requests.length, 2);
  const m = requests[1].body.messages;
  assert.equal(m.at(-3).role, "assistant");
  assert.deepEqual(m.slice(-2), [{ role: "tool", tool_call_id: "a1", content: "r-A" }, { role: "tool", tool_call_id: "b2", content: "r-B" }]);
  assert.equal(result.stop, "done");
});

test("OWR-4 a tool that throws: error text (no stack, no paths) goes back as the tool result and the run continues", async () => {
  const tools = { lookup: async () => { throw new Error("disk full while reading /home/user/secret/data.txt"); } };
  const { result, requests } = await go([toolReply("c1"), chat("recovered")], { tools });
  assert.equal(result.stop, "done");
  assert.equal(requests.length, 2);
  const content = toolMsgs(requests[1]).at(-1).content;
  assert.match(content, /disk full/);
  assert.doesNotMatch(content, /\/home\/|secret\/data|\.mjs|node:|\n\s+at /, `tool error leaks a path or stack: ${content}`);
});

// ================= Cost cap =================
test("OWR-5 cost_usd is the sum over responses at $1/Mtok in and $2/Mtok out, to 4 decimals", async () => {
  // (1000*1 + 500*2)/1e6 = 0.0020 ; (2000*1 + 100*2)/1e6 = 0.0022 ; total 0.0042
  const { result } = await go([
    toolReply("c1", { city: "Paris" }, { prompt_tokens: 1000, completion_tokens: 500 }),
    chat("ok", null, { prompt_tokens: 2000, completion_tokens: 100 }),
  ]);
  assert.equal(result.stop, "done");
  assert.equal(Number(result.cost_usd.toFixed(4)), 0.0042);
  assert.deepEqual(result.usage, { input: 3000, output: 600 });
});

test("OWR-6 a response that takes the total past max_cost_usd: no further request, its tool calls do not run, stop cost-cap", async () => {
  // 6000*1 + 3000*2 = 0.012 > 0.01
  const { result, requests, ran } = await go([toolReply("c1", { city: "Paris" }, { prompt_tokens: 6000, completion_tokens: 3000 }), chat("never sent")], { config: { max_cost_usd: 0.01 } });
  assert.equal(result.stop, "cost-cap");
  assert.equal(requests.length, 1, "no request after the cap is passed");
  assert.deepEqual(ran, [], "tool calls in the response that broke the cap are not run");
  assert.ok(result.cost_usd > 0.01);
});

test("OWR-7 a response with no usage stops the run no-usage, never pricing the call as 0", async () => {
  const { result, requests } = await go([chat("hello", null, null), chat("never sent")]);
  assert.equal(result.stop, "no-usage");
  assert.equal(requests.length, 1);
});

test("OWR-8 a model missing from the prices file, or prices without source or as_of: exit 2 before any request", () => {
  const good = PRICES["test-model"];
  const cases = {
    "model missing": { "other-model": good },
    "no source": { "test-model": { ...good, source: undefined } },
    "no as_of": { "test-model": { ...good, as_of: undefined } },
    "empty source": { "test-model": { ...good, source: "" } },
  };
  for (const [name, prices] of Object.entries(cases)) {
    const r = runCli({ replies: [chat("never sent")], prices });
    assert.equal(r.status, 2, `${name}: exit ${r.status}\n${r.stderr}`);
    assert.deepEqual(r.requests, [], `${name}: a request was made`);
    assert.ok(r.stderr.trim().length > 0, `${name}: say what is wrong on stderr`);
  }
});

// ================= Schema validation and retries =================
const BAD_ARGS = [
  ["not valid JSON", `{"city": "${LEAKME}`, null],
  ["missing required field", {}, "city"],
  ["wrong type", { city: 987654 }, "city"],
  ["extra property", { city: "Paris", extra: LEAKME }, "extra"],
  ["bad enum", { city: "Paris", units: LEAKME }, "units"],
];

test("OWR-9 invalid arguments: the tool does not run, the model gets a tool message naming the field (never the value) and is asked again", async () => {
  for (const [name, args, field] of BAD_ARGS) {
    const { result, requests, ran } = await go([toolReply("c1", args), chat("fixed")]);
    assert.deepEqual(ran, [], `${name}: the tool must not run`);
    assert.equal(requests.length, 2, `${name}: the model is asked again`);
    const m = toolMsgs(requests[1]).find((t) => t.tool_call_id === "c1");
    assert.ok(m && typeof m.content === "string" && m.content.length > 0, `${name}: tool message for c1`);
    if (field) assert.ok(m.content.includes(field), `${name}: message names ${field}: ${m.content}`);
    assert.ok(!m.content.includes(LEAKME) && !m.content.includes("987654"), `${name}: message echoes the value: ${m.content}`);
    assert.equal(result.stop, "done", name);
    assert.equal(result.retries, 1, name);
  }
});

test("OWR-10 a second invalid call in the same step stops the run invalid-args; the budget resets after a valid step", async () => {
  const { result, requests, ran } = await go([toolReply("c1", {}), toolReply("c2", {}), chat("never sent")]);
  assert.equal(result.stop, "invalid-args");
  assert.equal(requests.length, 2);
  assert.deepEqual(ran, []);
  const again = await go([toolReply("c1", {}), toolReply("c2", { city: "Paris" }), toolReply("c3", {}), toolReply("c4", { city: "Rome" }), chat("fine")]);
  assert.equal(again.result.stop, "done", "one retry per step, not one per run");
  assert.deepEqual(again.ran, [{ city: "Paris" }, { city: "Rome" }]);
  assert.equal(again.result.retries, 2);
});

test("OWR-11 429 and 5xx are retried up to 2 times with the injected sleep; other 4xx is not retried and stops failed", async () => {
  for (const status of [429, 500, 503]) {
    const ok = await go([http(status), http(status), chat("fine")]);
    assert.equal(ok.result.stop, "done", `${status} twice then 200`);
    assert.equal(ok.requests.length, 3);
    assert.equal(ok.sleeps.length, 2, "sleep is injected, never a real delay");
    assert.ok(ok.sleeps.every((ms) => Number.isFinite(ms) && ms >= 0));
    const dead = await go([http(status), http(status), http(status), chat("never sent")]);
    assert.equal(dead.result.stop, "failed", `${status} three times`);
    assert.equal(dead.requests.length, 3, "1 try plus 2 retries");
    assert.equal(dead.sleeps.length, 2);
  }
  for (const status of [400, 401, 404, 422]) {
    const r = await go([http(status), chat("never sent")]);
    assert.equal(r.result.stop, "failed", String(status));
    assert.equal(r.requests.length, 1, `${status} is not retried`);
    assert.equal(r.sleeps.length, 0);
    assert.equal(r.result.retries, 0);
  }
});

test("OWR-12 every retry (schema and transport) is counted in retries and has a retry record in the transcript with its kind", async () => {
  const { result } = await go([http(429), toolReply("c1", {}), toolReply("c2", { city: "Paris" }), chat("fine")]);
  assert.equal(result.stop, "done");
  assert.equal(result.retries, 2);
  const retries = result.transcript.filter((r) => r.kind === "retry");
  assert.deepEqual(retries.map((r) => r.retry_kind).sort(), ["schema", "transport"]);
});

// ================= Transcript =================
const SCENARIO = [http(429), toolReply("c1", { city: "Paris" }, { prompt_tokens: 1000, completion_tokens: 500 }), chat("Paris.", null, { prompt_tokens: 2000, completion_tokens: 100 })];

test("OWR-13 transcript.jsonl: one valid JSON object per line, in order, with step, kind, model usage and running cost", () => {
  const r = runCli({ replies: SCENARIO });
  assert.equal(r.status, 0, `${r.stderr}${r.stdout}`);
  assert.ok(r.transcript, "transcript.jsonl must exist in --out");
  const lines = r.transcript.split("\n").filter(Boolean);
  const recs = lines.map((l, i) => { try { return JSON.parse(l); } catch { assert.fail(`line ${i + 1} is not JSON`); } });
  const kinds = ["request", "response", "tool_result", "retry", "stop"];
  let lastStep = 0, lastCost = 0;
  for (const rec of recs) {
    assert.ok(kinds.includes(rec.kind), `kind ${rec.kind}`);
    assert.ok(Number.isInteger(rec.step) && rec.step >= lastStep, "step is an integer, in order");
    lastStep = rec.step;
    if (rec.kind === "response") {
      assert.ok(rec.usage && Number.isInteger(rec.usage.input) && Number.isInteger(rec.usage.output), "response carries usage");
    }
    if (rec.kind === "response" || rec.kind === "stop") {
      assert.equal(typeof rec.cost_usd, "number", `${rec.kind} carries the running cost`);
      assert.ok(rec.cost_usd >= lastCost, "running cost never goes down");
      lastCost = rec.cost_usd;
    }
  }
  assert.equal(recs[0].kind, "request");
  assert.equal(recs.at(-1).kind, "stop");
  assert.equal(recs.at(-1).stop, "done");
  assert.equal(Number(lastCost.toFixed(4)), 0.0042);
  for (const k of ["request", "response", "tool_result", "retry"]) assert.ok(recs.some((x) => x.kind === k), `a ${k} record`);
});

test("OWR-14 the API key and the Authorization header appear in no transcript line, run log, error or stdout", () => {
  const leaks = (r) => [r.transcript, r.runMd, r.stdout, r.stderr].filter((t) => t != null).join("\n");
  const check = (r, what) => {
    const all = leaks(r);
    assert.ok(!all.includes(KEY), `${what}: the key leaked`);
    assert.doesNotMatch(all, /authorization|bearer /i, `${what}: the Authorization header leaked`);
  };
  const happy = runCli({ replies: SCENARIO });
  assert.equal(happy.status, 0, `${happy.stderr}${happy.stdout}`);
  assert.equal(happy.requests[0].headers.Authorization ?? happy.requests[0].headers.authorization, `Bearer ${KEY}`, "the fake key was really sent");
  check(happy, "normal run");
  check(runCli({ replies: [{ status: 401, body: { error: { message: `Incorrect API key provided: ${KEY}` } } }] }), "401 that echoes the key");
  check(runCli({ replies: [{ throw: `connect failed, sent Authorization: Bearer ${KEY}` }] }), "transport error that carries the key");
});

test("OWR-15 the transcript and run log go only to --out; without --out nothing is written and the exit is 2", () => {
  const r = runCli({ replies: SCENARIO });
  assert.equal(r.status, 0, `${r.stderr}${r.stdout}`);
  assert.deepEqual(readdirSync(r.out).sort(), ["run.md", "transcript.jsonl"], "--out holds exactly the two files");
  assert.deepEqual(readdirSync(r.cwd), [], "nothing is written under the working directory");
  const none = runCli({ replies: [chat("never sent")], noOut: true });
  assert.equal(none.status, 2, "--out is required");
  assert.deepEqual(readdirSync(none.cwd), [], "no default output location");
  assert.deepEqual(none.requests, [], "no call made on a usage error");
});

// ================= Run log =================
test("OWR-16 run.md has one agentrun block with the agent, product, tier, model, provider, weights, tokens, cost, retries, verdict", () => {
  const r = runCli({ replies: SCENARIO });
  assert.equal(r.status, 0, `${r.stderr}${r.stdout}`);
  assert.ok(r.runMd, "run.md must exist in --out");
  const kv = agentrunBlock(r.runMd);
  assert.equal(kv.agent, "runner-demo");
  assert.equal(kv.product, "Example Product");
  assert.equal(kv.tier, "advisory");
  assert.equal(kv.model, "test-model", "the agent model, not the grader");
  assert.equal(kv.provider, "example-host");
  assert.equal(kv.weights, "open");
  assert.equal(kv.tokens, "3600", "input plus output over every priced response");
  assert.equal(kv.cost_usd, "0.0042");
  assert.equal(kv.retries, "1");
  assert.equal(kv.verdict, "done");
  assert.equal(kv.findings, "0");
  assert.equal(kv.p0, "0");
  assert.equal(kv.escalated, "no");
  assert.equal(kv.date, "2026-11-25", "the injected clock, not the real one");
  assert.ok(kv.input && !kv.input.includes("\n"), "input is one line");
});

const STOPS = {
  done: { replies: [chat("hi")], status: 0 },
  "step-limit": { replies: [toolReply("c1"), toolReply("c2"), toolReply("c3")], config: { max_steps: 2 }, status: 0 },
  "cost-cap": { replies: [toolReply("c1", { city: "Paris" }, { prompt_tokens: 6000, completion_tokens: 3000 })], config: { max_cost_usd: 0.001 }, status: 0 },
  "no-usage": { replies: [chat("hi", null, null)], status: 0 },
  "invalid-args": { replies: [toolReply("c1", {}), toolReply("c2", {})], status: 0 },
  failed: { replies: [http(400)], status: 1 },
};

test("OWR-17 for each stop reason (done, step-limit, cost-cap, no-usage, invalid-args, failed) check-agent-run accepts run.md; exit is 0 except failed, which is 1", () => {
  for (const [stop, s] of Object.entries(STOPS)) {
    const r = runCli({ replies: s.replies, config: s.config });
    assert.equal(r.status, s.status, `${stop}: exit ${r.status}\n${r.stderr}`);
    assert.ok(r.runMd, `${stop}: run.md written`);
    assert.equal(agentrunBlock(r.runMd).verdict, stop);
    assert.deepEqual(checkAgentRun(r.runMd).errors, [], `${stop}: checkAgentRun errors`);
  }
});

const checkerBlock = (extra) => `\`\`\`agentrun
date: 2026-11-25
agent: runner-demo
product: Example Product
tier: advisory
model: test-model
tokens: 100
cost_usd: 0.0001
input: one task
verdict: done
findings: 0
p0: 0
escalated: no
${extra}
\`\`\`
`;

test("OWR-18 check-agent-run accepts provider (one token) and weights (open or closed-api) and rejects empty or invalid values", () => {
  assert.deepEqual(checkAgentRun(checkerBlock("provider: example-host\nweights: open")).errors, []);
  assert.deepEqual(checkAgentRun(checkerBlock("provider: example-host\nweights: closed-api")).errors, []);
  assert.deepEqual(checkAgentRun(checkerBlock("provider: together")).errors, [], "each key is optional on its own");
  assert.deepEqual(checkAgentRun(checkerBlock("weights: open")).errors, []);
  const bad = (extra, re) => {
    const { errors } = checkAgentRun(checkerBlock(extra));
    assert.ok(errors.some((e) => re.test(e)), `want an error matching ${re} for "${extra}": ${JSON.stringify(errors)}`);
  };
  bad("provider:", /provider/);
  bad("provider: two words", /provider/);
  bad("weights:", /weights/);
  bad("weights: maybe", /weights/);
  bad("weights: Open", /weights/);
  bad("provider: a\nprovider: b", /provider|duplicate/);
  const existing = spawnSync("node", ["--test", join(here, "check-agent-run.test.mjs")], { encoding: "utf8" });
  assert.equal(existing.status, 0, `the existing check-agent-run tests must still pass unchanged\n${existing.stdout.slice(-600)}`);
});

test("OWR-19 the grader model is not in run.md; the caller's tool: grader line keeps it valid", () => {
  const r = runCli({ replies: [chat("hi")], env: { OWR_GRADER_MODEL: "grader-model-xyz" } });
  assert.equal(r.status, 0, `${r.stderr}${r.stdout}`);
  assert.doesNotMatch(r.runMd, /grader/i, "the runner never writes a grader line or model");
  const withGrader = r.runMd.replace(/^```\s*$/m, "tool: grader | ok | grader-model-xyz\n```");
  assert.match(withGrader, /^tool: grader \| ok \| grader-model-xyz$/m);
  assert.deepEqual(checkAgentRun(withGrader).errors, []);
});

// ================= No network, no secrets =================
test("OWR-20 the default transport is a thin wrapper over global fetch, exercised only against the throwing stub", async () => {
  const runAgent = need("runAgent");
  fetchCalls = [];
  fetchAllowed = true;
  let outcome;
  try {
    outcome = await runAgent({ config: baseConfig(), prices: PRICES, task: "t", tools: {}, sleep: async () => {}, now: () => new Date("2026-11-25T12:00:00Z") })
      .catch((e) => ({ error: String(e && e.message) }));
  } finally { fetchAllowed = false; }
  assert.ok(fetchCalls.length >= 1, "with no transport given, the run goes through global fetch");
  const [url, init] = fetchCalls[0];
  assert.equal(String(url), "https://api.example.invalid/v1/chat/completions");
  assert.equal(JSON.parse(init.body).model, "test-model");
  assert.equal(init.headers.Authorization ?? init.headers.authorization, `Bearer ${KEY}`);
  assert.ok(outcome.stop === "failed" || outcome.error, `a throwing fetch ends the run failed or rejects: ${JSON.stringify(outcome)}`);
  assert.ok(!JSON.stringify(outcome).includes(KEY), "the key is not in the outcome");
});

test("OWR-20 no other test touched the network", () => {
  need("runAgent"); // red until the tool exists: a suite that ran nothing proves nothing
  assert.equal(strayFetch, 0, "global fetch was called outside the default-transport test");
});

test("OWR-21 the config examples hold no key pattern or literal key, and a config with api_key (not api_key_env) exits 2", () => {
  const dir = join(root, "evals", "runner");
  for (const f of ["example-config.json", "example-prices.json"]) {
    assert.ok(existsSync(join(dir, f)), `evals/runner/${f} must exist`);
    const text = readFileSync(join(dir, f), "utf8");
    JSON.parse(text);
    for (const [re, what] of LEAKS) assert.ok(!re.test(text), `${f} has ${what}`);
    assert.doesNotMatch(text, /"api_key"\s*:/, `${f} has a literal api_key field`);
  }
  const cfg = JSON.parse(readFileSync(join(dir, "example-config.json"), "utf8"));
  assert.match(cfg.api_key_env, /^[A-Z][A-Z0-9_]*$/, "api_key_env is the NAME of an env var");
  assert.ok(["open", "closed-api"].includes(cfg.weights));
  const prices = JSON.parse(readFileSync(join(dir, "example-prices.json"), "utf8"));
  assert.match(JSON.stringify(prices), /example/i, "made-up prices are labelled example");
  const r = runCli({ replies: [chat("never sent")], config: { api_key: "literal-key-value" } });
  assert.equal(r.status, 2, `api_key in the config: exit ${r.status}\n${r.stderr}`);
  assert.deepEqual(r.requests, []);
  assert.ok(!(r.stdout + r.stderr).includes("literal-key-value"), "the literal is not echoed");
  const wired = readFileSync(join(root, "tests", "check.sh"), "utf8");
  assert.match(wired, /node --test "\$root\/tests\/agent-runner\.test\.mjs"/, "tests/check.sh runs this file");
});

test("OWR-22 one live call on the cheapest model with a 10-cent cap returns done and a log that passes the checker", { skip: "manual: needs Chase's go and a real key in his own environment; never run by CI (first real use of #172)" }, () => {});

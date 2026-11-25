#!/usr/bin/env node
// agent-runner: runs ONE agent task on any hosted OpenAI-compatible chat-completions API, inside a dollar cap, and
// leaves a run log that tools/check-agent-run.mjs accepts. Zero dependencies. Spec: docs/product/SPEC-OPEN-WEIGHT-RUNNER.md.
//
// Usage: node tools/agent-runner.mjs --config FILE --task FILE --out DIR [--tools FILE.mjs]
//   Writes DIR/transcript.jsonl (one JSON record per line) and DIR/run.md (one ```agentrun block). Nothing else is
//   written anywhere. Exit 0 the run finished (any stop reason except failed), 1 the run failed, 2 usage or config
//   error (no call made).
//
// Config (JSON): agent (kebab name, NOT qa-tdd, staff-pm or ux-reviewer: their verdict lists are fixed; use e.g.
//   open-weight-staff-pm), product, provider, weights (open | closed-api), base_url, api_key_env (the NAME of an env
//   var; a literal api_key field is refused), model, prices_file, max_steps, max_cost_usd, system_prompt_file, tools
//   [{name, description, parameters}]. Relative paths resolve against the config file's folder.
// Prices (JSON, keyed by model id): {input_per_mtok, output_per_mtok, source, as_of}. Cost is provider-reported usage
//   times these prices, so it is not independent: stamp it (follow-up) before any cost claim.
// --tools FILE.mjs has a default export {toolName: async (args) => string}.
//
// Stop reasons: done, step-limit, cost-cap, no-usage, invalid-args, failed. Secrets: the key is read from the env at
// request time and goes only into the request header; error bodies and transport errors are never written anywhere.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { LEAKS } from "./check-story-entry.mjs";
import { VERDICTS, SLUG } from "./check-agent-run.mjs";

const USAGE = "usage: agent-runner.mjs --config FILE --task FILE --out DIR [--tools FILE.mjs]";
const MAX_TRANSPORT_RETRIES = 2;
const CLIP = 2000;

export class ConfigError extends Error {}
const bad = (msg) => { throw new ConfigError(msg); };

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A thin wrapper over global fetch; the key only ever travels in req.headers.
async function defaultTransport(req) {
  const res = await fetch(req.url, { method: req.method, headers: req.headers, body: JSON.stringify(req.body) });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

function checkConfig(config, prices) {
  if (!config || typeof config !== "object") bad("config must be a JSON object");
  if ("api_key" in config) bad("config has an api_key field: put the NAME of an env var in api_key_env instead");
  const str = (k) => { if (typeof config[k] !== "string" || !config[k].trim()) bad(`config.${k} is required (a non-empty string)`); };
  for (const k of ["agent", "product", "provider", "base_url", "api_key_env", "model"]) str(k);
  if (!SLUG.test(config.agent)) bad("config.agent must be a lowercase kebab-case name");
  if (Object.keys(VERDICTS).includes(config.agent)) bad(`config.agent "${config.agent}" has a fixed verdict list the runner's verdicts break: use a runner-named agent such as open-weight-${config.agent}`);
  if (/\s/.test(config.provider)) bad("config.provider must be one token");
  if (!["open", "closed-api"].includes(config.weights)) bad("config.weights must be open or closed-api");
  if (!/^[A-Z][A-Z0-9_]*$/.test(config.api_key_env)) bad("config.api_key_env must be the NAME of an environment variable");
  if (!Number.isInteger(config.max_steps) || config.max_steps < 1) bad("config.max_steps must be a positive integer");
  if (typeof config.max_cost_usd !== "number" || !(config.max_cost_usd > 0)) bad("config.max_cost_usd must be a positive number");
  if (config.tools !== undefined && !Array.isArray(config.tools)) bad("config.tools must be a list");
  const p = prices && prices[config.model];
  if (!p || typeof p !== "object") bad(`prices have no entry for model "${config.model}"`);
  for (const k of ["input_per_mtok", "output_per_mtok"]) if (typeof p[k] !== "number" || !(p[k] >= 0)) bad(`prices for "${config.model}" need a numeric ${k}`);
  if (typeof p.source !== "string" || !p.source.trim()) bad(`prices for "${config.model}" need a source`);
  if (typeof p.as_of !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.as_of)) bad(`prices for "${config.model}" need an as_of date (YYYY-MM-DD)`);
  return p;
}

// ---- tiny JSON-schema check: returns a message naming the field, never the value ----
const TYPES = {
  string: (v) => typeof v === "string", number: (v) => typeof v === "number" && Number.isFinite(v),
  integer: (v) => Number.isInteger(v), boolean: (v) => typeof v === "boolean",
  array: (v) => Array.isArray(v), object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
};
const label = (s) => String(s).replace(/[^\w.-]/g, "?").slice(0, 40);
function checkValue(schema, v, name) {
  if (!schema || typeof schema !== "object") return null;
  if (schema.type && TYPES[schema.type] && !TYPES[schema.type](v)) return `field "${name}" must be a ${schema.type}`;
  if (Array.isArray(schema.enum) && !schema.enum.includes(v)) return `field "${name}" must be one of: ${schema.enum.map((e) => JSON.stringify(e)).join(", ")}`;
  if (schema.type === "object" || schema.properties) {
    const props = schema.properties || {};
    for (const r of schema.required || []) if (!(r in v)) return `field "${label(r)}" is required`;
    for (const k of Object.keys(v)) {
      if (k in props) { const e = checkValue(props[k], v[k], k); if (e) return e; }
      else if (schema.additionalProperties === false) return `field "${label(k)}" is not allowed`;
    }
  }
  if (schema.type === "array" && schema.items) for (const item of v) { const e = checkValue(schema.items, item, `${name}[]`); if (e) return e; }
  return null;
}
function parseArgs(def, raw) {
  let v;
  try { v = JSON.parse(raw || "{}"); } catch { return { error: "the arguments were not valid JSON" }; }
  if (!TYPES.object(v)) return { error: "the arguments must be a JSON object" };
  const e = checkValue(def.parameters || { type: "object" }, v, "arguments");
  return e ? { error: e } : { value: v };
}

// An error text safe to hand back to the model: first line, no stack, no paths.
const safeError = (e) => {
  const first = String((e && e.message) || e).split("\n")[0];
  return first.replace(/(^|\s)(?:~?\/|[A-Za-z]:\\)\S*/g, "$1[path]").slice(0, 300) || "tool failed";
};

export async function runAgent({ config, prices, task, tools = {}, transport = defaultTransport, sleep = defaultSleep, now = () => new Date(), env = process.env }) {
  const price = checkConfig(config, prices);
  const key = env[config.api_key_env];
  if (!key) bad(`environment variable ${config.api_key_env} is not set`);
  const redact = (s) => String(s).split(key).join("[redacted]");
  const defs = new Map((config.tools || []).map((t) => [t.name, t]));
  const toolSpecs = (config.tools || []).map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
  const url = `${config.base_url.replace(/\/+$/, "")}/chat/completions`;

  const messages = [];
  if (config.system_prompt) messages.push({ role: "system", content: config.system_prompt });
  messages.push({ role: "user", content: task });

  const transcript = [];
  const usage = { input: 0, output: 0 };
  let cost = 0, steps = 0, retries = 0, schemaRetried = false, stop = null;
  const log = (rec) => transcript.push(rec);
  const finish = (s) => { stop = s; log({ step: steps, kind: "stop", stop: s, cost_usd: cost }); };
  void now;

  while (!stop) {
    if (steps >= config.max_steps) { finish("step-limit"); break; }
    steps++;
    log({ step: steps, kind: "request", model: config.model, messages: messages.length });
    const body = { model: config.model, messages };
    if (toolSpecs.length) body.tools = toolSpecs;
    const req = { url, method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body };

    let res;
    for (let attempt = 0; ; attempt++) {
      try { res = await transport(req); } catch { log({ step: steps, kind: "response", error: "transport error" }); res = null; break; }
      const retryable = res && (res.status === 429 || res.status >= 500);
      if (!retryable || attempt >= MAX_TRANSPORT_RETRIES) break;
      retries++;
      log({ step: steps, kind: "retry", retry_kind: "transport", status: res.status });
      await sleep(500 * 2 ** attempt);
    }
    if (!res || res.status !== 200 || !res.body) {
      if (res) log({ step: steps, kind: "response", status: res.status, error: "http error" });
      finish("failed");
      break;
    }

    const u = res.body.usage;
    if (!u || !Number.isInteger(u.prompt_tokens) || !Number.isInteger(u.completion_tokens) || u.prompt_tokens < 0 || u.completion_tokens < 0) {
      log({ step: steps, kind: "response", error: "no usage" });
      finish("no-usage");
      break;
    }
    usage.input += u.prompt_tokens;
    usage.output += u.completion_tokens;
    cost += (u.prompt_tokens * price.input_per_mtok + u.completion_tokens * price.output_per_mtok) / 1e6;

    const msg = res.body.choices && res.body.choices[0] && res.body.choices[0].message;
    if (!msg) { log({ step: steps, kind: "response", usage: { input: u.prompt_tokens, output: u.completion_tokens }, cost_usd: cost, error: "no message" }); finish("failed"); break; }
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    log({
      step: steps, kind: "response", usage: { input: u.prompt_tokens, output: u.completion_tokens }, cost_usd: cost,
      content: msg.content == null ? null : redact(msg.content).slice(0, CLIP), tool_calls: calls.map((c) => label(c.function && c.function.name)),
    });
    messages.push({ role: "assistant", content: msg.content ?? null, ...(calls.length ? { tool_calls: calls } : {}) });

    if (cost > config.max_cost_usd) { finish("cost-cap"); break; }
    if (!calls.length) { finish("done"); break; }

    // Validate every call first: if any is invalid none run, and every call id still gets a reply.
    const checked = calls.map((c) => {
      const name = c.function && c.function.name;
      const def = defs.get(name);
      if (!def) return { c, error: `unknown tool "${label(name)}"` };
      const p = parseArgs(def, c.function.arguments);
      return p.error ? { c, error: p.error } : { c, name, args: p.value };
    });
    if (checked.some((x) => x.error)) {
      for (const x of checked) {
        messages.push({ role: "tool", tool_call_id: x.c.id, content: x.error ? `Invalid call, not run: ${x.error}. Send it again with valid arguments.` : "Not run: another call in this step was invalid. Send it again." });
      }
      if (schemaRetried) { finish("invalid-args"); break; }
      schemaRetried = true;
      retries++;
      log({ step: steps, kind: "retry", retry_kind: "schema" });
      continue;
    }
    schemaRetried = false;
    for (const x of checked) {
      let out, failed = false;
      try {
        const fn = tools[x.name];
        if (typeof fn !== "function") throw new Error(`tool "${label(x.name)}" has no implementation`);
        out = String(await fn(x.args));
      } catch (e) { out = safeError(e); failed = true; }
      out = redact(out);
      messages.push({ role: "tool", tool_call_id: x.c.id, content: out });
      log({ step: steps, kind: "tool_result", tool: label(x.name), error: failed, content: out.slice(0, CLIP) });
    }
  }
  return { stop, steps, usage, cost_usd: cost, retries, transcript };
}

// ---------- CLI ----------
function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!["--config", "--task", "--out", "--tools"].includes(a) || i + 1 >= argv.length || argv[i + 1].startsWith("--")) return null;
    f[a.slice(2)] = argv[++i];
  }
  return f.config && f.task && f.out ? f : null;
}
const readJson = (p, what) => {
  let t;
  try { t = readFileSync(p, "utf8"); } catch { bad(`can't read ${what}`); }
  try { return JSON.parse(t); } catch { bad(`${what} is not valid JSON`); }
};

export function runLog({ config, result, task, date, key }) {
  let input = (String(task).split(/\r?\n/).find((l) => l.trim()) || "task").replace(/\s+/g, " ").trim().slice(0, 120);
  if (key) input = input.split(key).join("[redacted]");
  if (LEAKS.some(([re]) => re.test(input))) input = "(task text withheld: it matched a privacy pattern)";
  return [
    `# Run log: ${config.agent} ${date}`, "", "```agentrun",
    `date: ${date}`, `agent: ${config.agent}`, `product: ${config.product}`, "tier: advisory", `model: ${config.model}`,
    `provider: ${config.provider}`, `weights: ${config.weights}`, `tokens: ${result.usage.input + result.usage.output}`,
    `cost_usd: ${result.cost_usd.toFixed(4)}`, `retries: ${result.retries}`, `input: ${input}`, `verdict: ${result.stop}`,
    "findings: 0", "p0: 0", "escalated: no", "```", "",
  ].join("\n");
}

export async function main(argv, { transport, sleep, now = () => new Date(), env = process.env } = {}) {
  const flags = parseFlags(argv);
  if (!flags) { console.error(USAGE); return 2; }
  try {
    const cfgPath = resolve(flags.config);
    const config = readJson(cfgPath, "the config");
    if (config && typeof config === "object" && "api_key" in config) bad("config has an api_key field: put the NAME of an env var in api_key_env instead");
    const rel = (p) => (isAbsolute(p) ? p : resolve(dirname(cfgPath), p));
    if (typeof config.prices_file !== "string") bad("config.prices_file is required");
    const prices = readJson(rel(config.prices_file), "the prices file");
    if (config.system_prompt_file) {
      try { config.system_prompt = readFileSync(rel(config.system_prompt_file), "utf8"); } catch { bad("can't read the system prompt file"); }
    }
    let task;
    try { task = readFileSync(flags.task, "utf8"); } catch { bad("can't read the task file"); }
    let tools = {};
    if (flags.tools) {
      try { tools = (await import(pathToFileURL(resolve(flags.tools)).href)).default; } catch { bad("can't load the tools file"); }
      if (!tools || typeof tools !== "object") bad("the tools file needs a default export {name: fn}");
    }
    checkConfig(config, prices); // before the output folder exists and before any request
    if (!env[config.api_key_env]) bad(`environment variable ${config.api_key_env} is not set`);

    const result = await runAgent({ config, prices, task, tools, transport, sleep, now, env });
    const out = resolve(flags.out);
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, "transcript.jsonl"), result.transcript.map((r) => JSON.stringify(r)).join("\n") + "\n");
    writeFileSync(resolve(out, "run.md"), runLog({ config, result, task, date: now().toISOString().slice(0, 10), key: env[config.api_key_env] }));
    console.log(`${result.stop}: ${result.steps} steps, $${result.cost_usd.toFixed(4)}`);
    if (result.stop === "failed") { console.error("the run failed: see transcript.jsonl in --out"); return 1; }
    return 0;
  } catch (e) {
    if (e instanceof ConfigError) { console.error(e.message); return 2; }
    console.error("agent-runner failed unexpectedly");
    return 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) process.exit(await main(process.argv.slice(2)));

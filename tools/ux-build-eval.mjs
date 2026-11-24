#!/usr/bin/env node
// ux-build-eval: harness for the UX build eval (docs/ux-build-eval-spec.md, UXB-1..15).
// Pure functions below do no I/O, no network and no model calls. Real runs (claude -p) live only in the CLI
// entry at the bottom; `--dry-run` there uses fakes. Tests never execute the CLI.
// Usage: node tools/ux-build-eval.mjs --dry-run [--prompts prompts.json]
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ARMS = ["plain", "ux"];
const VIEWPORTS = [[390, 844], [1280, 800]];
const REQUIRED_TYPES = ["app home", "list", "settings", "form", "landing", "dashboard", "empty state", "dialog"];
const CLEAN_IDS = ["CLEAN-1", "CLEAN-2", "CLEAN-3", "CLEAN-4", "CLEAN-5"];
const MAX_FEEDBACK_ROUNDS = 4;
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const isModel = (m, name) => typeof m === "string" && m.toLowerCase().includes(name);

// UXB-1
export function assertSameInputs({ plain, ux }) {
  if (sha(plain.prompt) !== sha(ux.prompt)) throw new Error("prompt hash differs between arms");
  for (const a of [plain, ux]) if (!isModel(a.model, "sonnet")) throw new Error(`arm model must be sonnet, got ${a.model}`);
}

// UXB-15
export function classifyRun(run) {
  if (run.error) return { status: "error", excluded: true, reason: run.error.kind || "error" };
  if (typeof run.html !== "string" || run.html.trim() === "") return { status: "error", excluded: true, reason: "empty output" };
  return { status: "ok", excluded: false };
}

// UXB-2: only resources the page would LOAD are rejected. A plain <a href> to a remote page is fine.
export function validateArmOutput(html) {
  const reasons = [];
  if (typeof html !== "string" || html.trim() === "") return { ok: false, status: "error", reasons: ["empty output"] };
  if (!/<html[\s>]|<!doctype html/i.test(html) || !/<body[\s>]/i.test(html)) reasons.push("not an HTML document");
  const remote = (v) => /^\s*(https?:|\/\/)/i.test(v);
  const attrsOf = (str) => {
    const out = {};
    for (const m of str.matchAll(/([^\s=\/"']+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
    return out;
  };
  for (const m of html.matchAll(/<([a-zA-Z][\w:-]*)\b([^>]*)>/g)) {
    const tag = m[1].toLowerCase();
    const at = attrsOf(m[2]);
    const hit = (v, what) => reasons.push(`remote reference: ${what} ${String(v).trim().slice(0, 60)}`);
    if (at.src !== undefined && remote(at.src)) hit(at.src, `${tag} src`);
    if (at.poster !== undefined && remote(at.poster)) hit(at.poster, `${tag} poster`);
    if (at.srcset !== undefined) for (const part of at.srcset.split(",")) if (remote(part)) { hit(part, `${tag} srcset`); break; }
    if (tag === "link" && at.href !== undefined && remote(at.href) && /\b(stylesheet|preload|modulepreload|prefetch)\b/i.test(at.rel || "")) hit(at.href, "link");
    if ((tag === "image" || tag === "use") && at.href !== undefined && remote(at.href)) hit(at.href, tag);
    if (tag === "object" && at.data !== undefined && remote(at.data)) hit(at.data, "object data");
  }
  for (const m of html.matchAll(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi)) if (remote(m[2])) reasons.push(`remote css url(): ${m[2].slice(0, 60)}`);
  for (const m of html.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi)) if (remote(m[1])) reasons.push(`remote @import: ${m[1].slice(0, 60)}`);
  for (const m of html.matchAll(/\b(?:fetch|WebSocket|EventSource|importScripts|import)\s*\(\s*["'`]\s*((?:https?:|\/\/)[^"'`]*)/g)) reasons.push(`remote script request: ${m[1].slice(0, 60)}`);
  for (const m of html.matchAll(/\.(?:open|sendBeacon)\s*\(\s*(?:["'`][A-Za-z]+["'`]\s*,\s*)?["'`]\s*((?:https?:|\/\/)[^"'`]*)/g)) reasons.push(`remote script request: ${m[1].slice(0, 60)}`);
  return reasons.length ? { ok: false, status: "error", reasons } : { ok: true, status: "ok", reasons: [] };
}

// UXB-3
export async function renderArm({ html, renderer }) {
  const shots = [];
  let consoleErrors = 0;
  for (const [width, height] of VIEWPORTS) {
    const r = await renderer({ html, width, height });
    shots.push(r.png);
    consoleErrors += r.consoleErrors || 0;
  }
  return { shots, consoleErrors };
}

// UXB-1, UXB-14: sequential, one at a time
export async function runArms({ prompt, runner, renderer, model, order = ARMS }) {
  assertSameInputs({ plain: { prompt: prompt.text, model }, ux: { prompt: prompt.text, model } });
  const runs = [];
  for (const arm of order) {
    let raw;
    try { raw = await runner({ arm, prompt, model }); } catch (e) { raw = { error: { kind: /timeout/i.test(e.message) ? "timeout" : "error" } }; }
    const run = { promptId: prompt.id, arm, tokens: raw.tokens ?? 0, costUsd: raw.costUsd ?? 0 };
    const c = classifyRun(raw);
    const v = c.status === "ok" ? validateArmOutput(raw.html) : { ok: false, reasons: [c.reason] };
    if (!v.ok) { runs.push({ ...run, status: "error", excluded: true, reasons: v.reasons }); continue; }
    let r;
    try { r = await renderArm({ html: raw.html, renderer }); } catch { runs.push({ ...run, status: "error", excluded: true, reasons: ["render failed"] }); continue; }
    runs.push({ ...run, status: "ok", excluded: false, ...r });
  }
  return { runs };
}

// UXB-4..6
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function checkPrompts(prompts, { bannedWords = [] } = {}) {
  const problems = [];
  if (!Array.isArray(prompts) || prompts.length < 8) problems.push("need at least 8 prompts");
  const list = Array.isArray(prompts) ? prompts : [];
  for (const p of list) for (const f of ["id", "type", "split", "text"]) if (typeof p?.[f] !== "string" || !p[f].trim()) problems.push(`${p?.id ?? "?"}: missing ${f}`);
  for (const t of REQUIRED_TYPES) if (!list.some((p) => p?.type === t)) problems.push(`missing type: ${t}`);
  const held = list.filter((p) => p?.split === "heldout").length;
  if (held !== 3) problems.push(`need exactly 3 heldout, found ${held}`);
  if (list.some((p) => p?.split && !["dev", "heldout"].includes(p.split))) problems.push("split must be dev or heldout");
  const res = bannedWords.map((w) => [w, new RegExp(`(?<![A-Za-z0-9])${escapeRe(w).replace(/\\? /g, "\\s+")}(?![A-Za-z0-9])`, "i")]);
  for (const p of list) {
    const text = typeof p?.text === "string" ? p.text : "";
    for (const [w, re] of res) if (re.test(text)) problems.push(`${p.id}: banned word "${w}"`);
    if (/lorem\s+ipsum/i.test(text)) problems.push(`${p.id}: lorem ipsum`);
    // product, user and job in plain words: at least three sentences (product, user, job)
    if (text && text.split(/[.!?]+\s*/).filter((s) => s.trim()).length < 3) problems.push(`${p.id}: must state product, user and job`);
  }
  return { ok: problems.length === 0, problems };
}

// Optional {file}: the ledger is loaded from and saved to that JSON file, so it survives between CLI runs.
export function createHeldoutLedger({ file } = {}) {
  let seen = new Set();
  if (file && existsSync(file)) { try { seen = new Set(JSON.parse(readFileSync(file, "utf8"))); } catch { /* start empty */ } }
  return {
    record(changeId) {
      if (seen.has(changeId)) throw new Error(`held-out already run for change ${changeId}`);
      seen.add(changeId);
      if (file) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify([...seen], null, 2)); }
    },
  };
}

// UXB-7
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffleAndMap(pairs, seed) {
  const next = rng(seed);
  const presented = [], mapping = {};
  for (const p of pairs) {
    const swap = next() < 0.5;
    const order = swap ? ["ux", "plain"] : ["plain", "ux"];
    mapping[p.promptId] = { A: order[0], B: order[1] };
    presented.push({ promptId: p.promptId, job: p.job, arms: { A: { shots: [...p.arms[order[0]].shots] }, B: { shots: [...p.arms[order[1]].shots] } } });
  }
  return { presented, mapping };
}
export function graderInput(presented) {
  return { screenshots: [...presented.arms.A.shots, ...presented.arms.B.shots], job: presented.job };
}

// UXB-8
export function scoreRecord(grading, { armModel } = {}) {
  const reasons = [];
  if (!grading?.graderModel) reasons.push("grader model not named");
  else if (armModel && String(grading.graderModel).toLowerCase() === String(armModel).toLowerCase()) reasons.push("grader must differ from the arm model");
  for (const label of ["A", "B"]) {
    const g = grading?.[label];
    for (const id of CLEAN_IDS) if (typeof g?.clean?.[id] !== "boolean") reasons.push(`${label}: ${id} missing`);
    if (!Number.isFinite(g?.polish) || g.polish < 0 || g.polish > 10) reasons.push(`${label}: polish must be 0-10`);
  }
  return { ok: reasons.length === 0, reasons };
}

// UXB-10
export function checkFeedback(lines, key) {
  const ids = new Set([...String(key).matchAll(/^\|\s*(\d+)\s*\|/gm)].map((m) => m[1]));
  const badLines = [];
  lines.forEach((line, i) => {
    const byId = [...line.matchAll(/\bitems?\s+#?(\d+)/gi)].some((m) => ids.has(m[1]));
    const byQuote = [...line.matchAll(/"([^"]+)"/g)].some((m) => String(key).includes(m[1]));
    if (!byId && !byQuote) badLines.push(i);
  });
  return { ok: badLines.length === 0, badLines };
}

const isGood = (r) => r.polish >= 8 && r.cleanFailures.length === 0;
export async function runFeedbackLoop({ build, grade, feedback }) {
  const rounds = [];
  let artifact = await build(null);
  for (let round = 0; ; round++) {
    const g = await grade(artifact);
    rounds.push({ round, polish: g.polish, cleanFailures: g.cleanFailures || [] });
    if (isGood(rounds[round]) || round >= MAX_FEEDBACK_ROUNDS) break;
    artifact = await build(await feedback(artifact, g));
  }
  return rounds;
}

// UXB-11
export function roundsToGood(rounds) {
  for (const r of rounds) if (!Number.isFinite(r?.polish) || !Array.isArray(r?.cleanFailures)) throw new Error("each round must log polish and CLEAN results");
  const hit = rounds.find((r) => r.round <= MAX_FEEDBACK_ROUNDS && isGood(r));
  return hit ? hit.round : "not reached";
}

// UXB-13
export function checkResults(res) {
  const missing = ["n", "arms", "armModels", "graderModel", "split", "changeId", "cost", "limits"].filter((k) => res?.[k] === undefined || res[k] === null);
  const reasons = missing.map((k) => `missing ${k}`);
  if (!missing.includes("limits") && !(Array.isArray(res.limits) && res.limits.length > 0)) reasons.push("limits list is empty");
  return { ok: reasons.length === 0, missing, reasons };
}

// UXB-15
// wins: pairs where the arm scored higher. losses: pairs where it scored lower. A pair with an errored arm is
// excluded, so an error is never a loss for either arm (UXB-15).
export function tally(runs) {
  const byPair = {};
  for (const r of runs) ((byPair[r.promptId] ??= {})[r.run ?? 0] ??= {})[r.arm] = r;
  const out = { scored: {}, wins: { plain: 0, ux: 0 }, losses: { plain: 0, ux: 0 }, ties: 0, meanPolish: { plain: 0, ux: 0 }, perPrompt: {} };
  const sum = { plain: 0, ux: 0 };
  let n = 0;
  for (const [id, byRun] of Object.entries(byPair)) {
    const pp = { plain: 0, ux: 0, scoredPairs: 0 };
    for (const a of Object.values(byRun)) {
      if (a.plain?.status !== "ok" || a.ux?.status !== "ok") continue;
      pp.plain += a.plain.polish; pp.ux += a.ux.polish; pp.scoredPairs++;
      if (a.plain.polish === a.ux.polish) out.ties++;
      else { const w = a.ux.polish > a.plain.polish ? "ux" : "plain"; out.wins[w]++; out.losses[w === "ux" ? "plain" : "ux"]++; }
    }
    if (!pp.scoredPairs) continue;
    sum.plain += pp.plain; sum.ux += pp.ux; n += pp.scoredPairs;
    pp.plain /= pp.scoredPairs; pp.ux /= pp.scoredPairs;
    out.perPrompt[id] = pp;
    out.scored[id] = { plain: pp.plain, ux: pp.ux };
  }
  if (n) out.meanPolish = { plain: sum.plain / n, ux: sum.ux / n };
  return out;
}
export function resumePoint(promptIds, runs) {
  const done = new Set(runs.filter((r) => r.status === "ok").map((r) => r.promptId));
  return promptIds.find((id) => !done.has(id)) ?? null;
}

// ---- Real runner pieces (UXB-1, 2, 3, 5, 7, 8, 13, 14, 15). Spawn, mkdtemp, renderer and grader are injectable.
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PLUGIN_DIR = resolve(HERE, "..", "plugins", "studio");
const PROMPT_SUFFIX = "\n\nWrite the finished screen as one self-contained file named index.html in your working directory. Inline all CSS and JS, no remote URLs, no external fonts or images.";

// Both arms get the identical prompt; the only difference is the role file (--agent) on the ux arm. `--` ends the
// variadic --tools list so the prompt stays the last argument.
export function buildClaudeArgs({ arm, prompt, model, dir, pluginDir = DEFAULT_PLUGIN_DIR }) {
  const args = ["-p", "--model", model, "--output-format", "json", "--tools", "Write", "--permission-mode", "acceptEdits"];
  if (dir) args.push("--add-dir", dir);
  if (arm === "ux") args.push("--agent", "ux-reviewer", "--plugin-dir", pluginDir);
  args.push("--", `${prompt.text}${PROMPT_SUFFIX}`);
  return args;
}

const defaultSpawn = (cmd, args, opts) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
const defaultMkdtemp = (prefix) => mkdtempSync(join(tmpdir(), prefix));
const failKind = (r) => {
  if (r.error?.code === "ETIMEDOUT" || /ETIMEDOUT|timed? ?out/i.test(r.error?.message || "") || (r.signal && r.status == null)) return "timeout";
  if (/rate.?limit|429|overloaded/i.test(`${r.stderr || ""}${r.stdout || ""}`)) return "rate_limit";
  return r.error ? "spawn_error" : "exit_nonzero";
};

export async function runClaudeArm({ arm, prompt, model, spawn = defaultSpawn, mkdtemp = defaultMkdtemp, timeout = 900000, pluginDir }) {
  try {
    const dir = await mkdtemp(`uxb-${arm}-`);
    const r = await spawn("claude", buildClaudeArgs({ arm, prompt, model, dir, pluginDir }), { cwd: dir, timeout });
    if (!r || r.error || r.status !== 0) return { error: { kind: failKind(r || {}) } };
    let j = {};
    try { j = JSON.parse(r.stdout); } catch { /* usage unknown */ }
    const file = join(dir, "index.html");
    const html = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (html.trim() === "") return { error: { kind: "no_output" } };
    return { html, tokens: (j.usage?.input_tokens ?? 0) + (j.usage?.output_tokens ?? 0), costUsd: j.total_cost_usd ?? 0 };
  } catch (e) {
    return { error: { kind: /timeout|ETIMEDOUT/i.test(e.message) ? "timeout" : "error" } };
  }
}

function loadPlaywright() {
  const tries = [import.meta.url, pathToFileURL(join(process.cwd(), "x.js")).href];
  for (const base of tries) { try { return createRequire(base)("playwright"); } catch { /* next */ } }
  for (const p of (process.env.NODE_PATH || "").split(":").filter(Boolean)) { try { return createRequire(import.meta.url)(join(p, "playwright")); } catch { /* next */ } }
  return createRequire(import.meta.url)("playwright"); // throws the real error
}
const heightFor = (w) => (w <= 600 ? 844 : 800);

// Real Playwright, chromium with no launch options. Remote http(s) requests are aborted and counted (UXB-2).
export async function renderShots({ html, widths = [390, 1280], outDir }) {
  const { chromium } = loadPlaywright();
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const shots = [];
  let consoleErrors = 0, remoteRequests = 0;
  try {
    for (const width of widths) {
      const ctx = await browser.newContext({ viewport: { width, height: heightFor(width) } });
      const page = await ctx.newPage();
      page.on("pageerror", () => { consoleErrors++; });
      page.on("console", (m) => { if (m.type() === "error") consoleErrors++; });
      await page.route(/^(https?|wss?|ftp):|^\/\//i, (route) => { remoteRequests++; return route.abort(); });
      await page.setContent(html, { waitUntil: "load" });
      const file = join(outDir, `shot-${width}x${heightFor(width)}.png`);
      await page.screenshot({ path: file, fullPage: true });
      shots.push(file);
      await ctx.close();
    }
  } finally { await browser.close(); }
  return { shots, consoleErrors, remoteRequests, ok: remoteRequests === 0 };
}

// UXB-7: job and four image paths only. No prompt text, no arm or role names.
export function buildGraderPrompt({ job, pairShotsAB }) {
  const { A, B } = pairShotsAB;
  return [
    "You are grading two versions of one screen, A and B. Judge only what you see.",
    `What the screen is for: ${job}`,
    "Open each image file with the Read tool before you grade. Each version has a phone-width image (390 wide) then a desktop-width image (1280 wide).",
    `Version A: ${A[0]} then ${A[1]}`,
    `Version B: ${B[0]} then ${B[1]}`,
    "For each version, pass or fail each rule (true = passes):",
    "1. White space: room to breathe, nothing cramped, consistent gaps.",
    "2. One or two fonts only, with clear sizes.",
    "3. A limited color palette with one accent.",
    "4. Alignment and a grid: edges line up.",
    "5. Consistency: the same thing looks the same everywhere.",
    "Then give each version a polish score from 0 to 10 for how finished and generally acceptable it looks.",
    'Reply with only this JSON: {"A":{"clean":[true,true,true,true,true],"polish":0},"B":{"clean":[true,true,true,true,true],"polish":0}}',
  ].join("\n");
}

// UXB-8: a reply that is not the exact shape is an error, never a score.
export function parseGrade(text) {
  const t = String(text ?? "").trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1);
  let g;
  try { g = JSON.parse(body); } catch { return { error: { kind: "unparseable" } }; }
  for (const k of ["A", "B"]) {
    const x = g?.[k];
    if (!x || !Array.isArray(x.clean) || x.clean.length !== 5 || !x.clean.every((v) => typeof v === "boolean")) return { error: { kind: "bad_clean" } };
    if (typeof x.polish !== "number" || !Number.isFinite(x.polish) || x.polish < 0 || x.polish > 10) return { error: { kind: "bad_polish" } };
  }
  return { grade: { A: g.A, B: g.B } };
}

const seedOf = (s) => parseInt(sha(s).slice(0, 8), 16);
const jobOf = (p) => p.job ?? (String(p.text).split(/(?<=[.!?])\s+/)[1] || String(p.text));
const limits = [
  "One Sonnet run per arm per prompt: n is small, so wins and losses are noisy.",
  "A single Opus grader scores looks from screenshots only, and A/B order is shuffled per pair.",
  "Grader cost is included only if the grader reports it.",
  "Dev results are for tuning; held-out is run once per change id.",
];

// Grader spawn lives here so it can be tested with a fake spawn. Returns {text, costUsd} or {error:{kind}}.
export async function runClaudeGrader({ job, pairShotsAB, spawn = defaultSpawn, mkdtemp = defaultMkdtemp, timeout = 600000 }) {
  try {
    const dirs = [...new Set([...pairShotsAB.A, ...pairShotsAB.B].map((f) => dirname(f)))];
    const args = ["-p", "--model", "opus", "--output-format", "json", "--tools", "Read", "--permission-mode", "acceptEdits", ...dirs.flatMap((d) => ["--add-dir", d]), "--", buildGraderPrompt({ job, pairShotsAB })];
    const cwd = await mkdtemp("uxb-grade-");
    const r = await spawn("claude", args, { cwd, timeout });
    if (!r || r.error || r.status !== 0) return { error: { kind: failKind(r || {}) } };
    let j;
    try { j = JSON.parse(r.stdout); } catch { return { error: { kind: "bad_json" } }; }
    return { text: String(j.result ?? ""), costUsd: j.total_cost_usd ?? 0 };
  } catch (e) {
    return { error: { kind: /timeout|ETIMEDOUT/i.test(e.message) ? "timeout" : "error" } };
  }
}

// Copy shots to neutral dirs (shotsRoot/s1, s2, ...) so the grader never sees arm names, the change id or --out.
function stageShots(shots, root, next) {
  const dir = join(root, `s${next()}`);
  mkdirSync(dir, { recursive: true });
  return shots.map((src, i) => {
    const dst = join(dir, `v${i + 1}.png`);
    copyFileSync(src, dst);
    return dst;
  });
}

export async function runDevSet({ prompts, split = "dev", ledger, runner, renderer, grader, changeId, model = "sonnet", graderModel = "opus", outFile, runs: runsPerArm = 1, shotsRoot }) {
  const set = prompts.filter((p) => p.split === split);
  if (split === "heldout") (ledger ??= createHeldoutLedger()).record(changeId);
  const root = resolve(shotsRoot ?? defaultMkdtemp("uxb-shots-"));
  let counter = 0;
  const nextDir = () => ++counter;
  const runs = [], pairs = [], mapping = {}, gradings = {};
  let cost = 0;
  for (const p of set) {
    for (let run = 0; run < runsPerArm; run++) {
      const order = seedOf(`${changeId}:${p.id}:${run}:order`) % 2 ? ["ux", "plain"] : ["plain", "ux"];
      const { runs: pr } = await runArms({ prompt: p, runner, renderer, model, order });
      for (const r of pr) r.run = run;
      const byArm = Object.fromEntries(pr.map((r) => [r.arm, r]));
      cost += pr.reduce((a, r) => a + (r.costUsd || 0), 0);
      let reason;
      if (byArm.plain.status === "ok" && byArm.ux.status === "ok" && ![...byArm.plain.shots, ...byArm.ux.shots].every((s) => s && existsSync(s))) {
        reason = "no screenshot";
        for (const r of pr) { r.status = "error"; r.excluded = true; r.reasons = [reason]; }
      } else if (byArm.plain.status === "ok" && byArm.ux.status === "ok") {
        const pair = { promptId: p.id, job: jobOf(p), arms: { plain: { shots: byArm.plain.shots }, ux: { shots: byArm.ux.shots } } };
        const { presented, mapping: m } = shuffleAndMap([pair], seedOf(`${changeId}:${p.id}:${run}`));
        const pairShotsAB = { A: stageShots(presented[0].arms.A.shots, root, nextDir), B: stageShots(presented[0].arms.B.shots, root, nextDir) };
        const raw = await grader({ job: pair.job, pairShotsAB });
        const text = typeof raw === "string" ? raw : raw?.text;
        cost += typeof raw === "object" ? raw?.costUsd || 0 : 0;
        const g = raw?.error ? { error: raw.error } : parseGrade(text);
        const toRec = (x) => ({ clean: Object.fromEntries(CLEAN_IDS.map((id, i) => [id, x.clean[i]])), polish: x.polish });
        const ok = !g.error && scoreRecord({ graderModel, A: toRec(g.grade.A), B: toRec(g.grade.B) }, { armModel: model }).ok;
        if (ok) {
          mapping[`${p.id}#${run}`] = m[p.id];
          if (run === 0) mapping[p.id] = m[p.id];
          gradings[`${p.id}#${run}`] = { A: toRec(g.grade.A), B: toRec(g.grade.B) };
          if (run === 0) gradings[p.id] = gradings[`${p.id}#${run}`];
          for (const label of ["A", "B"]) {
            const r = byArm[m[p.id][label]];
            r.polish = g.grade[label].polish;
            r.cleanFailures = CLEAN_IDS.filter((id, i) => !g.grade[label].clean[i]);
          }
        } else {
          reason = `grader: ${g.error?.kind || "invalid grading"}`;
          for (const r of pr) { r.status = "error"; r.excluded = true; r.reasons = [reason]; }
        }
      } else reason = pr.filter((r) => r.status !== "ok").flatMap((r) => r.reasons || []).join("; ") || "arm error";
      const okPair = byArm.plain.status === "ok" && byArm.ux.status === "ok";
      pairs.push({
        promptId: p.id, run, order: pr.map((r) => r.arm),
        scores: okPair ? { plain: byArm.plain.polish, ux: byArm.ux.polish } : { plain: null, ux: null },
        status: okPair ? "ok" : "error", ...(okPair ? {} : { reason }),
      });
      runs.push(...pr);
    }
  }
  const t = tally(runs);
  const summary = { scoredPairs: pairs.filter((x) => x.status === "ok").length, erroredPairs: pairs.filter((x) => x.status === "error").length, wins: t.wins, ties: t.ties, meanPolish: t.meanPolish, perPrompt: t.perPrompt };
  const res = {
    schemaVersion: 1,
    n: { prompts: set.length, runsPerArm, scoredPairs: summary.scoredPairs },
    arms: ARMS, armModels: { plain: model, ux: model }, graderModel, split, changeId, cost, limits,
    pairs, summary,
    scored: t.scored, tally: t, mapping, gradings,
    runs,
  };
  if (outFile) { mkdirSync(dirname(resolve(outFile)), { recursive: true }); writeFileSync(outFile, JSON.stringify(res, null, 2)); }
  return res;
}

// ---- CLI (never run by tests). --dry-run uses fakes; otherwise real `claude -p` arms, Playwright and an Opus grader.
const REPO_ROOT = resolve(HERE, "..");
export function cliPaths({ changeId, root = REPO_ROOT }) {
  const dir = join(root, "evals", "ux-build", "results");
  return { outFile: join(dir, `${changeId}.json`), shotsRoot: join(dir, ".shots") };
}
function flag(argv, name, dflt) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; }
export function parseCliArgs(argv) {
  const rawRuns = flag(argv, "--runs", "1");
  if (!/^\d+$/.test(String(rawRuns)) || Number(rawRuns) < 1) throw new Error(`--runs must be a positive integer, got ${rawRuns}`);
  const changeId = flag(argv, "--change-id");
  return {
    dryRun: argv.includes("--dry-run"), runs: Number(rawRuns), changeId, split: flag(argv, "--split", "dev"),
    prompts: flag(argv, "--prompts"), pluginDir: flag(argv, "--plugin-dir", DEFAULT_PLUGIN_DIR),
    out: flag(argv, "--out") ?? (changeId ? cliPaths({ changeId }).outFile : undefined),
  };
}

async function main(argv) {
  const args = parseCliArgs(argv);
  const prompts = args.prompts ? JSON.parse(readFileSync(args.prompts, "utf8")) : [{ id: "dry", type: "app home", split: "dev", text: "Dry run." }];
  if (args.dryRun) {
    const goodHtml = '<!doctype html><html><body><p>dry run</p></body></html>';
    const renderer = async ({ width, height }) => ({ png: `shot-${width}x${height}.png`, consoleErrors: 0 });
    for (const p of prompts) {
      const out = await runArms({ prompt: p, runner: async () => ({ html: goodHtml, tokens: 0, costUsd: 0 }), renderer, model: "sonnet" });
      console.log(JSON.stringify({ promptId: p.id, runs: out.runs.map(({ html, ...r }) => r) }));
    }
    return;
  }
  const { changeId, split, pluginDir, out: outFile } = args;
  if (!changeId) throw new Error("real run needs --change-id <id> (or use --dry-run)");
  const shotsRoot = cliPaths({ changeId }).shotsRoot;
  mkdirSync(shotsRoot, { recursive: true });
  const ledger = createHeldoutLedger({ file: join(dirname(resolve(outFile)), ".heldout-ledger.json") });
  const runner = (a) => runClaudeArm({ ...a, pluginDir });
  const renderer = async ({ html, width, height }) => {
    const r = await renderShots({ html, widths: [width], outDir: mkdtempSync(join(shotsRoot, "r-")) });
    if (!r.shots[0] || !existsSync(r.shots[0])) throw new Error("render produced no screenshot");
    return { png: r.shots[0], consoleErrors: r.consoleErrors };
  };
  const res = await runDevSet({ prompts, split, ledger, runner, renderer, grader: runClaudeGrader, changeId, model: "sonnet", outFile, runs: args.runs, shotsRoot });
  console.log(JSON.stringify({ outFile, split, changeId, n: res.n, wins: res.tally.wins, ties: res.tally.ties, cost: res.cost }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
}

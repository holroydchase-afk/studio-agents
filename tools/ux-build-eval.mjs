#!/usr/bin/env node
// ux-build-eval: harness for the UX build eval (docs/ux-build-eval-spec.md, UXB-1..15).
// Pure functions below do no I/O, no network and no model calls. Real runs (claude -p) live only in the CLI
// entry at the bottom; `--dry-run` there uses fakes. Tests never execute the CLI.
// Usage: node tools/ux-build-eval.mjs --dry-run [--prompts prompts.json]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

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

// UXB-2
export function validateArmOutput(html) {
  const reasons = [];
  if (typeof html !== "string" || html.trim() === "") return { ok: false, status: "error", reasons: ["empty output"] };
  if (!/<html[\s>]|<!doctype html/i.test(html) || !/<body[\s>]/i.test(html)) reasons.push("not an HTML document");
  const remote = (v) => /^\s*(https?:|\/\/)/i.test(v);
  for (const m of html.matchAll(/\b(?:src|srcset|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const v = m[1] ?? m[2] ?? m[3] ?? "";
    // srcset may hold several urls
    for (const part of v.split(",")) if (remote(part)) { reasons.push(`remote reference: ${part.trim().slice(0, 60)}`); break; }
  }
  for (const m of html.matchAll(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi)) if (remote(m[2])) reasons.push(`remote css url(): ${m[2].slice(0, 60)}`);
  for (const m of html.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi)) if (remote(m[1])) reasons.push(`remote @import: ${m[1].slice(0, 60)}`);
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
export async function runArms({ prompt, runner, renderer, model }) {
  assertSameInputs({ plain: { prompt: prompt.text, model }, ux: { prompt: prompt.text, model } });
  const runs = [];
  for (const arm of ARMS) {
    let raw;
    try { raw = await runner({ arm, prompt, model }); } catch (e) { raw = { error: { kind: /timeout/i.test(e.message) ? "timeout" : "error" } }; }
    const run = { promptId: prompt.id, arm, tokens: raw.tokens ?? 0, costUsd: raw.costUsd ?? 0 };
    const c = classifyRun(raw);
    const v = c.status === "ok" ? validateArmOutput(raw.html) : { ok: false, reasons: [c.reason] };
    if (!v.ok) { runs.push({ ...run, status: "error", excluded: true, reasons: v.reasons }); continue; }
    const r = await renderArm({ html: raw.html, renderer });
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

export function createHeldoutLedger() {
  const seen = new Set();
  return { record(changeId) { if (seen.has(changeId)) throw new Error(`held-out already run for change ${changeId}`); seen.add(changeId); } };
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
  const byPrompt = {};
  for (const r of runs) (byPrompt[r.promptId] ??= {})[r.arm] = r;
  const out = { scored: {}, wins: { plain: 0, ux: 0 }, losses: { plain: 0, ux: 0 }, ties: 0 };
  for (const [id, a] of Object.entries(byPrompt)) {
    if (a.plain?.status !== "ok" || a.ux?.status !== "ok") continue;
    out.scored[id] = { plain: a.plain.polish, ux: a.ux.polish };
    if (a.plain.polish === a.ux.polish) out.ties++;
    else { const w = a.ux.polish > a.plain.polish ? "ux" : "plain"; out.wins[w]++; out.losses[w === "ux" ? "plain" : "ux"]++; }
  }
  return out;
}
export function resumePoint(promptIds, runs) {
  const done = new Set(runs.filter((r) => r.status === "ok").map((r) => r.promptId));
  return promptIds.find((id) => !done.has(id)) ?? null;
}

// ---- CLI (never run by tests). Real arms call `claude -p`; --dry-run uses fakes.
async function main(argv) {
  const dry = argv.includes("--dry-run");
  const pi = argv.indexOf("--prompts");
  const prompts = pi >= 0 ? JSON.parse(readFileSync(argv[pi + 1], "utf8")) : [{ id: "dry", type: "app home", split: "dev", text: "Dry run." }];
  const goodHtml = '<!doctype html><html><body><p>dry run</p></body></html>';
  const fakeRunner = async () => ({ html: goodHtml, tokens: 0, costUsd: 0 });
  const realRunner = async ({ arm, prompt, model }) => {
    const sys = arm === "ux" ? ["--append-system-prompt", "Act as the ux-reviewer agent but BUILD the screen. Output one self-contained HTML file only."] : [];
    const r = spawnSync("claude", ["-p", "--model", model, "--output-format", "json", ...sys, `${prompt.text}\nReturn one self-contained HTML file, no remote URLs.`], { encoding: "utf8", timeout: 600000 });
    if (r.error || r.status !== 0) return { error: { kind: r.error?.code === "ETIMEDOUT" ? "timeout" : "error" } };
    const j = JSON.parse(r.stdout);
    const html = String(j.result ?? "").replace(/^```html\s*|```\s*$/g, "");
    return { html, tokens: (j.usage?.input_tokens ?? 0) + (j.usage?.output_tokens ?? 0), costUsd: j.total_cost_usd ?? 0 };
  };
  const renderer = async ({ width, height }) => ({ png: `shot-${width}x${height}.png`, consoleErrors: 0 });
  for (const p of prompts) {
    const out = await runArms({ prompt: p, runner: dry ? fakeRunner : realRunner, renderer, model: "sonnet" });
    console.log(JSON.stringify({ promptId: p.id, runs: out.runs.map(({ html, ...r }) => r) }));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
}

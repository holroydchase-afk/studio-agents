#!/usr/bin/env node
// eval-protocol: a frozen, two-order, per-prompt eval method (docs/product/SPEC-EVAL-PROTOCOL.md).
//   freeze --prompts F --rubric F --out frozen.json   hash the prompt set and rubric before any agent edit
//   verify frozen.json                                exit 1 if either file changed or is missing
//   check-run results.json                            validate a v2 run (6 votes per pair, tokens, hashes); v1 runs pass untouched
//   report results.json [--json]                      per-prompt tallies, sign test, Wilson, flip rate, cost per win
//   reply-checks reply.md [--json]                    code checks on a reply: dated next step, asks, lint-ok lines, words
// v1 runs (one vote, order unknown) are never recomputed. Pairs are not independent: the prompt is the unit.
// Exit 0 ok, 1 problems found, 2 usage or unreadable input.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { signP, wilson } from "./studio-scorecard.mjs";

const USAGE = "usage: eval-protocol.mjs freeze --prompts F --rubric F --out F | verify frozen.json | check-run results.json | report results.json [--json] | reply-checks reply.md [--json]";
const BASE_ARMS = ["agent", "plain-rules", "cross", "orchestrated"];
export const armOk = (a) => BASE_ARMS.includes(a) || (typeof a === "string" && /^ablate:.+/.test(a));
const NM = "not measured";

class Usage extends Error {}
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const readText = (p) => { try { return readFileSync(p, "utf8"); } catch { throw new Usage(`cannot read ${p}`); } };
const readJson = (p) => { try { return JSON.parse(readText(p)); } catch (e) { throw e instanceof Usage ? e : new Usage(`bad JSON in ${p}`); } };
const isV1 = (j) => !j || typeof j !== "object" || j.schema === undefined || j.schema === 1;

// ---------- freeze / verify
function freeze(args) {
  const a = flags(args, ["--prompts", "--rubric", "--out"]);
  if (!a["--prompts"] || !a["--rubric"] || !a["--out"]) throw new Usage(USAGE);
  const rec = (p) => { readText(p); return { file: basename(p), sha256: sha(p) }; };
  const j = { schema: 1, date: new Date().toISOString().slice(0, 10), prompts: rec(a["--prompts"]), rubric: rec(a["--rubric"]) };
  writeFileSync(a["--out"], JSON.stringify(j, null, 2) + "\n");
  console.log(`frozen: ${j.prompts.file}, ${j.rubric.file}`);
  return 0;
}
function verify(args) {
  if (args.length !== 1) throw new Usage(USAGE);
  const j = readJson(args[0]);
  const dir = dirname(resolve(args[0]));
  const bad = [];
  for (const k of ["prompts", "rubric"]) {
    const r = j[k];
    if (!r || typeof r.file !== "string" || !/^[0-9a-f]{64}$/.test(r.sha256 || "")) throw new Usage(`frozen.json has no valid ${k} entry`);
    let now = null;
    try { now = sha(join(dir, basename(r.file))); } catch { /* missing */ }
    if (now === null) bad.push(`${r.file}: missing`);
    else if (now !== r.sha256) bad.push(`${r.file}: changed since freeze`);
  }
  if (bad.length) { console.log(bad.join("\n")); return 1; }
  console.log("frozen files match");
  return 0;
}

// ---------- check-run
const hex = (s) => typeof s === "string" && /^[0-9a-f]{64}$/.test(s);
const tokenOk = (t) => (typeof t === "number" && Number.isFinite(t) && t >= 0) || t === NM;

export function checkRun(j) {
  const out = [];
  if (j.schema !== 2) out.push("schema must be 2");
  if (typeof j.date !== "string" || !j.date) out.push("date missing");
  for (const k of ["grader_model", "agent_model"]) if (typeof j[k] !== "string" || !j[k]) out.push(`${k} missing`);
  const arms = j.arms && typeof j.arms === "object" ? j.arms : null;
  if (!arms) out.push("arms missing");
  else {
    for (const k of ["agent", "plain"]) if (!arms[k]) out.push(`arms.${k} missing`);
    for (const [k, v] of Object.entries(arms)) if (!tokenOk(v && v.tokens)) out.push(`arms.${k}.tokens must be a number or "${NM}"`);
  }
  const fz = j.frozen || {};
  for (const k of ["prompts_sha256", "rubric_sha256"]) if (!hex(fz[k])) out.push(`frozen.${k} must be 64 hex characters`);
  if (!Array.isArray(j.pairs)) { out.push("pairs missing"); return out; }
  j.pairs.forEach((p, i) => {
    const at = `pairs[${i}]`;
    if (!p || typeof p !== "object") { out.push(`${at} is not an object`); return; }
    if (typeof p.prompt !== "string" || !p.prompt) out.push(`${at}.prompt missing`);
    if (!armOk(p.arm)) out.push(`${at}.arm must be agent, plain-rules, cross, orchestrated or ablate:<component>`);
    else if (arms && !arms[p.arm]) out.push(`${at}.arm ${p.arm} is not declared in arms`);
    if (!Array.isArray(p.votes) || p.votes.length !== 6) { out.push(`${at}.votes must have exactly 6 entries`); return; }
    let orderOk = true;
    p.votes.forEach((v, k) => {
      if (!v || (v.order !== "AB" && v.order !== "BA")) { out.push(`${at}.votes[${k}].order must be AB or BA`); orderOk = false; }
      if (!v || !(v.winner === "plain" || v.winner === "tie" || armOk(v.winner))) out.push(`${at}.votes[${k}].winner must be plain, tie or an arm name`);
      else if (v.winner !== "tie" && v.winner !== "plain" && v.winner !== p.arm) out.push(`${at}.votes[${k}].winner ${v.winner} does not match the pair's arm`);
    });
    if (orderOk && (p.votes.filter((v) => v.order === "AB").length !== 3)) out.push(`${at}.votes needs 3 AB and 3 BA`);
  });
  return out;
}
function checkRunCmd(args) {
  if (args.length !== 1) throw new Usage(USAGE);
  const j = readJson(args[0]);
  if (isV1(j)) { console.log("v1 run: single grader vote, no votes recorded, not validated as v2"); return 0; }
  const bad = checkRun(j);
  if (bad.length) { console.log(bad.join("\n")); return 1; }
  console.log(`ok: ${j.pairs.length} pairs`);
  return 0;
}

// ---------- report
const count = (votes, who, order) => votes.filter((v) => v.winner === who && (!order || v.order === order)).length;
const orderMajority = (votes, arm, order) => (count(votes, arm, order) >= 2 ? arm : count(votes, "plain", order) >= 2 ? "plain" : "tie");
export function pairVerdict(p) {
  for (const who of [p.arm, "plain"]) {
    if (count(p.votes, who) >= 4 && count(p.votes, who, "AB") >= 2 && count(p.votes, who, "BA") >= 2) return who;
  }
  return "tie";
}
const flipped = (p) => orderMajority(p.votes, p.arm, "AB") !== orderMajority(p.votes, p.arm, "BA");

export function buildReport(j) {
  if (isV1(j)) {
    return {
      version: 1,
      note: "v1: single vote, order unknown, not recomputed",
      stored_tally: j && j.tally ? j.tally : null,
      stored_per_prompt: j && j.per_prompt ? j.per_prompt : null,
      flip_rate: "not available",
      verdict: "not proven",
    };
  }
  const pairs = j.pairs.map((p) => ({ ...p, verdict: pairVerdict(p), flip: flipped(p) }));
  const flips = pairs.filter((p) => p.flip).length;
  const arms = {};
  const armNames = [...new Set(pairs.map((p) => p.arm))].sort((a, b) => (a === "agent" ? -1 : b === "agent" ? 1 : a.localeCompare(b)));
  for (const arm of armNames) {
    const mine = pairs.filter((p) => p.arm === arm);
    if (!mine.length) continue;
    const wins = mine.filter((p) => p.verdict === arm).length;
    const losses = mine.filter((p) => p.verdict === "plain").length;
    const ties = mine.length - wins - losses;
    const byPrompt = new Map();
    for (const p of mine) {
      const t = byPrompt.get(p.prompt) || { prompt: p.prompt, wins: 0, losses: 0, ties: 0 };
      if (p.verdict === arm) t.wins++; else if (p.verdict === "plain") t.losses++; else t.ties++;
      byPrompt.set(p.prompt, t);
    }
    const prompts = [...byPrompt.values()].map((t) => ({ ...t, outcome: t.wins > t.losses ? arm : t.wins < t.losses ? "plain" : "tie" }));
    const pw = prompts.filter((t) => t.outcome === arm).length;
    const pl = prompts.filter((t) => t.outcome === "plain").length;
    const dec = pw + pl;
    const sp = signP(pw, pl);
    const [lo, hi] = wilson(pw, dec);
    const verdict = prompts.length < 10 || sp >= 0.05 ? "not proven" : pw > pl ? "edge shown" : "arm worse";
    const tok = j.arms && j.arms[arm] ? j.arms[arm].tokens : NM;
    arms[arm] = {
      pairs: { wins, losses, ties, note: "pairs are not independent" },
      prompts,
      prompt_level: { wins: pw, losses: pl, tied_prompts: prompts.length - dec, n_prompts: prompts.length, signP: sp, wilson: [lo, hi] },
      cost_per_win: typeof tok === "number" && wins > 0 ? tok / wins : NM,
      verdict,
    };
  }
  return { version: 2, pairs: pairs.length, flips, flip_rate: `${flips}/${pairs.length}`, arms };
}
const f2 = (x) => x.toFixed(2);
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
export function renderReport(r) {
  const L = [];
  if (r.version === 1) {
    L.push(`${r.note}`);
    if (r.stored_tally) L.push(`stored tally: ${Object.entries(r.stored_tally).map(([k, v]) => `${k} ${v}`).join(", ")}`);
    if (r.stored_per_prompt) for (const [k, v] of Object.entries(r.stored_per_prompt)) L.push(`  ${k}: ${typeof v === "object" ? Object.entries(v).map(([a, b]) => `${a} ${b}`).join(", ") : v}`);
    L.push(`flip rate: ${r.flip_rate}`);
    L.push(`verdict: ${r.verdict}`);
    return L.join("\n");
  }
  L.push(`flip rate (order disagreements): ${r.flip_rate}`);
  for (const [arm, a] of Object.entries(r.arms)) {
    const pl = a.prompt_level;
    L.push("", `arm ${arm} vs plain: wins ${a.pairs.wins}, losses ${a.pairs.losses}`);
    L.push(`  pairs: ${n(a.pairs.wins, "win", "wins")}, ${n(a.pairs.losses, "loss", "losses")}, ${n(a.pairs.ties, "tie", "ties")} (${a.pairs.note})`);
    L.push(`  task  ${arm}-plain  ties  outcome`);
    for (const t of a.prompts) L.push(`  ${t.prompt}  ${t.wins}-${t.losses}  (${t.ties} ${t.ties === 1 ? "tie" : "ties"})  ${t.outcome}`);
    L.push(`  by prompt: ${n(pl.wins, "win", "wins")}, ${n(pl.losses, "loss", "losses")}, ${pl.tied_prompts} tied of ${pl.n_prompts} prompts`);
    L.push(`  sign test p = ${pl.signP.toFixed(3)} (tied prompts excluded)`);
    L.push(`  Wilson 95% interval on prompt wins: ${f2(pl.wilson[0])} to ${f2(pl.wilson[1])}`);
    L.push(`  cost per win: ${typeof a.cost_per_win === "number" ? `${Math.round(a.cost_per_win)} tokens` : a.cost_per_win}`);
    L.push(`  verdict: ${a.verdict}`);
  }
  return L.join("\n");
}
function reportCmd(args) {
  const json = args.includes("--json");
  const rest = args.filter((x) => x !== "--json");
  if (rest.length !== 1 || rest[0].startsWith("--")) throw new Usage(USAGE);
  const j = readJson(rest[0]);
  if (!isV1(j)) { const bad = checkRun(j); if (bad.length) { console.log(bad.join("\n")); return 1; } }
  const r = buildReport(j);
  console.log(json ? JSON.stringify(r, null, 2) : renderReport(r));
  return 0;
}

// ---------- reply-checks
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATED = new RegExp(`\\d{4}-\\d{2}-\\d{2}|\\b${MONTH}\\s+\\d{1,2}\\b|\\b\\d{1,2}\\s+${MONTH}\\b`, "i");
export function replyChecks(text) {
  const lines = [];
  let fenced = false;
  for (const l of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(l)) { fenced = !fenced; continue; }
    if (!fenced) lines.push(l);
  }
  const asks = lines.filter((l) => {
    const t = l.trim().replace(/[\s*)"']+$/, "");
    const s = l.trim().replace(/^([-*+]\s+|\d+[.)]\s+)/, "").replace(/^\*+/, "");
    return t.endsWith("?") || /^(decision|ask)\b/i.test(s);
  }).length;
  return {
    dated_next_step: lines.some((l) => /next/i.test(l) && DATED.test(l)),
    asks,
    lint_ok_lines: lines.filter((l) => l.includes("lint-ok:")).length,
    words: lines.join("\n").split(/\s+/).filter(Boolean).length,
  };
}
function replyCmd(args) {
  const json = args.includes("--json");
  const rest = args.filter((x) => x !== "--json");
  if (rest.length !== 1 || rest[0].startsWith("--")) throw new Usage(USAGE);
  const r = replyChecks(readText(rest[0]));
  console.log(json ? JSON.stringify(r) : `dated next step: ${r.dated_next_step ? "yes" : "no"}\nasks: ${r.asks}\nlint-ok lines: ${r.lint_ok_lines}\nwords: ${r.words}`);
  return 0;
}

function flags(args, allowed) {
  const o = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.includes(args[i]) || args[i + 1] === undefined) throw new Usage(USAGE);
    o[args[i]] = args[i + 1];
  }
  return o;
}

export function main(argv) {
  const [cmd, ...rest] = argv;
  try {
    switch (cmd) {
      case "freeze": return freeze(rest);
      case "verify": return verify(rest);
      case "check-run": return checkRunCmd(rest);
      case "report": return reportCmd(rest);
      case "reply-checks": return replyCmd(rest);
      default: throw new Usage(USAGE);
    }
  } catch (e) {
    if (e instanceof Usage) { console.error(e.message); return 2; }
    throw e;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.on("SIGPIPE", () => {});
  process.exitCode = main(process.argv.slice(2));
}

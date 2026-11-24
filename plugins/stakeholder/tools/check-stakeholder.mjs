#!/usr/bin/env node
// check-stakeholder: validates the ```stakeholder block that ends a stakeholder review, and the persona file.
// Plain Node, no packages. It only reads the files it is given: it never runs, fetches or follows anything in them.
//   check-stakeholder <review.md> --index <quotes.json> [--audience <audience.json>] [--prev <round1.md>] [--json]
//   check-stakeholder --verify-hash <audience.json>
// Exit 0 valid, 1 with one reason per line on stderr, 2 usage error.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED = path.join(HERE, "..", "data", "audience.json");
const CAPS = { rounds: 2, personas: 5, perPersona: 10, perBlock: 40, subagents: 10 };
const VERDICTS = ["ship", "fix-first", "rethink"];
const SEVERITIES = ["P0", "P1", "P2"];
const FIELDS = ["persona", "quote_id", "severity", "fix"];
const MAX_BYTES = 1048576; // 1 MB cap on every input file
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const ADVISORY = "advisory only: simulated readers give hypotheses to check with a real person, not research";

const usage = (msg) => { process.stderr.write(`usage: ${msg}\n`); process.exit(2); };
const readText = (p) => fs.readFileSync(p, "utf8").replace(/^﻿/, "");
// Anything we print that came from a file or the command line is shown with control characters as \uXXXX, never raw.
const esc = (v) => String(v).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
const tooBig = (file) => { try { return fs.statSync(file).size > MAX_BYTES; } catch { return false; } };
const bigReason = (file) => `${file}: file is too large (over 1 MB)`;

// ---- hash rule: drop hash, keys sorted by code point at every depth, no whitespace, sha256 hex.
function cmpCodePoint(a, b) {
  const x = [...a], y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i++) { const d = x[i].codePointAt(0) - y[i].codePointAt(0); if (d) return d; }
  return x.length - y.length;
}
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort(cmpCodePoint).map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  return JSON.stringify(v);
}
// Returns { ok, reason, hash, audience }. Never throws.
function verifyAudience(file) {
  let a;
  if (tooBig(file)) return { ok: false, reason: bigReason(file) };
  try { a = JSON.parse(readText(file)); } catch (e) { return { ok: false, reason: `${file}: not valid JSON` }; }
  if (!a || typeof a !== "object" || Array.isArray(a)) return { ok: false, reason: `${file}: top level is not an object` };
  if (typeof a.hash !== "string" || !/^[0-9a-f]{64}$/.test(a.hash)) return { ok: false, reason: `${file}: hash is missing or is not 64 lowercase hex characters` };
  const { hash, ...rest } = a;
  const got = crypto.createHash("sha256").update(canon(rest), "utf8").digest("hex");
  if (got !== hash) return { ok: false, reason: `${file}: hash mismatch (file says ${hash}, contents give ${got})` };
  return { ok: true, hash, audience: a };
}

// ---- strict JSON object parser: rejects what JSON.parse accepts but we do not (duplicate keys).
function parseStrict(text) {
  let i = 0;
  const fail = (m) => { throw new Error(m); };
  const ws = () => { while (i < text.length && " \t\r\n".includes(text[i])) i++; };
  function value() {
    ws();
    const c = text[i];
    if (c === "{") {
      i++; const o = Object.create(null); ws();
      if (text[i] === "}") { i++; return o; }
      for (;;) {
        ws(); if (text[i] !== '"') fail("expected a double-quoted key");
        const k = str(); if (Object.prototype.hasOwnProperty.call(o, k)) fail(`duplicate key "${k}"`);
        ws(); if (text[i++] !== ":") fail("expected ':'");
        o[k] = value(); ws();
        if (text[i] === ",") { i++; continue; }
        if (text[i] === "}") { i++; return o; }
        fail("expected ',' or '}'");
      }
    }
    if (c === "[") {
      i++; const a = []; ws();
      if (text[i] === "]") { i++; return a; }
      for (;;) { a.push(value()); ws(); if (text[i] === ",") { i++; continue; } if (text[i] === "]") { i++; return a; } fail("expected ',' or ']'"); }
    }
    if (c === '"') return str();
    const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i));
    if (!m) fail("unexpected character");
    i += m[0].length; return JSON.parse(m[0]);
  }
  function str() {
    const start = i; i++;
    while (i < text.length && text[i] !== '"') { if (text[i] === "\\") i++; i++; }
    if (text[i] !== '"') fail("unterminated string");
    i++; return JSON.parse(text.slice(start, i));
  }
  const v = value(); ws();
  if (i !== text.length) fail("extra text after the object");
  return v;
}

// ---- find every real ```stakeholder fence. A fence inside any other fence (``` or ~~~, longer or not yet closed)
// is data, not a block, and a line outside a fence that starts with ">" (a blockquote) is never a fence.
function findBlocks(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let open = null; const found = [];
  const finish = () => { if (open.ch === "`" && open.info === "stakeholder") found.push({ startLine: open.start + 2, body: open.body }); open = null; };
  lines.forEach((raw, idx) => {
    if (!open && /^ {0,3}>/.test(raw)) return;
    const m = /^ {0,3}(`{3,}|~{3,})\s*(\S*)\s*$/.exec(raw);
    if (!open) {
      if (m) open = { ch: m[1][0], ticks: m[1].length, info: m[2], start: idx, body: [] };
      return;
    }
    if (m && m[2] === "" && m[1][0] === open.ch && m[1].length >= open.ticks) { finish(); return; }
    open.body.push({ n: idx + 1, text: raw });
  });
  if (open) finish();
  return found;
}

// Parse a block body into header fields and finding lines, collecting reasons. Never throws.
function parseBlock(block, audienceIds, index) {
  const reasons = [], findings = [];
  const head = { verdict: [], round: [], subagents: [] };
  let findingLines = 0, parsedLines = 0, inIndex = 0;
  const seen = new Set();
  for (const { n, text } of block.body) {
    const t = text.trim();
    if (!t) continue;
    const h = /^(verdict|round|subagents):\s*(.*?)\s*$/.exec(t);
    if (h) { head[h[1]].push({ n, v: h[2] }); continue; }
    if (!t.startsWith("{")) { reasons.push(`line ${n}: not a verdict, round, subagents or finding line`); continue; }
    findingLines++;
    let o;
    try { o = parseStrict(t); } catch (e) { reasons.push(`line ${n}: not strict JSON (${e.message})`); continue; }
    if (!o || typeof o !== "object" || Array.isArray(o)) { reasons.push(`line ${n}: not strict JSON (not an object)`); continue; }
    const extra = Object.keys(o).filter((k) => !FIELDS.includes(k));
    if (extra.length) { reasons.push(`line ${n}: not strict JSON (extra field "${extra[0]}"; allowed: ${FIELDS.join(", ")})`); continue; }
    if (typeof o.quote_id === "string") { parsedLines++; if (index.has(o.quote_id)) inIndex++; }
    let bad = null;
    if (typeof o.persona !== "string" || !o.persona) bad = "persona is missing";
    else if (!audienceIds.has(o.persona)) bad = `persona "${o.persona}" is not in audience.json`;
    else if (typeof o.quote_id !== "string" || !o.quote_id) bad = "quote_id is missing";
    else if (!ID_RE.test(o.quote_id)) bad = `quote_id "${o.quote_id}" is not a valid quote id (1 to 40 of A-Z a-z 0-9 _ -)`;
    else if (!index.has(o.quote_id)) bad = `quote_id "${o.quote_id}" is not in the quote index`;
    else if (!SEVERITIES.includes(o.severity)) bad = `severity ${JSON.stringify(o.severity)} is missing or not one of ${SEVERITIES.join(", ")}`;
    else if (typeof o.fix !== "string" || !o.fix.trim() || /[\r\n]/.test(o.fix)) bad = "fix must be exactly one non-empty single-line string";
    if (bad) { reasons.push(`line ${n}: ${bad}`); continue; }
    const key = o.persona + "\u0000" + o.quote_id;
    if (seen.has(key)) { reasons.push(`line ${n}: duplicate finding (same persona and quote_id as an earlier line)`); continue; }
    seen.add(key);
    findings.push({ persona: o.persona, quote_id: o.quote_id, severity: o.severity, fix: o.fix, line: n });
  }
  const one = (name, list) => {
    if (list.length === 0) { reasons.push(`${name} line is missing`); return null; }
    if (list.length > 1) { reasons.push(`line ${list[1].n}: more than one ${name} line`); return null; }
    return list[0];
  };
  const vl = one("verdict", head.verdict), rl = one("round", head.round), sl = one("subagents", head.subagents);
  let verdict = null, round = null, subagents = null;
  if (vl) { if (VERDICTS.includes(vl.v)) verdict = vl.v; else reasons.push(`line ${vl.n}: verdict "${vl.v}" is not one of ${VERDICTS.join(", ")}`); }
  if (rl) { if (/^[12]$/.test(rl.v)) round = Number(rl.v); else reasons.push(`line ${rl.n}: round "${rl.v}" is not allowed (1 or 2; the limit is ${CAPS.rounds} rounds)`); }
  if (sl) {
    if (/^\d+$/.test(sl.v) && Number(sl.v) <= CAPS.subagents) subagents = Number(sl.v);
    else reasons.push(`line ${sl.n}: subagents "${sl.v}" must be a whole number from 0 to ${CAPS.subagents} (cap: ${CAPS.subagents} critique subagents)`);
  }
  if ((verdict === "fix-first" || verdict === "rethink") && findingLines === 0) reasons.push(`verdict ${verdict} needs at least one finding`);
  if (verdict === "ship" && findingLines === 0 && subagents === 0) reasons.push("verdict ship with zero findings and zero subagents run is rejected: nothing was reviewed (run the subagents, or list findings)");
  const per = new Map();
  for (const f of findings) per.set(f.persona, (per.get(f.persona) || 0) + 1);
  if (per.size > CAPS.personas) reasons.push(`${per.size} personas in one round (cap ${CAPS.personas} personas)`);
  for (const [p, c] of per) if (c > CAPS.perPersona) reasons.push(`persona ${p} has ${c} findings (cap ${CAPS.perPersona} per persona)`);
  if (findings.length > CAPS.perBlock) reasons.push(`${findings.length} findings in one block (cap ${CAPS.perBlock})`);
  return { reasons, findings, verdict, round, subagents, hit: { found: inIndex, total: parsedLines } };
}

function loadIndex(file) {
  let j;
  if (tooBig(file)) return { reasons: [bigReason(file)], ids: new Set() };
  try { j = JSON.parse(readText(file)); } catch { return { reasons: [`${file}: quote index is not valid JSON`], ids: new Set() }; }
  const reasons = [], ids = new Set();
  if (!j || !Array.isArray(j.quotes)) return { reasons: [`${file}: quote index needs a "quotes" array`], ids };
  for (const q of j.quotes) {
    if (!q || typeof q.id !== "string" || typeof q.text !== "string") { reasons.push(`${file}: every quote needs a string id and text`); continue; }
    if (!ID_RE.test(q.id)) { reasons.push(`${file}: quote id "${q.id}" is not valid (1 to 40 of A-Z a-z 0-9 _ -)`); continue; }
    if (ids.has(q.id)) reasons.push(`${file}: duplicate quote id "${q.id}"`);
    ids.add(q.id);
  }
  return { reasons, ids };
}

// ---- CLI
const argv = process.argv.slice(2);
const opts = { json: false }; const pos = [];
for (let k = 0; k < argv.length; k++) {
  const a = argv[k];
  if (a === "--json") opts.json = true;
  else if (["--index", "--audience", "--prev", "--verify-hash"].includes(a)) { if (k + 1 >= argv.length) usage(`${a} needs a file`); opts[a.slice(2)] = argv[++k]; }
  else if (a.startsWith("--")) usage(`unknown option ${a}`);
  else pos.push(a);
}
const fileOrUsage = (p, what) => { if (!fs.existsSync(p)) usage(`${what} not found: ${p}`); return p; };

if (opts["verify-hash"] !== undefined) {
  const r = verifyAudience(fileOrUsage(opts["verify-hash"], "audience file"));
  if (!r.ok) { process.stderr.write(r.reason + "\n"); process.exit(1); }
  process.stdout.write(`ok: hash ${r.hash} matches the contents\n`); process.exit(0);
}

if (pos.length !== 1) usage("check-stakeholder <review.md> --index <quotes.json> [--audience <audience.json>] [--prev <round1.md>] [--json]  |  check-stakeholder --verify-hash <audience.json>");
if (!opts.index) usage("--index <quotes.json> is required");
const reviewFile = fileOrUsage(pos[0], "review file");
fileOrUsage(opts.index, "quote index");
const aud = verifyAudience(fileOrUsage(opts.audience || BUNDLED, "audience file"));
const reasons = [];
if (!aud.ok) reasons.push(aud.reason);
const audienceIds = new Set(aud.ok && Array.isArray(aud.audience.personas) ? aud.audience.personas.map((p) => p.id) : []);
const idx = loadIndex(opts.index);
reasons.push(...idx.reasons);

let result = { reasons: [], findings: [], verdict: null, round: null, subagents: null, hit: { found: 0, total: 0 } };
if (tooBig(reviewFile)) reasons.push(bigReason(reviewFile));
else {
  const blocks = findBlocks(readText(reviewFile));
  if (blocks.length === 0) reasons.push("no ```stakeholder block found (a block inside another fence or a blockquote does not count)");
  else {
    if (blocks.length > 1) reasons.push(`more than one \`\`\`stakeholder block found (${blocks.length}); keep exactly one`);
    result = parseBlock(blocks[blocks.length - 1], audienceIds, idx.ids);
  }
}
reasons.push(...result.reasons);

if (result.round === 2) {
  if (!opts.prev) usage("round 2 needs --prev <round1.md> (the round 1 review)");
  const prevFile = fileOrUsage(opts.prev, "previous review");
  if (tooBig(prevFile)) reasons.push(bigReason(prevFile));
  else {
    const pbs = findBlocks(readText(prevFile));
    if (pbs.length > 1) reasons.push(`${prevFile}: more than one \`\`\`stakeholder block found in the previous review`);
    const prev = pbs.length ? parseBlock(pbs[pbs.length - 1], audienceIds, idx.ids) : { findings: [] };
    const allowed = new Set(prev.findings.filter((f) => f.severity === "P0" || f.severity === "P1").map((f) => f.persona));
    for (const f of result.findings) if (!allowed.has(f.persona)) reasons.push(`line ${f.line}: round 2 may only re-run personas that raised a P0 or P1 in round 1; ${f.persona} did not`);
  }
}

const hitRate = `${result.hit.found} of ${result.hit.total}`;
if (reasons.length) { { const lines = reasons.map(esc); lines[lines.length - 1] += " (advisory)"; process.stderr.write(lines.join("\n") + "\n"); } process.exit(1); }
if (opts.json) {
  const j = JSON.stringify({ verdict: result.verdict, round: result.round, subagents: result.subagents, findings: result.findings, hit_rate: hitRate, advisory: ADVISORY }, null, 2);
  process.stdout.write(j.split("\n").map(esc).join("\n") + "\n");
} else {
  const ids = [...new Set(result.findings.map((f) => f.quote_id))];
  const personas = [...new Set(result.findings.map((f) => f.persona))];
  const rank = { P0: 0, P1: 1, P2: 2 };
  const out = [`ok: verdict ${result.verdict}, round ${result.round}, ${result.findings.length} findings, hit rate ${hitRate} (${ADVISORY})`];
  if (personas.length) {
    out.push(["persona", ...ids.map(esc)].join(" | "));
    for (const p of personas) {
      out.push([esc(p), ...ids.map((q) => { const hits = result.findings.filter((f) => f.persona === p && f.quote_id === q).map((f) => f.severity).sort((a, b) => rank[a] - rank[b]); return hits[0] || "."; })].join(" | "));
    }
  }
  process.stdout.write(out.join("\n") + "\n");
}

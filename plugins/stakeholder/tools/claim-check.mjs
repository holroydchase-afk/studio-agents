#!/usr/bin/env node
// claim-check: compares the claims in a quote index (or a plain text file) with a claims register you pass in.
// It flags claims the register does not support, for a human to check. Plain Node, no packages, no network, no model.
// It never edits the register. Safety rules (secrets stop, symlinks, caps, atomic writes) live in ./lib/guard.mjs.
//
// Usage: node claim-check.mjs (--index <quotes.json> | --text <file.md|txt>) [--register <file>] [--persona <id>]
//        [--ignore <file>] [--out <file>] [--allow-email <address>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Refusal, MAX_BYTES, esc, safeName, scanText, writeAtomic, samePath, runMain } from "./lib/guard.mjs";

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const MAX_FINDINGS = 10;
const MAX_LIST = 100; // supported, ignored, needs_human and skipped: first 100 in order, the rest counted in omitted_*
const MAX_REG_ROWS = 5000;
const MAX_QUOTES = 2000;
const capList = (arr) => ({ list: arr.slice(0, MAX_LIST), omitted: Math.max(0, arr.length - MAX_LIST) });
const FIX = {
  contradicted: "Remove this claim, or fix the register row it contradicts, then run the check again.",
  unsupported: "Remove it, or add a register row with proof.",
  unproven: "Add proof to the register row, or remove the claim.",
};
const SEVERITY = { contradicted: "P0", unsupported: "P1", unproven: "P1" };
const RANK = { contradicted: 2, unsupported: 1, unproven: 1 };

const clean = (s, max = 200) => { const e = esc(s); return e.length > max ? e.slice(0, max - 3) + "..." : e; };
// a file name that holds an address or token is shown as a short hash, even when the extension hides it ("a@b.net.json")
const shown = (file) => { const base = path.basename(file); const stem = safeName(base.replace(/\.[^.]*$/, "")); return stem.startsWith("[redacted") ? stem : safeName(base); };
const usage = (msg) => new Refusal(msg, 2);

// ---------------------------------------------------------------- reading input files (fail closed)
function decode(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2, 2 + ((buf.length - 2) & ~1)).toString("utf16le");
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) { const b = Buffer.from(buf.subarray(2, 2 + ((buf.length - 2) & ~1))); b.swap16(); return b.toString("utf16le"); }
  if (buf.includes(0)) return null;
  return buf.toString("utf8");
}
function readInput(file) {
  const name = shown(file);
  let st;
  try { st = fs.lstatSync(file); } catch { throw new Refusal(`${name}: cannot read (not found or no access)`); }
  if (st.isSymbolicLink()) throw new Refusal(`${name}: symlink not followed`);
  if (st.isDirectory()) throw usage(`${name}: expected a file, not a directory`);
  if (!st.isFile()) throw new Refusal(`${name}: not a regular file`);
  if (st.size > MAX_BYTES) throw new Refusal(`${name}: too large (over 1 MB, cap 1 MB); nothing was truncated`);
  let buf;
  try { buf = fs.readFileSync(file); } catch { throw new Refusal(`${name}: cannot read`); }
  if (buf.length > MAX_BYTES) throw new Refusal(`${name}: too large (over 1 MB, cap 1 MB); nothing was truncated`);
  const t = decode(buf);
  if (t === null) throw new Refusal(`${name}: binary file (NUL byte), not read`);
  return { name, text: t.replace(/^﻿/, "").replace(/\r\n/g, "\n") };
}

// ---------------------------------------------------------------- numbers
const WATCH = new Map(Object.entries({
  agent: "agent", agents: "agent", user: "user", users: "user", test: "test", tests: "test", repo: "repo", repos: "repo",
  product: "product", products: "product", app: "app", apps: "app", pr: "pr", prs: "pr", run: "run", runs: "run",
  eval: "eval", evals: "eval", point: "point", points: "point", hour: "hour", hours: "hour",
}));
const NUM_RE = /^(\$?)(\d[\d,]*)(\.\d+)?([kmb]?)(?:-(\$?)(\d[\d,]*)(\.\d+)?([kmb]?))?([+%]?)$/i;
const SHIFT = { k: 3, m: 6, b: 9 };
const cleanTok = (t) => (t.length > 40 ? "" : t.replace(/^[("'`[*_]+/, "").replace(/[).,;:!?"'`\]*_]+$/, ""));

// exact decimal-string arithmetic: the decimal point moves, nothing is rounded
function canonPart(int, frac, suf) {
  let digits = int.replace(/,/g, "") + (frac ? frac.slice(1) : "");
  let point = int.replace(/,/g, "").length + (SHIFT[suf.toLowerCase()] || 0);
  if (point > digits.length) digits += "0".repeat(point - digits.length);
  const whole = digits.slice(0, point).replace(/^0+(?=\d)/, "") || "0";
  const part = digits.slice(point).replace(/0+$/, "");
  return whole + (part ? "." + part : "");
}
function parseNum(tok) {
  const m = NUM_RE.exec(tok);
  if (!m) return null;
  const [, d1, i1, f1, s1, d2, i2, f2, s2, tail] = m;
  let canon = (d1 || d2 ? "$" : "") + canonPart(i1, f1, s1);
  if (i2 !== undefined) canon += "-" + canonPart(i2, f2, s2);
  return { canon: canon + tail, flag: Boolean(d1 || d2 || tail === "%") };
}
// number claims in one run of text: [{canon, noun, label}] (a number needs a watch noun within 3 words, or a $ or %)
function numberClaims(tokens) {
  const out = []; const seen = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const c = cleanTok(tokens[i]);
    if (!c || !/^[$\d]/.test(c)) continue;
    const n = parseNum(c);
    if (!n) continue;
    let noun = null, end = i;
    if (!/[.;:!?]$/.test(tokens[i])) {
      for (let j = i + 1; j < tokens.length && j <= i + 3; j++) {
        const w = cleanTok(tokens[j]).toLowerCase();
        if (WATCH.has(w)) { noun = WATCH.get(w); end = j; break; }
        if (/[.;:!?]$/.test(tokens[j])) break;
      }
    }
    if (!noun && !n.flag) continue;
    const key = `${n.canon}|${noun}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = tokens.slice(i, end + 1).map(cleanTok).filter(Boolean).join(" ").replace(/`/g, "");
    out.push({ canon: n.canon, noun, label: clean(label, 80) });
  }
  return out;
}
const sameNum = (a, b) => a.canon === b.canon && (a.noun === null || b.noun === null || a.noun === b.noun);

// ---------------------------------------------------------------- register
const stripMd = (s) => s.replace(/[*`]/g, "").trim();
const splitRow = (line) => {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|") && !t.endsWith("\\|")) t = t.slice(0, -1);
  return t.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
};
const SEP_RE = /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/;

function verdictKind(v) {
  const s = stripMd(v).toLowerCase();
  if (/^agent\b/.test(s)) return "agent";
  if (/^(not an agent|skill|rule|persona rubric|borderline)\b/.test(s)) return "notagent";
  return "unknown";
}

function parseRegister(text, name) {
  const lines = text.split("\n");
  const rowsA = [], rowsB = [], skipped = [];
  let recognized = false, rowCount = 0;
  for (let i = 0; i < lines.length;) {
    if (!lines[i].trim().startsWith("|")) { i++; continue; }
    let j = i; while (j < lines.length && lines[j].trim().startsWith("|")) j++;
    // lines[i..j) is one table block
    if (j - i >= 2 && SEP_RE.test(lines[i + 1].trim())) {
      const head = splitRow(lines[i]).map((h) => stripMd(h).toLowerCase());
      const col = (n) => head.indexOf(n);
      const isA = col("name") >= 0 && col("verdict") >= 0;
      const isB = !isA && col("claim") >= 0 && col("status") >= 0;
      if (isA || isB) {
        recognized = true;
        rowCount += j - i - 2;
        if (rowCount > MAX_REG_ROWS) throw new Refusal(`${name}: too many register rows: more than 5,000 (cap 5,000); nothing was truncated`);
        for (let k = i + 2; k < j; k++) {
          const line = k + 1; const cells = splitRow(lines[k]);
          if (cells.length !== head.length) { skipped.push({ line, reason: `row has ${cells.length} cells, the header has ${head.length}` }); continue; }
          if (isA) {
            const name = stripMd(cells[col("name")]);
            if (!name) { skipped.push({ line, reason: "name is empty" }); continue; }
            const proofCol = col("proof today");
            const proof = proofCol >= 0 ? stripMd(cells[proofCol]) : "";
            const nums = [];
            for (const c of cells) nums.push(...numberClaims(c.split(/\s+/)));
            rowsA.push({ line, name: name.toLowerCase(), shown: name, kind: verdictKind(cells[col("verdict")]), proofNone: /^none\b/i.test(proof), nums });
          } else {
            const claim = stripMd(cells[col("claim")]);
            const status = stripMd(cells[col("status")]).toLowerCase();
            if (!claim) { skipped.push({ line, reason: "claim is empty" }); continue; }
            if (!["supported", "unsupported", "retired"].includes(status)) { skipped.push({ line, reason: "status value not recognized" }); continue; }
            rowsB.push({ line, ok: status === "supported", norm: normText(claim), nums: numberClaims(claim.split(/\s+/)) });
          }
        }
      }
    }
    i = j;
  }
  if (!recognized) return null;
  return { rowsA, rowsB, skipped };
}
// number and name indexes, built once per run (never a scan of every register row per sentence)
function indexRegister(reg) {
  reg.byName = new Map();
  for (const r of reg.rowsA) { if (!reg.byName.has(r.name)) reg.byName.set(r.name, []); reg.byName.get(r.name).push(r); }
  reg.byFirst = new Map(); let order = 0;
  for (const [name, rows] of reg.byName) {
    const m = /[A-Za-z0-9_-]+/.exec(name);
    if (m) { if (!reg.byFirst.has(m[0])) reg.byFirst.set(m[0], []); reg.byFirst.get(m[0]).push({ name, rows, order }); }
    order++;
  }
  reg.agentRows = reg.rowsA.filter((r) => r.kind === "agent");
  reg.firstProven = reg.agentRows.find((r) => !r.proofNone);
  reg.firstNotAgent = reg.rowsA.find((r) => r.kind === "notagent");
  reg.numA = new Map(); reg.numB = new Map();
  for (const r of reg.rowsA) for (const e of r.nums) { if (!reg.numA.has(e.canon)) reg.numA.set(e.canon, []); reg.numA.get(e.canon).push({ canon: e.canon, line: r.line, noun: e.noun }); }
  for (const r of reg.rowsB) for (const e of r.nums) { if (!reg.numB.has(e.canon)) reg.numB.set(e.canon, []); reg.numB.get(e.canon).push({ canon: e.canon, row: r, noun: e.noun }); }
  reg.cacheClaims = new Map(); reg.cacheVerdicts = new Map();
}
const normText = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}+-]/gu, "");

// ---------------------------------------------------------------- claims in a quote
const HEDGE = new Set(["planned", "will", "coming", "roadmap", "could"]);
const BUILD = new Set(["built", "shipped", "live", "launched", "deployed"]);
const segmentsOf = (text) => text.split(/\n+/).flatMap((l) => l.split(/(?<=[.!?])\s+/)).filter((s) => s.trim());

function containsName(lower, name) {
  if (!name) return false;
  const bare = name.length >= 3;
  for (let at = lower.indexOf(name); at !== -1; at = lower.indexOf(name, at + 1)) {
    const p = lower[at - 1] || " ", n = lower[at + name.length] || " ";
    if (/[A-Za-z0-9_-]/.test(p) || /[A-Za-z0-9_-]/.test(n)) continue;
    if (bare || (p === "`" && n === "`")) return true;
  }
  return false;
}
// register rows named in a sentence, in register order: only names whose first word appears in the sentence are tried
function namedIn(lower, reg) {
  const toks = new Set(lower.match(/[a-z0-9_-]+/g) || []);
  const found = [];
  for (const t of toks) for (const c of reg.byFirst.get(t) || []) if (containsName(lower, c.name)) found.push(c);
  return found.sort((a, b) => a.order - b.order).map((c) => c.rows);
}

// A hedge word blocks only the clause that carries it. Clauses split at a token ending , or ; and at the words and / but.
function liveTokens(tokens, words) {
  const keep = []; let start = 0;
  const flush = (end) => {
    let hedged = false;
    for (let i = start; i < end && !hedged; i++) hedged = HEDGE.has(words[i]) || (words[i] === "not" && i + 1 < end && words[i + 1] === "yet");
    if (!hedged) for (let i = start; i < end; i++) keep.push(i);
    start = end;
  };
  for (let i = 0; i < tokens.length; i++) {
    if (i > start && (words[i] === "and" || words[i] === "but")) flush(i);
    if (/[,;]$/.test(tokens[i])) flush(i + 1);
  }
  flush(tokens.length);
  return keep;
}

function segClaims(seg0, reg) {
  let seg = seg0;
  let tokens = seg.split(/\s+/).filter(Boolean);
  let words = tokens.map((t) => cleanTok(t).toLowerCase());
  const keep = liveTokens(tokens, words);
  if (keep.length < tokens.length) { tokens = keep.map((i) => tokens[i]); words = keep.map((i) => words[i]); seg = tokens.join(" "); }
  const claims = [];
  if (!tokens.length) return claims;
  const nums = numberClaims(tokens);
  for (const n of nums) claims.push({ type: "number", label: n.label, num: n });
  const agentAt = words.findIndex((w) => w === "agent" || w === "agents");
  let agentCovered = nums.some((n) => n.noun === "agent");
  const lower = seg.toLowerCase();
  let named = null;
  const namedRows = () => (named ??= namedIn(lower, reg));
  if (agentAt >= 0) {
    for (const rows of namedRows()) claims.push({ type: "named", label: clean(`${rows[0].shown.replace(/`/g, "")} agent`, 80), rows });
    if (!namedRows().length && !agentCovered) claims.push({ type: "bare", label: "agent" });
    agentCovered = true;
  }
  if (!agentCovered && !nums.length) {
    let at = words.findIndex((w) => BUILD.has(w));
    let k = at;
    if (at < 0) { at = words.findIndex((w, i) => w === "in" && words[i + 1] === "production"); k = at + 1; }
    if (at >= 0) {
      const label = tokens.slice(Math.max(0, at - 3), Math.min(tokens.length, k + 3)).map(cleanTok).filter(Boolean).join(" ").replace(/`/g, "");
      claims.push({ type: "word", label: clean(label, 80), seg, named: namedRows() });
    }
  }
  return claims;
}
// one segment text is judged once per run, however often it repeats
function quoteClaims(text, reg) {
  const claims = [];
  for (const seg of segmentsOf(text)) {
    let c = reg.cacheClaims.get(seg);
    if (!c) { c = segClaims(seg, reg); reg.cacheClaims.set(seg, c); }
    claims.push(...c);
  }
  return claims;
}

// ---------------------------------------------------------------- judging one claim against the register
const bad = (status, row) => ({ status, row });
const human = (reason) => ({ status: "human", reason });
function combine(verdicts) {
  if (!verdicts.length) return bad("unsupported", null);
  const ok = verdicts.filter((v) => v.ok), no = verdicts.filter((v) => !v.ok);
  if (ok.length && no.length) return human("register rows disagree about this claim");
  return ok.length ? { status: "supported", row: ok[0].row } : bad("contradicted", no[0].row);
}
function judge(c, reg) {
  let v = reg.cacheVerdicts.get(c);
  if (!v) { v = judgeNow(c, reg); reg.cacheVerdicts.set(c, v); }
  return v;
}
function judgeNow(c, reg) {
  if (c.type === "number") {
    const v = [];
    if (c.num.noun === "agent" && reg.rowsA.length) {
      if (c.num.canon === String(reg.agentRows.length)) v.push({ ok: true, row: null });
    }
    if (c.num.noun !== "agent") {
      const hit = (reg.numA.get(c.num.canon) || []).find((e) => sameNum(c.num, e) && e.noun !== "agent");
      if (hit) v.push({ ok: true, row: hit.line });
    }
    const seenB = new Set();
    for (const e of reg.numB.get(c.num.canon) || []) if (sameNum(c.num, e) && !seenB.has(e.row)) { seenB.add(e.row); v.push({ ok: e.row.ok, row: e.row.line }); }
    return combine(v);
  }
  if (c.type === "named") {
    const groups = new Set(c.rows.map((r) => `${r.kind}|${r.proofNone}`));
    if (groups.size > 1) return human(`rows for ${clean(c.rows[0].shown.replace(/`/g, ""), 40)} give different verdicts`);
    const r = c.rows[0];
    if (r.kind === "unknown") return human("the register verdict for this name is not one the tool knows");
    if (r.kind === "notagent") return bad("contradicted", r.line);
    return r.proofNone ? bad("unproven", r.line) : { status: "supported", row: r.line };
  }
  if (c.type === "bare") {
    const ag = reg.agentRows;
    const proven = reg.firstProven;
    if (proven) return { status: "supported", row: proven.line };
    if (ag.length) return bad("unproven", ag[0].line);
    const no = reg.firstNotAgent;
    return no ? bad("contradicted", no.line) : bad("unsupported", null);
  }
  // a built / shipped / live word with no number or agent in the sentence: matched to a register row by its text
  const v = [];
  for (const rows of c.named) v.push({ ok: true, row: rows[0].line });
  if (reg.rowsB.length) {
    const sn = normText(c.seg);
    for (const r of reg.rowsB) if (r.norm.length >= 3 && sn.includes(r.norm)) v.push({ ok: r.ok, row: r.line });
  }
  return combine(v);
}

// ---------------------------------------------------------------- args
function parseArgs(argv) {
  const o = { allow: [] };
  const valued = new Set(["--index", "--text", "--register", "--persona", "--ignore", "--out", "--allow-email"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!valued.has(a)) throw usage(`unknown argument ${clean(a, 60)}; see the usage line in claim-check.mjs`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw usage(`${a} needs a value`);
    i++;
    if (a === "--allow-email") { o.allow.push(v); continue; }
    const k = a.slice(2);
    if (o[k] !== undefined) throw usage(`${a} given twice`);
    o[k] = v;
  }
  if (o.index !== undefined && o.text !== undefined) throw usage("give --index or --text, not both");
  if (o.index === undefined && o.text === undefined) throw usage("give an input: --index <quotes.json> or --text <file.md|txt>");
  if (o.persona === undefined) o.persona = "hiring-manager";
  if (!ID_RE.test(o.persona)) throw usage(`--persona must be a plain id (letters, digits, - or _, up to 40): ${clean(o.persona, 60)}`);
  for (const a of o.allow) if (!/^[^\s@]+@[^\s@]+$/.test(a) || a.length > 254) throw usage(`--allow-email needs one exact address: ${clean(a, 60)}`);
  return o;
}
function defaultRegister() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const inRepo = path.basename(path.resolve(dir, "..")) === "stakeholder" && path.basename(path.resolve(dir, "..", "..")) === "plugins";
  const cand = path.resolve(dir, "..", "..", "..", "docs", "agent-audit.md");
  if (inRepo && fs.existsSync(cand)) return cand;
  throw usage("--register <file> is needed here: there is no docs/agent-audit.md next to this tool (an installed plugin has no docs folder)");
}

function parseIgnore(text, name) {
  const out = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const a = line.indexOf("|"), b = a < 0 ? -1 : line.indexOf("|", a + 1);
    const id = a < 0 ? "" : line.slice(0, a).trim(), claim = b < 0 ? "" : line.slice(a + 1, b).trim(), reason = b < 0 ? "" : line.slice(b + 1).trim();
    if (!ID_RE.test(id) || !claim || !reason) throw usage(`ignore file ${name} line ${i + 1}: need quote_id|claim|reason, and a reason is required`);
    out.push({ id, claim, reason });
  });
  return out;
}

function parseIndex(text, name) {
  let j;
  try { j = JSON.parse(text); } catch { throw new Refusal(`${name}: the index is not valid JSON`); }
  if (!j || typeof j !== "object" || !Array.isArray(j.quotes)) throw new Refusal(`${name}: the index needs a "quotes" array`);
  if (j.quotes.length > MAX_QUOTES) throw new Refusal(`${name}: too many quotes: ${j.quotes.length} (cap 2,000); nothing was truncated`);
  const seen = new Set(); const quotes = [];
  for (const q of j.quotes) {
    if (!q || typeof q.id !== "string" || !ID_RE.test(q.id)) throw new Refusal(`${name}: a quote id is not a plain id (letters, digits, - or _, up to 40)`);
    if (seen.has(q.id)) throw new Refusal(`${name}: quote id ${clean(q.id, 40)} appears twice`);
    if (typeof q.text !== "string") throw new Refusal(`${name}: quote ${clean(q.id, 40)} has no text string`);
    seen.add(q.id); quotes.push({ id: q.id, text: q.text });
  }
  return quotes;
}
function splitText(text) {
  const out = []; let n = 0;
  for (const line of text.split("\n")) for (const s of line.trim().split(/(?<=[.!?])\s+(?=\S)/)) if (s.trim()) out.push({ id: `q${++n}`, text: s.trim() });
  return out;
}

// ---------------------------------------------------------------- main
function main(argv) {
  const o = parseArgs(argv);
  const regPath = o.register !== undefined ? o.register : defaultRegister();
  const inputs = [o.index ?? o.text, regPath, ...(o.ignore !== undefined ? [o.ignore] : [])];
  if (o.out !== undefined && inputs.some((p) => samePath(p, o.out))) throw usage("--out must not be one of the input files");

  const files = inputs.map((p) => readInput(p));
  const allow = new Set(o.allow.map((a) => a.toLowerCase()));
  const hits = []; const allowed = new Map();
  files.forEach((f, k) => {
    const s = scanText(f.text, allow);
    for (const h of s.hits) hits.push(`${f.name}:${h.line}: ${h.category}`);
    for (const [a, n] of s.allowed) allowed.set(a, (allowed.get(a) || 0) + n);
    void k;
  });
  const [inFile, regFile, ignFile] = files;
  let quotes = null;
  if (o.index !== undefined && !hits.length) {
    quotes = parseIndex(inFile.text, inFile.name);
    for (const q of quotes) for (const h of scanText(q.text, allow).hits) hits.push(`${inFile.name}: quote ${q.id}: ${h.category}`);
  }
  if (hits.length) throw new Refusal([...hits.slice(0, 50), ...(hits.length > 50 ? [`(and ${hits.length - 50} more)`] : []), "stopped: email addresses, keys, tokens and phone numbers are never read (values are not shown)"]);

  const reg = parseRegister(regFile.text, regFile.name);
  if (!reg) throw usage(`${regFile.name}: register format not recognized (expected a table with Name and Verdict columns, or Claim and Status columns)`);
  indexRegister(reg);
  if (o.text !== undefined) {
    quotes = splitText(inFile.text);
    if (quotes.length > MAX_QUOTES) throw new Refusal(`${inFile.name}: too many quotes: ${quotes.length} (cap 2,000); nothing was truncated`);
  }
  const ignores = ignFile ? parseIgnore(ignFile.text, ignFile.name) : [];
  const ignoreMap = new Map(ignores.map((g) => [`${g.id}|${g.claim.toLowerCase()}`, { ...g, used: false }]));

  const findings = [], supported = [], ignored = [], needsHuman = [];
  for (const q of quotes) {
    let worst = null;
    for (const c of quoteClaims(q.text, reg)) {
      const ig = ignoreMap.get(`${q.id}|${c.label.toLowerCase()}`);
      if (ig) { ig.used = true; ignored.push({ quote_id: q.id, claim: c.label, reason: clean(ig.reason) }); continue; }
      const v = judge(c, reg);
      if (v.status === "supported") supported.push({ quote_id: q.id, claim: c.label, register_row: v.row });
      else if (v.status === "human") needsHuman.push({ quote_id: q.id, claim: c.label, reason: clean(v.reason) });
      else if (!worst || RANK[v.status] > RANK[worst.status]) worst = { status: v.status, row: v.row, claim: c.label };
    }
    if (worst) findings.push({ quote_id: q.id, claim: worst.claim, status: worst.status, register_row: worst.row, persona: o.persona, severity: SEVERITY[worst.status], fix: FIX[worst.status] });
  }
  for (const g of ignoreMap.values()) if (!g.used) needsHuman.push({ quote_id: g.id, claim: clean(g.claim, 80), reason: "this ignore line matches no claim" });

  const ranked = [...findings.filter((f) => f.severity === "P0"), ...findings.filter((f) => f.severity !== "P0")];
  const cs = capList(supported), ci = capList(ignored), cn = capList(needsHuman), ck = capList(reg.skipped);
  const result = {
    tool: "claim-check", schema: 1, input: inFile.name, register: regFile.name,
    findings: ranked.slice(0, MAX_FINDINGS), supported: cs.list, ignored: ci.list, needs_human: cn.list,
    skipped: ck.list, omitted: Math.max(0, ranked.length - MAX_FINDINGS),
    omitted_supported: cs.omitted, omitted_ignored: ci.omitted, omitted_needs_human: cn.omitted, omitted_skipped: ck.omitted,
    allowed_emails: [...allowed].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([address, count]) => ({ address, count })),
  };
  const json = JSON.stringify(result, null, 2) + "\n";
  if (o.out !== undefined) writeAtomic(o.out, json); else process.stdout.write(json);
}

runMain(main);

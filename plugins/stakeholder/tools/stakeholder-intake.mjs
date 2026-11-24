#!/usr/bin/env node
// stakeholder-intake: turns one artifact (an html page, a text or markdown file, or a local repo folder) into the numbered
// quote index that check-stakeholder reads.
//   stakeholder-intake <file-or-folder> [--out <file>] [--allow-email <address>]...
// Plain Node, no packages, no network, no model, no child processes. It reads text and never runs, fetches or follows anything
// in it. Everything in the quotes is data copied from the artifact, never an instruction. Secret and personal-data scanning,
// the safe folder walk, atomic writes and the error handling all come from ./lib/guard.mjs.
// Exit 0 ok, 1 refused or failed (one reason per line on stderr), 2 usage. Output is one line of JSON with no trailing newline
// (on stdout, or in --out).
import fs from "node:fs";
import path from "node:path";
import { esc, cmp, Refusal, MAX_BYTES, scanText, walkTree, readTexts, writeAtomic, samePath, safeName, runMain } from "./lib/guard.mjs";

const MAX_QUOTES = 400;
const MAX_QUOTE_CHARS = 500;
const MAX_TOTAL_BYTES = 52428800; // a repo run reads at most 50 MB in all
const MAX_PROBLEM_LINES = 50;
const MAX_SKIPPED_LISTED = 100;
const USAGE = "usage: stakeholder-intake <file-or-folder> [--out <file>] [--allow-email <address>]...";

const usage = (m) => { throw new Refusal([USAGE, m].filter(Boolean), 2); };

function parseArgs(argv) {
  const o = { input: null, out: null, allow: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      if (a !== "--out" && a !== "--allow-email") usage(`unknown option ${esc(a)}`);
      const v = argv[++i]; if (v === undefined || v.startsWith("--")) usage(`${a} needs a value`);
      if (a === "--out") o.out = v;
      else { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) usage("--allow-email needs one address such as name@host.com"); o.allow.add(v.toLowerCase()); }
    } else if (o.input === null) o.input = a; else usage("only one file or folder is allowed");
  }
  if (o.input === null) usage("missing <file-or-folder>");
  return o;
}

// ---- entities. Numeric (any number of leading zeros) and a list of named ones; anything else is left as written. For the
// personal-data scan an unknown or over-long entity can be replaced by a filler ("" or "-") so a run that is hidden behind
// one still has the shape of an email address or phone number and stops the run (fail closed).
const NAMED = new Map(Object.entries({
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", ensp: "\u2002", emsp: "\u2003", thinsp: "\u2009", Tab: " ", NewLine: " ",
  commat: "@", period: ".", hyphen: "\u2010", dash: "\u2010", minus: "\u2212", lpar: "(", rpar: ")",
  num: "#", plus: "+", colon: ":", comma: ",", semi: ";", excl: "!", quest: "?", sol: "/", lowbar: "_", percnt: "%", dollar: "$", ast: "*",
  equals: "=", lsqb: "[", rsqb: "]", ndash: "\u2013", mdash: "\u2014", hellip: "...", copy: "\u00a9", reg: "\u00ae", trade: "\u2122",
  bull: "\u2022", middot: "\u00b7", laquo: "\u00ab", raquo: "\u00bb", ldquo: "\u201c", rdquo: "\u201d", lsquo: "\u2018", rsquo: "\u2019",
}));
const ENTITY = /&#[xX]([0-9a-fA-F]+);?|&#([0-9]+);?|&([A-Za-z][A-Za-z0-9]{1,31});/g;
function decodeEntities(s, fill = null) {
  if (!s.includes("&")) return s;
  return s.replace(ENTITY, (m, hex, dec, name) => {
    if (name !== undefined) return NAMED.has(name) ? NAMED.get(name) : fill === null ? m : fill;
    const digits = (hex !== undefined ? hex : dec).replace(/^0+/, "");
    if (digits.length > (hex !== undefined ? 8 : 10)) return fill === null ? m : fill;
    const cp = digits === "" ? 0 : parseInt(digits, hex !== undefined ? 16 : 10);
    if (!(cp > 0 && cp <= 0x10ffff) || (cp >= 0xd800 && cp <= 0xdfff)) return fill === null ? "" : fill;
    return String.fromCodePoint(cp);
  });
}

// ---- html. A small tokenizer, linear in the input: comments, script and style are dropped (an unterminated one runs to the
// end of the file), tags are never executed, and quoted attribute values may hold ">". Returns the candidate text strings in
// document order and a scan string (text only, line numbers kept) for the personal-data scan.
const INLINE = new Set(["a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "del", "dfn", "em", "font", "i", "ins", "kbd", "mark", "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr"]);
const WANT = new Set(["alt", "title", "aria-label", "name", "content"]);
const isWs = (c) => c === 32 || c === 9 || c === 10 || c === 13 || c === 12;
const isNameChar = (c) => (c >= 48 && c <= 58) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 45 || c === 95;

function parseTag(src, i) {
  const n = src.length; let j = i + 1; let closing = false;
  if (src.charCodeAt(j) === 47) { closing = true; j++; }
  const s = j; while (j < n && isNameChar(src.charCodeAt(j))) j++;
  const name = src.slice(s, j).toLowerCase(); const attrs = Object.create(null);
  for (;;) {
    while (j < n && (isWs(src.charCodeAt(j)) || src.charCodeAt(j) === 47)) j++;
    if (j >= n) return { name, closing, attrs, end: n };
    if (src.charCodeAt(j) === 62) return { name, closing, attrs, end: j + 1 };
    const a = j; while (j < n) { const c = src.charCodeAt(j); if (isWs(c) || c === 61 || c === 62 || c === 47) break; j++; }
    if (j === a) { j++; continue; }
    const aname = j - a <= 20 ? src.slice(a, j).toLowerCase() : "";
    while (j < n && isWs(src.charCodeAt(j))) j++;
    if (src.charCodeAt(j) === 61) {
      j++; while (j < n && isWs(src.charCodeAt(j))) j++;
      let b, e;
      const q = src[j];
      if (q === '"' || q === "'") { b = j + 1; const k = src.indexOf(q, b); e = k === -1 ? n : k; j = k === -1 ? n : k + 1; }
      else { b = j; while (j < n && !isWs(src.charCodeAt(j)) && src.charCodeAt(j) !== 62) j++; e = j; }
      if (WANT.has(aname) && !(aname in attrs)) attrs[aname] = src.slice(b, e);
    }
  }
}

function parseHtml(src) {
  const n = src.length; const out = []; const scan = []; let buf = []; let i = 0;
  const flush = () => { if (buf.length) { out.push(buf.join("")); buf = []; } };
  const text = (s) => { if (!s) return; const d = decodeEntities(s); buf.push(d); scan.push(d); };
  const newlines = (a, b) => { let c = 0; for (let k = a; k < b; k++) if (src.charCodeAt(k) === 10) c++; if (c) scan.push("\n".repeat(c)); };
  const endScript = /<\/script/gi, endStyle = /<\/style/gi;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt === -1) { text(src.slice(i)); break; }
    if (lt > i) text(src.slice(i, lt));
    i = lt;
    const c1 = src.charCodeAt(i + 1);
    if (src.startsWith("<!--", i)) {
      // "<!-->" and "<!--->" are empty comments that close at once
      const end = src[i + 4] === ">" ? i + 5 : src.startsWith("->", i + 4) ? i + 6 : (() => { const e = src.indexOf("-->", i + 4); return e === -1 ? n : e + 3; })();
      newlines(i, end); i = end; continue;
    }
    if (c1 === 33 || c1 === 63) { const e = src.indexOf(">", i + 2); const end = e === -1 ? n : e + 1; newlines(i, end); flush(); i = end; continue; }
    const letter = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
    if (!(letter(c1) || (c1 === 47 && letter(src.charCodeAt(i + 2))))) { text("<"); i++; continue; }
    const t = parseTag(src, i);
    newlines(i, t.end);
    if (!INLINE.has(t.name)) flush();
    if (!t.closing) {
      for (const k of ["alt", "title", "aria-label"]) if (t.attrs[k]) out.push(decodeEntities(t.attrs[k]));
      if (t.name === "meta" && t.attrs.content && (t.attrs.name || "").trim().toLowerCase() === "description") out.push(decodeEntities(t.attrs.content));
    }
    i = t.end;
    if (!t.closing && (t.name === "script" || t.name === "style")) {
      const re = t.name === "script" ? endScript : endStyle; re.lastIndex = i;
      const m = re.exec(src); const stop = m ? m.index : n;
      newlines(i, stop); i = stop;
    }
  }
  flush();
  return { out, scan: scan.join("") };
}

// ---- quotes
// A candidate string becomes quotes: split at line breaks, characters that cannot be seen or that steer text are removed,
// whitespace collapses, and each line is split after . ! ? followed by whitespace.
const LINE_BREAK = /[\n\r\u000b\u000c\u0085\u2028\u2029]/;
const STRIP = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
const cleanLine = (s) => s.replace(STRIP, "").replace(/[\s   -   　]+/g, " ").trim();

function cut(s) {
  if (s.length <= MAX_QUOTE_CHARS) return { text: s };
  let at = s[MAX_QUOTE_CHARS] === " " ? MAX_QUOTE_CHARS : s.lastIndexOf(" ", MAX_QUOTE_CHARS);
  if (at <= 0) at = MAX_QUOTE_CHARS;
  return { text: s.slice(0, at).trimEnd(), truncated: true };
}

function makeIndex() {
  const quotes = [];
  const push = (line) => {
    const c = cut(line);
    if (quotes.length >= MAX_QUOTES) throw new Refusal(`too large: more than ${MAX_QUOTES} quotes (cap ${MAX_QUOTES}); nothing was truncated`);
    quotes.push(c.truncated ? { id: `q${quotes.length + 1}`, text: c.text, truncated: true } : { id: `q${quotes.length + 1}`, text: c.text });
  };
  const addText = (raw) => {
    for (const piece of raw.split(LINE_BREAK)) {
      const line = cleanLine(piece); if (!line) continue;
      for (const sentence of line.split(/(?<=[.!?])\s+/)) if (sentence) push(sentence);
    }
  };
  const addFact = (raw) => { const line = cleanLine(raw); if (line) push(line); };
  return { quotes, addText, addFact };
}

// ---- the scan. The raw text first, then variants of what a reader sees: entities decoded (unknown ones also replaced by a
// filler), html text with tags removed, tags and empty comments removed, markdown escapes and emphasis marks removed; then
// the quotes. So an address written as &#64;, split by an inline tag or an empty comment, or written as john\@host is
// still caught, in every kind of input.
function stripTags(s) {
  if (!s.includes("<")) return s;
  const out = []; let i = 0, gt = -2; const n = s.length;
  while (i < n) {
    const lt = s.indexOf("<", i);
    if (lt === -1) { out.push(s.slice(i)); break; }
    const c = s.charCodeAt(lt + 1);
    const tag = c === 33 || c === 47 || (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
    if (!tag) { out.push(s.slice(i, lt + 1)); i = lt + 1; continue; }
    if (gt < lt) gt = s.indexOf(">", lt);
    if (gt === -1) { out.push(s.slice(i)); break; }
    out.push(s.slice(i, lt)); i = gt + 1;
  }
  return out.join("");
}
const unescapeMarkdown = (s) => s.replace(/\\([!-\/:-@[-`{-~])/g, "$1").replace(/[*_`]/g, "");

function variantsOf(text, isHtml) {
  const bases = [decodeEntities(decodeEntities(text))];
  if (text.includes("&")) for (const f of ["", "-"]) bases.push(decodeEntities(decodeEntities(text, f), f));
  if (isHtml) {
    const sc = parseHtml(text).scan; bases.push(decodeEntities(sc));
    if (sc.includes("&")) for (const f of ["", "-"]) bases.push(decodeEntities(sc, f));
  }
  const all = new Set();
  for (const b of bases) {
    const forms = [b]; if (b.includes("<")) forms.push(stripTags(b));
    for (const f of [...forms]) if (/[\\*_`]/.test(f)) forms.push(unescapeMarkdown(f));
    for (const f of forms) all.add(f);
  }
  all.delete(text);
  return [...all];
}

function scanFile(name, text, isHtml, allow, problems, allowedCount) {
  const seen = new Set();
  const add = (line, category) => { const k = `${line}:${category}`; if (!seen.has(k)) { seen.add(k); problems.push(`${name}:${line}: ${category} found; nothing was written`); } };
  const raw = scanText(text, allow);
  for (const h of raw.hits) add(h.line, h.category);
  for (const [a, c] of raw.allowed) allowedCount.set(a, (allowedCount.get(a) || 0) + c);
  for (const v of variantsOf(text, isHtml)) for (const h of scanText(v, allow).hits) add(h.line, h.category);
}

function stop(problems) {
  if (!problems.length) return;
  const lines = problems.slice(0, MAX_PROBLEM_LINES);
  if (problems.length > lines.length) lines.push(`and ${problems.length - lines.length} more`);
  throw new Refusal(lines);
}

const README_RE = /^readme(\.(md|markdown|txt|rst))?$/i;
const LICENSE_RE = /^LICENSE(\.md|\.txt)?$/i;
const isTest = (rel) => /\.(test|spec)\./i.test(path.posix.basename(rel)) || rel.split("/").slice(0, -1).some((d) => ["test", "tests", "__tests__"].includes(d.toLowerCase()));

function intakeFile(o, st, nm) {
  const ext = path.extname(o.input).toLowerCase();
  const kind = [".html", ".htm"].includes(ext) ? "html" : [".md", ".markdown", ".txt"].includes(ext) ? "text" : null;
  if (!kind) throw new Refusal(`${nm}: kind not supported; give an .html, .htm, .md, .markdown or .txt file, or a repo folder`);
  if (st.size > MAX_BYTES) throw new Refusal(`${nm}: too large (over 1 MB; cap ${MAX_BYTES} bytes)`);
  const full = path.resolve(o.input); const unscanned = [];
  const texts = readTexts(path.dirname(full), [{ rel: path.basename(full), size: st.size }], unscanned);
  if (unscanned.length) throw new Refusal(`${nm}: ${/binary/.test(unscanned[0].reason) ? "binary file, not text; it cannot be scanned" : "cannot be read"}`);
  const text = texts.get(path.basename(full));
  if (kind === "html" && !/<\s*(html|body)\b/i.test(text)) throw new Refusal(`${nm}: has an .html extension but no html or body tag (mismatch)`);

  const problems = []; const allowedCount = new Map();
  scanFile(nm, text, kind === "html", o.allow, problems, allowedCount);
  stop(problems);

  const idx = makeIndex();
  if (kind === "html") for (const s of parseHtml(text).out) idx.addText(s); else idx.addText(text);
  scanQuotes(nm, idx.quotes, o.allow);
  return { kind, quotes: idx.quotes, stats: { bytes: st.size, quotes: idx.quotes.length, files: 1, skipped_binary: 0 }, skipped: [], allowedCount };
}

function scanQuotes(nm, quotes, allow) {
  if (!quotes.length) return;
  const problems = [];
  for (const h of scanText(quotes.map((q) => q.text).join("\n"), allow).hits) problems.push(`${nm}: quote q${h.line}: ${h.category} found; nothing was written`);
  stop(problems);
}

function intakeRepo(o, nm) {
  const root = path.resolve(o.input);
  let names; try { names = fs.readdirSync(root).sort(cmp); } catch { throw new Refusal(`${nm}: cannot read the folder`); }
  const kindOf = (n) => { try { return fs.lstatSync(path.join(root, n)); } catch { return null; } };
  const hasGit = names.includes(".git") && kindOf(".git")?.isDirectory();
  const readmeName = names.filter((n) => README_RE.test(n) && kindOf(n)?.isFile()).sort((a, b) => (/\.md$/i.test(b) ? 1 : 0) - (/\.md$/i.test(a) ? 1 : 0) || cmp(a, b))[0];
  if (!readmeName && !hasGit) throw new Refusal(`${nm}: not a repo: it needs a README file or a top-level .git folder`);

  const { entries, skipped, unscanned } = walkTree(root);
  const total = entries.reduce((t, e) => t + (e.size <= MAX_BYTES ? e.size : 0), 0);
  if (total > MAX_TOTAL_BYTES) throw new Refusal(`too large: the files to read total over 50 MB (cap ${MAX_TOTAL_BYTES} bytes); nothing was truncated`);
  const texts = readTexts(root, entries, unscanned);
  let skippedBinary = 0;
  for (const u of unscanned) {
    if (u.reason.startsWith("over 1 MB")) throw new Refusal(`${u.file}: too large (over 1 MB; cap ${MAX_BYTES} bytes); nothing was written`);
    const isReadme = readmeName !== undefined && u.file === safeName(readmeName);
    if (isReadme) throw new Refusal(`${u.file}: ${u.reason.startsWith("binary") ? "binary README, not text; it cannot be scanned" : "README cannot be read"}`);
    if (u.reason.startsWith("binary")) { skippedBinary++; skipped.push({ file: u.file, reason: "binary file, not read" }); }
    else skipped.push({ file: u.file, reason: u.reason.startsWith("unreadable directory") ? "unreadable directory" : "unreadable file" });
  }

  const problems = []; const allowedCount = new Map();
  for (const [rel, text] of [...texts].sort((a, b) => cmp(a[0], b[0]))) scanFile(safeName(rel), text, /\.html?$/i.test(rel), o.allow, problems, allowedCount);
  stop(problems);

  const idx = makeIndex();
  if (readmeName !== undefined && texts.has(readmeName)) idx.addText(texts.get(readmeName));
  idx.addFact(`root files: ${names.map((n) => safeName(n)).join(", ")}`);
  idx.addFact(`test files: ${entries.filter((e) => isTest(e.rel)).length}`);
  const lic = entries.filter((e) => !e.rel.includes("/") && LICENSE_RE.test(e.rel)).map((e) => e.rel).sort(cmp)[0];
  if (lic !== undefined) idx.addFact(`license file: ${safeName(lic)}`);
  scanQuotes(nm, idx.quotes, o.allow);

  skipped.sort((a, b) => cmp(a.file, b.file) || cmp(a.reason, b.reason));
  return {
    kind: "repo", quotes: idx.quotes,
    stats: { bytes: entries.reduce((s, e) => s + e.size, 0), quotes: idx.quotes.length, files: entries.length, skipped_binary: skippedBinary },
    skipped, allowedCount,
  };
}

// --out must not land inside the folder being scanned (a later run would read it back as repo text, and it could replace the README).
function outsideScanned(o) {
  let realIn; try { realIn = fs.realpathSync(o.input); if (!fs.statSync(realIn).isDirectory()) return; } catch { return; }
  const out = path.resolve(o.out); let realOut = out;
  try { realOut = path.join(fs.realpathSync(path.dirname(out)), path.basename(out)); } catch {}
  if (realOut === realIn || realOut.startsWith(realIn + path.sep)) usage("--out is inside the folder being scanned; write it somewhere else");
}

function main(argv) {
  const o = parseArgs(argv);
  const nm = safeName(path.basename(o.input) || o.input);
  if (o.out) outsideScanned(o);
  let st; try { st = fs.lstatSync(o.input); } catch { throw new Refusal(`${nm}: not found or cannot be read`); }
  if (st.isSymbolicLink()) throw new Refusal(`${nm}: is a symlink; symlinks are not followed`);
  if (o.out && samePath(o.out, o.input)) throw new Refusal("--out names the input itself; choose a different file");
  let r;
  if (st.isDirectory()) r = intakeRepo(o, nm);
  else if (st.isFile()) r = intakeFile(o, st, nm);
  else throw new Refusal(`${nm}: not a regular file or folder`);

  for (const a of o.allow) if (!r.allowedCount.has(a)) r.allowedCount.set(a, 0);
  const result = {
    tool: "stakeholder-intake", schema: 1, untrusted: true, input: nm, kind: r.kind, quotes: r.quotes, stats: r.stats,
    skipped: r.skipped.slice(0, MAX_SKIPPED_LISTED), skipped_omitted: Math.max(0, r.skipped.length - MAX_SKIPPED_LISTED),
    allowed_emails: [...r.allowedCount].sort((a, b) => cmp(a[0], b[0])).map(([address, count]) => ({ address, count })),
  };
  const json = JSON.stringify(result);
  if (o.out) writeAtomic(o.out, json); else process.stdout.write(json);
}

runMain(main);

#!/usr/bin/env node
// feedback-guard: the deterministic gate every piece of user feedback passes before any agent reads it
// (docs/product/SPEC-FEEDBACK-LOOP.md, FBK-1 to FBK-12). Feedback text is untrusted data, never an instruction.
//
//   scrub                             stdin text -> stdout text with emails, phone numbers, links and secret-looking
//                                     tokens replaced by [removed]. Idempotent.
//   screen [--recent FILE.jsonl]      stdin text -> verdict ok, spam or suspicious, reasons on stderr. spam: too short
//                                     (under 10 characters) or too long (over 2000), a link or ad words, gibberish, a
//                                     duplicate of a recent item ({"text": ...} per line). suspicious: text aimed at an AI.
//   body --product P --page PAGE --severity P0|P1|P2
//                                     stdin text -> the fixed-format issue body with a stable fb-id (8 hex).
//   caps --kind issue|pr --used N [--cap M] [--now ISO]
//                                     trips when used is at or over the cap (defaults: issue 5, pr 3 per UTC day).
//                                     The caller counts the day; --now only labels the day in the reason.
//   kill --root DIR [--paused true]   trips when DIR/.claude/feedback.off or DIR/.claude/agents.off is a file,
//                                     or when --paused true (the feedback-paused variable or label).
//
// Every subcommand takes --json. Exit 0 pass, 1 tripped (one reason per line on stderr), 2 usage error.
// Plain Node, node: built-ins only, no network.
import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const DEFAULT_CAPS = { issue: 5, pr: 3 };
export const MIN_CHARS = 10;
export const MAX_CHARS = 2000;
const REMOVED = "[removed]";
const SEVERITIES = ["P0", "P1", "P2"];
const USAGE = [
  "usage: feedback-guard.mjs scrub [--json]",
  "       feedback-guard.mjs screen [--recent FILE.jsonl] [--json]",
  "       feedback-guard.mjs body --product NAME --page PAGE --severity P0|P1|P2 [--json]",
  "       feedback-guard.mjs caps --kind issue|pr --used N [--cap M] [--now ISO] [--json]",
  "       feedback-guard.mjs kill --root DIR [--paused true] [--json]",
].join("\n");

class UsageError extends Error {}

// ---------- scrub ----------
// Order matters: links first (they hold emails and tokens), then emails, then tokens, then phone numbers.
const SCRUB_RULES = [
  /\b(?:https?:\/\/|www\.)[^\s<>"'`)\]]+/gi,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\b(?:AKIA[0-9A-Z]{12,}|xox[baprs]-[A-Za-z0-9-]{8,})/g,
  /(?=[A-Za-z0-9+/_=-]*\d)[A-Za-z0-9+/_=-]{32,}/g,
  /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g,
];

export function scrubText(text) {
  let out = String(text ?? "");
  for (const re of SCRUB_RULES) out = out.replace(re, REMOVED);
  return out;
}

// ---------- screen ----------
const normalize = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

const INJECTION = [
  /ignore (?:all |any |the )?(?:previous|prior|above|earlier) (?:instructions|prompts?|rules)/,
  /disregard (?:all |any |the )?(?:previous|prior|above|earlier) (?:instructions|prompts?|rules)/,
  /forget (?:all |your |the )?(?:previous |prior )?instructions/,
  /you are now (?:the|a|an|my|in|free|admin|root)\b/,
  /system prompt/,
  /run this command/,
  /disable (?:the |all )?tests/,
  /merge this (?:pr|pull request)/,
  /new instructions\s*:/,
];
const AD_WORDS = /\b(?:buy now|click here|free money|viagra|casino|seo services|limited time offer|crypto giveaway|work from home)\b/;
const LINK = /\b(?:https?:\/\/|www\.)\S+/i;

export function screenText(text, { recent = [] } = {}) {
  const raw = String(text ?? "");
  const trimmed = raw.trim();
  const norm = normalize(raw);
  const suspicious = [];
  const spam = [];
  for (const re of INJECTION) {
    const m = norm.match(re);
    if (m) suspicious.push(`text aimed at an AI: "${m[0]}"`);
  }
  if (trimmed.length < MIN_CHARS) spam.push(`too short: under ${MIN_CHARS} characters`);
  if (trimmed.length > MAX_CHARS) spam.push(`too long: over ${MAX_CHARS} characters`);
  if (LINK.test(raw)) spam.push("contains a link");
  if (AD_WORDS.test(norm)) spam.push("contains ad words");
  if (trimmed.length >= MIN_CHARS) {
    const compact = trimmed.replace(/\s/g, "");
    const letters = (compact.match(/\p{L}/gu) || []).length;
    if (/(.)\1{7,}/u.test(compact) || letters / compact.length < 0.4 || !/[aeiouy]/i.test(compact) || /[^aeiouy\W\d_]{20,}/i.test(compact)) {
      spam.push("gibberish");
    }
  }
  if (norm && (recent || []).some((r) => normalize(r) === norm)) spam.push("duplicate of a recent item");
  if (suspicious.length) return { verdict: "suspicious", reasons: [...suspicious, ...spam] };
  if (spam.length) return { verdict: "spam", reasons: spam };
  return { verdict: "ok", reasons: [] };
}

// ---------- body ----------
const oneLine = (s) => scrubText(s).replace(/\s+/g, " ").trim();

export function renderBody({ text, product, page, severity } = {}) {
  if (!SEVERITIES.includes(severity)) throw new UsageError(`severity "${severity}" must be one of ${SEVERITIES.join(", ")}`);
  if (!product || !page) throw new UsageError("product and page are required");
  const clean = scrubText(text).replace(/fb-id/gi, "fb_id").trim();
  const p = oneLine(product);
  const pg = oneLine(page);
  const id = createHash("sha256").update([normalize(clean), p, pg].join("\n")).digest("hex").slice(0, 8);
  return [`fb-id: ${id}`, `product: ${p}`, `page: ${pg}`, `severity: ${severity}`, "", clean, ""].join("\n");
}

// ---------- caps ----------
export function checkCaps({ kind, used, cap, now } = {}) {
  if (!(kind in DEFAULT_CAPS)) throw new UsageError(`--kind "${kind}" must be issue or pr`);
  if (!Number.isInteger(used) || used < 0) throw new UsageError(`--used "${used}" must be a whole number, 0 or more`);
  if (cap !== undefined && (!Number.isInteger(cap) || cap < 1)) throw new UsageError(`--cap "${cap}" must be a whole number, 1 or more`);
  const when = now === undefined ? new Date() : new Date(now);
  if (Number.isNaN(when.getTime())) throw new UsageError(`--now "${now}" is not a time`);
  const limit = cap ?? DEFAULT_CAPS[kind];
  const day = when.toISOString().slice(0, 10);
  if (used >= limit) return { ok: false, reasons: [`cap reached: ${used} ${kind === "pr" ? "auto-PRs" : "new issues"} used of ${limit} for UTC day ${day}`] };
  return { ok: true, reasons: [] };
}

// ---------- kill ----------
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };

export function checkKill({ root, paused = false } = {}) {
  if (!root || !isDir(root)) throw new UsageError(`--root ${root} is not a folder`);
  const reasons = [];
  if (isFile(join(root, ".claude", "feedback.off"))) reasons.push("kill switch .claude/feedback.off is on: feedback is halted (delete the file to resume)");
  if (isFile(join(root, ".claude", "agents.off"))) reasons.push("kill switch .claude/agents.off is on: every agent is halted (delete the file to resume)");
  if (paused) reasons.push("paused: the feedback-paused flag is set");
  return { ok: reasons.length === 0, reasons };
}

// ---------- CLI ----------
function parseArgs(argv, flags) {
  const pos = [];
  const opts = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (flags.includes(a)) {
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith("-") && !/^-\d/.test(v))) throw new UsageError(`${a} needs a value`);
      opts[a.slice(2)] = v;
      i++;
    } else if (a.startsWith("--")) throw new UsageError(`unknown option ${a}`);
    else pos.push(a);
  }
  if (pos.length) throw new UsageError(`unexpected argument "${pos[0]}"`);
  return opts;
}

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

const need = (opts, name) => {
  if (opts[name] === undefined || opts[name] === "") throw new UsageError(`--${name} is required`);
  return opts[name];
};
const wholeNumber = (name, s) => {
  if (!/^\d+$/.test(s)) throw new UsageError(`--${name} "${s}" must be a whole number`);
  return Number(s);
};

export function main(argv, stdin = readStdin) {
  const [sub, ...rest] = argv;
  if (sub === "-h" || sub === "--help") return { code: 0, out: USAGE, err: "" };
  try {
    if (sub === "scrub") {
      const opts = parseArgs(rest, []);
      const text = scrubText(stdin());
      return { code: 0, raw: true, out: opts.json ? JSON.stringify({ text }) : text, err: "" };
    }
    if (sub === "screen") {
      const opts = parseArgs(rest, ["--recent"]);
      let recent = [];
      if (opts.recent !== undefined) {
        let file;
        try { file = readFileSync(opts.recent, "utf8"); } catch { throw new UsageError(`can't read ${opts.recent}`); }
        for (const line of file.split("\n").filter((l) => l.trim())) {
          let rec;
          try { rec = JSON.parse(line); } catch { throw new UsageError(`${opts.recent} has a line that is not JSON`); }
          if (rec && typeof rec.text === "string") recent.push(rec.text);
        }
      }
      const r = screenText(stdin(), { recent });
      return { code: r.verdict === "ok" ? 0 : 1, out: opts.json ? JSON.stringify(r) : r.verdict, err: r.reasons.join("\n") };
    }
    if (sub === "body") {
      const opts = parseArgs(rest, ["--product", "--page", "--severity"]);
      const body = renderBody({ text: stdin(), product: need(opts, "product"), page: need(opts, "page"), severity: need(opts, "severity") });
      return { code: 0, raw: true, out: opts.json ? JSON.stringify({ body }) : body, err: "" };
    }
    if (sub === "caps") {
      const opts = parseArgs(rest, ["--kind", "--used", "--cap", "--now"]);
      const r = checkCaps({
        kind: need(opts, "kind"),
        used: wholeNumber("used", need(opts, "used")),
        cap: opts.cap !== undefined ? wholeNumber("cap", opts.cap) : undefined,
        now: opts.now,
      });
      return { code: r.ok ? 0 : 1, out: opts.json ? JSON.stringify(r) : "", err: r.reasons.join("\n") };
    }
    if (sub === "kill") {
      const opts = parseArgs(rest, ["--root", "--paused"]);
      if (opts.paused !== undefined && !["true", "false"].includes(opts.paused)) throw new UsageError(`--paused "${opts.paused}" must be true or false`);
      const r = checkKill({ root: resolve(need(opts, "root")), paused: opts.paused === "true" });
      return { code: r.ok ? 0 : 1, out: opts.json ? JSON.stringify(r) : "", err: r.reasons.join("\n") };
    }
    throw new UsageError(sub === undefined ? "no subcommand" : `unknown subcommand "${sub}"`);
  } catch (e) {
    if (e instanceof UsageError) return { code: 2, out: "", err: `${e.message}\n${USAGE}` };
    throw e;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const { code, out, err, raw } = main(process.argv.slice(2));
  if (out) process.stdout.write(raw ? out : out + "\n");
  if (err) console.error(err);
  process.exitCode = code;
}

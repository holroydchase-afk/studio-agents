#!/usr/bin/env node
// check-triage: validates the ```triage block Staff PM writes for each feedback issue
// (docs/product/SPEC-FEEDBACK-LOOP.md, FBK-13 to FBK-15).
//   node tools/check-triage.mjs reply.md     exit 0 valid, 1 invalid (one error per line on stderr), 2 usage error
// The LAST ```triage block wins. Keys, once each: verdict, lane, severity, risk, done-when, eval-candidate.
// Errors never echo an email, phone, URL or token. Plain Node, no network.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ENUMS = {
  verdict: ["fix", "idea", "reject", "needs-chase"],
  lane: ["ux", "qa-tdd"],
  severity: ["P0", "P1", "P2"],
  risk: ["lowrisk", "not"],
  "eval-candidate": ["yes", "no"],
};
const KEYS = [...Object.keys(ENUMS), "done-when"];
const FENCE = "`".repeat(3);

const SECRETS = [
  [/\b(?:https?:\/\/|www\.)\S+/i, "a link"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/, "an email address"],
  [/\bsk-[A-Za-z0-9_-]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{12,}|\bxox[baprs]-[A-Za-z0-9-]{8,}|(?=[A-Za-z0-9+/_=-]*\d)[A-Za-z0-9+/_=-]{32,}/, "a secret-looking token"],
  [/(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/, "a phone number"],
];

function lastBlock(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  let found = null;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith(FENCE + "triage")) continue;
    const body = [];
    let closed = false;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim().startsWith(FENCE)) { closed = true; i = j; break; }
      body.push(lines[j]);
    }
    found = closed ? { body } : { unclosed: true };
    if (!closed) break;
  }
  return found;
}

export function checkTriage(text) {
  const blk = lastBlock(text);
  if (!blk) return { ok: false, errors: ["no ```triage block found"] };
  if (blk.unclosed) return { ok: false, errors: ["the ```triage block is not closed"] };
  const errors = [];
  const vals = {};
  const seen = new Set();
  for (const raw of blk.body) {
    if (!raw.trim()) continue;
    const m = raw.match(/^\s*([^:]+?)\s*:\s*(.*?)\s*$/);
    if (!m) { errors.push("a line is not `key: value`"); continue; }
    const [, key, value] = m;
    if (!KEYS.includes(key)) {
      // The key may hold PII, so never echo anything that looks like it.
      const safe = SECRETS.some(([re]) => re.test(key)) || !/^[\w-]{1,30}$/.test(key);
      errors.push(`unknown key ${safe ? "(not echoed)" : key}`);
      continue;
    }
    if (seen.has(key)) { errors.push(`duplicate key ${key}`); continue; }
    seen.add(key);
    vals[key] = value;
  }
  for (const k of KEYS) if (!seen.has(k) && k !== "done-when") errors.push(`missing key ${k}`);
  if (!seen.has("done-when")) errors.push("missing key done-when");
  for (const [k, list] of Object.entries(ENUMS)) {
    if (seen.has(k) && !list.includes(vals[k])) errors.push(`${k} must be one of ${list.join(", ")}`);
  }
  const { verdict, severity, risk } = vals;
  const doneWhen = vals["done-when"];
  if (["fix", "idea", "reject"].includes(verdict) && seen.has("done-when") && !doneWhen) {
    errors.push(`done-when is required (one line) for verdict ${verdict}`);
  }
  if (risk === "lowrisk" && ENUMS.verdict.includes(verdict) && verdict !== "fix") errors.push("risk lowrisk is only valid with verdict fix");
  if (severity === "P0" && ENUMS.verdict.includes(verdict) && verdict !== "needs-chase") errors.push("severity P0 requires verdict needs-chase");
  const hit = new Set();
  for (const raw of blk.body) for (const [re, name] of SECRETS) if (re.test(raw)) hit.add(name);
  for (const name of hit) errors.push(`the block contains ${name}; remove it`);
  return { ok: errors.length === 0, errors };
}

function main(argv) {
  if (argv.length !== 1 || argv[0].startsWith("--")) return { code: 2, err: "usage: check-triage.mjs <reply.md>" };
  let text;
  try { text = readFileSync(resolve(argv[0]), "utf8"); } catch { return { code: 2, err: `can't read ${argv[0]}` }; }
  const r = checkTriage(text);
  return r.ok ? { code: 0, err: "" } : { code: 1, err: r.errors.join("\n") };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { code, err } = main(process.argv.slice(2));
  if (err) console.error(err);
  process.exitCode = code;
}

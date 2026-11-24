#!/usr/bin/env node
// product-review: the pieces a per-product review needs (stakeholder, UX and QA-TDD together). Plain Node, no network.
// Built from the Hearth pilot gaps (claims check, freshness gate, lane map, one entry point, label contract, merge).
//
//   node tools/product-review.mjs claims <README.md>             numeric test claims and the command beside each
//   node tools/product-review.mjs fresh --shots DATE [--head DATE] [--lag N]   exit 1 when screenshots are stale
//   node tools/product-review.mjs lane <product> <stakeholder|ux|qa>
//   node tools/product-review.mjs plan <product>                 the three runs and the logging command for each
//   node tools/product-review.mjs merge <report>...              one ranked ```review block; exit 1 on a bad report
//
// Report contract (one per agent): `source: stakeholder|ux|qa`, `validation: validated` or
// `validation: unvalidated: <reason>`, then `item: ID | P0|P1|P2 | observed|viewed|inferred | text` lines.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---- claims check ----
const NOUNS = "(?:app |unit |end-to-end |e2e |database |api |contract |web )?(?:tests?|checks?|test files?)";
const CLAIM = new RegExp(`(\\d{1,3}(?:,\\d{3})+|\\d+)\\+?\\s+(${NOUNS})\\b`, "gi");

export function claimsCheck(text) {
  const claims = [];
  for (const line of String(text).split("\n")) {
    const cmd = (line.match(/`((?:bash|npm|npx|node|python3?|pytest|make)\b[^`]*)`/) || [])[1] || null;
    for (const m of line.matchAll(CLAIM)) {
      const number = Number(m[1].replace(/,/g, ""));
      claims.push({ number, noun: m[2].toLowerCase(), command: cmd });
    }
  }
  return { claims, unverifiable: claims.filter((c) => !c.command).length };
}

// ---- freshness ----
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function checkFreshness({ shotsAt, headAt, maxLagDays = 0 }) {
  for (const d of [shotsAt, headAt]) if (!DATE.test(String(d))) throw new Error(`bad date: ${d} (use YYYY-MM-DD)`);
  const lag = Math.round((Date.parse(headAt) - Date.parse(shotsAt)) / 86400000);
  return { stale: lag > maxLagDays, lagDays: lag };
}

// ---- lane map ----
const LANES = ["stakeholder", "ux", "qa"];
const DEFAULT_AGENT = { stakeholder: "stakeholder", ux: "ux-reviewer", qa: "qa-tdd" };
const PRODUCT_AGENT = { hearth: { ux: "grandparent-ux" } };
export function laneFor(product, lane) {
  if (!LANES.includes(lane)) throw new Error(`unknown lane: ${lane} (use ${LANES.join(", ")})`);
  return (PRODUCT_AGENT[String(product).toLowerCase()] || {})[lane] || DEFAULT_AGENT[lane];
}

export function planReview(product) {
  return {
    product,
    runs: LANES.map((lane) => {
      const agent = laneFor(product, lane);
      return { lane, agent, log: `bash scripts/log-agent-run.sh --as ${agent}` };
    }),
  };
}

// ---- report contract ----
const PRIORITY = ["P0", "P1", "P2"];
const LABELS = ["observed", "viewed", "inferred"];
const STRENGTH = { observed: 0, viewed: 1, inferred: 2 };

export function parseReport(text) {
  const errors = [];
  let source = null;
  let validation = null;
  const items = [];
  for (const raw of String(text).split("\n")) {
    const line = raw.trim();
    let m;
    if ((m = line.match(/^source:\s*(.*)$/i))) source = m[1].trim().toLowerCase();
    else if ((m = line.match(/^validation:\s*(.*)$/i))) validation = m[1].trim();
    else if ((m = line.match(/^item:\s*(.*)$/i))) {
      const parts = m[1].split("|").map((s) => s.trim());
      if (parts.length < 4 || parts.slice(3).join("|").trim() === "") {
        errors.push(`bad item line: ${line}`);
        continue;
      }
      const [id, priority, label] = parts;
      const body = parts.slice(3).join(" | ");
      items.push({ id, priority, label, text: body });
    }
  }
  if (!LANES.includes(source)) errors.push(`source must be one of ${LANES.join(", ")} (got ${source ?? "none"})`);
  if (validation === null) errors.push("missing validation header (validated, or unvalidated: <reason>)");
  else if (/^unvalidated\b/i.test(validation)) {
    if (!/^unvalidated:\s*\S/i.test(validation)) errors.push("unvalidated needs a reason: `validation: unvalidated: <reason>`");
  } else if (!/^validated$/i.test(validation)) errors.push(`validation must be validated or unvalidated: <reason> (got ${validation})`);
  for (const it of items) {
    if (!PRIORITY.includes(it.priority)) errors.push(`${it.id}: bad priority ${it.priority}`);
    if (!LABELS.includes(it.label)) errors.push(`${it.id}: bad label ${it.label} (use ${LABELS.join(", ")})`);
    else if (it.label === "viewed" && source !== "ux") errors.push(`${it.id}: only the ux source may use the viewed label`);
  }
  return { errors, source, validation, items };
}

export function mergeReports(texts) {
  const errors = [];
  const items = [];
  let unvalidated = [];
  for (const [i, t] of texts.entries()) {
    const r = parseReport(t);
    r.errors.forEach((e) => errors.push(`report ${i + 1}: ${e}`));
    if (/^unvalidated/i.test(r.validation || "")) unvalidated.push(r.source);
    r.items.forEach((it, n) => items.push({ ...it, source: r.source, order: i * 1000 + n }));
  }
  items.sort((a, b) => PRIORITY.indexOf(a.priority) - PRIORITY.indexOf(b.priority) || STRENGTH[a.label] - STRENGTH[b.label] || a.order - b.order);
  const verdict = items.some((i) => i.priority === "P0" || i.priority === "P1") ? "fix" : "go";
  const validation = unvalidated.length ? `unvalidated: ${unvalidated.join(", ")}` : "validated";
  return { errors, items, verdict, validation };
}

function render(m) {
  const lines = ["```review", `verdict: ${m.verdict}`, `validation: ${m.validation}`];
  m.items.forEach((i, n) => lines.push(`item: ${n + 1} | ${i.priority} | ${i.label} | ${i.source} | ${i.id}: ${i.text}`));
  lines.push("```");
  return lines.join("\n");
}

// ---- CLI ----
function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
function main(argv) {
  const [cmd, ...args] = argv;
  try {
    if (cmd === "claims") {
      const r = claimsCheck(fs.readFileSync(args[0], "utf8"));
      for (const c of r.claims) console.log(`${c.number} ${c.noun} | ${c.command ? `command: ${c.command}` : "no command named (unverifiable)"}`);
      if (!r.claims.length) console.log("no numeric test claims found");
      return 0;
    }
    if (cmd === "fresh") {
      const headAt = flag(args, "--head") || execFileSync("git", ["log", "-1", "--format=%cs"], { encoding: "utf8" }).trim();
      const r = checkFreshness({ shotsAt: flag(args, "--shots"), headAt, maxLagDays: Number(flag(args, "--lag") || 0) });
      console.log(r.stale ? `stale: shots are ${r.lagDays} day(s) older than HEAD; capture again first` : "fresh");
      return r.stale ? 1 : 0;
    }
    if (cmd === "lane") {
      console.log(laneFor(args[0], args[1]));
      return 0;
    }
    if (cmd === "plan") {
      for (const r of planReview(args[0]).runs) console.log(`${r.lane}: run ${r.agent}; then ${r.log}`);
      return 0;
    }
    if (cmd === "merge") {
      const m = mergeReports(args.map((f) => fs.readFileSync(f, "utf8")));
      if (m.errors.length) {
        m.errors.forEach((e) => console.error(e));
        return 1;
      }
      console.log(render(m));
      return 0;
    }
    console.error("usage: product-review.mjs claims|fresh|lane|plan|merge ...");
    return 2;
  } catch (e) {
    console.error(e.message);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));

#!/usr/bin/env node
// feedback-gate: what the feedback-gate workflow runs on a new feedback issue (docs/feedback-loop.md,
// docs/product/SPEC-FEEDBACK-LOOP.md FBK-19..22). Synced next to feedback-guard.mjs in a product's scripts/.
// Never calls a model. Feedback text is untrusted data: it is screened and labeled, never obeyed.
//   gateIssue({issue, existing, now, caps, paused}) -> {labels, close, reasons}   (pure)
//   --preflight --root DIR [--paused true]   exit 1 (reason on stderr) when the kill switch is on, before any issue is read
//   --run --root DIR --issue N [--paused true]   preflight, then read issue N and its siblings with the gh CLI, label it
//                                                (and close it when spam). Needs GH_TOKEN and GITHUB_REPOSITORY.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { screenText, renderBody, checkKill } from "./feedback-guard.mjs";

const GATED = ["needs-triage", "spam", "suspicious", "over-cap"];
const SEVERITY = { bug: "P1", ux: "P2", idea: "P2" };

// Issue-form bodies arrive as "### Heading\n\nvalue" sections. Turn one into the fixed fb-id format. A body that
// already has an fb-id header is returned unchanged.
export function normalizeBody(body) {
  const raw = String(body ?? "");
  if (/^fb-id:\s*[0-9a-f]{8}\s*$/m.test(raw.split(/\r?\n\r?\n/)[0])) return raw;
  const sec = {};
  for (const part of raw.split(/^###\s+/m).slice(1)) {
    const [head, ...rest] = part.split(/\r?\n/);
    sec[head.trim().toLowerCase()] = rest.join("\n").trim().replace(/^_No response_$/, "");
  }
  const kind = (sec["kind of feedback"] || "").toLowerCase();
  try {
    return renderBody({ text: sec["what happened?"] ?? raw, product: sec.product || "unknown", page: sec.page || "unknown", severity: SEVERITY[kind] || "P2" });
  } catch { return raw; }
}

const parseBody = (body) => {
  const [head, ...rest] = String(body ?? "").split(/\r?\n\r?\n/);
  const m = head.match(/^fb-id:\s*([0-9a-f]{8})\s*$/m);
  return { fbId: m ? m[1] : null, text: rest.join("\n\n") };
};
const day = (t) => new Date(t).toISOString().slice(0, 10);

export function gateIssue({ issue, existing = [], now, caps = {}, paused = false } = {}) {
  if (paused) return { labels: [], close: false, reasons: ["paused"] };
  const { fbId, text } = parseBody(issue.body);
  const s = screenText(text);
  if (s.verdict === "spam") return { labels: ["spam"], close: true, reasons: s.reasons };
  if (s.verdict === "suspicious") return { labels: ["suspicious"], close: false, reasons: s.reasons };
  const others = existing.filter((e) => e.number !== issue.number);
  const created = issue.createdAt ?? now;
  const before = (e) => new Date(e.createdAt) < new Date(created) || (new Date(e.createdAt).getTime() === new Date(created).getTime() && e.number < issue.number);
  if (fbId && others.some((e) => e.fbId === fbId && !(e.labels || []).includes("spam") && before(e))) {
    return { labels: ["spam"], close: true, reasons: ["duplicate"] };
  }
  const cap = caps.issue ?? 5;
  const used = others.filter((e) => day(e.createdAt) === day(now) && !(e.labels || []).includes("spam")).length;
  if (used >= cap) return { labels: ["over-cap"], close: false, reasons: [`over the cap of ${cap} issues for UTC day ${day(now)}`] };
  return { labels: ["needs-triage"], close: false, reasons: [] };
}

// ---------- CLI ----------
function opts(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2);
    const v = argv[i + 1];
    if (v !== undefined && !v.startsWith("--")) { o[k] = v; i++; } else o[k] = true;
  }
  return o;
}
const gh = (args) => {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(" ")} failed`);
  return r.stdout;
};

function main(argv) {
  const o = opts(argv);
  if (!o.preflight && !o.run) return { code: 2, err: "usage: feedback-gate.mjs --preflight|--run --root DIR [--issue N] [--paused true]" };
  if (typeof o.root !== "string") return { code: 2, err: "--root DIR is required" };
  let k;
  try { k = checkKill({ root: resolve(o.root), paused: o.paused === "true" }); } catch (e) { return { code: 2, err: e.message }; }
  if (!k.ok) return { code: 1, err: k.reasons.join("\n") };
  if (o.preflight) return { code: 0, err: "" };
  if (!/^\d+$/.test(o.issue || "")) return { code: 2, err: "--issue N is required" };
  const n = Number(o.issue);
  const one = JSON.parse(gh(["issue", "view", String(n), "--json", "number,title,body,labels,createdAt"]));
  const labels = one.labels.map((l) => l.name);
  if (!labels.includes("feedback") || labels.some((l) => GATED.includes(l))) return { code: 0, err: "" };
  const list = JSON.parse(gh(["issue", "list", "--label", "feedback", "--state", "all", "--limit", "200", "--json", "number,body,labels,createdAt"]));
  const existing = list.map((e) => ({ number: e.number, fbId: parseBody(normalizeBody(e.body)).fbId, labels: e.labels.map((l) => l.name), createdAt: e.createdAt }));
  const norm = normalizeBody(one.body);
  const r = gateIssue({ issue: { number: n, title: one.title, body: norm, labels }, existing, now: new Date().toISOString(), caps: {}, paused: false });
  for (const l of r.labels) { spawnSync("gh", ["label", "create", l, "--force"], { encoding: "utf8" }); gh(["issue", "edit", String(n), "--add-label", l]); }
  if (r.close) gh(["issue", "close", String(n), "--reason", "not planned"]);
  return { code: 0, err: "", out: `issue ${n}: ${r.labels.join(",") || "no change"}${r.close ? " (closed)" : ""}` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let r;
  try { r = main(process.argv.slice(2)); } catch (e) { r = { code: 2, err: e.message }; }
  if (r.out) console.log(r.out);
  if (r.err) console.error(r.err);
  process.exitCode = r.code;
}

#!/usr/bin/env node
// Nightly release train: PRs that change a live site carry the `release-train` label all day; one late-night
// run merges every green one in a safe order, verifies the deploys and posts one release note.
// Pure logic only; the routine does the GitHub calls (docs/release-train.md).
export const HOME_MARKER = "Hey there, I'm Chase.";
export const PORTFOLIO_REPO = "holroydchase-afk.github.io";
const LABEL = "release-train";

const mergeAfter = (body) => {
  const m = /^Merge after:\s*(.+)$/im.exec(body || "");
  if (!m) return [];
  return [...m[1].matchAll(/#(\d+)/g)].map((x) => Number(x[1]));
};

export function eligible(prs, { merged = [] } = {}) {
  const held = [];
  const base = [];
  for (const p of prs) {
    if (!p.labels?.includes(LABEL)) { held.push({ number: p.number, repo: p.repo, reason: `no ${LABEL} label` }); continue; }
    if (p.draft) { held.push({ number: p.number, repo: p.repo, reason: "draft" }); continue; }
    if (p.checks !== "success") { held.push({ number: p.number, repo: p.repo, reason: `checks ${p.checks}` }); continue; }
    if (!p.mergeable) { held.push({ number: p.number, repo: p.repo, reason: "not mergeable (conflict)" }); continue; }
    base.push(p);
  }
  // Merge after: #N holds a PR unless N also rides (and is itself ready).
  let ready = base;
  for (let changed = true; changed; ) {
    changed = false;
    const nums = new Set(ready.filter((p) => true).map((p) => `${p.repo}#${p.number}`));
    const next = [];
    for (const p of ready) {
      const blocker = mergeAfter(p.body).find((n) => !nums.has(`${p.repo}#${n}`) && !merged.includes(`${p.repo}#${n}`));
      if (blocker) { held.push({ number: p.number, repo: p.repo, reason: `Merge after #${blocker} not merged or not riding` }); changed = true; }
      else next.push(p);
    }
    ready = next;
  }
  return { ready, held };
}

export function order(ready) {
  const rank = (r) => (r === PORTFOLIO_REPO ? 1 : 0); // portfolio last: it links to the demos
  const deps = (p) => mergeAfter(p.body);
  const sorted = [...ready].sort((a, b) => rank(a.repo) - rank(b.repo) || a.repo.localeCompare(b.repo) || new Date(a.createdAt) - new Date(b.createdAt));
  const out = [];
  const seen = new Set(); // a Merge after cycle or self-reference must not recurse forever
  const place = (p) => {
    if (out.includes(p) || seen.has(p)) return;
    seen.add(p);
    for (const n of deps(p)) { const d = sorted.find((x) => x.repo === p.repo && x.number === n); if (d) place(d); }
    out.push(p);
  };
  sorted.forEach(place);
  return out;
}

export function verifyPage({ status, body, mustContain }) {
  if (status !== 200) return { ok: false, why: `status ${status}` };
  if (mustContain && !String(body).includes(mustContain)) return { ok: false, why: "marker missing" };
  return { ok: true };
}

export function decideShip({ autoShip, yesTonight }) {
  if (autoShip) return { ship: true, reason: "auto-ship is on" };
  if (yesTonight) return { ship: true, reason: "Chase said yes to tonight's train" };
  return { ship: false, reason: "no yes for tonight's train: nothing merges; the queue waits and is listed in the morning note" };
}

export function releaseNote({ merged, held, verified, date }) {
  const L = [`# Release train ${date}`, ""];
  L.push(`Merged (${merged.length}):`, ...(merged.length ? merged.map((p) => `- ${p.repo}#${p.number}${p.title ? " " + p.title : ""}`) : ["- nothing"]), "");
  L.push(`Held (${held.length}):`, ...(held.length ? held.map((h) => `- ${h.repo}#${h.number}: ${h.reason}`) : ["- none"]), "");
  L.push("Verified:", ...(verified.length ? verified.map((v) => `- ${v.ok ? "ok" : "FAILED"} ${v.url}${v.ok ? "" : ` (${v.why})`}`) : ["- nothing to verify"]));
  if (verified.some((v) => !v.ok)) L.push("", "A check failed. Open a revert PR for the PR that broke it; never force-push or delete branches.");
  return L.join("\n");
}

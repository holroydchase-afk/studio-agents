#!/usr/bin/env node
// studio-scorecard: the living scorecard. Is each agent better than plain Claude, is the portfolio better, what did the work buy.
// Regenerates from the eval logs on disk; nothing is typed in by hand except docs/scorecard/evidence.json, and every entry there needs a source.
//   evals/lazy-prompts/runs/*/results.json   blind pairwise grading, winner agent|plain|tie (Staff PM)
//   evals/agent-misses/runs/*/results.json   pass/fail per case per arm, paired by case name (QA-TDD, Staff PM)
//   docs/scorecard/evidence.json             results with no machine log (cited), plus statuses such as "not run"
//   --outcomes <file>                        PRIVATE outcomes (visits, recruiter replies, ...); never committed to this public repo
// Rules: n is always shown with an interval; below n=10 or p>=0.05 the verdict is "not proven"; tokens are "not measured".
// Usage: node tools/studio-scorecard.mjs [--root dir] [--outcomes file] [--json out] [--html out]
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const USAGE = "usage: studio-scorecard.mjs [--root dir] [--outcomes file] [--json out] [--html out]";
const AGENTS = ["ux-reviewer", "qa-tdd", "staff-pm", "stakeholder"];
const OUTCOME_KEYS = [
  ["visits", "Site visits", "Umami live on the portfolio"],
  ["recruiter_replies", "Recruiter replies", "Role Radar application log"],
  ["screens", "Recruiter screens", "Role Radar application log"],
  ["linkedin", "LinkedIn post results", "first posts published"],
  ["eval_findings_fixed", "Eval findings fixed (of filed)", "product threads close the intake issues"],
  ["repo_standards_met", "Repo standards met", "repo-check run on each public repo"],
];

export function signP(a, b) { // exact two-sided sign test, ties excluded
  const n = a + b; if (!n) return 1;
  const k = Math.min(a, b);
  let c = 1, cum = 0; // c = C(n,i)
  for (let i = 0; i <= k; i++) { cum += c; c = (c * (n - i)) / (i + 1); }
  return Math.min(1, (2 * cum) / 2 ** n);
}
export function wilson(w, n, z = 1.96) {
  if (!n) return [0, 1];
  const p = w / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - m) / d, (c + m) / d];
}
export function verdict(w, l) {
  const n = w + l;
  if (n < 10) return `not proven (only ${n} decisive pairs; need 10)`;
  const p = signP(w, l);
  if (p >= 0.05) return `not proven (sign test p = ${p.toFixed(2)})`;
  return w > l ? `edge shown (sign test p = ${p.toFixed(3)})` : `agent worse (sign test p = ${p.toFixed(3)})`;
}
export function countMergesByDay(days) { const o = {}; for (const d of days) o[d] = (o[d] || 0) + 1; return o; }

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const dirs = (p) => (existsSync(p) ? readdirSync(p).sort() : []);

function row(base, w, l, t) {
  const n = w + l + t, dec = w + l;
  return { ...base, agent_wins: w, plain_wins: l, ties: t, n, win_rate: dec ? w / dec : null, ci: wilson(w, dec), verdict: verdict(w, l) };
}

export function buildStudioScorecard(root, { outcomesPath, mergeDays } = {}) {
  const agents = Object.fromEntries(AGENTS.map((a) => [a, { agent: a, status: null, comparisons: [], notes: [] }]));
  const problems = [];
  // Staff PM: lazy-prompt blind pairs
  const lz = join(root, "evals", "lazy-prompts", "runs");
  for (const id of dirs(lz)) {
    const j = readJson(join(lz, id, "results.json")); if (!j || !Array.isArray(j.results)) continue;
    let w = 0, l = 0, t = 0;
    for (const r of j.results) { const x = String(r.winner || ""); if (x.startsWith("agent")) w++; else if (x.startsWith("plain")) l++; else t++; }
    const fresh = id.includes("fresh");
    agents["staff-pm"].comparisons.push(row({ id: `lazy-${id}`, label: `Lazy prompts, ${id}`, source: `evals/lazy-prompts/runs/${id}/results.json`, grader: j.grader || "not recorded", clean: fresh,
      note: fresh ? "New prompts, not tuned on." : "Prompts were seen while tuning, so this is not a clean test." }, w, l, t));
  }
  // QA-TDD and Staff PM: per-case pass/fail, arms paired by case name
  const am = join(root, "evals", "agent-misses", "runs");
  for (const id of dirs(am)) {
    const j = readJson(join(am, id, "results.json")); if (!j || !Array.isArray(j.results)) continue;
    const by = {};
    for (const r of j.results) {
      const agent = r.by || AGENTS.find((a) => String(r.case).startsWith(`${a}-`)); if (!agent || !["agent", "plain"].includes(r.arm)) continue;
      ((by[agent] ||= {})[r.arm] ||= {})[r.case] = r.pass === true;
    }
    for (const [agent, arms] of Object.entries(by)) {
      if (!arms.agent || !arms.plain || !agents[agent]) continue;
      const a = Object.keys(arms.agent).sort(), p = Object.keys(arms.plain).sort();
      if (a.join("|") !== p.join("|")) continue; // unpaired case sets are not compared
      let w = 0, l = 0, t = 0;
      for (const c of a) { if (arms.agent[c] && !arms.plain[c]) w++; else if (!arms.agent[c] && arms.plain[c]) l++; else t++; }
      const dev = id.includes("dev");
      agents[agent].comparisons.push(row({ id: `misses-${id}`, label: `Planted-miss cases, ${id}`, source: `evals/agent-misses/runs/${id}/results.json`, grader: "pass/fail against written criteria", clean: !dev,
        note: dev ? "Dev set: the agent was tuned on it, not a claim." : "Held-out set. Counts report format as well as finding the bug." }, w, l, t));
    }
  }
  // Cited evidence with no machine log
  const ev = readJson(join(root, "docs", "scorecard", "evidence.json"));
  for (const e of ev?.entries || []) {
    if (!e.source) { problems.push(`evidence ${e.id}: no source, not shown`); continue; }
    const a = agents[e.agent]; if (!a) { problems.push(`evidence ${e.id}: unknown agent ${e.agent}`); continue; }
    if (e.status) a.status = e.status;
    if (e.note_only) a.notes.push({ text: e.note_only, source: e.source });
    if (Number.isInteger(e.n) && e.agent_wins !== undefined) {
      a.comparisons.push(row({ id: e.id, label: e.label, source: e.source, grader: e.grader || "not recorded", clean: e.clean !== false, note: e.note || "" }, e.agent_wins, e.plain_wins || 0, e.ties || 0));
    } else if (e.label && !e.status && !e.note_only) a.notes.push({ text: e.label, source: e.source });
  }
  // Outcomes (private)
  const given = outcomesPath ? readJson(outcomesPath) || {} : {};
  const outcomes = OUTCOME_KEYS.map(([key, label, unlock]) => ({ key, label, unlock, ...(given[key] !== undefined ? (typeof given[key] === "object" ? given[key] : { value: given[key] }) : { value: "not measured" }) }));
  // Output metrics from the repo itself
  let days = mergeDays;
  if (!days) { const g = spawnSync("git", ["-C", root, "log", "--merges", "--format=%cs"], { encoding: "utf8" }); days = g.status === 0 ? g.stdout.split("\n").filter(Boolean) : []; }
  const byDay = countMergesByDay(days);
  const evalRuns = [lz, am].reduce((s, d) => s + dirs(d).filter((i) => existsSync(join(d, i, "results.json"))).length, 0);
  const ef = existsSync(join(root, "docs", "eval-findings.md")) ? /Total (\d+) findings/.exec(readFileSync(join(root, "docs", "eval-findings.md"), "utf8")) : null;
  const testFiles = dirs(join(root, "tests")).filter((f) => /\.test\.mjs$/.test(f)).length;
  return {
    generated: new Date().toISOString().slice(0, 10), agents: AGENTS.map((a) => agents[a]), outcomes, problems,
    tokens: { measured: false, label: "Tokens: not measured. Exact counts are not logged per run, so this page shows work shipped instead." },
    shipped: { merged_prs_studio_agents: days.length, merges_by_day: byDay, eval_runs_on_disk: evalRuns, test_files: testFiles, eval_findings_filed: ef ? Number(ef[1]) : "not measured" },
  };
}

const pct = (x) => (x === null ? "n/a" : `${Math.round(x * 100)}%`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function renderHtml(c) {
  const cmp = (r) => `<tr><td><b>${esc(r.label)}</b><div class="s">${esc(r.note)} Grader: ${esc(r.grader)}. <a href="https://github.com/holroydchase-afk/studio-agents/blob/main/${esc(r.source)}">source</a></div></td>
<td class="num">${r.agent_wins} v ${r.plain_wins}${r.ties ? ` (${r.ties} ties)` : ""}<div class="s">n = ${r.n}</div></td>
<td class="num">${pct(r.win_rate)}<div class="s">${r.ci && r.win_rate !== null ? `${pct(r.ci[0])} to ${pct(r.ci[1])}` : ""}</div></td>
<td><span class="v ${/edge/.test(r.verdict) ? "ok" : "np"}">${esc(r.verdict)}</span></td></tr>`;
  const sec = (a) => {
    const rows = a.comparisons.filter((r) => r.clean !== false), dev = a.comparisons.filter((r) => r.clean === false);
    return `<section><h2>${esc(a.agent)}${a.status ? ` <span class="v np">${esc(a.status)}</span>` : ""}</h2>
${rows.length ? `<table><thead><tr><th>Test</th><th>Agent v plain</th><th>Agent win rate (95% interval)</th><th>Verdict</th></tr></thead><tbody>${rows.map(cmp).join("")}</tbody></table>` : `<p class="s">No clean head-to-head yet.</p>`}
${dev.length ? `<details><summary>${dev.length} run${dev.length > 1 ? "s" : ""} not counted as evidence (tuned on or seen before)</summary><table><tbody>${dev.map(cmp).join("")}</tbody></table></details>` : ""}
${a.notes.map((n) => `<p class="s">${esc(n.text)} (${esc(n.source)})</p>`).join("")}</section>`;
  };
  const s = c.shipped;
  const days = Object.entries(s.merges_by_day).sort().slice(-14);
  const max = Math.max(1, ...days.map(([, v]) => v));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio Scorecard</title>
<style>
:root{--bg:#fff;--ink:#14181f;--mute:#5b6472;--line:#e3e6eb;--card:#f7f8fa;--ok:#0B7A4B;--np:#8a5a00;--npbg:#fff4de;--okbg:#e3f4ec;--bar:#0B7A4B}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0f1318;--ink:#e8ebf0;--mute:#97a0ad;--line:#262d37;--card:#171c23;--ok:#4fd39a;--np:#f0be5a;--npbg:#2c2410;--okbg:#10291f;--bar:#4fd39a}}
:root[data-theme="dark"]{--bg:#0f1318;--ink:#e8ebf0;--mute:#97a0ad;--line:#262d37;--card:#171c23;--ok:#4fd39a;--np:#f0be5a;--npbg:#2c2410;--okbg:#10291f;--bar:#4fd39a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 16px 64px}h1{font-size:28px;margin:0 0 4px}h2{font-size:20px;margin:36px 0 8px}
.lede{color:var(--mute);margin:0 0 16px}.s{font-size:13px;color:var(--mute);font-weight:400}a{color:var(--ok)}
table{width:100%;border-collapse:collapse;margin:8px 0}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;color:var(--mute);font-weight:600}
.num{white-space:nowrap;font-variant-numeric:tabular-nums}.v{display:inline-block;padding:2px 8px;border-radius:99px;font-size:13px}.v.ok{background:var(--okbg);color:var(--ok)}.v.np{background:var(--npbg);color:var(--np)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.card b{display:block;font-size:22px}
details{margin:8px 0}summary{cursor:pointer;color:var(--mute);font-size:14px}.bars{display:flex;gap:4px;align-items:flex-end;height:80px;margin:8px 0}.bars i{flex:1;background:var(--bar);border-radius:3px 3px 0 0;min-width:6px}
@media(max-width:600px){th:nth-child(3),td:nth-child(3){display:none}}
</style></head><body><main>
<h1>Studio Scorecard</h1><p class="lede">Is each agent better than plain Claude, is the portfolio better, and what did the work buy. Generated ${esc(c.generated)} from the eval logs in studio-agents. Anything with a small n says "not proven".</p>
<h2>1. Are the agents better than plain Claude?</h2><p class="s">Same task given to plain Claude and to the agent, graded blind. A win rate only counts when the interval clears 50% and n is 10 or more.</p>
${c.agents.map(sec).join("")}
<h2>2. Is the portfolio better?</h2><p class="s">Outcomes only. Gut feel and screenshots are not on this list.</p>
<div class="grid">${c.outcomes.map((o) => `<div class="card"><span class="s">${esc(o.label)}</span><b>${esc(o.value)}</b><span class="s">${o.value === "not measured" ? `Starts when: ${esc(o.unlock)}` : `${esc(o.as_of || "")} ${esc(o.source || "")}`}</span></div>`).join("")}</div>
<h2>3. What did the tokens buy?</h2><p class="s">${esc(c.tokens.label)}</p>
<div class="grid"><div class="card"><span class="s">PRs merged in studio-agents</span><b>${s.merged_prs_studio_agents}</b></div><div class="card"><span class="s">Eval runs on disk</span><b>${s.eval_runs_on_disk}</b></div><div class="card"><span class="s">Test files</span><b>${s.test_files}</b></div><div class="card"><span class="s">Eval findings filed to products</span><b>${esc(s.eval_findings_filed)}</b></div></div>
<p class="s">Merged PRs per day, last ${days.length} days with merges</p><div class="bars" role="img" aria-label="Merged PRs per day">${days.map(([d, v]) => `<i title="${esc(d)}: ${v}" style="height:${Math.round((v / max) * 100)}%"></i>`).join("")}</div>
${c.problems.length ? `<h2>Needs fixing</h2>${c.problems.map((p) => `<p class="s">${esc(p)}</p>`).join("")}` : ""}
</main></body></html>`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2), fail = () => { console.error(USAGE); process.exit(2); };
  let root = resolve(dirname(fileURLToPath(import.meta.url)), ".."), outcomes, json, html;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") { console.log(USAGE); process.exit(0); }
    else if (["--root", "--outcomes", "--json", "--html"].includes(a)) { const v = args[++i]; if (v === undefined || v.startsWith("-")) fail(); if (a === "--root") root = resolve(v); else if (a === "--outcomes") outcomes = resolve(v); else if (a === "--json") json = resolve(v); else html = resolve(v); }
    else fail();
  }
  const card = buildStudioScorecard(root, { outcomesPath: outcomes });
  if (json) writeFileSync(json, JSON.stringify(card, null, 2)); if (html) writeFileSync(html, renderHtml(card));
  if (!json && !html) console.log(JSON.stringify(card, null, 2));
}

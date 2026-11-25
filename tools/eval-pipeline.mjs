#!/usr/bin/env node
// eval-pipeline: one eval pipeline for every studio agent (docs/product/SPEC-EVAL-PIPELINE.md, P1 core).
// Job-list out, results in: the tool never calls a model. `jobs` writes one file per job; each job runs as one
// subagent in a Claude session; `collect` validates what came back; `report` computes. Two suite kinds:
//   pairwise  blind A/B grading of an arm against plain, both orders, several votes (report logic is eval-protocol's)
//   cases     pass/fail per case per arm, paired sign test over cases, noisy cases flagged
// Commands (all take --root DIR, default cwd; repo paths are relative to it):
//   init --agent A --kind pairwise|cases        check-suite CONFIG
//   freeze --suite S    verify --suite S        status --suite S [--run R]
//   jobs --suite S --phase dev|heldout --change ID [--stage gen|grade] [--run R] [--reissue] [--out DIR]
//   collect --run R [--partial]                 report --suite S [--json] [--claim]
//   sheet --suite S --run R --n N --out FILE    key-add --suite S --run R --marks "p-01=A,p-02=tie" [--replace]
//   calibrate --suite S --run R [--out FILE]
// Exit 0 ok, 1 problems found, 2 usage or unreadable input. Old v1 runs are listed, never recomputed.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRun, buildReport, renderReport, pairVerdict, replyChecks, armOk } from "./eval-protocol.mjs";
import { signP, wilson } from "./studio-scorecard.mjs";

const USAGE = "usage: eval-pipeline.mjs init|check-suite|freeze|verify|jobs|collect|report|sheet|key-add|calibrate|status|import-v1|tasks ... [--root DIR]";
const KINDS = ["pairwise", "cases"];
const ARMS_NOTE = "agent, plain, plain-rules, cross, orchestrated, ablate:<component>";
const armName = (a) => a === "plain" || armOk(a);
const BASE3 = new Set(["agent", "plain", "plain-rules"]);
const BOOL = new Set(["--partial", "--reissue", "--replace", "--json", "--claim"]);
const NM = "not measured";
const KAPPA_FLOOR = 0.6, MIN_MARKS = 20;

class Usage extends Error {}
class Stop extends Error { constructor(lines) { super(lines.join("\n")); this.lines = lines; } }

// ---------- helpers
const sha = (x) => createHash("sha256").update(x).digest("hex");
const today = () => new Date().toISOString().slice(0, 10);
const j2 = (o) => JSON.stringify(o, null, 2) + "\n";
const put = (p, o) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof o === "string" ? o : j2(o)); };
function readJson(p, what = p) {
  let t;
  try { t = readFileSync(p, "utf8"); } catch { throw new Usage(`cannot read ${basename(what)}`); }
  try { return JSON.parse(t); } catch { throw new Usage(`bad JSON in ${basename(what)}`); }
}
const shaFile = (p) => sha(readFileSync(p));

function parseArgs(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      if (BOOL.has(a)) o[a] = true;
      else { if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Usage(`${a} needs a value`); o[a] = argv[++i]; }
    } else pos.push(a);
  }
  return { pos, o };
}
const rootOf = (o) => resolve(o["--root"] || process.cwd());
const rel = (root, p) => resolve(root, p);

function loadSuite(root, o, pos) {
  const p = o["--suite"] || pos;
  if (!p) throw new Usage("--suite needs a config path");
  const abs = rel(root, p);
  return { abs, path: p, cfg: readJson(abs, p) };
}
const suitesDir = (root) => join(root, "evals", "suites");
const frozenPath = (root, cfg) => join(suitesDir(root), `${cfg.agent}.frozen.json`);
const ledgerPath = (root, cfg) => join(suitesDir(root), `${cfg.agent}.ledger.json`);
const calibPath = (root, cfg) => join(suitesDir(root), `${cfg.agent}.calibration.json`);

// ---------- check-suite
export function checkSuite(root, cfg) {
  const out = [];
  const bad = (f, m) => out.push(`${f}: ${m}`);
  if (typeof cfg.agent !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(cfg.agent || "")) bad("agent", "must be a lowercase name");
  const kindOk = KINDS.includes(cfg.kind);
  if (!kindOk) bad("kind", `must be pairwise or cases, got ${JSON.stringify(cfg.kind)}`);
  if (typeof cfg.rubric !== "string" || !cfg.rubric) bad("rubric", "missing");
  else if (!existsSync(rel(root, cfg.rubric))) bad("rubric", "file not found");
  let tasks = null;
  if (typeof cfg.tasks !== "string" || !cfg.tasks) bad("tasks", "missing");
  else if (!existsSync(rel(root, cfg.tasks))) bad("tasks", "file not found");
  else {
    try { tasks = JSON.parse(readFileSync(rel(root, cfg.tasks), "utf8")); } catch { bad("tasks", "bad JSON"); }
    if (Array.isArray(tasks)) tasks = tasks.map((t) => (t && typeof t === "object" && t.text === undefined && typeof t.prompt === "string" ? { ...t, text: t.prompt } : t));
    if (tasks !== null) {
      if (!Array.isArray(tasks)) { bad("tasks", "must be an array"); tasks = null; }
      else {
        const seen = new Set();
        tasks.forEach((t, i) => {
          if (!t || typeof t.id !== "string" || !t.id) bad(`tasks[${i}]`, "id missing");
          else if (seen.has(t.id)) bad(`tasks[${i}]`, `duplicate id ${t.id}`); else seen.add(t.id);
          if (t && !["dev", "heldout"].includes(t.split)) bad(`tasks[${i}]`, "split must be dev or heldout");
          if (t && (typeof t.text !== "string" || !t.text)) bad(`tasks[${i}]`, "text missing");
          if (t && t.rubric !== undefined && typeof t.rubric !== "string") bad(`tasks[${i}]`, "rubric must be text");
        });
      }
    }
  }
  if (!Array.isArray(cfg.arms) || !cfg.arms.every(armName)) bad("arms", `must be a list from ${ARMS_NOTE}`);
  else if (!cfg.arms.includes("agent") || !cfg.arms.includes("plain")) bad("arms", "must include agent and plain");
  if (!Number.isInteger(cfg.runs) || cfg.runs < 1) bad("runs", "must be a whole number of 1 or more");
  else if (cfg.kind === "cases" && cfg.runs !== 3) bad("runs", "a cases suite runs 3 times per case so noise shows");
  if (kindOk) {
    const k = cfg.kind === "pairwise" ? "votes_per_order" : "votes";
    if (!Number.isInteger(cfg[k]) || cfg[k] < 1) bad(k, "must be a whole number of 1 or more");
  }
  for (const f of ["grader_model", "agent_model", "key"]) if (typeof cfg[f] !== "string" || !cfg[f]) bad(f, "missing");
  if (!cfg.split || typeof cfg.split !== "object") bad("split", "missing");
  if (cfg.direct === true) bad("direct", "agent vs plain-rules pairs are not built yet; leave false");
  if (cfg.strip !== undefined) {
    if (!Array.isArray(cfg.strip)) bad("strip", "must be a list of regex sources");
    else cfg.strip.forEach((s, i) => { try { new RegExp(s, "g"); } catch { bad(`strip[${i}]`, "not a valid regex"); } });
  }
  return { problems: out, tasks };
}
const stripper = (cfg) => { const rs = (cfg.strip || []).map((s) => new RegExp(s, "g")); return (t) => rs.reduce((a, r) => a.replace(r, ""), String(t)).trim(); };

function cmdCheckSuite(root, o, pos) {
  if (!pos[0] && !o["--suite"]) throw new Usage("check-suite needs a config path");
  const s = loadSuite(root, o, pos[0]);
  const { problems } = checkSuite(root, s.cfg);
  if (problems.length) throw new Stop(problems);
  console.log(`ok: ${s.cfg.agent} (${s.cfg.kind})`);
  return 0;
}

function cmdInit(root, o) {
  const agent = o["--agent"], kind = o["--kind"];
  if (!agent || !/^[a-z0-9][a-z0-9-]*$/.test(agent)) throw new Usage("--agent needs a lowercase name");
  if (!KINDS.includes(kind)) throw new Usage("--kind must be pairwise or cases");
  const f = join(suitesDir(root), `${agent}.json`);
  if (existsSync(f)) throw new Stop([`${agent}.json already exists; init never overwrites`]);
  const cfg = {
    agent, kind, tasks: `evals/${agent}/tasks.json`, rubric: `evals/${agent}/rubric.md`,
    split: { dev: 0, heldout: 0 }, arms: [...BASE3], runs: 3,
    ...(kind === "pairwise" ? { votes_per_order: 3 } : { votes: 3 }),
    grader_model: "claude-opus-5-5", agent_model: "claude-sonnet-5-5",
    key: `evals/suites/${agent}.key.json`, direct: false, strip: ["```spec[\\s\\S]*?```"],
  };
  put(f, cfg);
  const t = rel(root, cfg.tasks), r = rel(root, cfg.rubric);
  if (!existsSync(t)) put(t, "[]\n");
  if (!existsSync(r)) put(r, "Pick the reply that is more useful and honest. Answer A, B or tie.\n");
  console.log(`created: ${agent}.json`);
  return 0;
}

// ---------- freeze / verify
function checkedSuite(root, o) {
  const s = loadSuite(root, o);
  const { problems, tasks } = checkSuite(root, s.cfg);
  if (problems.length) throw new Stop(problems);
  return { ...s, tasks };
}
function frozenProblems(root, s) {
  const fz = frozenPath(root, s.cfg);
  if (!existsSync(fz)) return [`${s.cfg.agent}: not frozen (run freeze first)`];
  const j = readJson(fz);
  const now = { tasks: shaFile(rel(root, s.cfg.tasks)), rubric: shaFile(rel(root, s.cfg.rubric)), suite: shaFile(s.abs) };
  const bad = [];
  if (j.prompts?.sha256 !== now.tasks) bad.push(`${basename(s.cfg.tasks)}: changed since freeze`);
  if (j.rubric?.sha256 !== now.rubric) bad.push(`${basename(s.cfg.rubric)}: changed since freeze`);
  if (j.suite?.sha256 !== now.suite) bad.push(`${basename(s.abs)}: changed since freeze`);
  return bad;
}
function cmdFreeze(root, o) {
  const s = checkedSuite(root, o);
  put(frozenPath(root, s.cfg), {
    schema: 1, date: today(),
    prompts: { file: basename(s.cfg.tasks), sha256: shaFile(rel(root, s.cfg.tasks)) },
    rubric: { file: basename(s.cfg.rubric), sha256: shaFile(rel(root, s.cfg.rubric)) },
    suite: { file: basename(s.abs), sha256: shaFile(s.abs) },
    key_path: s.cfg.key,
  });
  console.log(`frozen: ${basename(s.cfg.tasks)}, ${basename(s.cfg.rubric)}, ${basename(s.abs)}`);
  return 0;
}
function cmdVerify(root, o) {
  const s = loadSuite(root, o);
  const bad = frozenProblems(root, s);
  if (bad.length) throw new Stop(bad);
  console.log("frozen files match");
  return 0;
}

// ---------- runs
const runOf = (root, o, s, change) => rel(root, o["--run"] || join("evals", "runs", s.cfg.agent, `${today()}-${change}`));
const jobsDir = (run) => join(run, "jobs");
const resultsDir = (run) => join(run, "results");
const listJson = (d) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, data: readJson(join(d, f)) })) : []);
const readJobs = (run) => listJson(jobsDir(run)).map((x) => x.data);
const readMeta = (run) => (existsSync(join(run, "run-meta.json")) ? readJson(join(run, "run-meta.json")) : null);

function genJobs(s, phase, tasks) {
  const out = [];
  const st = stripper(s.cfg);
  void st;
  for (const t of tasks.filter((x) => x.split === phase)) {
    for (const arm of s.cfg.arms) for (let run = 1; run <= s.cfg.runs; run++) {
      out.push({ id: `g-${t.id}-${arm}-${run}`, stage: "gen", task: t.id, arm, run, model: s.cfg.agent_model, input: t.text, input_sha256: sha(t.text) });
    }
  }
  return out;
}
function genOutputs(run) { // "task|run|arm" -> raw output
  const m = new Map();
  const jobs = new Map(readJobs(run).filter((j) => j.stage === "gen").map((j) => [j.id, j]));
  for (const { data } of listJson(resultsDir(run))) {
    const j = jobs.get(data.id);
    if (j) m.set(`${j.task}|${j.run}|${j.arm}`, data.output);
  }
  return m;
}
const pairId = (task, run, arm) => "q" + sha(`${task}|${run}|${arm}`).slice(0, 8);
const gradeText = (task, rubric, A, B) => `You are grading two replies to the same task. Reply A and Reply B are in random order.\n\nTask:\n${task}\n\nRubric:\n${rubric}\n\nReply A:\n${A}\n\nReply B:\n${B}\n\nAnswer with exactly one word: A, B or tie.\n`;
const caseText = (task, rubric, out) => `You are grading one reply to a task against a rubric.\n\nTask:\n${task}\n\nRubric:\n${rubric}\n\nReply:\n${out}\n\nAnswer with exactly one word: pass or fail.\n`;

function gradeJobs(root, s, run, tasks, phase) {
  const st = stripper(s.cfg), rubric = readFileSync(rel(root, s.cfg.rubric), "utf8").trim();
  const outs = genOutputs(run);
  const taskOf = new Map(tasks.map((t) => [t.id, t.text]));
  const rubOf = new Map(tasks.map((t) => [t.id, t.rubric ? `${rubric}\n\nFor this task: ${t.rubric}` : rubric]));
  const ids = tasks.filter((t) => t.split === phase).map((t) => t.id);
  const jobs = [], blind = {};
  for (const task of ids) for (let r = 1; r <= s.cfg.runs; r++) {
    if (s.cfg.kind === "pairwise") {
      const base = st(outs.get(`${task}|${r}|plain`) ?? "");
      for (const arm of s.cfg.arms.filter((a) => a !== "plain")) {
        const mine = st(outs.get(`${task}|${r}|${arm}`) ?? "");
        const pid = pairId(task, r, arm);
        blind[pid] = { task, run: r, arm, AB: { A: arm, B: "plain" }, BA: { A: "plain", B: arm } };
        for (const order of ["AB", "BA"]) {
          const A = order === "AB" ? mine : base, B = order === "AB" ? base : mine;
          for (let v = 1; v <= s.cfg.votes_per_order; v++) {
            const text = gradeText(taskOf.get(task), rubOf.get(task), A, B);
            jobs.push({ id: `v-${pid}-${order}-${v}`, stage: "grade", model: s.cfg.grader_model, pair: pid, order, vote: v, outputs: { A, B }, text, input_sha256: sha(text) });
          }
        }
      }
    } else {
      for (const arm of s.cfg.arms) {
        const out = st(outs.get(`${task}|${r}|${arm}`) ?? "");
        for (let v = 1; v <= s.cfg.votes; v++) {
          const text = caseText(taskOf.get(task), rubOf.get(task), out);
          jobs.push({ id: `c-${task}-${arm}-${r}-${v}`, stage: "grade", model: s.cfg.grader_model, task, arm, run: r, vote: v, output: out, text, input_sha256: sha(text) });
        }
      }
    }
  }
  return { jobs, blind };
}

function cmdJobs(root, o) {
  const s = checkedSuite(root, o);
  const phase = o["--phase"], change = o["--change"], stage = o["--stage"] || "gen";
  if (!["dev", "heldout"].includes(phase)) throw new Usage("--phase must be dev or heldout");
  if (!change || !/^[A-Za-z0-9._-]+$/.test(change)) throw new Usage("--change needs an id");
  if (!["gen", "grade"].includes(stage)) throw new Usage("--stage must be gen or grade");
  const bad = frozenProblems(root, s);
  if (bad.length) throw new Stop(bad);
  const run = runOf(root, o, s, change), name = basename(run);
  if (!s.tasks.some((t) => t.split === phase)) throw new Stop([`no ${phase === "heldout" ? "held-out" : "dev"} tasks in ${basename(s.abs)}`]);
  const lp = ledgerPath(root, s.cfg);
  const ledger = phase === "heldout" && existsSync(lp) ? readJson(lp) : { schema: 1, changes: {} };
  const entry = ledger.changes?.[change];
  if (o["--reissue"]) {
    if (phase === "heldout" && (!entry || entry.run !== name)) throw new Stop([`nothing to reissue: held-out change ${change} was never emitted for this run`]);
    const have = new Set(listJson(resultsDir(run)).map((x) => x.data.id));
    const miss = readJobs(run).filter((j) => j.stage === stage && !have.has(j.id));
    const out = o["--out"] ? rel(root, o["--out"]) : join(run, "reissue");
    for (const j of miss) put(join(out, `${j.id}.json`), j);
    if (phase === "heldout") {
      (entry.reissues ||= []).push({ stage, ids: miss.map((j) => j.id), date: today() });
      put(lp, ledger);
    }
    console.log(`reissue: ${miss.length} ${stage} jobs`);
    return 0;
  }
  if (stage === "grade") {
    const rj = join(run, "run.json");
    if (!existsSync(rj) || !readJson(rj).collected?.gen) throw new Stop(["collect the generation results first"]);
  }
  if (phase === "heldout") {
    if (entry && (entry.run !== name || (entry.stages || []).includes(stage))) throw new Stop([`held-out already run for change ${change}`]);
  }
  let jobs, blind = null;
  if (stage === "gen") jobs = genJobs(s, phase, s.tasks);
  else ({ jobs, blind } = gradeJobs(root, s, run, s.tasks, phase));
  if (phase === "heldout") { // burn the change id when jobs are emitted, before any file is written
    ledger.changes[change] = { run: name, stages: [...(entry?.stages || []), stage], date: entry?.date || today(), ...(entry?.reissues ? { reissues: entry.reissues } : {}) };
    put(lp, ledger);
  }
  for (const j of jobs) put(join(jobsDir(run), `${j.id}.json`), j);
  if (blind) {
    const bp = join(run, "blind-map.json");
    const prev = existsSync(bp) ? readJson(bp).pairs : {};
    put(bp, { schema: 1, note: "sealed: the arm behind each slot; never shown to a grader", pairs: { ...prev, ...blind } });
  }
  put(join(run, "run-meta.json"), { schema: 1, agent: s.cfg.agent, suite: basename(s.abs), change, phase, date: readMeta(run)?.date || today() });
  console.log(`${stage}: ${jobs.length} jobs in ${name}`);
  return 0;
}

// ---------- collect
const tokenOk = (t) => (typeof t === "number" && Number.isFinite(t) && t >= 0) || t === NM;
function cmdCollect(root, o) {
  if (!o["--run"]) throw new Usage("collect needs --run");
  const run = rel(root, o["--run"]);
  const meta = readMeta(run);
  const jobs = readJobs(run);
  if (!meta || !jobs.length) throw new Stop(["no jobs in this run"]);
  const s = { ...loadSuite(root, { "--suite": join("evals", "suites", meta.suite) }) };
  const { tasks } = checkSuite(root, s.cfg);
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const problems = [], seen = new Set(), good = new Map();
  for (const { data: r } of listJson(resultsDir(run))) {
    const id = String(r.id ?? "");
    const j = byId.get(id);
    const note = (m) => problems.push(`${id || "(no id)"}: ${m}`);
    if (!j) { note("unknown job id"); continue; }
    if (seen.has(id)) { note("duplicate id"); continue; }
    seen.add(id);
    if (typeof r.model !== "string" || !r.model) { note("model missing"); continue; }
    if (r.model !== j.model) { note(`model differs from the job (${j.model})`); continue; }
    if (r.input_sha256 !== j.input_sha256) { note("input_sha256 differs from the job"); continue; }
    if (j.stage === "gen") {
      if (!tokenOk(r.tokens)) { note(`tokens must be a number or "${NM}"`); continue; }
      if (typeof r.output !== "string" || !r.output) { note("output missing"); continue; }
      if (r.tool_calls !== undefined && !(typeof r.tool_calls === "number" && Number.isFinite(r.tool_calls) && r.tool_calls >= 0)) { note("tool_calls must be a number of 0 or more"); continue; }
    } else {
      const okAns = s.cfg.kind === "pairwise" ? ["A", "B", "tie"] : ["pass", "fail"];
      if (!okAns.includes(r.answer)) { note(`answer must be ${okAns.join(", ")}`); continue; }
    }
    good.set(id, r);
  }
  const partial = !!o["--partial"];
  if (!partial) for (const j of jobs) if (!seen.has(j.id)) problems.push(`${j.id}: missing result`);
  if (problems.length) throw new Stop(problems);
  const gen = jobs.filter((j) => j.stage === "gen"), grade = jobs.filter((j) => j.stage === "grade");
  const genDone = gen.every((j) => good.has(j.id));
  const gradeDone = grade.length > 0 && grade.every((j) => good.has(j.id));
  const armsOut = {};
  for (const arm of s.cfg.arms) {
    const mine = gen.filter((j) => j.arm === arm).map((j) => good.get(j.id)).filter(Boolean);
    armsOut[arm] = {
      tokens: mine.length && mine.every((r) => typeof r.tokens === "number") ? mine.reduce((a, r) => a + r.tokens, 0) : NM,
      tool_calls: mine.length && mine.every((r) => typeof r.tool_calls === "number") ? mine.reduce((a, r) => a + r.tool_calls, 0) : NM,
    };
  }
  const out = {
    schema: 2, date: meta.date, agent: s.cfg.agent, kind: s.cfg.kind, change: meta.change, phase: meta.phase,
    grader_model: s.cfg.grader_model, agent_model: s.cfg.agent_model, arms: armsOut,
    runs: s.cfg.runs, votes: s.cfg.kind === "pairwise" ? s.cfg.votes_per_order : s.cfg.votes,
    frozen: { prompts_sha256: shaFile(rel(root, s.cfg.tasks)), rubric_sha256: shaFile(rel(root, s.cfg.rubric)) },
    pairs: [], collected: { gen: genDone, grade: gradeDone },
  };
  void tasks;
  if (s.cfg.agent === "staff-pm" && genDone) {
    const st = stripper(s.cfg);
    out.reply_checks = gen.map((j) => ({ id: j.id, ...replyChecks(st(good.get(j.id).output)) }));
  }
  if (s.cfg.kind === "pairwise") {
    const blind = existsSync(join(run, "blind-map.json")) ? readJson(join(run, "blind-map.json")).pairs : {};
    const votes = {};
    for (const j of grade) {
      const r = good.get(j.id);
      if (!r) continue;
      const m = blind[j.pair];
      const slot = m[j.order];
      const winner = r.answer === "tie" ? "tie" : slot[r.answer];
      (votes[j.pair] ||= []).push({ order: j.order, winner });
    }
    for (const [pid, v] of Object.entries(votes)) {
      const need = 2 * s.cfg.votes_per_order;
      if (v.length !== need) continue;
      const m = blind[pid];
      out.pairs.push({ prompt: m.task, run: m.run, arm: m.arm, votes: v });
    }
  } else {
    const cases = [];
    const votesBy = {};
    for (const j of grade) { const r = good.get(j.id); if (r) (votesBy[`${j.task}|${j.arm}|${j.run}`] ||= []).push(r.answer === "pass"); }
    for (const [k, v] of Object.entries(votesBy)) {
      const [task, arm, run2] = k.split("|");
      if (v.length === s.cfg.votes) cases.push({ task, arm, run: Number(run2), pass: v.filter(Boolean).length * 2 > v.length });
    }
    out.cases = cases;
  }
  put(join(run, "run.json"), out);
  console.log(`collected: ${good.size} of ${jobs.length} results`);
  return 0;
}

// ---------- report
const f2 = (x) => x.toFixed(2);
function casesSummary(cases, a, b, runs) {
  const tasks = [...new Set(cases.map((c) => c.task))].sort();
  const passes = (task, arm) => cases.filter((c) => c.task === task && c.arm === arm && c.pass).length;
  const seen = (task, arm) => cases.some((c) => c.task === task && c.arm === arm);
  const used = tasks.filter((t) => seen(t, a) && seen(t, b));
  let wins = 0, losses = 0, bp = 0, bf = 0, tie = 0;
  for (const t of used) {
    const x = passes(t, a), y = passes(t, b);
    if (x > y) wins++; else if (x < y) losses++; else if (x === 0) bf++; else if (x === runs) bp++; else tie++;
  }
  const dec = wins + losses, sp = signP(wins, losses), [lo, hi] = wilson(wins, dec);
  const verdict = used.length < 10 || sp >= 0.05 ? "not proven" : wins > losses ? "edge shown" : "arm worse";
  const noisy = used.filter((t) => [a, b].some((arm) => { const p = passes(t, arm); return p > 0 && p < runs; }));
  return { n_cases: used.length, wins, losses, both_pass: bp, both_fail: bf, level_mixed: tie, sign_p: sp, wilson: [lo, hi], noisy, noisy_count: `${noisy.length} of ${used.length}`, verdict };
}
function listRuns(root, cfg) {
  const base = join(root, "evals", "runs", cfg.agent);
  const v2 = [], v1 = [];
  if (existsSync(base)) for (const d of readdirSync(base).sort()) {
    const dir = join(base, d);
    if (existsSync(join(dir, "run.json"))) v2.push({ name: d, dir, data: readJson(join(dir, "run.json")) });
    else if (existsSync(join(dir, "results.json"))) v1.push({ name: d, data: readJson(join(dir, "results.json")) });
  }
  return { v2, v1 };
}
function tokensLine(r) { return `tokens: ${Object.entries(r.arms).map(([k, v]) => `${k} ${v.tokens}`).join(", ")}`; }
function toolCallsLine(r) { return `tool calls: ${Object.entries(r.arms).map(([k, v]) => `${k} ${v.tool_calls ?? NM}`).join(", ")}`; }

function buildSuiteReport(root, s) {
  const { v2, v1 } = listRuns(root, s.cfg);
  const runs = [];
  const problems = [];
  for (const r of v2) {
    const bad = checkRun(r.data);
    if (bad.length) { problems.push(...bad.map((m) => `${r.name}: ${m}`)); continue; }
    const flags = (r.data.reply_checks || []).filter((c) => c.lint_ok_lines > 0).map((c) => c.id);
    const head = { lint_ok_flags: flags, change: r.data.change, phase: r.data.phase, date: r.data.date, grader_model: r.data.grader_model, agent_model: r.data.agent_model, runs: r.data.runs, votes: r.data.votes, tokens: r.data.arms };
    if (r.data.kind === "cases") {
      const sum = casesSummary(r.data.cases || [], "agent", "plain", r.data.runs);
      const tok = r.data.arms.agent.tokens;
      sum.cost_per_win = typeof tok === "number" && sum.wins > 0 ? tok / sum.wins : NM;
      sum.extra = {};
      for (const arm of Object.keys(r.data.arms)) if (!BASE3.has(arm)) { const e = casesSummary(r.data.cases || [], arm, "plain", r.data.runs); sum.extra[arm] = { wins: e.wins, losses: e.losses, sign_p: e.sign_p, verdict: e.verdict }; }
      sum.design_effect = r.data.arms["plain-rules"] ? (() => { const d = casesSummary(r.data.cases || [], "agent", "plain-rules", r.data.runs); return { wins: d.wins, losses: d.losses, sign_p: d.sign_p, verdict: d.verdict }; })() : NM;
      runs.push({ ...head, kind: "cases", summary: sum });
    } else runs.push({ ...head, kind: "pairwise", report: buildReport(r.data), frozen: r.data.frozen });
  }
  const legacy = v1.map((r) => ({ run: r.name, stored_tally: r.data.tally ?? null }));
  const ip = join(suitesDir(root), `${s.cfg.agent}.index.json`);
  if (existsSync(ip)) for (const e of readJson(ip).runs || []) {
    const f = join(root, e.dir, "results.json");
    if (!existsSync(f) || shaFile(f) !== e.sha256) { problems.push(`${e.run}: legacy file changed (results.json no longer matches the recorded sha256)`); continue; }
    legacy.push({ run: e.run, stored_tally: e.tally ?? null });
  }
  return { suite: basename(s.abs), runs, v1: legacy, problems };
}
function renderSuiteReport(rep) {
  const L = [];
  for (const r of rep.runs) {
    L.push(`run: ${r.change} (${r.phase}, ${r.date})`);
    L.push(`  grader model: ${r.grader_model}`, `  agent model: ${r.agent_model}`, `  runs per task: ${r.runs}`, `  votes per ${r.kind === "pairwise" ? "order" : "output"}: ${r.votes}`);
    L.push(`  ${tokensLine({ arms: r.tokens })}`, `  ${toolCallsLine({ arms: r.tokens })}`);
    for (const id of r.lint_ok_flags || []) L.push(`  lint-ok line in a reply: ${id} (flag only, verdict unchanged)`);
    if (r.kind === "pairwise") {
      L.push(r.report.arms && Object.keys(r.report.arms).length ? renderReport(r.report) : "  no graded pairs yet", "");
    } else {
      const m = r.summary;
      L.push(`  arm agent vs plain: wins ${m.wins}, losses ${m.losses}`);
      for (const [arm, e] of Object.entries(m.extra || {})) L.push(`  arm ${arm} vs plain: wins ${e.wins}, losses ${e.losses}, ${e.verdict}`);
      L.push(`  cases: ${m.n_cases} (agent vs plain)`);
      L.push(`  wins ${m.wins}, losses ${m.losses}, both pass ${m.both_pass}, both fail ${m.both_fail}`);
      L.push(`  sign test p = ${m.sign_p.toFixed(3)} (cases both arms pass or fail alike are excluded)`);
      L.push(`  Wilson 95% interval on wins: ${f2(m.wilson[0])} to ${f2(m.wilson[1])}`);
      L.push(`  noisy cases: ${m.noisy.length ? m.noisy.join(", ") : "none"} (${m.noisy_count})`);
      L.push(`  cost per win: ${typeof m.cost_per_win === "number" ? `${Math.round(m.cost_per_win)} tokens` : m.cost_per_win}`);
      const d = m.design_effect;
      if (d === NM) L.push(`  design effect: ${NM}`);
      else {
        L.push(`  design effect (agent vs plain-rules): wins ${d.wins}, losses ${d.losses}, ${d.verdict}`);
        if (d.verdict === "not proven") L.push("  the agent's edge over plain may come from the rules alone");
      }
      L.push(`  verdict: ${m.verdict}`, "");
    }
  }
  if (rep.v1.length) {
    L.push("v1: single vote, order unknown, not recomputed");
    for (const r of rep.v1) L.push(`  ${r.run}: ${r.stored_tally ? Object.entries(r.stored_tally).map(([k, v]) => `${k} ${v}`).join(", ") : "no stored tally"}`);
    L.push("  flip rate: not available", "");
  }
  return L.join("\n").replace(/\n+$/, "");
}
function cmdReport(root, o) {
  const s = checkedSuite(root, o);
  const rep = buildSuiteReport(root, s);
  if (rep.problems.length) throw new Stop(rep.problems);
  if (o["--claim"]) {
    const cp = calibPath(root, s.cfg);
    if (!existsSync(cp)) throw new Stop(["claim blocked: no calibration yet (mark 20 pairs, then run calibrate)"]);
    const cal = readJson(cp);
    if (cal.claim_ok !== true) throw new Stop([`claim blocked: ${cal.reason || "calibration not passed"}`]);
    const edge = rep.runs.some((r) => /edge shown/.test(JSON.stringify(r.kind === "cases" ? r.summary.verdict : Object.values(r.report.arms || {}).map((a) => a.verdict))));
    if (!edge) throw new Stop(["claim blocked: no run shows an edge"]);
  }
  console.log(o["--json"] ? j2(rep).trimEnd() : renderSuiteReport(rep));
  return 0;
}

// ---------- import-v1, tasks
function cmdImportV1(root, o) {
  const s = checkedSuite(root, o);
  if (!o["--run"]) throw new Usage("import-v1 needs --run");
  const run = rel(root, o["--run"]);
  const f = join(run, "results.json");
  if (!existsSync(f)) throw new Usage(`no results.json in ${basename(run)}`);
  const dir = relative(root, run);
  if (dir.startsWith("..")) throw new Usage("the run folder must be under --root");
  const data = readJson(f);
  const ip = join(suitesDir(root), `${s.cfg.agent}.index.json`);
  const idx = existsSync(ip) ? readJson(ip) : { schema: 1, runs: [] };
  idx.runs = (idx.runs || []).filter((e) => e.run !== basename(run));
  idx.runs.push({ run: basename(run), dir: dir.split("\\").join("/"), version: "v1", tally: data.tally ?? null, sha256: shaFile(f) });
  put(ip, idx);
  console.log(`imported v1: ${basename(run)} (not recomputed)`);
  return 0;
}
function cmdTasks(root, o) {
  const s = checkedSuite(root, o);
  const list = s.tasks.map((t) => ({ id: t.id, split: t.split, text: t.text }));
  console.log(o["--json"] ? JSON.stringify(list, null, 2) : list.map((t) => `${t.id} ${t.split}`).join("\n"));
  return 0;
}

// ---------- sheet, key-add, calibrate
const sheetMapPath = (run) => join(run, "sheet-map.json");
function cmdSheet(root, o) {
  const s = checkedSuite(root, o);
  if (s.cfg.kind !== "pairwise") throw new Stop(["sheet is for pairwise suites"]);
  const run = rel(root, o["--run"] || ""), n = Number(o["--n"]), outFile = o["--out"];
  if (!o["--run"] || !Number.isInteger(n) || n < 1 || !outFile) throw new Usage("sheet needs --run, --n and --out");
  const rj = join(run, "run.json");
  if (!existsSync(rj)) throw new Stop(["no run.json: collect first"]);
  const data = readJson(rj);
  const outs = genOutputs(run), st = stripper(s.cfg);
  const tasks = new Map(s.tasks.map((t) => [t.id, t.text]));
  const cand = data.pairs.filter((p) => p.arm === "agent").map((p) => ({ ...p, h: sha(`${p.prompt}|${p.run}|${p.arm}`) })).sort((a, b) => (a.h < b.h ? -1 : 1)).slice(0, n);
  if (cand.length < n) throw new Stop([`only ${cand.length} pairs available, wanted ${n}`]);
  const pairs = [], map = {};
  cand.forEach((p, i) => {
    const id = `p-${String(i + 1).padStart(2, "0")}`;
    const agentFirst = parseInt(p.h.slice(0, 2), 16) % 2 === 0;
    const mine = st(outs.get(`${p.prompt}|${p.run}|agent`) ?? ""), base = st(outs.get(`${p.prompt}|${p.run}|plain`) ?? "");
    pairs.push({ id, prompt: tasks.get(p.prompt), A: agentFirst ? mine : base, B: agentFirst ? base : mine });
    map[id] = { task: p.prompt, run: p.run, arm: p.arm, A: agentFirst ? "agent" : "plain", B: agentFirst ? "plain" : "agent" };
  });
  put(rel(root, outFile), { schema: 1, pairs });
  put(sheetMapPath(run), { schema: 1, note: "sealed: which arm each label hid", pairs: map });
  console.log(`sheet: ${pairs.length} pairs`);
  return 0;
}
function cmdKeyAdd(root, o) {
  const s = checkedSuite(root, o);
  if (!o["--run"] || !o["--marks"]) throw new Usage("key-add needs --run and --marks");
  const run = rel(root, o["--run"]);
  if (!existsSync(sheetMapPath(run))) throw new Stop(["no sheet for this run: make one with sheet first"]);
  const map = readJson(sheetMapPath(run)).pairs;
  const kp = rel(root, s.cfg.key);
  const key = existsSync(kp) ? readJson(kp) : { schema: 1, marks: {} };
  const marks = o["--marks"].split(",").map((x) => x.trim()).filter(Boolean).map((x) => x.split("="));
  const problems = [], next = JSON.parse(JSON.stringify(key));
  for (const [id, v] of marks) {
    const m = map[id];
    if (!m) { problems.push(`${id}: unknown pair id`); continue; }
    if (!["A", "B", "tie"].includes(v)) { problems.push(`${id}: mark must be A, B or tie`); continue; }
    const arm = v === "tie" ? "tie" : m[v];
    const old = next.marks[id];
    if (old && !o["--replace"]) { problems.push(`${id}: already marked (use --replace)`); continue; }
    next.marks[id] = { arm, run: basename(run), task: m.task, history: old ? [...(old.history || []), old.arm] : [] };
  }
  if (problems.length) throw new Stop(problems);
  put(kp, next);
  console.log(`marked: ${marks.length}`);
  return 0;
}
export function kappaOf(pairs) { // pairs: [[grader, chase]]
  const n = pairs.length;
  const po = pairs.filter(([a, b]) => a === b).length / n;
  const cats = [...new Set(pairs.flat())];
  const pe = cats.reduce((acc, c) => acc + (pairs.filter(([a]) => a === c).length / n) * (pairs.filter(([, b]) => b === c).length / n), 0);
  return { agreement: po, kappa: Math.abs(1 - pe) < 1e-12 ? "undefined" : (po - pe) / (1 - pe) };
}
function cmdCalibrate(root, o) {
  const s = checkedSuite(root, o);
  if (!o["--run"]) throw new Usage("calibrate needs --run");
  const run = rel(root, o["--run"]);
  const kp = rel(root, s.cfg.key);
  const key = existsSync(kp) ? readJson(kp) : { marks: {} };
  const map = existsSync(sheetMapPath(run)) ? readJson(sheetMapPath(run)).pairs : {};
  const data = readJson(join(run, "run.json"));
  const pairs = [];
  for (const [id, m] of Object.entries(key.marks || {})) {
    const sm = map[id];
    if (!sm || m.run !== basename(run)) continue;
    const p = data.pairs.find((q) => q.prompt === sm.task && q.run === sm.run && q.arm === sm.arm);
    if (p) pairs.push([pairVerdict(p), m.arm]);
  }
  const n = pairs.length;
  const { agreement, kappa } = n ? kappaOf(pairs) : { agreement: 0, kappa: "undefined" };
  let reason = null;
  if (n < MIN_MARKS) reason = "fewer than 20 marked pairs";
  else if (kappa === "undefined") reason = "kappa undefined (all marks alike)";
  else if (kappa < KAPPA_FLOOR) reason = "kappa below 0.6";
  const cal = { schema: 1, n, agreement: Math.round(agreement * 1e4) / 1e4, kappa: kappa === "undefined" ? kappa : Math.round(kappa * 1e4) / 1e4, claim_ok: reason === null, ...(reason ? { reason } : {}), run: basename(run), date: today() };
  put(calibPath(root, s.cfg), cal);
  if (o["--out"]) put(rel(root, o["--out"]), cal);
  console.log(`n: ${cal.n}`);
  console.log(`agreement: ${cal.agreement.toFixed(2)}`);
  console.log(`kappa: ${cal.kappa === "undefined" ? "undefined" : cal.kappa.toFixed(2)}`);
  console.log(`claim_ok: ${cal.claim_ok}${reason ? ` (${reason})` : ""}`);
  return 0;
}

// ---------- status
function cmdStatus(root, o) {
  const s = checkedSuite(root, o);
  const bad = frozenProblems(root, s);
  const L = [`suite: ${basename(s.abs)} (${s.cfg.kind})`];
  const sp = o["--suite"];
  if (bad.length) L.push(`next: freeze --suite ${sp}${bad[0].includes("changed") ? " (frozen files changed)" : ""}`);
  else if (!o["--run"]) L.push(`next: jobs --suite ${sp} --phase dev --change ID --stage gen`);
  else {
    const run = rel(root, o["--run"]);
    const jobs = readJobs(run), rj = join(run, "run.json");
    const col = existsSync(rj) ? readJson(rj).collected || {} : {};
    const gen = jobs.filter((j) => j.stage === "gen"), grade = jobs.filter((j) => j.stage === "grade");
    if (!gen.length) L.push(`next: jobs --suite ${sp} --phase dev --change ID --stage gen`);
    else if (!col.gen) L.push(`next: collect --run ${basename(run)}`);
    else if (!grade.length) L.push(`next: jobs --suite ${sp} --phase dev --change ID --stage grade`);
    else if (!col.grade) L.push(`next: collect --run ${basename(run)}`);
    else L.push(`next: report --suite ${sp}`);
  }
  console.log(L.join("\n"));
  return 0;
}

export function main(argv) {
  const [cmd, ...rest] = argv;
  try {
    const { pos, o } = parseArgs(rest);
    const root = rootOf(o);
    switch (cmd) {
      case "init": return cmdInit(root, o);
      case "check-suite": return cmdCheckSuite(root, o, pos);
      case "freeze": return cmdFreeze(root, o);
      case "verify": return cmdVerify(root, o);
      case "jobs": return cmdJobs(root, o);
      case "collect": return cmdCollect(root, o);
      case "report": return cmdReport(root, o);
      case "sheet": return cmdSheet(root, o);
      case "key-add": return cmdKeyAdd(root, o);
      case "calibrate": return cmdCalibrate(root, o);
      case "status": return cmdStatus(root, o);
      case "import-v1": return cmdImportV1(root, o);
      case "tasks": return cmdTasks(root, o);
      default: throw new Usage(USAGE);
    }
  } catch (e) {
    if (e instanceof Stop) { console.log(e.lines.join("\n")); return 1; }
    if (e instanceof Usage) { console.error(e.message); return 2; }
    throw e;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.on("SIGPIPE", () => {});
  process.exitCode = main(process.argv.slice(2));
}

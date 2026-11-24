#!/usr/bin/env node
// pipeline-run: the run ledger and stop rules for the agent pipeline (docs/pipeline-plan.md, build step 1).
// It chains nothing and calls no model: it records which stage ran, refuses the next stage when the last one is
// not done or a stop rule tripped, and says which merge class a change falls in.
//
//   init   --ledger F --lane ui|logic|docs|config --touches live|non-live|hearth
//   start  STAGE --ledger F [--model sonnet|opus|haiku] [--root DIR]
//   done   STAGE --ledger F --block FILE [--tokens N [--budget N]]
//   round  STAGE --ledger F [--bug ID]        build: 3 rounds, staff-pm: 1, verify: 2 per --bug
//   stop   --ledger F --reason TEXT
//   resume --ledger F                         clears a "plan-limit" stop only
//   class  --ledger F --files a,b,c [--feedback] [--json]
//   status --ledger F [--json]
//
// Stages in order: staff-pm, tests-pre, build, verify, pr. docs and config lanes skip tests-pre and build.
// Exit 0 pass, 1 tripped (one reason per line on stderr), 2 usage error or unreadable input.
// The only file ever written is the ledger (JSON). --root is only where DIR/.claude/agents.off is looked for.
// Needs check-spec.mjs and check-qa-report.mjs beside it.
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { checkSpec } from "./check-spec.mjs";
import { checkQaReport } from "./check-qa-report.mjs";

export const STAGES = ["staff-pm", "tests-pre", "build", "verify", "pr"];
export const LANES = ["ui", "logic", "docs", "config"];
export const TOUCHES = ["live", "non-live", "hearth"];
export const STATES = ["pending", "started", "done", "skipped"];
export const MODELS = ["sonnet", "opus", "haiku"];
export const SKIPPED_BY_LANE = { docs: ["tests-pre", "build"], config: ["tests-pre", "build"] };
export const ROUND_LIMITS = { "staff-pm": 1, build: 3, verify: 2 }; // verify is per bug
export const BUDGET_FACTOR = 1.5;
export const MANIFESTS = new Set(["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json",
  "pyproject.toml", "requirements.txt", "poetry.lock", "pipfile", "pipfile.lock", "cargo.toml", "cargo.lock", "go.mod", "go.sum",
  "gemfile", "gemfile.lock", "composer.json", "composer.lock", "deno.json", "deno.lock", "bun.lockb"]);
export const SENSITIVE_SEGMENTS = new Set(["auth", "privacy", "data"]);

class Usage extends Error {}
class Tripped extends Error {}

const USAGE = [
  "usage: pipeline-run.mjs init --ledger F --lane ui|logic|docs|config --touches live|non-live|hearth",
  "       pipeline-run.mjs start STAGE --ledger F [--model sonnet|opus|haiku] [--root DIR]",
  "       pipeline-run.mjs done STAGE --ledger F --block FILE [--tokens N [--budget N]]",
  "       pipeline-run.mjs round STAGE --ledger F [--bug ID]",
  "       pipeline-run.mjs stop --ledger F --reason TEXT | resume --ledger F",
  "       pipeline-run.mjs class --ledger F --files a,b,c [--feedback] [--json]",
  "       pipeline-run.mjs status --ledger F [--json]",
  `stages: ${STAGES.join(", ")}`,
].join("\n");

function parse(argv) {
  const flags = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json" || a === "--feedback") flags[a.slice(2)] = true;
    else if (a.startsWith("--")) {
      if (i + 1 >= argv.length) throw new Usage(`${a} needs a value`);
      flags[a.slice(2)] = argv[++i];
    } else pos.push(a);
  }
  return { flags, pos };
}

function need(flags, name) {
  if (typeof flags[name] !== "string") throw new Usage(`--${name} is required`);
  return flags[name];
}

function loadLedger(flags) {
  const p = resolve(need(flags, "ledger"));
  if (!existsSync(p)) throw new Usage(`no ledger at ${flags.ledger}: run init first`);
  let l;
  try { l = JSON.parse(readFileSync(p, "utf8")); } catch { throw new Usage(`ledger ${flags.ledger} is not valid JSON`); }
  const bad = (why) => new Usage(`ledger ${flags.ledger} is not a usable pipeline ledger: ${why}`);
  if (!l || typeof l !== "object" || !l.stages || typeof l.stages !== "object") throw bad("no stages");
  if (l.version !== 1) throw bad(`version ${JSON.stringify(l.version)}, this tool reads version 1`);
  if (!LANES.includes(l.lane) || !TOUCHES.includes(l.touches) || typeof l.stopped !== "boolean") throw bad("lane, touches or stopped is wrong");
  for (const s of STAGES) {
    const x = l.stages[s];
    if (!x || !STATES.includes(x.state) || !Number.isSafeInteger(x.tokens) || !Number.isSafeInteger(x.rounds) || !Number.isSafeInteger(x.failures ?? 0) ||
      (x.model !== null && !MODELS.includes(x.model)) || (x.bugs !== undefined && (typeof x.bugs !== "object" || x.bugs === null))) throw bad(`stage ${s} is missing or has a bad field`);
    x.failures ??= 0; x.bugs ??= {};
  }
  return { path: p, ledger: l };
}

function save(path, ledger) {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + "\n");
  renameSync(tmp, path);
}

function stageArg(pos) {
  const s = pos[0];
  if (!STAGES.includes(s)) throw new Usage(`unknown stage ${JSON.stringify(s)}; stages are ${STAGES.join(", ")}`);
  return s;
}

function stopRun(ledger, reason) {
  if (!ledger.stopped) { ledger.stopped = true; ledger.stop_reason = reason; }
}

function trip(path, ledger, reason, { stop = false } = {}) {
  if (stop) { stopRun(ledger, reason); save(path, ledger); }
  throw new Tripped(reason);
}

function intFlag(flags, name, { min }) {
  const v = flags[name];
  if (v === undefined) return undefined;
  if (typeof v !== "string" || !/^\d+$/.test(v)) throw new Usage(`--${name} must be a whole number, got ${JSON.stringify(v)}`);
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < min) throw new Usage(`--${name} must be at least ${min}`);
  return n;
}

function cmdInit({ flags }) {
  const lane = need(flags, "lane"), touches = need(flags, "touches");
  if (!LANES.includes(lane)) throw new Usage(`--lane must be one of ${LANES.join(", ")}`);
  if (!TOUCHES.includes(touches)) throw new Usage(`--touches must be one of ${TOUCHES.join(", ")}`);
  const path = resolve(need(flags, "ledger"));
  if (existsSync(path)) throw new Tripped(`a ledger already exists at ${flags.ledger}; init never overwrites a run`);
  const skip = SKIPPED_BY_LANE[lane] || [];
  const stages = {};
  for (const s of STAGES) stages[s] = { state: skip.includes(s) ? "skipped" : "pending", model: null, tokens: 0, rounds: 0, failures: 0, bugs: {} };
  save(path, { version: 1, lane, touches, stopped: false, stop_reason: null, stages });
  return `ledger created: lane ${lane}, touches ${touches}`;
}

function previousStage(ledger, stage) {
  for (let i = STAGES.indexOf(stage) - 1; i >= 0; i--) if (ledger.stages[STAGES[i]].state !== "skipped") return STAGES[i];
  return null;
}

function cmdStart({ flags, pos }) {
  const stage = stageArg(pos);
  const model = flags.model;
  if (model !== undefined && !MODELS.includes(model)) throw new Usage(`--model must be one of ${MODELS.join(", ")}`);
  const { path, ledger } = loadLedger(flags);
  const root = resolve(typeof flags.root === "string" ? flags.root : ".");
  for (const f of [".claude/agents.off"]) if (existsSync(resolve(root, f))) throw new Tripped(`kill switch: ${f} exists under ${root}`);
  if (ledger.stopped) throw new Tripped(`run is stopped (${ledger.stop_reason}); ${ledger.stop_reason === "plan-limit" ? "resume it first" : "start a new run"}`);
  const st = ledger.stages[stage];
  if (st.state === "skipped") throw new Tripped(`${stage} is skipped on the ${ledger.lane} lane`);
  if (st.state !== "pending") throw new Tripped(`${stage} is already ${st.state}`);
  const prev = previousStage(ledger, stage);
  if (prev && ledger.stages[prev].state !== "done") throw new Tripped(`previous stage ${prev} is ${ledger.stages[prev].state}, not done`);
  st.state = "started";
  if (model) st.model = model;
  save(path, ledger);
  return `${stage} started${model ? ` on ${model}` : ""}`;
}

function validateBlock(stage, text) {
  if (stage === "staff-pm") {
    const r = checkSpec(text);
    return { errors: r.errors, note: r.spec && r.spec.verdict };
  }
  if (stage === "verify") {
    const r = checkQaReport(text);
    return { errors: r.errors, note: r.block && r.block.verdict };
  }
  return { errors: text.trim() ? [] : [`the ${stage} block is empty`], note: null };
}

function cmdDone({ flags, pos }) {
  const stage = stageArg(pos);
  const blockPath = need(flags, "block");
  if (!existsSync(blockPath)) throw new Usage(`block file not found: ${blockPath}`);
  const tokens = intFlag(flags, "tokens", { min: 0 });
  const budget = intFlag(flags, "budget", { min: 1 });
  if (budget !== undefined && tokens === undefined) throw new Usage("--budget needs --tokens");
  const { path, ledger } = loadLedger(flags);
  if (ledger.stopped) throw new Tripped(`run is stopped (${ledger.stop_reason})`);
  const st = ledger.stages[stage];
  if (st.state !== "started") throw new Tripped(`${stage} is ${st.state}, not started`);
  const { errors, note } = validateBlock(stage, readFileSync(blockPath, "utf8"));
  if (errors.length) {
    if (stage !== "staff-pm" && stage !== "verify") throw new Tripped(errors.join("\n")); // presence check, not a validator: no strike
    st.failures += 1;
    if (st.failures >= 2) {
      stopRun(ledger, `${stage} block failed validation twice`);
      save(path, ledger);
      throw new Tripped(`${stage} block failed validation twice, run stopped:\n${errors.join("\n")}`);
    }
    save(path, ledger);
    throw new Tripped(errors.join("\n"));
  }
  if (stage === "verify" && note !== "green") throw new Tripped(`verify needs a green qa verdict, got ${note}; fix and report again`);
  st.state = "done";
  if (tokens !== undefined) st.tokens = tokens;
  if (budget !== undefined && tokens > BUDGET_FACTOR * budget) {
    trip(path, ledger, `${stage} used ${tokens} tokens, over ${BUDGET_FACTOR}x its budget of ${budget}`, { stop: true });
  }
  if (stage === "staff-pm" && (note === "blocked" || note === "cut")) {
    trip(path, ledger, `staff-pm verdict ${note}: the run ends here`, { stop: true });
  }
  save(path, ledger);
  return `${stage} done`;
}

function cmdRound({ flags, pos }) {
  const stage = stageArg(pos);
  if (!(stage in ROUND_LIMITS)) throw new Usage(`${stage} has no round limit; rounds apply to ${Object.keys(ROUND_LIMITS).join(", ")}`);
  const bug = flags.bug;
  if (stage === "verify" && (typeof bug !== "string" || !bug.trim())) throw new Usage("verify rounds are counted per bug: pass --bug ID");
  const { path, ledger } = loadLedger(flags);
  if (ledger.stopped) throw new Tripped(`run is stopped (${ledger.stop_reason})`);
  const st = ledger.stages[stage];
  if (st.state !== "started" && st.state !== "done") throw new Tripped(`${stage} is ${st.state}, not started`);
  const limit = ROUND_LIMITS[stage];
  const used = stage === "verify" ? (st.bugs[bug] || 0) : st.rounds;
  if (used + 1 > limit) {
    trip(path, ledger, stage === "verify" ? `${bug} needs a ${limit + 1}th fix attempt, over the limit of ${limit}` : `${stage} needs round ${limit + 1}, over the limit of ${limit}`, { stop: true });
  }
  if (stage === "verify") { st.bugs[bug] = used + 1; st.rounds += 1; } else st.rounds = used + 1;
  save(path, ledger);
  return String(used + 1);
}

function cmdStop({ flags }) {
  const reason = need(flags, "reason");
  if (!reason.trim()) throw new Usage("--reason must not be empty");
  const { path, ledger } = loadLedger(flags);
  stopRun(ledger, reason.trim());
  save(path, ledger);
  return `run stopped: ${ledger.stop_reason}`;
}

function cmdResume({ flags }) {
  const { path, ledger } = loadLedger(flags);
  if (!ledger.stopped) throw new Tripped("run is not stopped: nothing to resume");
  if (ledger.stop_reason !== "plan-limit") throw new Tripped(`cannot resume a stop for "${ledger.stop_reason}": only a plan-limit stop can be resumed`);
  ledger.stopped = false;
  ledger.stop_reason = null;
  save(path, ledger);
  return "run resumed";
}

export function classify(files, touches, feedback = false) {
  const reasons = [];
  if (touches === "live" || touches === "hearth") reasons.push(`run touches ${touches}`);
  for (const f of files) {
    const parts = f.replace(/\\/g, "/").split("/").filter((p) => p && p !== ".");
    const base = parts[parts.length - 1] || "";
    const lower = parts.map((p) => p.toLowerCase());
    if (lower[0] === ".github") reasons.push(`${f}: under .github/`);
    else if (base.toLowerCase() === "claude.md") reasons.push(`${f}: CLAUDE.md`);
    else if (MANIFESTS.has(base.toLowerCase())) reasons.push(`${f}: package manifest or lockfile`);
    else {
      const stem = base.replace(/\.[^.]*$/, "").toLowerCase();
      const hit = lower.slice(0, -1).find((p) => SENSITIVE_SEGMENTS.has(p)) || (SENSITIVE_SEGMENTS.has(stem) ? stem : null);
      if (hit) reasons.push(`${f}: ${hit} path`);
    }
  }
  if (reasons.length) return { class: "C", reasons };
  return { class: feedback ? "B" : "A", reasons: [] };
}

function cmdClass({ flags }, out) {
  const raw = need(flags, "files");
  const files = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!files.length) throw new Usage("--files needs at least one path");
  const { ledger } = loadLedger(flags);
  const r = classify(files, ledger.touches, flags.feedback === true);
  out.json = r;
  return r.class;
}

function cmdStatus({ flags }, out) {
  const { ledger } = loadLedger(flags);
  const stages = {};
  for (const s of STAGES) { const { state, model, tokens, rounds } = ledger.stages[s]; stages[s] = { state, model, tokens, rounds }; }
  out.json = { lane: ledger.lane, touches: ledger.touches, stopped: ledger.stopped, stop_reason: ledger.stop_reason, stages };
  const lines = [`lane ${ledger.lane}, touches ${ledger.touches}, ${ledger.stopped ? `STOPPED (${ledger.stop_reason})` : "running"}`];
  for (const s of STAGES) { const x = stages[s]; lines.push(`${s.padEnd(10)} ${x.state.padEnd(8)} ${String(x.model || "-").padEnd(7)} tokens ${x.tokens} rounds ${x.rounds}`); }
  return lines.join("\n");
}

const COMMANDS = { init: cmdInit, start: cmdStart, done: cmdDone, round: cmdRound, stop: cmdStop, resume: cmdResume, class: cmdClass, status: cmdStatus };

export function main(argv) {
  const [cmd, ...rest] = argv;
  if (!COMMANDS[cmd]) { process.stderr.write(`${USAGE}\n`); return 2; }
  const out = {};
  try {
    const args = parse(rest);
    const text = COMMANDS[cmd](args, out);
    process.stdout.write((args.flags.json && out.json ? JSON.stringify(out.json, null, 2) : text) + "\n");
    return 0;
  } catch (e) {
    if (e instanceof Tripped) { process.stderr.write(`${e.message}\n`); return 1; }
    if (e instanceof Usage) { process.stderr.write(`${e.message}\n${USAGE}\n`); return 2; }
    process.stderr.write(`${e && e.stack || e}\n`);
    return 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1])))) {
  process.exitCode = main(process.argv.slice(2));
}

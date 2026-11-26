// EvalPM capture: log each product improvement (or missed bug) as one small file, then build an eval tasks file from them.
// Spec: docs/product/SPEC-EVALPM-CAPTURE.md. No model calls; everything lives under --root in evals/captures/.
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const MAX = 4000;
const NAME = /^[a-z0-9][a-z0-9-]*$/;
// Key and token shapes we refuse. This is a floor, not a scanner: it does not catch every kind of secret.
const KEYS = [/sk-[A-Za-z0-9_-]{16,}/, /\bsk_(?:live|test)_[A-Za-z0-9]{12,}/, /\bsb_secret_[A-Za-z0-9_-]{12,}/, /\bgh[pousr]_[A-Za-z0-9]{16,}/, /\bgithub_pat_[A-Za-z0-9_]{16,}/,
  /\bAKIA[0-9A-Z]{12,}/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/, /\bAIza[0-9A-Za-z_-]{30,}/, /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\./,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bBearer\s+[A-Za-z0-9._~+\/=-]{20,}/];
const MAX_FILE = 5 * 1024 * 1024;
const BOOL = new Set(["--replace"]);
const VALUE_FLAGS = new Set(["--agent", "--id", "--kind", "--prompt", "--before", "--after", "--verdict", "--missed", "--note", "--agent-file", "--root"]);

class Refuse extends Error {}
const refuse = (m) => { throw new Refuse(m); };
const sha = (x) => createHash("sha256").update(x).digest("hex");
const j = (o) => JSON.stringify(o, null, 1) + "\n";
const put = (p, d) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, d); };
// captures can hold product text: keep them out of git unless someone force-adds them on purpose
const guard = (root) => { const g = join(root, "evals", "captures", ".gitignore"); if (!existsSync(g)) put(g, "*\n"); };
const today = () => new Date().toISOString().slice(0, 10);
const splitOf = (id) => (createHash("sha256").update(id).digest()[0] % 3 === 0 ? "dev" : "heldout");

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (BOOL.has(a)) o[a] = true;
    else if (VALUE_FLAGS.has(a)) {
      if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) refuse(`${a} needs a value`);
      o[a] = argv[++i];
    } else refuse(/^--[a-z-]{1,20}$/.test(a) ? `unknown option ${a}` : "unexpected argument (never echoed, it may hold text)");
  }
  return o;
}

// @file must sit inside --root: no outside paths, dotfiles or symlinks, and at most MAX+1 bytes
function readInside(name, root, target) {
  const abs = resolve(root, target);
  const inRoot = relative(resolve(root), abs);
  if (inRoot.startsWith("..") || resolve(inRoot) === inRoot) refuse(`${name}: @file must be inside the --root folder`);
  if (inRoot.split(sep).some((seg) => seg.startsWith("."))) refuse(`${name}: @file cannot be a dotfile or in a dot folder`);
  let st;
  try { st = lstatSync(abs); } catch { refuse(`${name}: cannot read ${target}`); }
  if (st.isSymbolicLink()) refuse(`${name}: @file cannot be a symlink`);
  if (!st.isFile()) refuse(`${name}: ${target} is not a file`);
  const real = relative(realpathSync(root), realpathSync(abs));
  if (real.startsWith("..")) refuse(`${name}: @file must be inside the --root folder`);
  if (st.size > MAX + 1) refuse(`${name} is over ${MAX} characters`);
  try { return readFileSync(abs, "utf8"); } catch { refuse(`${name}: cannot read ${target}`); }
}

// text or @file; refuses key-shaped strings (never echoing them), removes URLs, caps the length
function field(name, raw, root) {
  if (raw === undefined) return undefined;
  let t = raw;
  if (raw.startsWith("@")) t = readInside(name, root, raw.slice(1));
  if (KEYS.some((r) => r.test(t))) refuse(`${name} looks like a key or token, so nothing was written; mask it and run again`);
  if (t.length > MAX) refuse(`${name} is over ${MAX} characters`);
  t = t.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "(link removed)").replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "(address removed)").trim();
  return t;
}

const dirOf = (root, agent) => join(root, "evals", "captures", agent);
const builtPath = (root, agent) => join(root, "evals", "captures", `${agent}.built.json`);
const tasksPath = (root, agent) => join(root, "evals", "captures", `${agent}.tasks.json`);
const stampPath = (root, agent) => join(root, "evals", "captures", `${agent}.stamp.json`);

function agentOf(o) {
  if (!o["--agent"]) refuse("--agent needs a name, e.g. --agent my-agent");
  if (!NAME.test(o["--agent"])) refuse("--agent must be a lowercase name");
  return o["--agent"];
}
function load(root, agent) {
  const d = dirOf(root, agent);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => {
    const text = readFileSync(join(d, f), "utf8");
    let data;
    try { data = JSON.parse(text); } catch { refuse(`capture file ${f} is unreadable (not valid JSON)`); }
    return { data, sha: sha(text) };
  });
}

function add(root, o) {
  const agent = agentOf(o), id = o["--id"], kind = o["--kind"];
  if (!id || !NAME.test(id)) refuse("--id must be lowercase letters, digits and dashes");
  if (!["improvement", "bug"].includes(kind)) refuse("--kind must be improvement or bug");
  const prompt = field("--prompt", o["--prompt"], root);
  if (!prompt) refuse("--prompt is required");
  const note = field("--note", o["--note"], root);
  const c = { id, kind, prompt };
  if (kind === "improvement") {
    const before = field("--before", o["--before"], root), after = field("--after", o["--after"], root);
    if (!before || !after || !["better", "worse", "tie"].includes(o["--verdict"])) refuse("an improvement needs --before, --after and --verdict (better, worse or tie)");
    Object.assign(c, { before, after, verdict: o["--verdict"] });
  } else {
    const missed = field("--missed", o["--missed"], root);
    if (!missed) refuse("a bug needs --missed");
    c.missed = missed;
  }
  if (note) c.note = note;
  Object.assign(c, { split: splitOf(id), date: today() });
  const p = join(dirOf(root, agent), `${id}.json`);
  if (existsSync(p) && !o["--replace"]) refuse(`${id} already exists (use --replace to overwrite it)`);
  guard(root);
  put(p, j(c));
  console.log(`captured ${id} (${kind}${c.verdict ? `, ${c.verdict}` : ""}, ${c.split})`);
  return 0;
}

const count = (xs, f) => { const m = {}; for (const x of xs) m[f(x)] = (m[f(x)] || 0) + 1; return m; };
const fmt = (m, keys) => keys.map((k) => `${k} ${m[k] || 0}`).join(", ");

function list(root, o) {
  const agent = agentOf(o), caps = load(root, agent);
  const built = existsSync(builtPath(root, agent)) ? JSON.parse(readFileSync(builtPath(root, agent), "utf8")).ids || {} : {};
  const fresh = caps.filter((c) => built[c.data.id] !== c.sha).length;
  const imps = caps.filter((c) => c.data.kind === "improvement");
  console.log(`${agent}: ${caps.length} captures (${fresh} new since the last build)`);
  console.log(`kind: ${fmt(count(caps, (c) => c.data.kind), ["improvement", "bug"])}`);
  console.log(`verdict: ${fmt(count(imps, (c) => c.data.verdict), ["better", "worse", "tie"])}`);
  console.log(`split: ${fmt(count(caps, (c) => c.data.split), ["dev", "heldout"])}`);
  return 0;
}

function rubric(c) {
  if (c.kind === "bug") return `Pass only if the reply raises this problem, which a past review missed: ${c.missed}`;
  if (c.verdict === "better") return `Pass only if the reply does what the accepted result does: ${c.after}. It fails if it repeats the problem in the earlier result: ${c.before}`;
  return `Pass only if the reply avoids what the rejected result does: ${c.after}, and keeps what the earlier result did: ${c.before}`;
}

function build(root, o) {
  const agent = agentOf(o), caps = load(root, agent);
  const usable = caps.filter((c) => !(c.data.kind === "improvement" && c.data.verdict === "tie"));
  const skipped = caps.length - usable.length;
  if (!usable.length) refuse(`no cases to build for ${agent}${skipped ? ` (${skipped} ties skipped)` : ""}`);
  const tasks = usable.map((c) => c.data).sort((a, b) => (a.id < b.id ? -1 : 1)).map((c) => ({
    id: c.id, split: c.split, text: c.prompt, rubric: rubric(c),
    capture: { kind: c.kind, verdict: c.kind === "improvement" ? c.verdict : null },
  }));
  guard(root);
  put(tasksPath(root, agent), j(tasks));
  put(builtPath(root, agent), j({ ids: Object.fromEntries(caps.map((c) => [c.data.id, c.sha])) }));
  const dev = tasks.filter((t) => t.split === "dev").length;
  console.log(`built ${tasks.length} cases (${dev} dev, ${tasks.length - dev} heldout)${skipped ? `; skipped ${skipped} tie${skipped > 1 ? "s" : ""}` : ""}`);
  console.log("next: point your suite at the tasks file and freeze it (the held-out set is one-shot per change); after each run, stamp the agent file with capture stamp");
  return 0;
}

function agentHash(root, o) {
  const f = o["--agent-file"];
  if (!f) refuse(`--agent-file needs a path; stamp records the agent file so check can spot changes: capture stamp --agent ${o["--agent"] || "my-agent"} --agent-file PATH`);
  const abs = resolve(root, f);
  let st;
  try { st = statSync(abs); } catch { refuse(`cannot read ${f} (no such file)`); }
  if (!st.isFile() || st.size > MAX_FILE) refuse(`${f} is not a file under ${MAX_FILE / 1024 / 1024} MB`);
  try { return sha(readFileSync(abs)); } catch { refuse(`cannot read ${f}`); }
}
function stamp(root, o) {
  const agent = agentOf(o);
  guard(root);
  put(stampPath(root, agent), j({ agent_sha256: agentHash(root, o), date: today() }));
  console.log("stamped: the agent file as of this run");
  return 0;
}
function check(root, o) {
  const agent = agentOf(o), now = agentHash(root, o);
  const p = stampPath(root, agent);
  const was = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")).agent_sha256 : null;
  if (was === now) { console.log("agent unchanged since last run"); return 0; }
  console.error(`agent changed since last run${was ? "" : " (never stamped)"}: run the suite, then stamp`);
  return 1;
}

const SUBS = { add, list, build, stamp, check };
export const CAPTURE_HELP = `capture commands (log improvements, grow the suite): evalpm capture <add|list|build|stamp|check> --agent NAME
  add     log one improvement or missed bug (--id --kind --prompt, then --before --after --verdict or --missed)
  list    counts by kind, verdict and split, and what is new since the last build
  build   write evals/captures/NAME.tasks.json for a cases suite
  stamp   record the agent file after a run (--agent-file PATH)
  check   exit 1 when the agent file changed since the last stamp
  (--root DIR works here too; --before and --after take text or @file inside the root; split: each id is fixed as dev or heldout, and heldout is spent once per change)`;

export function captureMain(argv) {
  const [sub, ...rest] = argv;
  if (sub === undefined || sub.startsWith("--")) { console.error(`capture needs a command: add, list, build, stamp or check\n\n${CAPTURE_HELP}`); return 2; }
  if (!SUBS[sub]) { console.error(`unknown capture command "${sub ?? ""}"\n\n${CAPTURE_HELP}`); return 2; }
  try {
    const o = parse(rest);
    return SUBS[sub](resolve(o["--root"] || process.cwd()), o);
  } catch (e) {
    if (e instanceof Refuse) { console.error(e.message); return 1; }
    throw e;
  }
}

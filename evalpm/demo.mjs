// The offline demo: invented tasks, canned replies and canned grader answers for a made-up agent.
// Runs the real pipeline (freeze, jobs, collect, sheet, key-add, calibrate, report) in a temp folder and returns its text.
// It holds no statistics of its own: every number comes from tools/eval-pipeline.mjs.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../tools/eval-pipeline.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, o) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 1)); };

function call(root, args) { // run one pipeline command, return what it printed
  const lines = [], log = console.log;
  console.log = (...a) => lines.push(a.join(" "));
  let code;
  try { code = main([...args, "--root", root]); } finally { console.log = log; }
  if (code !== 0) throw new Error(`demo step failed: ${args[0]}\n${lines.join("\n")}`);
  return lines.join("\n");
}
const jobsIn = (run, stage) => readdirSync(join(run, "jobs")).filter((f) => f.endsWith(".json")).map((f) => read(join(run, "jobs", f))).filter((j) => j.stage === stage);

export function runDemo(demoDir = join(here, "demo")) {
  const root = mkdtempSync(join(tmpdir(), "evalpm-demo-"));
  try {
    const outputs = read(join(demoDir, "outputs.json")), verdicts = read(join(demoDir, "verdicts.json"));
    cpSync(join(demoDir, "tasks.json"), join(root, "evals/demo/tasks.json"));
    cpSync(join(demoDir, "rubric.md"), join(root, "evals/demo/rubric.md"));
    cpSync(join(demoDir, "suite.json"), join(root, "evals/suites/release-notes-demo.json"));
    const suite = "evals/suites/release-notes-demo.json", run = join(root, "evals/runs/release-notes-demo/sample");
    write(join(run, "run-meta.json"), { schema: 1, agent: "release-notes-demo", suite: "release-notes-demo.json", change: "sample", phase: "dev", date: "sample" });
    call(root, ["freeze", "--suite", suite]);
    call(root, ["jobs", "--suite", suite, "--phase", "dev", "--change", "sample", "--stage", "gen", "--run", run]);
    for (const j of jobsIn(run, "gen")) write(join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, tokens: j.arm === "agent" ? 900 : 400, output: outputs[j.task][j.arm] });
    call(root, ["collect", "--run", run]);
    call(root, ["jobs", "--suite", suite, "--phase", "dev", "--change", "sample", "--stage", "grade", "--run", run]);
    const blind = read(join(run, "blind-map.json")).pairs;
    for (const j of jobsIn(run, "grade")) {
      const { task, run: n } = blind[j.pair];
      const v = verdicts[task][n - 1];
      const answer = v === "tie" ? "tie" : j.outputs.A === outputs[task][v] ? "A" : "B";
      write(join(run, "results", `${j.id}.json`), { id: j.id, model: j.model, input_sha256: j.input_sha256, answer });
    }
    call(root, ["collect", "--run", run]);
    call(root, ["sheet", "--suite", suite, "--run", run, "--n", "20", "--out", "evals/demo/sheet.json"]);
    const marks = read(join(demoDir, "marks.json"));
    call(root, ["key-add", "--suite", suite, "--run", run, "--marks", Object.entries(marks).map(([k, v]) => `${k}=${v}`).join(",")]);
    const cal = call(root, ["calibrate", "--suite", suite, "--run", run]);
    const rep = call(root, ["report", "--suite", suite]);
    const c = Object.fromEntries(cal.split("\n").map((l) => l.split(": ")));
    return [
      "SAMPLE DATA: invented tasks and canned replies for a made-up agent. Nothing here was measured.",
      "", rep, "", `judge check: ${c.n} invented human marks, agreement ${c.agreement}, kappa ${c.kappa}, claims allowed: ${c.claim_ok}`,
      "", "SAMPLE DATA: the numbers above are invented, including the judge check. They are not a result.",
    ].join("\n");
  } finally { rmSync(root, { recursive: true, force: true }); }
}

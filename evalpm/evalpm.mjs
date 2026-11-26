#!/usr/bin/env node
// EvalPM: one entrypoint over the shared eval tool (tools/eval-pipeline.mjs). It only dispatches; every number comes from the tool.
//   node evalpm/evalpm.mjs demo                     run a whole sample eval offline (invented data, no key)
//   node evalpm/evalpm.mjs init|check|jobs|collect|report|calibrate ...   same arguments as the tool (check = check-suite)
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { main } from "../tools/eval-pipeline.mjs";
import { runDemo } from "./demo.mjs";

const HELP = `EvalPM: does your agent beat plain Claude on the same task? Blind judge, both orders, per-task stats.

Try:  node evalpm/evalpm.mjs demo      (runs a whole sample eval offline, no key)
usage: evalpm.mjs <command> [args] [--root DIR]

Commands (arguments pass through to the tool; add --root DIR to work in another folder):
  demo       run the sample eval on invented data
  init       write a starter suite config
  check      validate a suite config
  jobs       write the generation or grading jobs for a phase
  collect    validate returned results and build the run
  report     per-task report (--claim is blocked until the judge is checked)
  calibrate  how well the judge agrees with a human's marks`;
const COMMANDS = { init: "init", check: "check-suite", jobs: "jobs", collect: "collect", report: "report", calibrate: "calibrate" };

export function run(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === "demo") {
    if (rest.length) { console.error("demo takes no arguments"); return 2; }
    console.log(runDemo());
    return 0;
  }
  if (cmd === undefined || cmd === "help" || cmd === "--help") { console.log(HELP); return 0; }
  if (!COMMANDS[cmd]) { console.error(`unknown command "${cmd}"\n\n${HELP}`); return 2; }
  return main([COMMANDS[cmd], ...rest]);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = run(process.argv.slice(2));

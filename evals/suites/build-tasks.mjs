// Regenerates the task lists for the case suites from the agent-miss case files (the case files stay the source).
// Run: node evals/suites/build-tasks.mjs. Task text is what the agent sees; "rubric" is what only the grader sees.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const { PM_CASES } = await import("../agent-misses/staff-pm-cases.mjs");
const { QA_CASES } = await import("../agent-misses/qa-tdd-cases.mjs");
const out = (f, o) => writeFileSync(join(here, f), JSON.stringify(o, null, 1) + "\n");
out("staff-pm.cases.tasks.json", PM_CASES.map((c) => ({
  id: `pm-${c.id}`, split: c.split, miss: c.miss,
  text: `${c.ask}\n\nContext: ${c.context}`,
  rubric: `Pass only if the reply covers: ${c.mustCover}`,
})));
out("qa-tdd.tasks.json", QA_CASES.map((c) => ({
  id: `qa-${c.id}`, split: c.split, miss: c.miss,
  text: `${c.ask}\n\nFile ${c.file}:\n${c.code}\n\nExisting tests in ${c.testFile}:\n${c.test}`,
  rubric: `Pass only if the tests the reply writes would catch this gap: ${c.gapName}. ${c.gap}`,
})));

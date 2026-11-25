// Builds evals/suites/ux-reviewer.tasks.json from the "UX eval miss" issues (#47 to #69) saved as JSON files in a folder.
// Run: node evals/suites/build-ux-tasks.mjs DIR   (DIR holds 47.json .. 69.json from the GitHub issues API).
// The agent sees only "Project and screen" plus a fixed ask. The grader also sees what was actually wrong.
// Limit: screenshots live in private project files, so this first suite is text-only; it tests whether the
// reviewer asks the right questions about the named screen, not whether it can read pixels.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = process.argv[2];
if (!dir) { console.error("usage: build-ux-tasks.mjs DIR"); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const pick = (body, label, next) => {
  const m = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${next}):|$)`).exec(body);
  return m ? m[1].trim() : "";
};
const tasks = [];
for (let n = 47; n <= 69; n++) {
  const d = JSON.parse(readFileSync(join(dir, `${n}.json`), "utf8"));
  const body = d.body || "";
  const screen = pick(body, "Project and screen", 'What the reviewer said[^:]*');
  const wrong = pick(body, "What was actually wrong", "Screenshot path or link[^:]*");
  if (!screen || !wrong) { console.error(`issue ${n}: could not read screen or what was wrong`); process.exit(1); }
  tasks.push({
    id: `ux-${n}`, split: n % 3 === 0 ? "dev" : "heldout", issue: n,
    text: `Review this screen as the studio's UX reviewer: ${screen}\n\nGive a score out of 10 and your findings with priorities (P0 to P2). Say what you would check that a pass could miss.`,
    rubric: `Pass only if the reply raises this problem, which a past review missed: ${wrong}`,
  });
}
writeFileSync(join(here, "ux-reviewer.tasks.json"), JSON.stringify(tasks, null, 1) + "\n");
console.log(`${tasks.length} tasks (${tasks.filter((t) => t.split === "dev").length} dev)`);

// QA gap tests for SL-10 and SL-11 (QA-R1..QA-R4). Each is red against the current tools/spec-lint.mjs and goes green
// when the rule stops misfiring. Specs are built inline and linted through the exported lintSpec(text).
import { test } from "node:test";
import assert from "node:assert/strict";
import { lintSpec } from "../tools/spec-lint.mjs";

const spec = (prose, extraCriterion = "") => `# Spec: probe

${prose}

\`\`\`spec
verdict: ready
bet: A visitor sees it; it worked when 39 of 40 work
step: M1.1 | Build | X-1 green | 1 session
criterion: X-1 | auto | Given 40 inputs, then 39 pass
${extraCriterion}
risk: Some miss | X-1
handoff: qa-tdd | failing tests for X-1 | red for the right reason
\`\`\`
`;
const ids = (text) => {
  const r = lintSpec(text);
  return (r.findings ?? r).map((f) => f.rule);
};

test("QA-R1 SL-10 does not fire on a plain location classifier (no rule, penalty or flag)", () => {
  assert.ok(!ids(spec("A location classifier maps strings to remote or not.")).includes("SL-10"));
});

test("QA-R2 SL-10 accepts a feedback loop worded as reject-with-a-note and a weekly list of rejected hits", () => {
  const s = spec("Add a red flag detector for on-site roles.",
    "criterion: X-2 | manual | Given a hit the owner disagrees with, then they can reject it with a note and 1 weekly list shows rejected hits");
  assert.ok(!ids(s).includes("SL-10"));
});

test("QA-R3 SL-11 does not fire on integration tests that merely use fixtures", () => {
  assert.ok(!ids(spec("Add integration tests that use fixtures for the parser.")).includes("SL-11"));
});

test("QA-R4 SL-11 accepts a first run against the real API host from a laptop (other words)", () => {
  const s = spec("Adapter built against saved samples.",
    "criterion: X-2 | manual | Given the real API host reachable from a laptop, then the first run against it returns calls and puts for 3 symbols");
  assert.ok(!ids(s).includes("SL-11"));
});

test("QA-R5 SL-11 still fires when 'real data' only appears in a negation (No real data is stored in fixtures)", () => {
  assert.ok(ids(spec("Adapter built against saved samples. No real data is stored in fixtures.")).includes("SL-11"));
});

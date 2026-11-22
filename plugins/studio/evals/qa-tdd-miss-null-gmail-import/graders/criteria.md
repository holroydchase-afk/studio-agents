---
type: llm
weight: 3
---

Recall of RR-Q3, a miss we already know was real (pattern: matching-and-sorting-edges). Pass only if the report names this specific gap, ranked P1 or higher: `toRow` reads `email.from` and `email.subject` without checking they exist. The connector returns null entries and emails with no subject, and one of them throws and stops the whole import, so no rows are saved. The test uses two well-formed emails only. It must also write a failing test for this gap (`importAll([null, {from: "a@x.com"}, {from: "b@y.com", subject: "Yo"}])` must not throw and must return rows for the usable emails) and run it red, or show its red output. It must not fix `import.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

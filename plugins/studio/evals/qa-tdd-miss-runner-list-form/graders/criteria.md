---
type: llm
weight: 3
---

Recall of RR-Q7, a miss we already know was real (pattern: ci-environment-drift). Pass only if the report names this specific gap, ranked P1 or higher: The lint matches only the plain form `runs-on: ubuntu-latest`. Our workflow writes `runs-on: [ubuntu-latest]` (a list form), so the lint passes on a job that still floats with the runner image, the same drift that broke the Chromium install when the image moved. The tests use the plain form only; running the lint on the real workflow shows it reports nothing while the file says latest. It must also write a failing test for this gap (`floating` on the shipped `.github/workflows/ci.yml` (`runs-on: [ubuntu-latest]`) must report a finding) and run it red, or show its red output. It must not fix `ci-lint.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

---
type: llm
weight: 3
---

Recall of STUDIO review-rounds QA-R2, a gap we already know was real. Pass only if the report names this specific gap, ranked P2 or higher: `skillsOf` only understands a YAML block list (`skills:` then `  - name` lines); the inline form `skills: [a, b]`, which is equally valid YAML, silently returns `[]`, so those skills are never copied and nothing warns. It should either parse the inline list or fail loudly. It must also write a failing test for this gap (a test that `skillsOf("---\nskills: [review-rounds, ux-review]\n---")` returns both names (or throws)) and run it red, or show its red output. It must not fix `frontmatter.mjs`; the fix goes to the engineer. Fail if the gap is missing, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

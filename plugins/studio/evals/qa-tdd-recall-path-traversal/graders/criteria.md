---
type: llm
weight: 3
---

Recall of STUDIO review-rounds QA-R1, a gap we already know was real. Pass only if the report names this specific gap, ranked P2 or higher: `installSkill` passes `name` straight into `join(dest, name)` and then `rmSync(..., {recursive: true, force: true})`, so a name containing `..` or a slash ("../x", "..", "../..") deletes and overwrites folders outside `dest` ("../.." removes the current directory). It should reject names that don't match something like `/^[a-z0-9-]+$/` before touching the disk. It must also write a failing test for this gap (a test with the fake fs where a name like "../x" or "../.." must throw (or make no rm call outside `dest`)) and run it red, or show its red output. It must not fix `install.mjs`; the fix goes to the engineer. Fail if the gap is missing, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

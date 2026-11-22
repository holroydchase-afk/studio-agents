---
type: llm
weight: 3
---

Recall of CK-Q1, a miss we already know was real (pattern: real-device-gap). Pass only if the report names this specific gap, ranked P1 or higher: The cache name ignores the build id, so after a deploy a phone that already has the cache keeps serving the old files (about 34 hours in the real case). Tests ran on fresh browsers with caching off, so nothing deployed twice. It must also write a failing test for this gap (`cacheName("build-1")` and `cacheName("build-2")` must differ) and run it red, or show its red output. It must not fix `sw-cache.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.

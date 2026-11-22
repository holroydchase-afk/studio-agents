# Spec: replace the banned sample photos

Answer: the demo ships only generated synthetic sample images, each with a row in samples/SOURCES.md naming the generator and license.
Rollback: revert the merge commit; the demo redeploys the previous build.
Done when the tests pass and the README, screenshots and case study show the new samples.

```spec
verdict: ready
bet: A visitor tries the demo with samples we have the right to show; it worked when the sample check passes on every build
step: M1.1 | Generate the synthetic samples and their SOURCES.md rows | DEMO-1 green | 1 session
criterion: DEMO-1 | auto | Given the samples folder, then every image has a row in "SOURCES.md"
criterion: DEMO-2 | auto | Given an image with no row, then the sample check exits 1
criterion: DEMO-3 | auto | Given an empty samples folder, then the sample check exits 1 with "no samples"
criterion: DEMO-4 | auto | Given the released demo build, then the README screenshot matches the shipped sample "sample-1.png"
risk: A real photo slips back in | DEMO-2
handoff: qa-tdd | failing tests for DEMO-1 to DEMO-4 | red for the right reason
```

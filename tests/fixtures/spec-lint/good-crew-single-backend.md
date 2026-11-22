# Spec: the crew app runs one backend

Answer: the demo build on Pages never carries a backend address, and the crew app build refuses to start without one.
Rollback: revert the merge commit and redeploy the demo; the crew app keeps its last good build.

```spec
verdict: ready
bet: The demo can never talk to the real backend; it worked when the bundle scan stays clean on every build
step: M1.1 | Bundle scan in CI | SEP-1 green | 1 session
step: M1.2 | Crew build needs config | SEP-2 green | 0.5 session
criterion: SEP-1 | auto | Given a demo build that contains a backend host, then the CI scan exits 1
criterion: SEP-2 | auto | Given a crew build with no backend config, then the build exits 1 with "missing backend"
criterion: SEP-3 | auto | Given the crew build, then exactly 1 data adapter is bundled and it is "hosted"
criterion: SEP-4 | auto | Given a demo build with no backend config, then the CI scan exits 0
risk: A demo build talks to the real backend | SEP-1
handoff: qa-tdd | failing tests for SEP-1 to SEP-4 | red for the right reason
```

# Spec: tag sort

Sort tags by name. Done when the code merges and tests pass.

```spec
verdict: ready
bet: The reader finds a tag fast; it worked when nobody scans the whole set
step: M1.1 | Sort by name | TAG-2 green | 1 session
criterion: TAG-2 | auto | Given tags "b" and "a", then the order is "a, b"
risk: Case sorts apart | TAG-2
handoff: qa-tdd | failing tests for TAG-2 | red for the right reason
```

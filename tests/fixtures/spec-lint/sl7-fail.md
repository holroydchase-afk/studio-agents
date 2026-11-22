# Spec: quickstart

Update the README quickstart.

```spec
verdict: ready
bet: A visitor runs the tool in a minute; it worked when the first command succeeds
step: M1.1 | Quickstart text | QS-1 green | 1 session
criterion: QS-1 | auto | Given the quickstart, then it has "3" commands
risk: A command does not exist | QS-1
handoff: qa-tdd | failing tests for QS-1 | red for the right reason
```

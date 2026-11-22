# Spec: quickstart parity

Risk (P1): README names an unreleased command.
Rollback: revert the merge commit.

```spec
verdict: ready
bet: A visitor runs every command shown; it worked when none fails
step: M1.1 | Parity check | README-1 green | 1 session
criterion: README-1 | auto | Given the released version, then every command in the README exits 0
risk: A command is not out yet | README-1
handoff: qa-tdd | failing tests for README-1 | red for the right reason
```

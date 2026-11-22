# Spec: README for the new version

Answer: update the README so a hiring manager can try the tool from the quickstart.
Risk (P1): the README quickstart names commands that are merged but unreleased, so a visitor on the registry version hits an error.
Rollback: revert the merge commit.

```spec
verdict: ready
bet: A hiring manager runs the quickstart; it worked when every command works on the version they install
step: M1.1 | Quickstart parity check | RM-2 green | 1 session
criterion: RM-2 | auto | Given the version on the npm registry, then every command in the README quickstart exits 0
criterion: RM-3 | auto | Given a command not in the registry version, then the README marks it "not released yet"
risk: The README promises a command that is not out yet | RM-2
handoff: qa-tdd | failing tests for RM-2 and RM-3 | red for the right reason
```

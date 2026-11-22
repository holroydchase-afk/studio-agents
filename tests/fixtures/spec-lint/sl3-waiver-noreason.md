# Spec: tag colors

Deploy the page to Pages.
Rollback: revert the merge commit and redeploy.
lint-ok: SL-3

```spec
verdict: ready
bet: The reader can tell tags apart; it worked when tag mixups stop
step: M1.1 | Tag color map | TAG-1 green | 1 session
criterion: TAG-1 | auto | Given a tag named "urgent", then its color is "red"
risk: Two tags share a color | TAG-1
handoff: qa-tdd | failing tests for TAG-1 | red for the right reason
```

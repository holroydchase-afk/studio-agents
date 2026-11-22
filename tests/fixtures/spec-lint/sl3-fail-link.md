# Spec: tag colors

Deploy the page to Pages at https://example.com/tags/build-7f3a9c.

```spec
verdict: ready
bet: The reader can tell tags apart; it worked when tag mixups stop
step: M1.1 | Tag color map | TAG-1 green | 1 session
criterion: TAG-1 | auto | Given a tag named "urgent", then its color is "red"
risk: Two tags share a color | TAG-1
handoff: qa-tdd | failing tests for TAG-1 | red for the right reason
```

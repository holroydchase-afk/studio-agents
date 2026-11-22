# Spec: tracker gate

Make the tracker owner-only behind sign-in.

```spec
verdict: ready
bet: Only Chase sees the tracker; it worked when a visitor gets nothing back
step: M1.1 | Gate the tracker | AUTH-1 green | 1 session
criterion: AUTH-1 | auto | Given signed out, then the tracker redirects to "/login"
criterion: AUTH-2 | auto | Given another signed-in user, then the owner page returns 403
risk: The gate leaks the tracker | AUTH-1
handoff: qa-tdd | failing tests for AUTH-1 | red for the right reason
```

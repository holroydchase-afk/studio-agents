# Spec: recruiter list behind sign-in

Answer: put the recruiter list on the live page behind sign-in, owner-only.
Rollback: the change ships behind one flag; turning the flag off restores the old page, and reverting the merge commit is the backstop.

```spec
verdict: ready
bet: Only the owner sees the recruiter list; it worked when a signed-out visitor gets nothing back
step: M1.1 | Sign-in gate on the list | AUTH-1 green | 1 session
step: M1.2 | Rollback flag | flag off restores the old page | 0.5 session
criterion: AUTH-1 | auto | Given signed out, then the list request returns 401
criterion: AUTH-2 | auto | Given signed out, then the page shows "Sign in" and no recruiter rows
criterion: ROLL-1 | auto | Given the flag off, then the page renders the old view with 0 errors
risk: The gate breaks the live page | ROLL-1
handoff: qa-tdd | failing tests for AUTH-1, AUTH-2 and ROLL-1 | red for the right reason
```

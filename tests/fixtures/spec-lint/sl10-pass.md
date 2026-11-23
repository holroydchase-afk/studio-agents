# Spec: on-site flag

Add a red-flag penalty that lowers the score of a role that asks for five days on site.

```spec
verdict: ready
bet: Chase sees weaker roles drop out of the top list; it worked when none of the top five asks for five days on site
step: M1.1 | Penalty in scoring | FLAG-1 green | 1 session
criterion: FLAG-1 | auto | Given a posting that says 5 days on site, then the score drops by 15
criterion: FLAG-2 | manual | Given a role the penalty hit, then the owner can mark the hit wrong with a reason and 1 hit in 10 marked wrong triggers a review of the phrase match
risk: The phrase match misses wording | FLAG-2
handoff: qa-tdd | failing tests for FLAG-1 | red for the right reason
```

# Spec: badge

Show how many entries a card holds.

```spec
verdict: ready
bet: The reader sees how full a card is; it worked when nobody opens a card to check
step: M1.1 | Badge | BADGE-1 green | 1 session
criterion: BADGE-1 | auto | Given 3 items, then the card shows "3 items"
criterion: BADGE-2 | auto | Given 10 items, then the card shows "10 items"
risk: Badge overflows | BADGE-2
handoff: qa-tdd | failing tests for BADGE-1 and BADGE-2 | red for the right reason
```

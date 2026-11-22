# Spec: pace card

Show the pace on the card.

```spec
verdict: ready
bet: The reader sees the pace at a glance; it worked when the card is read first
step: M1.1 | Pace math | PACE-2 green | 1 session
criterion: PACE-2 | auto | Given it is Monday, then the pace reads "0.40"
criterion: PACE-3 | auto | Given 2 sessions per day, then the pace reads "2.00"
risk: Week starts on the wrong day | PACE-2
handoff: qa-tdd | failing tests for PACE-2 and PACE-3 | red for the right reason
```

# Spec: pace card

Show the pace on the card.

```spec
verdict: ready
bet: The reader sees the pace at a glance; it worked when the card is read first
step: M1.1 | Pace math | PACE-2 green | 1 session
criterion: PACE-1 | auto | Given a clock of 2026-11-16T00:00Z, then the pace reads "0.00"
criterion: PACE-2 | auto | Given it is MONDAY at noon, then the pace reads "0.40"
risk: Week starts on the wrong day | PACE-2
handoff: qa-tdd | failing tests for PACE-1 and PACE-2 | red for the right reason
```

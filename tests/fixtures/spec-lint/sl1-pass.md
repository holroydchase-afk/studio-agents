# Spec: pace card

Show the pace on the card.

```spec
verdict: ready
bet: The reader sees the pace at a glance; it worked when the card is read first
step: M1.1 | Pace math | PACE-2 green | 1 session
criterion: PACE-1 | auto | Given zero entries, then the average is "0.00"
criterion: PACE-2 | auto | Given a clock of Mon 2026-11-16 00:00, then the average is 0.40
risk: Divide by zero | PACE-1
handoff: qa-tdd | failing tests for PACE-1 and PACE-2 | red for the right reason
```

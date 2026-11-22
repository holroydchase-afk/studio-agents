# Spec: pace section on the usage page

Answer: add a pace section that compares this week with last week, with one line of explanation.
Where: between the header and the chart, so the pace headline sits near the top.
Most readers open the page on a phone.

```spec
verdict: ready
bet: The reader sees whether they are ahead of last week; it worked when the pace headline is the first figure they read
step: M1.1 | Pace math in core | PACE-1 green | 1 session
step: M1.2 | Pace section on the page | PACE-15 checked | 0.5 session
criterion: PACE-1 | auto | Given a clock of 2026-11-16T00:00Z and zero sessions, then the pace reads "0.00"
criterion: PACE-14 | auto | Given the pace section, then its heading reads "Pace"
criterion: PACE-15 | manual | Given the usage page at 360px, then the pace headline is visible
risk: The section pushes the chart down | PACE-15
handoff: qa-tdd | failing tests for PACE-1 and PACE-14 | red for the right reason
handoff: engineer | build M1.1 and M1.2 | PACE-1 green 3x
```

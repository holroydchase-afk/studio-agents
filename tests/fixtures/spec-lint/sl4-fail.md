# Spec: pace section

Add the pace section between the header and the chart.

```spec
verdict: ready
bet: The reader sees the pace first; it worked when the pace is read before the chart
step: M1.1 | Pace section | PACE-14 green | 1 session
criterion: PACE-14 | auto | Given the pace section, then its heading reads "Pace"
criterion: PACE-15 | manual | Given the pace section at 360px, then the headline is visible
risk: Section pushes the chart down | PACE-15
handoff: qa-tdd | failing tests for PACE-14 | red for the right reason
```

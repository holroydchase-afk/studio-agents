# Spec: heading above the playground chart

Answer: the heading says the chart shows sample data and gives the span the sample really covers; when a visitor loads a file it switches to "Your log".
Rollback: revert the merge commit; the playground redeploys from the previous build.

```spec
verdict: ready
bet: A visitor never mistakes the sample for their own usage; it worked when the heading always matches the data on screen
step: M1.1 | Heading from the loaded data | CHART-1 green | 1 session
criterion: CHART-1 | auto | Given the shipped sample, then the heading reads "Sample data" and the span comes from its first and last entry
criterion: CHART-2 | auto | Given a visitor file, then the heading reads "Your log"
criterion: CHART-3 | auto | Given an empty visitor file, then the heading reads "Your log: no entries"
criterion: CHART-4 | auto | Given the page source, then no span such as "30 days" is hardcoded
risk: The heading claims a window the data does not cover | CHART-4
handoff: qa-tdd | failing tests for CHART-1 to CHART-4 | red for the right reason
```

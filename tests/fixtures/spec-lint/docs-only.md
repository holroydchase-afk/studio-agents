# Spec: contributor guide wording

Reword the testing section of the contributor guide so it names the three test commands in the order they run.

```spec
verdict: ready
bet: A new contributor runs the right command first; it worked when nobody asks which command to run
step: M1.1 | Reword the section | GUIDE-1 green | 0.5 session
criterion: GUIDE-1 | auto | Given the contributor guide, then its testing section names "npm test" first
risk: The guide drifts from the scripts | GUIDE-1
handoff: qa-tdd | failing test for GUIDE-1 | red for the right reason
```

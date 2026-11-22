# Spec: saved data when a symbol is refused

Answer: when the data source refuses a symbol, the rest still load and the card says the figures are saved, not fresh.

```spec
verdict: ready
bet: The user always knows whether a figure is fresh or saved; it worked when no saved figure is shown without its label
step: M1.1 | Per-symbol fallback with a label | SCR-2 green | 1 session
step: M1.5 | One manual run against the real source | SCR-10 recorded | 0.5 session
criterion: SCR-2 | auto | Given 1 of 5 symbols refused, then 4 load fresh and 1 shows the label "Saved data"
criterion: SCR-4 | auto | Given 0 of 5 symbols load, then a banner reads "Showing saved data"
criterion: SCR-10 | manual | Given a real run on 2026-11-23, then every refusal and rate limit is written in "RUNS.md"
risk: A saved figure is shown as fresh | SCR-2
handoff: qa-tdd | failing tests for SCR-2 and SCR-4 | red for the right reason
```

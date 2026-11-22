# Spec: Easy view

Answer: an Easy view setting that makes text and buttons larger; on phones and on a laptop-width demo.
At 1280px by 800px the content column is capped at 720px and the main button stays above the fold.

```spec
verdict: ready
bet: Older relatives read and tap without help; it worked when they find the main button on the first try
step: M1.1 | Easy view setting | EV-1 green | 1 session
criterion: EV-1 | auto | Given Easy view on, then body text is at least 20pt
criterion: EV-2 | auto | Given 1280px by 800px with Easy view off, then the screenshot diff is 0
criterion: EV-4 | auto | Given 1280px by 800px with Easy view on, then the column is 720px wide, nothing overflows and the main button is above the fold
risk: Easy view breaks the laptop demo | EV-4
handoff: qa-tdd | failing tests for EV-1 to EV-4 | red for the right reason
```
